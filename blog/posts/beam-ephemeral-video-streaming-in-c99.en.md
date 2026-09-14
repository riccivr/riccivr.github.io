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

## 3. Zero-config ephemeral HTTPS tunnels

Sharing a local server running on `localhost:8080` with someone on a different network usually means configuring port forwarding, setting up Dynamic DNS, or signing up for third-party tunnel SaaS products with account keys and custom daemon binaries.

With `beam`, I wanted a completely frictionless, zero-account workflow: pass a single `-p` flag, get an ephemeral HTTPS link, and you are done.

I implemented this by spawning an OpenSSH child process that establishes a reverse port-forwarding tunnel via `localhost.run`:

```c
execlp("ssh", "ssh",
       "-T",
       "-o", "StrictHostKeyChecking=no",
       "-o", "UserKnownHostsFile=/dev/null",
       "-o", "ExitOnForwardFailure=yes",
       "-o", "Compression=no",
       "-o", "IPQoS=throughput",
       "-o", "TCPKeepAlive=yes",
       "-o", "ServerAliveInterval=15",
       "-R", port_spec,
       "nokey@localhost.run",
       (char *)NULL);
```

Key engineering decisions in the tunnel architecture:

1. **`Compression=no`:** video files are already compressed with modern codecs like H.264 and AAC. Enabling SSH compression burns CPU cycles without saving a single byte of bandwidth.
2. **`IPQoS=throughput`:** tells the networking stack to optimize for sustained transfer speed rather than interactive packet responsiveness.
3. **Auto-reconnect:** `beam` monitors the child SSH process using non-blocking `waitpid()`. If network turbulence drops the tunnel, `beam` automatically re-establishes the connection and prints the refreshed URL without killing the active HTTP server.
4. **Token protection:** each link is assigned a 128-bit random hexadecimal token read directly from `/dev/urandom`. Without the exact token, the endpoint cannot be discovered or enumerated.

---

## 4. Systems performance: sendfile() and persistent connections

Because `beam` is written from scratch in POSIX C99 with zero external library bloat, I optimized the file transmission hot path:

- **Kernel zero-copy with `sendfile()`:** on Linux systems, `beam` streams requested byte ranges directly from the file descriptor to the network socket within kernel space using `sendfile()`. Bytes are never copied into user-space RAM buffers, keeping CPU and memory usage negligible even when serving multiple gigabytes.
- **HTTP/1.1 Keep-Alive:** browser media players fire dozens of rapid Range requests in quick succession. `beam` maintains open TCP sockets with `Connection: keep-alive` (with a 15-second idle timeout), eliminating the latency of repeated handshakes.
- **Terminal QR generation:** `beam` includes an integrated C QR generator (`qr.c`) that outputs the share link directly to the terminal using Unicode half-block characters (`▀`, `█`). If I want to test playback on my own phone over local Wi-Fi, I simply point my camera at the terminal.

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
