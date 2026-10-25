const $ = id => document.getElementById(id);
let entries=[],active=-1, demo=false, demoStarted=0, track=null, playing=false, progressMs=0, observedAt=0, durationMs=0, offset=0, connected=false, lastTrackId='', lastFetch=0, blockedUntil=0, autoLyrics=false, lyricRequest=0;
const demoTrack={id:'demo',name:'Afterglow',artists:'LumaLyrics Demo',album:'A quiet moment',image:'',durationMs:37000};
function parseLRC(text){const out=[];let globalOffset=0;for(const line of text.split(/\r?\n/)){const off=line.match(/^\[offset:([+-]?\d+)\]/i);if(off){globalOffset=Number(off[1]);continue;}const stamps=[...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];if(!stamps.length)continue;const words=line.replace(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g,'').trim();if(!words)continue;for(const s of stamps){const fraction=s[3]?Number('0.'+s[3]):0;out.push({ms:Math.max(0,Math.round((Number(s[1])*60+Number(s[2])+fraction)*1000-globalOffset)),text:words});}}return out.sort((a,b)=>a.ms-b.ms);}
function setLyrics(data){$('lyricsSource').textContent=data.source ? `Lyrics: ${data.source}` : `Imported: ${data.name||'LRC file'}`;entries=parseLRC(data.text);active=-1;$('lyricList').replaceChildren();if(!entries.length){const plain=String(data.text||'').trim();$('lyricList').replaceChildren();for(const line of plain.split(/\r?\n/).filter(Boolean)){const el=document.createElement('div');el.className='lyric plain-lyric';el.textContent=line;$('lyricList').appendChild(el);}if(!plain)$('lyricList').textContent='No lyrics available.';return;}for(const e of entries){const div=document.createElement('div');div.className='lyric';renderLyric(div,e);$('lyricList').appendChild(div);}updateLyrics(true);}
// Enhanced LRC word markers: <mm:ss.xx>word. Ordinary LRC remains line-synchronised.
function renderLyric(el,e){
  const matches=[...e.text.matchAll(/<(\d+):(\d{2})(?:[.:](\d{1,3}))?>/g)];
  if(!matches.length){el.textContent=e.text;return;}
  el.dataset.wordSync='true';
  for(let i=0;i<matches.length;i++){
    const m=matches[i],end=matches[i+1]?.index??e.text.length;
    const span=document.createElement('span');span.className='lyric-word';
    span.dataset.ms=Math.round((Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0')))*1000);
    span.textContent=e.text.slice(m.index+m[0].length,end);el.appendChild(span);
  }
}
function time(ms){const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function position(){return demo?Math.min(demoTrack.durationMs,Date.now()-demoStarted):(progressMs+(playing?Date.now()-observedAt:0));}
function updateLyrics(force=false){if(!entries.length)return;const ms=position()+offset*1000;let idx=-1;for(let i=0;i<entries.length;i++){if(entries[i].ms<=ms)idx=i;else break;}document.querySelectorAll('.lyric.active .lyric-word').forEach(w=>w.classList.toggle('sung',Number(w.dataset.ms)<=ms));if(idx===active&&!force)return;active=idx;const children=[...$('lyricList').children];children.forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('near',Math.abs(i-idx)===1);});const target=children[Math.max(0,idx)]||children[0];if(target){const viewport=$('lyricList').parentElement;const shift=viewport.clientHeight*.43-(target.offsetTop+target.offsetHeight/2);$('lyricList').style.transform=`translateY(${shift}px)`;}}
function showTrack(t){if(!t)return;$('track').textContent=t.name;$('artist').textContent=t.artists;$('duration').textContent=time(t.durationMs);durationMs=t.durationMs;const cover=$('cover');if(t.image){cover.src=t.image;cover.hidden=false;document.querySelector('.album-placeholder').hidden=true;}else{cover.hidden=true;cover.removeAttribute('src');document.querySelector('.album-placeholder').hidden=false;}const hues=Array.from((t.id||t.name)).reduce((n,c)=>n+c.charCodeAt(0),0);$('ambient').style.setProperty('--c1',`hsl(${hues%360} 33% 31%)`);$('ambient').style.setProperty('--c2',`hsl(${(hues+82)%360} 36% 23%)`);document.documentElement.style.setProperty('--scene-accent',`hsl(${(hues+18)%360} 56% 73%)`);document.documentElement.style.setProperty('--scene-warm',`hsl(${(hues+310)%360} 44% 32%)`);}
function tick(){const pos=position();$('elapsed').textContent=time(pos);$('progressFill').style.width=(durationMs?Math.min(100,100*pos/durationMs):0)+'%';updateLyrics();requestAnimationFrame(tick);}requestAnimationFrame(tick);
async function poll(){if(demo||!connected||Date.now()<blockedUntil)return;try{const data=await window.luma.playback();if(!data.connected){connected=false;$('status').textContent='Spotify disconnected';return;}if(data.rateLimited){blockedUntil=Date.now()+Math.max(10,data.retryAfter)*1000;$('status').textContent='Spotify rate limited';return;}if(data.error){$('status').textContent=data.error;return;}if(!data.track){$('status').textContent='Nothing playing on Spotify';playing=false;return;}const changed=data.track.id!==lastTrackId;if(changed){lastTrackId=data.track.id;showTrack(data.track);entries=[];active=-1;$('lyricList').replaceChildren();$('lyricList').style.transform='none';$('lyricList').textContent='Finding lyrics automatically…';$('lyricsSource').textContent='';if(autoLyrics)lookupLyrics(data.track);else $('lyricList').textContent='Enable Automatic Lyrics in Settings.';}track=data.track;progressMs=data.progressMs;observedAt=data.observedAt;playing=data.playing;$('playpause').textContent=playing?'⏸':'▶';$('status').textContent=playing?'Listening on Spotify':'Spotify paused';}catch(e){$('status').textContent='Spotify unavailable';}}
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
(async()=>{const s=await window.luma.settings();applyPrefs(s);$('clientId').value=s.clientId;$('redirect').textContent=s.redirect;connected=s.connected;if(connected){$('status').textContent='Checking Spotify…';poll();}else{$('status').textContent='Demo mode';}})();

async function lookupLyrics(t){
  const request=++lyricRequest;
  $('lyricsSource').textContent='Searching LRCLIB for synced lyrics…';
  try{const data=await window.luma.lookupLyrics(t);if(request!==lyricRequest||lastTrackId!==t.id)return;
    if(data.status==='found'){setLyrics({text:data.text,source:data.synced?'LRCLIB · timed lines':'LRCLIB · plain lyrics'});}
    else { $('lyricList').textContent='Lyrics unavailable for this track.'; $('lyricsSource').textContent=data.status==='missing'?'No lyrics found for this song on LRCLIB.':data.status==='rateLimited'?'Lyrics service rate limited. Try later.':data.message||'Automatic lyrics unavailable.';}
  }catch(e){if(request===lyricRequest){$('lyricsSource').textContent='Lyrics lookup unavailable.';$('lyricList').textContent='Could not reach lyrics provider.';}}
}
for(const [id,command] of [['previous','previous'],['playpause','toggle'],['next','next']]){
  $(id).onclick=async()=>{if(demo){$('controlMessage').textContent='Playback controls require Spotify. Connect in Settings.';return;}
    try{const action=command==='toggle'?(playing?'pause':'play'):command;await window.luma.control(action);$('controlMessage').textContent='';setTimeout(poll,650);}
    catch(e){$('controlMessage').textContent=e.message||String(e);}};
}
$('savePreferences').onclick=async()=>{const prefs=await window.luma.preferences({autoLyrics:$('autoLyrics').checked,ambient:$('ambientEnabled').checked,theme:$('theme').value,font:$('font').value,glow:Number($('glow').value),living:$('living').checked});await window.luma.floating($('floating').checked);applyPrefs(prefs);$('message').textContent='Preferences saved.';if(autoLyrics&&track&&entries.length===0)lookupLyrics(track);};
function applyPrefs(s){autoLyrics=!!s.autoLyrics;document.body.dataset.theme=s.theme||'glass';document.body.classList.toggle('no-ambient',s.ambient===false);$('autoLyrics').checked=autoLyrics;$('ambientEnabled').checked=s.ambient!==false;$('theme').value=s.theme||'glass';$('font').value=s.font||'apple';document.body.dataset.font=s.font||'apple';$('glow').value=s.glow??75;document.documentElement.style.setProperty('--glow',String((s.glow??75)/100));$('living').checked=s.living!==false;$('floating').checked=!!s.floating;}
window.luma.settings().then(s=>{applyPrefs(s);if(connected&&track&&autoLyrics)lookupLyrics(track);});

// Living artwork: subtle parallax and light bloom from the actual cover, not generated footage.
$('album').onclick=()=>{if(!$('living').checked)return;$('album').classList.toggle('living');};
$('album').classList.add('living');
$('volume').onchange=async e=>{try{await window.luma.control('volume',Number(e.target.value));$('controlMessage').textContent='';}catch(err){$('controlMessage').textContent=err.message;}};
let lastVolume=60;
$('mute').onclick=async()=>{try{const v=Number($('volume').value);if(v>0){lastVolume=v;$('volume').value=0;await window.luma.control('volume',0);}else{$('volume').value=lastVolume;await window.luma.control('volume',lastVolume);}}catch(err){$('controlMessage').textContent=err.message;}};
$('seekBar').onclick=async e=>{if(!durationMs||demo)return;const r=e.currentTarget.getBoundingClientRect();try{await window.luma.control('seek',durationMs*Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)));setTimeout(poll,500);}catch(err){$('controlMessage').textContent=err.message;}};
