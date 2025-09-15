import { load } from "cheerio";
async function parseHtml(source) {
	let html = await fetch(source.url).then((r) => r.text());
	console.log(!!html ? "Found" : "Did not find", `html for ${source.url}`);
	console.log(html);
	let res = load(html);
	let items = [];
	res(source.elemSelector).each((_, el) => {
		console.log(el);
		let link = source.linkSelector
			? res(el).find(source.linkSelector).attr("href")
			: res(el).attr("href");

		let title = source.titleSelector
			? res(el).find(source.titleSelector).text().trim()
			: link;

		let description = source.descSelector
			? res(el).find(source.descSelector).text().trim()
			: "";
		items.push({ title, link, description });
	});
	return items;
}

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());
const browser = await puppeteer.launch({
	headless: false,
	// args: ["--no-sandbox"],
});
async function parseHtmlWithBrowser(source) {
	const page = await browser.newPage();

	// Randomize viewport slightly to avoid fingerprinting from consistent dimensions
	await page.setViewport({
		width: Math.floor(1024 + Math.random() * 100),
		height: Math.floor(768 + Math.random() * 100),
	});
	await page.goto(source.url, { waitUntil: "networkidle2" });
	await Promise.any([
		page.waitForNavigation(),
		page.waitForSelector(source.elemSelector),
	]);

	console.log(await page.content());

	const items = await page.evaluate((source) => {
		const results = [];
		const rootElems = source.elemSelector
			? document.querySelectorAll(source.elemSelector)
			: document.querySelectorAll(source.linkSelector);
		rootElems.forEach((el) => {
			const linkEl = source.linkSelector
				? el.querySelector(source.linkSelector) || el
				: el;
			const link = linkEl?.href;

			const titleEl = source.titleSelector
				? el.querySelector(source.titleSelector) || linkEl
				: linkEl;
			const title = titleEl?.innerText.trim();

			const descEl = source.descSelector
				? el.querySelector(source.descSelector)
				: null;
			const description = descEl ? descEl.innerText.trim() : "";

			if (link && title) {
				results.push({ title, link, description });
			}
		});

		return results;
	}, source);

	await browser.close();
	return items;
}
