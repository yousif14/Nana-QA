# Family Cultural Competition - Design Document

**Date:** 2026-03-03
**Project:** Nana-QA / Competition Module

---

## Overview

A real-time family cultural competition quiz app for a family gathering (يمعة القرقاعون 1447ه). The host displays questions on a TV/projector while teams answer from their phones. Questions are sourced from a Google Sheet.

## Architecture

- **Frontend:** Pure HTML/CSS/JS (no framework), matching the existing Form theme
- **Backend:** Firebase Realtime Database (free tier) for real-time sync
- **Data Source:** Google Sheets API v4 (direct fetch, no n8n needed)
- **Hosting:** GitHub Pages or Cloudflare Pages (free static hosting)

```
Google Sheets → (fetch via Sheets API) → Firebase Realtime DB
                                              ↕ real-time sync
                                    host.html ↔ team.html
```

## Question Types

### 1. Open-Answer
- Question displayed as text
- 1-minute timer
- Teams type their answer on their phones
- Host sees all submitted answers with team names
- Host manually marks which teams answered correctly
- "الإجابة" button reveals the Perfect Answer

### 2. Single-Choice
- Question with 4 choices (A, B, C, D)
- 30-second timer
- Teams tap their choice on their phones
- System auto-checks against Correct Answer column
- "الإجابة" button reveals correct answer + letter highlighted

## Scoring System

Based on submission order of correct answers:
- 1st correct: **7 points**
- 2nd correct: **5 points**
- 3rd correct: **3 points**
- Any other correct: **1 point**
- Wrong answer: **0 points**

For Single-Choice: auto-scored based on the Correct Answer column.
For Open-Answer: host manually marks correct teams; system assigns points by submission timestamp.

## User Flows

### Host Flow
1. Opens `host.html`
2. App fetches questions from Google Sheets, shuffles them, pushes to Firebase
3. Lobby screen shows Game Code (4-digit) + QR code
4. Teams join and appear on the lobby screen
5. Host presses "ابدأ المسابقة" to start
6. For each question:
   - Question + timer displayed on TV
   - Live counter shows how many teams answered
   - "الإجابة" button stops timer and reveals answer + scoring
   - "السؤال التالي" advances to next question
7. "إنهاء اللعبة" button available at all times (with confirmation dialog)
8. Final scoreboard with winner celebration

### Team Flow
1. Opens `team.html` on phone
2. Enters game code + team name
3. Waits in lobby until host starts
4. For each question:
   - Sees question + timer
   - Answers (tap choice or type answer)
   - Answer locked with timestamp
   - Sees own score update after reveal
5. Final scoreboard at game end

## UI Design

### Theme (reused from Form/)
- **Colors:** Gold `#D4AF37`, Purple `#7B1FA2`, Pink `#F06292`, Navy `#1A237E`, Cream `#FFF8E1`
- **Font:** Cairo (Arabic)
- **Decorations:** Twinkling stars, floating lanterns (crescents, stars, fanous SVGs)
- **Style:** Rounded cards (18px radius), gradient buttons (pink-to-purple), glassmorphism, shadows

### Host Screen (TV/Projector)
- **Lobby:** Game code (large, gold), QR code, team cards appearing with slide-in animation, "ابدأ المسابقة" button
- **Question:** Question card, choices (for Single-Choice), circular countdown timer, live answer counter, "الإجابة" + "السؤال التالي" buttons, "إنهاء اللعبة" button
- **Reveal:** Correct answer highlighted green, team ranking with points (+7/+5/+3/+1), Perfect Answer display
- **Scoreboard:** Always visible sidebar or togglable, sorted by score

### Team Screen (Phone)
- **Join:** Game code input, team name input, "انضم" button
- **Waiting:** Team name displayed, "waiting for host" message
- **Single-Choice:** Question text, 4 tappable choice buttons (full-width, stacked), timer, score display
- **Open-Answer:** Question text, text input area, "الإجابة" submit button, timer, score display
- **After Answer:** Locked state showing submitted answer, waiting for reveal

### Animations
- Question transitions: slide + fade (out left, in from right)
- Timer: circular progress ring, turns red + pulses in last 5 seconds
- Correct answer reveal: green glow + scale-up + sparkle particles
- Wrong answer: red shake animation
- Score update: number counter animation
- Team join: card slides in from bottom with bounce
- Winner celebration: confetti burst + gold particle shower
- Background: twinkling stars + floating lanterns (from existing theme)

## Firebase Data Structure

```
/games/{gameCode}/
  ├── status: "lobby" | "playing" | "reveal" | "ended"
  ├── hostConnected: true
  ├── currentQuestionIndex: number
  ├── timerEndAt: number (server timestamp + duration)
  ├── timerStopped: boolean
  ├── showAnswer: boolean
  ├── questions: [{ question, a, b, c, d, correct, perfect, type }]
  ├── teams/{teamId}/
  │     ├── name: string
  │     ├── score: number
  │     └── joinedAt: number
  ├── answers/{questionIndex}/{teamId}/
  │     ├── answer: string
  │     ├── timestamp: number
  │     └── correct: boolean
  └── scoring/{questionIndex}: [{ teamId, points, rank }]
```

## Timer Sync Strategy

- Host sets `timerEndAt` = Firebase server timestamp + duration (30s or 60s)
- All clients calculate remaining time locally from `timerEndAt`
- Ensures perfect sync regardless of network latency
- Host clicking "الإجابة" sets `timerStopped: true` — all clients stop

## Security Rules

- Game code acts as access control (must know code to read/write)
- Teams can only write to their own `answers/{qIndex}/{teamId}`
- Only host can write to `status`, `currentQuestionIndex`, `showAnswer`, `scoring`
- Questions array is read-only after game starts

## Sound Design

- Timer end: short, modern "ding" (Web Audio API, generated programmatically)
- Correct answer: celebratory chime
- No external audio files needed

## File Structure

```
Nana-QA/
├── Form/              (existing — untouched)
├── Competition/
│   ├── index.html     (landing — choose host or team)
│   ├── host.html      (host/presenter view for TV)
│   ├── team.html      (team phone view)
│   └── assets/
│       ├── styles.css  (shared theme from Form + competition styles)
│       ├── host.js     (host logic: game management, reveal, scoring)
│       ├── team.js     (team logic: join, answer, display)
│       ├── shared.js   (firebase init, timer, sound, animations, theme)
│       └── config.js   (firebase config, google sheet ID)
```

## Google Sheet Format

| Question | A | B | C | D | Correct Answer | The Perfect Answer | Type |
|----------|---|---|---|---|---------------|-------------------|------|
| ما عاصمة البحرين؟ | المنامة | المحرق | الرفاع | عيسى | A | المنامة هي عاصمة مملكة البحرين | Single-Choice |
| اذكر 3 دول خليجية | - | - | - | - | - | البحرين، الكويت، السعودية، الإمارات، عمان، قطر | Open-Answer |

**Sheet URL:** https://docs.google.com/spreadsheets/d/1vzDrriZFXY5CZzwvkcK3RF4WZMoyh-4NhVAssStIW_A/

## Deployment

- Push to GitHub repository
- Deploy via GitHub Pages or Cloudflare Pages
- Firebase project created with Realtime Database (free Spark plan)
- Google Sheet published or API key configured for Sheets API access

## Key Buttons (Arabic)

| Button | Context | Action |
|--------|---------|--------|
| ابدأ المسابقة | Host lobby | Start the game |
| الإجابة | Host during question | Stop timer, reveal answer |
| السؤال التالي | Host after reveal | Next question |
| إنهاء اللعبة | Host, always visible | End game (with confirmation) |
| انضم | Team join screen | Join the game |
