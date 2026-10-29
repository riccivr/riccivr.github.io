# bugrouter Devlog #2: Upstream Template Introspection, Org Discovery, and Human-in-the-Loop Review Queues

*Published: October 28, 2026. Category: Systems & Cloud. Reading time: ~7 min*
*Tags: Go, bugrouter, Devlog, Introspector, Cloud, HITL, OAuth, Security*

---

Once `bugrouter` could reliably resolve an artifact to its canonical bug tracker and redact credentials at the type level (as covered in [Devlog #1](https://riccivr.github.io/blog/bugrouter-devlog-01-architecture-zero-dep-go-and-the-agent-constitution.html)), we encountered the second major failure mode of AI coding agents:

**Issue templates are actively hostile to raw text dumps.**

If an agent discovers a bug in a popular open-source project or enterprise repository, the repository maintainers rarely permit free-form bug reports. GitHub projects use YAML Issue Forms with mandatory textareas, dropdowns, and checkboxes. GitLab repositories require Markdown templates triggered via query parameters (`?issuable_template=Bug`). Bugzilla instances enforce strict REST schemas with mandatory product and component fields.

When an agent ignores these requirements and drops an unstructured blob into the issue description, triage bots immediately tag the issue as invalid, or human maintainers close it with a canned *"Please use the bug report template"* response.

In Milestone 2, we set out to solve upstream template introspection, enterprise monorepo service discovery, and built an embedded Human-in-the-Loop (HITL) Cloud Control Plane—all without adding a single external dependency to Go.

---

## 1. Zero-Dependency Upstream Issue Introspection

To conform to upstream requirements, `bugrouter` must fetch, inspect, and parse templates directly from remote forges. However, importing heavyweight third-party YAML or HTML parsers would directly violate our `AGENTS.md` constitution.

In `internal/introspector`, we built custom, line-oriented parsers using standard Go `bufio.Scanner` and `strings` manipulation:

- **GitHub YAML Issue Forms (`.github/ISSUE_TEMPLATE/*.yml`):** We fetch the template list from GitHub API, download candidate bug forms, and parse the `body:` elements line-by-line. The parser tracks indentation levels, identifies `type: textarea` or `type: input`, and extracts the `attributes.label` and `id`.
- **GitHub & GitLab Markdown Templates (`.github/ISSUE_TEMPLATE/*.md` or `.gitlab/issue_templates/*.md`):** We scan for Markdown section headings (`## Description`, `### Steps to Reproduce`, `### Environment`) and extract prompt comments and required placeholders.
- **Bugzilla REST Field Schemas (`/rest/field/bug` and `/rest/product`):** For Bugzilla instances, we query native REST endpoints to retrieve allowed components, versions, and mandatory triage fields.

```
┌──────────────────────────────────────────────────────────────┐
│ Upstream Introspection & Schema Parsing (Zero Dependencies)   │
│                                                              │
│ 1. GitHub API ───> .github/ISSUE_TEMPLATE/bug.yml            │
│                    └─ Line Scanner extracts labels & fields  │
│ 2. GitLab API ───> .gitlab/issue_templates/Bug.md            │
│                    └─ Markdown Heading & Placeholder Splitter│
│ 3. Bugzilla   ───> /rest/field/bug & /rest/product/NAME      │
│                    └─ JSON Schema Unmarshaler                │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ Semantic Field Mapping Engine (internal/adapter)             │
│ - Summary / What Happened   ───> "### Summary"               │
│ - Steps to Reproduce        ───> "### Steps to Reproduce"    │
│ - Expected vs Actual        ───> "### Behavior"              │
│ - Logs / Error Output       ───> "### Logs & Traces"         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Semantic Field Mapping & Deep-Link Pre-Fills

With parsed field schemas in hand, `internal/adapter/draft.go` intelligently maps the agent's problem description into the exact headers expected upstream.

If an issue template has a field labeled `What happened?`, `bugrouter` routes `in.Summary` there. If it finds `Reproduction Steps` or `How to Reproduce`, it routes `in.StepsToReproduce`. System logs are automatically wrapped in Markdown code blocks (` ``` `).

Furthermore, `bugrouter` generates native deep-link pre-fill URLs:
- **GitHub:** Maps field IDs directly to issue form query parameters (`https://github.com/org/repo/issues/new?template=bug.yml&summary=...`).
- **GitLab:** Generates links pre-selecting the template parameter (`https://gitlab.com/org/repo/-/issues/new?issuable_template=Bug`).
- **Bugzilla:** Generates pre-filled CGI query strings for `enter_bug.cgi`.

---

## 3. Enterprise Discovery: `LayerOrgCloud`

In enterprise settings, developers and agents do not only work with public GitHub repos. An enterprise might maintain a private GitHub Enterprise instance, a self-managed GitLab instance, or route infrastructure bugs to Jira and Linear.

To handle this, we introduced **`LayerOrgCloud`** as Layer 0 in our resolution waterfall. It reads an enterprise service catalog (`services.json`) configured via `$XDG_CONFIG_HOME/bugrouter/services.json`, `/etc/bugrouter/services.json`, or the `BUGROUTER_SERVICES_FILE` environment variable:

```json
{
  "services": [
    {
      "name": "payment-worker",
      "repository_url": "https://git.corp.internal/fintech/payment-worker",
      "tracker": {
        "protocol": "jira",
        "url": "https://jira.corp.internal/projects/PAY"
      }
    }
  ]
}
```

If an agent asks to route a bug for `payment-worker`, `bugrouter` matches the service catalog immediately, bypassing public internet probes completely.

---

## 4. The Cloud Control Plane HTTP Server (`bugrouter serve`)

Autonomous agents should not have blanket permission to spam live bug trackers without oversight. A single hallucinated loop could open 50 bogus tickets on upstream trackers within seconds.

To keep a human in control, we implemented a zero-dependency Cloud Control Plane HTTP daemon:

```bash
bugrouter serve --port 8080
```

`internal/cloud` provides:
1. **Embedded Single-Page Application (SPA):** An embedded HTML/CSS/JS review dashboard served directly from Go memory with zero external assets.
2. **Local Staging Store (`internal/adapter/DraftStore`):** Drafts are written atomically to `$XDG_DATA_HOME/bugrouter/drafts/<id>.json` with restricted `0600` permissions (read/write only by the current user).
3. **One-Click Human Review:** Developers inspect staged drafts, view scrubbed credentials, verify upstream template headings, and click **Approve** or **Discard**.
4. **Authenticated Forge Dispatchers:** Upon approval, `ForgeClient` dispatches tickets to GitHub Enterprise, GitLab Self-Managed, Jira REST, or Linear GraphQL using configured OAuth tokens or PATs.

```
[Agent via MCP / CLI] ──> bugrouter draft ──> Atomic Save (0600 JSON)
                                                     │
                                                     ▼
[Human Reviewer] <─── http://localhost:8080 ─── [DraftStore Queue]
       │
   (Approve)
       │
       ▼
[Authenticated ForgeClient] ──> Dispatches Issue to Upstream API
```

---

## 5. Spec 06.1 Red-Team Remediations

Right after finishing the initial control plane, we subjected the codebase to a rigorous internal red-team security review (Spec 06.1):

1. **SSRF Bounds on Forge Client:** Previously, `ForgeClient` used standard HTTP transports. We bound it to `httpx.PostBytes`, guaranteeing that malicious forged tracker URLs cannot bypass loopback or private IP protection.
2. **Path Traversal Hardening:** We locked down draft ID validation across all store methods and URL handlers. Any ID containing `/`, `\`, `..`, or non-alphanumeric characters is immediately rejected, preventing directory traversal attacks.
3. **RFC-822 Title CRLF Injection:** In `internal/adapter/draft.go`, we added strict title sanitization that strips `\r` and `\n` characters, preventing attackers from injecting email headers into Debbugs or issue submission payloads.

With Milestone 2 in place, `bugrouter` evolved from a CLI resolution utility into a full-featured Human-in-the-Loop triage bridge.

In Devlog #3, we tackle the next frontier: upstream issue deduplication, polyglot package probes (Cargo and pyproject), and enterprise control plane hardening with constant-time Bearer authentication and HMAC webhooks.
