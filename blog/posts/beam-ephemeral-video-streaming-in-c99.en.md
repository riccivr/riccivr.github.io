# beam: streaming dubbed videos with ephemeral HTTP tunnels and Range requests in C99

*Published: September 14, 2026. Category: Systems & Networking. Reading time: ~6 min*
*Tags: C99, beam, HTTP, Networking, POSIX, Video*

---

In my previous post, I wrote about building [`autodub`](https://riccivr.github.io/blog/autodub-automating-video-dubbing-to-spanish.html) to transcribe, translate, and dub English videos into Spanish so I could send them to my girlfriend, sparing her the eye fatigue of reading tiny subtitles after working in front of a screen all day.

As soon as I started using it regularly, I ran straight into the second half of the problem.

The `autodub` pipeline produced a clean 300 MB or 500 MB `.mp4` file sitting on my local drive. But how was I supposed to get that video to her immediately, with zero friction?

The standard options were all frustrating:

- **WhatsApp or Telegram:** messaging apps either recompress the video into pixelated mush, take ages to upload, or enforce arbitrary file size caps.
- **Google Drive, Dropbox, or WeTransfer:** you have to open a browser tab, wait for the full upload to complete, copy a link, and deal with cloud storage limits. Worse, Google Drive frequently spends 10 to 15 minutes "processing" the video before letting you stream it, forcing the other person to download the entire 400 MB file before playing a single frame.
- **Nginx, S3, or CloudFront:** spinning up a public web server or provisioning cloud storage buckets just to share a 20-minute video with someone is complete overkill, costs money, and requires maintenance.

I had no interest in uploading files to cloud services. The video already lived on my hard drive. All I wanted was a temporary, self-expiring link that allowed her to open Safari or Chrome on her phone or laptop, press play, and have the video stream instantly in the native media player with full seeking support, shutting down automatically once the timer expired.

To solve this, I built [**`beam`**](https://github.com/riccivr/beam): a zero-dependency, minimal HTTP file-sharing server written in C99, designed specifically for ephemeral media streaming via single-range byte seeking and automated HTTPS reverse tunnels.

---

## 1. Native browser playback and HTTP Range requests (206)

When you tap a video link in iOS Safari or Android Chrome, the mobile browser does not issue a single monolithic `GET` request to pull down the entire file.

Modern web media players rely heavily on the **HTTP Range Requests specification (RFC 7233)**:

```
Browser (Client)                                 beam (C99 Server)
       │                                                 │
       │─── GET /token (Range: bytes=0-1048575) ────────>│
       │                                                 │ [Reads initial metadata]
       │<── 206 Partial Content (Content-Range: 0-...) ──│
       │                                                 │
  [Instant Playback]                                     │
       │                                                 │
  [User seeks forward to 15:30]                          │
       │─── GET /token (Range: bytes=35684000-) ────────>│
       │                                                 │ [sendfile() at offset]
       │<── 206 Partial Content (Content-Range: ...) ────│
```

1. The browser requests an initial small slice of bytes (e.g. `Range: bytes=0-1048575`) to inspect container headers.
2. It verifies that the server advertises `Accept-Ranges: bytes`.
3. When the viewer drags the scrubber forward, the player cancels the in-flight transfer and immediately sends a new request with the exact target offset: `Range: bytes=35684000-`.

If your HTTP server responds with a naive `200 OK` and attempts to stream from byte 0, mobile players choke: scrubbers lock up, playback freezes, or the interface errors out.

In `beam`, I wrote a strict byte-range parser in C99. It handles:

- **Open-ended ranges:** `Range: bytes=1024-` (from offset 1024 through EOF).
- **Closed ranges:** `Range: bytes=0-499` (exactly the first 500 bytes).
- **Suffix ranges:** `Range: bytes=-1000` (the final 1000 bytes of the file).
- **Boundary checks:** if the requested offset exceeds the file length, `beam` replies immediately with `416 Range Not Satisfiable` and `Content-Range: bytes */TOTAL`.

By returning `206 Partial Content` along with `Content-Disposition: inline`, browsers trigger their built-in system player, delivering native hardware-accelerated playback with near-zero initial buffering.

---

## 2. The MP4 moov atom problem

Serving MP4 files over HTTP has an infamous architectural catch.

In the ISO Base Media File Format (MP4/MOV), critical video metadata (duration, frame rate, resolution, codec configurations, and the sample index table) is stored inside the **`moov` atom**. Raw audio and video frames live inside the **`mdat` atom**.

By default, most encoders write the `moov` atom at the very **end** of the file, after all media samples:

```
Default MP4:
[ ftyp ][                     mdat (500 MB)                     ][ moov (1 MB) ]
  ▲                                                                 ▲
  File start                                                        Metadata at the end

Faststart MP4 (+faststart):
[ ftyp ][ moov (1 MB) ][                     mdat (500 MB)                     ]
  ▲        ▲
  Start    Metadata at byte 32 -> Instant streaming playback
```

When the `moov` atom sits at the end of a 500 MB file, a web browser cannot begin playing or calculate total runtime until it has fetched the end of the file. Over high-latency tunnels or mobile data, this causes noticeable playback lag.

`beam` inspects the container header at startup. If it is serving an MP4 and `ffmpeg` is available on the machine, it runs a background remux with `-movflags +faststart`. This relocates the `moov` atom to the very beginning of the container without re-encoding any audio or video tracks. It takes two seconds and ensures that playback starts within 100 milliseconds.

---

## 3. From SSH reverse tunnels to Cloudflare Quick Tunnels

Sharing a local server running on `localhost:8080` with someone outside your local network usually means setting up port forwarding (often impossible behind residential CGNAT), managing Dynamic DNS, or configuring persistent tunnel daemons with accounts and API keys.

In the initial prototype of `beam`, I implemented public tunneling via OpenSSH reverse port-forwarding to `localhost.run`:

```c
/* Initial prototype: OpenSSH reverse port-forwarding */
execlp("ssh", "ssh",
       "-T",
       "-o", "StrictHostKeyChecking=no",
       "-o", "UserKnownHostsFile=/dev/null",
       "-o", "ExitOnForwardFailure=yes",
       "-o", "Compression=no",
       "-o", "IPQoS=throughput",
       "-R", port_spec,
       "nokey@localhost.run",
       (char *)NULL);
```

While that worked for a quick proof of concept, real-world testing over cellular networks uncovered two painful architectural flaws:

1. **TCP-over-TCP and Head-of-Line Blocking:** Encapsulating HTTP over an SSH TCP tunnel caused throughput collapse whenever minor packet loss occurred.
2. **Split Packet Headers:** High-latency SSH links frequently split the HTTP request across multiple packets. If the server called `recv()` once and only got the `GET /token HTTP/1.1` line before the `Range:` header arrived in the next TCP segment, `beam` fell back to serving a full `200 OK` from byte 0, crashing the mobile video scrubber.

To permanently fix this, I replaced SSH port-forwarding with **Cloudflare Quick Tunnels** (`cloudflared`):

```c
/* Modern beam: Zero-account Cloudflare Quick Tunnel */
snprintf(origin, sizeof(origin), "http://127.0.0.1:%d", local_port);
bin = getenv("BEAM_TUNNEL_BIN");
if (!bin || !bin[0])
    bin = "cloudflared";
execlp(bin, bin, "tunnel", "--url", origin, "--no-autoupdate", (char *)NULL);
```

Why Cloudflare Quick Tunnels make a massive difference:

- **No SSH encapsulation overhead:** Traffic routes directly from Cloudflare's global Anycast edge down to the local HTTP daemon. No SSH handshakes, no host key prompts, and zero TCP-over-TCP meltdown.
- **Dynamic URL extraction:** `beam` monitors the child `cloudflared` process using a non-blocking pipe, extracts the generated `https://*.trycloudflare.com` URL, and keeps the log pipe open so `cloudflared` never hits a broken pipe (SIGPIPE).
- **Edge route propagation delay:** A short one-second wait ensures Cloudflare's edge routing tables propagate before the URL is printed to the terminal or copied to the clipboard.
- **Tunnel resilience:** If the connection drops or the process exits, `beam` automatically re-establishes the tunnel and prints the new URL without interrupting the underlying HTTP server.

---

## 4. Systems performance: sendfile(), keep-alive, and Range session tracking

Because `beam` is written from scratch in POSIX C99, I tuned the network transmission pipeline specifically for the quirky behavior of mobile video players:

### Zero-copy streaming and socket tuning
- **Kernel zero-copy with `sendfile(2)`:** On Linux systems, `beam` streams requested byte ranges directly from the file descriptor into the TCP socket within the kernel. Bytes never travel through user-space RAM, keeping memory consumption down to a few kilobytes even when streaming multi-gigabyte 4K media.
- **Socket flags:** Sockets are tuned with `TCP_NODELAY` (disabling Nagle's algorithm for immediate range delivery), `TCP_QUICKACK` on Linux to minimize ACK round-trips, and `posix_fadvise(fd, offset, len, POSIX_FADV_SEQUENTIAL)` to trigger aggressive kernel page cache readahead.
- **Persistent connections (`Connection: keep-alive`):** Native players fire dozens of Range requests in rapid succession. Speaking HTTP/1.1 persistent connections on the same socket eliminates the latency of repeated three-way TCP handshakes.
- **Robust header buffering:** Incoming requests are buffered until the `\r\n\r\n` boundary is reached, with `gettimeofday` timeout bounds. Any leftover bytes after the terminator are preserved for the next pipelined request on the socket.

### Range session tracking in one-shot mode (`-1`)
A classic burn-after-reading file server simply terminates after serving one complete file. But video players never download the entire file in one request. They fire dozens of `206 Partial Content` requests as the user buffers and seeks.

If `-1` had terminated on the first request, the video would freeze after 0.1 seconds. 

In `beam`, the `-1` flag treats a finished Range response as part of an active viewer session. As long as the viewer continues requesting chunks, the worker stays alive. Once all sibling worker processes finish and the two-second keep-alive grace window closes, `beam` safely terminates.

### Resume and interactive controls
If you close `beam` and want to re-share the same video later, running `beam -p -c` (or `beam -r`) reopens the previous file while preserving the original token hash, keeping existing shared links alive. 

While `beam` runs, you can also press `[p]` to reopen or refresh the tunnel on demand, `[c]` to re-copy the URL, and `[q]` to quit cleanly.

---

## 5. UNIX composition with autodub

The primary reason I built `beam` was to close the loop with `autodub` using classic UNIX piping principles: small, focused utilities composed together.

```sh
# Dub a YouTube video and immediately share it publicly
autodub "https://www.youtube.com/watch?v=EXAMPLE_ID" | beam -p -c
```

Here is what happens during that pipeline:

```
┌──────────────────────────────────────────────────────────────┐
│ autodub (Python)                                             │
│ 1. Downloads media with yt-dlp                               │
│ 2. Transcribes on CPU using faster-whisper                   │
│ 3. Translates text and synthesizes speech via Piper TTS      │
│ 4. Performs PCM alignment and FFmpeg audio ducking           │
│ 5. Writes to stdout: "Dubbed: /tmp/autodub/video_es.mp4"     │
└──────────────────────────────┬───────────────────────────────┘
                               │ (real-time pipe stream)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│ beam (C99)                                                   │
│ 1. Echoes autodub's progress bars to the terminal            │
│ 2. Extracts the final dubbed video path when completed       │
│ 3. Executes faststart remuxing if necessary                  │
│ 4. Opens the public HTTPS reverse tunnel (-p)                │
│ 5. Copies the secure URL to the system clipboard (-c)        │
│ 6. Renders the ANSI QR code in the terminal                  │
│ 7. Streams Range chunks until the TTL expires                │
└──────────────────────────────────────────────────────────────┘
```

Once `autodub` finishes processing, `beam` detects the output file path, launches the HTTP daemon, establishes the HTTPS tunnel, and places the ready-to-share URL straight onto my clipboard via `clipbridge` or `wl-copy`.

All I have to do is paste the link into a chat with my girlfriend. She taps it from her phone, the video streams immediately in Safari without logins, ads, or file downloads, and the server automatically shuts down five hours later.

The complete C99 source code, man page, and test suite are available on GitHub: [**`github.com/riccivr/beam`**](https://github.com/riccivr/beam).
