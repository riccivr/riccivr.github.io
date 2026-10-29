# bugrouter Devlog #3: Upstream Issue Deduplication, Polyglot Probes, and Red-Team Hardening

*Published: October 29, 2026. Category: Systems & Security. Reading time: ~8 min*
*Tags: Go, bugrouter, Devlog, Deduplication, Polyglot, Audit, Webhooks, Security*

---

Ask any open-source maintainer about their biggest grievance with the recent wave of AI coding agents, and you will get the exact same answer:

**Agents file duplicate bug reports constantly.**

An autonomous agent running a test suite encounters a `502 Bad Gateway` from an authentication microservice or a crash in a JSON parsing library. The agent assumes it is the first entity in human history to discover this bug. Without checking whether an issue is already open, it drafts and files a new ticket. Maintainers wake up to three different tickets describing the identical stack trace.

In Milestone 3 of `bugrouter`, we took on three major engineering objectives:
1. Building an autonomous **upstream issue deduplicator** to search trackers and warn developers before tickets are submitted.
2. Expanding our workspace and OS probes into **polyglot territory** (Rust manifests via Cargo, Python manifests via PEP 508 pyproject.toml, and Fedora/Arch Linux packages).
3. Hardening the Cloud Control Plane with **constant-time Bearer authentication**, **CSRF guards**, **append-only JSONL audit logs**, and **SSRF-guarded HMAC webhooks**.

Here is how we implemented it under our strict zero-dependency Go constraint.

---

## 1. Upstream Issue Deduplication: `internal/dedup`

To stop duplicate bug reports before they are submitted, `bugrouter` queries the remote forge's search API using keywords extracted from the issue title.

Rather than pulling in an NLP library or vector database, we built a deterministic, zero-dependency token scoring algorithm:

- **Stop Word Filtering:** We strip common English stop words (`a`, `the`, `is`, `in`, `failed`, `error`, `bug`, `issue`, `panic`, etc.) from the candidate title.
- **Search Term Extraction:** We select the highest-signal content tokens (up to 5 tokens) to query the upstream tracker API (`/search/issues` on GitHub, `/issues?search=` on GitLab, `/rest/bug?summary=` on Bugzilla).
- **Token Overlap Scoring:** For each issue returned by the tracker, we calculate the Jaccard-style token overlap percentage:
  $$\text{Match Percentage} = \frac{|\text{Tokens}(\text{Query}) \cap \text{Tokens}(\text{Issue Title})|}{|\text{Tokens}(\text{Query})|} \times 100$$
- If an existing issue shares more than 20% token overlap, `bugrouter` attaches it to `draft.PotentialDuplicates` and flags it with a high-visibility warning in the terminal and Web UI.

```
┌──────────────────────────────────────────────────────────────┐
│ Upstream Duplicate Detection Engine (internal/dedup)         │
│                                                              │
│ Title: "Payment gateway timeout in checkout worker"          │
│                      │                                       │
│                      ▼                                       │
│ [Stop Word Filter] ──> ["payment", "gateway", "checkout"]    │
│                      │                                       │
│                      ▼                                       │
│ [Forge Search API] ──> Queries GitHub / GitLab / Bugzilla    │
│                      │                                       │
│                      ▼                                       │
│ [Overlap Scorer]   ──> Issue #88: "Payment gateway timeout"  │
│                        (Overlap: 66% ──> Potential Duplicate)│
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Polyglot Workspace Probes: Rust & Python

In Milestone 1, our workspace probe only understood `package.json` (npm) and `go.mod` (Go). In Milestone 2 and 3, we extended `internal/resolver/workspace.go` to handle the modern polyglot stack:

### Rust (`Cargo.toml` and `Cargo.lock`)
- Parses dependency declarations under `[dependencies]`, `[dev-dependencies]`, and `[build-dependencies]`.
- Handles Cargo workspace table lookups (`dep.workspace = true`) by scanning parent directory manifests.
- Resolves git dependencies by parsing repository URLs from `Cargo.lock`.
- Inspects root `[package]` checkouts to identify repository links directly.

### Python (`pyproject.toml`)
- Parses standard PEP 508 and PEP 621 dependency arrays (`dependencies = [...]`).
- Supports Poetry inline tables (`[tool.poetry.dependencies]`).
- Extracts canonical project URLs from `[project.urls]` (`Homepage`, `Repository`, `Bug Tracker`).
- Enforces PEP 503 and PEP 508 normalization (stripping extras like `requests[security]`, lowercasing, and normalizing `.` and `-` to `_`).

---

## 3. Cross-Distro OS Package Probes: RPM and Pacman

`bugrouter` is not restricted to language package managers. If an agent encounters a system error on a server or container, it can query system binaries directly.

In Milestone 3, we expanded `OSPackageProbe` beyond Debian `dpkg`:
- **Fedora / RHEL / CentOS (`rpm`):** We execute `rpm -qf <binary>` to identify the package, followed by `rpm -qi <package>` to parse the `URL:` field. We prioritize the upstream homepage over downstream distribution bug trackers.
- **Arch Linux (`pacman`):** We execute `pacman -Qoq <binary>` and `pacman -Qi <package>` to retrieve the upstream URL.

Every subprocess invocation uses `exec.CommandContext` with hard timeouts, and binary names are verified against strict alphanumeric allowlists.

---

## 4. Hardening the Cloud Control Plane (Spec 08)

As the Cloud Control Plane began staging real enterprise bug reports, we fortified its security perimeter to enterprise standards:

```
┌──────────────────────────────────────────────────────────────┐
│ Hardened Cloud Control Plane (Spec 08 Security)              │
│                                                              │
│ 1. Constant-Time Bearer Auth via crypto/subtle.ConstantTime   │
│ 2. CSRF Origin Guard & Custom Header Enforcement             │
│ 3. Append-Only JSONL Audit Logger (0600 permissions)         │
│ 4. SSRF-Guarded Webhook Dispatcher (HMAC-SHA256 Signatures)  │
└──────────────────────────────────────────────────────────────┘
```

### Constant-Time Bearer Authentication
To protect against timing attacks, all API endpoints (`/api/v1/drafts`, `/api/v1/audit`) enforce Bearer token verification using `crypto/subtle.ConstantTimeCompare`. To prevent secret length leakage, both the configured token and the incoming header are pre-hashed with SHA-256 before comparison:

```go
expectedHash := sha256.Sum256([]byte(s.authToken))
tokenHash := sha256.Sum256([]byte(token))
if subtle.ConstantTimeCompare(expectedHash[:], tokenHash[:]) != 1 {
    http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
    return
}
```

### CSRF Origin & Custom Header Protection
All mutating endpoints (`POST /api/v1/drafts/{id}/approve` and `/discard`) enforce strict origin checks. Cross-origin browser requests are blocked unless `Origin` or `Referer` matches the `Host` header. Furthermore, requests must provide either the authenticated Bearer token or the custom header `X-Bugrouter-Request: 1`.

### Append-Only JSONL Audit Logging
Every triage decision is recorded in an immutable, append-only log file located at `$XDG_STATE_HOME/bugrouter/audit.log` with strict `0600` file permissions. The server provides a `/api/v1/audit` endpoint that reads the most recent events in reverse chronological order, bounded strictly to 1 MiB.

### SSRF-Guarded HMAC-SHA256 Webhooks
When an issue is approved or discarded, `WebhookNotifier` dispatches an event to the configured webhook URL. Every webhook is signed with HMAC-SHA256 via the `X-Bugrouter-Signature: sha256=<hex>` header and routed through `httpx` with a 3-second timeout, ensuring that internal infrastructure cannot be targeted by forged webhook URLs.

---

With Milestone 3 completed, `bugrouter` possessed a polyglot resolution engine, automated duplicate suppression, and enterprise-grade security controls.

In Devlog #4, we cover Milestone 4: refining scrubber precision to eliminate false positives, polishing the CLI UX, and putting the architecture under the microscope of an independent code reviewer.
