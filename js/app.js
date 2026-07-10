import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

// ═══════════════════════════════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════════════════════════════
let allArtists = [];
let currentEpoch = null;
let currentEpochArtists = [];
let isInMuseum = false;
let activeFilter = "all";

// DOM refs
const timelineOverlay = document.querySelector("#timeline-overlay");
const museumView = document.querySelector("#museum-view");
const epochDetail = document.querySelector("#epoch-detail");
const epochDetailName = document.querySelector("#epoch-detail-name");
const epochDetailRange = document.querySelector("#epoch-detail-range");
const epochArtistsGrid = document.querySelector("#epoch-artists-grid");
const enterMuseumBtn = document.querySelector("#enter-museum-btn");
const backToTimelineBtn = document.querySelector("#back-to-timeline");
const closeEpochDetailBtn = document.querySelector("#close-epoch-detail");
const hudTitle = document.querySelector("#hud-title");
const searchInput = document.querySelector("#artist-search");
const searchResults = document.querySelector("#search-results");
const searchResultsGrid = document.querySelector("#search-results-grid");
const searchResultsCount = document.querySelector("#search-results-count");
const clearSearchBtn = document.querySelector("#clear-search");
const filterChips = document.querySelector("#filter-chips");
const surpriseBtn = document.querySelector("#surprise-btn");
const timelineHint = document.querySelector(".timeline-hint");

const canvas = document.querySelector("#museum-canvas");
const panel = document.querySelector("#info-panel");
const closePanel = document.querySelector("#close-panel");
const artistName = document.querySelector("#artist-name");
const artistYears = document.querySelector("#artist-years");
const artistBio = document.querySelector("#artist-bio");
const artistImage = document.querySelector("#artist-image");
const artistUrl = document.querySelector("#artist-url");

// Three.js refs
let renderer, scene, camera;
let paintings = [];
const keys = new Set();
const clickModeKeys = new Set(["ShiftLeft", "ShiftRight", "Space"]);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let yaw = Math.PI;
let pitch = 0;
let isDragging = false;
let lastPointer = { x: 0, y: 0 };

// ═══════════════════════════════════════════════════════════════════════════════
//  GALAXY TIMELINE STATE
// ═══════════════════════════════════════════════════════════════════════════════
const timelineCanvas = document.querySelector("#timeline-canvas");
const timelineWrapper = document.querySelector("#timeline-canvas-wrapper");
let tctx;
let timelineStars = [];
let timelineNebulae = [];
let timelineParticles = [];

// Timeline view state
let viewOffsetX = 0;        // pan X in world-space years
let viewZoom = 1;           // 1 = full timeline, higher = zoomed in
const MIN_ZOOM = 0.5;       // zoomed out: see everything
const MAX_ZOOM = 12;        // zoomed in: see individual years
const TIMELINE_START = 1200;
const TIMELINE_END = 2025;
const TIMELINE_SPAN = TIMELINE_END - TIMELINE_START;

// Interaction state
let isPanning = false;
let panStart = { x: 0, y: 0 };
let panStartOffset = 0;
let hoveredEpoch = null;
let targetZoom = 1;
let targetOffsetX = 0;
let zoomOriginX = 0; // where the zoom is centered

// Epoch definitions
const epochDefs = [
  { id: "Vorreformatorisch", name: "Proto-Renaissance", start: 1200, end: 1400, color: "#8b7355", glow: "#c4a87c" },
  { id: "Renaissance", name: "Renaissance", start: 1400, end: 1600, color: "#c9a96e", glow: "#f0d68a" },
  { id: "Barock", name: "Baroque", start: 1600, end: 1750, color: "#8b4513", glow: "#c4723a" },
  { id: "Asiatische Kunst", name: "Asian Art", start: 1600, end: 1900, color: "#d4a574", glow: "#f0c8a0" },
  { id: "Romantik", name: "Romanticism", start: 1780, end: 1850, color: "#4a7c59", glow: "#6db87d" },
  { id: "Impressionismus", name: "Impressionism", start: 1860, end: 1900, color: "#6b5b95", glow: "#9b8bc5" },
  { id: "Moderne", name: "Modern", start: 1900, end: 1945, color: "#d4574a", glow: "#f08070" },
  { id: "Zeitgenössisch", name: "Contemporary", start: 1945, end: 2025, color: "#3b82f6", glow: "#60a5fa" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  DATA LOADING
// ═══════════════════════════════════════════════════════════════════════════════
async function loadArtists() {
  const response = await fetch("data/artists.json");
  if (!response.ok) {
    throw new Error(`Unable to load artist data: ${response.status}`);
  }
  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EPOCH DISPLAY NAMES
// ═══════════════════════════════════════════════════════════════════════════════
const epochDisplayNames = {
  "Vorreformatorisch": "Proto-Renaissance",
  "Renaissance": "Renaissance",
  "Barock": "Baroque",
  "Romantik": "Romanticism",
  "Impressionismus": "Impressionism",
  "Moderne": "Modern",
  "Zeitgenössisch": "Contemporary",
  "Asiatische Kunst": "Asian Art",
};

function getDisplayName(epoch) {
  return epochDisplayNames[epoch] || epoch;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GALAXY TIMELINE — STARFIELD & NEBULAE
// ═══════════════════════════════════════════════════════════════════════════════
function initTimelineCanvas() {
  tctx = timelineCanvas.getContext("2d");
  resizeTimelineCanvas();
  generateStars();
  generateNebulae();
  generateParticles();
  drawTimeline();
}

function resizeTimelineCanvas() {
  const rect = timelineWrapper.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  timelineCanvas.width = rect.width * dpr;
  timelineCanvas.height = rect.height * dpr;
  tctx.setTransform(1, 0, 0, 1, 0, 0);
  tctx.scale(dpr, dpr);
  timelineCanvas.style.width = rect.width + "px";
  timelineCanvas.style.height = rect.height + "px";
}

function generateStars() {
  timelineStars = [];
  const count = 400;
  for (let i = 0; i < count; i++) {
    timelineStars.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.2,
      brightness: Math.random(),
      twinkleSpeed: Math.random() * 0.02 + 0.005,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
}

function generateNebulae() {
  timelineNebulae = [];
  // Create several nebula clouds
  const nebulaColors = [
    { r: 80, g: 40, b: 120 },   // purple
    { r: 30, g: 60, b: 140 },   // blue
    { r: 120, g: 40, b: 80 },   // magenta
    { r: 20, g: 80, b: 100 },   // teal
    { r: 100, g: 60, b: 30 },   // warm
  ];
  for (let i = 0; i < 5; i++) {
    const c = nebulaColors[i];
    timelineNebulae.push({
      x: Math.random() * 0.6 + 0.2,
      y: Math.random() * 0.5 + 0.25,
      rx: Math.random() * 0.3 + 0.15,
      ry: Math.random() * 0.2 + 0.08,
      color: c,
      opacity: Math.random() * 0.15 + 0.05,
      angle: Math.random() * Math.PI * 2,
    });
  }
}

function generateParticles() {
  timelineParticles = [];
  for (let i = 0; i < 200; i++) {
    timelineParticles.push({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.2 + 0.3,
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      opacity: Math.random() * 0.6 + 0.2,
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GALAXY TIMELINE — DRAWING
// ═══════════════════════════════════════════════════════════════════════════════
function drawTimeline(timestamp = 0) {
  if (!tctx || isInMuseum) return;

  const w = timelineCanvas.width / (window.devicePixelRatio || 1);
  const h = timelineCanvas.height / (window.devicePixelRatio || 1);

  // Smooth zoom animation
  viewZoom += (targetZoom - viewZoom) * 0.12;
  viewOffsetX += (targetOffsetX - viewOffsetX) * 0.12;

  // Clamp
  const visibleSpan = TIMELINE_SPAN / viewZoom;
  viewOffsetX = Math.max(TIMELINE_START - visibleSpan * 0.1, Math.min(TIMELINE_END - visibleSpan * 0.9, viewOffsetX));

  // Clear
  tctx.clearRect(0, 0, w, h);

  // Deep space background gradient
  const bgGrad = tctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
  bgGrad.addColorStop(0, "#0d0b1a");
  bgGrad.addColorStop(0.5, "#080614");
  bgGrad.addColorStop(1, "#020108");
  tctx.fillStyle = bgGrad;
  tctx.fillRect(0, 0, w, h);

  // Draw nebulae
  timelineNebulae.forEach((neb) => {
    const nx = neb.x * w;
    const ny = neb.y * h;
    const nrx = neb.rx * w;
    const nry = neb.ry * h;
    const grad = tctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(nrx, nry));
    const { r, g, b } = neb.color;
    grad.addColorStop(0, `rgba(${r},${g},${b},${neb.opacity * 1.5})`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},${neb.opacity * 0.6})`);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    tctx.save();
    tctx.translate(nx, ny);
    tctx.rotate(neb.angle);
    tctx.scale(1, nry / nrx);
    tctx.fillStyle = grad;
    tctx.beginPath();
    tctx.arc(0, 0, nrx, 0, Math.PI * 2);
    tctx.fill();
    tctx.restore();
  });

  // Draw stars
  const time = timestamp * 0.001;
  timelineStars.forEach((star) => {
    const sx = star.x * w;
    const sy = star.y * h;
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed * 60 + star.twinkleOffset);
    const alpha = star.brightness * 0.6 + twinkle * 0.4;
    tctx.fillStyle = `rgba(220,210,255,${alpha})`;
    tctx.beginPath();
    tctx.arc(sx, sy, star.r, 0, Math.PI * 2);
    tctx.fill();
  });

  // Draw floating particles
  timelineParticles.forEach((p) => {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < 0) p.x = 1;
    if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1;
    if (p.y > 1) p.y = 0;
    const px = p.x * w;
    const py = p.y * h;
    tctx.fillStyle = `rgba(180,160,220,${p.opacity})`;
    tctx.beginPath();
    tctx.arc(px, py, p.r, 0, Math.PI * 2);
    tctx.fill();
  });

  // ── TIMELINE AXIS ──────────────────────────────────
  const axisY = h * 0.55;
  const paddingX = w * 0.08;
  const usableWidth = w - paddingX * 2;

  // World-space to screen mapping
  const worldToScreen = (year) => {
    return paddingX + ((year - viewOffsetX) / visibleSpan + 0.5) * usableWidth;
  };

  const screenToWorld = (sx) => {
    return viewOffsetX + ((sx - paddingX) / usableWidth - 0.5) * visibleSpan;
  };

  // Draw the main timeline axis as a glowing cosmic thread
  const axisGrad = tctx.createLinearGradient(paddingX, axisY, w - paddingX, axisY);
  axisGrad.addColorStop(0, "rgba(100,80,180,0.1)");
  axisGrad.addColorStop(0.2, "rgba(140,120,220,0.4)");
  axisGrad.addColorStop(0.5, "rgba(180,160,240,0.6)");
  axisGrad.addColorStop(0.8, "rgba(140,120,220,0.4)");
  axisGrad.addColorStop(1, "rgba(100,80,180,0.1)");
  tctx.strokeStyle = axisGrad;
  tctx.lineWidth = 2;
  tctx.beginPath();
  tctx.moveTo(paddingX, axisY);
  tctx.lineTo(w - paddingX, axisY);
  tctx.stroke();

  // Outer glow on the axis
  tctx.strokeStyle = "rgba(160,140,220,0.15)";
  tctx.lineWidth = 8;
  tctx.beginPath();
  tctx.moveTo(paddingX, axisY);
  tctx.lineTo(w - paddingX, axisY);
  tctx.stroke();

  // ── YEAR TICK MARKS ────────────────────────────────
  const tickInterval = getTickInterval(visibleSpan);
  const firstTick = Math.ceil((viewOffsetX - visibleSpan * 0.5) / tickInterval) * tickInterval;
  const lastTick = Math.floor((viewOffsetX + visibleSpan * 0.5) / tickInterval) * tickInterval;

  for (let year = firstTick; year <= lastTick; year += tickInterval) {
    const sx = worldToScreen(year);
    if (sx < paddingX - 20 || sx > w - paddingX + 20) continue;

    const isMajor = year % (tickInterval * 5) === 0 || tickInterval >= 50;
    const tickHeight = isMajor ? 14 : 7;
    const tickAlpha = isMajor ? 0.5 : 0.25;

    tctx.strokeStyle = `rgba(180,160,220,${tickAlpha})`;
    tctx.lineWidth = isMajor ? 1.5 : 0.8;
    tctx.beginPath();
    tctx.moveTo(sx, axisY - tickHeight);
    tctx.lineTo(sx, axisY + tickHeight);
    tctx.stroke();

    if (isMajor) {
      tctx.fillStyle = `rgba(200,180,230,0.6)`;
      tctx.font = `${Math.max(10, 12 / Math.sqrt(viewZoom))}px Inter, sans-serif`;
      tctx.textAlign = "center";
      tctx.fillText(year.toString(), sx, axisY + tickHeight + 16);
    }
  }

  // ── EPOCH MARKERS ──────────────────────────────────
  hoveredEpoch = null;
  const mouseX = lastPointer.x;
  const mouseY = lastPointer.y;

  epochDefs.forEach((epoch) => {
    if (activeFilter !== "all" && epoch.id !== activeFilter) return;

    const startX = worldToScreen(epoch.start);
    const endX = worldToScreen(epoch.end);
    const centerX = (startX + endX) / 2;

    // Only draw if visible
    if (endX < paddingX - 50 || startX > w - paddingX + 50) return;

    const artistCount = allArtists.filter((a) => a.epoch === epoch.id).length;
    const isHovered = mouseX >= startX - 10 && mouseX <= endX + 10 && Math.abs(mouseY - axisY) < 60;

    if (isHovered) {
      hoveredEpoch = epoch;
    }

    // Epoch span glow
    const spanAlpha = isHovered ? 0.25 : 0.08;
    const spanGrad = tctx.createLinearGradient(startX, 0, endX, 0);
    spanGrad.addColorStop(0, `rgba(0,0,0,0)`);
    spanGrad.addColorStop(0.2, epoch.glow.replace(")", `,${spanAlpha})`).replace("rgb", "rgba"));
    spanGrad.addColorStop(0.8, epoch.glow.replace(")", `,${spanAlpha})`).replace("rgb", "rgba"));
    spanGrad.addColorStop(1, "rgba(0,0,0,0)");
    tctx.fillStyle = spanGrad;
    tctx.fillRect(startX, axisY - 40, endX - startX, 80);

    // Epoch dot (celestial body)
    const dotR = isHovered ? 14 : 8 + artistCount * 0.5;
    const dotY = axisY;

    // Outer glow
    const glowGrad = tctx.createRadialGradient(centerX, dotY, dotR * 0.3, centerX, dotY, dotR * 2.5);
    glowGrad.addColorStop(0, epoch.glow);
    glowGrad.addColorStop(0.5, epoch.glow.replace(")", ",0.3)").replace("rgb", "rgba"));
    glowGrad.addColorStop(1, "rgba(0,0,0,0)");
    tctx.fillStyle = glowGrad;
    tctx.beginPath();
    tctx.arc(centerX, dotY, dotR * 2.5, 0, Math.PI * 2);
    tctx.fill();

    // Inner dot
    const dotGrad = tctx.createRadialGradient(centerX - dotR * 0.3, dotY - dotR * 0.3, 0, centerX, dotY, dotR);
    dotGrad.addColorStop(0, "#ffffff");
    dotGrad.addColorStop(0.4, epoch.glow);
    dotGrad.addColorStop(1, epoch.color);
    tctx.fillStyle = dotGrad;
    tctx.beginPath();
    tctx.arc(centerX, dotY, dotR, 0, Math.PI * 2);
    tctx.fill();

    // Epoch label
    const labelY = axisY - 28 - dotR;
    const labelAlpha = isHovered ? 1 : 0.7;
    tctx.fillStyle = `rgba(220,210,240,${labelAlpha})`;
    tctx.font = `700 ${Math.max(11, 13 / Math.sqrt(viewZoom))}px Inter, sans-serif`;
    tctx.textAlign = "center";
    tctx.fillText(epoch.name, centerX, labelY);

    // Year range below
    tctx.fillStyle = `rgba(180,160,210,${labelAlpha * 0.7})`;
    tctx.font = `${Math.max(9, 10 / Math.sqrt(viewZoom))}px Inter, sans-serif`;
    tctx.fillText(`${epoch.start}–${epoch.end}`, centerX, labelY + 16);

    // Artist count
    if (viewZoom > 2) {
      tctx.fillStyle = `rgba(160,140,200,${labelAlpha * 0.5})`;
      tctx.font = `${Math.max(8, 9 / Math.sqrt(viewZoom))}px Inter, sans-serif`;
      tctx.fillText(`${artistCount} artist${artistCount !== 1 ? "s" : ""}`, centerX, labelY + 28);
    }
  });

  // ── ARTIST DOTS (visible when zoomed in) ────────────
  if (viewZoom > 3) {
    allArtists.forEach((artist) => {
      if (activeFilter !== "all" && artist.epoch !== activeFilter) return;
      const birthYear = artist.birthYear || (artist.deathYear ? artist.deathYear - 60 : 1500);
      const deathYear = artist.deathYear || birthYear + 60;
      const midYear = (birthYear + deathYear) / 2;
      const sx = worldToScreen(midYear);
      if (sx < paddingX || sx > w - paddingX) return;

      const epochDef = epochDefs.find((e) => e.id === artist.epoch);
      const color = epochDef ? epochDef.glow : "#a78bfa";

      tctx.fillStyle = color;
      tctx.beginPath();
      tctx.arc(sx, axisY + 30, 1.5, 0, Math.PI * 2);
      tctx.fill();

      if (viewZoom > 8) {
        tctx.fillStyle = `rgba(200,180,230,0.5)`;
        tctx.font = "8px Inter, sans-serif";
        tctx.textAlign = "center";
        const name = artist.name.length > 18 ? artist.name.slice(0, 16) + "…" : artist.name;
        tctx.fillText(name, sx, axisY + 38);
      }
    });
  }

  // ── CURSOR ─────────────────────────────────────────
  if (hoveredEpoch) {
    timelineWrapper.style.cursor = "pointer";
  } else if (isPanning) {
    timelineWrapper.style.cursor = "grabbing";
  } else {
    timelineWrapper.style.cursor = "grab";
  }

  // Fade hint after interaction
  if (viewZoom !== 1 || viewOffsetX !== 0) {
    timelineHint.style.opacity = "0.3";
  } else {
    timelineHint.style.opacity = "1";
  }

  requestAnimationFrame(drawTimeline);
}

function getTickInterval(visibleSpan) {
  if (visibleSpan < 30) return 1;
  if (visibleSpan < 80) return 5;
  if (visibleSpan < 200) return 10;
  if (visibleSpan < 500) return 25;
  if (visibleSpan < 1000) return 50;
  return 100;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GALAXY TIMELINE — INTERACTION
// ═══════════════════════════════════════════════════════════════════════════════
function bindTimelineControls() {
  timelineWrapper.addEventListener("wheel", (e) => {
    e.preventDefault();
    const rect = timelineWrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const w = rect.width;
    const paddingX = w * 0.08;
    const usableWidth = w - paddingX * 2;
    const visibleSpan = TIMELINE_SPAN / viewZoom;

    // Zoom centered on mouse position
    const worldX = viewOffsetX + ((mouseX - paddingX) / usableWidth - 0.5) * visibleSpan;
    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom * zoomFactor));
    const newVisibleSpan = TIMELINE_SPAN / newZoom;

    targetZoom = newZoom;
    targetOffsetX = worldX - ((mouseX - paddingX) / usableWidth - 0.5) * newVisibleSpan;

    // Clamp
    targetOffsetX = Math.max(TIMELINE_START - newVisibleSpan * 0.1, Math.min(TIMELINE_END - newVisibleSpan * 0.9, targetOffsetX));
  }, { passive: false });

  timelineWrapper.addEventListener("pointerdown", (e) => {
    isPanning = true;
    panStart = { x: e.clientX, y: e.clientY };
    panStartOffset = viewOffsetX;
    timelineWrapper.setPointerCapture(e.pointerId);
  });

  timelineWrapper.addEventListener("pointermove", (e) => {
    lastPointer.x = e.clientX;
    lastPointer.y = e.clientY;

    if (isPanning) {
      const dx = e.clientX - panStart.x;
      const w = timelineWrapper.getBoundingClientRect().width;
      const paddingX = w * 0.08;
      const usableWidth = w - paddingX * 2;
      const visibleSpan = TIMELINE_SPAN / viewZoom;
      const worldDx = -(dx / usableWidth) * visibleSpan;
      targetOffsetX = panStartOffset + worldDx;
    }
  });

  window.addEventListener("pointerup", () => {
    if (isPanning) {
      const dx = Math.abs(lastPointer.x - panStart.x);
      const dy = Math.abs(lastPointer.y - panStart.y);
      // If barely moved, treat as click
      if (dx < 5 && dy < 5 && hoveredEpoch) {
        selectEpoch(hoveredEpoch.id, `${hoveredEpoch.start}–${hoveredEpoch.end}`);
      }
    }
    isPanning = false;
  });

  // Touch pinch zoom
  let pinchStartDist = 0;
  let pinchStartZoom = 1;
  let pinchCenter = { x: 0, y: 0 };

  timelineWrapper.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
      pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartZoom = targetZoom;
      pinchCenter = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
      };
    }
  }, { passive: true });

  timelineWrapper.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / pinchStartDist;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom * scale));
      targetZoom = newZoom;
    }
  }, { passive: true });

  // Resize handler
  window.addEventListener("resize", () => {
    resizeTimelineCanvas();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH & FILTER LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
function initSearch() {
  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim().toLowerCase();
    if (query.length < 2) {
      searchResults.hidden = true;
      return;
    }
    performSearch(query);
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    searchResults.hidden = true;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !searchResults.hidden) {
      searchInput.value = "";
      searchResults.hidden = true;
    }
  });
}

function performSearch(query) {
  const results = allArtists.filter((a) => {
    const searchable = `${a.name} ${a.movement} ${a.nationality} ${a.epoch} ${a.bio}`.toLowerCase();
    return searchable.includes(query);
  });

  if (results.length === 0) {
    searchResultsCount.textContent = "No artists found";
    searchResultsGrid.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1">Try a different search term</p>';
    searchResults.hidden = false;
    return;
  }

  searchResultsCount.textContent = `${results.length} artist${results.length > 1 ? "s" : ""} found`;
  searchResultsGrid.innerHTML = "";

  results.forEach((artist) => {
    const card = document.createElement("div");
    card.className = "search-result-card";
    card.innerHTML = `
      <img class="artist-thumb" src="${artist.imageUrl}" alt="${artist.name}" loading="lazy" onerror="this.style.display='none'" />
      <span class="artist-name">${artist.name}</span>
      <span class="artist-meta">${artist.years} · ${getDisplayName(artist.epoch)}</span>
    `;
    card.addEventListener("click", () => {
      searchResults.hidden = true;
      searchInput.value = "";
      showArtistInPanel(artist);
    });
    searchResultsGrid.appendChild(card);
  });

  searchResults.hidden = false;
}

function showArtistInPanel(artist) {
  artistName.textContent = artist.name;
  artistYears.textContent = `${artist.years} · ${artist.movement}`;
  artistBio.textContent = artist.bio;
  artistImage.src = artist.imageUrl;
  artistImage.alt = `Artwork associated with ${artist.name}`;
  artistUrl.href = artist.imageUrl;
  panel.hidden = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILTER CHIPS
// ═══════════════════════════════════════════════════════════════════════════════
function initFilters() {
  filterChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;

    const filter = chip.dataset.filter;
    activeFilter = filter;

    filterChips.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    searchInput.value = "";
    searchResults.hidden = true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SURPRISE ME
// ═══════════════════════════════════════════════════════════════════════════════
function initSurprise() {
  surpriseBtn.addEventListener("click", () => {
    const randomArtist = allArtists[Math.floor(Math.random() * allArtists.length)];
    currentEpoch = randomArtist.epoch;
    currentEpochArtists = allArtists.filter((a) => a.epoch === randomArtist.epoch);

    selectEpoch(randomArtist.epoch, `${randomArtist.epochRange || ""}`);

    setTimeout(() => {
      enterMuseum();
    }, 800);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EPOCH SELECTION
// ═══════════════════════════════════════════════════════════════════════════════
function selectEpoch(epochName, epochRange) {
  currentEpoch = epochName;
  currentEpochArtists = allArtists.filter((a) => a.epoch === epochName);

  epochDetailName.textContent = getDisplayName(epochName);
  epochDetailRange.textContent = epochRange;

  epochArtistsGrid.innerHTML = "";
  currentEpochArtists.forEach((artist) => {
    const card = document.createElement("div");
    card.className = "epoch-artist-card";
    card.innerHTML = `
      <img class="artist-thumb" src="${artist.imageUrl}" alt="${artist.name}" loading="lazy" onerror="this.style.display='none'" />
      <span class="artist-name">${artist.name}</span>
      <span class="artist-years">${artist.years}</span>
    `;
    card.addEventListener("click", () => {
      showArtistInPanel(artist);
    });
    epochArtistsGrid.appendChild(card);
  });

  epochDetail.hidden = false;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCENE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════
function enterMuseum() {
  isInMuseum = true;
  timelineOverlay.style.opacity = "1";

  const fadeOut = timelineOverlay.animate(
    [{ opacity: 1 }, { opacity: 0 }],
    { duration: 400, easing: "ease-out" }
  );
  fadeOut.onfinish = () => {
    timelineOverlay.hidden = true;
    timelineOverlay.style.opacity = "";
    museumView.hidden = false;

    hudTitle.textContent = `${getDisplayName(currentEpoch)} Hall`;

    initMuseumScene();
  };
}

function exitMuseum() {
  isInMuseum = false;
  epochDetail.hidden = true;

  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  paintings = [];

  museumView.hidden = true;
  panel.hidden = true;
  timelineOverlay.hidden = false;

  timelineOverlay.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: 300,
    easing: "ease-out",
  });

  // Restart timeline animation
  resizeTimelineCanvas();
  requestAnimationFrame(drawTimeline);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3D MUSEUM SCENE
// ═══════════════════════════════════════════════════════════════════════════════
function initMuseumScene() {
  if (renderer) {
    renderer.dispose();
  }
  paintings = [];

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  scene = new THREE.Scene();

  const epochColors = {
    Vorreformatorisch: { bg: 0x1a1510, fog: 0x1a1510, wall: 0xf0e8d8, floor: 0x6b5540 },
    Renaissance: { bg: 0x15110d, fog: 0x15110d, wall: 0xf5f0e7, floor: 0x8a6b4b },
    Barock: { bg: 0x1a1210, fog: 0x1a1210, wall: 0xe8ddd0, floor: 0x5c3a20 },
    Romantik: { bg: 0x0f1815, fog: 0x0f1815, wall: 0xe0e8e3, floor: 0x3d5a45 },
    Impressionismus: { bg: 0x121318, fog: 0x121318, wall: 0xf0f0f8, floor: 0x6b6b8a },
    Moderne: { bg: 0x141414, fog: 0x141414, wall: 0xf5f5f5, floor: 0x2a2a2a },
    Zeitgenössisch: { bg: 0x0f1117, fog: 0x0f1117, wall: 0xfafafa, floor: 0x1e1e2e },
    "Asiatische Kunst": { bg: 0x1a1410, fog: 0x1a1410, wall: 0xf5ede0, floor: 0x5c4030 },
  };

  const theme = epochColors[currentEpoch] || epochColors.Renaissance;
  scene.background = new THREE.Color(theme.bg);
  scene.fog = new THREE.Fog(theme.fog, 12, 32);

  camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
  camera.position.set(0, 1.65, 4.5);
  yaw = Math.PI;
  pitch = 0;
  updateCameraRotation();

  createRoom(theme.wall, theme.floor);
  addLighting();
  placePaintings(currentEpochArtists);
  resizeRenderer();
  bindMuseumControls();
  animateMuseum();
}

function createRoom(wallColor, floorColor) {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.82 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: floorColor, roughness: 0.72 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.88 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMaterial);
  ceiling.position.y = 3.4;
  ceiling.rotation.x = Math.PI / 2;
  scene.add(ceiling);

  addWall(0, 1.7, -6, 0, wallMaterial);
  addWall(0, 1.7, 6, Math.PI, wallMaterial);
  addWall(-6, 1.7, 0, Math.PI / 2, wallMaterial);
  addWall(6, 1.7, 0, -Math.PI / 2, wallMaterial);
}

function addWall(x, y, z, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.4), material);
  wall.position.set(x, y, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  scene.add(wall);
}

function addLighting() {
  scene.add(new THREE.HemisphereLight(0xfff3dc, 0x5c4837, 1.5));

  const main = new THREE.DirectionalLight(0xfff2d8, 1.4);
  main.position.set(2.5, 5, 3);
  main.castShadow = true;
  scene.add(main);

  [
    [-3, 3.15, -2],
    [3, 3.15, -2],
    [0, 3.15, 2.5],
  ].forEach(([x, y, z]) => {
    const light = new THREE.PointLight(0xffe6bd, 2.4, 8);
    light.position.set(x, y, z);
    scene.add(light);
  });
}

function createFallbackTexture(artist, color) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(34, 34, c.width - 68, c.height - 68);
  ctx.fillStyle = "#1f1711";
  ctx.font = "700 48px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  wrapText(ctx, artist.name, c.width / 2, c.height / 2 - 18, 620, 56);
  ctx.font = "28px Georgia, serif";
  ctx.fillText(artist.years, c.width / 2, c.height / 2 + 82);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  const lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const start = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((entry, index) => ctx.fillText(entry, x, start + index * lineHeight));
}

function addPainting(artist, transform, color) {
  const group = new THREE.Group();
  group.position.set(...transform.position);
  group.rotation.y = transform.rotationY;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.08, 1.48, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x3a2517, roughness: 0.55 })
  );
  frame.castShadow = true;
  group.add(frame);

  const artMaterial = new THREE.MeshStandardMaterial({
    map: createFallbackTexture(artist, color),
    roughness: 0.62,
  });
  const art = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.18), artMaterial);
  art.position.z = 0.071;
  art.userData.artist = artist;
  paintings.push(art);
  group.add(art);

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin("anonymous");
  loader.load(
    artist.imageUrl,
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      artMaterial.map = texture;
      artMaterial.needsUpdate = true;
    },
    undefined,
    () => {
      artMaterial.needsUpdate = true;
    }
  );

  scene.add(group);
}

function placePaintings(artists) {
  const displayArtists = artists.slice(0, 8);
  const placements = [
    { position: [-3.6, 1.75, -5.92], rotationY: 0 },
    { position: [0, 1.75, -5.92], rotationY: 0 },
    { position: [3.6, 1.75, -5.92], rotationY: 0 },
    { position: [-5.92, 1.75, -2.5], rotationY: Math.PI / 2 },
    { position: [-5.92, 1.75, 1.5], rotationY: Math.PI / 2 },
    { position: [5.92, 1.75, -2.5], rotationY: -Math.PI / 2 },
    { position: [5.92, 1.75, 1.5], rotationY: -Math.PI / 2 },
    { position: [0, 1.75, 5.92], rotationY: Math.PI },
  ];
  const colors = ["#b98b5d", "#9f6f60", "#c2a15b", "#9aa56b", "#7d8b9b", "#b57a6a", "#8b9a6b", "#a08b7b"];

  displayArtists.forEach((artist, index) => {
    if (placements[index]) {
      addPainting(artist, placements[index], colors[index % colors.length]);
    }
  });
}

function showArtist(artist) {
  showArtistInPanel(artist);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
function isClickModeActive() {
  return [...clickModeKeys].some((code) => keys.has(code));
}

function releasePointerLockForClickMode() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock?.();
  }
}

function updateCameraRotation() {
  pitch = Math.max(-1.25, Math.min(1.25, pitch));
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}

function moveCamera(delta) {
  const speed = 3.2 * delta;
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
  const movement = new THREE.Vector3();

  if (keys.has("KeyW")) movement.add(forward);
  if (keys.has("KeyS")) movement.sub(forward);
  if (keys.has("KeyD")) movement.add(right);
  if (keys.has("KeyA")) movement.sub(right);

  if (movement.lengthSq() > 0) {
    movement.normalize().multiplyScalar(speed);
    camera.position.add(movement);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.25, 5.25);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -5.25, 5.25);
  }
}

function resizeRenderer() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== width || canvas.height !== height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

function onCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(paintings, false)[0];
  if (hit?.object.userData.artist) {
    showArtist(hit.object.userData.artist);
  } else if (!document.pointerLockElement && !isClickModeActive()) {
    canvas.requestPointerLock?.();
  }
}

function bindMuseumControls() {
  const newCanvas = canvas.cloneNode(true);
  canvas.parentNode.replaceChild(newCanvas, canvas);

  const museumCanvas = document.querySelector("#museum-canvas");

  museumCanvas.addEventListener("click", onCanvasClick);

  museumCanvas.addEventListener("pointerdown", (event) => {
    if (isClickModeActive()) {
      releasePointerLockForClickMode();
      return;
    }
    isDragging = true;
    lastPointer = { x: event.clientX, y: event.clientY };
  });

  window.addEventListener("pointerup", () => {
    isDragging = false;
  });

  window.addEventListener("pointermove", (event) => {
    const locked = document.pointerLockElement === museumCanvas;
    if (!isDragging && !locked) return;
    const movementX = locked ? event.movementX : event.clientX - lastPointer.x;
    const movementY = locked ? event.movementY : event.clientY - lastPointer.y;
    yaw -= movementX * 0.0026;
    pitch -= movementY * 0.0026;
    lastPointer = { x: event.clientX, y: event.clientY };
    updateCameraRotation();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANIMATION LOOP
// ═══════════════════════════════════════════════════════════════════════════════
let animFrameId = null;

function animateMuseum() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
  }

  let previous = performance.now();
  function frame(now) {
    if (!isInMuseum) return;
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    resizeRenderer();
    moveCamera(delta);
    renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(frame);
  }
  animFrameId = requestAnimationFrame(frame);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GLOBAL INPUT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
function bindGlobalControls() {
  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (clickModeKeys.has(event.code)) {
      event.preventDefault();
      releasePointerLockForClickMode();
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  window.addEventListener("resize", () => {
    if (isInMuseum && renderer) {
      resizeRenderer();
    } else {
      resizeTimelineCanvas();
    }
  });

  closePanel.addEventListener("click", () => {
    panel.hidden = true;
  });

  closeEpochDetailBtn.addEventListener("click", () => {
    epochDetail.hidden = true;
  });

  enterMuseumBtn.addEventListener("click", () => {
    enterMuseum();
  });

  backToTimelineBtn.addEventListener("click", () => {
    exitMuseum();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  try {
    allArtists = await loadArtists();
    initTimelineCanvas();
    bindTimelineControls();
    initSearch();
    initFilters();
    initSurprise();
    bindGlobalControls();

    museumView.hidden = true;
    timelineOverlay.hidden = false;
  } catch (error) {
    console.error(error);
    document.querySelector(".timeline-header p").textContent =
      "The museum could not start. Run it from a local HTTP server so the JSON data can load.";
  }
}

init();
