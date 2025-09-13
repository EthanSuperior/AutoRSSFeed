import fs from "fs";
import Parser from "rss-parser";
import { load } from "cheerio";

const parser = new Parser();

// --- CONFIG ---
const SOURCES = [
	{
		type: "rss",
		url: "https://forums.spacebattles.com/threads/serass-dumpster-of-random-snippets.1143040/threadmarks.rss",
	},
	{
		type: "youtube",
		url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXoqL7S2DjbrJe5ewfmlDvw",
		whitelist: ["snapshot", "datapack", "resource", "pre"],
	},
	{
		type: "html",
		url: "https://kunmanga.com/manga/ill-be-the-matriarch-in-this-life/",
		linkSelector: "li.wp-manga-chapter a",
		titleSelector: "li.wp-manga-chapter a",
		descSelector: null,
	},
	{
		type: "html",
		url: "https://manhwaclan.com/manga/remarried-empress/",
		linkSelector: "li.wp-manga-chapter a",
		titleSelector: "li.wp-manga-chapter a",
		descSelector: null,
	},
];

function toItem({ title, link, description, pubDate }) {
	return {
		title,
		link,
		description: description || "",
		pubDate: new Date(pubDate || Date.now()),
	};
}
let items = [];

for (let source of SOURCES) {
	try {
		if (source.type === "rss") {
			let feed = await parser.parseURL(source.url);
			items.push(...feed.items.map((i) => toItem(i)));
		}

		if (source.type === "youtube") {
			let feed = await parser.parseURL(source.url);
			let wl = source.whitelist.map((w) => w.toLowerCase());
			let filtered = feed.items.filter((i) =>
				wl.some((w) => i.title.toLowerCase().includes(w))
			);
			items.push(...filtered.map((i) => toItem(i)));
		}

		if (source.type === "html") {
			let html = await fetch(source.url).then((r) => r.text());
			let $ = load(html);
			$(source.linkSelector).each((_, el) => {
				let link = $(el).attr("href");
				let title = source.titleSelector ? $(el).text().trim() : link;
				let desc = source.descSelector
					? $(el).find(source.descSelector).text().trim()
					: "";
				items.push(toItem({ title, link, description: desc }));
			});
		}
	} catch (err) {
		console.error("Error fetching", source.url, err);
	}
}

// sort + trim
items.sort((a, b) => b.pubDate - a.pubDate);
items = items.slice(0, 50);

// Build XML
const xml = `
<rss version="2.0">
  <channel>
    <title>Aggregated Feed</title>
    <link>${""}</link>
    <description>Combined sources</description>
    ${items
			.map(
				(i) => `
      <item>
        <title><![CDATA[${i.title}]]></title>
        <link>${i.link}</link>
        ${
					i.description
						? `<description><![CDATA[${i.description}]]></description>`
						: ""
				}
        <pubDate>${i.pubDate.toUTCString()}</pubDate>
      </item>
    `
			)
			.join("")}
  </channel>
</rss>`;
fs.writeFileSync("dist/feed.xml", xml);
