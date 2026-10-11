# reelscribe: transcribing reels and tiktoks with local AI for my girlfriend's work

*Published: October 11, 2026. Category: Projects & Multimedia. Reading time: ~5 min*
*Tags: Python, reelscribe, Whisper, Ollama, yt-dlp, CLI*

---

A few weeks ago I built [`autodub`](https://riccivr.github.io/blog/autodub-automating-video-dubbing-to-spanish.html) and [`beam`](https://riccivr.github.io/blog/beam-ephemeral-video-streaming-in-c99.html) so I could send Spanish-dubbed videos to my girlfriend after work. This time, the problem came straight from her day-to-day job.

In her social media and content strategy work, she regularly reviews batches of client posts, Instagram Reels, and TikTok videos. Surface metrics like view counts or likes only tell you a video performed well, not why. You have to look at the script itself to see which opening hooks keep people watching past the first three seconds, which exact words and offers drive engagement, which topics repeat across top performers, and what falls flat.

Doing that by hand is a grind:

- You have to open twenty or thirty links in a row, many shared from phones as `vm.tiktok.com` short links cluttered with tracking parameters.
- You have to listen to each clip over loud background music, pausing every three seconds to type out what the speaker is saying.
- Once you finish transcribing fifteen videos manually, you still have to read through pages of notes to spot patterns and write a comparative report.

To take that mechanical work off her plate, I built [**`reelscribe`**](https://github.com/riccivr/reelscribe), a CLI tool on WSL that takes any number of TikTok or Instagram URLs, resolves short links, transcribes each video into separate `.md`, `.srt`, and `.json` files using `faster-whisper`, and generates a batch analytical summary at the end using a local LLM on Ollama.

---

## 1. The pipeline from raw URLs to content analytics

The goal was simple. She passes me a list of links exactly as they come out of the mobile share button or desktop browser, and a single command produces an organized folder with every transcript and a final report.

```
┌──────────────────────────────────────────────────────────────┐
│ Input: TikTok / Instagram URLs & Short Links                 │
│ (e.g. vm.tiktok.com/ZN8BDuYDp/ or URLs with ?_r=1&_t=...)    │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 1. HTTP Redirect Resolution & Canonical Deduplication        │
│ - Follows 301/302 redirects on mobile short links            │
│ - Strips tracking query params and filters duplicate videos  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Media & Metadata Extraction via yt-dlp + FFmpeg           │
│ - Extracts temporary audio stream (supports cookies.txt)     │
│ - Captures metadata (author, platform, ID, title, duration)  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. GPU-Accelerated Transcription via faster-whisper          │
│ - Caches WhisperModel in memory once for the entire batch    │
│ - Auto CUDA float16 (with CPU int8 fallback) + VAD filtering │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Per-Video Output Files                                    │
│ - 01_tiktok_author_id.md   (Metadata + clean prose + clock)  │
│ - 01_tiktok_author_id.srt  (Standard subtitle file)          │
│ - 01_tiktok_author_id.json (Structured data for analytics)   │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Batch Summary via Local Ollama (Qwen 2.5 14B)             │
│ - Non-blocking Ollama availability check before summarizing  │
│ - Writes transcriptions/resumen.md with actionable insights  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Short links, tracking parameters, and deduplication

Links shared over WhatsApp or Slack are rarely clean. The exact same TikTok video often shows up in two different formats within the same batch:

1. The full browser URL with session tracking query strings like [`https://www.tiktok.com/@client/video/7691761289726594326?_r=1&_t=ZN-9ASicGAxtaw`](https://www.tiktok.com/@client/video/7691761289726594326?_r=1&_t=ZN-9ASicGAxtaw)
2. The mobile short link like [`https://vm.tiktok.com/ZN8BDuYDp/`](https://vm.tiktok.com/ZN8BDuYDp/)

If you feed both into a naive script, it downloads and transcribes the same video twice, skewing both the word counts and the final summary.

In `reelscribe`, every URL runs through `resolve_url()` before calling `yt-dlp`:

```python
SHORT_LINK_HOSTS = {"vm.tiktok.com", "vt.tiktok.com", "instagr.am"}

def resolve_url(url: str) -> str:
    url = url.strip()
    parsed = urlparse(url)
    host = parsed.netloc.lower()

    if host in SHORT_LINK_HOSTS or "/t/" in parsed.path:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as resp:
            url = resp.geturl()
            parsed = urlparse(url)
            host = parsed.netloc.lower()

    if "tiktok.com" in host or "instagram.com" in host:
        parsed = parsed._replace(query="", fragment="")
        url = urlunparse(parsed)

    return url
```

This follows HTTP redirects on short-link domains, strips `?_r=1&_t=...` tracking parameters, and checks the resulting canonical URL against an in-memory set so duplicate links are skipped automatically. When Instagram or TikTok requires an authenticated session, `reelscribe` accepts either `-c cookies.txt` or `--cookies-from-browser`.

---

## 3. GPU acceleration, batch model caching, and three output formats

After testing the first version on real client batches, my girlfriend opened [PR #1](https://github.com/riccivr/reelscribe/pull/1) as the end user with several speed and usability upgrades:

- **Automatic NVIDIA GPU acceleration.** With `--device auto`, `reelscribe` dynamically preloads `libcublas.so` and `libcudnn.so` from the active virtualenv, runs `faster-whisper` on CUDA in `float16` precision when an NVIDIA GPU is available, and falls back to CPU in `int8` if CUDA is missing.
- **Batch model caching.** Instead of reloading `WhisperModel` from disk for each URL, the CLI initializes the model once in memory and reuses it across the entire queue.
- **PyAV compatibility shim.** Wraps `av.open` to strip the deprecated `metadata_errors` keyword argument on newer PyAV releases so audio decoding does not crash.

Short-form social videos also have a common trap for speech recognition models. Loud background music, jump cuts, and non-speech audio effects often cause un-filtered Whisper runs to hallucinate repeated phrases during music sections. To prevent this, `reelscribe` enables `faster-whisper`'s Voice Activity Detection via `vad_filter=True` with a 400 ms silence threshold and extracts word-level timestamps via `word_timestamps=True`.

Each video produces three separate files in the output directory:

1. **Markdown file `.md`.** Formatted for quick human review with a metadata header, the full clean paragraph transcript, and a timestamped breakdown.
2. **SubRip subtitle file `.srt`.** Ready to drop into any video editor when clips need captions or repurposing.
3. **Structured JSON `.json`.** Stores all `yt-dlp` metadata, full text, segments, and every individual word with its start time, end time, and confidence score. You can run scripts against it to count keyword frequency, measure speaking pace, or correlate specific hooks with video retention.

---

## 4. Batch summarization with local Ollama

Having separate `.md` files for twenty videos solves the transcription bottleneck, while the final step analyzes the entire batch together.

Instead of paying for cloud APIs or pasting transcripts into a browser tab, `reelscribe` connects directly to a local Ollama server at `http://localhost:11434/api/chat` running `Qwen2.5-14B-Instruct`.

Before requesting the summary, `is_ollama_available()` runs a 1.5-second check against `/api/tags`. If Ollama is offline, `reelscribe` prints a notice and keeps all per-video transcripts intact without failing the batch. When Ollama is active, it bundles the metadata and transcripts to generate `transcriptions/resumen.md` with three sections:

- **Executive summary.** Covers the overarching theme and communication style across the batch.
- **Per-video breakdown.** Details the hook, core offer, structure, and call to action of each individual video.
- **Actionable takeaways.** Highlights which phrasing, offers, and script structures stand out to replicate in upcoming content.

---

## 5. Terminal workflow

Processing a batch of Reels or TikToks takes a single command in WSL, whether passing URLs as arguments, from a `-f` text file, or piped via `stdin`:

```sh
# Transcribe multiple URLs on GPU (including short links) and open the folder when done
reelscribe --open-dir "https://vm.tiktok.com/ZN8BDuYDp/" "https://www.instagram.com/reel/EXAMPLE/"

# Process an entire client batch from a file with cookies and large-v3-turbo
reelscribe -f client_october.txt -c cookies.txt -m large-v3-turbo -o transcriptions/client_october
```

When it finishes, the output folder contains numbered files for each video plus the consolidated `resumen.md`, opening straight in File Explorer when `--open-dir` is passed. What used to take an entire afternoon of replaying videos and typing notes by hand now finishes in seconds, running 100% locally.

The source code is available on GitHub at [**`github.com/riccivr/reelscribe`**](https://github.com/riccivr/reelscribe).
