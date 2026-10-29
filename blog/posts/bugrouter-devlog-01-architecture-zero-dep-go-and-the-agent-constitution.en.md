# bugrouter Devlog #1: Zero-Dependency Architecture, C99-Spirit in Go, and the Agent Constitution

*Published: October 29, 2026. Category: Systems & Architecture. Reading time: ~7 min*
*Tags: Go, bugrouter, Devlog, Architecture, MCP, Security, Systems, Agents*

---

If you have spent any serious time letting autonomous AI coding agents loose on your development workspaces, you have likely watched them run headfirst into the exact same wall.

The agent discovers a failing test, an unhandled panic in a third-party dependency, or a broken system utility. It decides to report the problem or file a bug. What happens next is almost universally a disaster:

1. **Tracker Confusion:** The agent guesses where the bug tracker lives. It files an issue against a personal mirror on GitHub when the upstream is hosted on GitLab, or it tries to ping an npm package maintainer for a bug rooted deep inside Debian libc.
2. **Credential Leaks:** In its haste to provide reproduction logs, the agent cheerfully pastes environment variables, raw AWS access keys, GitHub tokens, database connection URIs, and full `/home/alice` local paths straight into the issue body.
3. **Template Ignorance:** It ignores the upstream project's issue templates and structured issue forms, dumping an unformatted blob of text that maintainers close within minutes.
4. **Duplicate Spam:** It opens duplicate tickets for bugs that were already reported and triaged three days ago.

To solve this fundamentally and provide a hardened triage bridge for coding agents, I started building [**`bugrouter`**](https://github.com/riccivr/bugrouter): an autonomous, zero-dependency Go CLI and Model Context Protocol (MCP) server that resolves software artifacts to upstream bug trackers, scrubs credentials at the type level, introspects templates, detects duplicates, and stages structured drafts for Human-in-the-Loop review.

Here is how Milestone 1 came together, the engineering constitution behind it, and why writing Go in the spirit of C99 makes all the difference.

---

## 1. The Engineering Constitution: C99 Spirit in Modern Go

From day one, `bugrouter` was designed with an explicit philosophy codified in `AGENTS.md`—an engineering constitution that guides both autonomous agents and myself during pair programming:

- **Explicit over clever:** Flat, procedural, deterministic Go. No deep interface hierarchies, no reflection games, and no generics abuse.
- **Zero-dependency bias:** Standard library only (`net/http`, `encoding/json`, `os/exec`, `crypto/subtle`, `flag`). Zero third-party packages in `go.mod`. If a utility requires pulling in 40 transitive dependencies just to parse a small text format, we write a bounded procedural parser instead.
- **Bounded execution:** Every network call and subprocess execution takes an explicit `context.Context` with hard timeouts and caps response reads using `io.LimitReader`. External services are never trusted.
- **Explicit error handling:** Never ignore errors with `_ = ...`. Wrap every failure with actionable context (`fmt.Errorf("probe dpkg for %s: %w", bin, err)`).
- **Calendar Versioning & Conventional Commits:** Governed by CalVer (`2026.10.0`) and enforced commit hooks requiring conventional prefixes.

```
┌──────────────────────────────────────────────────────────────┐
│ The bugrouter Agent Constitution (AGENTS.md)                 │
│ 1. C99 Spirit: flat, procedural, predictable control flow    │
│ 2. Zero Dependencies: Go 1.22+ standard library exclusively  │
│ 3. Bounded Execution: context.Context + io.LimitReader caps  │
│ 4. Type-Level Safety: ScrubbedText boundary for credentials  │
│ 5. Strict Commits: Conventional Commits validated via hooks  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Hardening the Network Boundary: `httpx`

Because an agent could ask `bugrouter` to resolve arbitrary URLs, SaaS domain names, or registry packages, the HTTP client cannot simply be a raw `http.DefaultClient`. That is an invitation for Server-Side Request Forgery (SSRF) and DNS-rebinding attacks.

In `internal/httpx`, we built a bounded HTTP client that enforces:

- **SSRF & DNS-Rebinding Protection:** Custom `net.Dialer` control hooks that inspect resolved IP addresses before establishing a socket connection. Any private IP ranges (RFC 1918 `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopbacks (`127.0.0.0/8`, `::1`), link-local addresses (`169.254.0.0/16`), and carrier-grade NATs are immediately rejected.
- **Body Read Caps:** All responses are read through `io.LimitReader` capped strictly at 2 MiB, preventing memory exhaustion attacks from malicious upstream web servers.
- **Backoff & Rate Limiting:** Automatic retry handling for `429 Too Many Requests` and `503 Service Unavailable` with bounded exponential backoff.

---

## 3. The 6-Layer Waterfall Resolution Engine

When a user or agent invokes `bugrouter resolve <target>`, `bugrouter` runs the query through a layered, priority-ordered waterfall engine (`internal/resolver`):

```
                       [Query Input]
                            │
                            ▼
                  [Layer 0: Org Cloud]
            (Enterprise services.json catalog)
                            │
                            ▼
                 [Layer 1: Direct URL]
         (github.com/org/repo, gitlab.com, etc.)
                            │
                            ▼
                  [Layer 2: Workspace]
         (node_modules, go.mod, Cargo, pyproject)
                            │
                            ▼
                   [Layer 3: OS Package]
         (Debian dpkg/apt, Fedora rpm, Arch pacman)
                            │
                            ▼
                   [Layer 4: Registry]
             (npm, PyPI, Crates.io APIs)
                            │
                            ▼
                  [Layer 5: Web Domain]
        (.well-known/bug-report, RFC 9116 security.txt)
                            │
                            ▼
                   [Target Resolution]
       (Canonical Name, Tracker URL, Protocol, Version)
```

1. **`org-cloud`:** Checks private service catalogs and monorepo ownership records before touching public registries.
2. **`direct-url`:** Recognizes direct repository paths across GitHub, GitLab, Codeberg, and SourceHut.
3. **`workspace`:** Scans local workspace manifests (`node_modules/package/package.json`, `go.mod`, etc.) to find the exact declared upstream repository and installed version.
4. **`os-pkg`:** Inspects system binaries via package managers (e.g. `dpkg -S /usr/bin/curl` and `apt-cache show curl`).
5. **`registry`:** Concurrently queries public package registries (`npm`, `PyPI`, `Crates.io`) with bounded timeouts.
6. **`web-domain`:** Checks `.well-known/bug-report` and RFC 9116 `security.txt` on SaaS domains.

To keep lookups fast and deterministic, resolution results are cached in `$XDG_CACHE_HOME/bugrouter/targets` using SHA-256 key hashing and atomic file replacement.

---

## 4. Type-Level Secret Redaction: `ScrubbedText`

Most security tools treat redaction as an afterthought: run a regex over a string right before printing and hope you caught everything. If a developer forgets to call the scrubber, raw secrets leak straight to the issue tracker.

In `bugrouter`, we enforce redaction at the Go type system level:

```go
// ScrubbedText represents sanitized text that has passed through
// credential and PII redaction.
type ScrubbedText string

func Scrub(raw string) ScrubbedText {
    // 1. PEM private keys
    // 2. Bearer / Authorization headers
    // 3. Known API keys (AWS, GitHub, Stripe, OpenAI, Slack)
    // 4. Generic secret assignments (token=..., secret=...)
    // 5. Connection string credentials (postgres://user:pass@host)
    // 6. User home paths (/home/alice -> ~)
    ...
}
```

The issue adapter (`internal/adapter`) refuses to accept raw strings for the title or markdown body. It requires `scrubber.ScrubbedText`. If an agent tries to stage a draft without passing its content through the redactor, the Go compiler refuses to build the code.

---

## 5. Model Context Protocol (MCP) Integration

Rather than forcing developers to build complicated shell scripts, `bugrouter` exposes its capabilities natively to AI coding tools (Claude Code, Cursor, Windsurf, Cline) via the Model Context Protocol:

```bash
bugrouter mcp
```

This runs a zero-dependency JSON-RPC 2.0 stdio server implementing the official MCP specification. In Milestone 1, it published the core tools needed by autonomous agents:
- `resolve_target`: Maps an artifact or dependency to its upstream tracker.
- `scrub_text`: Sanitizes raw terminal logs or reproduction traces.
- `draft_bug_report`: Generates a redacted, template-ready issue draft.

With Milestone 1 complete, `bugrouter` could reliably answer: *Where does this bug belong, what tracker does it use, and how do we sanitize the report so nothing leaks?*

In Devlog #2, we dive into Milestone 2: parsing upstream issue templates without external libraries, handling enterprise service catalogs, and building an embedded Human-in-the-Loop review queue.
