# LumaLyrics — Apple Silicon Mac app

A minimalist Spotify companion visualizer with animated, time-synchronised lyrics. **You do not need Xcode.**

## Download the app using GitHub (no coding)

1. Create a free account at https://github.com if you do not already have one.
2. Create a **private** repository named `LumaLyrics` (do not add a README).
3. Upload the **contents** of this project ZIP to the repository, preserving the `.github/workflows/build-mac.yml` folder. GitHub's web uploader can sometimes omit hidden `.github` folders; if that happens, create `.github/workflows/build-mac.yml` using **Add file → Create new file** and paste the file from this ZIP. Alternatively use GitHub Desktop to publish the folder.
4. Go to **Actions → Build LumaLyrics for Apple Silicon → Run workflow**. A push to `main` may also start it automatically.
5. When the green check appears, open the run and download the **LumaLyrics-Apple-Silicon** artifact under **Artifacts**.
6. Unzip the artifact and open the `.dmg`. Drag **LumaLyrics** to Applications.
7. Because this is **unsigned**, macOS may block the first launch. In Finder, Control-click LumaLyrics → Open (if offered), or go to **System Settings → Privacy & Security → Open Anyway** after attempting to open it. Only bypass this warning for software you trust. Apple notarization requires an Apple Developer account and signing setup.

## Try without Spotify

Open the app and click **Try demo**. You will see animated sample lyrics and ambient gradients. The demo does not play audio.

## Connect Spotify

1. Go to https://developer.spotify.com/dashboard and create an app (Spotify account required). Spotify may limit which accounts can create/use developer apps; eligibility and quotas are outside LumaLyrics' control.
2. In the Spotify app's settings, add the redirect URI **exactly**: `http://127.0.0.1:43821/callback`.
3. If Spotify requires an allowlist for your development app, add your Spotify account there.
4. In LumaLyrics, open **Settings**, paste your **Client ID** (not a Client Secret), click **Connect Spotify**, and authorize in your browser.
5. Play music in the Spotify app. LumaLyrics polls your current track approximately every 4.5 seconds. It does **not** capture or play Spotify audio.
6. Import a timestamped `.lrc` lyrics file for the current track. The app intentionally does not scrape or redistribute copyrighted lyrics. Re-import on track changes.

Sample LRC format:

```text
[00:04.00]First line of the song
[00:08.50]Second line of the song
```

Use the Sync offset slider to compensate for lyric timing differences. Spotify playback position can be a few seconds behind due to polling and network delays.

## Important limitations

- Spotify Web API does not expose synchronized lyrics. Import `.lrc` files manually.
- Spotify developer access, restrictions, and premium requirements may change. Some accounts or newly created apps may not be able to use the API.
- This app displays track metadata and artwork, not real-time audio-responsive beat detection. Ambient gradients are track-derived, not beat-reactive.
- This is an **unsigned, unnotarized** app. It will not install as seamlessly as a commercial app.
- Credentials use OAuth PKCE; no Spotify Client Secret is stored. Tokens are encrypted using Electron safeStorage when available, with a local-file fallback if unavailable.
- The Spotify API rate-limits requests; the app respects `Retry-After` on HTTP 429.

## Developer notes

Requires Node.js 22+ for local development. `npm install` and `npm start` run locally. `npm run dist:mac` builds an Apple Silicon `.dmg` and `.zip` on macOS. GitHub Actions uses a hosted macOS runner. The project is intentionally dependency-light (Electron + electron-builder).

The project has not been compiled on a Mac in this environment; the cloud workflow is intended to perform the actual macOS build.
