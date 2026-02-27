import { eq, desc } from "drizzle-orm";
import { db } from "../index";
import { posts, feeds, users, feed_follows } from "../schema";

export type Post = typeof posts.$inferSelect;

export async function createPost(title: string, url: string, description: string, published_at: string | null, feed_id: string) {
    const [result] = await db.insert(posts)
        .values({ title: title, url: url, description: description, published_at: published_at, feed_id: feed_id })
        .onConflictDoNothing()
        .returning();

    return result;
}

export async function getPostsForUser(userId: string, numOfPosts: number) {
    const result = await db.select({
        title: posts.title,
        url: posts.url,
        description: posts.description,
        published_at: posts.published_at,
        feed_id: posts.feed_id,
        feed_name: feeds.name,
        feed_url: feeds.url
    })
        .from(posts)
        .innerJoin(feed_follows, eq(feed_follows.feed_id, posts.feed_id))
        .innerJoin(users, eq(feed_follows.user_id, userId))
        .innerJoin(feeds, eq(feed_follows.feed_id, feeds.id)).orderBy(desc(posts.published_at)).limit(numOfPosts);
    return result;
}

export async function truncatePosts() {
    await db.execute(`TRUNCATE TABLE posts CASCADE;`);
}