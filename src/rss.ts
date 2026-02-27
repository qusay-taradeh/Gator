import { XMLParser } from "fast-xml-parser";
import { User } from "./lib/db/queries/users";
import { Feed, markFeedFetched, getNextFeedToFetch } from "./lib/db/queries/feeds";
import { createPost } from "./lib/db/queries/posts";

type RSSFeed = {
    channel: {
        title: string;
        link: string;
        description: string;
        item: RSSItem[];
    };
};

type RSSItem = {
    title: string;
    link: string;
    description: string;
    pubDate: string;
};

export async function fetchFeed(feedURL: string) {
    const rssFeed: RSSFeed = {
        channel: {
            title: '',
            link: '',
            description: '',
            item: []
        }
    };
    const rssItems: RSSItem[] = [];

    const response = await fetch(feedURL, {
        method: "GET",
        mode: "cors",
        headers: {
            "User-Agent": "gator"
        }
    });

    const responseString = await response.text();

    const parser = new XMLParser();
    const jsObject = parser.parse(responseString);

    if (jsObject !== undefined && jsObject.rss !== undefined && jsObject.rss.channel !== undefined) {
        const channel = jsObject.rss.channel;

        if (channel.title !== undefined && channel.link !== undefined && channel.description !== undefined && channel.item !== undefined) {
            const title = channel.title;
            const link = channel.link;
            const description = channel.description;

            if (Array.isArray(channel.item)) {
                const item = channel.item;

                for (let index = 0; index < item.length; index++) {
                    const rssItem = item[index];
                    if (rssItem.title !== undefined && rssItem.link !== undefined && rssItem.description !== undefined && rssItem.pubDate !== undefined) {
                        const title = rssItem.title;
                        const link = rssItem.link;
                        const description = rssItem.description;
                        const pubDate = rssItem.pubDate;

                        rssItems.push({ title, link, description, pubDate });
                    } else {
                        continue;
                    }

                }
            }

            rssFeed.channel.title = title;
            rssFeed.channel.link = link;
            rssFeed.channel.description = description;
            rssFeed.channel.item = rssItems;

            return rssFeed;

        }
        else {
            throw new Error("one or many of metadata fields doesn't exist");
        }

    } else {
        throw new Error("channel field doesn't exist");
    }

}

export function printFeed(user: User, feed: Feed) {
    console.log(`${user.name} info: \nID: ${user.id}\nName: ${user.name}\nCreated at: ${user.createdAt}\nUpdated at: ${user.updatedAt}`);
    console.log(`==================================================`);
    console.log(`${feed.name} info: \nName: ${feed.name}\nURL: ${feed.url}`);
    console.log(`Created at: ${feed.createdAt}\nUpdated at: ${feed.updatedAt}`);
}

function parsePublishedAt(pubDate: string | undefined): string | null {
    if (!pubDate)
        return null;

    const date = new Date(pubDate);

    if (isNaN(date.getTime()))
        return null;

    return date.toISOString();
}

export async function scrapeFeeds() {

    const nextFeedToFetch = await getNextFeedToFetch();

    const rssFeed = await fetchFeed(nextFeedToFetch.url);

    console.log(`Feed Title: ${rssFeed.channel.title}`);
    console.log(`Description: ${rssFeed.channel.description}`);
    console.log(`Link: ${rssFeed.channel.link}`);


    const posts = rssFeed.channel.item;
    for (let index = 0; index < posts.length; index++) {
        const post = posts[index];

        await createPost(
            post.title,
            post.link,
            post.description,
            parsePublishedAt(post.pubDate),
            nextFeedToFetch.id
        );
    }

    console.log(`Feed Posts Stored in database`);

    await markFeedFetched(nextFeedToFetch);

}