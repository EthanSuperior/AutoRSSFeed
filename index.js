import fs from "fs";
import Parser from "rss-parser";
const mangaAgrArgs = {
	type: "html",
	elemSelector: "li.wp-manga-chapter",
	linkSelector: "a",
	titleSelector: "a",
	descSelector: null,
};
const SOURCES = [
	{
		url: "https://forums.spacebattles.com/threads/snippets.1143040/threadmarks.rss",
	},
	{
		url: "https://forums.spacebattles.com/threads/pokemon.1028636/threadmarks.rss",
	},
	{
		url: "https://forums.spacebattles.com/threads/battletech.979266/threadmarks.rss",
	},
	{
		url: "https://forums.spacebattles.com/threads/pathfinder.1008433/threadmarks.rss",
	},
	{
		url: "https://forums.spacebattles.com/threads/phantom-star.1183048/threadmarks.rss",
	},
	{
		url: "https://www.youtube.com/feeds/videos.xml?channel_id=UCXoqL7S2DjbrJe5ewfmlDvw",
		whitelist: ["news"],
	},
	{
		...mangaAgrArgs,
		url: "https://kunmanga.com/manga/ill-be-the-matriarch-in-this-life/",
	},
	{
		...mangaAgrArgs,
		url: "https://manhwaclan.com/manga/remarried-empress/",
	},
];

const PARSERS = {
	rss: parseRSS,
	youtube: parseRSS,
	html: parseHtml,
};

const rssParser = new Parser();
async function parseRSS(source) {
	const res = await fetch(source.url, {
		headers: {
			"Cache-Control": "no-cache",
			Pragma: "no-cache",
			"If-None-Match": "",
		},
	});
	if (!res.ok) {
		console.error(
			`Failed to fetch ${source.url} - ${res.status}: ${res.statusText}`
		);
		return [];
	}
	let items = (await rssParser.parseString(await res.text())).items;
	if (items && source.whitelist) {
		let wl = source.whitelist.map((w) => w.toLowerCase());
		items = items.filter((i) =>
			wl.some((w) => i.title.toLowerCase().includes(w))
		);
	}
	if (items && source.blacklist) {
		let bl = source.blacklist.map((w) => w.toLowerCase());
		items = items.filter(
			(i) => !bl.some((w) => i.title.toLowerCase().includes(w))
		);
	}
	return items;
}

async function parseHtml(source) {
	return [];
}

function makeXML(items) {
	function xmlItem(item) {
		return `
		<item>
			<title><![CDATA[${item.title}]]></title>
			<link>${item.link}</link>
			${
				item.description
					? `<description><![CDATA[${item.description}]]></description>`
					: ""
			}
			<pubDate>${item.pubDate.toUTCString()}</pubDate>
		</item>\n`;
	}

	return `<rss version="2.0">
  <channel>
    <title>Aggregated Feed</title>
    <link>https://github.com/EthanSuperior/AutoRSSFeed</link>
    <description>Combined sources</description>
    ${items.map(xmlItem).join("")}
  </channel>\n</rss>`;
}

async function updateFeed() {
	let items = [];
	for (let source of SOURCES) {
		try {
			const parser = PARSERS[source.type?.toLowerCase() ?? "rss"];
			if (parser) items.push(await parser(source));
			else console.error(`No parser exists for source type: ${source.type}`);
		} catch (err) {
			console.error("Error fetching", source.url, err);
		}
	}

	// const oldFeed = rssParser.parseString(fs.readFileSync("feed.xml"));

	items = items.flatMap((items) =>
		items.map((item) => ({
			title: item.title,
			link: item.link,
			description: item.description || "",
			pubDate: new Date(item.pubDate || Date.now()),
		}))
	);

	// sort + trim
	items.sort((a, b) => b.pubDate - a.pubDate);
	fs.writeFileSync("feed.xml", makeXML(items.slice(0, 50)));
}

await updateFeed();
console.log("Updated feed.xml");
