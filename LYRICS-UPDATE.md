# LumaLyrics 3.1 — automatic lyrics fix

This release fixes a startup race that could prevent automatic lyric retrieval from starting, improves LRCLIB matching using exact lookup and multiple searches, and correctly renders plain lyrics when no timestamps are available.

## Use

1. Connect Spotify in Settings.
2. Ensure **Automatically show lyrics when a song starts** is checked; save settings. It is enabled by default.
3. Play a song in Spotify. Lyrics are searched automatically; no .lrc import is needed when LRCLIB has a match.
4. When LRCLIB returns line timestamps, the app highlights timed lines using Spotify playback position. Word-level highlighting requires embedded word timestamps and is not available for most tracks.
5. If no match exists, the app reports this instead of fabricating lyrics.

## Limitations

This build does not transcribe Mac audio or create lyrics from sound. Spotify API terms restrict synchronising external lyrics with Spotify recordings; review the applicable terms before deploying or distributing this integration. Lyrics availability and rights depend on the third-party provider.

## Build

Upload the contents of this folder to your existing GitHub repository (including .github) using GitHub Desktop, commit, and push. Download the DMG from the successful GitHub Actions run. This source has not been compiled or runtime-tested on macOS in this environment.
