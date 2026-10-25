# LumaLyrics 6.0 — Cinematic Glow

Version 6 builds on the supplied LumaLyrics 5 source and the supplied cinematic reference image. The new stage features a violet-to-peach neon perimeter, a large softly lit album-art arch, subdued playback information, and oversized kinetic lyrics with amber word emphasis.

The existing Spotify PKCE connection, LRCLIB lyrics lookup, local LRC import, demo, settings, and macOS build workflow are retained. The screenshot is a visual reference only, not bundled copyrighted album artwork or lyrics.

## Run locally

```bash
npm install
npm start
```

## Build macOS (Apple Silicon)

```bash
npm install
npm run dist:mac
```

Alternatively push the folder contents (including `.github`) to a GitHub repository and run the included macOS build workflow.

**Note:** This source has not been compiled or tested on macOS in this environment. Spotify API access and licensing restrictions apply.


### Album-adaptive lighting and progressive lyrics
The neon border, ambient lighting and highlights now use colours sampled from the current Spotify album artwork. If artwork cannot be sampled, a violet/amber fallback is used. Spotify album artwork is subject to image CORS availability.

Lyrics appear progressively word-by-word. Enhanced LRC word timestamps provide precise sync; standard LRCLIB line timestamps provide **estimated** word timing, which can differ from the actual vocal timing. Import an enhanced LRC file for precise word-level timing.
