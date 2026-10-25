# LumaLyrics 4.0 — Cinematic visual redesign

This is a visual redesign of the LumaLyrics 3.1 codebase. The Spotify OAuth, LRCLIB lookup, timed line display, four font choices, playback controls, preferences, and GitHub Actions workflow are retained.

Changes: full-viewport cinematic stage, enlarged artwork, subdued auto-revealing controls, drifting multilayer ambient light, moving perimeter lightstrip, atmospheric karaoke text, enhanced living-art shimmer, responsive layouts.

**Limitations:** The supplied reference MP4 could not be decoded in the build environment, so this is an interpretation of the requested immersive aesthetic, not a verified shot-for-shot recreation. Living artwork is CSS motion, not AI video generation. Word timing requires word-timed source data; ordinary LRCLIB LRC provides line timing. Spotify API restrictions and permissions still apply. Not compiled/tested on macOS.

## Build without Xcode

1. In GitHub Desktop, **Fetch/Pull origin first** and resolve any outstanding conflicts before copying files.
2. In the existing `Lumalyrics` repository, copy the *contents* of this folder (including hidden `.github`) into the repo, replacing files, but **never replace `.git`**.
3. Commit and Push origin.
4. Download the `LumaLyrics-Apple-Silicon` artifact from GitHub Actions after a successful build; extract and install the DMG.
5. Quit the older app before replacing it. The app is unsigned and may be blocked by Gatekeeper; approve only if you trust the source/build.

Settings retain your existing Spotify Client ID and font/theme preferences where app identity is unchanged.
