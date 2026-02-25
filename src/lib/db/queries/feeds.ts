import { eq } from "drizzle-orm";
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

