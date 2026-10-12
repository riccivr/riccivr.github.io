# d1-pages-starter: connecting GitHub Pages with serverless SQLite using Cloudflare D1 and Workers

*Published: October 12, 2026. Category: Systems & Cloud. Reading time: ~5 min*
*Tags: SQLite, Cloudflare D1, Cloudflare Workers, GitHub Pages, CLI, Serverless*

---

Whenever I want to build a small utility, note board, waitlist, or interactive web widget, I stick to two rules: zero monthly hosting bills and zero virtual machines to maintain.

For the frontend, GitHub Pages handles almost everything: free static hosting, fast global CDN delivery, automated git-based deployments, and 100 GB of monthly bandwidth. But the moment you need visitor interaction and persistent data storage, you hit the traditional barrier of static websites: there is no database to write to.

For a long time, the standard recommendation for hobby projects was PlanetScale, until they discontinued their free tier in April 2024 and introduced a $39/month minimum plan. Committing a raw `.sqlite` file directly into a GitHub Pages repository is also not a viable solution for user writes. While experiments with WebAssembly (`sql.js-httpvfs`) permit read-only querying over HTTP Range requests, files on GitHub Pages are public by definition (anyone can download the entire database), and static file servers reject `POST` or `PUT` requests, making runtime writes impossible.

To solve this directly, I built [**`d1-pages-starter`**](https://github.com/riccivr/d1-pages-starter): an edge architecture that connects GitHub Pages to **Cloudflare D1** (serverless native SQLite) using **Cloudflare Workers** as a secure gateway, accompanied by an interactive CLI to initialize projects in seconds.

---

## 1. The architecture: an edge bridge between GitHub Pages and D1

The core model cleanly decouples static asset delivery from data persistence. Visitors download HTML, CSS, and client-side JavaScript from GitHub Pages, then make REST requests to a Cloudflare Worker that validates payloads, enforces CORS boundaries, and runs prepared SQL statements against Cloudflare D1.

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Visitor Browser                                           │
│ - Downloads static UI bundle (HTML, CSS, JS)                 │
└──────────────────────────────┬───────────────────────────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
┌──────────────────────────────┐┌──────────────────────────────┐
│ GitHub Pages (Hosting)       ││ Cloudflare Worker (Gateway)  │
│ - Global static CDN          ││ - Validates lengths & types  │
│ - 100 GB/month bandwidth     ││ - Restricts CORS origins     │
│ - Zero cold starts           ││ - Native env.DB binding      │
└──────────────────────────────┘└──────────────┬───────────────┘
                                               │
                                               ▼
                                ┌──────────────────────────────┐
                                │ Cloudflare D1 (Edge SQLite)  │
                                │ - Prepared SQL queries       │
                                │ - 5 GB storage               │
                                │ - 5M reads / 100k writes/day │
                                └──────────────────────────────┘
```

This layout brings three specific technical advantages:

1. **Zero client-side secrets:** Browser clients never receive database credentials or connection tokens. D1 binds natively to the Worker runtime through `env.DB`, preventing accidental secret leaks in frontend bundles.
2. **Zero infrastructure cost:** GitHub Pages provides 100 GB/month of egress; Cloudflare Workers includes 100,000 requests per day on the free tier; and Cloudflare D1 offers 5 GB of storage, 5 million reads, and 100,000 writes daily. For side projects, prototypes, or internal tools, total hosting cost is zero dollars.
3. **Offline local emulation:** Using Wrangler, running `wrangler d1 execute --local` initializes and tests SQLite tables directly on your local machine without sending network traffic to cloud services.

---

## 2. Multi-language runtimes: TypeScript, Rust, and Python

While TypeScript is common on Cloudflare Workers, you are not restricted to JavaScript. Because Workers run on V8 with WebAssembly support, you can compile backends directly in **Rust** using [`worker-rs`](https://github.com/cloudflare/workers-rs), delivering memory safety, low resource overhead, and native D1 database bindings:

```rust
use worker::*;
use serde::{Deserialize, Serialize};

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let d1 = env.d1("DB")?;
    let stmt = d1.prepare("SELECT id, name, message FROM posts ORDER BY id DESC LIMIT 50");
    let results = stmt.all().await?.results::<serde_json::Value>()?;
    Response::from_json(&serde_json::json!({ "success": true, "data": results }))
}
```

For developers who prefer concise scripting without heavy build toolchains, Cloudflare Workers also natively supports Python through Pyodide.

---

## 3. An interactive scaffolding CLI

To avoid manual directory copying and Wrangler configuration, the repository includes an interactive terminal CLI inspired by `bun create`:

```bash
# Using bun:
bun create d1-pages my-app

# Using npx:
npx create-d1-pages my-app

# Directly from the repository:
node bin/cli.js
```

The terminal prompts step through:

* **Database:** Cloudflare D1 (native SQLite) or Turso (distributed libSQL).
* **Backend runtime:** TypeScript, Rust (WebAssembly), or Python.
* **Frontend:** Vanilla JS (zero build step), React with Vite and Tailwind CSS, Astro (static site with interactive islands), or Svelte 5 with runes.
* **Schema preset:** Community guestbook, waitlist signup with validation, or atomic counters for votes and views.
* **CI/CD:** Automated GitHub Actions workflows to deploy both GitHub Pages and Cloudflare Workers on `git push`.

The project, CLI tool, and templates are open source under the MIT license at [**github.com/riccivr/d1-pages-starter**](https://github.com/riccivr/d1-pages-starter).
