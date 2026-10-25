# LumaLyrics 6.3 — Split Cinematic Album Scenes

## Changes
- Fullscreen edge light strips (the **window** edges in windowed mode). Use the fullscreen button to fill the monitor.
- Crossfading full-screen backgrounds use the actual Spotify album image; darkened and softened for readability.
- Pointer-driven subtle parallax (respects reduced-motion settings).
- Album colour sampling drives the neon palette where CORS permits; otherwise fallback palette is used.
- Split composition with square foreground artwork and controls in normal document flow to prevent overlap.
- Song changes update the backdrop automatically through existing playback polling.

## Build
Run `npm install`, then `npm start` for local testing. Run `npm run dist:mac` on an Apple Silicon Mac for a DMG. Quit the old app before installing the new build. Merely copying `src` files will not update an installed `.app`.

## Limitations
This source package has not been visually tested on macOS or tested against a live Spotify account. LRCLIB 503 errors remain an external service issue. Colour extraction depends on CORS permissions for the cover image. Screen-edge light is software rendered inside the fullscreen window, not physical LED hardware.
