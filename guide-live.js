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
