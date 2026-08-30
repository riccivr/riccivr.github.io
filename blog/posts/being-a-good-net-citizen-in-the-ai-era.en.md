# Being a good net citizen in the AI era: a guide to web discoverability

*Published: August 30, 2026. Category: Web Standards & Cloud. Reading time: ~5 min*
*Tags: Web Standards, AI, SEO, Crawlers, Architecture, Semantic Web*

---

Search engines changed the web by indexing links. Now automated agents, RAG pipelines, and LLM search tools like Perplexity and Claude are crawling sites to answer user queries directly.

If a crawler needs to run 15MB of client-side JavaScript just to see your content, it will drop the connection. Many AI agents run on strict token and latency budgets and do not execute JavaScript.

Here are practical steps to make a site readable for machines without wasting server bandwidth or fighting crawlers.

---

## 1. Static-first HTML and real semantic tags

Googlebot can spin up headless Chromium instances to render complex single page apps. Most smaller crawlers and AI search bots do not do that. They make a basic GET request and expect raw text back.

```
Crawler GET request (/article)
         │
         ├── Heavy client SPA ──> Returns <div id="root"></div> ──> Dropped
         │
         └── Static HTML      ──> Returns complete semantic DOM ──> Parsed
```

### What to do:
- Return pre-rendered HTML. Make sure your articles and docs exist in the initial HTTP response before any client scripts run.
- Use real HTML5 tags like `<main>`, `<article>`, `<header>`, `<nav>`, `<aside>`, and `<time>`. Parsers use these tags to separate article content from navigation bars and footers.
- Use logical heading levels from `<h1>` to `<h4>`. LLM chunking algorithms split documents by headings when building context windows.

---

## 2. Host an `llms.txt` file and plain text feeds

The `llms.txt` standard is a simple Markdown file hosted at `/llms.txt`. It gives LLMs a clean index of your most relevant pages and project docs without scraping junk.

```
# Ricardo Veronese

> Systems tools in C99, cloud infrastructure, and algorithms.

## Projects
- [approx](https://riccivr.github.io/): POSIX fuzzy stream filter in C99.
- [unipaste](https://riccivr.github.io/): Clipboard HTML to Markdown formatter.

## Core articles
- [Archiving the web with Git](https://riccivr.github.io/blog/posts/preserving-the-web-with-git.en.md): Git-native web crawling.
- [Can you use GitHub as a database?](https://riccivr.github.io/blog/posts/using-github-as-a-database.en.md): SQLite VFS over HTTP range queries.
```

### Other useful feeds:
- Keep an RSS or Atom feed at `/feed.xml`. AI agents and feed readers check this to find new articles without polling the entire site.
- When possible, serve raw Markdown directly or provide `.md` mirrors of your technical writeups.

---

## 3. Structured data with Schema.org JSON-LD

To help AI search engines cite your name, original URL, and publication date correctly, put a small JSON-LD block in the `<head>` of each article.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Archiving the web with Git: building a content-addressable web historian",
  "author": {
    "@type": "Person",
    "name": "Ricardo Veronese",
    "url": "https://riccivr.github.io"
  },
  "datePublished": "2026-08-30",
  "dateModified": "2026-08-30",
  "description": "Using Git packfiles and low-level plumbing to archive web pages.",
  "dependencies": "C99, POSIX, Git"
}
</script>
```

When an agent cites your post in a summary, this schema helps it reference your canonical link and publication date instead of hallucinating details.

---

## 4. Clear `robots.txt` rules

Blocking all bots with `User-agent: * Disallow: /` removes your site from AI search indexes. It helps to separate live search crawlers from bulk training scrapers.

```txt
# Allow search and citation crawlers
User-agent: Google-Extended
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

# Block bulk training scrapers if desired
User-agent: CCBot
Disallow: /telemetry/

Crawl-delay: 1
Sitemap: https://riccivr.github.io/sitemap.xml
```

Always include a clean `sitemap.xml` with accurate `lastmod` dates so crawlers do not re-download unchanged pages.

---

## 5. HTTP caching and server politeness

Good sites respect both human visitors and automated tools.

1. Support `ETag` and `If-Modified-Since` headers. Returning `HTTP 304 Not Modified` saves bandwidth for both you and the crawler.
2. Avoid Cloudflare challenges or CAPTCHAs on public open-source documentation. Forcing interactive verification breaks tools like `curl`, CLI scrapers, and terminal readers.
3. Set accurate Open Graph tags like `og:title`, `og:description`, and `rel="canonical"`.

---

## Summary

| Topic | Recommendation | Reason |
| :--- | :--- | :--- |
| HTML rendering | Static HTML or server-rendered DOM | Fast parsing, zero client JS requirement |
| Semantics | Standard HTML5 tags | Clean chunking for RAG pipelines |
| Machine indexes | `/llms.txt` and `/feed.xml` | Low token consumption for AI agents |
| Attribution | Schema.org JSON-LD | Accurate author and link citations |
| Caching | `ETag` and `304 Not Modified` | Saves server bandwidth and energy |
| Crawl policy | Clear `robots.txt` and `sitemap.xml` | Controls search bots vs bulk scrapers |

Building for the modern web means making content readable for people in browsers and easy to parse for automated tools.
