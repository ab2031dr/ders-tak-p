/* ---------- SPA: görünüm ---------- */
const viewHome = document.getElementById("viewHome");
const viewPomodoro = document.getElementById("viewPomodoro");
const viewStats = document.getElementById("viewStats");
const backBtn = document.getElementById("backBtn");
const titleText = document.getElementById("titleText");
document.getElementById("navPomodoro").addEventListener("click",()=>showView("pomodoro"));
document.getElementById("navStats").addEventListener("click",()=>{showView("stats"); renderStatsUI();});
backBtn.addEventListener("click",()=>showView("home"));
function showView(name){
  [viewHome, viewPomodoro, viewStats].forEach(v=>v.classList.remove("active"));
  if(name==="home"){viewHome.classList.add("active");backBtn.classList.add("hidden");titleText.textContent="Ders & Mola Takip";}
  if(name==="pomodoro"){viewPomodoro.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="Pomodoro";}
  if(name==="stats"){viewStats.classList.add("active");backBtn.classList.remove("hidden");titleText.textContent="İstatistikler";}
}
showView("home");

/* ---------- Zamanlayıcı durumları ---------- */
let timer=null,timeLeft=0,isStudy=true,isLongBreak=false,paused=false;
let studySec=50*60,breakSec=10*60,longBreakSec=60*60;
let totalRounds=4,totalSets=3,completedRounds=0,completedSets=0;
let soundOn=true,alarmOn=true,awaitingAck=false,alarmAudio=null,alarmActive=false,weekChart=null;

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

/* ---------- Stats DOM ---------- */
const statsChartCanvas = document.getElementById("statsChart");
const metricTimeBtn = document.getElementById("metricTime");
const metricQuestionsBtn = document.getElementById("metricQuestions");
const rangeWeekBtn = document.getElementById("rangeWeek");
const rangeMonthBtn = document.getElementById("rangeMonth");
const rangeYearBtn = document.getElementById("rangeYear");
const statsList = document.getElementById("statsList");
const listTitle = document.getElementById("listTitle");
const qDateInput = document.getElementById("qDate");
const qCountInput = document.getElementById("qCount");
const qSaveBtn = document.getElementById("qSaveBtn");

let statsMetric = "time";   // "time" | "questions"
let statsRange = "week";    // "week" | "month" | "year"
let statsChart = null;

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
function showToast({title="Bilgi",message="",variant="info",timeout=3000}={}){const w=document.createElement("div");w.className=`toast ${variant}`;
  w.innerHTML=`<span class="badge"></span><div class="content"><p class="title">${title}</p><p class="msg">${message}</p></div><button class="close">×</button>`;
  w.querySelector(".close").onclick=()=>w.remove();toastContainer.appendChild(w);if(timeout>0)setTimeout(()=>w.remove(),timeout);}

/* veri depoları */
function getStudy(){try{return JSON.parse(localStorage.getItem("studyData"))||{}}catch{return {}}}
function setStudy(o){localStorage.setItem("studyData",JSON.stringify(o))}
function addStudyMinutesTo(dateIso,minutes){if(minutes<=0)return;const d=getStudy();d[dateIso]=(d[dateIso]||0)+minutes;setStudy(d)}

function getQuestions(){try{return JSON.parse(localStorage.getItem("questionData"))||{}}catch{return {}}}
function setQuestions(o){localStorage.setItem("questionData",JSON.stringify(o))}
function addQuestionsTo(dateIso,count){if(count<=0)return;const d=getQuestions();d[dateIso]=(d[dateIso]||0)+count;setQuestions(d)}

/* toplamlar / grafik (eski) */
function refreshTotals(){
  const data=getStudy(),today=todayKey();todayTotalEl.textContent=Math.round(data[today]||0);
  const weekDates=last7Dates();const weekSum=weekDates.reduce((s,d)=>s+(data[d]||0),0);weekTotalEl.textContent=Math.round(weekSum);
}
function last7Dates(){const a=[];const n=new Date();for(let i=6;i>=0;i--){const d=new Date(n);d.setDate(n.getDate()-i);a.push(todayKey(d))}return a}
function renderWeekChart(){const d=getStudy();const labels=last7Dates();const values=labels.map(x=>+((d[x]||0)/60).toFixed(2));
  if(weekChart)weekChart.destroy();if(!weekChartCanvas)return;
  weekChart=new Chart(weekChartCanvas.getContext("2d"),{type:"bar",data:{labels:labels.map(x=>x.slice(5)),datasets:[{label:"Saat",data:values}]},
    options:{responsive:true,scales:{y:{beginAtZero:true}}}});
}
function startLiveClock(){const t=()=>liveClock.textContent=new Date().toLocaleString();t();setInterval(t,1000)}

/* tik-tak */
let audioCtx=null;function tickSound(){if(!soundOn)return;try{if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type="square";o.frequency.value=900;
  g.gain.setValueAtTime(0.001,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(0.2,audioCtx.currentTime+0.001);g.gain.exponentialRampToValueAtTime(0.0001,audioCtx.currentTime+0.03);
  o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+0.03);}catch{}}

function setHourglassProgress(p){hourglass?.style.setProperty("--p",Math.max(0,Math.min(1,p)))}
function updateRoundSetLabels(){roundLabel.textContent=`${completedRounds} / ${totalRounds}`;setLabel.textContent=`${completedSets} / ${totalSets}`}

/* alarm */
function playAlarm(){if(!alarmOn)return;try{if(!alarmAudio){alarmAudio=new Audio("japan-eas-alarm-277877.mp3");alarmAudio.preload="auto";alarmAudio.loop=true;}
  alarmAudio.pause();alarmAudio.currentTime=0;alarmAudio.loop=true;const pr=alarmAudio.play();if(pr&&pr.catch)pr.catch(()=>{});alarmActive=true;updateControlsVisibility();}catch{}}
function stopAlarm(){try{if(alarmAudio){alarmAudio.pause();alarmAudio.currentTime=0;alarmAudio.loop=false;}}catch{} alarmActive=false;updateControlsVisibility();}
function updateControlsVisibility(){document.getElementById("stopSoundBtn").classList.toggle('hidden',!alarmActive);
  const onBreak=!isStudy, running=(timer!==null), canShow=(!awaitingAck)&&onBreak&&running;
  document.getElementById("skipBreakBtn").classList.toggle('hidden',!canShow);}

/* ayar yükle/kaydet */
function applySettingsToUI(){
  studyMinInput.value=Math.floor(studySec/60);studySecInput.value=studySec%60;
  breakMinInput.value=Math.floor(breakSec/60);breakSecInput.value=breakSec%60;
  longBreakMinInput.value=Math.floor(longBreakSec/60);longBreakSecInput.value=longBreakSec%60;
  roundsInput.value=totalRounds;setsInput.value=totalSets;
  soundToggle.checked=soundOn;alarmToggle.checked=alarmOn;updateRoundSetLabels();
}
function loadSettings(){
  studySec=parseInt(localStorage.getItem("studySec"))||(50*60);
  breakSec=parseInt(localStorage.getItem("breakSec"))||(10*60);
  longBreakSec=parseInt(localStorage.getItem("longBreakSec"))||(60*60);
  totalRounds=parseInt(localStorage.getItem("totalRounds"))||4;
  totalSets=parseInt(localStorage.getItem("totalSets"))||3;
  soundOn=JSON.parse(localStorage.getItem("soundOn")??"true");
  alarmOn=JSON.parse(localStorage.getItem("alarmOn")??"true");
  applySettingsToUI();
}
function saveSettings(){
  localStorage.setItem("studySec",String(studySec));
  localStorage.setItem("breakSec",String(breakSec));
  localStorage.setItem("longBreakSec",String(longBreakSec));
  localStorage.setItem("totalRounds",String(totalRounds));
  localStorage.setItem("totalSets",String(totalSets));
  localStorage.setItem("soundOn",JSON.stringify(soundOn));
  localStorage.setItem("alarmOn",JSON.stringify(alarmOn));
}

/* akış */
function updateDisplay(){timeLeft=Math.max(0,timeLeft);timeDisplay.textContent=fmt(timeLeft);
  const total=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);setHourglassProgress(1-(timeLeft/(total||1)));updateControlsVisibility();}
function initTimerAtMode(){const total=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);timeLeft=total;updateDisplay();statusEl.textContent="Hazır";startBtn.disabled=awaitingAck;updateControlsVisibility();}
function startTimer(){
  if(awaitingAck||timer!==null)return;if(!paused){timeLeft=isStudy?studySec:(isLongBreak?longBreakSec:breakSec);}
  paused=false;statusEl.textContent=isStudy?"Ders Zamanı":(isLongBreak?"Uzun Mola":"Kısa Mola");startBtn.disabled=true;tickSound();updateControlsVisibility();
  timer=setInterval(()=>{timeLeft--;updateDisplay();tickSound();
    if(timeLeft<=0){clearInterval(timer);timer=null;updateControlsVisibility();
      if(isStudy){completedRounds++;updateRoundSetLabels();addStudyMinutesTo(todayKey(),Math.round(studySec/60));refreshTotals();
        playAlarm();showToast({title:"Tebrikler!",message:"Dersi başarıyla tamamladınız.",variant:"success",timeout:4000});
        awaitingAck=true;statusEl.textContent="Ders bitti! Zili sustur, sonra mola başlayacak.";startBtn.disabled=true;return;}
      isStudy=true;isLongBreak=false;paused=false;initTimerAtMode();startTimer();}
  },1000);
}
function pauseTimer(){if(timer===null)return;clearInterval(timer);timer=null;paused=true;statusEl.textContent="Duraklatıldı";startBtn.disabled=awaitingAck;updateControlsVisibility();}
function resetTimer(){if(timer!==null){clearInterval(timer);timer=null;}stopAlarm();awaitingAck=false;paused=false;completedRounds=0;completedSets=0;isStudy=true;isLongBreak=false;updateRoundSetLabels();initTimerAtMode();updateControlsVisibility();}

/* UI */
function bindUI(){
  saveSettingsBtn.addEventListener("click",()=>{studySec=secs(studyMinInput,studySecInput);breakSec=secs(breakMinInput,breakSecInput);longBreakSec=secs(longBreakMinInput,longBreakSecInput);
    totalRounds=Math.max(1,parseInt(roundsInput.value)||1);totalSets=Math.max(1,parseInt(setsInput.value)||1);
    soundOn=!!soundToggle.checked;alarmOn=!!alarmToggle.checked;saveSettings();updateRoundSetLabels();if(timer===null&&!paused&&!awaitingAck)initTimerAtMode();});
  startBtn.addEventListener("click",startTimer);pauseBtn.addEventListener("click",pauseTimer);resetBtn.addEventListener("click",resetTimer);
  stopSoundBtn.addEventListener("click",()=>{if(!alarmActive&&!alarmAudio)return;stopAlarm();
    if(awaitingAck){if(completedRounds>=totalRounds){completedSets++;updateRoundSetLabels();
        if(completedSets>=totalSets){showToast({title:"Tebrikler!",message:"Hedefinize ulaştınız 🎉",variant:"info",timeout:5000});
          awaitingAck=false;statusEl.textContent="Turlar tamamlandı!";startBtn.disabled=false;isStudy=true;isLongBreak=false;initTimerAtMode();}
        else{awaitingAck=false;isStudy=false;isLongBreak=true;paused=false;completedRounds=0;updateRoundSetLabels();initTimerAtMode();startTimer();}}
      else{awaitingAck=false;isStudy=false;isLongBreak=false;paused=false;initTimerAtMode();startTimer();}}});
  skipBreakBtn.addEventListener("click",()=>{if(isStudy)return;if(timer!==null){clearInterval(timer);timer=null;}isStudy=true;isLongBreak=false;paused=false;initTimerAtMode();startTimer();});
  soundToggle.addEventListener("change",e=>{soundOn=e.target.checked;localStorage.setItem("soundOn",JSON.stringify(soundOn));});
  alarmToggle.addEventListener("change",e=>{alarmOn=e.target.checked;localStorage.setItem("alarmOn",JSON.stringify(alarmOn));});
}

/* ---------- İSTATİSTİKLER YENİ ---------- */
function setActiveSeg(groupBtns, activeBtn){
  groupBtns.forEach(b=>b.classList.remove("active")); activeBtn.classList.add("active");
}
function renderStatsUI(){
  // buton eventleri (bir kez bağla)
  metricTimeBtn.onclick=()=>{statsMetric="time"; setActiveSeg([metricTimeBtn,metricQuestionsBtn], metricTimeBtn); renderStats();}
  metricQuestionsBtn.onclick=()=>{statsMetric="questions"; setActiveSeg([metricTimeBtn,metricQuestionsBtn], metricQuestionsBtn); renderStats();}
  rangeWeekBtn.onclick=()=>{statsRange="week"; setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn], rangeWeekBtn); renderStats();}
  rangeMonthBtn.onclick=()=>{statsRange="month"; setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn], rangeMonthBtn); renderStats();}
  rangeYearBtn.onclick=()=>{statsRange="year"; setActiveSeg([rangeWeekBtn,rangeMonthBtn,rangeYearBtn], rangeYearBtn); renderStats();}

  // soru form default tarih
  qDateInput.value = todayKey();
  qSaveBtn.onclick = ()=>{
    const d = qDateInput.value || todayKey();
    const n = Math.max(0, parseInt(qCountInput.value)||0);
    addQuestionsTo(d, n);
    showToast({title:"Kaydedildi", message:`${d} için ${n} soru eklendi.`, variant:"success"});
    qCountInput.value="";
    renderStats();
  };

  renderStats();
}

function renderStats(){
  const study = getStudy();       // dakika
  const questions = getQuestions(); // adet

  let labels = [], values = [], listItems = [];
  const metricIsTime = (statsMetric==="time");

  if(statsRange==="week"){
    // Pazartesi..Pazar
    const now = new Date();
    const day = (now.getDay()+6)%7; // Pazartesi=0
    const monday = new Date(now); monday.setDate(now.getDate()-day);
    const names = ["Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi","Pazar"];
    for(let i=0;i<7;i++){
      const d = new Date(monday); d.setDate(monday.getDate()+i);
      const key = todayKey(d);
      labels.push(names[i]);
      const min = Math.round(study[key]||0);
      const hrs = +(min/60).toFixed(2);
      const qs = questions[key]||0;
      values.push(metricIsTime ? hrs : qs);
      listItems.push(metricIsTime ? `${names[i]} — ${hrs} saat` : `${names[i]} — ${qs} soru`);
    }
    listTitle.textContent = metricIsTime ? "Haftalık Çalışma" : "Haftalık Soru";
  }
  else if(statsRange==="month"){
    // Ay içi hafta toplamları (1-5)
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const first = new Date(y,m,1);
    const last = new Date(y,m+1,0);
    const weeks = [0,0,0,0,0]; // dk veya soru
    for(let d=1; d<=last.getDate(); d++){
      const cur = new Date(y,m,d);
      const key = todayKey(cur);
      const weekIndex = Math.floor((d-1)/7); // 0..4
      const add = metricIsTime ? (study[key]||0) : (questions[key]||0);
      weeks[weekIndex] += add;
    }
    labels = ["1. Hafta","2. Hafta","3. Hafta","4. Hafta","5. Hafta"];
    values = weeks.map(v => metricIsTime ? +(v/60).toFixed(2) : v);
    listItems = values.map((v,i)=> `${labels[i]} — ${metricIsTime? v+" saat" : v+" soru"}`);
    listTitle.textContent = metricIsTime ? "Aylık Çalışma (Haftalara göre)" : "Aylık Soru (Haftalara göre)";
  }
  else if(statsRange==="year"){
    // 12 ay toplamı
    const now = new Date();
    const y = now.getFullYear();
    const ayAd = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
    const sums = Array(12).fill(0);
    for(let month=0; month<12; month++){
      const daysInMonth = new Date(y, month+1, 0).getDate();
      for(let d=1; d<=daysInMonth; d++){
        const key = todayKey(new Date(y, month, d));
        const add = metricIsTime ? (study[key]||0) : (questions[key]||0);
        sums[month] += add;
      }
    }
    labels = ayAd;
    values = sums.map(v => metricIsTime ? +(v/60).toFixed(2) : v);
    listItems = values.map((v,i)=> `${labels[i]} — ${metricIsTime? v+" saat" : v+" soru"}`);
    listTitle.textContent = metricIsTime ? "Yıllık Çalışma (Aylara göre)" : "Yıllık Soru (Aylara göre)";
  }

  // çiz
  if(statsChart) statsChart.destroy();
  statsChart = new Chart(statsChartCanvas.getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ label: metricIsTime ? "Saat" : "Soru", data: values }] },
    options: { responsive:true, scales:{ y:{ beginAtZero:true } } }
  });

  // listeyi yaz
  statsList.innerHTML = "";
  listItems.forEach(t=>{
    const li = document.createElement("li");
    li.textContent = t;
    statsList.appendChild(li);
  });
}

/* ---------- Başlat ---------- */
(function init(){
  loadSettings(); bindUI();
  completedRounds=0; completedSets=0; isStudy=true; isLongBreak=false;
  updateRoundSetLabels(); initTimerAtMode(); refreshTotals(); renderWeekChart(); startLiveClock();
})();
