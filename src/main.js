const {app, BrowserWindow, ipcMain, dialog, shell, safeStorage} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

const PORT = 43821;
const REDIRECT = `http://127.0.0.1:${PORT}/callback`;
const SCOPES = 'user-read-currently-playing user-read-playback-state';
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
ipcMain.handle('settings', () => ({clientId: readSettings().clientId || '', connected: !!tokens, redirect: REDIRECT}));
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
