// ------------------------------
// Durum / Değişkenler
// ------------------------------
let timer = null;            // aktif setInterval (tek adet!)
let timeLeft = 0;            // saniye
let isStudy = true;          // true: ders, false: mola
let paused = false;          // duraklatılmış mı
let studyTime = 50;          // dakika (ayar)
let breakTime = 20;          // dakika (ayar)
let soundOn = true;          // tik-tak
let weekChart = null;        // Chart.js örneği

// DOM
const el = id => document.getElementById(id);
const statusEl = el("status");
const timeDisplay = el("timeDisplay");
const startBtn = el("startBtn");
const pauseBtn = el("pauseBtn");
const resetBtn = el("resetBtn");
const saveSettingsBtn = el("saveSettings");
const studyInput = el("studyTime");
const breakInput = el("breakTime");
const todayTotalEl = el("todayTotal");
const weekTotalEl = el("weekTotal");
const weekChartCanvas = el("weekChart");
const liveClock = el("liveClock");
const hourglass = el("hourglass");
const soundToggle = el("soundToggle");

// ------------------------------
// Yardımcılar
// ------------------------------
const fmt = s => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};
const todayKey = (d=new Date()) => d.toISOString().slice(0,10);

// localStorage: gün -> dakika
function getData(){
  try { return JSON.parse(localStorage.getItem("studyData")) || {}; }
  catch { return {}; }
}
function setData(obj){ localStorage.setItem("studyData", JSON.stringify(obj)); }

function addStudyMinutesTo(dateIso, minutes){
  if(minutes <= 0) return;
  const data = getData();
  data[dateIso] = (data[dateIso] || 0) + minutes;
  setData(data);
}

// Bugün/Hafta toplamlarını güncelle
function refreshTotals(){
  const data = getData();
  const today = todayKey();
  const todayMin = Math.round(data[today] || 0);
  todayTotalEl.textContent = todayMin;

  // Son 7 gün toplam
  const weekDates = last7Dates();
  const weekSum = weekDates.reduce((sum, d) => sum + (data[d] || 0), 0);
  weekTotalEl.textContent = Math.round(weekSum);
}

// Son 7 gün YYYY-MM-DD dizisi
function last7Dates(){
  const arr = [];
  const now = new Date();
  for(let i=6;i>=0;i--){
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    arr.push(todayKey(d));
  }
  return arr;
}

// Grafik
function renderWeekChart(){
  const data = getData();
  const labels = last7Dates();
  const values = labels.map(d => +((data[d] || 0) / 60).toFixed(2)); // saat
  if(weekChart) weekChart.destroy();
  weekChart = new Chart(weekChartCanvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels.map(d => d.slice(5)), // MM-DD göster
      datasets: [{ label: "Saat", data: values }]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

// Saat gösterimi
function startLiveClock(){
  const tick = () => {
    const now = new Date();
    liveClock.textContent = now.toLocaleString();
  };
  tick();
  setInterval(tick, 1000);
}

// Kum saati: ilerleme (0..1)
function setHourglassProgress(p){
  hourglass.style.setProperty("--p", Math.max(0, Math.min(1, p)));
}

// WebAudio tik-tak
let audioCtx = null;
function tickSound(){
  if(!soundOn) return;
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "square";
    o.frequency.value = 900;           // kısa klik
    g.gain.setValueAtTime(0.001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.2, audioCtx.currentTime + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.03);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.03);
  }catch(e){ /* sessizce geç */ }
}

// ------------------------------
// Ana Akış
// ------------------------------
function updateDisplay(){
  timeDisplay.textContent = fmt(timeLeft);
  const total = (isStudy ? studyTime : breakTime) * 60 || 1;
  const progress = 1 - (timeLeft / total); // 0..1
  setHourglassProgress(progress);
}

function applySettingsToUI(){
  studyInput.value = studyTime;
  breakInput.value = breakTime;
  soundToggle.checked = soundOn;
}

function loadSettings(){
  studyTime = parseInt(localStorage.getItem("studyTime")) || 50;
  breakTime = parseInt(localStorage.getItem("breakTime")) || 20;
  soundOn = JSON.parse(localStorage.getItem("soundOn") ?? "true");
  applySettingsToUI();
}

function saveSettings(){
  localStorage.setItem("studyTime", String(studyTime));
  localStorage.setItem("breakTime", String(breakTime));
  localStorage.setItem("soundOn", JSON.stringify(soundOn));
}

function initTimerAtMode(){
  timeLeft = (isStudy ? studyTime : breakTime) * 60;
  updateDisplay();
  statusEl.textContent = "Hazır";
  startBtn.disabled = false;
}

function startTimer(){
  // ÇİFT START KORUMASI: Zaten çalışıyorsa hiçbir şey yapma
  if(timer !== null) return;

  // Eğer duraklatılmış değilse süreyi mod’a göre baştan kur
  if(!paused){
    timeLeft = (isStudy ? studyTime : breakTime) * 60;
  }
  paused = false;

  statusEl.textContent = isStudy ? "Ders Zamanı" : "Mola Zamanı";
  startBtn.disabled = true;      // Start tekrar basılmasın
  tickSound();                   // ilk saniye klik

  timer = setInterval(() => {
    timeLeft--;
    updateDisplay();
    tickSound();

    if(timeLeft <= 0){
      clearInterval(timer);
      timer = null;

      // Ders oturumu bittiyse istatistiğe ekle
      if(isStudy){
        addStudyMinutesTo(todayKey(), studyTime);
        refreshTotals();
        renderWeekChart();
      }

      // Otomatik mod değişimi
      isStudy = !isStudy;
      paused = false; // yeni moda taze başlangıç
      initTimerAtMode(); // yeni modda hazır süreyi göster
      startTimer();      // otomatik başlat (istersen bu satırı yoruma al)
    }
  }, 1000);
}

function pauseTimer(){
  if(timer === null) return;     // çalışmıyorsa
  clearInterval(timer);
  timer = null;
  paused = true;
  statusEl.textContent = "Duraklatıldı";
  startBtn.disabled = false;     // devam için tekrar basılabilir
}

function resetTimer(){
  // Tüm interval'ı temizle, kendi kendine başlamasın
  if(timer !== null){
    clearInterval(timer);
    timer = null;
  }
  paused = false;
  initTimerAtMode();             // modun varsayılan süresine dön
}

function bindUI(){
  // Ayar kaydet
  saveSettingsBtn.addEventListener("click", () => {
    studyTime = Math.max(1, parseInt(studyInput.value) || 1);
    breakTime = Math.max(1, parseInt(breakInput.value) || 1);
    soundOn = !!soundToggle.checked;
    saveSettings();
    // Çalışmıyorsa ekranda yeni süre göster
    if(timer === null && !paused){
      initTimerAtMode();
    }
  });

  startBtn.addEventListener("click", startTimer);
  pauseBtn.addEventListener("click", pauseTimer);
  resetBtn.addEventListener("click", resetTimer);
  soundToggle.addEventListener("change", (e)=>{ soundOn = e.target.checked; saveSettings(); });
}

// ------------------------------
// Başlat
// ------------------------------
(function init(){
  loadSettings();
  bindUI();
  initTimerAtMode();
  refreshTotals();
  renderWeekChart();
  startLiveClock();
})();
