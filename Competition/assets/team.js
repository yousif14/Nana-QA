// Competition/assets/team.js
// Team controller: join, answer questions, show score

(function () {
  "use strict";

  // ===== State =====
  var gameCode = "";
  var teamId = "";
  var teamName = "";
  var gRef = null;
  var questions = [];
  var currentIndex = -1;
  var hasAnswered = false;
  var timer = null;
  var myScore = 0;

  var SESSION_KEY = "comp_team_session";

  // ===== Screen Management =====
  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) screens[i].classList.remove("active");
    el(id).classList.add("active");
  }

  // ===== Session Persistence =====
  function saveSession() {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        gameCode: gameCode,
        teamId: teamId,
        teamName: teamName
      }));
    } catch (e) { /* localStorage unavailable */ }
  }

  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function loadSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  // ===== Try restoring saved session =====
  (async function tryRestore() {
    var saved = loadSession();
    if (!saved) return; // no saved session, show join screen normally

    var ref = gameRef(saved.gameCode);
    try {
      var statusSnap = await ref.child("status").once("value");
      if (!statusSnap.exists()) { clearSession(); return; }

      var status = statusSnap.val();
      if (status === "ended") { clearSession(); return; }

      // Verify team entry still exists
      var teamSnap = await ref.child("teams/" + saved.teamId).once("value");
      if (!teamSnap.exists()) { clearSession(); return; }

      // Restore state
      gameCode = saved.gameCode;
      teamId = saved.teamId;
      teamName = saved.teamName;
      gRef = ref;

      el("teamNameHeader").textContent = teamName;

      if (status === "lobby") {
        el("waitTeamName").textContent = teamName;
        showScreen("screenWaiting");
        waitForGameStart();
      } else if (status === "playing") {
        startListening();
      }
    } catch (e) {
      console.error("Session restore failed:", e);
      clearSession();
    }
  })();

  // ===== Auto-fill code from URL =====
  var urlParams = new URLSearchParams(window.location.search);
  var codeFromUrl = urlParams.get("code");
  if (codeFromUrl) {
    el("inputCode").value = codeFromUrl;
  }

  // ===== Join =====
  el("btnJoin").addEventListener("click", async function () {
    var code = el("inputCode").value.trim();
    var name = el("inputName").value.trim();
    var errorEl = el("joinError");

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
    el("btnJoin").disabled = true;

    gameCode = code;
    teamName = name;
    gRef = gameRef(gameCode);

    // Check game exists
    try {
      var snap = await gRef.child("status").once("value");
      if (!snap.exists()) {
        errorEl.textContent = "كود اللعبة غير صحيح";
        errorEl.style.display = "block";
        el("btnJoin").disabled = false;
        return;
      }

      var status = snap.val();
      if (status === "ended") {
        errorEl.textContent = "هذه اللعبة انتهت";
        errorEl.style.display = "block";
        el("btnJoin").disabled = false;
        return;
      }

      // Register team
      teamId = generateTeamId();
      await gRef.child("teams/" + teamId).set({
        name: teamName,
        score: 0,
        joinedAt: firebase.database.ServerValue.TIMESTAMP
      });

      // Save session for reconnection on refresh
      saveSession();

      el("teamNameHeader").textContent = teamName;

      if (status === "lobby") {
        el("waitTeamName").textContent = teamName;
        showScreen("screenWaiting");
        waitForGameStart();
      } else if (status === "playing") {
        // Game already in progress — join mid-game
        startListening();
      }
    } catch (e) {
      console.error(e);
      errorEl.textContent = "خطأ في الاتصال. تأكد من الكود وحاول مرة أخرى.";
      errorEl.style.display = "block";
      el("btnJoin").disabled = false;
    }
  });

  // ===== Wait for game to start =====
  function waitForGameStart() {
    gRef.child("status").on("value", function (snap) {
      var status = snap.val();
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
    gRef.child("questions").once("value", function (snap) {
      questions = snap.val() || [];

      // Now listen for question changes (after questions are loaded)
      gRef.child("currentQuestionIndex").on("value", function (snap2) {
        var idx = snap2.val();
        if (idx === null || idx === undefined) return;
        if (idx !== currentIndex) {
          currentIndex = idx;
          hasAnswered = false;
          showTeamQuestion(idx);
        }
      });
    });

    // Listen for timer stop
    gRef.child("timerStopped").on("value", function (snap) {
      if (snap.val() === true && timer) {
        timer.stop();
      }
    });

    // Listen for answer reveal
    gRef.child("showAnswer").on("value", function (snap) {
      if (snap.val() === true && currentIndex >= 0) {
        showTeamReveal();
      }
    });

    // Listen for score updates
    gRef.child("teams/" + teamId + "/score").on("value", function (snap) {
      var newScore = snap.val() || 0;
      var delta = newScore - myScore;
      myScore = newScore;
      el("myScoreValue").textContent = myScore;
      if (delta > 0) {
        showPointsPopup(delta);
      }
    });

    // Listen for game end
    gRef.child("status").on("value", function (snap) {
      if (snap.val() === "ended") {
        showFinalScreen();
      }
    });

    el("myScoreBar").classList.remove("hidden");
  }

  // ===== Show Question on Team Device =====
  function showTeamQuestion(idx) {
    var q = questions[idx];
    if (!q) return;

    showScreen("screenQuestion");

    // Slide animation
    var card = el("teamQuestionCard");
    card.classList.remove("slide-in");
    void card.offsetWidth;
    card.classList.add("slide-in");

    el("tqNumber").textContent = "سؤال " + (idx + 1);
    el("tqText").textContent = q.question;

    // Reset UI
    el("answerLockedWrap").classList.add("hidden");
    el("teamRevealWrap").classList.add("hidden");

    // Hide points badge from previous question
    var pointsPopup = el("pointsPopup");
    pointsPopup.classList.add("hidden");
    pointsPopup.classList.remove("points-badge");

    if (q.type === "Single-Choice") {
      el("teamChoices").classList.remove("hidden");
      el("openAnswerWrap").classList.add("hidden");
      var letters = ["a", "b", "c", "d"];
      var arabicLabels = { a: "أ", b: "ب", c: "ج", d: "د" };
      el("teamChoices").innerHTML = letters.map(function (letter) {
        return '<div class="choice" data-letter="' + letter.toUpperCase() + '" data-idx="' + idx + '">' +
          '<span class="choice-letter">' + arabicLabels[letter] + '</span>' +
          '<span>' + escapeHtml(q[letter]) + '</span>' +
          '</div>';
      }).join("");
    } else {
      el("teamChoices").classList.add("hidden");
      el("openAnswerWrap").classList.remove("hidden");
      el("openAnswerInput").value = "";
    }

    // Start timer
    gRef.child("timerEndAt").once("value", function (snap) {
      var endAt = snap.val() || 0;
      var duration = CFG.timers[q.type] || 30;
      if (timer) timer.destroy();
      timer = new TimerEngine(
        function (secs, frac) {
          el("timerTeam").innerHTML = renderTimerSVG(secs, frac, secs <= 5);
        },
        function () {
          playBell();
          el("timerTeam").innerHTML = renderTimerSVG(0, 0, true);
        }
      );
      timer.start(endAt, duration);
    });
  }

  // ===== Single-Choice: tap to answer =====
  document.addEventListener("click", function (e) {
    var choice = e.target.closest(".choice");
    if (!choice || hasAnswered) return;
    var letter = choice.dataset.letter;
    var idx = parseInt(choice.dataset.idx);
    if (isNaN(idx) || idx !== currentIndex) return;

    hasAnswered = true;
    submitAnswer(letter);

    // Visual feedback
    choice.classList.add("selected");
    var allChoices = document.querySelectorAll("#teamChoices .choice");
    for (var i = 0; i < allChoices.length; i++) allChoices[i].classList.add("disabled");
    showLocked(letter);
  });

  // ===== Open-Answer: submit =====
  el("btnSubmitOpen").addEventListener("click", function () {
    if (hasAnswered) return;
    var answer = el("openAnswerInput").value.trim();
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
    el("teamChoices").classList.add("hidden");
  }

  // ===== Show Reveal on Team Side =====
  function showTeamReveal() {
    var q = questions[currentIndex];
    if (!q) return;

    if (q.type === "Single-Choice") {
      // Highlight correct choice
      var correctLetter = q.correct.toUpperCase();
      var choices = document.querySelectorAll("#teamChoices .choice");
      el("teamChoices").classList.remove("hidden");
      for (var i = 0; i < choices.length; i++) {
        var ch = choices[i];
        var letter = ch.dataset.letter;
        if (letter === correctLetter) {
          ch.classList.add("correct");
        } else {
          ch.classList.add("wrong");
        }
      }
      playCorrect();
    }

    el("teamCorrectText").textContent = q.type === "Single-Choice"
      ? "الإجابة الصحيحة: " + q.correct
      : "الإجابة المثالية:";
    el("teamPerfectText").textContent = q.perfect;
    el("teamRevealWrap").classList.remove("hidden");

    // Show the elapsed time the host computed (from scoring data)
    gRef.child("scoring/" + currentIndex).once("value", function (snap) {
      var scoring = snap.val();
      if (!scoring) return;
      // scoring is an object keyed by push-id or index; find our team's entry
      var entries = Object.values(scoring);
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].teamId === teamId && entries[i].elapsed != null) {
          var elapsedEl = document.getElementById("lockedElapsed");
          if (!elapsedEl) {
            elapsedEl = document.createElement("div");
            elapsedEl.id = "lockedElapsed";
            elapsedEl.className = "locked-elapsed";
            el("lockedAnswerText").insertAdjacentElement("afterend", elapsedEl);
          }
          elapsedEl.textContent = entries[i].elapsed + " sec";
          break;
        }
      }
    });
  }

  // ===== Points Popup =====
  function showPointsPopup(delta) {
    var popup = el("pointsPopup");
    var text = el("pointsPopupText");
    var particles = el("pointsParticles");

    // Determine weight class
    var weightClass;
    if (delta >= 5) { weightClass = "points-gold"; }
    else if (delta >= 4) { weightClass = "points-silver"; }
    else if (delta >= 3) { weightClass = "points-bronze"; }
    else { weightClass = "points-simple"; }

    // Reset
    popup.className = "points-popup " + weightClass;
    text.textContent = "+" + delta;
    particles.innerHTML = "";

    // Add particles for gold/silver/bronze
    if (weightClass !== "points-simple") {
      for (var i = 0; i < 12; i++) {
        var p = document.createElement("div");
        p.className = "pp-particle";
        p.style.setProperty("--angle", (i * 30) + "deg");
        p.style.setProperty("--delay", (Math.random() * 0.3) + "s");
        particles.appendChild(p);
      }
    }

    // Play sound for top tiers
    if (delta >= 3) { playCorrect(); }

    // Show
    popup.classList.remove("hidden");

    // Auto-dismiss → shrink to badge
    setTimeout(function () {
      popup.classList.add("points-dismiss");
      setTimeout(function () {
        popup.classList.remove("points-dismiss");
        popup.classList.add("points-badge");
      }, 400);
    }, 2500);
  }

  // ===== Final Screen =====
  function showFinalScreen() {
    if (timer) timer.destroy();
    clearSession();
    showScreen("screenFinal");
    el("myScoreBar").classList.add("hidden");

    gRef.child("teams").once("value", function (snap) {
      var allTeams = snap.val() || {};
      var sorted = Object.keys(allTeams).map(function (id) {
        return { id: id, name: allTeams[id].name, score: allTeams[id].score || 0 };
      }).sort(function (a, b) { return b.score - a.score; });

      if (sorted.length > 0) {
        el("teamWinnerName").textContent = sorted[0].name;
        launchConfetti(el("confetti"), 80);
      }

      el("teamFinalList").innerHTML = sorted.map(function (t, i) {
        var medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : (i + 1);
        var isMe = t.id === teamId;
        return '<li class="final-item"' + (isMe ? ' style="border-color:var(--pink);background:rgba(240,98,146,.06);"' : '') + '>' +
          '<span class="final-rank">' + medal + '</span>' +
          '<span class="final-name">' + escapeHtml(t.name) + (isMe ? ' (أنت)' : '') + '</span>' +
          '<span class="final-score">' + t.score + '</span>' +
          '</li>';
      }).join("");
    });
  }
})();
