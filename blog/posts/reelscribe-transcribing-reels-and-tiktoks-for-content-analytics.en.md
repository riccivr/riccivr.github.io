# reelscribe: transcribing reels and tiktoks with local AI for my girlfriend's work

*Published: October 11, 2026. Category: Projects & Multimedia. Reading time: ~5 min*
*Tags: Python, reelscribe, Whisper, Ollama, yt-dlp, CLI*

---

A few weeks ago I built [`autodub`](https://riccivr.github.io/blog/autodub-automating-video-dubbing-to-spanish.html) and [`beam`](https://riccivr.github.io/blog/beam-ephemeral-video-streaming-in-c99.html) so I could send Spanish-dubbed videos to my girlfriend after work. This time, the problem came straight from her day-to-day job.

In her social media and content strategy work, she regularly reviews batches of client posts, Instagram Reels, and TikTok videos. To get real analytics and figure out what actually works, surface metrics like view counts or likes are not enough. You have to look at the actual script: which opening hooks keep people watching past the first three seconds, which exact words and offers drive engagement, which topics perform best, and what falls flat.

Doing that manually is exhausting:

- You have to open twenty or thirty links in a row, many shared from phones as short links (`vm.tiktok.com/...`) cluttered with tracking parameters.
- You have to listen to each clip over loud background music, pausing every three seconds to type out what the speaker is saying.
- Once you finish transcribing fifteen videos by hand, you still have to read through pages of notes to spot patterns and write a summary report.

To take that repetitive work off her plate, I built [**`reelscribe`**](https://github.com/riccivr/reelscribe): a CLI tool running on WSL that takes any number of TikTok or Instagram URLs, resolves short links, transcribes each video into separate files (`.md`, `.srt`, and `.json`) using `faster-whisper`, and generates a consolidated analytical summary at the end using a local LLM on Ollama.

---

## 1. The pipeline from raw URLs to content analytics

The goal was simple: she passes me a list of links exactly as they come out of the mobile "Copy Link" button or desktop browser, and a single command produces an organized folder with every transcript and a final report.

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
│ - Extracts temporary audio stream                            │
│ - Captures metadata (author, platform, ID, title, duration)  │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Local Transcription via faster-whisper                    │
│ - Voice Activity Detection (VAD) filters out background music│
│ - Word-level and segment-level timestamps                    │
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
│ - Synthesizes all transcripts in the batch locally           │
│ - Writes transcriptions/resumen.md with actionable insights  │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Short links, tracking parameters, and deduplication

Links shared over WhatsApp or Slack are rarely clean. The exact same TikTok video often shows up in two different formats within the same batch:

1. The full browser URL with session tracking query strings: `https://www.tiktok.com/@client/video/7691761289726594326?_r=1&_t=ZN-9ASicGAxtaw`
2. The mobile short link: `https://vm.tiktok.com/ZN8BDuYDp/`

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

This follows HTTP redirects on short-link domains, strips `?_r=1&_t=...` tracking parameters, and checks the resulting canonical URL against an in-memory set so duplicate links are skipped automatically.

---

## 3. VAD-filtered transcription and three output formats per video

Short-form social videos have a common trap for speech recognition models: loud background music, jump cuts, and non-speech audio effects. Running raw audio through Whisper without filtering often causes hallucinated phrases during music-only sections.

To prevent this, `reelscribe` enables `faster-whisper`'s built-in Voice Activity Detection (`vad_filter=True`) with a 400 ms silence threshold alongside word-level timestamps (`word_timestamps=True`).

Each video produces three separate files in the output directory:

1. **Markdown file (`.md`):** formatted for quick human review. It includes a metadata header (canonical URL, platform, author, video ID, duration, and detected language), the full clean paragraph transcript, and a timestamped breakdown (`[00:00 - 00:06]`).
2. **SubRip subtitle file (`.srt`):** ready to drop into any video editor if clips need captions or repurposing.
3. **Structured JSON (`.json`):** stores all `yt-dlp` metadata, full text, segments, and every individual word with its start time, end time, and confidence score. This makes it easy to run keyword frequency scripts, measure speaking pace, or correlate specific hooks with video retention.

---

## 4. Batch summarization with local Ollama

Having separate `.md` files for twenty videos solves the transcription bottleneck, but the real time-saver is analyzing the whole batch together.

Instead of relying on paid cloud APIs or pasting transcripts into a browser tab, `reelscribe` connects directly to a local **Ollama** instance (`http://localhost:11434/api/chat`) running `Qwen2.5-14B-Instruct`.

Once all videos in the queue are transcribed, the CLI bundles their metadata and full transcripts and prompts the local model to write `transcriptions/resumen.md` with three sections:

- **Executive summary:** the overarching theme and positioning across the batch.
- **Per-video breakdown:** the hook, core offer, structure, and call to action of each individual video.
- **Actionable takeaways:** which phrasing, offers, and script structures stand out to replicate in upcoming content.

---

## 5. Terminal workflow

Processing a batch of Reels or TikToks takes a single command in WSL:

```sh
# Transcribe multiple URLs (including short links) and summarize with local Ollama
reelscribe "https://vm.tiktok.com/ZN8BDuYDp/" "https://www.instagram.com/reel/EXAMPLE/"

# Process an entire client batch from a text file
reelscribe -f client_october.txt -o transcriptions/client_october
```

When it finishes, the output folder contains numbered files for each video (`01_tiktok_...`, `02_instagram_...`) plus the consolidated `resumen.md`. What used to take an entire afternoon of replaying videos and typing notes by hand now finishes in under a minute, running 100% locally.

The source code is available on GitHub: [**`github.com/riccivr/reelscribe`**](https://github.com/riccivr/reelscribe).
