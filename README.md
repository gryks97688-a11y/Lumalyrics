# LumaLyrics 3.0 — Apple Silicon

## What is implemented
- Spotify PKCE connection, track metadata, play/pause/skip/previous, seek and volume (subject to Spotify permissions and account/device eligibility). 401 errors trigger token refresh and one retry.
- Automatic lyrics search from LRCLIB (enabled by default). Timed LRC lines are highlighted by playback position. Enhanced LRC word tags are supported if supplied. Plain lyrics are shown without invented timestamps. Not every track has timed lyrics.
- Four selectable lyric fonts: Apple-style, modern minimalist, serif, cinematic uppercase.
- Living album cover on click: subtle zoom/parallax, glow and light sweep. This is a deterministic animation of the cover image, **not AI-generated 3D animation**.
- Continuous moving ambient gradients and perimeter light strip, adjustable brightness; always-on-top window mode.
- Fullscreen and optional LRC import.

## Important limitations
- Spotify does not expose audio via its Web API. This build **does not listen to or transcribe system audio** and does not perform real-time AI vocal recognition. That would require a separate native macOS audio-capture helper, an audio model, consent, and rights review.
- Spotify Platform rules restrict synchronising Spotify recordings with visual media, including lyrics. Before distributing or using lyric-sync functionality with Spotify, review Spotify's current terms and obtain necessary rights. This project is a technical prototype, not a claim of licensing clearance.
- LRCLIB provides line-level timestamps for many songs, not guaranteed word-by-word data. Word-level highlighting works only for enhanced LRC timestamps.
- macOS's actual secure lock/login screen cannot be replaced by Electron. Always-on-top and fullscreen are provided instead.
- Volume and playback control depend on Spotify Premium and Spotify API eligibility; commands can fail when no compatible active device is available.
- This build is unsigned/unnotarized. Only open builds you trust.

## Build without Xcode
1. Copy the contents of this folder into your existing GitHub repository, keeping `.git` untouched.
2. In GitHub Desktop, commit and push.
3. GitHub Actions `Build LumaLyrics for Apple Silicon` builds `.dmg` and `.zip` artifacts on macOS.
4. Download the workflow artifact, unzip, open the DMG, quit old LumaLyrics, and replace it in Applications.

## Spotify setup
In LumaLyrics Settings enter your Spotify developer Client ID. Add the redirect URI shown in Settings to your Spotify developer dashboard, exactly. Connect Spotify and approve playback permissions. If controls fail with 401, disconnect and reconnect. Start music in Spotify first.

## Development
`npm install && npm start` on a computer with Node.js. `npm run dist:mac` to build on macOS.
