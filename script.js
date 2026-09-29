(function(){
'use strict';
var KEY='estudo-horas:v1';
var BLOCK=36000; // 10h em segundos
var ELOS=[
  {n:'Ferro',c:'#5C5B57'},{n:'Bronze',c:'#8C5A2B'},{n:'Prata',c:'#9FA8B2'},{n:'Ouro',c:'#D4AF37'},
  {n:'Platina',c:'#2FB8AC'},{n:'Esmeralda',c:'#1FA971'},{n:'Diamante',c:'#4C8DDB'}
];
var SUBJ_COLORS=['#1FA89A','#E0709A','#8C7AE6','#E39B2D','#4C8DDB','#7CB342','#D64550','#5B6ABF','#A0693D','#C0459E'];
function tier(l){
  var maxDiv=ELOS.length*4;
  if(l<maxDiv){
    var e=Math.floor(l/4),d=(l%4)+1;
    return {name:ELOS[e].n+' '+d,c:ELOS[e].c,prism:false};
  }
  var top=l-maxDiv;
  if(top===0) return {name:'Mestre',c:'#9B59B6',prism:false};
  if(top===1) return {name:'Grão-Mestre',c:'#E5484D',prism:false};
  return {name:'Desafiante '+(top-1),c:'#F5D76E',prism:true};
}
function $(id){return document.getElementById(id);}
function pad(n){return String(n).padStart(2,'0');}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function ds(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function parseD(s){var p=s.split('-').map(Number);return new Date(p[0],p[1]-1,p[2]);}
function addDays(d,n){var x=new Date(d);x.setDate(x.getDate()+n);return x;}
function monday(d){var x=new Date(d);x.setDate(x.getDate()-((x.getDay()+6)%7));x.setHours(0,0,0,0);return x;}
function todayStr(){return ds(new Date());}
function fmtHM(secs){
  if(secs<60) return secs+'s';
  var m=Math.round(secs/60),h=Math.floor(m/60),mm=m%60;
  return h>0? h+'h '+pad(mm)+'min' : mm+'min';
}
function fmtClock(ms){
  var s=Math.floor(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
  return pad(h)+':'+pad(m)+':'+pad(s%60);
}
function lum(hex){
  var n=parseInt(hex.slice(1),16);
  function f(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4);}
  return .2126*f((n>>16)&255)+.7152*f((n>>8)&255)+.0722*f(n&255);
}
function ink(hex){
  var L=lum(hex),cw=1.05/(L+.05),cb=(L+.05)/(0.0075+.05);
  return cw>=cb?'#FFFFFF':'#14161F';
}
function okColor(c){return typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);}

/* ---------- Dados ---------- */
var memoryOnly=false;
function defaultSubjects(){return [{id:'sap',name:'AWS SAP',color:SUBJ_COLORS[0]},{id:'scs',name:'AWS SCS',color:SUBJ_COLORS[1]}];}
function validEntry(e){
  return e&&typeof e.id==='string'&&typeof e.subject==='string'&&typeof e.secs==='number'&&e.secs>0&&isFinite(e.secs)&&/^\d{4}-\d{2}-\d{2}$/.test(e.date||'');
}
function cleanSubjects(list){
  var out=[],seen={};
  (Array.isArray(list)?list:[]).forEach(function(s,i){
    if(!s||typeof s.id!=='string'||typeof s.name!=='string'||seen[s.id]) return;
    seen[s.id]=1;
    out.push({id:s.id,name:s.name.slice(0,40),color:okColor(s.color)?s.color:SUBJ_COLORS[i%SUBJ_COLORS.length]});
  });
  return out;
}
function normalize(d){
  d=(d&&typeof d==='object')?d:{};
  var subs=cleanSubjects(d.subjects); if(!subs.length) subs=defaultSubjects();
  var t=d.timer||{};
  return {
    v:1,subjects:subs,
    entries:(Array.isArray(d.entries)?d.entries:[]).filter(validEntry).map(function(e){return {id:e.id,subject:e.subject,date:e.date,secs:Math.round(e.secs),source:e.source==='timer'?'timer':'manual',ts:+e.ts||0};}),
    timer:{startedAt:+t.startedAt||null,accMs:Math.max(0,+t.accMs||0)},
    selected:typeof d.selected==='string'?d.selected:null
  };
}
function load(){
  try{var raw=localStorage.getItem(KEY); if(raw) return normalize(JSON.parse(raw));}
  catch(e){memoryOnly=true;}
  return normalize(null);
}
var S=load();
function save(){
  try{localStorage.setItem(KEY,JSON.stringify(S));}
  catch(e){memoryOnly=true;$('warn').hidden=false;}
}
if(memoryOnly) $('warn').hidden=false;
function subj(id){for(var i=0;i<S.subjects.length;i++){if(S.subjects[i].id===id) return S.subjects[i];}return null;}
if(!subj(S.selected)) S.selected=S.subjects[0].id;

function totals(){
  var t={all:0};
  S.subjects.forEach(function(s){t[s.id]=0;});
  S.entries.forEach(function(e){t.all+=e.secs; if(t[e.subject]!==undefined) t[e.subject]+=e.secs;});
  return t;
}

/* ---------- Barra de poder ---------- */
function setPower(el,secs){
  var lv=Math.floor(secs/BLOCK),frac=(secs%BLOCK)/BLOCK,t=tier(lv),prev=lv>0?tier(lv-1):null;
  el.style.setProperty('--c',t.c);
  if(prev) el.style.setProperty('--track','color-mix(in srgb, '+prev.c+' 38%, var(--surface2))');
  else el.style.removeProperty('--track');
  el.classList.toggle('prism',t.prism);
  el.firstElementChild.style.width=(frac*100).toFixed(2)+'%';
  el.setAttribute('aria-valuenow',Math.round(frac*100));
}
function nextNote(secs){
  var lv=Math.floor(secs/BLOCK),t=tier(lv),n=tier(lv+1),rem=BLOCK-(secs%BLOCK);
  return 'Nível '+lv+' · '+t.name+', faltam '+fmtHM(rem)+' para '+n.name;
}
function pulse(el){
  el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse');
  setTimeout(function(){el.classList.remove('pulse');},1100);
}

/* ---------- Estatísticas ---------- */
function streak(){
  var days={};S.entries.forEach(function(e){days[e.date]=1;});
  var d=new Date();d.setHours(0,0,0,0);
  if(!days[ds(d)]) d=addDays(d,-1);
  var n=0;while(days[ds(d)]){n++;d=addDays(d,-1);}
  return n;
}
function renderHero(){
  var t=totals(),secs=t.all,h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60);
  $('total').innerHTML='<span>'+h+'</span><small>h</small> <span>'+pad(m)+'</span><small>min</small>';
  var lv=Math.floor(secs/BLOCK),tr=tier(lv);
  var chip=$('rankChip');chip.textContent='Nível '+lv+' · '+tr.name;
  chip.style.background=tr.c;chip.style.color=ink(tr.c);
  $('gNote').textContent='Faltam '+fmtHM(BLOCK-(secs%BLOCK))+' para '+tier(lv+1).name;
  setPower($('gBar'),secs);
  var root=document.documentElement.style;root.setProperty('--acc',tr.c);root.setProperty('--acc-ink',ink(tr.c));
  var td=todayStr(),wk=ds(monday(new Date())),st=0,sw=0;
  S.entries.forEach(function(e){if(e.date===td) st+=e.secs; if(e.date>=wk) sw+=e.secs;});
  $('stToday').textContent=fmtHM(st);$('stWeek').textContent=fmtHM(sw);
  var sk=streak();$('stStreak').textContent=sk;
}

/* ---------- Matérias ---------- */
var subjKey='';
function renderSubjects(){
  var key=S.subjects.map(function(s){return s.id;}).join('|');
  var box=$('subjects');
  if(key!==subjKey){
    subjKey=key;
    box.innerHTML=S.subjects.map(function(s){
      return '<div class="subj" data-id="'+esc(s.id)+'"><div class="subj-head"><button type="button" class="dot dot-btn" data-dot="'+esc(s.id)+'" style="background:'+s.color+'" aria-label="Trocar cor de '+esc(s.name)+'"></button><span class="subj-name">'+esc(s.name)+'</span><span class="subj-time"></span><button type="button" class="subj-rm" data-rm="'+esc(s.id)+'" aria-label="Remover '+esc(s.name)+'">Remover</button></div>'+
        '<div class="swrow" id="sw-'+esc(s.id)+'" role="radiogroup" aria-label="Cor de '+esc(s.name)+'" hidden></div>'+
        '<div class="power" role="progressbar" aria-label="Progresso de '+esc(s.name)+'" aria-valuemin="0" aria-valuemax="100"><i></i></div><p class="note"></p></div>';
    }).join('');
    var p=$('picker');
    p.innerHTML=S.subjects.map(function(s){
      return '<button type="button" role="radio" data-id="'+esc(s.id)+'"><span class="dot" style="background:'+s.color+'"></span>'+esc(s.name)+'</button>';
    }).join('');
    $('legend').innerHTML=S.subjects.map(function(s){return '<span><span class="dot" style="background:'+s.color+'"></span>'+esc(s.name)+'</span>';}).join('');
  }
  var t=totals();
  S.subjects.forEach(function(s,i){
    var idSel='.subj[data-id="'+(window.CSS&&CSS.escape?CSS.escape(s.id):s.id)+'"]';
    var row=box.querySelector(idSel); if(!row) return;
    row.querySelector('.dot-btn').style.background=s.color;
    row.querySelector('.subj-time').textContent=fmtHM(t[s.id]);
    setPower(row.querySelector('.power'),t[s.id]);
    row.querySelector('.note').textContent=nextNote(t[s.id]);
    var pb=$('picker').querySelector('button[data-id="'+(window.CSS&&CSS.escape?CSS.escape(s.id):s.id)+'"] .dot');
    if(pb) pb.style.background=s.color;
    var lg=$('legend').children[i];
    if(lg){var ld=lg.querySelector('.dot');if(ld) ld.style.background=s.color;}
  });
  $('picker').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-checked',b.dataset.id===S.selected?'true':'false');});
}
$('picker').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b) return;
  S.selected=b.dataset.id;save();renderSubjects();
});
function cssId(id){return window.CSS&&CSS.escape?CSS.escape(id):id;}
function renderSwatches(el,chosen){
  el.innerHTML=SUBJ_COLORS.map(function(c){
    return '<button type="button" class="swatch" data-color="'+c+'" style="background:'+c+'" role="radio" aria-checked="'+(c===chosen)+'" aria-label="Cor '+c+'"></button>';
  }).join('');
}
function nextFreeColor(){
  var used={};S.subjects.forEach(function(s){used[s.color]=1;});
  return SUBJ_COLORS.filter(function(c){return !used[c];})[0]||SUBJ_COLORS[S.subjects.length%SUBJ_COLORS.length];
}
var newSubjColor=nextFreeColor();

$('addSubjBtn').onclick=function(){
  var form=$('addSubjForm');form.hidden=!form.hidden;
  if(!form.hidden){
    newSubjColor=nextFreeColor();
    renderSwatches($('newSubjColor'),newSubjColor);
    $('newSubjName').focus();
  }else{$('newSubjName').value='';}
};
$('newSubjColor').addEventListener('click',function(e){
  var b=e.target.closest('.swatch');if(!b) return;
  newSubjColor=b.dataset.color;
  $('newSubjColor').querySelectorAll('.swatch').forEach(function(x){x.setAttribute('aria-checked',x===b?'true':'false');});
});
$('newSubjCancel').onclick=function(){$('addSubjForm').hidden=true;$('newSubjName').value='';};
$('newSubjSave').onclick=function(){
  var name=($('newSubjName').value||'').trim();
  if(!name){setMsg('Digite o nome da nova matéria.',true);return;}
  if(name.length>40) name=name.slice(0,40);
  if(S.subjects.some(function(s){return s.name.toLowerCase()===name.toLowerCase();})){setMsg('Já existe uma matéria com esse nome.',true);return;}
  var id='s'+uid();
  S.subjects.push({id:id,name:name,color:newSubjColor});
  S.selected=id;
  save();renderAll();
  $('newSubjName').value='';$('addSubjForm').hidden=true;
  setMsg('Matéria "'+name+'" adicionada.');
};

var subjArmedId=null,subjArmedT=null;
function resetSubjBtn(){
  if(subjArmedId){
    var b=$('subjects').querySelector('[data-rm="'+cssId(subjArmedId)+'"]');
    if(b){b.textContent='Remover';b.classList.remove('armed');}
  }
  subjArmedId=null;
}
var openSwatchId=null;
$('subjects').addEventListener('click',function(e){
  var dot=e.target.closest('.dot-btn');
  if(dot){
    var did=dot.dataset.dot,panel=$('sw-'+cssId(did));
    if(openSwatchId&&openSwatchId!==did){var prev=$('sw-'+cssId(openSwatchId));if(prev) prev.hidden=true;}
    if(panel.hidden){renderSwatches(panel,subj(did).color);panel.hidden=false;openSwatchId=did;}
    else{panel.hidden=true;openSwatchId=null;}
    return;
  }
  var sw=e.target.closest('.swatch');
  if(sw){
    var row=sw.closest('.subj'),id=row&&row.dataset.id,s=id&&subj(id);
    if(s){s.color=sw.dataset.color;save();renderAll();}
    return;
  }
  var b=e.target.closest('[data-rm]');if(!b) return;
  var id=b.dataset.rm;
  if(subjArmedId!==id){
    resetSubjBtn();
    subjArmedId=id;b.textContent='Confirmar';b.classList.add('armed');
    clearTimeout(subjArmedT);subjArmedT=setTimeout(resetSubjBtn,3500);
    return;
  }
  clearTimeout(subjArmedT);subjArmedId=null;
  if(S.subjects.length<=1){toast('Mantenha ao menos uma matéria.');return;}
  S.subjects=S.subjects.filter(function(x){return x.id!==id;});
  if(S.selected===id) S.selected=S.subjects[0].id;
  save();renderAll();
});

/* ---------- Timer ---------- */
function elapsedMs(){return S.timer.accMs+(S.timer.startedAt?Date.now()-S.timer.startedAt:0);}
function tick(){
  var ms=elapsedMs(),c=fmtClock(ms);
  $('clock').textContent=c;
  document.title=S.timer.startedAt?c+' · Horas de estudo':'Horas de estudo';
}
function renderTimer(){
  var running=!!S.timer.startedAt,has=running||elapsedMs()>0;
  $('tStart').hidden=running;$('tStart').textContent=has?'Continuar':'Iniciar';
  $('tPause').hidden=!running;$('tSave').hidden=!has;$('tReset').hidden=!has;
  $('tStatus').textContent=running?'Cronometrando':(has?'Pausado':'Pronto para começar');
  tick();
}
$('tStart').onclick=function(){S.timer.startedAt=Date.now();save();renderTimer();};
$('tPause').onclick=function(){S.timer.accMs=elapsedMs();S.timer.startedAt=null;save();renderTimer();};
$('tSave').onclick=function(){
  var secs=Math.round(elapsedMs()/1000);
  if(secs<1){return;}
  S.timer={startedAt:null,accMs:0};
  addEntry(S.selected,todayStr(),secs,'timer');
  setMsg('Sessão salva em '+subj(S.selected).name+': '+fmtHM(secs)+'.');
  renderTimer();
};
var resetArmed=false,resetT;
$('tReset').onclick=function(){
  if(!resetArmed){
    resetArmed=true;$('tReset').textContent='Confirmar descarte';$('tReset').classList.add('warn');
    resetT=setTimeout(disarmReset,3500);return;
  }
  disarmReset();S.timer={startedAt:null,accMs:0};save();renderTimer();
};
function disarmReset(){resetArmed=false;clearTimeout(resetT);$('tReset').textContent='Descartar';$('tReset').classList.remove('warn');}
setInterval(tick,250);
document.addEventListener('visibilitychange',tick);

/* ---------- Abas de registro ---------- */
document.querySelectorAll('[data-tab]').forEach(function(b){
  b.addEventListener('click',function(){
    var manual=b.dataset.tab==='manual';
    $('tabTimer').setAttribute('aria-selected',!manual);$('tabManual').setAttribute('aria-selected',manual);
    $('pTimer').hidden=manual;$('pManual').hidden=!manual;setMsg('');
  });
});
function setMsg(t,err){var m=$('msg');m.textContent=t||'';m.classList.toggle('err',!!err);}
$('mDate').value=todayStr();$('mDate').max=todayStr();
$('mAdd').onclick=function(){
  var d=$('mDate').value,h=parseInt($('mH').value||'0',10),m=parseInt($('mM').value||'0',10);
  if(!d){setMsg('Escolha a data do estudo.',true);return;}
  if(d>todayStr()){setMsg('A data não pode ser no futuro.',true);return;}
  if(isNaN(h)||isNaN(m)||h<0||m<0||h>24||m>59){setMsg('Use de 0 a 24 horas e de 0 a 59 minutos.',true);return;}
  var secs=h*3600+m*60;
  if(secs<=0){setMsg('Informe pelo menos 1 minuto.',true);return;}
  addEntry(S.selected,d,secs,'manual');
  $('mH').value='';$('mM').value='';
  setMsg('Adicionado em '+subj(S.selected).name+': '+fmtHM(secs)+'.');
};

/* ---------- Entradas ---------- */
var toastT;
function toast(msg){var t=$('toast');t.textContent=msg;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show');},5200);}
function addEntry(subject,date,secs,source){
  var before=totals();
  S.entries.push({id:uid(),subject:subject,date:date,secs:secs,source:source,ts:Date.now()});
  save();renderAll();
  var after=totals(),msgs=[];
  var gb=Math.floor(before.all/BLOCK),ga=Math.floor(after.all/BLOCK);
  if(ga>gb){msgs.push('Nível geral '+ga+': '+tier(ga).name+'!');pulse($('gBar'));}
  var sb=Math.floor(before[subject]/BLOCK),sa=Math.floor(after[subject]/BLOCK);
  if(sa>sb){
    msgs.push(subj(subject).name+' subiu para o nível '+sa+': '+tier(sa).name+'!');
    var row=$('subjects').querySelector('.subj[data-id="'+(window.CSS&&CSS.escape?CSS.escape(subject):subject)+'"] .power');if(row) pulse(row);
  }
  if(msgs.length) toast(msgs.join('  '));
}

/* ---------- Gráfico ---------- */
var chartMode='day',selIdx=null,cache=null;
function buckets(mode){
  var out=[],now=new Date();now.setHours(0,0,0,0);var i,d,e;
  if(mode==='day'){
    for(i=13;i>=0;i--){d=addDays(now,-i);
      out.push({key:ds(d),label:String(d.getDate()),sub:'DSTQQSS'.charAt(d.getDay()),full:d.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit'})});}
  }else if(mode==='week'){
    var m0=monday(now);
    for(i=11;i>=0;i--){d=addDays(m0,-7*i);e=addDays(d,6);
      out.push({key:ds(d),label:pad(d.getDate())+'/'+pad(d.getMonth()+1),full:'Semana de '+pad(d.getDate())+'/'+pad(d.getMonth()+1)+' a '+pad(e.getDate())+'/'+pad(e.getMonth()+1)});}
  }else{
    for(i=11;i>=0;i--){d=new Date(now.getFullYear(),now.getMonth()-i,1);
      out.push({key:d.getFullYear()+'-'+pad(d.getMonth()+1),label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),full:d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})});}
  }
  return out;
}
function keyFor(mode,date){
  if(mode==='day') return date;
  if(mode==='week') return ds(monday(parseD(date)));
  return date.slice(0,7);
}
function niceScale(max){
  if(max<=0) return {top:1,step:.5};
  var steps=[.25,.5,1,2,5,10,20,50,100,200,500,1000],step=1000;
  for(var i=0;i<steps.length;i++){if(max/steps[i]<=4){step=steps[i];break;}}
  return {top:Math.ceil(max/step-1e-9)*step,step:step};
}
function fmtAxis(v){return (+v.toFixed(2)).toString().replace('.',',')+'h';}
function renderChart(){
  var host=$('chart'),mode=chartMode,bs=buckets(mode),idx={};
  bs.forEach(function(b,i){idx[b.key]=i;});
  var data=bs.map(function(){return {};});
  S.entries.forEach(function(e){var i=idx[keyFor(mode,e.date)];if(i!==undefined) data[i][e.subject]=(data[i][e.subject]||0)+e.secs;});
  var tot=data.map(function(d){return S.subjects.reduce(function(a,s){return a+(d[s.id]||0);},0)/3600;});
  var sc=niceScale(Math.max.apply(null,tot.concat([0])));
  var W=host.clientWidth||320,H=232,l=38,r=6,t=10,b=mode==='day'?38:26;
  var pw=W-l-r,ph=H-t-b,n=bs.length,slot=pw/n,bw=Math.min(slot*.66,34);
  var svg='<svg width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" role="group" aria-label="Horas estudadas por matéria">';
  for(var v=0;v<=sc.top+1e-9;v+=sc.step){
    var y=t+ph-(v/sc.top)*ph;
    svg+='<line class="gl" x1="'+l+'" x2="'+(W-r)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'"/><text class="ax" x="'+(l-6)+'" y="'+(y+4).toFixed(1)+'" text-anchor="end">'+fmtAxis(v)+'</text>';
  }
  bs.forEach(function(bk,i){
    var x0=l+i*slot,cx=x0+slot/2,yy=t+ph,segs='',parts=[];
    S.subjects.forEach(function(s){
      var hv=(data[i][s.id]||0)/3600;
      if(hv>0){
        var hh=hv/sc.top*ph;yy-=hh;
        segs+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+yy.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(hh,1.5).toFixed(1)+'" rx="2" style="fill:'+s.color+';stroke:var(--surface);stroke-width:1"/>';
        parts.push(s.name+' '+fmtHM(data[i][s.id]));
      }
    });
    var show=mode==='week'?(((n-1-i)%2===0)||slot>=42):true;
    var lab=show?'<text class="ax'+(i===n-1?' now':'')+'" x="'+cx.toFixed(1)+'" y="'+(H-b+15)+'" text-anchor="middle">'+esc(bk.label)+'</text>':'';
    var sub=(mode==='day')?'<text class="ax'+(i===n-1?' now':'')+'" x="'+cx.toFixed(1)+'" y="'+(H-b+29)+'" text-anchor="middle">'+bk.sub+'</text>':'';
    svg+='<g class="bar" data-i="'+i+'" tabindex="0" role="img" aria-label="'+esc(bk.full+': '+(parts.length?parts.join(', '):'sem estudo'))+'"><rect class="hit" x="'+x0.toFixed(1)+'" y="'+t+'" width="'+slot.toFixed(1)+'" height="'+(ph+ (mode==='day'?b:b))+'" rx="6"/>'+segs+lab+sub+'</g>';
  });
  if(!S.entries.length) svg+='<text class="ax" x="'+(W/2)+'" y="'+(t+ph/2)+'" text-anchor="middle">Registre uma sessão para ver o gráfico</text>';
  svg+='</svg>';
  host.innerHTML=svg;
  cache={bs:bs,data:data};
  var sum=tot.reduce(function(a,c){return a+c;},0);
  $('chartSum').textContent='No período: '+fmtHM(Math.round(sum*3600));
  if(selIdx===null||selIdx>=n) selIdx=n-1;
  setSel(selIdx);
}
function setSel(i){
  selIdx=i;
  $('chart').querySelectorAll('.bar').forEach(function(g){g.classList.toggle('sel',+g.dataset.i===i);});
  var b=cache.bs[i],d=cache.data[i],total=0,parts=[];
  S.subjects.forEach(function(s){var v=d[s.id]||0;if(v>0){total+=v;parts.push('<span class="dot" style="background:'+s.color+'"></span> '+esc(s.name)+' '+fmtHM(v));}});
  $('readout').innerHTML=parts.length
    ?'<strong>'+esc(b.full)+'</strong>: '+fmtHM(total)+' &nbsp; '+parts.join(' &nbsp; ')
    :'<strong>'+esc(b.full)+'</strong>: <span class="empty">sem estudo neste período</span>';
}
(function(){
  var host=$('chart');
  function pick(e){var g=e.target.closest&&e.target.closest('.bar');if(g&&cache) setSel(+g.dataset.i);}
  host.addEventListener('pointerover',pick);host.addEventListener('click',pick);host.addEventListener('focusin',pick);
})();
$('chartTabs').addEventListener('click',function(e){
  var b=e.target.closest('button');if(!b) return;
  chartMode=b.dataset.mode;selIdx=null;
  $('chartTabs').querySelectorAll('button').forEach(function(x){x.setAttribute('aria-selected',x===b);});
  renderChart();
});
var lastW=0,rq=null;
if(window.ResizeObserver){
  new ResizeObserver(function(){
    var w=$('chart').clientWidth;
    if(Math.abs(w-lastW)<2) return;
    lastW=w;cancelAnimationFrame(rq);rq=requestAnimationFrame(renderChart);
  }).observe($('chart'));
}

/* ---------- Histórico ---------- */
var showAll=false,armedId=null,armedT;
function renderHistory(){
  var list=S.entries.slice().sort(function(a,b){return b.date.localeCompare(a.date)||b.ts-a.ts;});
  var items=showAll?list:list.slice(0,10);
  $('hist').innerHTML=items.length?items.map(function(e){
    var s=subj(e.subject),name=s?s.name:'Outra matéria',color=s?s.color:'#888888';
    var dt=parseD(e.date).toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.','');
    var armed=armedId===e.id;
    return '<li><span class="h-date">'+esc(dt)+'</span><span class="h-sub"><span class="dot" style="background:'+color+'"></span>'+esc(name)+'</span>'+
      '<span class="h-src">'+(e.source==='timer'?'timer':'manual')+'</span><span class="h-dur">'+fmtHM(e.secs)+'</span>'+
      '<button class="h-del'+(armed?' armed':'')+'" data-id="'+esc(e.id)+'" aria-label="Apagar sessão">'+(armed?'Confirmar':'Apagar')+'</button></li>';
  }).join(''):'<li class="empty">Nenhuma sessão ainda. Inicie o timer ou adicione horas de um estudo que você já fez.</li>';
  $('histMoreRow').hidden=list.length<=10;
  $('histMore').textContent=showAll?'Ver menos':'Ver todas as sessões ('+list.length+')';
}
$('hist').addEventListener('click',function(e){
  var b=e.target.closest('.h-del');if(!b) return;
  var id=b.dataset.id;
  if(armedId!==id){armedId=id;clearTimeout(armedT);armedT=setTimeout(function(){armedId=null;renderHistory();},3500);renderHistory();return;}
  armedId=null;S.entries=S.entries.filter(function(x){return x.id!==id;});save();renderAll();
});
$('histMore').onclick=function(){showAll=!showAll;renderHistory();};

/* ---------- Backup ---------- */
function toB64(str){var bytes=new TextEncoder().encode(str),bin='';bytes.forEach(function(b){bin+=String.fromCharCode(b);});return btoa(bin);}
function fromB64(s){var bin=atob(s),bytes=Uint8Array.from(bin,function(c){return c.charCodeAt(0);});return new TextDecoder().decode(bytes);}
function makeCode(){return 'ESTUDO1:'+toB64(JSON.stringify({v:1,subjects:S.subjects,entries:S.entries}));}
function readCode(txt){
  txt=(txt||'').trim();var json=txt;
  if(txt.indexOf('ESTUDO1:')===0) json=fromB64(txt.slice(8).replace(/\s+/g,''));
  var d=JSON.parse(json);
  if(!d||!Array.isArray(d.entries)) throw new Error('formato');
  return normalize({subjects:d.subjects,entries:d.entries});
}
function bMsg(t,err){var m=$('bMsg');m.textContent=t;m.classList.toggle('err',!!err);}
$('bGen').onclick=function(){$('codeOut').value=makeCode();bMsg('Código gerado com '+S.entries.length+' sessões. Toque em Copiar.');};
$('bCopy').onclick=function(){
  var ta=$('codeOut');if(!ta.value) ta.value=makeCode();
  function fallback(){ta.focus();ta.select();var ok=false;try{ok=document.execCommand('copy');}catch(e){}bMsg(ok?'Código copiado.':'Selecione o texto e copie manualmente.',!ok);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(ta.value).then(function(){bMsg('Código copiado.');},fallback);}else fallback();
};
$('bMerge').onclick=function(){
  var nd;try{nd=readCode($('codeIn').value);}catch(e){bMsg('Código inválido. Cole o código completo gerado no outro aparelho.',true);return;}
  var have={};S.entries.forEach(function(e){have[e.id]=1;});
  var added=0;nd.entries.forEach(function(e){if(!have[e.id]){S.entries.push(e);added++;}});
  nd.subjects.forEach(function(s){if(!subj(s.id)) S.subjects.push(s);});
  save();renderAll();$('codeIn').value='';bMsg('Mesclado: '+added+' sessões novas adicionadas.');
};
var repArmed=false,repT;
$('bReplace').onclick=function(){
  var nd;try{nd=readCode($('codeIn').value);}catch(e){bMsg('Código inválido. Cole o código completo gerado no outro aparelho.',true);return;}
  if(!repArmed){
    repArmed=true;$('bReplace').textContent='Confirmar substituição';$('bReplace').classList.add('warn');
    bMsg('Isso apaga as sessões deste aparelho e usa as do código ('+nd.entries.length+'). Toque de novo para confirmar.');
    repT=setTimeout(dis,5000);return;
  }
  dis();S.entries=nd.entries;S.subjects=nd.subjects;if(!subj(S.selected)) S.selected=S.subjects[0].id;
  save();renderAll();$('codeIn').value='';bMsg('Dados substituídos: '+nd.entries.length+' sessões.');
  function dis(){repArmed=false;clearTimeout(repT);$('bReplace').textContent='Substituir tudo';$('bReplace').classList.remove('warn');}
  
};

/* ---------- Render geral ---------- */
function renderAll(){renderHero();renderSubjects();renderChart();renderHistory();renderTimer();}
renderAll();
})();
