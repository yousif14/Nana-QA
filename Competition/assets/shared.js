// Competition/assets/shared.js
// Shared utilities: Firebase init, timer engine, sound effects, helpers

// ===== Firebase Init =====
const CFG = window.COMP_CONFIG;
const app = firebase.initializeApp(CFG.firebase);
const db = firebase.database();

function gameRef(gameCode) {
  return db.ref("games/" + gameCode);
}

// ===== Utility =====
function el(id) { return document.getElementById(id); }

function generateGameCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function generateTeamId() {
  return "t_" + Date.now() + "_" + Math.random().toString(36).substr(2, 5);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ===== Google Sheets CSV Fetch =====
async function fetchQuestionsFromSheet(csvUrl) {
  var res = await fetch(csvUrl);
  if (!res.ok) throw new Error("Failed to fetch sheet: " + res.status);
  var csv = await res.text();
  return parseCSV(csv);
}

function parseCSV(csv) {
  var lines = csv.split("\n").map(function(line) { return parseCSVLine(line); });
  if (lines.length < 2) return [];
  var questions = [];
  for (var i = 1; i < lines.length; i++) {
    var cols = lines[i];
    if (!cols[0] || !cols[0].trim()) continue;
    questions.push({
      question: (cols[0] || "").trim(),
      a: (cols[1] || "").trim(),
      b: (cols[2] || "").trim(),
      c: (cols[3] || "").trim(),
      d: (cols[4] || "").trim(),
      correct: (cols[5] || "").trim(),
      perfect: (cols[6] || "").trim(),
      type: (cols[7] || "").trim()
    });
  }
  return questions;
}

function parseCSVLine(line) {
  var result = [];
  var current = "";
  var inQuotes = false;
  for (var i = 0; i < line.length; i++) {
    var ch = line[i];
    if (ch === "\r") continue; // skip carriage returns
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

// ===== Timer Engine =====
function TimerEngine(onTick, onEnd) {
  this.onTick = onTick;
  this.onEnd = onEnd;
  this.rafId = null;
  this.endAt = 0;
  this.duration = 0;
  this.stopped = false;
  this.ended = false;
}

TimerEngine.prototype.start = function(endAt, duration) {
  this.endAt = endAt;
  this.duration = duration;
  this.stopped = false;
  this.ended = false;
  var self = this;
  function tick() {
    if (self.stopped || self.ended) return;
    var now = Date.now();
    var remaining = Math.max(0, self.endAt - now);
    var seconds = Math.ceil(remaining / 1000);
    var fraction = remaining / (self.duration * 1000);
    self.onTick(seconds, fraction);
    if (remaining <= 0) {
      self.ended = true;
      self.onEnd();
      return;
    }
    self.rafId = requestAnimationFrame(tick);
  }
  tick();
};

TimerEngine.prototype.stop = function() {
  this.stopped = true;
  if (this.rafId) cancelAnimationFrame(this.rafId);
};

TimerEngine.prototype.destroy = function() {
  this.stopped = true;
  if (this.rafId) cancelAnimationFrame(this.rafId);
};

TimerEngine.prototype.getElapsed = function() {
  var startAt = this.endAt - this.duration * 1000;
  return (Date.now() - startAt) / 1000;
};

// ===== Sound Effects (Web Audio API) =====
var AudioCtx = window.AudioContext || window.webkitAudioContext;
var audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playBell() {
  var ctx = getAudioCtx();
  [880, 660].forEach(function(freq, i) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.8);
  });
}

function playCorrect() {
  var ctx = getAudioCtx();
  [523, 659, 784].forEach(function(freq, i) {
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.5);
  });
}

// ===== Confetti =====
function launchConfetti(container, count) {
  if (!container) return;
  var colors = ["#D4AF37", "#F06292", "#7B1FA2", "#4CAF50", "#FF9800", "#2196F3"];
  for (var i = 0; i < count; i++) {
    var piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.setProperty("--dur", (2 + Math.random() * 3) + "s");
    piece.style.setProperty("--delay", (Math.random() * 1.5) + "s");
    piece.style.width = (6 + Math.random() * 8) + "px";
    piece.style.height = (6 + Math.random() * 8) + "px";
    piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    container.appendChild(piece);
  }
  setTimeout(function() { container.innerHTML = ""; }, 6000);
}

// ===== Timer SVG Renderer =====
function renderTimerSVG(seconds, fraction, warning) {
  var circumference = 2 * Math.PI * 30; // r=30
  var offset = circumference * (1 - fraction);
  return '<div class="timer-wrap">' +
    '<svg class="timer-svg" viewBox="0 0 70 70">' +
    '<circle class="timer-bg" cx="35" cy="35" r="30"/>' +
    '<circle class="timer-ring ' + (warning ? 'warning' : '') + '" cx="35" cy="35" r="30" ' +
    'stroke-dasharray="' + circumference + '" stroke-dashoffset="' + offset + '"/>' +
    '</svg>' +
    '<span class="timer-text ' + (warning ? 'warning' : '') + '">' + seconds + '</span>' +
    '</div>';
}

// ===== Scoring Calculator =====
function calculateScoring(answers, correctAnswer, questionType, questionStartTime) {
  var scoringTiers = CFG.scoring; // [5, 4, 3, 2]
  var results = [];

  var entries = Object.keys(answers || {}).map(function(teamId) {
    return { teamId: teamId, data: answers[teamId] };
  });

  entries.forEach(function(entry) {
    var isCorrect;
    if (questionType === "Single-Choice") {
      isCorrect = entry.data.answer && entry.data.answer.toUpperCase() === correctAnswer.toUpperCase();
    } else {
      isCorrect = !!entry.data.correct;
    }
    results.push({
      teamId: entry.teamId,
      isCorrect: isCorrect,
      timestamp: entry.data.timestamp || 0,
      answer: entry.data.answer
    });
  });

  // Sort correct answers by timestamp (earliest first)
  var correct = results.filter(function(r) { return r.isCorrect; })
    .sort(function(a, b) { return a.timestamp - b.timestamp; });
  var wrong = results.filter(function(r) { return !r.isCorrect; });

  var scoring = [];
  correct.forEach(function(r, i) {
    var points = i < scoringTiers.length ? scoringTiers[i] : 1;
    var elapsed = questionStartTime ? ((r.timestamp - questionStartTime) / 1000).toFixed(2) : null;
    scoring.push({ teamId: r.teamId, points: points, rank: i + 1, answer: r.answer, timestamp: r.timestamp, elapsed: elapsed });
  });
  wrong.forEach(function(r) {
    var elapsed = questionStartTime ? ((r.timestamp - questionStartTime) / 1000).toFixed(2) : null;
    scoring.push({ teamId: r.teamId, points: 0, rank: -1, answer: r.answer, timestamp: r.timestamp, elapsed: elapsed });
  });

  return scoring;
}

// ===== HTML Escape =====
function escapeHtml(str) {
  var div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}
