/* ===================== AUTH (Firebase) ===================== */
const viewAuth   = document.getElementById("viewAuth");
const tabLogin   = document.getElementById("tabLogin");
const tabRegister= document.getElementById("tabRegister");
const loginPane  = document.getElementById("loginPane");
const registerPane = document.getElementById("registerPane");

const loginUser  = document.getElementById("loginUser");
const loginPass  = document.getElementById("loginPass");
const loginBtn   = document.getElementById("loginBtn");

const regUser    = document.getElementById("regUser");
const regPass    = document.getElementById("regPass");
const regPass2   = document.getElementById("regPass2");
const registerBtn= document.getElementById("registerBtn");

const userBadge  = document.getElementById("userBadge");
const userNameLabel = document.getElementById("userNameLabel");
const logoutBtn  = document.getElementById("logoutBtn");

let CURRENT_USER = null;
let CURRENT_UID  = null;

tabLogin.onclick = ()=>{
  tabLogin.classList.add("active");
  tabRegister.classList.remove("active");
  loginPane.classList.remove("hidden");
  registerPane.classList.add("hidden");
};
tabRegister.onclick = ()=>{
  tabRegister.classList.add("active");
  tabLogin.classList.remove("active");
  registerPane.classList.remove("hidden");
  loginPane.classList.add("hidden");
};

function showToast({title="Bilgi",message="",variant="info",timeout=3000}={}){
  const w=document.createElement("div");
  w.className=`toast ${variant}`;
  w.innerHTML=`<span class="badge"></span><div class="content"><p class="title">${title}</p><p class="msg">${message}</p></div><button class="close">×</button>`;
  w.querySelector(".close").onclick=()=>w.remove();
  document.getElementById("toastContainer").appendChild(w);
  if(timeout>0) setTimeout(()=>w.remove(),timeout);
}

/* Firebase ile giriş/çıkış */
async function registerUser(){
  const email=(regUser.value||"").trim();
  const p1=regPass.value||"", p2=regPass2.value||"";
  if(!email) return showToast({title:"Hata",message:"E-posta gerekli.",variant:"info"});
  if(p1.length<6) return showToast({title:"Hata",message:"Şifre en az 6 karakter olmalı.",variant:"info"});
  if(p1!==p2) return showToast({title:"Hata",message:"Şifreler uyuşmuyor.",variant:"info"});
  try{
    await cloud.auth.register(email,p1);
    showToast({title:"Kayıt başarılı",message:"Giriş yapıldı.",variant:"success"});
  }catch(e){
    showToast({title:"Hata",message:`Firebase: ${e.message}`,variant:"info",timeout:5000});
  }
}
async function loginUserFn(){
  const email=(loginUser.value||"").trim();
  const p=loginPass.value||"";
  if(!email||!p) return showToast({title:"Hata",message:"E-posta ve şifre gerekli.",variant:"info"});
  try{
    await cloud.auth.login(email,p);
    showToast({title:"Hoş geldin",message:`${email}`,variant:"success"});
  }catch(e){
    showToast({title:"Hata",message:`Firebase: ${e.message}`,variant:"info",timeout:5000});
  }
}
async function doLogout(){ try{ await cloud.auth.logout(); }catch{} }

loginBtn.onclick = loginUserFn;
registerBtn.onclick = registerUser;
logoutBtn.onclick = doLogout;

/* Firebase auth state */
window.onCloudAuth = async (user)=>{
  CURRENT_USER = user || null;
  CURRENT_UID  = user ? user.uid : null;
  refreshAuthUI();
  if(CURRENT_UID){
    try{
      const {settings, stats} = await cloud.db.loadAll(CURRENT_UID);
      if(settings){
        if(settings.studySec!=null) localStorage.setItem(keyFor("studySec"),String(settings.studySec));
        if(settings.breakSec!=null) localStorage.setItem(keyFor("breakSec"),String(settings.breakSec));
        if(settings.longBreakSec!=null) localStorage.setItem(keyFor("longBreakSec"),String(settings.longBreakSec));
        if(settings.totalRounds!=null) localStorage.setItem(keyFor("totalRounds"),String(settings.totalRounds));
        if(settings.totalSets!=null) localStorage.setItem(keyFor("totalSets"),String(settings.totalSets));
        if(settings.soundOn!=null) localStorage.setItem(keyFor("soundOn"),JSON.stringify(settings.soundOn));
        if(settings.alarmOn!=null) localStorage.setItem(keyFor("alarmOn"),JSON.stringify(settings.alarmOn));
        if(settings.themeName) localStorage.setItem(keyFor("themeName"), settings.themeName);
      }
      if(stats){
        if(stats.studyData)    localStorage.setItem(keyFor("studyData"),JSON.stringify(stats.studyData));
        if(stats.questionData) localStorage.setItem(keyFor("questionData"),JSON.stringify(stats.questionData));
      }
    }catch(e){
      showToast({title:"Bulut",message:"Veriler getirilemedi.",variant:"info"});
    }
    loadSettings();
    applyTheme(loadThemeName(), loadCustomBg());
    updateRoundSetLabels(); initTimerAtMode(); refreshTotals(); renderWeekChart();
  }
};

function refreshAuthUI(){
  const logged = !!CURRENT_USER;
  userBadge.classList.toggle("hidden", !logged);
  if(logged) userNameLabel.textContent = CURRENT_USER.email || "Hesap";
  [viewAuth, viewHome, viewPomodoro, viewStats, viewSort, viewPrefs]
    .forEach(v=>v.classList.remove("active"));
  if(logged) viewHome.classList.add("active");
  else viewAuth.classList.add("active");
}

/* ===================== SPA ===================== */
const viewHome   = document.getElementById("viewHome");
const viewPomodoro = document.getElementById("viewPomodoro");
const viewStats  = document.getElementById("viewStats");
const viewSort   = document.getElementById("viewSort");
const viewPrefs  = document.getElementById("viewPrefs");
const backBtn    = document.getElementById("backBtn");
const titleText  = document.getElementById("titleText");

document.getElementById("navPomodoro").addEventListener("click",()=>showView("pomodoro"));
document.getElementById("navStats").addEventListener("click",()=>{showView("stats"); renderStatsUI();});
document.getElementById("navQuickAdd").addEventListener("click",()=>{showView("stats"); renderStatsUI(true);});
document.getElementById("navRanking").addEventListener("click",()=>showView("sort"));
document.getElementById("navSettings").addEventListener("click",()=>showView("prefs"));
backBtn.addEventListener("click",()=>showView("home"));

function showView(name){
  if(!CURRENT_USER){
    viewAuth.classList.add("active");
    [viewHome,viewPomodoro,viewStats,viewSort,viewPrefs].forEach(v=>v.classList.remove("active"));
    backBtn.classList.add("hidden"); titleText.textContent="Ders & Mola Takip"; return;
  }
  [viewHome, viewPomodoro, viewStats, viewSort, viewPrefs, viewAuth].forEach(v=>v.classList.remove("active"));
  if(name==="home"){viewHome.classList.add("active");backBtn.classList.add("hidden");titleText.textContent="Ders & Mola Takip";}
  if(name==="pomodoro"){viewPomodoro.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Pomodoro";}
  if(name==="stats"){viewStats.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="İstatistikler";}
  if(name==="sort"){viewSort.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Sıralama";}
  if(name==="prefs"){viewPrefs.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Ayarlar & Tema";}
}

/* ---------- ZAMANLAYICI ---------- */
let timer=null,timeLeft=0,isStudy=true,isLongBreak=false,paused=false;
let studySec=50*60,breakSec=10*60,longBreakSec=60*60;
let totalRounds=4,totalSets=3,completedRounds=0,completedSets=0;
let soundOn=true,alarmOn=true,awaitingAck=false,alarmAudio=null,alarmActive=false;

/* ---------- DOM ---------- */
const el=id=>document.getElementById(id);
const statusEl=el("status"),timeDisplay=el("timeDisplay");
const startBtn=el("startBtn"),pauseBtn=el("pauseBtn"),resetBtn=el("resetBtn");
let stopSoundBtn=el("stopSoundBtn"),skipBreakBtn=el("skipBreakBtn");
const saveSettingsBtn=el("saveSettings");
const studyMinInput=el("studyMin"),studySecInput=el("studySec");
const breakMinInput=el("breakMin"),breakSecInput=el("breakSec");
const longBreakMinInput=el("longBreakMin"),longBreakSecInput=el("longBreakSec");
const roundsInput=el("roundsCount"),setsInput=el("setsCount");
const roundLabel=el("roundLabel"),setLabel=el("setLabel");
const todayTotalEl=el("todayTotal"),weekTotalEl=el("weekTotal"),weekChartCanvas=el("weekChart");
const liveClock=el("liveClock"),hourglass=el("hourglass");
const soundToggle=el("soundToggle"),alarmToggle=el("alarmToggle");

/* ---------- STATS DOM ---------- */
const statsChartCanvas = document.getElementById("statsChart");
const metricTimeBtn = document.getElementById("metricTime");
const metricQuestionsBtn = document.getElementById("metricQuestions");
const rangeWeekBtn = document.getElementById("rangeWeek");
const rangeMonthBtn = document.getElementById("rangeMonth");
const rangeYearBtn = document.getElementById("rangeYear");
const statsList = document.getElementById("statsList");
const listTitle = document.getElementById("listTitle");

const qForm = document.getElementById("questionForm");
const qDateInput = document.getElementById("qDate");
const qSubjectSelect = document.getElementById("qSubject");
const qCountInput = document.getElementById("qCount");
const qSaveBtn = document.getElementById("qSaveBtn");
const qEntryList = document.getElementById("qEntryList");

let statsMetric="time", statsRange="week";

/* ---------- DERS LİSTESİ ---------- */
const SUBJECTS = [
  "TYT Matematik","TYT Fizik","TYT Kimya","TYT Biyoloji",
  "Türkçe","Edebiyat","Tarih","Coğrafya","Felsefe",
  "AYT Matematik","AYT Fizik","AYT Kimya","AYT Biyoloji"
];
function fillSubjectSelect(sel){
  sel.innerHTML="";
  SUBJECTS.forEach(s=>{ const o=document.createElement("option"); o.value=s; o.textContent=s; sel.appendChild(o); });
}

/* ---------- Güvence ---------- */
(function ensureButtons(){
  const ctrl=document.querySelector(".controls");
  if(!stopSoundBtn&&ctrl){stopSoundBtn=document.createElement("button");stopSoundBtn.id="stopSoundBtn";stopSoundBtn.className="btn mute hidden";stopSoundBtn.textContent="Sesi Durdur";ctrl.appendChild(stopSoundBtn);}
  if(!skipBreakBtn&&ctrl){skipBreakBtn=document.createElement("button");skipBreakBtn.id="skipBreakBtn";skipBreakBtn.className="btn skip hidden";skipBreakBtn.textContent="Molayı Atla";ctrl.appendChild(skipBreakBtn);}
})();

/* ---------- Yardımcılar ---------- */
const fmt=s=>`${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;
const todayKey=(d=new Date())=>d.toISOString().slice(0,10);
function secs(minInp,secInp){const m=Math.max(0,parseInt(minInp.value)||0);const s=Math.max(0,Math.min(59,parseInt(secInp.value)||0));return m*60+s;}
function keyFor(base){ if(!CURRENT_UID) return base; return `${CURRENT_UID}:${base}`; }

/* ---------- Veri Depoları ---------- */
function getStudy(){try{return JSON.parse(localStorage.getItem(keyFor("studyData")))||{}}catch{return {}}}
function setStudy(o){ localStorage.setItem(keyFor("studyData"),JSON.stringify(o)); if(CURRENT_UID) cloud.db.setStudyData(CURRENT_UID,o).catch(()=>{}); }
function addStudyMinutesTo(dateIso,minutes){ if(minutes<=0)return; const d=getStudy(); d[dateIso]=(d[dateIso]||0)+minutes; setStudy(d); }

function migrateQuestionsShape(obj){const out={};for(const k in obj){const v=obj[k];if(Array.isArray(v)) out[k]=v.filter(e=>e&&typeof e.count==="number"); else if(typeof v==="number") out[k]=[{subject:"Genel",count:v}]; else out[k]=[]}return out;}
function getQuestions(){try{const raw=JSON.parse(localStorage.getItem(keyFor("questionData")))||{};return migrateQuestionsShape(raw);}catch{return {}}}
function setQuestions(o){ localStorage.setItem(keyFor("questionData"),JSON.stringify(o)); if(CURRENT_UID) cloud.db.setQuestionData(CURRENT_UID,o).catch(()=>{}); }
function addQuestionsEntry(dateIso,subject,count){if(count<=0)return;const d=getQuestions();(d[dateIso]=d[dateIso]||[]).push({subject,count});setQuestions(d)}
function updateQuestionsEntry(dateIso,index,newCount){const d=getQuestions();if(!d[dateIso]||!d[dateIso][index])return;d[dateIso][index].count=Math.max(0,newCount|0);setQuestions(d)}
function removeQuestionsEntry(dateIso,index){const d=getQuestions();if(!d[dateIso])return;d[dateIso].splice(index,1);if(d[dateIso].length===0)delete d[dateIso];setQuestions(d)}

/* ---------- Ayarlar ---------- */
function loadSettings(){
  studySec=parseInt(localStorage.getItem(keyFor("studySec")))||(50*60);
  breakSec=parseInt(localStorage.getItem(keyFor("breakSec")))||(10*60);
  longBreakSec=parseInt(localStorage.getItem(keyFor("longBreakSec")))||(60*60);
  totalRounds=parseInt(localStorage.getItem(keyFor("totalRounds")))||4;
  totalSets=parseInt(localStorage.getItem(keyFor("totalSets")))||3;
  soundOn=JSON.parse(localStorage.getItem(keyFor("soundOn"))??"true");
  alarmOn=JSON.parse(localStorage.getItem(keyFor("alarmOn"))??"true");
  applySettingsToUI();
}
function saveSettings(extra={}){
  const data = {studySec, breakSec, longBreakSec, totalRounds, totalSets, soundOn, alarmOn, ...extra};
  localStorage.setItem(keyFor("studySec"),String(studySec));
  localStorage.setItem(keyFor("breakSec"),String(breakSec));
  localStorage.setItem(keyFor("longBreakSec"),String(longBreakSec));
  localStorage.setItem(keyFor("totalRounds"),String(totalRounds));
  localStorage.setItem(keyFor("totalSets"),String(totalSets));
  localStorage.setItem(keyFor("soundOn"),JSON.stringify(soundOn));
  localStorage.setItem(keyFor("alarmOn"),JSON.stringify(alarmOn));
  if(CURRENT_UID) cloud.db.saveSettings(CURRENT_UID,data).catch(()=>{});
}

/* ---------- Totaller/Chart ---------- */
let weekChart = null;
function refreshTotals(){
  const data=getStudy(),today=todayKey();
  document.getElementById("todayTotal").textContent=Math.round(data[today]||0);
  const weekDates=last7Dates();
  const weekSum=weekDates.reduce((s,d)=>s+(data[d]||0),0);
  document.getElementById("weekTotal").textContent=Math.round(weekSum);
}
function last7Dates(){const a=[],n=new Date();for(let i=6;i>=0;i--){const d=new Date(n);d.setDate(n.getDate()-i);a.push(todayKey(d));}return a;}
function renderWeekChart(){
  const d=getStudy();
  const labels=last7Dates();
  const values=labels.map(x=>+((d[x]||0)/60).toFixed(2));
  if(weekChart)weekChart.destroy();
  if(!weekChartCanvas)return;
  const ctx=weekChartCanvas.getContext("2d");
  const grad=ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0,"rgba(96,165,250,0.9)");
  grad.addColorStop(1,"rgba(59,130,246,0.35)");
  weekChart=new Chart(ctx,{
    type:"bar",
    data:{labels:labels.map(x=>x.slice(5)),datasets:[{label:"Saat",data:values, backgroundColor:grad, borderRadius:8, borderWidth:0}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
  });
}
function startLiveClock(){const t=()=>liveClock.textContent=new Date().toLocaleString();t();setInterval(t,1000);}

/* ===================== KUM SAATİ (Canvas) ===================== */
const hgCanvas = document.getElementById("hgCanvas");
const hg = (function(){
  if(!hgCanvas) return null;
  const ctx = hgCanvas.getContext("2d");
  const W = hgCanvas.width, H = hgCanvas.height;

  // Geometri
  const yTop = 30, yNeck = 120, yBot = 210;
  const halfTop = 48, halfNeck = 10, halfBot = 48;

  // Partiküller
  const particles = [];
  let progress = 0;     // 0..1 (0: üst full, 1: alt full) — daima ÜSTTEN ALTA
  let running  = false;
  let flowFactor = 1;
  let lastT = 0;

  const lerp=(a,b,t)=>a+(b-a)*t;

  function drawGlass(){
    ctx.save();
    ctx.clearRect(0,0,W,H);

    const grd = ctx.createLinearGradient(0,0,0,H);
    grd.addColorStop(0,"rgba(255,255,255,0.06)");
    grd.addColorStop(1,"rgba(255,255,255,0.01)");
    ctx.fillStyle = grd;
    roundRect(ctx, 8, 8, W-16, H-16, 18); ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1.2;

    // Üst huni
    ctx.beginPath();
    ctx.moveTo(W/2 - halfTop, yTop);
    ctx.lineTo(W/2 + halfTop, yTop);
    ctx.lineTo(W/2 + halfNeck, yNeck);
    ctx.lineTo(W/2 - halfNeck, yNeck);
    ctx.closePath(); ctx.stroke();

    // Alt huni
    ctx.beginPath();
    ctx.moveTo(W/2 - halfNeck, yNeck);
    ctx.lineTo(W/2 + halfNeck, yNeck);
    ctx.lineTo(W/2 + halfBot, yBot);
    ctx.lineTo(W/2 - halfBot, yBot);
    ctx.closePath(); ctx.stroke();

    // Boyun ışıltı
    ctx.fillStyle = "#fbbf24";
    roundRect(ctx, W/2-3, yNeck-3, 6, 12, 3); ctx.fill();
    ctx.restore();
  }

  function sandGradient(){
    const g = ctx.createLinearGradient(0,yTop,0,yBot);
    g.addColorStop(0,"#fde68a"); g.addColorStop(1,"#f59e0b");
    return g;
  }

  function drawSand(){
    ctx.save();
    ctx.fillStyle = sandGradient();

    // ÜST KUM: progress 0->1 iken azalsın
    const tTop = 1 - progress; // 1: üst full, 0: üst boş
    const yFillTop = lerp(yNeck, yTop, tTop);
    const hwTopAtFill = lerp(halfNeck, halfTop, (yFillTop - yTop)/(yNeck - yTop));

    ctx.beginPath();
    ctx.moveTo(W/2 - halfTop, yTop);
    ctx.lineTo(W/2 + halfTop, yTop);
    ctx.lineTo(W/2 + hwTopAtFill, yFillTop);
    ctx.lineTo(W/2 - hwTopAtFill, yFillTop);
    ctx.closePath();
    ctx.fill();

    // ALT KUM: progress 0->1 iken artsın
    const yFillBot = lerp(yNeck, yBot, progress);
    const hwBotAtFill = lerp(halfNeck, halfBot, (yFillBot - yNeck)/(yBot - yNeck));
    ctx.beginPath();
    ctx.moveTo(W/2 - hwBotAtFill, yFillBot);
    ctx.quadraticCurveTo(W/2, yFillBot - 8*(0.2 + 0.8*progress), W/2 + hwBotAtFill, yFillBot);
    ctx.lineTo(W/2 + halfBot, yBot);
    ctx.lineTo(W/2 - halfBot, yBot);
    ctx.closePath();
    ctx.fill();

    // Akan kum şeritleri (estetik)
    if(running){
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(251,191,36,0.95)";
      for(let yy = yNeck; yy < yNeck+64; yy+=4){
        ctx.fillRect(W/2-1, yy, 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function spawnParticles(dt){
    if(!running) return;
    const baseRate = 90;
    const want = baseRate * flowFactor * dt;
    let k = Math.floor(want);
    while(k-- > 0) particles.push(newParticle());
    if(Math.random() < want - Math.floor(want)) particles.push(newParticle());
  }
  function newParticle(){
    return {
      x: W/2 + (Math.random()*4-2),
      y: yNeck + 2,
      vx: (Math.random()*1.0-0.5),
      vy: 1 + Math.random()*1.2,
      life: 0
    };
  }
  function updateParticles(dt){
    const yFillBot = lerp(yNeck, yBot, progress);
    const g = 120;
    for(let i=particles.length-1;i>=0;i--){
      const p = particles[i];
      p.vy += g*dt*0.0018;
      p.x  += p.vx;
      p.y  += p.vy;
      p.life += dt;
      if(p.y >= yFillBot - 2 || p.life>1.4){
        particles.splice(i,1);
      }
    }
  }
  function drawParticles(){
    ctx.save();
    ctx.fillStyle = "rgba(251,191,36,0.95)";
    particles.forEach(p=>{ ctx.fillRect(p.x, p.y, 1.6, 1.6); });
    ctx.restore();
  }
  function roundRect(ctx,x,y,w,h,r){
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y);
    ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r);
    ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h);
    ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r);
    ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  function frame(ts){
    if(!lastT) lastT = ts;
    const dt = Math.min(40, ts - lastT) / 1000;
    lastT = ts;

    drawGlass();
    spawnParticles(dt);
    updateParticles(dt);
    drawSand();
    drawParticles();

    requestAnimationFrame(frame);
  }

  return {
    setProgress(p){ progress = Math.max(0, Math.min(1, p)); },
    setRunning(v){ running = !!v; },
    setFlowFactor(f){ flowFactor = Math.max(0.35, Math.min(1.6, f)); },
    start(){ requestAnimationFrame(frame); },
    reset(){ particles.length = 0; } // flip sonrası temizleme
  };
})();

/* ---------- Ses ---------- */
let audioCtx=null;
function tickSound(){
  if(!soundOn) return;
  try{
    if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type="square"; o.frequency.value=900;
    g.gain.setValueAtTime(0.001,audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2,audioCtx.currentTime+0.001);
    g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.03);
    o.connect(g).connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime+0.03);
  }catch{}
}

/* ---------- Hourglass köprüleri ---------- */
function setHourglassProgressByTime(total, left){
  // HER ZAMAN ÜSTTEN ALTA: zaman azaldıkça progress artar (0→1)
  const p = 1 - (left / (total || 1));
  if(hg){ hg.setProgress(p); }
  hourglass?.classList.toggle("running", (timer!==null) && !paused && !awaitingAck);
}
function updateRoundSetLabels(){
  document.getElementById("roundLabel").textContent=`${completedRounds} / ${totalRounds}`;
  document.getElementById("setLabel").textContent=`${completedSets} / ${totalSets}`;
}

/* ---------- Alarm ---------- */
function playAlarm(){if(!alarmOn)return;try{if(alarmAudio){alarmAudio.pause();} else {alarmAudio=new Audio("japan-eas-alarm-277877.mp3");alarmAudio.preload="auto";}alarmAudio.currentTime=0;alarmAudio.loop=true;const pr=alarmAudio.play();if(pr&&pr.catch)pr.catch(()=>{});alarmActive=true;updateControlsVisibility();}catch{}}
function stopAlarm(){try{if(alarmAudio){alarmAudio.pause();alarmAudio.currentTime=0;alarmAudio.loop=false;}}catch{} alarmActive=false;updateControlsVisibility();}
function updateControlsVisibility(){document.getElementById("stopSoundBtn").classList.toggle('hidden',!alarmActive);const onBreak=!isStudy,running=(timer!==null),canShow=(!awaitingAck)&&onBreak&&running;document.getElementById("skipBreakBtn").classList.toggle('hidden',!canShow);}

/* ---------- FLIP (süre bitince) ---------- */
function flipHourglass(){
  hourglass.classList.add('flip');
  if(hg){ hg.reset(); hg.setProgress(0); } // üstü tekrar doldur
  setTimeout(()=>{ hourglass.classList.remove('flip'); }, 700);
}

/* ---------- Ayarlar UI ---------- */
function applySettingsToUI(){
  studyMinInput.value=Math.floor(studySec/60);studySecInput.value=studySec%60;
  breakMinInput.value=Math.floor(breakSec/60);breakSecInput.value=breakSec%60;
  longBreakMinInput.value=Math.floor(longBreakSec/60);longBreakSecInput.value=longBreakSec%60;
  roundsInput.value=totalRounds;setsInput.value=totalSets;
  soundToggle.checked=soundOn;alarmToggle.checked=alarmOn;updateRoundSetLabels();
}

/* ---------- Akış ---------- */
function updateDisplay(){
  timeLeft=Math.max(0,timeLeft);
  timeDisplay.textContent=fmt(timeLeft);
  const total=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);
  setHourglassProgressByTime(total, timeLeft);
  updateControlsVisibility();

  if(hg){
    const factor = Math.max(0.35, Math.min(1.6, (30*60)/(total||1800)));
    hg.setFlowFactor(factor);
  }
}
function initTimerAtMode(){
  const total=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);
  timeLeft=total; updateDisplay(); statusEl.textContent="Hazır";
  startBtn.disabled=awaitingAck; updateControlsVisibility();
  hourglass.classList.remove("running");
  if(hg) hg.setRunning(false), hg.setProgress(0);
}
function startTimer(){
  if(awaitingAck||timer!==null)return;
  if(!paused){timeLeft=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);}
  paused=false; statusEl.textContent=isStudy?"Ders Zamanı":(isLongBreak?"Uzun Mola":"Kısa Mola");
  startBtn.disabled=true; tickSound(); updateControlsVisibility();
  hourglass.classList.add("running"); if(hg) hg.setRunning(true);
  timer=setInterval(()=>{
    timeLeft--; updateDisplay(); tickSound();
    if(timeLeft<=0){
      clearInterval(timer); timer=null; updateControlsVisibility();
      hourglass.classList.remove("running"); if(hg) hg.setRunning(false);

      // Bitince camı çevir
      flipHourglass();

      if(isStudy){
        completedRounds++; updateRoundSetLabels();
        addStudyMinutesTo(todayKey(),Math.round(studySec/60)); refreshTotals(); playAlarm();
        showToast({title:"Tebrikler!",message:"Ders bitti. Zili sustur, sonra mola başlayacak.",variant:"success",timeout:4000});
        awaitingAck=true; statusEl.textContent="Ders bitti!"; startBtn.disabled=true; return;
      }
      // mola bitti -> otomatik sonraki moda
      isStudy=true; isLongBreak=false; paused=false; initTimerAtMode(); startTimer();
    }
  },1000);
}
function pauseTimer(){
  if(timer===null)return;
  clearInterval(timer); timer=null; paused=true; statusEl.textContent="Duraklatıldı";
  startBtn.disabled=awaitingAck; updateControlsVisibility();
  hourglass.classList.remove("running");
  if(hg) hg.setRunning(false);
}
function resetTimer(){
  if(timer!==null){clearInterval(timer);timer=null;}
  stopAlarm(); awaitingAck=false; paused=false;
  completedRounds=0; completedSets=0; isStudy=true; isLongBreak=false;
  updateRoundSetLabels(); initTimerAtMode(); updateControlsVisibility();
  hourglass.classList.remove("running");
  if(hg) hg.setRunning(false); if(hg) hg.setProgress(0);
}

/* ---------- UI ---------- */
function bindUI(){
  saveSettingsBtn.addEventListener("click",()=>{
    studySec=secs(studyMinInput,studySecInput);
    breakSec=secs(breakMinInput,breakSecInput);
    longBreakSec=secs(longBreakMinInput,longBreakSecInput);
    totalRounds=Math.max(1,parseInt(roundsInput.value)||1);
    totalSets=Math.max(1,parseInt(setsInput.value)||1);
    soundOn=!!soundToggle.checked; alarmOn=!!alarmToggle.checked;
    saveSettings(); updateRoundSetLabels();
    if(timer===null&&!paused&&!awaitingAck) initTimerAtMode();
  });
  startBtn.addEventListener("click",startTimer);
  pauseBtn.addEventListener("click",pauseTimer);
  resetBtn.addEventListener("click",resetTimer);

  document.getElementById("stopSoundBtn").addEventListener("click",()=>{
    if(!alarmActive&&!alarmAudio) return;
    stopAlarm();
    if(awaitingAck){
      if(completedRounds>=totalRounds){
        completedSets++; updateRoundSetLabels();
        if(completedSets>=totalSets){
          showToast({title:"Tebrikler!",message:"Hedefinize ulaştınız 🎉",variant:"info",timeout:5000});
          awaitingAck=false; statusEl.textContent="Turlar tamamlandı!";
          startBtn.disabled=false; isStudy=true; isLongBreak=false; initTimerAtMode();
        }else{
          awaitingAck=false; isStudy=false; isLongBreak=true; paused=false; completedRounds=0;
          updateRoundSetLabels(); initTimerAtMode(); startTimer();
        }
      }else{
        awaitingAck=false; isStudy=false; isLongBreak=false; paused=false; initTimerAtMode(); startTimer();
      }
    }
  });
  document.getElementById("skipBreakBtn").addEventListener("click",()=>{
    if(isStudy) return;
    if(timer!==null){clearInterval(timer);timer=null;}
    isStudy=true; isLongBreak=false; paused=false; initTimerAtMode(); startTimer();
  });

  soundToggle.addEventListener("change",e=>{soundOn=e.target.checked;localStorage.setItem(keyFor("soundOn"),JSON.stringify(soundOn));});
  alarmToggle.addEventListener("change",e=>{alarmOn=e.target.checked;localStorage.setItem(keyFor("alarmOn"),JSON.stringify(alarmOn));});

  setupThemeUI();
}

/* ===================== İSTATİSTİKLER ===================== */
let statsChart=null;
function setActiveSeg(group,active){group.forEach(b=>b.classList.remove("active"));active.classList.add("active");}
function renderStatsUI(focusAdd=false){
  fillSubjectSelect(qSubjectSelect);

  metricTimeBtn.onclick = ()=>{statsMetric="time";setActiveSeg([metricTimeBtn,metricQuestionsBtn],metricTimeBtn);renderStats();};
  metricQuestionsBtn.onclick = ()=>{statsMetric="questions";setActiveSeg([metricTimeBtn,metricQuestionsBtn],metricQuestionsBtn);renderStats();};
  rangeWeekBtn.onclick = ()=>{statsRange="week";setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn],rangeWeekBtn);renderStats();};
  rangeMonthBtn.onclick= ()=>{statsRange="month";setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn],rangeMonthBtn);renderStats();};
  rangeYearBtn.onclick = ()=>{statsRange="year";setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn],rangeYearBtn);renderStats();};

  qDateInput.value=todayKey();
  qSaveBtn.onclick=()=>{
    const d=qDateInput.value||todayKey();
    const subj=qSubjectSelect.value;
    const n=Math.max(0,parseInt(qCountInput.value)||0);
    if(!subj){showToast({title:"Hata",message:"Lütfen ders seç.",variant:"info"});return;}
    if(n<=0){showToast({title:"Hata",message:"Soru sayısı 0 olamaz.",variant:"info"});return;}
    addQuestionsEntry(d,subj,n); qCountInput.value="";
    showToast({title:"Kaydedildi",message:`${d} — ${subj}: ${n} soru eklendi.`,variant:"success"});
    renderStats(); renderQuestionEntriesForDate(d);
  };
  if(focusAdd){qForm.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>qCountInput.focus(),250);}

  renderStats(); renderQuestionEntriesForDate(qDateInput.value);
  qDateInput.onchange=()=>renderQuestionEntriesForDate(qDateInput.value);
}
function sumQuestionsByDate(key){const q=getQuestions()[key]||[];return q.reduce((s,e)=>s+(e.count||0),0);}
function renderStats(){
  const study=getStudy(); const labels=[],values=[];
  const metricIsTime=(statsMetric==="time");
  let listItems=[];

  const ctx=statsChartCanvas.getContext("2d");
  const grad=ctx.createLinearGradient(0,0,0,200);
  grad.addColorStop(0, metricIsTime ? "rgba(125,211,252,0.95)" : "rgba(34,197,94,0.95)");
  grad.addColorStop(1, metricIsTime ? "rgba(59,130,246,0.35)"  : "rgba(16,185,129,0.35)");

  if(statsRange==="week"){
    const now=new Date();const day=(now.getDay()+6)%7;const mon=new Date(now);mon.setDate(now.getDate()-day);
    const names=["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
    for(let i=0;i<7;i++){
      const d=new Date(mon);d.setDate(mon.getDate()+i);
      const k=todayKey(d);
      const min=Math.round(study[k]||0);
      const hrs=+(min/60).toFixed(2);
      const qs=sumQuestionsByDate(k);
      labels.push(names[i]);
      values.push(metricIsTime?hrs:qs);
      listItems.push(metricIsTime?`${names[i]} — ${hrs} saat`:`${names[i]} — ${qs} soru`);
    }
    listTitle.textContent=metricIsTime?"Haftalık Çalışma":"Haftalık Soru";
  }else if(statsRange==="month"){
    const now=new Date();const y=now.getFullYear(),m=now.getMonth();
    const last=new Date(y,m+1,0).getDate();
    const weeks=[0,0,0,0,0];
    for(let d=1;d<=last;d++){
      const k=todayKey(new Date(y,m,d));
      const add=metricIsTime?(getStudy()[k]||0):sumQuestionsByDate(k);
      weeks[Math.floor((d-1)/7)] += add;
    }
    const lbl=["1. Hafta","2. Hafta","3. Hafta","4. Hafta","5. Hafta"];
    lbl.forEach((L,i)=>{labels.push(L);values.push(metricIsTime?+(weeks[i]/60).toFixed(2):weeks[i]);});
    listItems=labels.map((L,i)=>`${L} — ${metricIsTime?values[i]+" saat":values[i]+" soru"}`);
    listTitle.textContent=metricIsTime?"Aylık Çalışma (Haftalara göre)":"Aylık Soru (Haftalara göre)";
  }else{
    const now=new Date();const y=now.getFullYear();
    const names=["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    const sums=Array(12).fill(0);
    for(let m=0;m<12;m++){
      const days=new Date(y,m+1,0).getDate();
      for(let d=1;d<=days;d++){
        const k=todayKey(new Date(y,m,d));
        const add=metricIsTime?(getStudy()[k]||0):sumQuestionsByDate(k);
        sums[m]+=add;
      }
    }
    names.forEach((n,i)=>{labels.push(n);values.push(metricIsTime?+(sums[i]/60).toFixed(2):sums[i]);});
    listItems=labels.map((L,i)=>`${L} — ${metricIsTime?values[i]+" saat":values[i]+" soru"}`);
    listTitle.textContent=metricIsTime?"Yıllık Çalışma (Aylara göre)":"Yıllık Soru (Aylara göre)";
  }

  if(statsChart) statsChart.destroy();
  statsChart=new Chart(ctx,{
    type:"bar",
    data:{labels,datasets:[{label:metricIsTime?"Saat":"Soru",data:values, backgroundColor:grad, borderRadius:8, borderWidth:0}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}
  });

  statsList.innerHTML="";
  listItems.forEach(t=>{const li=document.createElement("li");li.textContent=t;statsList.appendChild(li);});
}

/* ---- Soru kayıtları ---- */
function renderQuestionEntriesForDate(dateIso){
  const entries=getQuestions()[dateIso]||[];
  qEntryList.innerHTML="";
  if(entries.length===0){const li=document.createElement("li");li.textContent="Kayıt yok.";qEntryList.appendChild(li);return;}
  entries.forEach((e,idx)=>qEntryList.appendChild(createQuestionEntryRow(dateIso,e,idx,false)));
}
function createQuestionEntryRow(dateIso,entry,idx,editing){
  const li=document.createElement("li");
  if(!editing){
    const left=document.createElement("span");
    left.textContent=`${entry.subject} — ${entry.count} soru`;
    const actions=document.createElement("span");actions.className="q-actions";
    const editBtn=document.createElement("button");editBtn.className="q-btn";editBtn.textContent="Düzenle";
    const delBtn=document.createElement("button");delBtn.className="q-btn danger";delBtn.textContent="Sil";
    editBtn.onclick=()=>{li.replaceWith(createQuestionEntryRow(dateIso,entry,idx,true));};
    delBtn.onclick=()=>{removeQuestionsEntry(dateIso,idx);showToast({title:"Silindi",message:`${entry.subject} kaydı silindi.`,variant:"info"});renderStats();renderQuestionEntriesForDate(dateIso);};
    actions.appendChild(editBtn);actions.appendChild(delBtn);
    li.appendChild(left);li.appendChild(actions);
  }else{
    const wrap=document.createElement("div");wrap.className="q-inline";
    const sel=document.createElement("select");fillSubjectSelect(sel);sel.value=entry.subject;
    const inp=document.createElement("input");inp.type="number";inp.min="0";inp.value=entry.count;
    const save=document.createElement("button");save.className="q-btn";save.textContent="Kaydet";
    const cancel=document.createElement("button");cancel.className="q-btn danger";cancel.textContent="İptal";
    save.onclick=()=>{
      updateQuestionsEntry(dateIso,idx,parseInt(inp.value)||0);
      const d=getQuestions();d[dateIso][idx].subject=sel.value;setQuestions(d);
      showToast({title:"Güncellendi",message:`${sel.value}: ${inp.value} soru`,variant:"success"});
      renderStats();renderQuestionEntriesForDate(dateIso);
    };
    cancel.onclick=()=>renderQuestionEntriesForDate(dateIso);
    wrap.appendChild(sel);wrap.appendChild(inp);wrap.appendChild(save);wrap.appendChild(cancel);
    li.appendChild(wrap);
  }
  return li;
}

/* ===================== TEMA ===================== */
const themeSelect   = document.getElementById("themeSelect");
const applyThemeBtn = document.getElementById("applyThemeBtn");
const bgUpload      = document.getElementById("bgUpload");
const customBgRow   = document.getElementById("customBgRow");
const themePreview  = document.getElementById("themePreview");

function loadThemeName(){ return localStorage.getItem(keyFor("themeName")) || "dark"; }
function loadCustomBg(){ return localStorage.getItem(keyFor("themeCustomBg")) || ""; }

function setupThemeUI(){
  if(!themeSelect) return;
  const cur = loadThemeName();
  themeSelect.value = cur;
  customBgRow.style.display = (cur==="custom") ? "flex" : "none";

  const data = loadCustomBg();
  if(cur==="custom" && data){ themePreview.src = data; themePreview.style.display = "block"; }
  else { themePreview.style.display = "none"; }

  bgUpload?.addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      const url = reader.result;
      themePreview.src = url;
      themePreview.style.display = "block";
      localStorage.setItem(keyFor("themeCustomBg"), url);
    };
    reader.readAsDataURL(file);
  });

  themeSelect.addEventListener("change", ()=>{
    const v = themeSelect.value;
    customBgRow.style.display = (v==="custom") ? "flex" : "none";
    if(v!=="custom"){ themePreview.style.display="none"; }
  });

  applyThemeBtn.addEventListener("click", ()=>{
    const v = themeSelect.value;
    const custom = (v==="custom") ? loadCustomBg() : "";
    localStorage.setItem(keyFor("themeName"), v);
    applyTheme(v, custom);
    saveSettings({ themeName: v });
    showToast({title:"Tema", message:"Tema uygulandı.", variant:"success"});
  });
}

function applyTheme(name, customDataURL){
  const body = document.body;
  const html = document.documentElement;

  // Önce sıfırla
  [body.style, html.style].forEach(s=>{
    s.background = "";
    s.backgroundImage = "";
    s.backgroundSize = "";
    s.backgroundAttachment = "";
    s.backgroundRepeat = "";
  });

  const overlay = (a=0.42,b=0.50)=>`linear-gradient(rgba(0,0,0,${a}), rgba(0,0,0,${b}))`;
  const applyBG = (imgOrGradient, useImage=true)=>{
    if(useImage){
      const v = `${overlay(0.40,0.52)}, url('${imgOrGradient}')`;
      body.style.backgroundImage = v;
      html.style.backgroundImage = v;
      body.style.backgroundSize = "cover";
      html.style.backgroundSize = "cover";
      body.style.backgroundAttachment = "fixed";
      html.style.backgroundAttachment = "fixed";
      body.style.backgroundRepeat = "no-repeat";
      html.style.backgroundRepeat = "no-repeat";
    }else{
      body.style.background = imgOrGradient;
      html.style.background = imgOrGradient;
    }
  };

  if(name==="dark"){
    applyBG("themes/dark.jpg", true);
  }else if(name==="light"){
    applyBG(`linear-gradient(135deg,#f6f7fb,#e8eefc)`, false);
  }else if(name==="forest"){
    applyBG("themes/forest.jpg", true);
  }else if(name==="ocean"){
    applyBG("themes/ocean.jpg", true);
  }else if(name==="sunset"){
    applyBG("themes/sunset.jpg", true);
  }else if(name==="neon"){
    applyBG(
      `radial-gradient(1000px 600px at 80% 10%, #311a6b 0%, transparent 55%),
       radial-gradient(900px 700px at 15% 80%, #063a6a 0%, transparent 55%),
       linear-gradient(135deg,#0a0f24,#121a3b)`, false
    );
  }else if(name==="custom" && customDataURL){
    applyBG(customDataURL, true);
  }
}

/* ---------- Başlat ---------- */
(function init(){
  bindUI();
  startLiveClock();

  // Stats ekranına ilk gelişte dropdown boş kalmasın
  if(qSubjectSelect && !qSubjectSelect.options.length){
    fillSubjectSelect(qSubjectSelect);
  }

  // Kum saati animasyon döngüsü
  if(hg && hgCanvas){ hg.start(); }

  // auth state => onCloudAuth
})();
