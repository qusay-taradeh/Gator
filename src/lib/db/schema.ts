import { pgTable, timestamp, uuid, text, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    name: text("name").notNull().unique(),
});

export const feeds = pgTable("feeds", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    last_fetched_at: timestamp("last_fetched_at").default(sql`null`),
    name: text("name").notNull(),
    url: text("url").notNull(),
});

export const feed_follows = pgTable("feed_follows", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    user_id: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    feed_id: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }),
},
    (table) => ({
        // unique constraint on user/feed pairs
        uniquePair: unique('user_id_feed_id_unique').on(table.user_id, table.feed_id),
    })
);

export const posts = pgTable("posts", {
    id: uuid("id").primaryKey().defaultRandom().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
    title: text("title"),
    url: text("url").notNull().unique(),
    description: text("description"),
    published_at: timestamp("published_at", { mode: 'string' }),
    feed_id: uuid("feed_id").notNull().references(() => feeds.id, { onDelete: "cascade" }),
});