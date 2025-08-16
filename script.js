/* ===================== AUTH (yerel hesaplar) ===================== */
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

tabLogin.onclick = ()=>{ tabLogin.classList.add("active"); tabRegister.classList.remove("active"); loginPane.classList.remove("hidden"); registerPane.classList.add("hidden"); };
tabRegister.onclick = ()=>{ tabRegister.classList.add("active"); tabLogin.classList.remove("active"); registerPane.classList.remove("hidden"); loginPane.classList.add("hidden"); };

function getUserDB(){ try{ return JSON.parse(localStorage.getItem("usersDB")) || {}; }catch{ return {}; } }
function setUserDB(db){ localStorage.setItem("usersDB", JSON.stringify(db)); }
function setCurrentUser(u){ CURRENT_USER = u; localStorage.setItem("currentUser", u || ""); refreshAuthUI(); }
function getCurrentUser(){ const u = localStorage.getItem("currentUser") || ""; return u || null; }

async function sha256Hex(str){
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function randomSalt(len=16){
  const arr=new Uint8Array(len); crypto.getRandomValues(arr);
  return Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function registerUser(){
  const u = (regUser.value||"").trim();
  const p1= regPass.value||"", p2 = regPass2.value||"";
  if(u.length<3) return showToast({title:"Hata", message:"Kullanıcı adı en az 3 karakter olmalı.", variant:"info"});
  if(p1.length<4) return showToast({title:"Hata", message:"Şifre en az 4 karakter olmalı.", variant:"info"});
  if(p1!==p2) return showToast({title:"Hata", message:"Şifreler uyuşmuyor.", variant:"info"});
  const db = getUserDB();
  if(db[u]) return showToast({title:"Hata", message:"Bu kullanıcı adı alınmış.", variant:"info"});
  const salt = randomSalt();
  const hash = await sha256Hex(salt + p1);
  db[u] = { salt, hash, createdAt: Date.now() };
  setUserDB(db);
  showToast({title:"Kayıt başarılı", message:"Giriş yapabilirsiniz.", variant:"success"});
  tabLogin.click();
  loginUser.value = u; loginPass.value = "";
}

async function loginUserFn(){
  const u = (loginUser.value||"").trim();
  const p = loginPass.value||"";
  const db = getUserDB();
  const rec = db[u];
  if(!rec) return showToast({title:"Hata", message:"Kullanıcı bulunamadı.", variant:"info"});
  const hash = await sha256Hex(rec.salt + p);
  if(hash!==rec.hash) return showToast({title:"Hata", message:"Şifre hatalı.", variant:"info"});
  setCurrentUser(u);
  showToast({title:"Hoş geldin", message:`${u} olarak giriş yapıldı.`, variant:"success"});
  showView("home");
  initAfterLogin();
}
loginBtn.onclick = loginUserFn;
registerBtn.onclick = registerUser;
logoutBtn.onclick = ()=>{
  setCurrentUser(null);
  showView("auth");
};

function refreshAuthUI(){
  const logged = !!CURRENT_USER;
  userBadge.classList.toggle("hidden", !logged);
  if(logged) userNameLabel.textContent = CURRENT_USER;
  [viewAuth, viewHome, viewPomodoro, viewStats, viewSort, viewPrefs]
    .forEach(v=>v.classList.remove("active"));
  if(logged) viewHome.classList.add("active");
  else viewAuth.classList.add("active");
}

/* ===================== SPA & UYGULAMA ===================== */
const viewHome = document.getElementById("viewHome");
const viewPomodoro = document.getElementById("viewPomodoro");
const viewStats = document.getElementById("viewStats");
const viewSort = document.getElementById("viewSort");
const viewPrefs = document.getElementById("viewPrefs");
const backBtn = document.getElementById("backBtn");
const titleText = document.getElementById("titleText");

document.getElementById("navPomodoro").addEventListener("click",()=>showView("pomodoro"));
document.getElementById("navStats").addEventListener("click",()=>{showView("stats"); renderStatsUI();});
document.getElementById("navQuickAdd").addEventListener("click",()=>{showView("stats"); renderStatsUI(true);});
document.getElementById("navRanking").addEventListener("click",()=>showView("sort"));
document.getElementById("navSettings").addEventListener("click",()=>showView("prefs"));
backBtn.addEventListener("click",()=>showView("home"));

function showView(name){
  if(!CURRENT_USER){
    viewAuth.classList.add("active");
    viewHome.classList.remove("active"); viewPomodoro.classList.remove("active");
    viewStats.classList.remove("active"); viewSort.classList.remove("active"); viewPrefs.classList.remove("active");
    backBtn.classList.add("hidden"); titleText.textContent="Ders & Mola Takip"; return;
  }
  [viewHome, viewPomodoro, viewStats, viewSort, viewPrefs, viewAuth].forEach(v=>v.classList.remove("active"));
  if(name==="home"){viewHome.classList.add("active");backBtn.classList.add("hidden");titleText.textContent="Ders & Mola Takip";}
  if(name==="pomodoro"){viewPomodoro.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Pomodoro";}
  if(name==="stats"){viewStats.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="İstatistikler";}
  if(name==="sort"){viewSort.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Sıralama";}
  if(name==="prefs"){viewPrefs.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Ayarlar";}
}
function initAfterLogin(){
  updateRoundSetLabels(); initTimerAtMode(); refreshTotals(); renderWeekChart();
}

/* ---------- ZAMANLAYICI DURUMLARI ---------- */
let timer=null,timeLeft=0,isStudy=true,isLongBreak=false,paused=false;
let studySec=50*60,breakSec=10*60,longBreakSec=60*60;
let totalRounds=4,totalSets=3,completedRounds=0,completedSets=0;
let soundOn=true,alarmOn=true,awaitingAck=false,alarmAudio=null,alarmActive=false;

/* ---------- DOM ---------- */
const el=id=>document.getElementById(id);
const statusEl=el("status"),timeDisplay=el("timeDisplay");
const startBtn=el("startBtn"),pauseBtn=el("pauseBtn"),resetBtn=el("resetBtn");
let stopSoundBtn=el("stopSoundBtn"),skipBreakBtn=el("skipBreakBtn");
const saveSettingsBtn=el("saveSettings"),toastContainer=el("toastContainer");
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
  SUBJECTS.forEach(s=>{ const o=document.createElement("option"); o.textContent=s; sel.appendChild(o); });
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
function showToast({title="Bilgi",message="",variant="info",timeout=3000}={}){const w=document.createElement("div");w.className=`toast ${variant}`;w.innerHTML=`<span class="badge"></span><div class="content"><p class="title">${title}</p><p class="msg">${message}</p></div><button class="close">×</button>`;w.querySelector(".close").onclick=()=>w.remove();toastContainer.appendChild(w);if(timeout>0)setTimeout(()=>w.remove(),timeout);}

/* ---------- Kullanıcıya Özel Key ---------- */
function keyFor(base){ if(!CURRENT_USER) return base; return `${CURRENT_USER}:${base}`; }

/* ---------- Veri Depoları (USER-SCOPED) ---------- */
function getStudy(){try{return JSON.parse(localStorage.getItem(keyFor("studyData")))||{}}catch{return {}}}
function setStudy(o){localStorage.setItem(keyFor("studyData"),JSON.stringify(o))}
function addStudyMinutesTo(dateIso,minutes){if(minutes<=0)return;const d=getStudy();d[dateIso]=(d[dateIso]||0)+minutes;setStudy(d)}

function migrateQuestionsShape(obj){const out={};for(const k in obj){const v=obj[k];if(Array.isArray(v)) out[k]=v.filter(e=>e&&typeof e.count==="number"); else if(typeof v==="number") out[k]=[{subject:"Genel",count:v}]; else out[k]=[]}return out;}
function getQuestions(){try{const raw=JSON.parse(localStorage.getItem(keyFor("questionData")))||{};return migrateQuestionsShape(raw);}catch{return {}}}
function setQuestions(o){localStorage.setItem(keyFor("questionData"),JSON.stringify(o))}
function addQuestionsEntry(dateIso,subject,count){if(count<=0)return;const d=getQuestions();(d[dateIso]=d[dateIso]||[]).push({subject,count});setQuestions(d)}
function updateQuestionsEntry(dateIso,index,newCount){const d=getQuestions();if(!d[dateIso]||!d[dateIso][index])return;d[dateIso][index].count=Math.max(0,newCount|0);setQuestions(d)}
function removeQuestionsEntry(dateIso,index){const d=getQuestions();if(!d[dateIso])return;d[dateIso].splice(index,1);if(d[dateIso].length===0)delete d[dateIso];setQuestions(d)}

/* ---------- Ayarlar (USER-SCOPED) ---------- */
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
function saveSettings(){
  localStorage.setItem(keyFor("studySec"),String(studySec));
  localStorage.setItem(keyFor("breakSec"),String(breakSec));
  localStorage.setItem(keyFor("longBreakSec"),String(longBreakSec));
  localStorage.setItem(keyFor("totalRounds"),String(totalRounds));
  localStorage.setItem(keyFor("totalSets"),String(totalSets));
  localStorage.setItem(keyFor("soundOn"),JSON.stringify(soundOn));
  localStorage.setItem(keyFor("alarmOn"),JSON.stringify(alarmOn));
}

/* ---------- Eski toplam göstergeleri ---------- */
let weekChart = null;   // <-- YALNIZCA BURADA TANIMLI
function refreshTotals(){const data=getStudy(),today=todayKey();todayTotalEl.textContent=Math.round(data[today]||0);const weekDates=last7Dates();const weekSum=weekDates.reduce((s,d)=>s+(data[d]||0),0);weekTotalEl.textContent=Math.round(weekSum);}
function last7Dates(){const a=[],n=new Date();for(let i=6;i>=0;i--){const d=new Date(n);d.setDate(n.getDate()-i);a.push(todayKey(d));}return a;}
function renderWeekChart(){const d=getStudy();const labels=last7Dates();const values=labels.map(x=>+((d[x]||0)/60).toFixed(2));if(weekChart)weekChart.destroy();if(!weekChartCanvas)return;weekChart=new Chart(weekChartCanvas.getContext("2d"),{type:"bar",data:{labels:labels.map(x=>x.slice(5)),datasets:[{label:"Saat",data:values}]},options:{responsive:true,scales:{y:{beginAtZero:true}}}});}
function startLiveClock(){const t=()=>liveClock.textContent=new Date().toLocaleString();t();setInterval(t,1000);}

/* ---------- tik-tak & kum saati ---------- */
let audioCtx=null;
function tickSound(){if(!soundOn)return;try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="square";o.frequency.value=900;g.gain.setValueAtTime(0.001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.2,audioCtx.currentTime+0.001);g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.03);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.03);}catch{}}
function setHourglassProgress(p){hourglass?.style.setProperty("--p",Math.max(0,Math.min(1,p)));}
function updateRoundSetLabels(){roundLabel.textContent=`${completedRounds} / ${totalRounds}`;setLabel.textContent=`${completedSets} / ${totalSets}`;}

/* ---------- Alarm ---------- */
function playAlarm(){if(!alarmOn)return;try{if(!alarmAudio){alarmAudio=new Audio("japan-eas-alarm-277877.mp3");alarmAudio.preload="auto";alarmAudio.loop=true;}alarmAudio.pause();alarmAudio.currentTime=0;alarmAudio.loop=true;const pr=alarmAudio.play();if(pr&&pr.catch)pr.catch(()=>{});alarmActive=true;updateControlsVisibility();}catch{}}
function stopAlarm(){try{if(alarmAudio){alarmAudio.pause();alarmAudio.currentTime=0;alarmAudio.loop=false;}}catch{} alarmActive=false;updateControlsVisibility();}
function updateControlsVisibility(){document.getElementById("stopSoundBtn").classList.toggle('hidden',!alarmActive);const onBreak=!isStudy,running=(timer!==null),canShow=(!awaitingAck)&&onBreak&&running;document.getElementById("skipBreakBtn").classList.toggle('hidden',!canShow);}

/* ---------- Ayarlar UI ---------- */
function applySettingsToUI(){
  studyMinInput.value=Math.floor(studySec/60);studySecInput.value=studySec%60;
  breakMinInput.value=Math.floor(breakSec/60);breakSecInput.value=breakSec%60;
  longBreakMinInput.value=Math.floor(longBreakSec/60);longBreakSecInput.value=longBreakSec%60;
  roundsInput.value=totalRounds;setsInput.value=totalSets;
  soundToggle.checked=soundOn;alarmToggle.checked=alarmOn;updateRoundSetLabels();
}

/* ---------- Akış ---------- */
function updateDisplay(){timeLeft=Math.max(0,timeLeft);timeDisplay.textContent=fmt(timeLeft);const total=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);setHourglassProgress(1-(timeLeft/(total||1)));updateControlsVisibility();}
function initTimerAtMode(){const total=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);timeLeft=total;updateDisplay();statusEl.textContent="Hazır";startBtn.disabled=awaitingAck;updateControlsVisibility();}
function startTimer(){
  if(awaitingAck||timer!==null)return;
  if(!paused){timeLeft=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);}
  paused=false; statusEl.textContent=isStudy?"Ders Zamanı":(isLongBreak?"Uzun Mola":"Kısa Mola");
  startBtn.disabled=true; tickSound(); updateControlsVisibility();
  timer=setInterval(()=>{
    timeLeft--; updateDisplay(); tickSound();
    if(timeLeft<=0){
      clearInterval(timer); timer=null; updateControlsVisibility();
      if(isStudy){
        completedRounds++; updateRoundSetLabels();
        addStudyMinutesTo(todayKey(),Math.round(studySec/60)); refreshTotals(); playAlarm();
        showToast({title:"Tebrikler!",message:"Dersi başarıyla tamamladınız.",variant:"success",timeout:4000});
        awaitingAck=true; statusEl.textContent="Ders bitti! Zili sustur, sonra mola başlayacak."; startBtn.disabled=true; return;
      }
      // break bitti
      isStudy=true; isLongBreak=false; paused=false; initTimerAtMode(); startTimer();
    }
  },1000);
}
function pauseTimer(){ if(timer===null)return; clearInterval(timer); timer=null; paused=true; statusEl.textContent="Duraklatıldı"; startBtn.disabled=awaitingAck; updateControlsVisibility(); }
function resetTimer(){
  if(timer!==null){clearInterval(timer);timer=null;}
  stopAlarm(); awaitingAck=false; paused=false;
  completedRounds=0; completedSets=0; isStudy=true; isLongBreak=false;
  updateRoundSetLabels(); initTimerAtMode(); updateControlsVisibility();
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

  stopSoundBtn.addEventListener("click",()=>{
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
  skipBreakBtn.addEventListener("click",()=>{
    if(isStudy) return;
    if(timer!==null){clearInterval(timer);timer=null;}
    isStudy=true; isLongBreak=false; paused=false; initTimerAtMode(); startTimer();
  });

  soundToggle.addEventListener("change",e=>{soundOn=e.target.checked;localStorage.setItem(keyFor("soundOn"),JSON.stringify(soundOn));});
  alarmToggle.addEventListener("change",e=>{alarmOn=e.target.checked;localStorage.setItem(keyFor("alarmOn"),JSON.stringify(alarmOn));});
}

/* ---------- İSTATİSTİKLER ---------- */
let statsChart=null;
function setActiveSeg(group,active){group.forEach(b=>b.classList.remove("active"));active.classList.add("active");}
function renderStatsUI(focusAdd=false){
  metricTimeBtn.onclick = ()=>{statsMetric="time";setActiveSeg([metricTimeBtn,metricQuestionsBtn],metricTimeBtn);renderStats();};
  metricQuestionsBtn.onclick = ()=>{statsMetric="questions";setActiveSeg([metricTimeBtn,metricQuestionsBtn],metricQuestionsBtn);renderStats();};
  rangeWeekBtn.onclick = ()=>{statsRange="week";setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn],rangeWeekBtn);renderStats();};
  rangeMonthBtn.onclick= ()=>{statsRange="month";setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn],rangeMonthBtn);renderStats();};
  rangeYearBtn.onclick = ()=>{statsRange="year";setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn],rangeYearBtn);renderStats();};

  fillSubjectSelect(qSubjectSelect);
  qDateInput.value=todayKey();
  qSaveBtn.onclick=()=>{
    const d=qDateInput.value||todayKey();
    const subj=qSubjectSelect.value;
    const n=Math.max(0,parseInt(qCountInput.value)||0);
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
  statsChart=new Chart(statsChartCanvas.getContext("2d"),{
    type:"bar",
    data:{labels,datasets:[{label:metricIsTime?"Saat":"Soru",data:values}]},
    options:{responsive:true,scales:{y:{beginAtZero:true}}}
  });

  statsList.innerHTML="";
  listItems.forEach(t=>{const li=document.createElement("li");li.textContent=t;statsList.appendChild(li);});
}

/* ---- Soru kayıtları: satır içi düzenleme ---- */
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

/* ---------- Başlat ---------- */
(function init(){
  CURRENT_USER = getCurrentUser();
  refreshAuthUI();
  bindUI();
  startLiveClock();
  if(CURRENT_USER){
    loadSettings();
    updateRoundSetLabels(); initTimerAtMode(); refreshTotals(); renderWeekChart();
  }
})();
