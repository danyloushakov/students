const $=id=>document.getElementById(id);
let arrangement=null, liveCtx=null, master=null, timers=[], playing=false;
const styleCfg={
 acoustic:{bpm:98, kick:[0,8],snare:[4,12],hand:[3,7,11,15],chords:[0,4,8,12],scale:[0,2,3,5,7,9,10]},
 world:{bpm:108,kick:[0,10],snare:[6,14],hand:[0,3,6,8,11,14],chords:[0,6,10,14],scale:[0,2,3,5,7,8,10]},
 funk:{bpm:112,kick:[0,6,10],snare:[4,12],hand:[2,7,10,15],chords:[0,3,6,9,12,15],scale:[0,2,4,5,7,9,10]},
 latin:{bpm:118,kick:[0,6,10],snare:[4,12],hand:[0,3,5,8,11,13],chords:[0,4,7,11,14],scale:[0,2,4,7,9]},
 ambient:{bpm:76,kick:[0,8],snare:[],hand:[6,14],chords:[0,8],scale:[0,2,4,5,7,9,11]},
 rock:{bpm:124,kick:[0,4,8,12],snare:[4,12],hand:[2,6,10,14],chords:[0,4,8,12],scale:[0,2,4,5,7,9,11]},
 electronic:{bpm:124,kick:[0,4,8,12],snare:[4,12],hand:[2,6,10,14],chords:[0,4,8,12],scale:[0,1,3,5,7,8,10]}
};
const rootMap={C:60,D:62,E:64,F:65,G:67,A:69,B:71,Am:57,Dm:50,Em:52,Gm:55};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rand(){return Math.random()}
function makeArrangement(){
 const style=$('style').value,cfg=styleCfg[style],bars=+$('bars').value,bpm=+$('tempo').value,density=+$('density').value/100,variation=+$('variation').value/100,root=rootMap[$('key').value];
 const tracks={drums:$('drums').checked,hand:$('hand').checked,guitar:$('guitar').checked,bass:$('bass').checked,melody:$('melody').checked};
 const events=[], chordRoots=[0,5,7,3], stepSec=60/bpm/4, total=bars*16;
 const add=(type,step,note=0,vel=.7,dur=.2)=>events.push({type,step,note,vel,dur});
 for(let s=0;s<total;s++){
  const p=s%16,bar=Math.floor(s/16),chord=chordRoots[bar%4];
  if(tracks.drums){
   if(cfg.kick.includes(p)&&rand()<.9)add('kick',s,0,.72+rand()*.2);
   if(cfg.snare.includes(p)&&rand()<.9)add('snare',s,0,.55+rand()*.25);
   if((p%2===1||style==='ambient'&&p===6)&&rand()<density*.8)add('shaker',s,0,.18+rand()*.25);
   if(p===15&&rand()<variation*.5)add('snare',s,0,.25);
  }
  if(tracks.hand&&cfg.hand.includes(p)&&rand()<density)add('djembe',s,0,.35+rand()*.5);
  if(tracks.guitar&&cfg.chords.includes(p)&&rand()<.96){
   const strum=style==='ambient'?1:4;
   for(let k=0;k<strum;k++)add('guitar',s+(k*.12),root+cfg.scale[(chord+k*2)%cfg.scale.length]+(k%2?12:0),.20+rand()*.18,.42);
  }
  if(tracks.bass&&(p===0||p===8||rand()<density*.12)){
   const degree=[0,3,4,2][bar%4];add('bass',s,root-12+cfg.scale[degree]+(rand()<variation*.2?12:0),.48+rand()*.2,.34);
  }
  if(tracks.melody&&rand()<density*.13&&p%2===0){
   const degree=cfg.scale[Math.floor(rand()*cfg.scale.length)];add('keys',s,root+12+degree,.20+rand()*.25,.8);
  }
 }
 events.sort((a,b)=>a.step-b.step);
 return {style,bpm,bars,root,events,tracks,stepSec,total};
}
function setup(ctx){const g=ctx.createGain();g.gain.value=.78;g.connect(ctx.destination);return g}
function tone(ctx,dest,freq,start,dur,vol,wave='sine'){
 const o=ctx.createOscillator(),g=ctx.createGain();o.type=wave;o.frequency.setValueAtTime(freq,start);g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),start+.012);g.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(g);g.connect(dest);o.start(start);o.stop(start+dur+.03);
}
function noise(ctx,dest,start,dur,vol,filterType='highpass',freq=1500){
 const n=Math.max(1,Math.floor(ctx.sampleRate*dur)),buf=ctx.createBuffer(1,n,ctx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=Math.random()*2-1;
 const src=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain();src.buffer=buf;f.type=filterType;f.frequency.value=freq;g.gain.setValueAtTime(vol,start);g.gain.exponentialRampToValueAtTime(.0001,start+dur);src.connect(f);f.connect(g);g.connect(dest);src.start(start);src.stop(start+dur);
}
function playEvent(ctx,dest,e,t){
 const f=440*Math.pow(2,(e.note-69)/12);
 switch(e.type){
 case'kick':tone(ctx,dest,120,t,.20,e.vel*.9,'sine');break;
 case'snare':noise(ctx,dest,t,.16,e.vel*.32,'bandpass',1800);tone(ctx,dest,190,t,.10,e.vel*.18,'triangle');break;
 case'shaker':noise(ctx,dest,t,.045,e.vel*.22,'highpass',5000);break;
 case'djembe':tone(ctx,dest, e.vel>.65?105:155,t,.19,e.vel*.65,'sine');noise(ctx,dest,t,.055,e.vel*.12,'bandpass',900);break;
 case'guitar':tone(ctx,dest,f,t,.34,e.vel*.28,'triangle');tone(ctx,dest,f*2.01,t,.22,e.vel*.07,'sine');break;
 case'bass':tone(ctx,dest,f,t,e.dur,e.vel*.45,'triangle');break;
 case'keys':tone(ctx,dest,f,t,e.dur,e.vel*.16,'sine');tone(ctx,dest,f*2,t,e.dur*.7,e.vel*.045,'sine');break;
 }
}
function stop(){timers.forEach(clearTimeout);timers=[];if(liveCtx){liveCtx.close();liveCtx=null}playing=false;$('play').disabled=!arrangement;$('stop').disabled=true;$('play').textContent='▶ Прослухати';$('status').textContent='Відтворення зупинено.'}
async function play(){
 if(!arrangement)return;stop();liveCtx=new (window.AudioContext||window.webkitAudioContext)();master=setup(liveCtx);await liveCtx.resume();
 const start=liveCtx.currentTime+.12, a=arrangement;
 a.events.forEach(e=>playEvent(liveCtx,master,e,start+e.step*a.stepSec));
 playing=true;$('play').disabled=true;$('stop').disabled=false;$('status').textContent='Відтворюється композиція…';
 const ms=(a.total*a.stepSec+.5)*1000;timers.push(setTimeout(()=>{if(liveCtx){liveCtx.close();liveCtx=null}playing=false;$('play').disabled=false;$('stop').disabled=true;$('status').textContent='Композиція завершена.'},ms));
}
function wavBlob(buffer){
 const channels=buffer.numberOfChannels,len=buffer.length,rate=buffer.sampleRate,bytes=2,dataLen=len*channels*bytes,ab=new ArrayBuffer(44+dataLen),v=new DataView(ab);
 const str=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
 str(0,'RIFF');v.setUint32(4,36+dataLen,true);str(8,'WAVE');str(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,rate,true);v.setUint32(28,rate*channels*bytes,true);v.setUint16(32,channels*bytes,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,dataLen,true);
 let off=44;for(let i=0;i<len;i++)for(let c=0;c<channels;c++){let s=clamp(buffer.getChannelData(c)[i],-1,1);v.setInt16(off,s<0?s*32768:s*32767,true);off+=2}
 return new Blob([ab],{type:'audio/wav'});
}
async function exportWav(){
 const a=arrangement,sr=44100,duration=a.total*a.stepSec+1,ctx=new OfflineAudioContext(2,Math.ceil(sr*duration),sr),dest=setup(ctx);
 a.events.forEach(e=>playEvent(ctx,dest,e,.05+e.step*a.stepSec));
 $('status').textContent='Рендер WAV…';const buf=await ctx.startRendering(),blob=wavBlob(buf);download(blob,'music-generator.wav');$('status').textContent='WAV успішно створено.';
}
function vlq(n){let b=n&127;while((n>>=7)){b<<=8;b|=((n&127)|128)}let a=[];while(true){a.push(b&255);if(b&128)b>>=8;else break}return a}
function exportMidi(){
 const a=arrangement,ppq=480,ticksPerStep=ppq/4,tracks=[];
 const names={kick:36,snare:38,shaker:42,djembe:60,guitar:64,bass:40,keys:72};
 for(const type of ['kick','snare','shaker','djembe','guitar','bass','keys']){
  const ev=a.events.filter(e=>e.type===type),bytes=[0,0xff,3,...Array.from(type).map(c=>c.charCodeAt(0))],midiEvents=[];
  ev.forEach(e=>{const tick=Math.round(e.step*ticksPerStep),note=type==='guitar'||type==='bass'||type==='keys'?Math.round(e.note):names[type],vel=Math.round(e.vel*115);midiEvents.push({tick,order:1,data:[0x90,note,vel]},{tick:tick+Math.max(24,Math.round((e.dur||.2)*ppq)),order:0,data:[0x80,note,0]})});
  midiEvents.sort((x,y)=>x.tick-y.tick||x.order-y.order);let last=0;
  midiEvents.forEach(ev=>{bytes.push(...vlq(ev.tick-last),...ev.data);last=ev.tick});
  bytes.push(0,0xff,0x2f,0);tracks.push(bytes);
 }
 const header=[...Array.from('MThd').map(c=>c.charCodeAt(0)),0,0,0,6,0,1,0,tracks.length,1,0xe0];
 const chunks=tracks.flatMap(t=>[...Array.from('MTrk').map(c=>c.charCodeAt(0)),(t.length>>>24)&255,(t.length>>>16)&255,(t.length>>>8)&255,t.length&255,...t]);
 download(new Blob([new Uint8Array([...header,...chunks])],{type:'audio/midi'}),'music-generator.mid');$('status').textContent='MIDI успішно створено.';
}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)}
$('generate').onclick=()=>{stop();arrangement=makeArrangement();$('play').disabled=false;$('wav').disabled=false;$('midi').disabled=false;$('status').textContent=`Готово: ${arrangement.bars} тактів · ${arrangement.bpm} BPM · ${arrangement.events.length} музичних подій.`};
$('play').onclick=play;$('stop').onclick=stop;$('wav').onclick=exportWav;$('midi').onclick=exportMidi;
$('tempo').oninput=e=>$('tempoVal').textContent=e.target.value+' BPM';
$('density').oninput=e=>$('densityVal').textContent=e.target.value+'%';
$('variation').oninput=e=>$('variationVal').textContent=e.target.value+'%';
$('randomize').onclick=()=>{$('tempo').value=55+Math.floor(rand()*106);$('tempo').oninput({target:$('tempo')});$('density').value=20+Math.floor(rand()*81);$('density').oninput({target:$('density')});$('variation').value=Math.floor(rand()*101);$('variation').oninput({target:$('variation')});$('style').selectedIndex=Math.floor(rand()*7)};
