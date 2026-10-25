const {app, BrowserWindow, ipcMain, dialog, shell, safeStorage} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

const PORT = 43821;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
let win, tokens = null, pending = null, callbackServer = null;
const storePath = () => path.join(app.getPath('userData'), 'settings.json');
function readSettings() { try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); } catch { return {}; } }
function saveSettings(update) { fs.writeFileSync(storePath(), JSON.stringify({...readSettings(), ...update}, null, 2), {mode: 0o600}); }
function persistTokens(t) {
  tokens = t;
  if (safeStorage.isEncryptionAvailable()) saveSettings({secureTokens: safeStorage.encryptString(JSON.stringify(t)).toString('base64'), plainTokens: null});
  else saveSettings({plainTokens: t, secureTokens: null});
}
function loadTokens() {
  const s = readSettings();
  try { if (s.secureTokens && safeStorage.isEncryptionAvailable()) return JSON.parse(safeStorage.decryptString(Buffer.from(s.secureTokens, 'base64'))); } catch {}
  return s.plainTokens || null;
}
function sendAuth(state) { if (win && !win.isDestroyed()) win.webContents.send('auth-state', state); }
function makeWindow() {
  win = new BrowserWindow({width: 1100, height: 740, minWidth: 750, minHeight: 540,
    backgroundColor: '#0b0c12', title: 'LumaLyrics', titleBarStyle: 'hiddenInset',
    webPreferences: {preload: path.join(__dirname,'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true}});
  win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url}) => { if (url.startsWith('https://')) shell.openExternal(url); return {action:'deny'}; });
}
app.whenReady().then(() => { tokens = loadTokens(); makeWindow(); app.on('activate', () => {if (BrowserWindow.getAllWindows().length === 0) makeWindow();}); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { if (callbackServer) callbackServer.close(); });
ipcMain.handle('settings', () => ({clientId: readSettings().clientId || '', connected: !!tokens, redirect: REDIRECT, autoLyrics: readSettings().autoLyrics === true, theme: readSettings().theme || 'glass', ambient: readSettings().ambient !== false}));
ipcMain.handle('preferences', (_e, input) => {const allowed=['glass','mono','aurora','warm'];const theme=allowed.includes(input?.theme)?input.theme:'glass';const prefs={theme,autoLyrics:input?.autoLyrics===true,ambient:input?.ambient!==false};saveSettings(prefs);return prefs;});
ipcMain.handle('set-client-id', (_e, id) => { const value = String(id || '').trim(); if (value && !/^[a-zA-Z0-9]{20,80}$/.test(value)) throw new Error('Enter a valid Spotify Client ID.'); saveSettings({clientId:value}); return true; });
ipcMain.handle('disconnect', () => {tokens=null; saveSettings({plainTokens:null, secureTokens:null}); sendAuth({connected:false}); return true;});
ipcMain.handle('toggle-fullscreen', () => {win.setFullScreen(!win.isFullScreen()); return win.isFullScreen();});
ipcMain.handle('import-lyrics', async () => {
  const {canceled,filePaths} = await dialog.showOpenDialog(win,{title:'Import timed lyrics',properties:['openFile'],filters:[{name:'Timed lyrics',extensions:['lrc','txt']} ]});
  if (canceled || !filePaths.length) return null;
  const stat=fs.statSync(filePaths[0]); if (stat.size > 1024*1024) throw new Error('Lyrics file is too large.');
  return {name:path.basename(filePaths[0]), text:fs.readFileSync(filePaths[0],'utf8')};
});
ipcMain.handle('sample-lyrics', () => ({name:'demo.lrc', text:`[00:00.00]LumaLyrics\n[00:04.00]The room turns into colour\n[00:08.00]The night begins to glow\n[00:12.00]Every moment has a rhythm\n[00:16.00]And every light can flow\n[00:20.00]Stay here in the music\n[00:24.00]Let the world move slow\n[00:28.00]The words become a feeling\n[00:32.00]In the afterglow` }));
function base64url(buf) {return Buffer.from(buf).toString('base64url');}
async function exchange(params, clientId) {
  const res = await fetch('https://accounts.spotify.com/api/token', {method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({...params,client_id:clientId})});
  const body = await res.json(); if (!res.ok) throw new Error(body.error_description || body.error || 'Spotify token request failed'); return body;
}
ipcMain.handle('connect', async () => {
  const clientId = readSettings().clientId;
  if (!clientId) throw new Error('Save your Spotify Client ID first.');
  if (pending) throw new Error('A Spotify sign-in is already in progress.');
  const verifier = base64url(crypto.randomBytes(64));
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  const state = base64url(crypto.randomBytes(24));
  await new Promise((resolve,reject) => {
    const server = http.createServer(async (req,res) => {
      const u = new URL(req.url, REDIRECT);
      if (u.pathname !== '/callback') {res.writeHead(404);res.end();return;}
      const current = pending;
      if (!current || u.searchParams.get('state') !== current.state) {res.writeHead(400);res.end('Invalid login state.');return;}
      pending = null;
      try {
        if (u.searchParams.get('error')) throw new Error(u.searchParams.get('error'));
        const data = await exchange({grant_type:'authorization_code',code:u.searchParams.get('code'),redirect_uri:REDIRECT,code_verifier:current.verifier},clientId);
        persistTokens({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000});
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<html><body style="font-family:system-ui;background:#101019;color:white;text-align:center;padding:70px"><h2>Connected to LumaLyrics</h2><p>You can close this tab and return to the app.</p></body></html>');
        sendAuth({connected:true});
      } catch(err) {res.writeHead(400);res.end('Spotify sign-in failed. Return to LumaLyrics.');sendAuth({connected:false,error:err.message});}
      server.close(); callbackServer=null;
    });
    server.once('error', reject);
    server.listen(PORT,'127.0.0.1',()=>{callbackServer=server;resolve();});
  });
  pending={verifier,state};
  const authUrl=new URL('https://accounts.spotify.com/authorize');
  Object.entries({response_type:'code',client_id:clientId,scope:SCOPES,redirect_uri:REDIRECT,state,code_challenge_method:'S256',code_challenge:challenge}).forEach(([k,v])=>authUrl.searchParams.set(k,v));
  await shell.openExternal(authUrl.toString());
  setTimeout(()=>{if (pending?.state===state){pending=null;callbackServer?.close();callbackServer=null;}},180000);
  return true;
});
async function accessToken() {
  if (!tokens) return null;
  if (Date.now() < tokens.expires_at-60000) return tokens.access_token;
  const clientId=readSettings().clientId;
  try {
    const data=await exchange({grant_type:'refresh_token',refresh_token:tokens.refresh_token},clientId);
    persistTokens({access_token:data.access_token,refresh_token:data.refresh_token||tokens.refresh_token,expires_at:Date.now()+data.expires_in*1000});
    return tokens.access_token;
  } catch(err) {tokens=null;saveSettings({plainTokens:null,secureTokens:null});sendAuth({connected:false,error:'Spotify session expired. Reconnect.'});throw err;}
}
ipcMain.handle('playback', async () => {
  const token=await accessToken(); if (!token) return {connected:false};
  const res=await fetch('https://api.spotify.com/v1/me/player/currently-playing',{headers:{Authorization:`Bearer ${token}`}});
  if (res.status===204) return {connected:true,playing:false,track:null};
  if (res.status===429) return {connected:true,rateLimited:true,retryAfter:Number(res.headers.get('retry-after')||'10')};
  if (res.status===401) return {connected:false,error:'Spotify session expired. Reconnect.'};
  if (!res.ok) return {connected:true,error:`Spotify returned ${res.status}. Check your app access and account permissions.`};
  const data=await res.json();
  const item=data.item;
  return {connected:true,playing:!!data.is_playing,progressMs:data.progress_ms||0,observedAt:Date.now(),
    track:item?{id:item.id,name:item.name,artists:(item.artists||[]).map(a=>a.name).join(', '),album:item.album?.name||'',image:item.album?.images?.[0]?.url||'',durationMs:item.duration_ms||0}:null};
});

// Lyrics are retrieved only from LRCLIB when the user opts in. LRCLIB is an
// independent community service, not a Spotify API or licensed Spotify lyrics feed.
const lyricCache = new Map();
ipcMain.handle('lookup-lyrics', async (_event, track) => {
  if (readSettings().autoLyrics !== true) return {status:'disabled'};
  const title=String(track?.name||'').slice(0,160), artist=String(track?.artists||'').split(',')[0].trim().slice(0,160);
  if (!title || !artist) return {status:'missing'};
  const duration=Math.round(Number(track.durationMs||0)/1000);
  const key=JSON.stringify([title,artist,duration]);
  if (lyricCache.has(key)) return lyricCache.get(key);
  const url=new URL('https://lrclib.net/api/search');url.searchParams.set('track_name',title);url.searchParams.set('artist_name',artist);
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
  try {
    const res=await fetch(url,{headers:{'User-Agent':'LumaLyrics/2.0 (personal desktop lyrics client)'},signal:controller.signal});
    if (res.status===429) return {status:'rateLimited'};
    if (!res.ok) return {status:'error',message:`Lyrics service returned ${res.status}`};
    const results=await res.json();
    if (!Array.isArray(results)) return {status:'missing'};
    const normalize=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
    const match=results.find(x=>x.syncedLyrics && normalize(x.trackName)===normalize(title) && normalize(x.artistName).includes(normalize(artist)) && (!duration || Math.abs(Number(x.duration||0)-duration)<=5));
    const result=match?{status:'found',text:match.syncedLyrics,source:'LRCLIB',name:match.trackName}:{status:'missing'};
    lyricCache.set(key,result);if(lyricCache.size>80)lyricCache.delete(lyricCache.keys().next().value);
    return result;
  } catch(e){return {status:'error',message:'Lyrics service unavailable. Import an LRC file instead.'};}
  finally{clearTimeout(timer);}
});

ipcMain.handle('control', async (_event, command) => {
  if (!['play','pause','next','previous'].includes(command)) throw new Error('Unsupported playback action.');
  const token=await accessToken();if(!token) throw new Error('Connect Spotify first.');
  const routes={play:['PUT','play'],pause:['PUT','pause'],next:['POST','next'],previous:['POST','previous']};
  const [method,route]=routes[command];
  const res=await fetch(`https://api.spotify.com/v1/me/player/${route}`,{method,headers:{Authorization:`Bearer ${token}`}});
  if(res.status===204)return {ok:true};
  if(res.status===403)throw new Error('Spotify denied playback control. Premium and suitable API permissions may be required. Reconnect Spotify after upgrading.');
  if(res.status===404)throw new Error('No active Spotify playback device. Start Spotify on your Mac first.');
  if(res.status===429)throw new Error('Spotify rate limit reached. Try again later.');
  throw new Error(`Spotify playback command failed (${res.status}).`);
});
