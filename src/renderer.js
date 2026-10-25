const $ = id => document.getElementById(id);
let entries=[],active=-1, demo=false, demoStarted=0, track=null, playing=false, progressMs=0, observedAt=0, durationMs=0, offset=0, connected=false, lastTrackId='', lastFetch=0, blockedUntil=0, autoLyrics=false, lyricRequest=0;
const demoTrack={id:'demo',name:'Afterglow',artists:'LumaLyrics Demo',album:'A quiet moment',image:'',durationMs:37000};
function parseLRC(text){const out=[];let globalOffset=0;for(const line of text.split(/\r?\n/)){const off=line.match(/^\[offset:([+-]?\d+)\]/i);if(off){globalOffset=Number(off[1]);continue;}const stamps=[...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];if(!stamps.length)continue;const words=line.replace(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g,'').trim();if(!words)continue;for(const s of stamps){const fraction=s[3]?Number('0.'+s[3]):0;out.push({ms:Math.max(0,Math.round((Number(s[1])*60+Number(s[2])+fraction)*1000-globalOffset)),text:words});}}return out.sort((a,b)=>a.ms-b.ms);}
function setLyrics(data){$('lyricsSource').textContent=data.source ? `Lyrics: ${data.source}` : `Imported: ${data.name||'LRC file'}`;entries=parseLRC(data.text);active=-1;$('lyricList').replaceChildren();if(!entries.length){$('lyricList').textContent='No timestamped lyrics found. Use lines like [00:12.50]Your lyric';return;}for(const e of entries){const div=document.createElement('div');div.className='lyric';div.textContent=e.text;$('lyricList').appendChild(div);}updateLyrics(true);}
function time(ms){const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function position(){return demo?Math.min(demoTrack.durationMs,Date.now()-demoStarted):(progressMs+(playing?Date.now()-observedAt:0));}
function updateLyrics(force=false){if(!entries.length)return;const ms=position()+offset*1000;let idx=-1;for(let i=0;i<entries.length;i++){if(entries[i].ms<=ms)idx=i;else break;}if(idx===active&&!force)return;active=idx;const children=[...$('lyricList').children];children.forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('near',Math.abs(i-idx)===1);});const target=children[Math.max(0,idx)]||children[0];if(target){const viewport=$('lyricList').parentElement;const shift=viewport.clientHeight*.43-(target.offsetTop+target.offsetHeight/2);$('lyricList').style.transform=`translateY(${shift}px)`;}}
function showTrack(t){if(!t)return;$('track').textContent=t.name;$('artist').textContent=t.artists;$('duration').textContent=time(t.durationMs);durationMs=t.durationMs;const cover=$('cover');if(t.image){cover.src=t.image;cover.hidden=false;document.querySelector('.album-placeholder').hidden=true;}else{cover.hidden=true;cover.removeAttribute('src');document.querySelector('.album-placeholder').hidden=false;}const hues=Array.from((t.id||t.name)).reduce((n,c)=>n+c.charCodeAt(0),0);$('ambient').style.setProperty('--c1',`hsl(${hues%360} 33% 31%)`);$('ambient').style.setProperty('--c2',`hsl(${(hues+82)%360} 36% 23%)`);}
function tick(){const pos=position();$('elapsed').textContent=time(pos);$('progressFill').style.width=(durationMs?Math.min(100,100*pos/durationMs):0)+'%';updateLyrics();requestAnimationFrame(tick);}requestAnimationFrame(tick);
async function poll(){if(demo||!connected||Date.now()<blockedUntil)return;try{const data=await window.luma.playback();if(!data.connected){connected=false;$('status').textContent='Spotify disconnected';return;}if(data.rateLimited){blockedUntil=Date.now()+Math.max(10,data.retryAfter)*1000;$('status').textContent='Spotify rate limited';return;}if(data.error){$('status').textContent=data.error;return;}if(!data.track){$('status').textContent='Nothing playing on Spotify';playing=false;return;}const changed=data.track.id!==lastTrackId;if(changed){lastTrackId=data.track.id;showTrack(data.track);entries=[];active=-1;$('lyricList').replaceChildren();$('lyricList').style.transform='none';$('lyricList').textContent='Import a timed .lrc file for this song.';$('lyricsSource').textContent='';if(autoLyrics)lookupLyrics(data.track);}track=data.track;progressMs=data.progressMs;observedAt=data.observedAt;playing=data.playing;$('playpause').textContent=playing?'⏸':'▶';$('status').textContent=playing?'Listening on Spotify':'Spotify paused';}catch(e){$('status').textContent='Spotify unavailable';}}
setInterval(poll,4500);
function error(e){$('message').textContent=e?.message||String(e);}
$('settingsButton').onclick=()=>{$('settings').hidden=false;};$('closeSettings').onclick=()=>{$('settings').hidden=true;};
$('save').onclick=async()=>{try{await window.luma.setClientId($('clientId').value);$('message').textContent='Client ID saved.';}catch(e){error(e);}};
$('connect').onclick=async()=>{try{await window.luma.setClientId($('clientId').value);await window.luma.connect();$('message').textContent='Complete sign-in in your browser.';}catch(e){error(e);}};
$('disconnect').onclick=async()=>{await window.luma.disconnect();connected=false;$('status').textContent='Disconnected';$('message').textContent='Disconnected.';};
$('import').onclick=async()=>{try{const data=await window.luma.importLyrics();if(data){++lyricRequest;setLyrics(data);}}catch(e){alert(e.message);}};
$('demo').onclick=async()=>{++lyricRequest;demo=true;demoStarted=Date.now();lastTrackId='demo';showTrack(demoTrack);$('status').textContent='Demo mode';setLyrics(await window.luma.sampleLyrics());};
$('fullscreen').onclick=()=>window.luma.toggleFullscreen();
$('offset').oninput=e=>{offset=Number(e.target.value);$('offsetValue').textContent=offset.toFixed(1)+'s';updateLyrics(true);};
window.luma.onAuth(state=>{connected=state.connected;if(state.error)$('message').textContent=state.error;else if(connected){demo=false;$('message').textContent='Connected! Play a song in Spotify.';$('settings').hidden=true;poll();}});
(async()=>{const s=await window.luma.settings();$('clientId').value=s.clientId;$('redirect').textContent=s.redirect;connected=s.connected;if(connected){$('status').textContent='Checking Spotify…';poll();}else{$('status').textContent='Demo mode';}})();

async function lookupLyrics(t){
  const request=++lyricRequest;
  $('lyricsSource').textContent='Searching LRCLIB for synced lyrics…';
  try{const data=await window.luma.lookupLyrics(t);if(request!==lyricRequest||lastTrackId!==t.id)return;
    if(data.status==='found'){setLyrics({text:data.text,source:'LRCLIB'});}
    else $('lyricsSource').textContent=data.status==='missing'?'No matching synced lyrics found. Import an LRC file.':data.status==='rateLimited'?'Lyrics service rate limited. Try later.':data.message||'Automatic lyrics unavailable.';
  }catch(e){if(request===lyricRequest)$('lyricsSource').textContent='Lyrics lookup unavailable.';}
}
for(const [id,command] of [['previous','previous'],['playpause','toggle'],['next','next']]){
  $(id).onclick=async()=>{if(demo){$('controlMessage').textContent='Playback controls require Spotify. Connect in Settings.';return;}
    try{const action=command==='toggle'?(playing?'pause':'play'):command;await window.luma.control(action);$('controlMessage').textContent='';setTimeout(poll,650);}
    catch(e){$('controlMessage').textContent=e.message||String(e);}};
}
$('savePreferences').onclick=async()=>{const prefs=await window.luma.preferences({autoLyrics:$('autoLyrics').checked,ambient:$('ambientEnabled').checked,theme:$('theme').value});applyPrefs(prefs);$('message').textContent='Preferences saved.';if(autoLyrics&&track&&entries.length===0)lookupLyrics(track);};
function applyPrefs(s){autoLyrics=!!s.autoLyrics;document.body.dataset.theme=s.theme||'glass';document.body.classList.toggle('no-ambient',s.ambient===false);$('autoLyrics').checked=autoLyrics;$('ambientEnabled').checked=s.ambient!==false;$('theme').value=s.theme||'glass';}
window.luma.settings().then(applyPrefs);
