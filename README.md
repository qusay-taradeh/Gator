# 🐊 Gator — RSS Feed Aggregator CLI

Gator is a command-line RSS feed aggregator built with TypeScript, Drizzle ORM, and PostgreSQL. It lets you register users, subscribe to RSS feeds, and browse the latest posts — all from your terminal.

---

## Prerequisites

Before running Gator, make sure you have the following installed:

| Requirement | Version |
|---|---|
| [Node.js](https://nodejs.org/) | v18+ |
| [PostgreSQL](https://www.postgresql.org/) | v14+ |
| [tsx](https://github.com/privatenumber/tsx) | Latest (`npm install -g tsx`) |

Install project dependencies:

```bash
npm install
```

---

## Configuration

Gator reads its configuration from a JSON file located in your **home directory**:

```
~/.gatorconfig.json
```

Create this file manually before running the program:

```json
{
  "dbUrl": "postgres://your_user:your_password@localhost:5432/your_database?sslmode=disable",
  "currentUserName": ""
}
```

- **`dbUrl`** — Your full PostgreSQL connection string.
- **`currentUserName`** — The currently active user. This is managed automatically by the CLI (via `login` / `register`), so you can leave it as an empty string initially.

---

## Database Setup

Gator uses [Drizzle ORM](https://orm.drizzle.team/) for database migrations. After configuring your connection string, push the schema to your database:

```bash
npx drizzle-kit push
```

This will create the `users`, `feeds`, `feed_follows`, and `posts` tables.

---

## Running the CLI

```bash
npm run start <command> [arguments]
```

Or if you've built the project:

```bash
node dist/index.js <command> [arguments]
```

---

## Commands

### `register <username>`
Creates a new user and sets them as the current user in the config.

```bash
npm run start register alice
```

---

### `login <username>`
Switches the active user to an existing account.

```bash
npm run start login alice
```

---

### `users`
Lists all registered users. The currently active user is marked with `(current)`.

```bash
npm run start users
# * alice (current)
# * bob
```

---

### `addfeed <name> <url>`
*(Requires login)* Adds a new RSS feed to the database and automatically follows it as the current user.

```bash
npm run start addfeed "The Verge" https://www.theverge.com/rss/index.xml
```

---

### `feeds`
Lists all feeds in the database along with the name of the user who added them.

```bash
npm run start feeds
```

---

### `follow <url>`
*(Requires login)* Follows an existing feed by its URL.

```bash
npm run start follow https://www.theverge.com/rss/index.xml
```

---

### `following`
*(Requires login)* Lists all feeds the current user is following.

```bash
npm run start following
```

---

### `unfollow <url>`
*(Requires login)* Unfollows a feed by its URL.

```bash
npm run start unfollow https://www.theverge.com/rss/index.xml
```

---

### `agg <interval>`
Starts the feed aggregator loop, fetching new posts on a schedule. Runs until you press `Ctrl+C`.

Supported interval units: `ms`, `s`, `m`, `h`

```bash
npm run start agg 1m     # fetch every 1 minute
npm run start agg 30s    # fetch every 30 seconds
```

---

### `browse <limit>`
*(Requires login)* Displays the latest posts from feeds the current user follows.

```bash
npm run start browse 10
```

---

### `reset`
⚠️ **Destructive.** Truncates the `users`, `feeds`, and `posts` tables. Useful for development/testing.

```bash
npm run start reset
```

---

## Project Structure

```
src/
├── index.ts                  # Entry point
├── cli.ts                    # Command registration and handlers
├── rss.ts                    # RSS fetching and feed scraping logic
├── config.ts                 # Config file read/write (~/.gatorconfig.json)
└── lib/
    └── db/
        ├── index.ts          # Drizzle DB connection
        ├── schema.ts         # Table definitions
        └── queries/
            ├── users.ts
            ├── feeds.ts
            ├── feed_follows.ts
            └── posts.ts
```

---

## Example Workflow

```bash
# 1. Register a user
npm run start register alice

# 2. Add a feed (auto-followed)
npm run start addfeed "Hacker News" https://hnrss.org/frontpage

# 3. Start aggregating posts in the background
npm run start agg 1m

# 4. (In another terminal) Browse the latest posts
npm run start browse 5
```

---

## Notes & Known Limitations

- The `agg` command fetches feeds **one at a time** (round-robin by `last_fetched_at`), so with many feeds, set a short interval.
- Duplicate post URLs are silently skipped due to the `UNIQUE` constraint on `posts.url`. If a post fails to insert, the aggregator will continue without crashing — but currently **errors from duplicate posts are not caught gracefully** in `rss.ts`. Consider wrapping `createPost` in a try/catch with an `ON CONFLICT DO NOTHING` clause for robustness.
- RSS items missing a `title`, `link`, `description`, or `pubDate` field are **skipped** silently during parsing.

---

