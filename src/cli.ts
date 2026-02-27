import { readConfig, setUser } from "./config.js";
import { User, createUser, getUser, getUsers, truncateUsers } from "./lib/db/queries/users.js";
import { createFeed, getFeedsByURL, truncateFeeds } from "./lib/db/queries/feeds.js";
import { createFeedFollow, getFeedFollowRecords, getFeedFollowsForUser, deleteFeedFollowsForUser } from "./lib/db/queries/feed_follows.js";
import { getPostsForUser, truncatePosts } from "./lib/db/queries/posts.js";
import { scrapeFeeds } from "./rss.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

type UserCommandHandler = (cmdName: string, user: User, ...args: string[]) => Promise<void>;

export function initRegistry(registry: CommandsRegistry) {
    registerCommand(registry, 'login', handlerLogin);

    registerCommand(registry, 'register', handlerRegister);

    registerCommand(registry, 'reset', handlerReset);

    registerCommand(registry, 'users', handlerUsers);

    registerCommand(registry, 'agg', handlerAgg);

    registerCommand(registry, 'addfeed', middlewareLoggedIn(handlerAddFeed));

    registerCommand(registry, 'feeds', handlerFeeds);

    registerCommand(registry, 'follow', middlewareLoggedIn(handlerFollow));

    registerCommand(registry, 'following', middlewareLoggedIn(handlerFollowing));

    registerCommand(registry, 'unfollow', middlewareLoggedIn(handlerUnFollow));

    registerCommand(registry, 'browse', middlewareLoggedIn(handlerBrowse));
}

function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
    return async (cmdName: string, ...args: string[]): Promise<void> => {
        const currentUser = await getUser(readConfig().currentUserName);
        if (!currentUser) {
            throw new Error(`User ${readConfig().currentUserName} not found`);
        }
        await handler(cmdName, currentUser, ...args);
    };
}

export async function handlerLogin(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length !== 0) {

        const name = args[0];

        const checkUser = await getUser(name);

        if (!checkUser) {                                   // the user doesn't exist
            throw new Error(`User ${name} not found`);
        }

        else {
            setUser(name);                                  // Set the current username of the database
        }

    } else {
        throw new Error("the login handler expects a single argument, the username.");
    }
}

export async function handlerRegister(cmdName: string, ...args: string[]): Promise<void> {
    if (args.length !== 0) {

        const name = args[0];

        const checkUser = await getUser(name);

        if (!checkUser) {                      // the user doesn't exist
            const userInfo = await createUser(name);        // Create new user in the database
            console.log(`${name} was created in the database`);
            console.log(`${name} info: \nID: ${userInfo.id}\nName: ${userInfo.name}\nCreated at: ${userInfo.createdAt}\nUpdated at: ${userInfo.updatedAt}`);
            setUser(name);                                  // Set the current username of the database
        }

        else {
            throw new Error("the user is exist!");
        }

    } else {
        throw new Error("the register handler expects a single argument, the username.");
    }
}

export async function handlerReset(cmdName: string, ...args: string[]) {
    await truncateUsers();
    await truncateFeeds();
    await truncatePosts();
    console.log(`users, feeds and posts tables have been truncated`);
}

export async function handlerUsers(cmdName: string, ...args: string[]) {
    const allUsers = await getUsers();
    for (let index = 0; index < allUsers.length; index++) {
        const user = allUsers[index];

        if (readConfig().currentUserName === user.name) {
            console.log(`* ${user.name} (current)`);
        } else
            console.log(`* ${user.name}`);
    }
}

function parseDuration(durationStr: string): number {
    const regex = /^(\d+)(ms|s|m|h)$/;
    const match = durationStr.match(regex);

    if (!match) {
        throw new Error(`Invalid duration string: "${durationStr}". Expected format: <number><unit> (e.g. 1s, 500ms, 2m, 1h)`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
        ms: 1,
        s: 1000,
        m: 60000,
        h: 3600000,
    };

    return value * multipliers[unit];

}

function handleError(err: unknown) {
    console.error("Error scraping feeds:", err);
}

export async function handlerAgg(cmdName: string, ...args: string[]) {
    if (args.length !== 0 && args[0] !== '') {
        const timeBetweenRequests = parseDuration(args[0]);

        console.log(`Collecting feeds every ${args[0]}`);

        scrapeFeeds().catch(handleError);

        // scrape all the feeds in a continuous loop
        const interval = setInterval(() => {
            scrapeFeeds().catch(handleError);
        }, timeBetweenRequests);

        await new Promise<void>((resolve) => {
            process.on("SIGINT", () => {
                console.log("Shutting down feed aggregator...");
                clearInterval(interval);
                resolve();
            });
        });

    } else {
        throw new Error("the agg handler expects a single argument, the time_between_reqs.");
    }
}

export async function handlerAddFeed(cmdName: string, user: User, ...args: string[]): Promise<void> {

    if (args.length !== 0 && args[0] !== '' && args[1] !== '' && args[1].startsWith("https")) {
        const feedName = args[0];
        const feedURL = args[1];

        const feed = await createFeed(feedName, feedURL);
        const feedFollow = await createFeedFollow(user, feed);

        console.log(`${feed.name} was created in the database and connected to current user: ${user.name}`);

    } else {
        throw new Error("the addfeed handler expects two arguments, the name of the feed and its url.");
    }

}

export async function handlerFeeds(cmdName: string, ...args: string[]) {
    const feedFollowRecords = await getFeedFollowRecords();

    for (let index = 0; index < feedFollowRecords.length; index++) {
        const record = feedFollowRecords[index];

        console.log(`============================================`);
        console.log(`Feed name: ${record.feeds.name}\nFeed URL: ${record.feeds.url}\nCreator Name: ${record.users.name}`);
        console.log(`============================================\n`);

    }
}

export async function handlerFollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
    if (args.length !== 0 && args[0] !== '' && args[0].startsWith("https")) {
        const feedURL = args[0];
        const feeds = await getFeedsByURL(feedURL);

        if (feeds.length !== 0) {    // check if the url exists or not
            for (let index = 0; index < feeds.length; index++) {
                const feed = feeds[index];

                await createFeedFollow(user, feed);
            }

            const feedFollowRecords = await getFeedFollowRecords();

            for (let index = 0; index < feedFollowRecords.length; index++) {
                const feedFollow = feedFollowRecords[index];

                console.log(`============================================`);
                console.log(`Feed name: ${feedFollow.feeds.name}\nCreator Name: ${feedFollow.users.name}`);
                console.log(`============================================\n`);
            }
        } else {
            throw new Error("the url provided doesn't exist in feeds table");
        }


    } else {
        throw new Error("the follow handler expects a single argument, the feed url.");
    }

}

export async function handlerFollowing(cmdName: string, user: User, ...args: string[]): Promise<void> {
    const currentUserFeeds = await getFeedFollowsForUser(user);
    console.log(`${user.name} following:`)
    for (let index = 0; index < currentUserFeeds.length; index++) {
        const feed = currentUserFeeds[index];
        console.log(`${index + 1}. ${feed.feeds.name}`);
    }
}

export async function handlerUnFollow(cmdName: string, user: User, ...args: string[]): Promise<void> {
    if (args.length !== 0 && args[0] !== '' && args[0].startsWith("https")) {
        const feedURL = args[0];
        const feeds = await getFeedsByURL(feedURL);

        if (feeds.length !== 0) {    // check if the url exists or not

            for (let index = 0; index < feeds.length; index++) {
                const feed = feeds[index];

                await deleteFeedFollowsForUser(user, feed);
            }

            console.log(`Remaining feeds that ${user.name} follows are:`);
            const currentUserFeeds = await getFeedFollowsForUser(user);

            for (let index = 0; index < currentUserFeeds.length; index++) {
                const feedFollow = currentUserFeeds[index];
                console.log(`${index + 1}. ${feedFollow.feeds.name}`);
            }
        } else {
            throw new Error("the url provided doesn't exist in feeds table");
        }


    } else {
        throw new Error("the unfollow handler expects a single argument, the feed url.");
    }

}

export async function handlerBrowse(cmdName: string, user: User, ...args: string[]): Promise<void> {
    if (args.length !== 0 && args[0] !== '') {
        const numOfPosts = parseInt(args[0], 10);

        if (numOfPosts > 0) {
            const returnedPosts = await getPostsForUser(user.id, numOfPosts);

            for (let index = 0; index < returnedPosts.length; index++) {
                const post = returnedPosts[index];

                console.log(`Feed Title: ${post.feed_name}`);
                console.log(`Link: ${post.feed_url}`);

                console.log(`======================== (Post ${index + 1}) ==========================`);
                console.log(`Title: ${post.title}\nURL: ${post.url}\nDescription: ${post.description}`);
                console.log(`Published At: ${post.published_at}\nFeed ID: ${post.feed_id}`);
                console.log(`==================================================\n`);
            }
        }

    } else {
        throw new Error("the browse handler expects a single argument, the number of posts.");
    }
}

export function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
    registry[cmdName] = handler;
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
    await registry[cmdName](cmdName, ...args);
}
