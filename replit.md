# Solar Eclipse Guide UK 2026

A complete, installable Progressive Web App (PWA) to help people in the UK safely experience the total/partial solar eclipse on **12 August 2026**.

## Project Overview

| File | Purpose |
|------|---------|
| `index.html` | App shell — all 5 pages as `<section>` elements |
| `style.css` | Space-themed glassmorphism design, mobile-first |
| `app.js` | All JavaScript: navigation, countdown, compass, simulator, etc. |
| `manifest.json` | PWA manifest (installable, standalone display) |
| `service-worker.js` | Offline caching via Cache API |
| `icons/` | 8 PNG app icons (72–512 px) |

## Features

- **Loading screen** — animated solar eclipse (CSS-only, no videos)
- **Home** — live countdown to 12 Aug 2026 18:13 BST + quick-access cards
- **Guide** — eclipse details, UK city coverage table, interactive simulator (drag slider 0–100%)
- **Guide / Safety** — detailed safety guide with ISO 12312-2 glasses info
- **Find Eclipse** — GPS + device compass (DeviceOrientationEvent), manual direction table for all major UK cities
- **Live** — embedded YouTube stream area, online/offline detection
- **Settings** — dark/light mode toggle, animations toggle, about/credits, PWA install button

## Eclipse Data

Eclipse direction azimuths and coverage percentages for 23 UK/Irish cities are stored offline in `app.js` (`ECLIPSE_DATA` array). The nearest city to the user's GPS position is used to calculate compass target.

## PWA

- Registers `service-worker.js` on load
- Caches HTML, CSS, JS, manifest, and icons on first install
- Works fully offline after first visit
- `manifest.json` configured for standalone display, no browser chrome

## Running

The app is served by `static-web-server` on port 80. Open the Preview pane — no build step required.

## User Preferences

- Clean, commented vanilla JS/CSS — no frameworks
- Mobile-first layout with bottom navigation
- Space/astronomy theme with solar orange and deep navy colours
