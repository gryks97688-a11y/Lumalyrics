# LumaLyrics 2.0 — Apple Silicon Mac app

A personal Spotify companion with optional community-sourced synced lyrics, playback controls, and ambient visual themes. This is a complete Electron source project, **not** a precompiled Mac app.

## Upgrade without Xcode

1. Download and unzip `LumaLyrics-v2-Apple-Silicon.zip`.
2. Open GitHub Desktop, choose your existing **Lumalyrics** repository, then **Repository → Show in Finder**.
3. Open the extracted `LumaLyrics-v2` folder in another Finder window. Select its contents and copy them into the existing repository folder. Choose **Replace** for existing files. Copy the hidden `.github` directory too, but **do not replace or delete the repository's `.git` folder**.
4. Return to GitHub Desktop. Confirm the changes, enter `Upgrade LumaLyrics to 2.0` in Summary, click **Commit to main**, then **Push origin**.
5. In GitHub, open **Actions → Build LumaLyrics for Apple Silicon**. Wait for the new green checkmark, open the run, then download the `LumaLyrics-Apple-Silicon` artifact.
6. Unzip the artifact, open the `.dmg`, and drag `LumaLyrics.app` into Applications to replace the old app (quit the old app first).

The GitHub Actions workflow is retained at `.github/workflows/build-mac.yml`. GitHub's hosted macOS runner builds the DMG; no local Xcode is needed.

## Spotify setup

- Open LumaLyrics → Settings. Create a Spotify developer application at https://developer.spotify.com/dashboard and paste its **Client ID** into Settings.
- Register the **exact redirect URI** shown by the app (currently `http://127.0.0.1:43821/callback`).
- Connect Spotify, sign in, and approve the requested scopes. **Reconnect Spotify after upgrading from v1** so the new `user-modify-playback-state` permission is granted. If that permission was not granted, controls will fail.
- Start music on an active device in the official Spotify app. The buttons send commands to that active device; LumaLyrics does not play or stream Spotify audio itself.
- Spotify's current development-mode rules may require Premium and additional eligibility. Spotify can change its developer access requirements. The app does not bypass these rules.

## Automatic lyrics

- Settings → enable **Automatically look up synced lyrics (LRCLIB)** → **Save appearance & lyrics settings**.
- When the track changes, the app sends **song title, first artist and approximate duration** to LRCLIB's public search endpoint. This is an independent community service, **not Spotify lyrics**. Lyrics may be absent, mismatched, unsynchronised, or subject to copyright and licensing restrictions. Verify you have rights to display/share lyrics; don't redistribute lyric content without permission.
- The feature is off by default. You can always import your own properly licensed `.lrc` file manually.

## Visual effects

Choose Glass, Monochrome, Aurora or Warm Glow in Settings. Animated gradients are derived from track identity and CSS animations; **they are not beat-synchronised or derived from Spotify audio**. Ambient lighting can be disabled. The app respects macOS reduced-motion settings.

## Build / security notes

- The included `.github/workflows/build-mac.yml` creates an **unsigned, unnotarised** DMG. macOS Gatekeeper may warn on launch. Only install builds from a repository you trust. Proper public distribution should use Apple Developer ID signing and notarisation.
- This project is not affiliated with Spotify or LRCLIB. Spotify Web API access and policies apply. Spotify's policies may restrict synchronising visual media to its recordings; this app does not ingest Spotify audio or render audio-driven visuals.
- OAuth uses PKCE and loopback callback. Tokens are stored using Electron safeStorage where supported. No client secret is required.
- Source has been prepared and statically inspected, but this environment cannot run Electron/macOS, so the GitHub Actions build is the integration test.

## Troubleshooting

- **No playback detected:** Start a song in the official Spotify app, then check the developer dashboard permissions and Spotify account eligibility.
- **Controls return 403:** Reconnect to grant the added scope, and check Spotify Premium/API eligibility.
- **Controls return 404:** Open Spotify and start playback on an active device.
- **No lyrics:** Enable lookup, check internet, or import `.lrc`.
- **Build fails:** Open GitHub Actions → failed run → failed step and copy the error text.
