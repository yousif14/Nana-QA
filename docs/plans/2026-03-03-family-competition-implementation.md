# Family Cultural Competition - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a real-time family quiz competition where a host displays questions on a TV/projector while teams answer from their phones, with auto-scoring and Firebase sync.

**Architecture:** Pure HTML/CSS/JS (no framework) with Firebase Realtime Database for real-time sync. Two views: `host.html` for the TV/projector and `team.html` for team phones. Questions fetched from Google Sheets CSV export, shuffled, and stored in Firebase per game session.

**Tech Stack:** Vanilla HTML/CSS/JS, Firebase Realtime DB (v10 compat SDK via CDN), Google Sheets CSV export, QRCode.js for QR generation, Web Audio API for sounds.

**Reference files:**
- Theme source: `Form/assets/styles.css` (CSS variables, card styles, buttons, stars, lanterns)
- Theme HTML: `Form/index.html` (decorative SVGs for stars/lanterns)
- Design doc: `docs/plans/2026-03-03-family-competition-design.md`

---

### Task 1: Project Scaffolding & Config

**Files:**
- Create: `Competition/assets/config.js`

**Step 1: Create directory structure**

```bash
mkdir -p Competition/assets
```

**Step 2: Create config.js with Firebase + Sheets config**

Create `Competition/assets/config.js`:

```js
// Competition/assets/config.js
// IMPORTANT: Replace these with your actual Firebase project config.
// Go to https://console.firebase.google.com → Create Project → Realtime Database → Web App → Copy config
window.COMP_CONFIG = {
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.appspot.com",
    messagingSenderId: "000000000000",
    appId: "YOUR_APP_ID"
  },
  // Google Sheet ID extracted from URL
  // Sheet must be published: File → Share → Publish to the web → CSV
  sheetId: "1vzDrriZFXY5CZzwvkcK3RF4WZMoyh-4NhVAssStIW_A",
  // Timer durations in seconds
  timers: {
    "Single-Choice": 30,
    "Open-Answer": 60
  },
  // Scoring: index-based (0=1st correct, 1=2nd, 2=3rd, rest=1)
  scoring: [7, 5, 3]
};
```

**Step 3: Verify structure**

```bash
ls -R Competition/
```

Expected:
```
Competition/assets/config.js
```

---

### Task 2: Shared CSS — Competition Theme

**Files:**
- Create: `Competition/assets/styles.css`

**Step 1: Create styles.css**

This file reuses the exact CSS variables, card styles, button styles, star animations, and lantern animations from `Form/assets/styles.css`, plus adds competition-specific styles (timer ring, choices, scoreboard, answer reveal, transitions, confetti).

Create `Competition/assets/styles.css` with the following complete content:

```css
/* ================================
   BASE THEME — copied from Form/assets/styles.css
   ================================ */
:root{
  --bg:#FFF8E1;
  --card:#FFFFFF;
  --muted:#5D4037;
  --text:#1A237E;
  --line:rgba(212,175,55,.22);
  --accent:#F06292;
  --accent2:#D4AF37;
  --danger:#ef4444;
  --shadow: 0 18px 60px rgba(212,175,55,.12);
  --radius: 18px;
  --purple:#7B1FA2;
  --gold:#D4AF37;
  --pink:#F06292;
  --navy:#1A237E;
  --green:#4CAF50;
  --green-glow:rgba(76,175,80,.25);
}

*{box-sizing:border-box;margin:0;padding:0;}

body{
  margin:0;
  font-family:"Cairo", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  background:var(--bg);
  color:var(--text);
  line-height:1.75;
  min-height:100vh;
  min-height:100dvh;
}

/* ================================
   DECORATIVE — Stars & Lanterns (from Form)
   ================================ */
.stars-container{
  position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;
}
.star{
  position:absolute;width:6px;height:6px;border-radius:50%;
  background:var(--gold);box-shadow:0 0 6px rgba(212,175,55,.6);
  animation:twinkle var(--dur, 3s) ease-in-out var(--delay, 0s) infinite;opacity:0;
}
.star:nth-child(1){top:8%;left:12%;--dur:2.8s;--delay:0s;}
.star:nth-child(2){top:15%;left:75%;--dur:3.5s;--delay:0.4s;}
.star:nth-child(3){top:28%;left:42%;--dur:2.5s;--delay:1.2s;}
.star:nth-child(4){top:5%;left:55%;--dur:4s;--delay:0.8s;}
.star:nth-child(5){top:35%;left:88%;--dur:3.2s;--delay:1.6s;}
.star:nth-child(6){top:22%;left:25%;--dur:2.9s;--delay:2s;}
.star:nth-child(7){top:12%;left:92%;--dur:3.8s;--delay:0.6s;}
.star:nth-child(8){top:40%;left:5%;--dur:3s;--delay:1.4s;}
@keyframes twinkle{0%,100%{opacity:0;transform:scale(.5);}50%{opacity:.8;transform:scale(1.2);}}

.lanterns-container{
  position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden;
}
.lantern{
  position:absolute;bottom:-60px;line-height:1;
  filter:drop-shadow(0 0 10px rgba(212,175,55,.6)) drop-shadow(0 0 25px rgba(212,175,55,.2));
  opacity:0;animation:floatLantern var(--dur, 12s) ease-in-out var(--delay, 0s) infinite;
}
.lantern:nth-child(1){left:5%;--dur:14s;--delay:0s;}
.lantern:nth-child(2){left:18%;--dur:11s;--delay:4s;}
.lantern:nth-child(3){left:32%;--dur:16s;--delay:1.5s;}
.lantern:nth-child(4){left:48%;--dur:12s;--delay:7s;}
.lantern:nth-child(5){left:60%;--dur:13s;--delay:2.5s;}
.lantern:nth-child(6){left:72%;--dur:10s;--delay:5.5s;}
.lantern:nth-child(7){left:84%;--dur:15s;--delay:3s;}
.lantern:nth-child(8){left:93%;--dur:11.5s;--delay:8s;}
@keyframes floatLantern{
  0%{opacity:0;transform:translateY(0) rotate(0deg);}
  10%{opacity:.7;}50%{opacity:.5;transform:translateY(-60vh) rotate(8deg);}
  90%{opacity:.2;}100%{opacity:0;transform:translateY(-110vh) rotate(-5deg);}
}

/* ================================
   LAYOUT
   ================================ */
.wrap{
  max-width:1100px;margin:0 auto;padding:22px 18px 44px;
  position:relative;z-index:1;
}
.wrap--narrow{max-width:480px;}

/* ================================
   HEADER
   ================================ */
.header{
  display:flex;gap:14px;align-items:center;justify-content:space-between;
  margin-bottom:22px;flex-wrap:wrap;
}
.brand{display:flex;gap:12px;align-items:center;}
.logo{
  width:48px;height:48px;border-radius:14px;
  background:linear-gradient(135deg, var(--gold), #F9A825);
  box-shadow:0 10px 30px rgba(212,175,55,.25);
  display:grid;place-items:center;font-size:24px;
  color:var(--purple);font-weight:900;
}
.brand-title{font-size:20px;font-weight:800;color:var(--purple);line-height:1.2;}
.brand-sub{color:var(--muted);font-size:13px;font-weight:500;margin-top:2px;}

.pill{
  border:1px solid var(--line);background:rgba(212,175,55,.08);
  padding:9px 14px;border-radius:999px;color:var(--purple);
  font-size:13px;white-space:nowrap;font-weight:700;
}

/* ================================
   CARDS
   ================================ */
.card{
  background:var(--card);border:1px solid rgba(212,175,55,.25);
  border-radius:var(--radius);box-shadow:var(--shadow);overflow:hidden;
}
.card-inner{padding:18px;}
.section-title{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:14px 18px;border-bottom:1px solid var(--line);
  background:linear-gradient(180deg, rgba(212,175,55,.06), transparent);
}
.section-title h2{margin:0;font-size:15px;font-weight:800;color:var(--purple);}
.section-title span{color:var(--muted);font-size:12px;font-weight:600;}

/* ================================
   BUTTONS
   ================================ */
.btn{
  display:inline-flex;align-items:center;justify-content:center;gap:8px;
  border:0;border-radius:16px;font-family:inherit;font-weight:800;
  cursor:pointer;transition:transform .08s ease, opacity .15s ease;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation;
}
.btn:active{transform:scale(.97);}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}

.btn--primary{
  background:linear-gradient(135deg, var(--pink), var(--purple));
  color:#fff;font-size:18px;padding:16px 36px;
  box-shadow:0 18px 40px rgba(240,98,146,.22), 0 10px 30px rgba(123,31,162,.18);
}
.btn--secondary{
  background:rgba(212,175,55,.1);border:1px solid var(--line);
  color:var(--purple);font-size:15px;padding:12px 24px;
}
.btn--danger{
  background:linear-gradient(135deg, #ef4444, #dc2626);
  color:#fff;font-size:14px;padding:10px 20px;
  box-shadow:0 8px 20px rgba(239,68,68,.2);
}
.btn--gold{
  background:linear-gradient(135deg, var(--gold), #F9A825);
  color:var(--purple);font-size:16px;padding:14px 28px;font-weight:900;
  box-shadow:0 12px 30px rgba(212,175,55,.25);
}
.btn--full{width:100%;}
.btn--lg{padding:18px 40px;font-size:20px;border-radius:18px;}

/* ================================
   INPUTS
   ================================ */
.input{
  width:100%;padding:14px 16px;border-radius:14px;
  border:1px solid rgba(212,175,55,.25);background:rgba(255,248,225,.5);
  color:var(--text);font-size:16px;font-family:inherit;font-weight:600;
  outline:none;transition:border-color .15s ease;
}
.input:focus{border-color:rgba(240,98,146,.6);box-shadow:0 0 0 4px rgba(240,98,146,.12);}
.input--lg{font-size:28px;text-align:center;letter-spacing:8px;padding:18px;font-weight:900;}

label{display:block;margin:14px 0 8px;font-weight:700;font-size:14px;color:var(--navy);}
.hint{color:var(--muted);font-size:12px;font-weight:500;margin-top:4px;}

/* ================================
   HOST LAYOUT — TV/Projector optimized
   ================================ */
.host-grid{
  display:grid;grid-template-columns:1fr 280px;gap:18px;align-items:start;
}
@media (max-width:900px){.host-grid{grid-template-columns:1fr;}}

/* ================================
   LOBBY
   ================================ */
.lobby{text-align:center;padding:40px 20px;}
.game-code{
  font-size:64px;font-weight:900;letter-spacing:12px;
  color:var(--gold);text-shadow:0 4px 15px rgba(212,175,55,.3);
  margin:16px 0;
}
.qr-wrap{
  display:inline-block;padding:16px;background:#fff;border-radius:16px;
  box-shadow:var(--shadow);margin:16px 0;
}
.qr-wrap canvas{display:block;}

.teams-grid{
  display:flex;flex-wrap:wrap;gap:12px;justify-content:center;
  margin:24px 0;
}
.team-card{
  background:rgba(212,175,55,.08);border:1px solid var(--line);
  border-radius:14px;padding:12px 20px;font-weight:800;font-size:15px;
  color:var(--purple);animation:teamJoin .4s cubic-bezier(.34,1.56,.64,1);
}
@keyframes teamJoin{
  0%{opacity:0;transform:translateY(20px) scale(.9);}
  100%{opacity:1;transform:translateY(0) scale(1);}
}

/* ================================
   QUESTION DISPLAY
   ================================ */
.question-header{
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 18px;gap:12px;flex-wrap:wrap;
}
.question-number{font-size:14px;font-weight:700;color:var(--muted);}
.question-text{
  font-size:26px;font-weight:800;color:var(--navy);
  padding:24px;text-align:center;line-height:1.6;
}
@media (max-width:600px){.question-text{font-size:20px;padding:16px;}}

/* Choices grid — 2x2 on host, 1-col on phone */
.choices{
  display:grid;grid-template-columns:1fr 1fr;gap:12px;
  padding:0 18px 18px;
}
@media (max-width:600px){.choices{grid-template-columns:1fr;}}

.choice{
  display:flex;align-items:center;gap:12px;
  padding:16px 20px;border-radius:16px;
  border:2px solid var(--line);background:rgba(255,255,255,.8);
  font-size:17px;font-weight:700;color:var(--navy);
  cursor:pointer;transition:all .15s ease;
  -webkit-tap-highlight-color:transparent;touch-action:manipulation;
}
.choice:hover{border-color:rgba(212,175,55,.5);background:rgba(212,175,55,.06);}
.choice:active{transform:scale(.98);}
.choice.selected{
  border-color:var(--pink);background:rgba(240,98,146,.08);
  box-shadow:0 0 0 3px rgba(240,98,146,.15);
}
.choice.correct{
  border-color:var(--green);background:rgba(76,175,80,.1);
  box-shadow:0 0 20px var(--green-glow);
  animation:correctPulse .6s ease;
}
.choice.wrong{
  border-color:var(--danger);background:rgba(239,68,68,.06);
  opacity:.6;
}
.choice.disabled{pointer-events:none;opacity:.7;}
.choice-letter{
  width:36px;height:36px;border-radius:10px;
  background:rgba(212,175,55,.1);display:grid;place-items:center;
  font-weight:900;font-size:15px;color:var(--purple);flex-shrink:0;
}
.choice.correct .choice-letter{background:var(--green);color:#fff;}
.choice.wrong .choice-letter{background:var(--danger);color:#fff;}

@keyframes correctPulse{
  0%{transform:scale(1);}30%{transform:scale(1.03);}60%{transform:scale(.99);}100%{transform:scale(1);}
}

/* ================================
   TIMER
   ================================ */
.timer-wrap{position:relative;display:inline-flex;align-items:center;justify-content:center;}
.timer-svg{width:70px;height:70px;transform:rotate(-90deg);}
.timer-bg{fill:none;stroke:rgba(212,175,55,.15);stroke-width:5;}
.timer-ring{
  fill:none;stroke:var(--gold);stroke-width:5;
  stroke-linecap:round;transition:stroke .3s ease;
}
.timer-ring.warning{stroke:var(--danger);animation:timerPulse .5s ease infinite;}
@keyframes timerPulse{0%,100%{opacity:1;}50%{opacity:.6;}}
.timer-text{
  position:absolute;font-size:22px;font-weight:900;color:var(--purple);
}
.timer-text.warning{color:var(--danger);}

/* Host timer — larger */
.host-view .timer-svg{width:90px;height:90px;}
.host-view .timer-text{font-size:28px;}

/* ================================
   ANSWER REVEAL
   ================================ */
.reveal-card{
  background:linear-gradient(135deg, rgba(76,175,80,.06), rgba(212,175,55,.06));
  border:2px solid rgba(76,175,80,.3);border-radius:var(--radius);
  padding:20px;margin:12px 0;
  animation:revealSlide .4s cubic-bezier(.34,1.56,.64,1);
}
@keyframes revealSlide{0%{opacity:0;transform:translateY(15px);}100%{opacity:1;transform:translateY(0);}}

.correct-answer{
  font-size:20px;font-weight:800;color:var(--green);margin-bottom:8px;
}
.perfect-answer{
  font-size:15px;font-weight:600;color:var(--muted);
  border-top:1px solid var(--line);padding-top:10px;margin-top:10px;
}

/* Answer ranking list */
.ranking{list-style:none;padding:0;margin:12px 0;}
.ranking li{
  display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:10px 14px;border-radius:12px;margin:6px 0;
  background:rgba(255,255,255,.7);border:1px solid var(--line);
  animation:rankSlide .3s ease both;
}
.ranking li:nth-child(1){animation-delay:.05s;}
.ranking li:nth-child(2){animation-delay:.1s;}
.ranking li:nth-child(3){animation-delay:.15s;}
.ranking li:nth-child(4){animation-delay:.2s;}
.ranking li:nth-child(5){animation-delay:.25s;}
@keyframes rankSlide{0%{opacity:0;transform:translateX(20px);}100%{opacity:1;transform:translateX(0);}}

.rank-badge{
  width:32px;height:32px;border-radius:10px;display:grid;place-items:center;
  font-weight:900;font-size:14px;color:#fff;flex-shrink:0;
}
.rank-1{background:linear-gradient(135deg, #FFD700, #FFA000);}
.rank-2{background:linear-gradient(135deg, #C0C0C0, #9E9E9E);}
.rank-3{background:linear-gradient(135deg, #CD7F32, #A0522D);}
.rank-other{background:rgba(212,175,55,.2);color:var(--purple);}
.rank-wrong{background:rgba(239,68,68,.15);color:var(--danger);}

.rank-name{font-weight:700;font-size:14px;flex:1;}
.rank-points{font-weight:900;font-size:16px;color:var(--green);}
.rank-points.zero{color:var(--danger);}
.rank-time{font-size:12px;color:var(--muted);font-weight:600;}

/* Open-answer: host sees team answers */
.team-answers{list-style:none;padding:0;margin:12px 0;}
.team-answer-item{
  display:flex;align-items:center;gap:12px;
  padding:12px 14px;border-radius:12px;margin:6px 0;
  background:rgba(255,255,255,.8);border:1px solid var(--line);
  cursor:pointer;transition:all .15s ease;
}
.team-answer-item:hover{border-color:rgba(212,175,55,.5);}
.team-answer-item.marked-correct{
  border-color:var(--green);background:rgba(76,175,80,.08);
}
.team-answer-item .team-name{font-weight:800;font-size:14px;color:var(--purple);min-width:80px;}
.team-answer-item .team-response{font-weight:600;font-size:14px;flex:1;}
.team-answer-item .mark-btn{
  width:32px;height:32px;border-radius:8px;border:2px solid var(--line);
  background:transparent;cursor:pointer;display:grid;place-items:center;
  font-size:16px;transition:all .15s ease;
}
.team-answer-item.marked-correct .mark-btn{
  border-color:var(--green);background:var(--green);color:#fff;
}

/* ================================
   SCOREBOARD
   ================================ */
.scoreboard{position:sticky;top:14px;}
@media (max-width:900px){.scoreboard{position:static;}}
.score-list{list-style:none;padding:0;}
.score-item{
  display:flex;align-items:center;gap:10px;
  padding:10px 14px;border-bottom:1px solid rgba(212,175,55,.1);
  transition:all .3s ease;
}
.score-item:last-child{border-bottom:none;}
.score-rank{
  font-weight:900;font-size:13px;color:var(--muted);
  width:22px;text-align:center;
}
.score-name{font-weight:700;font-size:14px;flex:1;}
.score-pts{font-weight:900;font-size:18px;color:var(--purple);}

/* ================================
   ANSWER COUNTER (host)
   ================================ */
.answer-counter{
  text-align:center;padding:8px;font-weight:700;
  font-size:14px;color:var(--muted);
}

/* ================================
   HOST ACTION BAR
   ================================ */
.action-bar{
  display:flex;gap:12px;justify-content:center;flex-wrap:wrap;
  padding:16px 18px;border-top:1px solid var(--line);
  background:linear-gradient(0deg, rgba(212,175,55,.04), transparent);
}

/* ================================
   END GAME BUTTON (always visible)
   ================================ */
.end-game-btn{
  position:fixed;top:14px;left:14px;z-index:100;
}

/* ================================
   CONFIRMATION DIALOG
   ================================ */
.dialog-overlay{
  position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);
  display:none;align-items:center;justify-content:center;z-index:9999;padding:18px;
}
.dialog-overlay.active{display:flex;}
.dialog{
  background:#fff;border-radius:var(--radius);padding:24px;
  box-shadow:0 20px 60px rgba(0,0,0,.2);max-width:400px;width:100%;
  text-align:center;animation:dialogPop .3s cubic-bezier(.34,1.56,.64,1);
}
@keyframes dialogPop{0%{opacity:0;transform:scale(.9);}100%{opacity:1;transform:scale(1);}}
.dialog h3{font-size:18px;font-weight:800;color:var(--navy);margin-bottom:8px;}
.dialog p{font-size:14px;color:var(--muted);margin-bottom:18px;font-weight:600;}
.dialog-actions{display:flex;gap:10px;justify-content:center;}

/* ================================
   FINAL SCOREBOARD
   ================================ */
.final-scoreboard{text-align:center;padding:30px 20px;}
.final-title{font-size:28px;font-weight:900;color:var(--purple);margin-bottom:8px;}
.winner-name{
  font-size:36px;font-weight:900;color:var(--gold);
  text-shadow:0 4px 15px rgba(212,175,55,.3);
  animation:winnerGlow 1.5s ease infinite alternate;
}
@keyframes winnerGlow{
  0%{text-shadow:0 4px 15px rgba(212,175,55,.3);}
  100%{text-shadow:0 4px 30px rgba(212,175,55,.6), 0 0 60px rgba(212,175,55,.2);}
}
.final-list{list-style:none;padding:0;max-width:500px;margin:24px auto;}
.final-item{
  display:flex;align-items:center;gap:14px;
  padding:14px 18px;border-radius:14px;margin:8px 0;
  background:rgba(255,255,255,.8);border:1px solid var(--line);
  animation:finalSlide .4s ease both;
}
.final-item:nth-child(1){animation-delay:.1s;border-color:rgba(255,215,0,.5);background:rgba(255,215,0,.08);}
.final-item:nth-child(2){animation-delay:.2s;}
.final-item:nth-child(3){animation-delay:.3s;}
@keyframes finalSlide{0%{opacity:0;transform:translateY(20px);}100%{opacity:1;transform:translateY(0);}}
.final-rank{font-size:28px;}
.final-name{font-weight:800;font-size:18px;flex:1;}
.final-score{font-weight:900;font-size:22px;color:var(--purple);}

/* ================================
   TEAM VIEW — Mobile optimized
   ================================ */
.team-view .question-text{font-size:20px;padding:18px;}
.team-view .choices{grid-template-columns:1fr;gap:10px;}
.team-view .choice{padding:14px 16px;font-size:16px;}
.team-view .my-score{
  position:fixed;bottom:0;left:0;right:0;
  padding:10px 18px;background:rgba(255,255,255,.95);
  backdrop-filter:blur(10px);border-top:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-between;
  z-index:50;
}
.team-view .my-score-label{font-size:13px;font-weight:700;color:var(--muted);}
.team-view .my-score-value{font-size:22px;font-weight:900;color:var(--purple);}

/* Open-answer textarea */
.answer-area{
  width:100%;min-height:100px;padding:14px;border-radius:14px;
  border:1px solid rgba(212,175,55,.25);background:rgba(255,248,225,.5);
  font-family:inherit;font-size:16px;font-weight:600;color:var(--text);
  resize:vertical;outline:none;
}
.answer-area:focus{border-color:rgba(240,98,146,.6);box-shadow:0 0 0 4px rgba(240,98,146,.12);}

/* Locked state after answering */
.answer-locked{
  text-align:center;padding:20px;
  font-weight:800;font-size:16px;color:var(--green);
}

/* Waiting state */
.waiting{
  text-align:center;padding:40px 20px;
}
.waiting-text{
  font-size:18px;font-weight:700;color:var(--muted);
  animation:waitPulse 2s ease infinite;
}
@keyframes waitPulse{0%,100%{opacity:.6;}50%{opacity:1;}}

/* ================================
   QUESTION TRANSITIONS
   ================================ */
.slide-out{animation:slideOut .3s ease forwards;}
.slide-in{animation:slideIn .3s ease forwards;}
@keyframes slideOut{to{opacity:0;transform:translateX(-40px);}}
@keyframes slideIn{from{opacity:0;transform:translateX(40px);}to{opacity:1;transform:translateX(0);}}

/* ================================
   CONFETTI
   ================================ */
.confetti-container{position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden;}
.confetti-piece{
  position:absolute;width:10px;height:10px;top:-10px;
  animation:confettiFall var(--dur, 3s) linear var(--delay, 0s) forwards;
}
@keyframes confettiFall{
  0%{transform:translateY(0) rotate(0deg);opacity:1;}
  100%{transform:translateY(110vh) rotate(720deg);opacity:0;}
}

/* ================================
   SCREEN SECTIONS — show/hide
   ================================ */
.screen{display:none;}
.screen.active{display:block;}

/* ================================
   UTILITIES
   ================================ */
.text-center{text-align:center;}
.mt-12{margin-top:12px;}
.mt-18{margin-top:18px;}
.mt-24{margin-top:24px;}
.mb-12{margin-bottom:12px;}
.gap-12{gap:12px;}
.flex-center{display:flex;align-items:center;justify-content:center;}
.hidden{display:none !important;}
```

**Step 2: Verify the file was created**

```bash
wc -l Competition/assets/styles.css
```

Expected: ~300+ lines

---

### Task 3: Shared JS — Firebase, Timer, Sound, Utilities

**Files:**
- Create: `Competition/assets/shared.js`

**Step 1: Create shared.js**

Create `Competition/assets/shared.js`:

```js
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
async function fetchQuestionsFromSheet(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch sheet: " + res.status);
  const csv = await res.text();
  return parseCSV(csv);
}

function parseCSV(csv) {
  const lines = csv.split("\n").map(line => parseCSVLine(line));
  if (lines.length < 2) return [];
  // Skip header row
  const questions = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (!cols[0] || !cols[0].trim()) continue; // skip empty rows
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
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
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
class TimerEngine {
  constructor(onTick, onEnd) {
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.rafId = null;
    this.endAt = 0;
    this.duration = 0;
    this.stopped = false;
    this.ended = false;
  }

  start(endAt, duration) {
    this.endAt = endAt;
    this.duration = duration;
    this.stopped = false;
    this.ended = false;
    this._tick();
  }

  stop() {
    this.stopped = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _tick() {
    if (this.stopped || this.ended) return;
    const now = Date.now();
    const remaining = Math.max(0, this.endAt - now);
    const seconds = Math.ceil(remaining / 1000);
    const fraction = remaining / (this.duration * 1000);

    this.onTick(seconds, fraction);

    if (remaining <= 0) {
      this.ended = true;
      this.onEnd();
      return;
    }
    this.rafId = requestAnimationFrame(() => this._tick());
  }

  destroy() {
    this.stopped = true;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}

// ===== Sound Effects (Web Audio API) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playBell() {
  const ctx = getAudioCtx();
  // Two-tone bell sound
  [880, 660].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
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
  const ctx = getAudioCtx();
  [523, 659, 784].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
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

function playWrong() {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}

// ===== Confetti =====
function launchConfetti(container, count) {
  if (!container) return;
  const colors = ["#D4AF37", "#F06292", "#7B1FA2", "#4CAF50", "#FF9800", "#2196F3"];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement("div");
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
  setTimeout(() => { container.innerHTML = ""; }, 6000);
}

// ===== Timer SVG Renderer =====
function renderTimerSVG(seconds, fraction, warning) {
  const circumference = 2 * Math.PI * 30; // r=30
  const offset = circumference * (1 - fraction);
  return `
    <div class="timer-wrap">
      <svg class="timer-svg" viewBox="0 0 70 70">
        <circle class="timer-bg" cx="35" cy="35" r="30"/>
        <circle class="timer-ring ${warning ? 'warning' : ''}" cx="35" cy="35" r="30"
          stroke-dasharray="${circumference}"
          stroke-dashoffset="${offset}"/>
      </svg>
      <span class="timer-text ${warning ? 'warning' : ''}">${seconds}</span>
    </div>`;
}

// ===== Scoring Calculator =====
function calculateScoring(answers, correctAnswer, questionType) {
  // answers: { teamId: { answer, timestamp, correct? } }
  // For Single-Choice: auto-check against correctAnswer
  // For Open-Answer: use the .correct field set by host
  const scoringTiers = CFG.scoring; // [7, 5, 3]
  const results = [];

  const entries = Object.entries(answers || {});
  // Determine correctness
  entries.forEach(([teamId, data]) => {
    let isCorrect;
    if (questionType === "Single-Choice") {
      isCorrect = data.answer && data.answer.toUpperCase() === correctAnswer.toUpperCase();
    } else {
      isCorrect = !!data.correct; // host-marked
    }
    results.push({ teamId, isCorrect, timestamp: data.timestamp || 0, answer: data.answer });
  });

  // Sort correct answers by timestamp (earliest first)
  const correct = results.filter(r => r.isCorrect).sort((a, b) => a.timestamp - b.timestamp);
  const wrong = results.filter(r => !r.isCorrect);

  const scoring = [];
  correct.forEach((r, i) => {
    const points = i < scoringTiers.length ? scoringTiers[i] : 1;
    scoring.push({ teamId: r.teamId, points, rank: i + 1, answer: r.answer, timestamp: r.timestamp });
  });
  wrong.forEach(r => {
    scoring.push({ teamId: r.teamId, points: 0, rank: -1, answer: r.answer, timestamp: r.timestamp });
  });

  return scoring;
}

// ===== Decorative HTML (stars + lanterns — from Form) =====
function getDecorativeHTML() {
  return `
  <div class="stars-container" aria-hidden="true">
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
  </div>
  <div class="lanterns-container" aria-hidden="true">
    <div class="lantern"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
  </div>`;
}
```

**Step 2: Verify**

Open `Competition/assets/shared.js` in editor and confirm all functions are present: `gameRef`, `generateGameCode`, `shuffleArray`, `fetchQuestionsFromSheet`, `parseCSV`, `TimerEngine`, `playBell`, `playCorrect`, `launchConfetti`, `renderTimerSVG`, `calculateScoring`, `getDecorativeHTML`.

---

### Task 4: Landing Page — index.html

**Files:**
- Create: `Competition/index.html`

**Step 1: Create index.html**

Create `Competition/index.html`:

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <title>مسابقة القرقاعون الثقافية</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./assets/styles.css"/>
  <style>
    .landing{text-align:center;padding:60px 20px;max-width:480px;margin:0 auto;}
    .landing-icon{font-size:64px;margin-bottom:16px;}
    .landing-title{font-size:28px;font-weight:900;color:var(--purple);margin-bottom:8px;}
    .landing-sub{font-size:15px;color:var(--muted);font-weight:600;margin-bottom:40px;}
    .landing-buttons{display:flex;flex-direction:column;gap:14px;max-width:320px;margin:0 auto;}
  </style>
</head>
<body>
  <div class="stars-container" aria-hidden="true">
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
  </div>
  <div class="lanterns-container" aria-hidden="true">
    <div class="lantern"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
  </div>

  <div class="landing" style="position:relative;z-index:1;">
    <div class="landing-icon">🌙</div>
    <h1 class="landing-title">مسابقة القرقاعون الثقافية</h1>
    <p class="landing-sub">يمعة القرقاعون 1447ه</p>
    <div class="landing-buttons">
      <a href="./host.html" class="btn btn--primary btn--full btn--lg">المقدم (الشاشة الرئيسية)</a>
      <a href="./team.html" class="btn btn--gold btn--full btn--lg">انضم كفريق</a>
    </div>
  </div>
</body>
</html>
```

**Step 2: Open in browser and verify**

Open `Competition/index.html` in browser. Expected: landing page with stars, lanterns, title, two buttons (host + team). Verify RTL direction, Cairo font loads, gold/purple theme.

---

### Task 5: Host HTML + Host JS — Lobby

**Files:**
- Create: `Competition/host.html`
- Create: `Competition/assets/host.js`

**Step 1: Create host.html**

Create `Competition/host.html` — the full host page with all screen sections (lobby, question, reveal, final). All screens use `class="screen"` and are toggled via JS.

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>المقدم — مسابقة القرقاعون</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./assets/styles.css"/>
</head>
<body class="host-view">
  <!-- Decorative -->
  <div class="stars-container" aria-hidden="true">
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
  </div>
  <div class="lanterns-container" aria-hidden="true">
    <div class="lantern"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
  </div>

  <!-- End Game Button (always visible during game) -->
  <div class="end-game-btn hidden" id="endGameWrap">
    <button class="btn btn--danger" id="btnEndGame">إنهاء اللعبة</button>
  </div>

  <!-- Confirmation Dialog -->
  <div class="dialog-overlay" id="confirmDialog">
    <div class="dialog">
      <h3 id="dialogTitle">تأكيد</h3>
      <p id="dialogMsg">هل أنت متأكد؟</p>
      <div class="dialog-actions">
        <button class="btn btn--primary" id="dialogConfirm">نعم</button>
        <button class="btn btn--secondary" id="dialogCancel">لا</button>
      </div>
    </div>
  </div>

  <!-- Confetti container -->
  <div class="confetti-container" id="confetti"></div>

  <div class="wrap">
    <div class="header">
      <div class="brand">
        <div class="logo">🌙</div>
        <div>
          <div class="brand-title">مسابقة القرقاعون الثقافية</div>
          <div class="brand-sub">شاشة المقدم</div>
        </div>
      </div>
      <div class="pill" id="questionCounter"></div>
    </div>

    <!-- ===== SCREEN: Loading ===== -->
    <div class="screen active" id="screenLoading">
      <div class="card">
        <div class="card-inner text-center" style="padding:60px 20px;">
          <div style="width:44px;height:44px;border-radius:999px;border:4px solid rgba(212,175,55,.25);border-top-color:rgba(212,175,55,.95);margin:0 auto;animation:spin .9s linear infinite;"></div>
          <p style="margin-top:16px;font-weight:800;color:var(--purple);">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Lobby ===== -->
    <div class="screen" id="screenLobby">
      <div class="card">
        <div class="card-inner lobby">
          <p style="font-size:16px;font-weight:700;color:var(--muted);margin-bottom:8px;">كود اللعبة</p>
          <div class="game-code" id="gameCodeDisplay"></div>
          <div class="qr-wrap">
            <canvas id="qrCanvas"></canvas>
          </div>
          <p class="hint mt-12">شارك الكود أو الـ QR مع الفرق</p>

          <div style="margin-top:24px;">
            <p style="font-weight:800;color:var(--navy);font-size:16px;margin-bottom:12px;">الفرق المنضمة (<span id="teamCount">0</span>)</p>
            <div class="teams-grid" id="teamsGrid"></div>
          </div>

          <div class="mt-24">
            <button class="btn btn--primary btn--lg btn--full" id="btnStart" disabled>ابدأ المسابقة</button>
            <p class="hint mt-12">يجب انضمام فريق واحد على الأقل</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Question ===== -->
    <div class="screen" id="screenQuestion">
      <div class="host-grid">
        <!-- Main question area -->
        <div>
          <div class="card" id="questionCard">
            <div class="question-header">
              <span class="question-number" id="qNumber"></span>
              <div id="timerHost"></div>
            </div>
            <div class="question-text" id="qText"></div>
            <div id="choicesHost" class="choices"></div>

            <!-- Open-answer: team responses (shown after reveal) -->
            <div id="teamAnswersWrap" class="hidden" style="padding:0 18px 18px;">
              <p style="font-weight:800;font-size:14px;color:var(--purple);margin-bottom:8px;">إجابات الفرق:</p>
              <ul class="team-answers" id="teamAnswersList"></ul>
            </div>

            <!-- Reveal section -->
            <div id="revealWrap" class="hidden" style="padding:0 18px 18px;">
              <div class="reveal-card">
                <div class="correct-answer" id="correctAnswerText"></div>
                <div class="perfect-answer" id="perfectAnswerText"></div>
              </div>
              <ul class="ranking" id="rankingList"></ul>
            </div>

            <div class="answer-counter" id="answerCounter"></div>

            <div class="action-bar">
              <button class="btn btn--primary" id="btnReveal">الإجابة</button>
              <button class="btn btn--gold hidden" id="btnApplyScoring">احتسب النقاط</button>
              <button class="btn btn--secondary hidden" id="btnNext">السؤال التالي</button>
            </div>
          </div>
        </div>

        <!-- Scoreboard sidebar -->
        <div class="card scoreboard" id="scoreboardCard">
          <div class="section-title">
            <h2>لوحة النقاط</h2>
            <span id="scoreboardCount"></span>
          </div>
          <div class="card-inner" style="padding:8px 0;">
            <ul class="score-list" id="scoreList"></ul>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Final Scoreboard ===== -->
    <div class="screen" id="screenFinal">
      <div class="card">
        <div class="final-scoreboard">
          <div style="font-size:48px;margin-bottom:12px;">🏆</div>
          <div class="final-title">انتهت المسابقة!</div>
          <div class="winner-name" id="winnerName"></div>
          <ul class="final-list" id="finalList"></ul>
          <div class="mt-24">
            <button class="btn btn--primary btn--lg" onclick="location.reload()">مسابقة جديدة</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Scripts -->
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js"></script>
  <script src="./assets/config.js"></script>
  <script src="./assets/shared.js"></script>
  <script src="./assets/host.js"></script>
</body>
</html>
```

**Step 2: Create host.js**

Create `Competition/assets/host.js` — the complete host logic:

```js
// Competition/assets/host.js
// Host controller: lobby, question flow, reveal, scoring, end game

(function () {
  "use strict";

  // ===== State =====
  let gameCode = "";
  let questions = [];
  let currentIndex = 0;
  let teams = {}; // { teamId: { name, score, joinedAt } }
  let timer = null;
  let isRevealed = false;
  let gRef = null; // Firebase game reference

  // ===== Screen Management =====
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    el(id).classList.add("active");
  }

  // ===== Init: Fetch questions & create game =====
  async function init() {
    showScreen("screenLoading");
    try {
      const raw = await fetchQuestionsFromSheet(CFG.sheetId);
      questions = shuffleArray(raw);
      if (questions.length === 0) {
        alert("لم يتم العثور على أسئلة في الجدول!");
        return;
      }
      gameCode = generateGameCode();
      gRef = gameRef(gameCode);

      // Push game to Firebase
      await gRef.set({
        status: "lobby",
        hostConnected: true,
        currentQuestionIndex: 0,
        timerEndAt: 0,
        timerStopped: false,
        showAnswer: false,
        questions: questions,
        teams: {},
        answers: {},
        scoring: {}
      });

      // Disconnect cleanup
      gRef.child("hostConnected").onDisconnect().set(false);

      setupLobby();
    } catch (e) {
      console.error(e);
      alert("خطأ في تحميل الأسئلة: " + e.message);
    }
  }

  // ===== Lobby =====
  function setupLobby() {
    showScreen("screenLobby");
    el("gameCodeDisplay").textContent = gameCode;
    el("questionCounter").textContent = questions.length + " سؤال";

    // Generate QR
    const teamUrl = new URL("team.html", window.location.href);
    teamUrl.searchParams.set("code", gameCode);
    QRCode.toCanvas(el("qrCanvas"), teamUrl.toString(), {
      width: 200,
      margin: 0,
      color: { dark: "#1A237E", light: "#FFFFFF" }
    });

    // Listen for teams joining
    gRef.child("teams").on("child_added", snap => {
      const teamId = snap.key;
      const data = snap.val();
      teams[teamId] = data;
      renderTeams();
    });
    gRef.child("teams").on("child_removed", snap => {
      delete teams[snap.key];
      renderTeams();
    });
  }

  function renderTeams() {
    const grid = el("teamsGrid");
    const ids = Object.keys(teams);
    el("teamCount").textContent = ids.length;
    grid.innerHTML = ids.map(id =>
      `<div class="team-card">${escapeHtml(teams[id].name)}</div>`
    ).join("");
    el("btnStart").disabled = ids.length === 0;
  }

  // ===== Start Game =====
  el("btnStart").addEventListener("click", () => {
    if (Object.keys(teams).length === 0) return;
    gRef.update({ status: "playing" });
    el("endGameWrap").classList.remove("hidden");
    currentIndex = 0;
    showQuestion(0);
  });

  // ===== Show Question =====
  function showQuestion(index) {
    currentIndex = index;
    isRevealed = false;
    const q = questions[index];
    if (!q) { endGame(); return; }

    showScreen("screenQuestion");
    el("qNumber").textContent = `سؤال ${index + 1} من ${questions.length}`;
    el("questionCounter").textContent = `${index + 1} / ${questions.length}`;

    // Apply slide-in animation
    const card = el("questionCard");
    card.classList.remove("slide-in");
    void card.offsetWidth;
    card.classList.add("slide-in");

    // Question text
    el("qText").textContent = q.question;

    // Choices (Single-Choice only)
    const choicesEl = el("choicesHost");
    if (q.type === "Single-Choice") {
      choicesEl.innerHTML = ["a", "b", "c", "d"].map(letter => {
        const label = letter === "a" ? "أ" : letter === "b" ? "ب" : letter === "c" ? "ج" : "د";
        return `<div class="choice" data-letter="${letter.toUpperCase()}">
          <span class="choice-letter">${label}</span>
          <span>${escapeHtml(q[letter])}</span>
        </div>`;
      }).join("");
      choicesEl.classList.remove("hidden");
    } else {
      choicesEl.innerHTML = "";
      choicesEl.classList.add("hidden");
    }

    // Reset UI
    el("teamAnswersWrap").classList.add("hidden");
    el("revealWrap").classList.add("hidden");
    el("btnReveal").classList.remove("hidden");
    el("btnApplyScoring").classList.add("hidden");
    el("btnNext").classList.add("hidden");
    el("answerCounter").textContent = "";

    // Start timer
    const duration = CFG.timers[q.type] || 30;
    const endAt = Date.now() + duration * 1000;
    gRef.update({
      currentQuestionIndex: index,
      timerEndAt: firebase.database.ServerValue.TIMESTAMP,
      timerStopped: false,
      showAnswer: false
    });
    // After setting server timestamp, set the actual endAt
    setTimeout(() => {
      gRef.update({ timerEndAt: Date.now() + duration * 1000 });
    }, 200);

    if (timer) timer.destroy();
    timer = new TimerEngine(
      (secs, frac) => {
        el("timerHost").innerHTML = renderTimerSVG(secs, frac, secs <= 5);
      },
      () => {
        playBell();
        el("timerHost").innerHTML = renderTimerSVG(0, 0, true);
      }
    );
    timer.start(endAt, duration);

    // Listen for answers
    listenForAnswers(index);
    updateScoreboard();
  }

  // ===== Listen for team answers =====
  function listenForAnswers(qIndex) {
    const answersRef = gRef.child("answers/" + qIndex);
    answersRef.off(); // clear previous listeners
    answersRef.on("value", snap => {
      const answers = snap.val() || {};
      const count = Object.keys(answers).length;
      const total = Object.keys(teams).length;
      el("answerCounter").textContent = `الفرق اللي جاوبت: ${count} / ${total}`;
    });
  }

  // ===== Reveal Answer =====
  el("btnReveal").addEventListener("click", () => {
    if (isRevealed) return;
    isRevealed = true;

    // Stop timer
    if (timer) timer.stop();
    gRef.update({ timerStopped: true, showAnswer: true });
    playBell();

    const q = questions[currentIndex];
    el("btnReveal").classList.add("hidden");

    if (q.type === "Single-Choice") {
      revealSingleChoice(q);
    } else {
      revealOpenAnswer(q);
    }
  });

  function revealSingleChoice(q) {
    // Highlight correct choice
    const correctLetter = q.correct.toUpperCase();
    document.querySelectorAll("#choicesHost .choice").forEach(ch => {
      const letter = ch.dataset.letter;
      if (letter === correctLetter) {
        ch.classList.add("correct");
        playCorrect();
      } else {
        ch.classList.add("wrong");
      }
      ch.classList.add("disabled");
    });

    // Show perfect answer
    el("correctAnswerText").textContent = "الإجابة الصحيحة: " + correctLetter;
    el("perfectAnswerText").textContent = q.perfect;
    el("revealWrap").classList.remove("hidden");

    // Auto-score and show ranking
    gRef.child("answers/" + currentIndex).once("value", snap => {
      const answers = snap.val() || {};
      const scoring = calculateScoring(answers, q.correct, "Single-Choice");
      showRanking(scoring);
      applyScores(scoring);
      el("btnNext").classList.remove("hidden");
    });
  }

  function revealOpenAnswer(q) {
    // Show team answers for host to mark
    gRef.child("answers/" + currentIndex).once("value", snap => {
      const answers = snap.val() || {};
      const sorted = Object.entries(answers)
        .map(([tid, d]) => ({ teamId: tid, ...d }))
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      const list = el("teamAnswersList");
      list.innerHTML = sorted.map(a => {
        const teamName = teams[a.teamId]?.name || a.teamId;
        return `<li class="team-answer-item" data-team-id="${a.teamId}">
          <span class="team-name">${escapeHtml(teamName)}</span>
          <span class="team-response">${escapeHtml(a.answer || "—")}</span>
          <button class="mark-btn" title="صحيح">✓</button>
        </li>`;
      }).join("");

      el("teamAnswersWrap").classList.remove("hidden");

      // Show perfect answer
      el("correctAnswerText").textContent = "الإجابة المثالية:";
      el("perfectAnswerText").textContent = q.perfect;
      el("revealWrap").classList.remove("hidden");

      // Show "apply scoring" button
      el("btnApplyScoring").classList.remove("hidden");
    });
  }

  // Toggle correct mark on open-answer items
  document.addEventListener("click", e => {
    const markBtn = e.target.closest(".mark-btn");
    if (!markBtn) return;
    const item = markBtn.closest(".team-answer-item");
    if (!item) return;
    item.classList.toggle("marked-correct");
  });

  // Apply scoring for open-answer
  el("btnApplyScoring").addEventListener("click", () => {
    const items = document.querySelectorAll("#teamAnswersList .team-answer-item");
    const updates = {};
    items.forEach(item => {
      const teamId = item.dataset.teamId;
      const isCorrect = item.classList.contains("marked-correct");
      updates[teamId + "/correct"] = isCorrect;
    });
    gRef.child("answers/" + currentIndex).update(updates).then(() => {
      // Recalculate scoring
      gRef.child("answers/" + currentIndex).once("value", snap => {
        const answers = snap.val() || {};
        const q = questions[currentIndex];
        const scoring = calculateScoring(answers, q.correct, "Open-Answer");
        showRanking(scoring);
        applyScores(scoring);
        el("btnApplyScoring").classList.add("hidden");
        el("btnNext").classList.remove("hidden");
        playCorrect();
      });
    });
  });

  // ===== Show Ranking =====
  function showRanking(scoring) {
    const list = el("rankingList");
    list.innerHTML = scoring.map(s => {
      const teamName = teams[s.teamId]?.name || s.teamId;
      const rankClass = s.rank === 1 ? "rank-1" : s.rank === 2 ? "rank-2" : s.rank === 3 ? "rank-3" : s.rank > 0 ? "rank-other" : "rank-wrong";
      const rankLabel = s.rank > 0 ? s.rank : "✗";
      const timeDiff = s.timestamp ? ((s.timestamp - (Date.now() - 60000)) / 1000).toFixed(1) : "";
      return `<li>
        <span class="rank-badge ${rankClass}">${rankLabel}</span>
        <span class="rank-name">${escapeHtml(teamName)}</span>
        <span class="rank-points ${s.points === 0 ? 'zero' : ''}">+${s.points}</span>
      </li>`;
    }).join("");
  }

  // ===== Apply Scores =====
  function applyScores(scoring) {
    const updates = {};
    scoring.forEach(s => {
      if (!teams[s.teamId]) return;
      teams[s.teamId].score = (teams[s.teamId].score || 0) + s.points;
      updates["teams/" + s.teamId + "/score"] = teams[s.teamId].score;
    });
    updates["scoring/" + currentIndex] = scoring;
    gRef.update(updates);
    updateScoreboard();
  }

  // ===== Update Scoreboard =====
  function updateScoreboard() {
    const sorted = Object.entries(teams)
      .map(([id, t]) => ({ id, name: t.name, score: t.score || 0 }))
      .sort((a, b) => b.score - a.score);

    el("scoreboardCount").textContent = sorted.length + " فرق";
    el("scoreList").innerHTML = sorted.map((t, i) =>
      `<li class="score-item">
        <span class="score-rank">${i + 1}</span>
        <span class="score-name">${escapeHtml(t.name)}</span>
        <span class="score-pts">${t.score}</span>
      </li>`
    ).join("");
  }

  // ===== Next Question =====
  el("btnNext").addEventListener("click", () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      endGame();
    } else {
      showQuestion(nextIndex);
    }
  });

  // ===== End Game =====
  function endGame() {
    gRef.update({ status: "ended" });
    if (timer) timer.destroy();
    el("endGameWrap").classList.add("hidden");

    showScreen("screenFinal");

    const sorted = Object.entries(teams)
      .map(([id, t]) => ({ id, name: t.name, score: t.score || 0 }))
      .sort((a, b) => b.score - a.score);

    if (sorted.length > 0) {
      el("winnerName").textContent = sorted[0].name;
      launchConfetti(el("confetti"), 100);
      playCorrect();
    }

    el("finalList").innerHTML = sorted.map((t, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
      return `<li class="final-item">
        <span class="final-rank">${medal}</span>
        <span class="final-name">${escapeHtml(t.name)}</span>
        <span class="final-score">${t.score}</span>
      </li>`;
    }).join("");
  }

  // ===== End Game Button (with confirmation) =====
  el("btnEndGame").addEventListener("click", () => {
    showConfirm("إنهاء اللعبة", "هل أنت متأكد من إنهاء اللعبة وعرض النتائج النهائية؟", () => {
      endGame();
    });
  });

  // ===== Confirmation Dialog =====
  function showConfirm(title, msg, onConfirm) {
    el("dialogTitle").textContent = title;
    el("dialogMsg").textContent = msg;
    el("confirmDialog").classList.add("active");

    const confirmHandler = () => {
      el("confirmDialog").classList.remove("active");
      el("dialogConfirm").removeEventListener("click", confirmHandler);
      onConfirm();
    };
    el("dialogConfirm").addEventListener("click", confirmHandler);
  }

  el("dialogCancel").addEventListener("click", () => {
    el("confirmDialog").classList.remove("active");
  });

  // ===== HTML Escape =====
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Start =====
  init();
})();
```

**Step 2: Verify host.html structure**

Open `Competition/host.html` in browser. Expected: Loading screen appears with spinner. Will fail to actually load questions until Firebase is configured, but the UI structure should render (stars, lanterns, header, loading card).

---

### Task 6: Team HTML + Team JS — Join & Answer Flow

**Files:**
- Create: `Competition/team.html`
- Create: `Competition/assets/team.js`

**Step 1: Create team.html**

Create `Competition/team.html`:

```html
<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <title>فريق — مسابقة القرقاعون</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./assets/styles.css"/>
</head>
<body class="team-view">
  <!-- Decorative -->
  <div class="stars-container" aria-hidden="true">
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
    <div class="star"></div><div class="star"></div><div class="star"></div><div class="star"></div>
  </div>
  <div class="lanterns-container" aria-hidden="true">
    <div class="lantern"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
    <div class="lantern"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2m0 16v2M8 5h8l1 3H7l1-3zm1 3v9h6V8M9 17h6M7 21h10"/></svg></div>
    <div class="lantern"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linejoin="round"><path d="M12 2l2.9 6.3H22l-5.7 4.2 2.2 6.7L12 15.5l-6.5 3.7 2.2-6.7L2 8.3h7.1z"/></svg></div>
    <div class="lantern"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1v2M10 3h4"/><path d="M8 7c0-2.2 1.8-4 4-4s4 1.8 4 4v6c0 2.2-1.8 4-4 4s-4-1.8-4-4V7z"/><path d="M10 17v2m4-2v2M8 19h8"/></svg></div>
    <div class="lantern"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#D4AF37" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></div>
  </div>

  <!-- Confetti container -->
  <div class="confetti-container" id="confetti"></div>

  <div class="wrap wrap--narrow">
    <div class="header">
      <div class="brand">
        <div class="logo">🌙</div>
        <div>
          <div class="brand-title">مسابقة القرقاعون</div>
          <div class="brand-sub" id="teamNameHeader"></div>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Join ===== -->
    <div class="screen active" id="screenJoin">
      <div class="card">
        <div class="section-title">
          <h2>انضم للمسابقة</h2>
          <span></span>
        </div>
        <div class="card-inner">
          <label for="inputCode">كود اللعبة</label>
          <input class="input input--lg" id="inputCode" type="text" inputmode="numeric" maxlength="4" placeholder="0000" autocomplete="off"/>
          <label for="inputName">اسم الفريق</label>
          <input class="input" id="inputName" type="text" placeholder="مثال: عائلة أحمد" autocomplete="off"/>
          <div class="mt-18">
            <button class="btn btn--primary btn--full btn--lg" id="btnJoin">انضم</button>
          </div>
          <p class="hint mt-12 text-center" id="joinError" style="color:var(--danger);display:none;"></p>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Waiting ===== -->
    <div class="screen" id="screenWaiting">
      <div class="card">
        <div class="card-inner waiting">
          <div style="font-size:48px;margin-bottom:16px;">⏳</div>
          <p style="font-weight:800;font-size:18px;color:var(--purple);margin-bottom:8px;" id="waitTeamName"></p>
          <p class="waiting-text">بانتظار المقدم يبدأ المسابقة...</p>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Question ===== -->
    <div class="screen" id="screenQuestion">
      <div class="card" id="teamQuestionCard">
        <div class="question-header">
          <span class="question-number" id="tqNumber"></span>
          <div id="timerTeam"></div>
        </div>
        <div class="question-text" id="tqText"></div>

        <!-- Single-Choice answers -->
        <div id="teamChoices" class="choices"></div>

        <!-- Open-Answer input -->
        <div id="openAnswerWrap" class="hidden" style="padding:0 18px 18px;">
          <textarea class="answer-area" id="openAnswerInput" placeholder="اكتب إجابتك هنا..."></textarea>
          <div class="mt-12">
            <button class="btn btn--primary btn--full" id="btnSubmitOpen">الإجابة</button>
          </div>
        </div>

        <!-- Locked state -->
        <div id="answerLockedWrap" class="hidden">
          <div class="answer-locked">
            <div style="font-size:32px;margin-bottom:8px;">✅</div>
            <p>تم إرسال إجابتك</p>
            <p class="hint" id="lockedAnswerText"></p>
          </div>
        </div>

        <!-- Reveal on team side -->
        <div id="teamRevealWrap" class="hidden" style="padding:0 18px 18px;">
          <div class="reveal-card">
            <div class="correct-answer" id="teamCorrectText"></div>
            <div class="perfect-answer" id="teamPerfectText"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== SCREEN: Final ===== -->
    <div class="screen" id="screenFinal">
      <div class="card">
        <div class="final-scoreboard">
          <div style="font-size:48px;margin-bottom:12px;">🏆</div>
          <div class="final-title">انتهت المسابقة!</div>
          <div class="winner-name" id="teamWinnerName"></div>
          <ul class="final-list" id="teamFinalList"></ul>
        </div>
      </div>
    </div>
  </div>

  <!-- My Score (fixed bottom bar) -->
  <div class="my-score hidden" id="myScoreBar">
    <span class="my-score-label">نقاطك</span>
    <span class="my-score-value" id="myScoreValue">0</span>
  </div>

  <!-- Scripts -->
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js"></script>
  <script src="./assets/config.js"></script>
  <script src="./assets/shared.js"></script>
  <script src="./assets/team.js"></script>
</body>
</html>
```

**Step 2: Create team.js**

Create `Competition/assets/team.js`:

```js
// Competition/assets/team.js
// Team controller: join, answer questions, show score

(function () {
  "use strict";

  // ===== State =====
  let gameCode = "";
  let teamId = "";
  let teamName = "";
  let gRef = null;
  let questions = [];
  let currentIndex = -1;
  let hasAnswered = false;
  let timer = null;
  let myScore = 0;

  // ===== Screen Management =====
  function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    el(id).classList.add("active");
  }

  // ===== Auto-fill code from URL =====
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get("code");
  if (codeFromUrl) {
    el("inputCode").value = codeFromUrl;
  }

  // ===== Join =====
  el("btnJoin").addEventListener("click", async () => {
    const code = el("inputCode").value.trim();
    const name = el("inputName").value.trim();
    const errorEl = el("joinError");

    if (!code || code.length !== 4) {
      errorEl.textContent = "أدخل كود اللعبة (4 أرقام)";
      errorEl.style.display = "block";
      return;
    }
    if (!name) {
      errorEl.textContent = "أدخل اسم الفريق";
      errorEl.style.display = "block";
      return;
    }

    errorEl.style.display = "none";
    gameCode = code;
    teamName = name;
    gRef = gameRef(gameCode);

    // Check game exists
    const snap = await gRef.child("status").once("value");
    if (!snap.exists()) {
      errorEl.textContent = "كود اللعبة غير صحيح";
      errorEl.style.display = "block";
      return;
    }

    const status = snap.val();
    if (status === "ended") {
      errorEl.textContent = "هذه اللعبة انتهت";
      errorEl.style.display = "block";
      return;
    }

    // Register team
    teamId = generateTeamId();
    await gRef.child("teams/" + teamId).set({
      name: teamName,
      score: 0,
      joinedAt: firebase.database.ServerValue.TIMESTAMP
    });

    // Disconnect cleanup
    gRef.child("teams/" + teamId).onDisconnect().remove();

    el("teamNameHeader").textContent = teamName;

    if (status === "lobby") {
      el("waitTeamName").textContent = teamName;
      showScreen("screenWaiting");
      waitForGameStart();
    } else if (status === "playing") {
      // Game already in progress — join mid-game
      startListening();
    }
  });

  // ===== Wait for game to start =====
  function waitForGameStart() {
    gRef.child("status").on("value", snap => {
      const status = snap.val();
      if (status === "playing") {
        gRef.child("status").off("value");
        startListening();
      } else if (status === "ended") {
        gRef.child("status").off("value");
        showFinalScreen();
      }
    });
  }

  // ===== Start listening for game state =====
  function startListening() {
    // Get questions
    gRef.child("questions").once("value", snap => {
      questions = snap.val() || [];
    });

    // Listen for question changes
    gRef.child("currentQuestionIndex").on("value", snap => {
      const idx = snap.val();
      if (idx === null || idx === undefined) return;
      if (idx !== currentIndex) {
        currentIndex = idx;
        hasAnswered = false;
        showTeamQuestion(idx);
      }
    });

    // Listen for timer stop
    gRef.child("timerStopped").on("value", snap => {
      if (snap.val() === true && timer) {
        timer.stop();
      }
    });

    // Listen for answer reveal
    gRef.child("showAnswer").on("value", snap => {
      if (snap.val() === true) {
        showTeamReveal();
      }
    });

    // Listen for score updates
    gRef.child("teams/" + teamId + "/score").on("value", snap => {
      myScore = snap.val() || 0;
      el("myScoreValue").textContent = myScore;
    });

    // Listen for game end
    gRef.child("status").on("value", snap => {
      if (snap.val() === "ended") {
        showFinalScreen();
      }
    });

    el("myScoreBar").classList.remove("hidden");
  }

  // ===== Show Question on Team Device =====
  function showTeamQuestion(idx) {
    const q = questions[idx];
    if (!q) return;

    showScreen("screenQuestion");

    // Slide animation
    const card = el("teamQuestionCard");
    card.classList.remove("slide-in");
    void card.offsetWidth;
    card.classList.add("slide-in");

    el("tqNumber").textContent = `سؤال ${idx + 1}`;
    el("tqText").textContent = q.question;

    // Reset UI
    el("answerLockedWrap").classList.add("hidden");
    el("teamRevealWrap").classList.add("hidden");

    if (q.type === "Single-Choice") {
      el("teamChoices").classList.remove("hidden");
      el("openAnswerWrap").classList.add("hidden");
      el("teamChoices").innerHTML = ["a", "b", "c", "d"].map(letter => {
        const label = letter === "a" ? "أ" : letter === "b" ? "ب" : letter === "c" ? "ج" : "د";
        return `<div class="choice" data-letter="${letter.toUpperCase()}" data-idx="${idx}">
          <span class="choice-letter">${label}</span>
          <span>${escapeHtml(q[letter])}</span>
        </div>`;
      }).join("");
    } else {
      el("teamChoices").classList.add("hidden");
      el("openAnswerWrap").classList.remove("hidden");
      el("openAnswerInput").value = "";
    }

    // Start timer
    gRef.child("timerEndAt").once("value", snap => {
      const endAt = snap.val() || 0;
      const duration = CFG.timers[q.type] || 30;
      if (timer) timer.destroy();
      timer = new TimerEngine(
        (secs, frac) => {
          el("timerTeam").innerHTML = renderTimerSVG(secs, frac, secs <= 5);
        },
        () => {
          playBell();
          el("timerTeam").innerHTML = renderTimerSVG(0, 0, true);
        }
      );
      timer.start(endAt, duration);
    });
  }

  // ===== Single-Choice: tap to answer =====
  document.addEventListener("click", e => {
    const choice = e.target.closest(".choice");
    if (!choice || hasAnswered) return;
    const letter = choice.dataset.letter;
    const idx = parseInt(choice.dataset.idx);
    if (isNaN(idx) || idx !== currentIndex) return;

    hasAnswered = true;
    submitAnswer(letter);

    // Visual feedback
    choice.classList.add("selected");
    document.querySelectorAll("#teamChoices .choice").forEach(c => c.classList.add("disabled"));
    showLocked(letter);
  });

  // ===== Open-Answer: submit =====
  el("btnSubmitOpen").addEventListener("click", () => {
    if (hasAnswered) return;
    const answer = el("openAnswerInput").value.trim();
    if (!answer) return;

    hasAnswered = true;
    submitAnswer(answer);
    showLocked(answer);
  });

  function submitAnswer(answer) {
    gRef.child("answers/" + currentIndex + "/" + teamId).set({
      answer: answer,
      timestamp: firebase.database.ServerValue.TIMESTAMP
    });
  }

  function showLocked(answerText) {
    el("answerLockedWrap").classList.remove("hidden");
    el("lockedAnswerText").textContent = "إجابتك: " + answerText;
    el("openAnswerWrap").classList.add("hidden");
  }

  // ===== Show Reveal on Team Side =====
  function showTeamReveal() {
    const q = questions[currentIndex];
    if (!q) return;

    if (q.type === "Single-Choice") {
      // Highlight correct choice
      const correctLetter = q.correct.toUpperCase();
      document.querySelectorAll("#teamChoices .choice").forEach(ch => {
        const letter = ch.dataset.letter;
        if (letter === correctLetter) {
          ch.classList.add("correct");
          playCorrect();
        } else {
          ch.classList.add("wrong");
        }
      });
    }

    el("teamCorrectText").textContent = q.type === "Single-Choice"
      ? "الإجابة الصحيحة: " + q.correct
      : "الإجابة المثالية:";
    el("teamPerfectText").textContent = q.perfect;
    el("teamRevealWrap").classList.remove("hidden");
  }

  // ===== Final Screen =====
  function showFinalScreen() {
    if (timer) timer.destroy();
    showScreen("screenFinal");
    el("myScoreBar").classList.add("hidden");

    gRef.child("teams").once("value", snap => {
      const allTeams = snap.val() || {};
      const sorted = Object.entries(allTeams)
        .map(([id, t]) => ({ id, name: t.name, score: t.score || 0 }))
        .sort((a, b) => b.score - a.score);

      if (sorted.length > 0) {
        el("teamWinnerName").textContent = sorted[0].name;
        launchConfetti(el("confetti"), 80);
      }

      el("teamFinalList").innerHTML = sorted.map((t, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`;
        const isMe = t.id === teamId;
        return `<li class="final-item" ${isMe ? 'style="border-color:var(--pink);background:rgba(240,98,146,.06);"' : ''}>
          <span class="final-rank">${medal}</span>
          <span class="final-name">${escapeHtml(t.name)}${isMe ? ' (أنت)' : ''}</span>
          <span class="final-score">${t.score}</span>
        </li>`;
      }).join("");
    });
  }

  // ===== HTML Escape =====
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
})();
```

**Step 2: Verify team.html structure**

Open `Competition/team.html` in mobile-sized browser window. Expected: Join screen with code input, name input, and "انضم" button. Stars and lanterns animate in background.

---

### Task 7: Firebase Setup (Manual Steps)

**This task requires manual action by the user in the Firebase console.**

**Step 1: Create Firebase project**

1. Go to https://console.firebase.google.com
2. Click "Add Project" → Name it (e.g., "nana-qa-competition")
3. Disable Google Analytics (not needed) → Create

**Step 2: Create Realtime Database**

1. In Firebase Console → Build → Realtime Database → Create Database
2. Choose location closest to you
3. Start in **test mode** (for now — we'll add rules later)

**Step 3: Register Web App**

1. Project Settings → General → Add app → Web
2. Name it "competition-web"
3. Copy the `firebaseConfig` object
4. Paste values into `Competition/assets/config.js` replacing the placeholder values

**Step 4: Set security rules**

In Firebase Console → Realtime Database → Rules, paste:

```json
{
  "rules": {
    "games": {
      "$gameCode": {
        ".read": true,
        ".write": true,
        "teams": {
          "$teamId": {
            ".write": true
          }
        },
        "answers": {
          "$qIndex": {
            "$teamId": {
              ".write": true
            }
          }
        }
      }
    }
  }
}
```

Note: These are permissive rules suitable for a family gathering. For production, you'd want auth-based rules.

**Step 5: Publish Google Sheet**

1. Open the Google Sheet
2. File → Share → Publish to the web
3. Select "Entire Document" → CSV → Publish
4. Confirm the sheet ID in `config.js` matches

**Step 6: Verify Firebase connection**

Open `Competition/host.html` in browser with DevTools Console open. Should see Firebase initializing without errors. If the sheet is published, questions should load and the lobby screen should appear with a game code.

---

### Task 8: End-to-End Manual Testing

**Step 1: Test full flow**

1. Open `Competition/host.html` in one browser tab (simulate TV)
2. Note the 4-digit game code displayed
3. Open `Competition/team.html` in another tab or phone browser
4. Enter the game code + team name → Join
5. On host: verify team name appears in lobby
6. Open team.html in a third tab with different team name
7. On host: click "ابدأ المسابقة"
8. Verify: both team tabs show the question with timer
9. Answer on one team tab → verify host shows "1/2 answered"
10. Answer on second team → verify "2/2 answered"
11. On host: click "الإجابة" → verify answer revealed, scoring shown
12. On host: click "السؤال التالي" → verify next question
13. Test Open-Answer: verify text input, host marks correct, scoring applies
14. On host: click "إنهاء اللعبة" → verify confirmation dialog → confirm → final scoreboard
15. Verify confetti animation on final screen

**Step 2: Test edge cases**

- Team joins mid-game (after first question started)
- Timer runs out without answering
- "الإجابة" clicked before timer ends
- Page refresh during game (team should be able to rejoin)
- Empty answer submission (should be prevented)

**Step 3: Mobile testing**

- Open team.html on actual phone
- Verify RTL layout, touch targets (choices are large enough to tap)
- Verify fixed score bar at bottom doesn't overlap content
- Verify timer is visible and readable

---

### Task 9: Deployment

**Step 1: Initialize git (if not already)**

```bash
cd /c/Data/QA/Nana-QA
git init
git add Competition/
git commit -m "feat: add family cultural competition quiz app"
```

**Step 2: Deploy to GitHub Pages**

1. Create GitHub repo
2. Push code
3. Settings → Pages → Source: main branch → / (root) or /Competition
4. Access at `https://username.github.io/Nana-QA/Competition/`

**OR Deploy to Cloudflare Pages:**

1. Go to https://dash.cloudflare.com → Pages → Create
2. Connect to GitHub repo
3. Set build output directory to `/` (no build needed)
4. Deploy
5. Access at the provided `.pages.dev` URL

**Step 3: Update team URL in QR code**

After deployment, the QR code will auto-generate the correct URL based on `window.location.href`. No changes needed.

---

## Dependency Graph

```
Task 1 (scaffolding)
  └→ Task 2 (CSS)
  └→ Task 3 (shared.js)
      └→ Task 4 (index.html) — can test independently
      └→ Task 5 (host.html + host.js)
      └→ Task 6 (team.html + team.js)
          └→ Task 7 (Firebase setup) — needed for live testing
              └→ Task 8 (E2E testing)
                  └→ Task 9 (Deployment)
```

Tasks 2, 3, 4 can be done in parallel.
Tasks 5, 6 can be done in parallel (after 2 + 3).
Task 7 must be done before Task 8.
