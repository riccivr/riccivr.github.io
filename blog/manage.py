#!/usr/bin/env python3
"""
Blog & Site Discoverability Management Script for riccivr.github.io
Usage:
    python3 manage.py build          # Rebuilds posts.json, sitemap.xml, feed.xml, and llms.txt
    python3 manage.py new "Title"    # Creates a new markdown post template
"""

import os
import re
import json
import datetime
from xml.sax.saxutils import escape

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SITE_ROOT = os.path.dirname(BASE_DIR)
POSTS_DIR = os.path.join(BASE_DIR, "posts")
POSTS_JSON = os.path.join(BASE_DIR, "posts.json")
SITEMAP_XML = os.path.join(SITE_ROOT, "sitemap.xml")
FEED_XML = os.path.join(SITE_ROOT, "feed.xml")
LLMS_TXT = os.path.join(SITE_ROOT, "llms.txt")

SITE_URL = "https://riccivr.github.io"
AUTHOR_NAME = "Ricardo Veronese"
AUTHOR_EMAIL = "ricci.vr@gmail.com"

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')

def estimate_reading_time(content):
    words = len(re.findall(r'\w+', content))
    minutes = max(1, round(words / 200))
    return f"{minutes} min"

def parse_post(filepath):
    slug = os.path.splitext(os.path.basename(filepath))[0]
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract title (# Title)
    title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
    title = title_match.group(1) if title_match else slug.replace('-', ' ').title()

    # Extract date (*Published: ...* or frontmatter)
    date_match = re.search(r'Published:\s*([A-Za-z]+ \d{1,2}, \d{4}|\d{4}-\d{2}-\d{2})', content)
    if date_match:
        try:
            d_str = date_match.group(1)
            if '-' in d_str:
                date = d_str
            else:
                dt = datetime.datetime.strptime(d_str, "%B %d, %Y")
                date = dt.strftime("%Y-%m-%d")
        except Exception:
            date = datetime.date.today().isoformat()
    else:
        date = datetime.date.today().isoformat()

    # Extract category
    cat_match = re.search(r'Category:\s*([^·\n*]+)', content)
    category = cat_match.group(1).strip() if cat_match else "Systems & Architecture"

    # Extract summary (first paragraph after title/metadata)
    paragraphs = [p.strip() for p in re.split(r'\n\s*\n', content) if p.strip()]
    summary = ""
    for p in paragraphs:
        if p.startswith('#') or p.startswith('*') or p.startswith('---') or p.startswith('```'):
            continue
        clean_p = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', p)
        clean_p = re.sub(r'[*_`]', '', clean_p)
        summary = clean_p[:220] + ('...' if len(clean_p) > 220 else '')
        break

    # Extract tags
    tags_match = re.search(r'Tags:\s*([^\n*]+)', content)
    if tags_match:
        tags = [t.strip() for t in tags_match.group(1).split(',')]
    else:
        tags = ["Systems", "Architecture"]

    reading_time = estimate_reading_time(content)
    mtime = os.path.getmtime(filepath)

    return {
        "slug": slug,
        "title": title,
        "date": date,
        "category": category,
        "tags": tags,
        "summary": summary,
        "readingTime": reading_time,
        "file": f"posts/{os.path.basename(filepath)}",
        "_mtime": mtime
    }

def generate_sitemap(posts):
    today = datetime.date.today().isoformat()
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
    ]

    # Home page
    xml_lines.append('  <url>')
    xml_lines.append(f'    <loc>{SITE_URL}/</loc>')
    xml_lines.append(f'    <lastmod>{today}</lastmod>')
    xml_lines.append('    <changefreq>weekly</changefreq>')
    xml_lines.append('    <priority>1.0</priority>')
    xml_lines.append('  </url>')

    # Blog index
    xml_lines.append('  <url>')
    xml_lines.append(f'    <loc>{SITE_URL}/blog/</loc>')
    xml_lines.append(f'    <lastmod>{today}</lastmod>')
    xml_lines.append('    <changefreq>daily</changefreq>')
    xml_lines.append('    <priority>0.9</priority>')
    xml_lines.append('  </url>')

    # Each post
    for post in posts:
        post_url = f"{SITE_URL}/blog/post.html?post={post['slug']}"
        xml_lines.append('  <url>')
        xml_lines.append(f'    <loc>{post_url}</loc>')
        xml_lines.append(f'    <lastmod>{post["date"]}</lastmod>')
        xml_lines.append('    <changefreq>monthly</changefreq>')
        xml_lines.append('    <priority>0.8</priority>')
        xml_lines.append('  </url>')

    xml_lines.append('</urlset>')

    with open(SITEMAP_XML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(xml_lines) + '\n')
    print(f"[✓] Generated {SITEMAP_XML}")

def generate_rss(posts):
    now_rfc822 = datetime.datetime.now(datetime.timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
        '  <channel>',
        f'    <title>{AUTHOR_NAME} - Technical Logs & Systems</title>',
        f'    <link>{SITE_URL}/blog/</link>',
        '    <description>Thoughts on cloud architecture, systems engineering, C99, algorithms & embedded IoT.</description>',
        '    <language>en-us</language>',
        f'    <lastBuildDate>{now_rfc822}</lastBuildDate>',
        f'    <atom:link href="{SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>'
    ]

    for post in posts:
        post_url = f"{SITE_URL}/blog/post.html?post={post['slug']}"
        dt = datetime.datetime.strptime(post["date"], "%Y-%m-%d")
        pub_date = dt.strftime("%a, %d %b %Y 12:00:00 GMT")

        xml_lines.append('    <item>')
        xml_lines.append(f'      <title>{escape(post["title"])}</title>')
        xml_lines.append(f'      <link>{post_url}</link>')
        xml_lines.append(f'      <guid isPermaLink="true">{post_url}</guid>')
        xml_lines.append(f'      <pubDate>{pub_date}</pubDate>')
        xml_lines.append(f'      <description>{escape(post["summary"])}</description>')
        for tag in post.get("tags", []):
            xml_lines.append(f'      <category>{escape(tag)}</category>')
        xml_lines.append('    </item>')

    xml_lines.append('  </channel>')
    xml_lines.append('</rss>')

    with open(FEED_XML, 'w', encoding='utf-8') as f:
        f.write('\n'.join(xml_lines) + '\n')
    print(f"[✓] Generated {FEED_XML}")

def generate_llms_txt(posts):
    lines = [
        f"# {AUTHOR_NAME}",
        "",
        "> Systems & Cloud Engineer specializing in AWS, Cloud Architecture, C99/POSIX low-level systems, parsers, and memory-bounded algorithms.",
        "",
        "## Active Projects",
        "- [approx](https://github.com/riccivr/approx): Non-interactive POSIX fuzzy stream filter and ranker in clean Suckless C with zero dependencies.",
        "- [unipaste](https://github.com/riccivr/unipaste): Zero-dependency POSIX universal rich text & clipboard converter producing structured Markdown and ASCII tables.",
        "- [clipbridge](https://github.com/riccivr/clipbridge): Cross-platform universal clipboard listener daemon powered by unipaste.",
        "",
        "## Engineering Logs & Articles"
    ]

    for post in posts:
        md_url = f"{SITE_URL}/blog/{post['file']}"
        lines.append(f"- [{post['title']}]({md_url}): {post['summary']}")

    lines.extend([
        "",
        "## Machine Feeds & Meta",
        f"- RSS Feed: {SITE_URL}/feed.xml",
        f"- Sitemap: {SITE_URL}/sitemap.xml",
        f"- Website: {SITE_URL}/",
        f"- Blog: {SITE_URL}/blog/",
        "- GitHub: https://github.com/riccivr",
        "- LinkedIn: https://www.linkedin.com/in/riccivr/",
        f"- Email: {AUTHOR_EMAIL}"
    ])

    with open(LLMS_TXT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
    print(f"[✓] Generated {LLMS_TXT}")

def cmd_build():
    os.makedirs(POSTS_DIR, exist_ok=True)
    posts = []
    for fname in os.listdir(POSTS_DIR):
        if fname.endswith('.md'):
            fpath = os.path.join(POSTS_DIR, fname)
            post_meta = parse_post(fpath)
            posts.append(post_meta)

    # Sort newest first
    posts.sort(key=lambda x: (x['date'], x['_mtime']), reverse=True)

    # Save posts.json
    clean_posts = []
    for p in posts:
        item = dict(p)
        item.pop('_mtime', None)
        clean_posts.append(item)

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(clean_posts, f, indent=2)
    print(f"[✓] Indexed {len(clean_posts)} posts into {POSTS_JSON}")

    # Generate metadata artifacts
    generate_sitemap(clean_posts)
    generate_rss(clean_posts)
    generate_llms_txt(clean_posts)

def cmd_new(title):
    os.makedirs(POSTS_DIR, exist_ok=True)
    slug = slugify(title)
    filename = f"{slug}.md"
    filepath = os.path.join(POSTS_DIR, filename)

    if os.path.exists(filepath):
        print(f"[!] Post already exists: {filepath}")
        return

    today = datetime.date.today().strftime("%B %d, %Y")

    template = f"""# {title}

*Published: {today} · Category: Systems & Architecture · Reading Time: ~4 min*
*Tags: Systems, Architecture*

---

Write your introductory paragraph here...

## Section 1

Write your content here...

## Summary

Key takeaways and conclusions.
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(template)

    print(f"[✓] Created new post: {filepath}")
    cmd_build()

if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2 or sys.argv[1] == 'build':
        cmd_build()
    elif sys.argv[1] == 'new' and len(sys.argv) > 2:
        cmd_new(sys.argv[2])
    else:
        print("Usage:\n  python3 manage.py build\n  python3 manage.py new \"Post Title\"")
