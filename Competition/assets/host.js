// Competition/assets/host.js
// Host controller: lobby, question flow, reveal, scoring, end game

(function () {
  "use strict";

  // ===== State =====
  var gameCode = "";
  var questions = [];
  var currentIndex = 0;
  var teams = {}; // { teamId: { name, score, joinedAt } }
  var timer = null;
  var isRevealed = false;
  var gRef = null; // Firebase game reference

  var HOST_SESSION_KEY = "comp_host_session";

  function saveHostSession() {
    try {
      localStorage.setItem(HOST_SESSION_KEY, JSON.stringify({ gameCode: gameCode }));
    } catch (e) {}
  }

  function clearHostSession() {
    try { localStorage.removeItem(HOST_SESSION_KEY); } catch (e) {}
  }

  function loadHostSession() {
    try {
      var raw = localStorage.getItem(HOST_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ===== Screen Management =====
  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    el(id).classList.add("active");
  }

  // ===== Init: Fetch questions & create game (with session restore) =====
  async function init() {
    showScreen("screenLoading");

    // Try restoring existing session
    var saved = loadHostSession();
    if (saved) {
      try {
        var ref = gameRef(saved.gameCode);
        var statusSnap = await ref.child("status").once("value");
        if (statusSnap.exists()) {
          var status = statusSnap.val();
          if (status === "lobby" || status === "playing") {
            gameCode = saved.gameCode;
            gRef = ref;
            gRef.child("hostConnected").set(true);
            gRef.child("hostConnected").onDisconnect().set(false);

            var qSnap = await gRef.child("questions").once("value");
            questions = qSnap.val() || [];

            var teamsSnap = await gRef.child("teams").once("value");
            var teamsData = teamsSnap.val() || {};
            Object.keys(teamsData).forEach(function (id) {
              teams[id] = teamsData[id];
            });

            if (status === "lobby") {
              setupLobby();
            } else {
              var idxSnap = await gRef.child("currentQuestionIndex").once("value");
              var idx = idxSnap.val() || 0;
              el("endGameWrap").classList.remove("hidden");
              restoreQuestion(idx);
            }
            return;
          }
        }
        clearHostSession();
      } catch (e) {
        console.error("Session restore failed:", e);
        clearHostSession();
      }
    }

    // Fresh game creation
    try {
      var raw = await fetchQuestionsFromSheet(CFG.sheetCsvUrl);
      questions = shuffleArray(raw);
      if (questions.length === 0) {
        alert("لم يتم العثور على أسئلة في الجدول!");
        return;
      }
      gameCode = generateGameCode();
      gRef = gameRef(gameCode);

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

      saveHostSession();
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

    // Generate QR code
    var teamUrl = new URL("team.html", window.location.href);
    teamUrl.searchParams.set("code", gameCode);
    el("qrCode").innerHTML = "";
    new QRCode(el("qrCode"), {
      text: teamUrl.toString(),
      width: 200,
      height: 200,
      colorDark: "#1A237E",
      colorLight: "#FFFFFF"
    });

    // Click QR to enlarge fullscreen
    var qrWrap = el("qrCode").closest(".qr-wrap");
    qrWrap.onclick = function () {
      var overlay = document.createElement("div");
      overlay.className = "qr-overlay";
      var clone = qrWrap.cloneNode(true);
      clone.onclick = function (e) { e.stopPropagation(); };
      overlay.appendChild(clone);
      overlay.onclick = function () { overlay.remove(); };
      document.body.appendChild(overlay);
    };

    // Copy join link button
    el("btnCopyLink").onclick = function () {
      var btn = el("btnCopyLink");
      navigator.clipboard.writeText(teamUrl.toString()).then(function () {
        btn.textContent = "✅ تم النسخ!";
        setTimeout(function () { btn.textContent = "📋 نسخ رابط الانضمام"; }, 2000);
      });
    };

    // Listen for teams joining
    gRef.child("teams").on("child_added", function (snap) {
      var teamId = snap.key;
      var data = snap.val();
      teams[teamId] = data;
      renderTeams();
    });
    gRef.child("teams").on("child_removed", function (snap) {
      delete teams[snap.key];
      renderTeams();
    });
  }

  function renderTeams() {
    var grid = el("teamsGrid");
    var ids = Object.keys(teams);
    el("teamCount").textContent = ids.length;
    grid.innerHTML = ids.map(function (id) {
      return '<div class="team-card">' + escapeHtml(teams[id].name) + '</div>';
    }).join("");
    el("btnStart").disabled = ids.length === 0;
  }

  // ===== Start Game =====
  el("btnStart").addEventListener("click", function () {
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
    var q = questions[index];
    if (!q) { endGame(); return; }

    showScreen("screenQuestion");
    el("qNumber").textContent = "سؤال " + (index + 1);
    el("questionCounter").textContent = "سؤال " + (index + 1);

    // Apply slide-in animation
    var card = el("questionCard");
    card.classList.remove("slide-in");
    void card.offsetWidth;
    card.classList.add("slide-in");

    // Question text
    el("qText").textContent = q.question;

    // Choices (Single-Choice only)
    var choicesEl = el("choicesHost");
    if (q.type === "Single-Choice") {
      var letters = ["a", "b", "c", "d"];
      var arabicLabels = { a: "أ", b: "ب", c: "ج", d: "د" };
      choicesEl.innerHTML = letters.map(function (letter) {
        return '<div class="choice" data-letter="' + letter.toUpperCase() + '">' +
          '<span class="choice-letter">' + arabicLabels[letter] + '</span>' +
          '<span>' + escapeHtml(q[letter]) + '</span>' +
          '</div>';
      }).join("");
      choicesEl.classList.remove("hidden");
    } else {
      choicesEl.innerHTML = "";
      choicesEl.classList.add("hidden");
    }

    // Reset UI
    el("teamAnswersWrap").classList.add("hidden");
    el("revealWrap").classList.add("hidden");
    el("manualRankWrap").classList.add("hidden");
    el("btnReveal").classList.remove("hidden");
    el("btnApplyScoring").classList.add("hidden");
    el("btnManualRank").classList.add("hidden");
    el("btnNext").classList.add("hidden");
    el("answerCounter").textContent = "";

    // Start timer
    var duration = CFG.timers[q.type] || 30;
    var endAt = Date.now() + duration * 1000;

    gRef.update({
      currentQuestionIndex: index,
      timerEndAt: endAt,
      timerStopped: false,
      showAnswer: false
    });

    if (timer) timer.destroy();
    timer = new TimerEngine(
      function (secs, frac) {
        el("timerHost").innerHTML = renderTimerSVG(secs, frac, secs <= 5);
      },
      function () {
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
    var answersRef = gRef.child("answers/" + qIndex);
    answersRef.off(); // clear previous listeners
    answersRef.on("value", function (snap) {
      var answers = snap.val() || {};
      var count = Object.keys(answers).length;
      var total = Object.keys(teams).length;
      el("answerCounter").textContent = "الفرق اللي جاوبت: " + count + " / " + total;
      if (count === total && total > 0) {
        el("answerCounter").classList.add("all-answered");
      } else {
        el("answerCounter").classList.remove("all-answered");
      }
    });
  }

  // ===== Restore Question (after page refresh) =====
  function restoreQuestion(index) {
    currentIndex = index;
    isRevealed = false;
    var q = questions[index];
    if (!q) { endGame(); return; }

    showScreen("screenQuestion");
    el("qNumber").textContent = "سؤال " + (index + 1);
    el("questionCounter").textContent = "سؤال " + (index + 1);

    var card = el("questionCard");
    card.classList.remove("slide-in");

    el("qText").textContent = q.question;

    var choicesEl = el("choicesHost");
    if (q.type === "Single-Choice") {
      var letters = ["a", "b", "c", "d"];
      var arabicLabels = { a: "أ", b: "ب", c: "ج", d: "د" };
      choicesEl.innerHTML = letters.map(function (letter) {
        return '<div class="choice" data-letter="' + letter.toUpperCase() + '">' +
          '<span class="choice-letter">' + arabicLabels[letter] + '</span>' +
          '<span>' + escapeHtml(q[letter]) + '</span>' +
          '</div>';
      }).join("");
      choicesEl.classList.remove("hidden");
    } else {
      choicesEl.innerHTML = "";
      choicesEl.classList.add("hidden");
    }

    el("teamAnswersWrap").classList.add("hidden");
    el("revealWrap").classList.add("hidden");
    el("manualRankWrap").classList.add("hidden");
    el("btnReveal").classList.remove("hidden");
    el("btnApplyScoring").classList.add("hidden");
    el("btnManualRank").classList.add("hidden");
    el("btnNext").classList.add("hidden");
    el("answerCounter").textContent = "";

    // Check current state from Firebase
    gRef.once("value", function (snap) {
      var game = snap.val() || {};
      if (game.showAnswer) {
        isRevealed = true;
        el("btnReveal").classList.add("hidden");
        if (q.type === "Single-Choice") {
          revealSingleChoice(q);
        } else {
          revealOpenAnswer(q);
        }
      } else if (game.timerStopped) {
        if (timer) timer.destroy();
        el("timerHost").innerHTML = renderTimerSVG(0, 0, true);
      } else {
        var endAt = game.timerEndAt || 0;
        var duration = CFG.timers[q.type] || 30;
        if (timer) timer.destroy();
        timer = new TimerEngine(
          function (secs, frac) {
            el("timerHost").innerHTML = renderTimerSVG(secs, frac, secs <= 5);
          },
          function () {
            playBell();
            el("timerHost").innerHTML = renderTimerSVG(0, 0, true);
          }
        );
        timer.start(endAt, duration);
      }
    });

    listenForAnswers(index);
    updateScoreboard();
  }

  // ===== Reveal Answer =====
  el("btnReveal").addEventListener("click", function () {
    if (isRevealed) return;
    isRevealed = true;

    // Stop timer
    if (timer) timer.stop();
    gRef.update({ timerStopped: true, showAnswer: true });
    playBell();

    var q = questions[currentIndex];
    el("btnReveal").classList.add("hidden");

    if (q.type === "Single-Choice") {
      revealSingleChoice(q);
    } else {
      revealOpenAnswer(q);
    }
  });

  function revealSingleChoice(q) {
    // Highlight correct choice
    var correctLetter = q.correct.toUpperCase();
    var choices = document.querySelectorAll("#choicesHost .choice");
    for (var i = 0; i < choices.length; i++) {
      var ch = choices[i];
      var letter = ch.dataset.letter;
      if (letter === correctLetter) {
        ch.classList.add("correct");
        playCorrect();
      } else {
        ch.classList.add("wrong");
      }
      ch.classList.add("disabled");
    }

    // Show perfect answer
    el("correctAnswerText").textContent = "الإجابة الصحيحة: " + correctLetter;
    el("perfectAnswerText").textContent = q.perfect;
    el("revealWrap").classList.remove("hidden");

    // Auto-score and show ranking
    gRef.child("answers/" + currentIndex).once("value", function (snap) {
      var answers = snap.val() || {};
      gRef.child("timerEndAt").once("value", function (teSnap) {
        var timerEndAt = teSnap.val() || 0;
        var duration = CFG.timers[q.type] || 30;
        var questionStartTime = timerEndAt - duration * 1000;
        var scoring = calculateScoring(answers, q.correct, "Single-Choice", questionStartTime);
        showRanking(scoring);
        applyScores(scoring);
        el("btnNext").classList.remove("hidden");
      });
    });
  }

  function revealOpenAnswer(q) {
    // Show team answers for host to mark
    gRef.child("answers/" + currentIndex).once("value", function (snap) {
      var answers = snap.val() || {};
      gRef.child("timerEndAt").once("value", function (teSnap) {
      var timerEndAt = teSnap.val() || 0;
      var duration = CFG.timers[q.type] || 30;
      var questionStartTime = timerEndAt - duration * 1000;

      var sorted = Object.keys(answers).map(function (tid) {
        return { teamId: tid, answer: answers[tid].answer, timestamp: answers[tid].timestamp || 0 };
      }).sort(function (a, b) { return a.timestamp - b.timestamp; });

      var list = el("teamAnswersList");
      list.innerHTML = sorted.map(function (a) {
        var teamName = teams[a.teamId] ? teams[a.teamId].name : a.teamId;
        var elapsed = questionStartTime ? ((a.timestamp - questionStartTime) / 1000).toFixed(2) : "";
        return '<li class="team-answer-item" data-team-id="' + a.teamId + '">' +
          '<span class="team-name">' + escapeHtml(teamName) + '</span>' +
          (elapsed ? '<span class="team-elapsed">' + elapsed + ' sec</span>' : '') +
          '<span class="team-response">' + escapeHtml(a.answer || "—") + '</span>' +
          '<button class="mark-btn" title="صحيح">✓</button>' +
          '</li>';
      }).join("");

      el("teamAnswersWrap").classList.remove("hidden");

      // Show perfect answer
      el("correctAnswerText").textContent = "الإجابة المثالية:";
      el("perfectAnswerText").textContent = q.perfect;
      el("revealWrap").classList.remove("hidden");

      // Show "apply scoring" and "manual rank" buttons
      el("btnApplyScoring").classList.remove("hidden");
      el("btnManualRank").classList.remove("hidden");
      }); // end timerEndAt callback
    }); // end answers callback
  }

  // Toggle correct mark on open-answer items (whole row is clickable)
  document.addEventListener("click", function (e) {
    var item = e.target.closest(".team-answer-item");
    if (!item || item.closest("#manualRankList")) return; // skip manual ranking items
    item.classList.toggle("marked-correct");
  });

  // Apply scoring for open-answer (auto-rank by timestamp)
  el("btnApplyScoring").addEventListener("click", function () {
    var items = document.querySelectorAll("#teamAnswersList .team-answer-item");
    var updates = {};
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var teamId = item.dataset.teamId;
      var isCorrect = item.classList.contains("marked-correct");
      updates[teamId + "/correct"] = isCorrect;
    }
    gRef.child("answers/" + currentIndex).update(updates).then(function () {
      // Recalculate scoring
      gRef.child("answers/" + currentIndex).once("value", function (snap) {
        var answers = snap.val() || {};
        var q = questions[currentIndex];
        gRef.child("timerEndAt").once("value", function (teSnap) {
          var timerEndAt = teSnap.val() || 0;
          var duration = CFG.timers[q.type] || 30;
          var questionStartTime = timerEndAt - duration * 1000;
          var scoring = calculateScoring(answers, q.correct, "Open-Answer", questionStartTime);
          showRanking(scoring);
          applyScores(scoring);
          el("btnApplyScoring").classList.add("hidden");
          el("btnManualRank").classList.add("hidden");
          el("manualRankWrap").classList.add("hidden");
          el("btnNext").classList.remove("hidden");
          playCorrect();
        });
      });
    });
  });

  // ===== Manual Ranking =====
  el("btnManualRank").addEventListener("click", function () {
    // Collect only teams marked correct
    var items = document.querySelectorAll("#teamAnswersList .team-answer-item");
    var correctTeams = [];
    var wrongTeams = [];
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var tid = item.dataset.teamId;
      var tName = teams[tid] ? teams[tid].name : tid;
      if (item.classList.contains("marked-correct")) {
        correctTeams.push({ teamId: tid, name: tName });
      } else {
        wrongTeams.push({ teamId: tid, name: tName });
      }
    }

    if (correctTeams.length === 0) {
      // No correct teams, nothing to rank
      return;
    }

    // Build ranking panel
    var list = el("manualRankList");
    list.innerHTML = correctTeams.map(function (t) {
      return '<li class="team-answer-item manual-rank-item" data-team-id="' + t.teamId + '" data-rank="0">' +
        '<span class="rank-cycle-btn" title="اضغط لتغيير الترتيب">—</span>' +
        '<span class="team-name">' + escapeHtml(t.name) + '</span>' +
        '</li>';
    }).join("");

    el("manualRankWrap").classList.remove("hidden");
    // Store wrongTeams for later use
    el("manualRankWrap").dataset.wrongTeams = JSON.stringify(wrongTeams);
  });

  // Cycle rank on click (—, 1st, 2nd, 3rd)
  document.addEventListener("click", function (e) {
    var badge = e.target.closest(".rank-cycle-btn");
    if (!badge) return;
    var item = badge.closest(".manual-rank-item");
    if (!item) return;
    var rank = parseInt(item.dataset.rank) || 0;
    rank = (rank + 1) % 5; // 0=none, 1=1st, 2=2nd, 3=3rd, 4=4th
    item.dataset.rank = rank;
    var labels = ["—", "1", "2", "3", "4"];
    var classes = ["", "rank-1", "rank-2", "rank-3", "rank-other"];
    badge.textContent = labels[rank];
    badge.className = "rank-cycle-btn" + (classes[rank] ? " " + classes[rank] : "");
  });

  // Confirm manual ranking
  el("btnConfirmRank").addEventListener("click", function () {
    var items = document.querySelectorAll("#manualRankList .manual-rank-item");
    var scoringTiers = CFG.scoring; // [5, 4, 3, 2]
    var scoring = [];

    // First update correct marks in Firebase
    var answerItems = document.querySelectorAll("#teamAnswersList .team-answer-item");
    var updates = {};
    for (var i = 0; i < answerItems.length; i++) {
      var ai = answerItems[i];
      var tid = ai.dataset.teamId;
      var isCorrect = ai.classList.contains("marked-correct");
      updates[tid + "/correct"] = isCorrect;
    }

    // Build scoring from manual ranks
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var teamId = item.dataset.teamId;
      var rank = parseInt(item.dataset.rank) || 0;
      var points;
      if (rank >= 1 && rank <= scoringTiers.length) {
        points = scoringTiers[rank - 1];
      } else {
        points = 1; // correct but unranked gets participation point
      }
      scoring.push({ teamId: teamId, points: points, rank: rank || (scoringTiers.length + 1) });
    }

    // Add wrong teams with 0 points
    var wrongTeams = [];
    try { wrongTeams = JSON.parse(el("manualRankWrap").dataset.wrongTeams || "[]"); } catch (e) {}
    wrongTeams.forEach(function (t) {
      scoring.push({ teamId: t.teamId, points: 0, rank: -1 });
    });

    // Sort by rank for display (1st, 2nd, 3rd, other, wrong)
    scoring.sort(function (a, b) {
      if (a.rank === -1 && b.rank === -1) return 0;
      if (a.rank === -1) return 1;
      if (b.rank === -1) return -1;
      return a.rank - b.rank;
    });

    gRef.child("answers/" + currentIndex).update(updates).then(function () {
      showRanking(scoring);
      applyScores(scoring);
      el("btnApplyScoring").classList.add("hidden");
      el("btnManualRank").classList.add("hidden");
      el("manualRankWrap").classList.add("hidden");
      el("btnNext").classList.remove("hidden");
      playCorrect();
    });
  });

  // ===== Show Ranking =====
  function showRanking(scoring) {
    var list = el("rankingList");
    list.innerHTML = scoring.map(function (s) {
      var teamName = teams[s.teamId] ? teams[s.teamId].name : s.teamId;
      var rankClass = s.rank === 1 ? "rank-1" : s.rank === 2 ? "rank-2" : s.rank === 3 ? "rank-3" : s.rank > 0 ? "rank-other" : "rank-wrong";
      var rankLabel = s.rank > 0 ? s.rank : "✗";
      var elapsedHtml = s.elapsed ? '<span class="rank-elapsed">' + s.elapsed + ' sec</span>' : '';
      return '<li>' +
        '<span class="rank-badge ' + rankClass + '">' + rankLabel + '</span>' +
        '<span class="rank-name">' + escapeHtml(teamName) + '</span>' +
        elapsedHtml +
        '<span class="rank-points ' + (s.points === 0 ? 'zero' : '') + '">+' + s.points + '</span>' +
        '</li>';
    }).join("");
  }

  // ===== Apply Scores =====
  function applyScores(scoring) {
    var updates = {};
    scoring.forEach(function (s) {
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
    var sorted = Object.keys(teams).map(function (id) {
      return { id: id, name: teams[id].name, score: teams[id].score || 0 };
    }).sort(function (a, b) { return b.score - a.score; });

    el("scoreboardCount").textContent = sorted.length + " فرق";
    el("scoreList").innerHTML = sorted.map(function (t, i) {
      return '<li class="score-item">' +
        '<span class="score-rank">' + (i + 1) + '</span>' +
        '<span class="score-name">' + escapeHtml(t.name) + '</span>' +
        '<span class="score-pts">' + t.score + '</span>' +
        '</li>';
    }).join("");
  }

  // ===== Next Question =====
  el("btnNext").addEventListener("click", function () {
    var nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      endGame();
    } else {
      showQuestion(nextIndex);
    }
  });

  // ===== End Game =====
  function endGame() {
    clearHostSession();
    gRef.update({ status: "ended" });
    if (timer) timer.destroy();
    el("endGameWrap").classList.add("hidden");

    showScreen("screenFinal");

    var sorted = Object.keys(teams).map(function (id) {
      return { id: id, name: teams[id].name, score: teams[id].score || 0 };
    }).sort(function (a, b) { return b.score - a.score; });

    if (sorted.length > 0) {
      el("winnerName").textContent = sorted[0].name;
      launchConfetti(el("confetti"), 100);
      playCorrect();
    }

    el("finalList").innerHTML = sorted.map(function (t, i) {
      var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
      return '<li class="final-item">' +
        '<span class="final-rank">' + medal + '</span>' +
        '<span class="final-name">' + escapeHtml(t.name) + '</span>' +
        '<span class="final-score">' + t.score + '</span>' +
        '</li>';
    }).join("");
  }

  // ===== End Game Button (with confirmation) =====
  el("btnEndGame").addEventListener("click", function () {
    showConfirm("إنهاء اللعبة", "هل أنت متأكد من إنهاء اللعبة وعرض النتائج النهائية؟", function () {
      endGame();
    });
  });

  // ===== Confirmation Dialog =====
  var pendingConfirm = null;

  function showConfirm(title, msg, onConfirm) {
    el("dialogTitle").textContent = title;
    el("dialogMsg").textContent = msg;
    el("confirmDialog").classList.add("active");
    pendingConfirm = onConfirm;
  }

  el("dialogConfirm").addEventListener("click", function () {
    el("confirmDialog").classList.remove("active");
    if (pendingConfirm) {
      pendingConfirm();
      pendingConfirm = null;
    }
  });

  el("dialogCancel").addEventListener("click", function () {
    el("confirmDialog").classList.remove("active");
    pendingConfirm = null;
  });

  // ===== Start =====
  init();
})();
