// ==========================
// 🔊 VOICE SYSTEM
// ==========================
let spokenEvents = {};

function speak(text) {
  if (!('speechSynthesis' in window)) return;

  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1;
  msg.pitch = 1;
  msg.volume = 1;

  speechSynthesis.cancel(); // stop overlap
  speechSynthesis.speak(msg);
}

// Countdown voice helper
function countdownVoice(label) {
  let count = 10;

  function step() {
    if (count > 0) {
      speak(`${label} in ${count}`);
      count--;
      setTimeout(step, 1000);
    } else {
      speak(label + " now");
    }
  }

  step();
}

// Example eclipse times (EDIT THESE for your location)
const eclipseStart = new Date("2026-08-12T09:00:00");
const eclipseMax = new Date("2026-08-12T10:30:00"); // maximum eclipse (greatest eclipse)
const eclipseEnd = new Date("2026-08-12T12:00:00");

function updateTimers() {
  const now = new Date();

  updateTimer("startTimer", eclipseStart - now);
  updateTimer("maxTimer", eclipseMax - now);
  updateTimer("endTimer", eclipseEnd - now);

  updatePhase(now);
}

function updateTimer(id, diff) {
  if (diff <= 0) {
    document.getElementById(id).innerText = "00:00:00";
    return;
  }

  const h = Math.floor(diff / 1000 / 60 / 60);
  const m = Math.floor(diff / 1000 / 60) % 60;
  const s = Math.floor(diff / 1000) % 60;

  document.getElementById(id).innerText =
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function updatePhase(now) {
  let phaseText = "Waiting for Eclipse...";

  if (now >= eclipseStart && now < eclipseMax) {
    phaseText = "Eclipse in Progress";
  } else if (now >= eclipseMax && now < eclipseEnd) {
    phaseText = "Maximum Eclipse (Greatest Eclipse)";
  } else if (now >= eclipseEnd) {
    phaseText = "Eclipse Finished";
  }

  document.getElementById("eclipsePhase").innerText = phaseText;
}

setInterval(updateTimers, 1000);

function speak(text) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.rate = 1;
  msg.pitch = 1;
  speechSynthesis.speak(msg);
}

// Countdown voice triggers
function checkVoiceAlerts() {
  const now = new Date();

  const timeToStart = Math.floor((eclipseStart - now) / 1000);
  const timeToMax = Math.floor((eclipseMax - now) / 1000);

  // Glasses warning
  if (timeToStart === 10) {
    speak("Put your eclipse glasses on in 10 seconds");
  }

  if (timeToStart <= 10 && timeToStart > 0) {
    speak(timeToStart.toString());
  }

  // Maximum eclipse countdown
  if (timeToMax === 10) {
    speak("Maximum eclipse in 10 seconds");
  }

  if (timeToMax <= 10 && timeToMax > 0) {
    speak(timeToMax.toString());
  }
}

setInterval(checkVoiceAlerts, 1000);
