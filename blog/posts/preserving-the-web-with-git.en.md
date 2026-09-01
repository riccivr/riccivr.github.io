# Archiving the web with Git: building a content-addressable crawler

*Published: August 30, 2026. Category: Systems & Architecture. Reading time: ~5 min*
*Tags: Git, Web Archiving, Crawlers, Systems, C99, Architecture*

---

> **Update**: The concepts explored in this post are now implemented and available as an open-source project: [**`gitcrawl`**](https://github.com/riccivr/gitcrawl). Read the full technical writeup, benchmarks, and architecture specifications in: [**`gitcrawl: Content-Addressable Web Archiver and Snapshot Engine Backed by Git`**](gitcrawl-content-addressable-web-archiver.html).

---

Web pages disappear all the time. Companies delete docs during rebrands, terms of service change without changelogs, and links rot.

The Wayback Machine is great for visual browsing, but it is not built for running fast local diffs, grep queries, or UNIX shell scripts.

I have been testing a different approach: crawling web pages and committing their history straight into Git repositories.

Here is how Git works as a storage backend for web archival and what I found while building a prototype.

---

## 1. Why Git works as a storage backend

Git is a content-addressable object store structured as a directed acyclic graph. It is built to track text changes over time with minimal disk space.

```
Crawler pipeline
URL fetch -> DOM sanitization -> Markdown normalization
                       │
                       ▼ Atomic commit
Git object store (.git/objects)
Commit (Author, Timestamp, Tree SHA)
  └── Tree (example.com/docs/)
        ├── Blob (index.md) -> Delta compressed
        ├── Blob (metadata.json)
        └── Blob (assets/hero.webp) -> SHA deduplicated
```

### Useful properties:

1. Content deduplication. Git indexes every file by its cryptographic hash. If 500 crawled pages use the same CSS file or logo, Git stores that blob once.
2. Delta compression in packfiles. When a documentation page changes by a single line, Git packfiles (`git pack-objects`) store only the byte delta. Crawling a site hundreds of times does not duplicate the entire HTML body every run.
3. Standard CLI tools. You get immediate access to built-in Git commands:
   - `git diff v1..v2 -- path/to/page.md` shows exact text changes in your terminal.
   - `git log -p -S "deprecated_param"` finds the exact commit where a phrase was added or removed.
   - `git bisect` runs automated tests across snapshots to find when an external site introduced a breaking change.

---

## 2. Ingestion and noise reduction

The main problem with archiving raw HTML into Git is non-deterministic noise.

If you commit raw HTML from a browser request, every run creates fake diffs from CSRF tokens, session cookies, timestamp banners, and randomized ad containers.

```
Raw HTTP response
       │
       ▼
[ Fetch stream ]
       │
       ▼
[ DOM sanitizer ] ──> Strip scripts, tracking pixels, volatile attributes
       │
       ▼
[ Stream parser ] ──> Convert clean DOM into normalized Markdown
       │
       ▼
[ Git plumbing ]  ──> Write tree and commit directly to .git/objects
```

### Two-tier file layout:

To keep diffs clean while preserving original payloads, each snapshot writes two files:

```
archive/
  └── example.com/
        └── api/
              └── v1/
                    ├── index.md        <-- Clean Markdown for git diff
                    ├── index.html.gz   <-- Compressed original HTML payload
                    └── metadata.json   <-- HTTP headers, status code, IP, timestamp
```

- `index.md` produces readable terminal diffs for prose, tables, and code fences.
- `metadata.json` stores headers, redirect chains, and TLS cert hashes.

---

## 3. Directory sharding

Storing tens of thousands of URLs in a single flat folder hurts filesystem inode performance.

Decomposing the URL into directory shards keeps directories manageable:

```
https://docs.kernel.org/process/submitting-patches.html
  └── docs.kernel.org/
        └── process/
              └── submitting-patches/
                    ├── index.md
                    └── metadata.json
```

Query parameters are sorted alphabetically and saved under dedicated subfolders. Reserved characters on POSIX and Windows (`:`, `*`, `?`, `"`, `<`, `>`, `|`) are escaped with hex hashes.

---

## 4. Bypassing the working tree for speed

Standard commands like `git add` and `git checkout` write every file to disk. On large crawls with thousands of pages, disk I/O becomes the bottleneck.

For fast ingestion, you can skip the working directory and write objects straight into `.git/objects` using Git plumbing commands or C bindings:

```
1. Write Blob:   git hash-object -w <payload>       -> Blob SHA
2. Make Tree:    git mktree <tree_definition>       -> Tree SHA
3. Make Commit:  git commit-tree <tree_sha> -p HEAD -> Commit SHA
4. Update Ref:   git update-ref refs/heads/main <commit_sha>
```

This keeps commits in memory and takes milliseconds instead of seconds per batch. Running `git gc --prune=now` periodically compresses the packfiles.

---

## 5. From prototype to `gitcrawl`

The standalone CLI tool based on this architecture is now live:

1. A core C99 engine for streaming HTTP fetches and DOM sanitization with zero dependencies: [**`gitcrawl`**](https://github.com/riccivr/gitcrawl).
2. A stream parser based on the Markdown conversion engine from [`unipaste`](https://github.com/riccivr/unipaste).
3. Fast terminal history search using fuzzy matching with [`approx`](https://github.com/riccivr/approx).

Check out the full technical writeup, compression benchmarks, and usage patterns in the launch post: [**`gitcrawl: Content-Addressable Web Archiver and Snapshot Engine Backed by Git`**](gitcrawl-content-addressable-web-archiver.html).
