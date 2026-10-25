const $ = id => document.getElementById(id);
console.info('LumaLyrics 6.2 Cinematic Rebuild');
let entries=[],active=-1, demo=false, demoStarted=0, track=null, playing=false, progressMs=0, observedAt=0, durationMs=0, offset=0, connected=false, lastTrackId='', lastFetch=0, blockedUntil=0, autoLyrics=false, lyricRequest=0;
const demoTrack={id:'demo',name:'Afterglow',artists:'LumaLyrics Demo',album:'A quiet moment',image:'',durationMs:37000};
function parseLRC(text){const out=[];let globalOffset=0;for(const line of text.split(/\r?\n/)){const off=line.match(/^\[offset:([+-]?\d+)\]/i);if(off){globalOffset=Number(off[1]);continue;}const stamps=[...line.matchAll(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g)];if(!stamps.length)continue;const words=line.replace(/\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g,'').trim();if(!words)continue;for(const s of stamps){const fraction=s[3]?Number('0.'+s[3]):0;out.push({ms:Math.max(0,Math.round((Number(s[1])*60+Number(s[2])+fraction)*1000-globalOffset)),text:words});}}return out.sort((a,b)=>a.ms-b.ms);}
function setLyrics(data){$('lyricsSource').textContent=data.source ? `Lyrics: ${data.source}` : `Imported: ${data.name||'LRC file'}`;entries=parseLRC(data.text);active=-1;$('lyricList').replaceChildren();if(!entries.length){const plain=String(data.text||'').trim();$('lyricList').replaceChildren();for(const line of plain.split(/\r?\n/).filter(Boolean)){const el=document.createElement('div');el.className='lyric plain-lyric';el.textContent=line;$('lyricList').appendChild(el);}if(!plain)$('lyricList').textContent='No lyrics available.';return;}for(const e of entries){const div=document.createElement('div');div.className='lyric';renderLyric(div,e);$('lyricList').appendChild(div);}prepareKinetic();updateLyrics(true);}
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

// Kinetic mode: LRCLIB line timestamps remain authoritative. Word positions
// inside a line are estimates unless actual enhanced LRC word stamps exist.
let kineticEnabled=true;
function prepareKinetic(){
  if(!kineticEnabled)return;
  const children=[...$('lyricList').children];
  children.forEach((el,i)=>{
    if(el.dataset.wordSync==='true'||!entries[i])return;
    const tokens=entries[i].text.trim().split(/\s+/).filter(Boolean);
    if(!tokens.length)return;
    el.replaceChildren();el.classList.add('kinetic-line');
    tokens.forEach((token,j)=>{const w=document.createElement('span');w.className='kinetic-word';w.textContent=token;w.dataset.index=String(j);el.appendChild(w);});
  });
}
function updateKinetic(ms){
  if(!kineticEnabled||active<0||!entries[active])return;
  const el=$('lyricList').children[active];if(!el)return;
  if(el.dataset.wordSync==='true'){
    el.querySelectorAll('.lyric-word').forEach(w=>{const on=Number(w.dataset.ms)<=ms;w.classList.toggle('revealed',on);w.classList.toggle('sung',on);});return;
  }
  if(!el.classList.contains('kinetic-line'))return;
  const tokens=[...el.querySelectorAll('.kinetic-word')];if(!tokens.length)return;
  const start=entries[active].ms;
  const next=entries[active+1]?.ms??Math.min(durationMs||start+3500,start+5000);
  const interval=Math.max(450,next-start);
  const at=Math.max(0,Math.min(tokens.length,Math.floor((ms-start)/interval*tokens.length)+1));
  tokens.forEach((w,i)=>{w.classList.toggle('revealed',i<at);w.classList.toggle('current',i===at-1);w.classList.toggle('past',i<at-1);});
}

function time(ms){const s=Math.max(0,Math.floor(ms/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function position(){return demo?Math.min(demoTrack.durationMs,Date.now()-demoStarted):(progressMs+(playing?Date.now()-observedAt:0));}
function updateLyrics(force=false){if(!entries.length)return;const ms=position()+offset*1000;let idx=-1;for(let i=0;i<entries.length;i++){if(entries[i].ms<=ms)idx=i;else break;}if(idx===active&&!force){updateKinetic(ms);return;}active=idx;const children=[...$('lyricList').children];children.forEach((el,i)=>{el.classList.toggle('active',i===idx);el.classList.toggle('near',Math.abs(i-idx)===1);});children.forEach((el,i)=>{if(i!==idx)el.querySelectorAll('.kinetic-word,.lyric-word').forEach(w=>{w.classList.toggle('revealed',i<idx);w.classList.remove('current');});});const target=children[Math.max(0,idx)]||children[0];if(target){const viewport=$('lyricList').parentElement;const shift=viewport.clientHeight*.43-(target.offsetTop+target.offsetHeight/2);$('lyricList').style.transform=`translateY(${shift}px)`;}updateKinetic(ms);}
let artworkGeneration=0;
function rgb(r,g,b){return `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;}
function extractArtworkPalette(img){
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,64,64);
  const data=ctx.getImageData(0,0,64,64).data;const bins=new Map();
  for(let i=0;i<data.length;i+=16){const r=data[i],g=data[i+1],b=data[i+2];if(data[i+3]<200)continue;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);if(max<22||max>245&&min>235)continue;
    const key=[r,g,b].map(v=>Math.min(5,Math.floor(v/43))).join(',');const item=bins.get(key)||{n:0,r:0,g:0,b:0};item.n++;item.r+=r;item.g+=g;item.b+=b;bins.set(key,item);
  }
  const candidates=[...bins.values()].map(v=>({r:v.r/v.n,g:v.g/v.n,b:v.b/v.n,n:v.n}));
  if(!candidates.length)return [{r:155,g:108,b:210},{r:246,g:157,b:112}];
  const sat=c=>{const mx=Math.max(c.r,c.g,c.b),mn=Math.min(c.r,c.g,c.b);return mx?(mx-mn)/mx:0;};
  candidates.sort((a,b)=>(b.n*(.4+sat(b)))-(a.n*(.4+sat(a))));
  const first=candidates[0];const second=candidates.find(c=>Math.hypot(c.r-first.r,c.g-first.g,c.b-first.b)>85)||candidates[1]||first;
  const lift=c=>{const m=Math.max(c.r,c.g,c.b);const factor=m<105?135/Math.max(m,1):1;return {r:Math.min(255,c.r*factor),g:Math.min(255,c.g*factor),b:Math.min(255,c.b*factor)};};
  return [lift(first),lift(second)];
}
function applyArtworkPalette(colors){
  const [a,b]=colors;const root=document.documentElement;
  root.style.setProperty('--scene-accent',rgb(a.r,a.g,a.b));root.style.setProperty('--scene-warm',rgb(b.r,b.g,b.b));
  root.style.setProperty('--luma-violet',rgb(a.r,a.g,a.b));root.style.setProperty('--luma-peach',rgb(b.r,b.g,b.b));
  root.style.setProperty('--album-glow',rgb(a.r,a.g,a.b));
  $('ambient').style.setProperty('--c1',rgb(a.r*.42,a.g*.42,a.b*.42));
  $('ambient').style.setProperty('--c2',rgb(b.r*.35,b.g*.35,b.b*.35));
}
function showTrack(t){
  if(!t)return;
  const generation=++artworkGeneration;
  document.documentElement.style.setProperty('--album-art',t.image ? `url("${String(t.image).replace(/[^a-zA-Z0-9:/?&=._%\-]/g,'')}")` : 'none');
  $('track').textContent=t.name;$('artist').textContent=t.artists;$('duration').textContent=time(t.durationMs);durationMs=t.durationMs;
  const cover=$('cover');if(t.image){cover.src=t.image;cover.hidden=false;document.querySelector('.album-placeholder').hidden=true;
    const sample=new Image();sample.crossOrigin='anonymous';sample.onload=()=>{if(generation!==artworkGeneration)return;try{applyArtworkPalette(extractArtworkPalette(sample));}catch(err){console.warn('Album palette unavailable',err);applyArtworkPalette([{r:174,g:116,b:221},{r:249,g:170,b:126}]);}};
    sample.onerror=()=>{if(generation===artworkGeneration)applyArtworkPalette([{r:174,g:116,b:221},{r:249,g:170,b:126}]);};sample.src=t.image;
  }else{cover.hidden=true;cover.removeAttribute('src');document.querySelector('.album-placeholder').hidden=false;applyArtworkPalette([{r:174,g:116,b:221},{r:249,g:170,b:126}]);}
}

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
$('savePreferences').onclick=async()=>{localStorage.setItem('lumaKinetic',String($('kinetic').checked));const prefs=await window.luma.preferences({autoLyrics:$('autoLyrics').checked,ambient:$('ambientEnabled').checked,theme:$('theme').value,font:$('font').value,glow:Number($('glow').value),living:$('living').checked,kinetic:$('kinetic').checked});await window.luma.floating($('floating').checked);applyPrefs(prefs);if(entries.length){setLyrics({text:entries.map(e=>`[${String(Math.floor(e.ms/60000)).padStart(2,'0')}:${String(Math.floor(e.ms%60000/1000)).padStart(2,'0')}.${String(e.ms%1000).padStart(3,'0')}]${e.text}`).join('\n'),source:'Current timed lyrics'});} $('message').textContent='Preferences saved.';if(autoLyrics&&track&&entries.length===0)lookupLyrics(track);};
function applyPrefs(s){autoLyrics=!!s.autoLyrics;document.body.dataset.theme=s.theme||'glass';document.body.classList.toggle('no-ambient',s.ambient===false);$('autoLyrics').checked=autoLyrics;$('ambientEnabled').checked=s.ambient!==false;$('theme').value=s.theme||'glass';$('font').value=s.font||'apple';document.body.dataset.font=s.font||'apple';$('glow').value=s.glow??75;document.documentElement.style.setProperty('--glow',String((s.glow??75)/100));$('living').checked=s.living!==false;kineticEnabled=true;localStorage.setItem('lumaKinetic','true');const kineticBox=$('kinetic');if(kineticBox)kineticBox.checked=kineticEnabled;$('floating').checked=!!s.floating;}
window.luma.settings().then(s=>{applyPrefs(s);if(connected&&track&&autoLyrics)lookupLyrics(track);});

// Living artwork: subtle parallax and light bloom from the actual cover, not generated footage.
$('album').onclick=()=>{if(!$('living').checked)return;$('album').classList.toggle('living');};
$('album').classList.add('living');
$('volume').onchange=async e=>{try{await window.luma.control('volume',Number(e.target.value));$('controlMessage').textContent='';}catch(err){$('controlMessage').textContent=err.message;}};
let lastVolume=60;
$('mute').onclick=async()=>{try{const v=Number($('volume').value);if(v>0){lastVolume=v;$('volume').value=0;await window.luma.control('volume',0);}else{$('volume').value=lastVolume;await window.luma.control('volume',lastVolume);}}catch(err){$('controlMessage').textContent=err.message;}};
$('seekBar').onclick=async e=>{if(!durationMs||demo)return;const r=e.currentTarget.getBoundingClientRect();try{await window.luma.control('seek',durationMs*Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)));setTimeout(poll,500);}catch(err){$('controlMessage').textContent=err.message;}};
