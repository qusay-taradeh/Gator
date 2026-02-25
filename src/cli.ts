import { readConfig, setUser } from "./config.js";
import { User, createUser, getUser, getUsers, truncateUsers } from "./lib/db/queries/users.js";
import { createFeed, getFeedsByURL, truncateFeeds } from "./lib/db/queries/feeds.js";
import { createFeedFollow, getFeedFollowRecords, getFeedFollowsForUser, deleteFeedFollowsForUser } from "./lib/db/queries/feed_follows.js";
import { fetchFeed } from "./rss.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

type UserCommandHandler = (cmdName: string, user: User, ...args: string[]) => Promise<void>;

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
    console.log(`users table and feeds table have truncated`);
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

export async function handlerAgg(cmdName: string, ...args: string[]) {
    const feedURL = "https://www.wagslane.dev/index.xml";

    const response = await fetchFeed(feedURL);

    console.log(response);

    const items = response.channel.item;
    for (let index = 0; index < items.length; index++) {
        const item = items[index];
        console.log(item);
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

export function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler) {
    registry[cmdName] = handler;
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]) {
    await registry[cmdName](cmdName, ...args);
}

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
}