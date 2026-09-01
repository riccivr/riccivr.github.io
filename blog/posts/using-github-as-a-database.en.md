# Can you use GitHub as a database? SQLite, HTTP range requests, and flat files

*Published: August 30, 2026. Category: Architecture & Systems. Reading time: ~4 min*
*Tags: SQLite, GitHub Pages, HTTP Range, Architecture, Cloud*

---

I often look for ways to keep side projects zero-maintenance and zero-cost, which made me wonder: can I just use GitHub as a persistent database?

The short answer is yes, but it depends heavily on read and write patterns. It works surprisingly well for read-heavy static datasets, and terribly for real-time concurrent writes.

Here is my architectural look at how SQLite over HTTP range requests works on GitHub Pages, how to handle flat-file writes, and where the operational trade-offs break down.

---

## 1. Read-only SQLite with HTTP range requests

A clean pattern is hosting a `.sqlite` file on GitHub Pages or Releases and querying it directly from the browser without downloading the full database.

```
Browser client (sql.js-httpvfs or SQLite WASM)
Query: SELECT * FROM articles WHERE id = 42;
1. Reads SQLite 100-byte header
2. Fetches B-Tree root page (Range: bytes=4096-8191)
3. Fetches target leaf page (Range: bytes=16384-...)
                       │
                       ▼ HTTP GET with Range headers
GitHub Pages or CDN storage (database.sqlite)
```

### How it works:

1. Virtual File System. Libraries like [`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) or SQLite's official WebAssembly build replace SQLite's default OS disk interface (`sqlite3_vfs`).
2. Partial byte downloads. Instead of loading a 300MB database into memory, the browser sends HTTP requests with `Range: bytes=start-end`.
3. B-Tree navigation. SQLite organizes tables and indexes into fixed 4096-byte pages. The engine requests only the 2 to 4 pages required to complete an index lookup.

### Advantages:
- Zero hosting costs on static CDNs.
- Edge caching on static byte ranges.
- Fast lookups on large read-only datasets like public census records or search indexes.

---

## 2. Read-write patterns with Git commits and GitHub API

GitHub does not run database daemons like Postgres or MySQL listening on raw TCP sockets. To write data, you use the GitHub REST API or Git workflows.

### Flat-file document storage (JSON / YAML / Markdown)
Do not commit binary `.sqlite` files on every write because Git packfiles will balloon in size. Instead, store entities as plain text files:

```
data/
  ├── users/
  │    ├── usr_01.json
  │    └── usr_02.json
  └── telemetry/
       └── 2026-08-30.json
```

- Your app sends a `PUT /repos/{owner}/{repo}/contents/{path}` request with base64 data.
- Every write creates a Git commit with a timestamp and clean text diffs.

### Issues and discussions as structured storage
Comment engines like [`Giscus`](https://giscus.app/) and [`Utterances`](https://utteranc.es/) map comments directly to GitHub Discussions or Issues. You get GitHub authentication, spam filtering, and notifications without building a backend.

### GitHub Actions for scheduled batch jobs
Workflows triggered on a cron schedule can run scrapers, update JSON or SQLite files, and commit the updated data back to the repo.

---

## Comparison

| Feature | GitHub as a DB | Serverless SQLite (Turso / D1) | Managed DB (Postgres / RDS) |
| :--- | :--- | :--- | :--- |
| Hosting cost | $0 | Free tier / Pay per read | $15 to $100+/month |
| Read latency | 50ms to 300ms (CDN) | 10ms to 30ms (Edge) | 5ms to 20ms |
| Write latency | 1s to 5s (Git commit) | 10ms to 50ms | Under 5ms |
| Concurrency | Risk of merge conflicts | Multi-region replication | ACID row locks |
| Rate limits | 5,000 requests/hour | Millions ops/month | Connection pool bound |
| Binary diffs | Large `.git` bloat | Clean storage engine | Standard WAL storage |

---

## Conclusion

1. Use GitHub Pages with SQLite VFS if you have a static, read-only dataset that you want to host for free with zero maintenance.
2. Use flat files with the GitHub API for low-frequency writes where you want an audit trail, like static blog comments or personal bookmarks.
3. Avoid GitHub as a database for applications that need fast write latencies, high concurrency, or private customer records.
