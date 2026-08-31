# gitcrawl: Content-Addressable Web Archiver and Snapshot Engine Backed by Git

*Published: August 31, 2026. Category: Systems & Architecture. Reading time: ~6 min*
*Tags: C99, Git, Web Archiving, Crawlers, POSIX, Architecture, Systems*

---

In my [previous article on archiving the web with Git](post.html?post=preserving-the-web-with-git), I explored the theory behind using Git's content-addressable object store as a historical database for web pages and technical documentation.

The core premise was simple: instead of hoarding gigabytes of monolithic WARC archives or directories packed with duplicate HTML, use Git's directed acyclic graph and delta compression to get instant terminal diffs with `git diff` and `git log`.

Today I published the complete open-source implementation: [**`gitcrawl`**](https://github.com/riccivr/gitcrawl).

Here is the C99 engine architecture, how it talks directly to Git plumbing without touching the working directory, and storage benchmarks.

---

## 1. Pipeline Architecture

`gitcrawl` is built on the UNIX philosophy: a modular CLI tool written in clean C99, free of heavy runtimes, and optimized for automated pipelines and cron jobs.

```
                  ┌────────────────────────────────────────┐
                  │             Target URL / Stream        │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │       HTTP Engine & POSIX Sockets      │
                  │   - Headers, TLS info, Status Codes    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │             DOM Sanitizer              │
                  │ - Strip scripts, trackers, CSRF nonces │
                  │ - Preserve structural semantic tags    │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │    Markdown Parser (via unipaste)      │
                  │ - ASCII tables / Structured Markdown   │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │        Git Plumbing Layer (C99)        │
                  │  1. Hash-object: Markdown Blob         │
                  │  2. Hash-object: Metadata JSON Blob    │
                  │  3. Mktree: Hierarchical directory tree│
                  │  4. Commit-tree: Historic commit node  │
                  │  5. Update-ref: Atomic branch pointer  │
                  └───────────────────┬────────────────────┘
                                      │
                                      ▼
                  ┌────────────────────────────────────────┐
                  │         .git/objects (Packfiles)       │
                  └────────────────────────────────────────┘
```

---

## 2. In-Memory Ingest: Bypassing the Working Tree

A primary bottleneck when tracking thousands of URLs is filesystem I/O. If you checkout a repository containing 50,000 pages, the filesystem struggles creating and deleting inodes.

`gitcrawl` never touches the working tree. It writes directly to the `.git/objects` database:

```c
/* Core structure for direct object store insertion */
typedef struct {
    char sha_hex[41];
    size_t size;
    const char *path;
} git_blob_t;

/* Injects a blob in memory without writing a temporary file to disk */
int git_write_blob_stream(const char *data, size_t len, char *out_sha) {
    /* Executes internal plumbing equivalent: git hash-object -w --stdin */
    return git_plumbing_hash_object(data, len, out_sha);
}
```

When processing a URL:
1. Raw HTML is sanitized inside a memory-bounded buffer.
2. The engine generates two blobs: `index.md` (normalized readable content) and `metadata.json` (HTTP headers, timestamp, remote IP, status code, and redirect chain).
3. The hierarchical tree (`git mktree`) is constructed by sharding host and path (`docs.rs/tokio/index.md`).
4. If the computed tree hash matches the previous commit, `gitcrawl` detects in **0 ms** that the page is unchanged and skips commit creation.
5. If changes occurred, an atomic commit is generated (`git commit-tree`) and the branch ref is updated (`git update-ref refs/heads/archive`).

---

## 3. Noise Reduction and Normalization

Committing raw HTML produces dirty diffs on every crawl cycle due to session cookies, CSRF nonces, and server render timestamps.

`gitcrawl` embeds a streaming parser inspired by [`unipaste`](https://github.com/riccivr/unipaste). It extracts primary semantic content (`<main>`, `<article>`, or the densest text node), converting headings, tables, lists, and code blocks into clean Markdown.

```markdown
<!-- Clean diff produced by git diff on an API doc update -->
--- a/api.stripe.com/v1/charges/index.md
+++ b/api.stripe.com/v1/charges/index.md
@@ -14,3 +14,5 @@
 | `amount` | integer | Amount in cents |
-| `currency` | string | 3-letter ISO code |
+| `currency` | string | 3-letter ISO code (e.g. usd, eur) |
+| `payment_method` | string | ID of the attached payment method |
```

---

## 4. Benchmarks and Storage Efficiency

We tested `gitcrawl` by snapshotting 500 technical documentation pages (RFC specs, Python docs, and POSIX manuals) daily across 30 days:

| Archival Strategy | Disk Usage (30 snapshot cycles) | Terminal Diff Speed | Requires Database |
|---|---|---|---|
| **Raw HTML on Disk** | 4.8 GB | Slow (`diff -r`) | No |
| **WARC Archives** | 3.2 GB | Non-native (needs WARC tools) | Yes / Indices |
| **`gitcrawl` (Git Packfiles)** | **142 MB** | **Instant (`git diff`, `git log`)** | **No (Native Git)** |

Thanks to Git delta compression (`git pack-objects`), pages with only minor text modifications take just a few bytes per historic snapshot.

---

## 5. Why Not SQLite or Flat Files? The Distributed & Multi-Agent Advantage

A recurring question when designing this storage architecture is: *Why not store snapshots in an embedded database like SQLite, or in an S3 bucket with flat files?*

For single-node local runs, SQLite works fine. But as soon as you scale to modern workflows with **multiple distributed crawler agents** running concurrently across machines, containers, or regions, traditional storage models break down:

### The Limitations of SQLite and Flat Files in Multi-Agent Systems:
1. **Lock Contention & Network Sync Friction:** SQLite does not support multiple concurrent network writers without blocking (`SQLITE_BUSY` or write-ahead log lock queues). Synchronizing SQLite across nodes requires heavy consensus layers (Raft/LiteFS) or copying whole databases.
2. **Merging Conflict Nightmare:** If three autonomous crawler agents run across different cloud regions and later try to combine their SQLite databases, reconciling auto-increment IDs, timestamp collisions, and row-level conflicts becomes complicated.
3. **Flat Files / S3 Race Conditions:** Storing raw files leads to race conditions (*Last Write Wins*), wiping intermediate historical states when two workers hit the same URL around the same time. There is also no native cross-revision delta compression.

```
                      Agent Alpha (us-east)   ──> Branch: agent/alpha
                                                            │
                      Agent Bravo (eu-west)   ──> Branch: agent/bravo ──> Git Merge (Lock-Free)
                                                            │             ├── Automatic SHA Deduplication
                      Agent Charlie (ap-tokyo) ──> Branch: agent/charlie └── Packfile Delta Compression
```

### Why Git's Merkle DAG Naturally Tames Multi-Agent Chaos:

1. **Zero-Coordination Cryptographic Deduplication:** Git is a content-addressable store. If 10 distributed crawler agents scrape the exact same page at the exact same moment and the content is unchanged, all 10 compute the *exact same SHA hash*. Deduplication happens mathematically and instantly without a central coordinator or distributed locks.
2. **Independent Branching & Conflict-Free Convergence:** Each crawler agent works on its own branch (`agent/crawler-eu`, `agent/crawler-us`) or local clone. When a batch finishes, they push to a central bare repo (or sync peer-to-peer). Reconciling the entire archive history is a standard non-blocking `git merge`. Because crawlers touch disjoint directory paths in the tree, merges resolve in milliseconds.
3. **Cryptographic Provenance & Tamper Evidence:** Every snapshot is cryptographically linked to its parent tree and author metadata. It is mathematically impossible to modify a historical snapshot without invalidating all downstream commit hashes. Commits can be signed (`git commit -S`) to trace exactly which agent or AI pipeline captured a given version.
4. **Bandwidth-Efficient Delta Syncing:** Git's native wire protocol (`git-upload-pack` / `git-receive-pack`) computes deltas on the fly. Agents only transfer the bytes that actually changed over the network, drastically cutting down cloud egress costs.

---

## 6. CLI Toolchain Integration

Because snapshots reside in standard Git repositories, `gitcrawl` integrates seamlessly with your terminal workflow:

- **Fuzzy history inspection with [`approx`](https://github.com/riccivr/approx):**
  ```bash
  git log --name-only --format="" | sort -u | approx "stripe charges"
  ```
- **Tracking keyword evolutions:**
  ```bash
  git log -p -S "deprecated" -- docs.github.com/
  ```
- **Direct input for LLMs and RAG pipelines:**
  Because the repository stores structured Markdown, you can feed local LLMs directly using `cat` or Bash pipes.

Source code, build instructions, and configuration options are available on GitHub: [**`github.com/riccivr/gitcrawl`**](https://github.com/riccivr/gitcrawl).
