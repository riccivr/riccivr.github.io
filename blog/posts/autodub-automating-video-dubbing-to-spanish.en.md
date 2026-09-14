# autodub: automating video dubbing to Spanish for my girlfriend

*Published: September 14, 2026. Category: Projects & Multimedia. Reading time: ~5 min*
*Tags: Python, autodub, FFmpeg, Whisper, Audio, Open Source*

---

I consume an unhealthy amount of videos every day: technical deep dives, documentary essays, historical breakdowns, and random curiosities on YouTube.

Whenever I find something genuinely interesting, my first instinct is wanting to share it with my girlfriend. The thing is, we do not live together yet, and during our workdays we both spend long hours staring at computer screens.

Almost everything I watch and want to send her is in English. She understands English and can read subtitles without an issue, but after spending all day working in front of a monitor, the last thing anyone wants is to sit through another 25-minute video squinting at subtitles on a phone or laptop. Subtitles trap your eyes on the screen: you cannot look away while cooking, you cannot give your eyes a break, and reading rapid text while animations or charts play on screen feels like work.

I simply wanted to send her the dubbed video so she could enjoy it comfortably on her own time, like a podcast or a relaxed show without visual fatigue. That frustration turned into my newest project: [**`autodub`**](https://github.com/riccivr/autodub), a command-line tool that takes any video and produces a synchronized Spanish-dubbed version locally.

---

## 1. Why dubbing to Spanish is surprisingly tricky

When I started sketching the idea, I thought the pipeline would be straightforward: transcribe, translate, generate speech, and merge.

I was wrong. Dubbing speech between English and Spanish has two major friction points: syllable expansion and audio atmosphere.

### The syllable expansion problem

Spanish is notoriously more verbose than English. On average, a Spanish sentence requires 20% to 30% more syllables to express the same thought:

- English: *"I had to run down the hill."* (7 syllables)
- Spanish: *"Tuve que bajar corriendo la colina."* (12 syllables)

If an English speaker says a sentence in a 3-second window, the synthesized Spanish audio will take 4.2 seconds. If you simply paste that audio into the timeline, it bleeds into the next sentence. Within two minutes of video, speech drifts out of sync by several seconds, and the whole video becomes unwatchable.

### The regional nuance problem

Spanish has vast regional variation. A machine translation that sounds natural in one country can sound jarring or overly academic in another. Automated translation APIs also tend to stumble on technical slang, internet idioms, and casual jokes.

On top of that, text-to-speech voices can easily sound like a monotone GPS from 2005. If the voice has no cadence or warmth, it kills the humor and storytelling of the original creator.

### The uncanny silence of audio replacement

Most naive dubbing scripts simply mute the original audio track and replace it with TTS.

The result feels eerie. You lose the background music, sound effects, room reverb, and laughter. The video ends up feeling sterile and unnatural, like a corporate compliance presentation.

---

## 2. How autodub solves these problems

I designed `autodub` around a few practical constraints: it had to run locally on my CPU without requiring an expensive GPU, it had to prevent timeline drift across long videos, and it had to keep the original ambience intact.

```
                    ┌────────────────────────────┐
                    │      Input URL / Video     │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │  yt-dlp & FFmpeg Audio Ext │
                    │    16 kHz Mono WAV Stream  │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │ faster-whisper (int8 CPU)  │
                    │   Timestamped Segments     │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │  Concurrent Translation    │
                    │    Strict Timestamp Map    │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │    Piper TTS / Edge-TTS    │
                    │   Synthesize Raw Audio     │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │ In-Memory Timeline Aligner │
                    │ - Time-stretch via atempo  │
                    │ - In-memory PCM silence    │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │      FFmpeg Audio Duck     │
                    │  Dubbed Voice: 1.0 Volume  │
                    │  Original Audio: 0.15 Vol  │
                    └──────────────┬─────────────┘
                                   │
                                   ▼
                    ┌────────────────────────────┐
                    │    Dubbed Video Output     │
                    └────────────────────────────┘
```

### In-memory PCM timeline alignment

To solve syllable expansion, `autodub` measures the duration of each synthesized Spanish segment against the original English speaking window.

If the Spanish speech is longer than the window, the engine runs a time-stretch filter using FFmpeg's `atempo`, speeding up playback slightly (capped between 1.0x and 1.75x) so it fits inside the allotted time without turning into a chipmunk voice.

Instead of spawning hundreds of separate FFmpeg processes to stitch clips together, `autodub` decodes audio directly into raw PCM buffers in memory. It places speech at exact sample offsets and fills pauses with clean digital silence. This completely eliminates timeline drift across hour-long videos.

### Preserving ambience with audio ducking

Instead of stripping the original soundtrack, `autodub` uses FFmpeg's audio filter graph to perform ducking:

- When nobody is speaking, the original audio plays at full volume.
- When the Spanish dubbed voice speaks, the original audio drops to 15% volume (`--bg-volume 0.15`).

This keeps the creator's background music, Foley effects, and tone alive behind the translated voice.

### Offline CPU execution with cloud flexibility

By default, `autodub` uses `faster-whisper` with int8 quantization on CPU and synthesizes speech locally with `piper-tts`. It runs completely offline without sending audio to third-party servers.

For videos where we want more expressive, conversational voices, I added an optional `--engine edge-tts` flag. This connects to Microsoft's neural voice models, supporting distinct Spanish accents like `es-ES-AlvaroNeural`, `es-ES-ElviraNeural`, and `es-MX-DaliaNeural`.

---

## 3. The CLI workflow

Running `autodub` is a single terminal command:

```sh
# Dub a YouTube video using local Piper TTS on 4 CPU threads
./autodub.sh -t 4 "https://www.youtube.com/watch?v=EXAMPLE_ID"

# Dub with cloud neural voices in Mexican Spanish
./autodub.sh --engine edge-tts --voice es-MX-DaliaNeural -t 4 "https://www.youtube.com/watch?v=EXAMPLE_ID"

# Generate an MKV container with switchable English and Spanish audio tracks
./autodub.sh --dual-audio /path/to/downloaded_video.mp4
```

Now, when I find a great video while working, I fire off a command in the background. In minutes, I have a dubbed video ready to send her way so she can listen comfortably without having to squint at subtitles after a long day of screen time.

The complete code, benchmarks, and setup instructions are open-source on GitHub: [**`github.com/riccivr/autodub`**](https://github.com/riccivr/autodub).
