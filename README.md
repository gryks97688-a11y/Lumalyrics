# LumaLyrics 5.0 — Living Art

This is the updated Electron source for the cinematic interface, designed around the approved reference image. It retains the existing Spotify and LRCLIB logic from version 4, and adds:

- Large, softened album-art backdrop with slow cinematic movement
- Thicker rounded edge-lighting and interior bloom
- Focused kinetic word layout with glowing emphasis
- Four font choices, existing Spotify controls, and fullscreen mode
- Enhanced LRC word timing when available; **estimated** word timing when LRCLIB only supplies line timestamps

## Build without Xcode

Copy the contents of this folder (including `.github`) into your existing GitHub Desktop repository, keeping its `.git` directory. Commit, push, then download the DMG from the successful GitHub Actions run.

## Notes

The image shown in the design concept is an illustration, not a licensed artwork asset embedded in this application. The app uses the current track's album cover supplied through Spotify metadata.

This source has not been compiled or visually tested on macOS here. Spotify playback permissions and developer policy restrictions still apply, including restrictions concerning synchronisation of Spotify recordings with visual media or external lyrics.
