/**
 * Solar Eclipse Guide UK 2026 — Main Application Script
 *
 * Sections:
 *  1. App Init & Service Worker
 *  2. Loading Screen
 *  3. Navigation
 *  4. Countdown Timer
 *  5. Eclipse Data
 *  6. Location System
 *  7. Compass / Find the Eclipse
 *  8. Eclipse Simulator (slider)
 *  9. Live Streams
 * 10. Settings (dark mode, animations)
 * 11. PWA Install Prompt
 * 12. Helpers
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   1. APP INIT & SERVICE WORKER
   ═══════════════════════════════════════════════════════════════════════════ */

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(err => {
      console.warn('Service Worker registration failed:', err);
    });
  });
}

// App state — holds runtime data
const APP = {
  currentPage:  'home',
  userLat:      null,
  userLng:      null,
  locationName: null,
  compassActive:      false,
  compassPermission:  false,
  currentHeading:     null,
  animationsEnabled:  true,
  darkMode:           true,
  deferredInstallPrompt: null,
  countdownInterval:  null,
  loadingMessages: [
    'Aligning with the cosmos…',
    'Preparing your eclipse experience…',
    'Calculating celestial paths…',
    'Synchronising with the sun…',
  ],
};

// Called once the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  showLoadingScreen(() => {
    revealApp();
    initCountdown();
    buildCityTable();
    buildCityDirectionTable();
    initSimulator();
    initOnlineListener();
    initInstallPrompt();
  });
});

/* ═══════════════════════════════════════════════════════════════════════════
   2. LOADING SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Show the eclipse loading animation, then call `callback` once complete.
 * Duration matches the moon-cross CSS animation (3.2 s + 0.5 s delay ≈ 3.7 s).
 */
function showLoadingScreen(callback, shortMode = false) {
  const screen = document.getElementById('loading-screen');
  const textEl  = document.getElementById('loading-text');

  if (!screen) { callback && callback(); return; }

  // Pick a random loading message
  textEl.textContent = APP.loadingMessages[
    Math.floor(Math.random() * APP.loadingMessages.length)
  ];

  screen.classList.remove('fade-out');
  screen.style.display = 'flex';

  const duration = shortMode ? 1800 : 3700;

  setTimeout(() => {
    screen.classList.add('fade-out');
    setTimeout(() => {
      screen.style.display = 'none';
      callback && callback();
    }, 420); // matches CSS transition
  }, duration);
}

/** Show a quick transition loading screen between pages */
function showPageTransition(callback) {
  if (!APP.animationsEnabled) { callback && callback(); return; }
  showLoadingScreen(callback, true);
}

/* ═══════════════════════════════════════════════════════════════════════════
   3. NAVIGATION
   ═══════════════════════════════════════════════════════════════════════════ */

/** Reveal the main app shell after the loading screen */
function revealApp() {
  const app = document.getElementById('app');
  app.classList.remove('hidden');
}

/**
 * Navigate to a named page tab.
 * @param {string} pageName - One of: home | guide | find | live | settings
 */
function navigateTo(pageName) {
  if (pageName === APP.currentPage) return;

  // Haptic feedback — supported on some mobile browsers
  if (navigator.vibrate) navigator.vibrate(10);

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === pageName);
  });

  // Hide current page, show new one
  const currentSection = document.querySelector('.page.active');
  const nextSection    = document.getElementById('page-' + pageName);
  if (!nextSection) return;

  if (currentSection) currentSection.classList.remove('active');

  APP.currentPage = pageName;

  if (APP.animationsEnabled) {
    // Brief loading animation between pages
    showPageTransition(() => {
      nextSection.classList.add('active');
      // Scroll to top
      document.querySelector('.page-container').scrollTo({ top: 0 });
      onPageEnter(pageName);
    });
  } else {
    nextSection.classList.add('active');
    document.querySelector('.page-container').scrollTo({ top: 0 });
    onPageEnter(pageName);
  }
}

/** Called after a page becomes visible — lazy init hooks */
function onPageEnter(pageName) {
  if (pageName === 'live') checkOnlineStatus();
  if (pageName === 'find') updateFindPageLocation();
}

/** Scroll the guide to a particular subsection */
function showSection(sectionId) {
  setTimeout(() => {
    const el = document.getElementById('section-' + sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 600);
}

/* ═══════════════════════════════════════════════════════════════════════════
   4. COUNTDOWN TIMER
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Eclipse target: 12 August 2026 at 18:13:45 BST (UTC+1)
 * Stored as UTC: 17:13:45 UTC
 */
const ECLIPSE_DATE_UTC = new Date(Date.UTC(2026, 7, 12, 17, 13, 45)); // month is 0-indexed

function initCountdown() {
  updateCountdown(); // run once immediately
  APP.countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const now  = new Date();
  const diff = ECLIPSE_DATE_UTC - now;

  const card        = document.querySelector('.countdown-card');
  const statusLabel = document.getElementById('countdown-status');
  const grid        = document.getElementById('countdown-grid');

  if (diff <= 0) {
    // Eclipse is happening (or has just started — keep showing for 2 hours)
    const endTime = new Date(ECLIPSE_DATE_UTC.getTime() + 2 * 60 * 60 * 1000);
    if (now < endTime) {
      // Eclipse now!
      statusLabel.textContent = '';
      grid.innerHTML = '<div class="eclipse-now-msg">🌑 The eclipse is happening now!</div>';
    } else {
      // Eclipse has passed
      statusLabel.textContent = 'Eclipse completed on';
      grid.innerHTML = '<div class="eclipse-now-msg" style="color:var(--text-secondary)">12 August 2026</div>';
    }
    clearInterval(APP.countdownInterval);
    return;
  }

  // Decompose milliseconds into time units
  const totalSecs = Math.floor(diff / 1000);
  const days  = Math.floor(totalSecs / 86400);
  const hours = Math.floor((totalSecs % 86400) / 3600);
  const mins  = Math.floor((totalSecs % 3600) / 60);
  const secs  = totalSecs % 60;

  setCountdownUnit('cd-days',  pad(days));
  setCountdownUnit('cd-hours', pad(hours));
  setCountdownUnit('cd-mins',  pad(mins));
  setCountdownUnit('cd-secs',  pad(secs), true); // tick animation on seconds
}

/** Update a single countdown number element, optionally ticking */
function setCountdownUnit(id, value, tick = false) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.textContent !== value) {
    el.textContent = value;
    if (tick && APP.animationsEnabled) {
      el.classList.remove('tick');
      void el.offsetWidth; // force reflow
      el.classList.add('tick');
      setTimeout(() => el.classList.remove('tick'), 200);
    }
  }
}

function pad(n) {
  return String(n).padStart(2, '0');
}

/* ═══════════════════════════════════════════════════════════════════════════
   5. ECLIPSE DATA
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * UK eclipse data for 12 August 2026.
 * direction = approximate azimuth (degrees) of the sun at maximum eclipse (18:13 BST)
 * coverage  = approximate maximum coverage percentage
 * Source: based on NASA eclipse data & Xavier Jubier calculator estimates.
 */
const ECLIPSE_DATA = [
  { city: 'Edinburgh',       lat: 55.95, lng: -3.19,  direction: 257, coverage: 96, totality: false },
  { city: 'Glasgow',         lat: 55.86, lng: -4.25,  direction: 257, coverage: 97, totality: false },
  { city: 'Inverness',       lat: 57.48, lng: -4.22,  direction: 256, coverage: 99, totality: true  },
  { city: 'Aberdeen',        lat: 57.15, lng: -2.09,  direction: 257, coverage: 98, totality: false },
  { city: 'Newcastle',       lat: 54.98, lng: -1.61,  direction: 258, coverage: 93, totality: false },
  { city: 'Leeds',           lat: 53.80, lng: -1.55,  direction: 258, coverage: 90, totality: false },
  { city: 'Manchester',      lat: 53.48, lng: -2.24,  direction: 259, coverage: 89, totality: false },
  { city: 'Sheffield',       lat: 53.38, lng: -1.47,  direction: 259, coverage: 89, totality: false },
  { city: 'Liverpool',       lat: 53.41, lng: -2.99,  direction: 259, coverage: 89, totality: false },
  { city: 'Birmingham',      lat: 52.48, lng: -1.90,  direction: 260, coverage: 85, totality: false },
  { city: 'Leicester',       lat: 52.64, lng: -1.13,  direction: 260, coverage: 86, totality: false },
  { city: 'Nottingham',      lat: 52.95, lng: -1.15,  direction: 259, coverage: 87, totality: false },
  { city: 'Cambridge',       lat: 52.21, lng:  0.12,  direction: 261, coverage: 84, totality: false },
  { city: 'Norwich',         lat: 52.63, lng:  1.30,  direction: 261, coverage: 84, totality: false },
  { city: 'Oxford',          lat: 51.75, lng: -1.26,  direction: 261, coverage: 82, totality: false },
  { city: 'Bristol',         lat: 51.45, lng: -2.60,  direction: 261, coverage: 81, totality: false },
  { city: 'London',          lat: 51.51, lng: -0.13,  direction: 261, coverage: 82, totality: false },
  { city: 'Southampton',     lat: 50.91, lng: -1.40,  direction: 262, coverage: 79, totality: false },
  { city: 'Plymouth',        lat: 50.37, lng: -4.14,  direction: 263, coverage: 77, totality: false },
  { city: 'Cardiff',         lat: 51.48, lng: -3.18,  direction: 261, coverage: 81, totality: false },
  { city: 'Swansea',         lat: 51.62, lng: -3.94,  direction: 261, coverage: 81, totality: false },
  { city: 'Belfast',         lat: 54.60, lng: -5.93,  direction: 258, coverage: 91, totality: false },
  { city: 'Dublin',          lat: 53.33, lng: -6.25,  direction: 259, coverage: 88, totality: false },
];

/** Build the city coverage table on the Guide page */
function buildCityTable() {
  const container = document.getElementById('city-table');
  if (!container) return;

  container.innerHTML = ECLIPSE_DATA.map(d => `
    <div class="city-row">
      <span class="city-name">${d.city}${d.totality ? ' 🌑' : ''}</span>
      <span class="city-coverage">${d.coverage}%</span>
      <div class="city-bar-wrap" style="display:block">
        <div class="city-bar" style="width:${d.coverage}%"></div>
      </div>
    </div>
  `).join('');
}

/** Build the manual direction table on the Find page */
function buildCityDirectionTable() {
  const container = document.getElementById('city-direction-table');
  if (!container) return;

  container.innerHTML = ECLIPSE_DATA.map(d => `
    <div class="cdt-row">
      <span class="cdt-city">${d.city}</span>
      <span class="cdt-dir">${d.direction}° (${azimuthToCompass(d.direction)})</span>
      <span class="cdt-cov">${d.coverage}%</span>
    </div>
  `).join('');
}

/**
 * Convert azimuth degrees to a compass label (N, NE, E, etc.)
 * @param {number} deg
 * @returns {string}
 */
function azimuthToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16];
}

/**
 * Calculate approximate eclipse direction for a given lat/lng.
 * Finds the nearest city in the dataset and interpolates.
 * This is a best-effort offline calculation; professional astronomy tools
 * would use a full VSOP87/IERS ephemeris.
 */
function getEclipseDirectionForLocation(lat, lng) {
  let nearest = null;
  let minDist = Infinity;

  ECLIPSE_DATA.forEach(d => {
    const dist = haversineKm(lat, lng, d.lat, d.lng);
    if (dist < minDist) { minDist = dist; nearest = d; }
  });

  return nearest;
}

/**
 * Haversine formula — great-circle distance in km between two lat/lng points.
 */
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * (Math.PI / 180); }

/* ═══════════════════════════════════════════════════════════════════════════
   6. LOCATION SYSTEM
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Request GPS permission and get the user's position.
 * Updates all location display areas throughout the app.
 */
function requestLocation() {
  if (!('geolocation' in navigator)) {
    showLocationError('Geolocation is not supported by your browser.');
    return;
  }

  updateLocationUI('loading');

  navigator.geolocation.getCurrentPosition(
    position => {
      APP.userLat = position.coords.latitude;
      APP.userLng = position.coords.longitude;

      // Find nearest eclipse data
      const nearest = getEclipseDirectionForLocation(APP.userLat, APP.userLng);

      updateLocationUI('success', {
        lat:      APP.userLat,
        lng:      APP.userLng,
        nearest:  nearest,
      });

      // Update compass target if it's active
      if (APP.compassActive && nearest) {
        APP.eclipseTarget = nearest.direction;
        document.getElementById('cs-target').textContent = nearest.direction + '°';
      }
    },
    error => {
      let msg = 'Unable to get your location.';
      if (error.code === 1) msg = 'Location permission denied. Please allow in browser settings.';
      if (error.code === 2) msg = 'Location unavailable. Try again.';
      if (error.code === 3) msg = 'Location request timed out.';
      showLocationError(msg);
    },
    { timeout: 10000, enableHighAccuracy: true }
  );
}

/** Update all location display areas */
function updateLocationUI(state, data = null) {
  const containers = [
    document.getElementById('home-location-info'),
    document.getElementById('find-location-info'),
  ];

  if (state === 'loading') {
    containers.forEach(el => {
      if (el) el.innerHTML = '<span style="color:var(--text-muted);font-size:13px">📍 Getting your location…</span>';
    });
    return;
  }

  if (state === 'success' && data) {
    const { lat, lng, nearest } = data;
    const html = `
      <div class="loc-detail">
        <span class="loc-key">Latitude</span>
        <span class="loc-val">${lat.toFixed(4)}°</span>
      </div>
      <div class="loc-detail">
        <span class="loc-key">Longitude</span>
        <span class="loc-val">${lng.toFixed(4)}°</span>
      </div>
      ${nearest ? `
      <div class="loc-detail">
        <span class="loc-key">Nearest city</span>
        <span class="loc-val">${nearest.city}</span>
      </div>
      <div class="loc-detail">
        <span class="loc-key">Eclipse coverage</span>
        <span class="loc-val" style="color:var(--solar-orange)">${nearest.coverage}%</span>
      </div>
      <div class="loc-detail">
        <span class="loc-key">Eclipse direction</span>
        <span class="loc-val">${nearest.direction}° (${azimuthToCompass(nearest.direction)})</span>
      </div>
      ` : ''}
    `;
    containers.forEach(el => { if (el) el.innerHTML = html; });
  }
}

/** Update the Find page location card */
function updateFindPageLocation() {
  if (APP.userLat !== null) {
    const nearest = getEclipseDirectionForLocation(APP.userLat, APP.userLng);
    updateLocationUI('success', { lat: APP.userLat, lng: APP.userLng, nearest });
  }
}

function showLocationError(msg) {
  const containers = [
    document.getElementById('home-location-info'),
    document.getElementById('find-location-info'),
  ];
  containers.forEach(el => {
    if (el) el.innerHTML = `
      <span style="color:rgba(255,80,80,0.9);font-size:13px">${msg}</span>
      <button class="btn btn-outline" onclick="requestLocation()" style="margin-top:8px">Try Again</button>
    `;
  });
}

/* ═══════════════════════════════════════════════════════════════════════════
   7. COMPASS / FIND THE ECLIPSE
   ═══════════════════════════════════════════════════════════════════════════ */

/** Start the compass — requests orientation + location permissions */
async function startCompass() {
  const statusEl = document.getElementById('compass-status');
  const startBtn = document.getElementById('compass-start-btn');

  // ── iOS 13+ requires a user-gesture permission for DeviceOrientationEvent ──
  if (typeof DeviceOrientationEvent !== 'undefined' &&
      typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const perm = await DeviceOrientationEvent.requestPermission();
      if (perm !== 'granted') {
        showCompassError('Compass permission denied. Please allow motion access in your browser settings.');
        return;
      }
      APP.compassPermission = true;
    } catch (err) {
      showCompassError('Could not request compass permission: ' + err.message);
      return;
    }
  } else {
    // Android / desktop — DeviceOrientationEvent available without extra permission
    APP.compassPermission = true;
  }

  // ── Get location so we can calculate the eclipse target direction ──
  if (APP.userLat === null) {
    statusEl.textContent = 'Getting your location…';
    await new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          APP.userLat = pos.coords.latitude;
          APP.userLng = pos.coords.longitude;
          resolve();
        },
        () => resolve(), // continue without location
        { timeout: 8000 }
      );
    });
  }

  // ── Listen to device orientation ──
  if (!window.DeviceOrientationEvent) {
    showCompassError('Your device does not support compass mode. Use the manual direction guide below.');
    return;
  }

  APP.compassActive = true;
  startBtn.textContent = '🧭 Compass Active';
  startBtn.disabled = true;
  startBtn.style.opacity = '0.6';

  // Determine eclipse target azimuth from location
  const nearest = APP.userLat !== null
    ? getEclipseDirectionForLocation(APP.userLat, APP.userLng)
    : ECLIPSE_DATA.find(d => d.city === 'London');

  APP.eclipseTarget = nearest ? nearest.direction : 261;
  document.getElementById('cs-target').textContent = APP.eclipseTarget + '°';

  // Update location info panel too
  if (APP.userLat !== null && nearest) {
    updateLocationUI('success', { lat: APP.userLat, lng: APP.userLng, nearest });
  }

  statusEl.textContent = 'Compass active — move your phone slowly.';

  window.addEventListener('deviceorientationabsolute', handleOrientation, true);
  window.addEventListener('deviceorientation',         handleOrientation, true);
}

/** Handle device orientation events and update the compass UI */
function handleOrientation(event) {
  // `alpha` is the compass heading (degrees from North), but varies by browser/OS
  let heading = null;

  if (event.webkitCompassHeading !== undefined) {
    // iOS — webkitCompassHeading is already a true north-relative bearing
    heading = event.webkitCompassHeading;
  } else if (event.absolute && event.alpha !== null) {
    // Android absolute — convert alpha to bearing
    heading = (360 - event.alpha) % 360;
  } else if (event.alpha !== null) {
    // Fallback — may not be absolute north but still useful
    heading = (360 - event.alpha) % 360;
  }

  if (heading === null) return;

  APP.currentHeading = Math.round(heading);

  // Calculate how many degrees to rotate to face the eclipse
  let diff = APP.eclipseTarget - APP.currentHeading;
  // Normalise to -180 … +180 for shortest-path rotation
  if (diff > 180)  diff -= 360;
  if (diff < -180) diff += 360;

  const absDiff = Math.abs(diff);
  const direction = diff > 0
    ? `Turn right ${absDiff}°`
    : diff < 0
    ? `Turn left ${absDiff}°`
    : '✅ Facing the eclipse!';

  // Update UI
  document.getElementById('cs-heading').textContent = APP.currentHeading + '°';
  document.getElementById('cs-diff').textContent    = direction;

  // Rotate the compass arrow so it always points at the eclipse
  const arrowAngle = APP.eclipseTarget - APP.currentHeading;
  const wrap = document.getElementById('compass-arrow-wrap');
  if (wrap) wrap.style.transform = `rotate(${arrowAngle}deg)`;

  // Rotate the compass rose opposite to heading (so N stays relative)
  const rose = document.querySelector('.compass-rose');
  if (rose) rose.style.transform = `rotate(${-APP.currentHeading}deg)`;
}

function showCompassError(msg) {
  const statusEl = document.getElementById('compass-status');
  if (statusEl) statusEl.textContent = msg;
  const startBtn = document.getElementById('compass-start-btn');
  if (startBtn) {
    startBtn.textContent = 'Retry Compass';
    startBtn.disabled = false;
    startBtn.style.opacity = '';
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   8. ECLIPSE SIMULATOR — TIME-BASED SLIDER
   ═══════════════════════════════════════════════════════════════════════════
   Slider 0–100 maps to the full eclipse window:
     0   = 18:13:45 BST — first contact (eclipse begins)
     ~51 = 19:10:17 BST — greatest eclipse (90.9% coverage)
     100 = 20:03:49 BST — last contact (eclipse ends)
   ═══════════════════════════════════════════════════════════════════════════ */

// Eclipse timing constants (BST = UTC+1, stored as seconds since midnight)
const SIM = {
  startSec:   18 * 3600 + 13 * 60 + 45,  // 18:13:45
  peakSec:    19 * 3600 + 10 * 60 + 17,  // 19:10:17
  endSec:     20 * 3600 +  3 * 60 + 49,  // 20:03:49
  maxCov:     90.9,    // greatest coverage percentage
  peakPct:    null,    // computed below
  totalDur:   null,    // computed below
};

SIM.totalDur = SIM.endSec - SIM.startSec;          // 6604 sec
SIM.peakPct  = (SIM.peakSec - SIM.startSec) / SIM.totalDur * 100; // ~51.4

function initSimulator() {
  const slider = document.getElementById('eclipse-slider');
  if (!slider) return;
  slider.addEventListener('input', handleSliderChange);
  updateSimulator(0); // start at beginning of eclipse
}

function handleSliderChange(e) {
  updateSimulator(parseFloat(e.target.value));
}

/**
 * Convert slider position (0–100) to BST time string.
 */
function sliderToTimeStr(sliderVal) {
  const currentSec = SIM.startSec + (sliderVal / 100) * SIM.totalDur;
  const h = Math.floor(currentSec / 3600) % 24;
  const m = Math.floor((currentSec % 3600) / 60);
  const s = Math.floor(currentSec % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)} BST`;
}

/**
 * Calculate eclipse coverage (%) from slider position (0–100).
 *
 * Physics model: the moon travels at constant angular velocity past the sun.
 * Its horizontal offset (impact parameter offset aside) creates the coverage curve.
 * We use a two-circle overlap formula with a small vertical impact offset so
 * the maximum coverage matches 90.9% (not 100%).
 *
 * Moon centre x:  100 – sliderVal * 2   (enters from right +100, exits left -100)
 * Moon centre y:  +7px (impact parameter — moon passes slightly above sun centre)
 * Sun/moon radius: 50px each
 */
function calcCoverage(sliderVal) {
  const R  = 50;            // sun/moon radius in simulator px
  const mx = 100 - sliderVal * 2;  // moon x offset from sun centre
  const my = 7;             // vertical impact parameter
  const d  = Math.sqrt(mx * mx + my * my);  // centre-to-centre distance

  if (d >= 2 * R) return 0;
  if (d <= 0)     return 100;

  // Area of intersection of two equal circles with centre distance d
  const cosAngle = d / (2 * R);
  const coverage = (1 / Math.PI) * (
    2 * Math.acos(cosAngle) -
    (d / R) * Math.sqrt(1 - cosAngle * cosAngle)
  );
  return Math.max(0, Math.min(100, coverage * 100));
}

/**
 * Update all simulator visuals for a given slider value (0–100).
 */
function updateSimulator(sliderVal) {
  const moon    = document.getElementById('sim-moon');
  const label   = document.getElementById('sim-label');
  const slider  = document.getElementById('eclipse-slider');
  const sunBody = document.querySelector('.sim-body');
  const corona1 = document.querySelector('.sim-corona-1');
  const corona2 = document.querySelector('.sim-corona-2');
  const timeEl  = document.getElementById('sim-time');
  const covEl   = document.getElementById('sim-cov-pct');
  const phaseBar = document.getElementById('sim-phase-bar');
  const phaseLabel = document.getElementById('sim-phase-label');

  if (!moon) return;

  // ── Moon position ──────────────────────────────────────────────────────
  const moonX = 100 - sliderVal * 2;  // +100 → 0 → -100
  const moonY = 7;                     // impact parameter
  moon.style.transform = `translate(${moonX}px, ${moonY}px)`;

  // ── Coverage calculation ───────────────────────────────────────────────
  const coverage = calcCoverage(sliderVal);
  const covRounded = Math.round(coverage * 10) / 10;

  // ── Slider gradient ────────────────────────────────────────────────────
  if (slider) slider.style.setProperty('--pct', sliderVal + '%');

  // ── Sun glow: dims as moon covers more ────────────────────────────────
  const glowIntensity = Math.max(0.15, 1 - (coverage / 100) * 0.82);
  if (sunBody) {
    sunBody.style.boxShadow =
      `0 0 ${30 * glowIntensity}px ${10 * glowIntensity}px rgba(255,140,0,${0.5 * glowIntensity})`;
    // Slight colour shift toward red as coverage grows
    const r = Math.round(255);
    const g = Math.round(Math.max(60, 185 - coverage * 1.3));
    sunBody.style.background =
      `radial-gradient(circle at 40% 40%, #ffe080, rgb(${r},${g},0), #c04000)`;
  }

  // ── Corona: brightens dramatically near peak ───────────────────────────
  const coronaFade = Math.max(0, (coverage - 60) / 40);
  if (corona1) corona1.style.opacity = String(0.08 + coronaFade * 0.55);
  if (corona2) corona2.style.opacity = String(0.04 + coronaFade * 0.40);

  // ── Phase & labels ─────────────────────────────────────────────────────
  const timeStr = sliderToTimeStr(sliderVal);
  if (timeEl) timeEl.textContent = timeStr;

  let phaseName, phaseWidth;
  if (sliderVal <= 0.5) {
    phaseName  = 'Eclipse beginning';
    phaseWidth = 0;
  } else if (sliderVal < SIM.peakPct - 1) {
    phaseName  = `${covRounded}% — Growing`;
    phaseWidth = (sliderVal / SIM.peakPct) * 50;
  } else if (Math.abs(sliderVal - SIM.peakPct) <= 3) {
    phaseName  = `${covRounded}% — GREATEST ECLIPSE ✨`;
    phaseWidth = 50;
  } else if (sliderVal < 99) {
    phaseName  = `${covRounded}% — Receding`;
    phaseWidth = 50 + ((sliderVal - SIM.peakPct) / (100 - SIM.peakPct)) * 50;
  } else {
    phaseName  = 'Eclipse ended';
    phaseWidth = 100;
  }

  if (covEl)        covEl.textContent   = phaseName;
  if (phaseBar)     phaseBar.style.width = phaseWidth + '%';
  if (phaseLabel)   phaseLabel.textContent = timeStr;

  if (label) {
    if (sliderVal <= 0.5) {
      label.textContent = 'Eclipse begins · 18:13 BST';
    } else if (sliderVal >= 99.5) {
      label.textContent = 'Eclipse ends · 20:03 BST';
    } else if (Math.abs(sliderVal - SIM.peakPct) <= 3) {
      label.textContent = '90.9% — Greatest Eclipse · 19:10 BST';
    } else {
      label.textContent = `${covRounded}% coverage · ${timeStr}`;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   9. LIVE STREAMS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * YouTube channel / video IDs for live streams.
 * On eclipse day, update these to the actual live stream IDs.
 * Using official channel embed URLs here as placeholders.
 */
const STREAMS = {
  nasa:  { label: 'NASA Live',           url: 'https://www.youtube.com/embed/live_stream?channel=UCLA_DiR1FfKNvjuUpBHmylQ&autoplay=1' },
  royal: { label: 'Royal Observatory',   url: 'https://www.youtube.com/embed/live_stream?channel=UCgzgimN5JTt4hXeShSAUdFg&autoplay=1' },
  esa:   { label: 'ESA',                 url: 'https://www.youtube.com/embed/live_stream?channel=UCIBaDdAbGlFDeS33shmlD0g&autoplay=1' },
};

let activeStream = null;

/** Load a stream into the embed area */
function loadStream(key) {
  if (!navigator.onLine) {
    checkOnlineStatus();
    return;
  }

  const stream = STREAMS[key];
  if (!stream) return;

  // Highlight active button
  document.querySelectorAll('.stream-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.key === key);
  });

  const embedWrap = document.getElementById('embed-wrap');
  if (!embedWrap) return;

  // Remove existing iframe
  const existing = embedWrap.querySelector('iframe');
  if (existing) existing.remove();

  const placeholder = document.getElementById('embed-placeholder');
  if (placeholder) placeholder.style.display = 'none';

  // Create new iframe
  const iframe = document.createElement('iframe');
  iframe.src = stream.url;
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen = true;
  iframe.setAttribute('allowfullscreen', '');
  iframe.title = stream.label + ' Live Stream';
  embedWrap.appendChild(iframe);

  activeStream = key;
}

function initOnlineListener() {
  window.addEventListener('online',  checkOnlineStatus);
  window.addEventListener('offline', checkOnlineStatus);
}

function checkOnlineStatus() {
  const banner = document.getElementById('live-offline-banner');
  if (!banner) return;
  if (!navigator.onLine) {
    banner.classList.remove('hidden');
    // Remove any loaded iframe
    const embedWrap = document.getElementById('embed-wrap');
    if (embedWrap) {
      const iframe = embedWrap.querySelector('iframe');
      if (iframe) iframe.remove();
      const placeholder = document.getElementById('embed-placeholder');
      if (placeholder) placeholder.style.display = '';
    }
  } else {
    banner.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   10. SETTINGS
   ═══════════════════════════════════════════════════════════════════════════ */

/** Persist and apply settings from/to localStorage */
function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('eclipse-settings') || '{}');

    // Dark mode (default: on)
    APP.darkMode = saved.darkMode !== false;
    const dmToggle = document.getElementById('toggle-dark');
    if (dmToggle) dmToggle.checked = APP.darkMode;
    applyDarkMode(APP.darkMode);

    // Animations (default: on)
    APP.animationsEnabled = saved.animations !== false;
    const animToggle = document.getElementById('toggle-anim');
    if (animToggle) animToggle.checked = APP.animationsEnabled;
    applyAnimations(APP.animationsEnabled);

  } catch (e) {
    // localStorage may be unavailable in private mode — silently continue
  }
}

function saveSettings() {
  try {
    localStorage.setItem('eclipse-settings', JSON.stringify({
      darkMode:   APP.darkMode,
      animations: APP.animationsEnabled,
    }));
  } catch (e) { /* ignore */ }
}

function toggleDarkMode(enabled) {
  APP.darkMode = enabled;
  applyDarkMode(enabled);
  saveSettings();
}

function applyDarkMode(enabled) {
  document.body.classList.toggle('light-mode', !enabled);
}

function toggleAnimations(enabled) {
  APP.animationsEnabled = enabled;
  applyAnimations(enabled);
  saveSettings();
}

function applyAnimations(enabled) {
  document.body.classList.toggle('no-animations', !enabled);
}

/* ═══════════════════════════════════════════════════════════════════════════
   11. PWA INSTALL PROMPT
   ═══════════════════════════════════════════════════════════════════════════ */

function initInstallPrompt() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    APP.deferredInstallPrompt = e;
    // Show the install button in Settings
    const section = document.getElementById('install-section');
    if (section) section.classList.remove('hidden');
  });

  window.addEventListener('appinstalled', () => {
    const section = document.getElementById('install-section');
    if (section) section.classList.add('hidden');
    APP.deferredInstallPrompt = null;
  });
}

/** Trigger the browser's native install prompt */
async function installPWA() {
  if (!APP.deferredInstallPrompt) return;
  APP.deferredInstallPrompt.prompt();
  const { outcome } = await APP.deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    APP.deferredInstallPrompt = null;
  }
}
