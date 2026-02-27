import { and, eq } from "drizzle-orm";
import { db } from "../index";
import { users, feeds, feed_follows } from "../schema";
import { User } from "./users";
import { Feed } from "./feeds";

export type FeedFollow = typeof feed_follows.$inferSelect;

export async function createFeedFollow(user: User, feed: Feed) {
    
    const [newFeedFollow] = await db.insert(feed_follows).values({ user_id: user.id, feed_id: feed.id }).returning();

    const result = await db.select().from(feed_follows)
    .innerJoin(users, eq(feed_follows.user_id, users.id))
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id));

    return result;
}

export async function getFeedFollowRecords() {
    const result = await db.select().from(feed_follows)
    .innerJoin(users, eq(feed_follows.user_id, users.id))
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id));

    return result;
}

export async function getFeedFollowsForUser(user: User) {
    const result = await db.select().from(feed_follows)
    .innerJoin(users, eq(feed_follows.user_id, user.id))
    .where(eq(feed_follows.user_id, user.id))
    .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id));
    
    return result;
}

export async function deleteFeedFollowsForUser(user: User, feed: Feed) {
    const deletedRecord = await db.delete(feed_follows).where(and( eq(feed_follows.user_id, user.id), eq(feed_follows.feed_id, feed.id) ));
}