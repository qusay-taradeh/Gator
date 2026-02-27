import { eq, sql } from "drizzle-orm";
import { db } from "../index";
import { feeds } from "../schema";

export type Feed = typeof feeds.$inferSelect;

export async function createFeed(name: string, url: string) {
    const [result] = await db.insert(feeds).values({ name: name, url: url }).returning();
    return result;
}

export async function getFeeds() {
    const result = await db.select().from(feeds);
    return result;
}

export async function getFeedsByURL(url: string) {
    const result = await db.select().from(feeds).where(eq(feeds.url, url));
    return result;
}

export async function truncateFeeds() {
    await db.execute(`TRUNCATE TABLE feeds CASCADE;`);
}

export async function markFeedFetched(feed: Feed) {
    await db.update(feeds).set({
        updatedAt: new Date(),
        last_fetched_at: new Date()
    }).where(eq(feeds.id, feed.id));
}

export async function getNextFeedToFetch() {
    const [result] = await db.execute(sql`select * from ${feeds} order by ${feeds.last_fetched_at} nulls first`);
    return result as Feed;
}