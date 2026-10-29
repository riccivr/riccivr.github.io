# bugrouter Devlog #4: v1.0 Production Readiness, Scrubber Precision, and the Independent Code Review

*Published: October 29, 2026. Category: Systems & Architecture. Reading time: ~8 min*
*Tags: Go, bugrouter, Devlog, Code Review, Security, CLI, Architecture*

---

After four intense milestones of designing the resolver waterfall, building zero-dependency introspectors, and hardening the Cloud Control Plane (covered in [Devlog #1](https://riccivr.github.io/blog/bugrouter-devlog-01-architecture-zero-dep-go-and-the-agent-constitution.html), [Devlog #2](https://riccivr.github.io/blog/bugrouter-devlog-02-issue-template-introspection-and-cloud-control-plane.html), and [Devlog #3](https://riccivr.github.io/blog/bugrouter-devlog-03-upstream-deduplication-and-polyglot-probes.html)), `bugrouter` was functionally complete.

However, in systems engineering, functional completeness is not the same as production readiness.

Before shipping v1.0 (`2026.10.0`), we needed to eliminate edge-case parser traps, polish CLI ergonomics for real humans, build an end-to-end golden path integration test, and have the codebase evaluated by an independent software reviewer.

Here is what went into Milestone 4, the engineering verdict from the independent review, and how we answered every piece of technical critique.

---

## 1. Scrubber Precision: Eliminating False Positives

In our initial redactor, the regular expression for generic secrets (`token=`, `password:`, `secret=`) had an overly aggressive bite:

```go
// Old naive regex matched any non-whitespace sequence:
genericSecretRegex = regexp.MustCompile(`(?i)\b(...)\b(\s*[:=]\s*["']?)([^"'\s,;\[][^"'\s,;]*)`)
```

This produced annoying false positives on legitimate configuration files and code snippets:
- `password_required = false` redacted `false` into `[REDACTED_SECRET]`
- `token_enabled: true` redacted `true`
- `secret_key = null` redacted `null`
- `token: in` redacted the preposition `in`

Because Go's standard `regexp` engine (RE2) deliberately omits negative lookaheads to guarantee linear-time execution, we could not simply add a negative lookahead regex.

Instead, we used `genericSecretRegex.ReplaceAllStringFunc` to inspect the captured value programmatically:
1. We enforce that the captured value must be at least 6 characters long (excluding surrounding quotes).
2. We maintain a constant lookup table of non-secret literals (`true`, `false`, `null`, `nil`, `none`, `undefined`, `yes`, `no`). If the captured string matches a literal, it is preserved verbatim.

Now, `DATABASE_PASSWORD=supersecretpass123` is cleanly redacted to `[REDACTED_SECRET]`, while boolean flags and configuration settings pass through untouched.

---

## 2. CLI UX Polish: `--body-file` and Explicit Timeouts

Until Milestone 4, running `bugrouter draft` required passing individual flags for `--summary`, `--steps`, and `--logs`. For automated agents interacting via MCP this was fine, but for human developers it felt clunky.

In Milestone 4, we added the `--body-file` flag, which accepts either a path to a Markdown file or `-` to read from standard input:

```bash
bugrouter draft checkout-api --title "Payment worker timeout" --body-file issue.md
cat bug.md | bugrouter draft checkout-api --title "Payment worker timeout" --body-file -
```

Under the hood, `parseMarkdownBodyFile` scans the markdown file for standard section headings (`## Summary`, `## Steps to Reproduce`, `## Logs & Output`). If recognized headings exist, it automatically decomposes the content into structured fields; if not, it safely assigns the entire text as the issue summary.

Additionally, we wired global `--timeout` flags across `bugrouter resolve` and `bugrouter draft` (defaulting to 15 seconds), ensuring that CLI commands never hang indefinitely on stalled networks.

---

## 3. End-to-End Golden-Path Integration Tests

To prove that all packages (`httpx`, `cache`, `resolver`, `introspector`, `dedup`, `scrubber`, `adapter`, `cloud`) work together harmoniously, we added `TestGoldenPathDraftAndBodyFile` in `cmd/bugrouter/main_test.go`.

The test spins up an `httptest.Server` mocking a GitHub Enterprise instance with issue templates and search endpoints, configures a private `services.json` catalog, creates a sample markdown body file containing raw AWS access keys and local `/home/alice` paths, and executes the complete flow:
1. Target resolution via `LayerOrgCloud`.
2. Upstream template introspection downloading and parsing `bug.yml`.
3. Duplicate detection query matching existing tickets.
4. Type-level credential and PII scrubbing (`[REDACTED_AWS_KEY]` and `~/secret.txt`).
5. Semantic template section mapping (`### Reproduction Steps`, `### Error Logs`).
6. Atomic file staging to disk with strict `0600` permissions.
7. Retrieval and deserialization verification.

The entire test suite passes cleanly under the Go race detector (`go test -race ./...`).

---

## 4. Post-Spec #09 Red-Team Remediation: Locking the v1.0 Release (Spec 09.1)

Right after completing the initial Milestone 4 scope, we subjected the release candidate to a follow-up red-team audit (Spec 09.1) to catch subtle security and parser edge cases before locking down v1.0:

1. **SSRF Environment Bypass Removal (`internal/httpx/client.go`):**  
   During early development, an environment variable `BUGROUTER_ALLOW_PRIVATE_HOSTS=1` had been introduced so unit test suites could connect to mock HTTP servers. We recognized that this created an unacceptable backdoor in production binaries: an untrusted agent or compromised process with environment access could disable loopback protection. We completely excised the environment check from `httpx.NewClient`. In production binaries, SSRF and loopback blocking is 100% unconditional. For unit testing, we introduced `httpx.NewTestClient(0)`, isolating loopback permission strictly to test files.

2. **Preserving Subheadings in Markdown Body Files (`cmd/bugrouter/main.go`):**  
   In our initial parser, any line starting with `#` was evaluated against known sections, and any unrecognized heading reset the active section to `secNone`. As a result, nested level-3 subheadings (such as `### Environment Details` inside `## Summary`, or `### Stack Trace` inside `## Logs`) were accidentally discarded along with all following lines. In Spec 09.1, we hardened `parseMarkdownBodyFile` so that only top-level level-2 headings (`## `) can reset sections, while level-3+ subheadings (`### `) are preserved as verbatim section content.

3. **Quoted Secret Redaction & Trailing Quote Hygiene (`internal/scrubber/scrubber.go`):**  
   When developers wrote assignments with quotes like `CLIENT_SECRET="mysecretvalue123"`, our earlier replacer stripped quotes before checking length, but the regex replacement swallowed the closing quote, producing unclosed strings (`CLIENT_SECRET="[REDACTED_SECRET]`). Furthermore, values like `token="short"` or `password='false'` were susceptible to boundary miscalculations. In Spec 09.1, we separated trailing quotes before evaluating length and non-secret literals, guaranteeing that matching quotes are properly re-appended (`CLIENT_SECRET="[REDACTED_SECRET]"`).

4. **Connection Pool Efficiency:**  
   We updated `cmd/bugrouter/main.go` to share a single bounded `*httpx.Client` instance across `resolveTarget`, `introspector.New`, and `dedup.NewFinder`, eliminating redundant dialer allocations and connection pool overhead during CLI execution.

---

## 5. The Independent Engineering Review

We submitted the codebase to an independent software reviewer for a rigorous architectural assessment. The evaluation focused entirely on the software engineering quality and architectural decisions.

Here is the verbatim assessment of our design:

> **"Overall quality: high.** This is disciplined, intentional Go written by someone who actually cares about the constraints they set.
>
> **Strengths:**
> - **Philosophy is excellent and consistently applied:** 'C99 spirit in modern Go', zero external dependencies, explicit over clever, bounded everything. The `AGENTS.md` and `ARCHITECTURE_STATE.md` show real architectural intent rather than just a code dump.
> - **Security posture is unusually strong for a young project:** SSRF/DNS-rebinding protection and body caps in `httpx`. Type-level scrubbing (`ScrubbedText`) instead of 'hope the model doesn't leak.' Path-traversal hardening on draft IDs. Atomic writes with `0600` permissions. Explicit timeouts and context on every network/subprocess call.
> - **Resolver waterfall is well-designed:** Layered, priority-ordered, cacheable, with a clear probe interface. Supporting workspace (Go/npm/Cargo/Python), multi-distro OS packages, registries, and web discovery in one tool is ambitious and useful.
> - **Clean separation of concerns:** Packages map cleanly to responsibilities (resolver, introspector, dedup, scrubber, adapter, cloud, mcp).
> - **Testing and hygiene exist:** Race detector in the Makefile, tests present in multiple packages, conventional commits + commit-msg hook, CalVer.
> - **MCP implementation is pragmatic:** Stdio JSON-RPC with the tools an agent actually needs."

The reviewer also identified specific areas to address, which we tackled directly in Milestone 4:

1. **"No README yet — biggest immediate gap."**  
   *Resolution:* We authored a comprehensive, high-signal root `README.md` documenting installation, CLI usage, the 7 MCP tools, enterprise `services.json` catalog format, and the security architecture.
2. **"CLI surface is still a bit raw (requires many flags)."**  
   *Resolution:* We shipped `--body-file` and stdin support (`-`) with markdown heading decomposition.
3. **"Deduplication is currently lightweight (token overlap baseline)."**  
   *Resolution:* Token overlap + stop word filtering gives a fast, zero-dependency baseline. For future releases, we plan to implement a lightweight TF-IDF or embedding-based ranker while strictly maintaining the zero-dependency standard library constraint.
4. **"Coverage gaps (more registries and Windows packages)."**  
   *Resolution:* We added Cargo, pyproject, RPM, and Pacman in Milestone 3, with Maven, NuGet, and Windows `winget` planned for upcoming cycles.

---

## 6. The Complete v1.0 Architecture

With all four milestones complete, here is the full architecture of `bugrouter` today:

```
┌──────────────────────────────────────────────────────────────┐
│                    bugrouter v1.0 System                     │
│                                                              │
│  [Agent via MCP]              [Developer via CLI]            │
│  (Claude Code / Cursor)       (resolve / draft / serve)      │
│         │                                    │               │
│         └─────────────────┬──────────────────┘               │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   6-Layer Resolver Waterfall│                   │
│            │   - Org Cloud (services.json)                   │
│            │   - Direct URL (Git forges) │                   │
│            │   - Workspace (Polyglot)    │                   │
│            │   - OS Pkg (dpkg, rpm, pac) │                   │
│            │   - Registries (npm, PyPI)  │                   │
│            │   - Web Domain (security.txt│                   │
│            └──────────────┬──────────────┘                   │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Introspector & Deduplicator                   │
│            │   - Line-Oriented YAML / MD │                   │
│            │   - Token Overlap Scorer    │                   │
│            └──────────────┬──────────────┘                   │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Type-Level Scrubber       │                   │
│            │   - Produces ScrubbedText   │                   │
│            │   - Redacts Secrets & Paths │                   │
│            └──────────────┬──────────────┘                   │
│                           │                                  │
│                           ▼                                  │
│            ┌─────────────────────────────┐                   │
│            │   Cloud Control Plane       │                   │
│            │   - Embedded Web UI (HITL)  │                   │
│            │   - Constant-Time Bearer    │                   │
│            │   - CSRF & 0600 Audit Logs  │                   │
│            │   - HMAC Webhook Notifier   │                   │
│            │   - Authenticated Forges    │                   │
│            └─────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────┘
```

Building `bugrouter` proved that you do not need hundreds of third-party dependencies or sprawling object-oriented frameworks to write robust, modern developer infrastructure. By respecting the "C99 spirit in modern Go", keeping execution strictly bounded, and treating security as a type-level guarantee, you can build tools that autonomous agents and human developers can actually trust.
