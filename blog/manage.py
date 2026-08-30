#!/usr/bin/env python3
"""
Blog Management Script for riccivr.github.io
Usage:
    python3 manage.py build          # Scans posts/ and rebuilds posts.json
    python3 manage.py new "Title"    # Creates a new markdown post template
"""

import os
import re
import json
import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
POSTS_DIR = os.path.join(BASE_DIR, "posts")
POSTS_JSON = os.path.join(BASE_DIR, "posts.json")

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
        # Clean markdown links/bold
        clean_p = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', p)
        clean_p = re.sub(r'[*_`]', '', clean_p)
        summary = clean_p[:200] + ('...' if len(clean_p) > 200 else '')
        break

    # Extract tags (or defaults)
    tags_match = re.search(r'Tags:\s*([^\n*]+)', content)
    if tags_match:
        tags = [t.strip() for t in tags_match.group(1).split(',')]
    else:
        # Infer default tags
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

def cmd_build():
    os.makedirs(POSTS_DIR, exist_ok=True)
    posts = []
    for fname in os.listdir(POSTS_DIR):
        if fname.endswith('.md'):
            fpath = os.path.join(POSTS_DIR, fname)
            post_meta = parse_post(fpath)
            posts.append(post_meta)

    # Sort by date descending, then by modification time descending (newest first)
    posts.sort(key=lambda x: (x['date'], x['_mtime']), reverse=True)

    # Remove internal _mtime before saving
    for p in posts:
        p.pop('_mtime', None)

    with open(POSTS_JSON, 'w', encoding='utf-8') as f:
        json.dump(posts, f, indent=2)

    print(f"[✓] Indexed {len(posts)} posts into {POSTS_JSON} (newest first)")

def cmd_new(title):
    os.makedirs(POSTS_DIR, exist_ok=True)
    slug = slugify(title)
    filename = f"{slug}.md"
    filepath = os.path.join(POSTS_DIR, filename)

    if os.path.exists(filepath):
        print(f"[!] Post already exists: {filepath}")
        return

    today = datetime.date.today().strftime("%B %d, %Y")
    today_iso = datetime.date.today().isoformat()

    template = f"""# {title}

*Published: {today} · Category: Systems & Architecture · Reading Time: ~3 min*

---

Write your introductory paragraph here...

## Section 1

Content goes here with standard markdown formatting, code fences, and lists.

```c
#include <stdio.h>

int main(void) {{
    printf("Hello from blog!\\n");
    return 0;
}}
```

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
