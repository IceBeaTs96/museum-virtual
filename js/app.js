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
const closeEpochDetailBtn = document.querySelector("#close-epoch-detail");
const enterMuseumBtn = document.querySelector("#enter-museum-btn");
const backToTimelineBtn = document.querySelector("#back-to-timeline");
const hudTitle = document.querySelector("#hud-title");
const searchInput = document.querySelector("#artist-search");
const searchResults = document.querySelector("#search-results");
const searchResultsGrid = document.querySelector("#search-results-grid");
const searchResultsCount = document.querySelector("#search-results-count");
const clearSearchBtn = document.querySelector("#clear-search");
const filterChips = document.querySelector("#filter-chips");
const surpriseBtn = document.querySelector("#surprise-btn");
const timelineHint = document.querySelector(".timeline-hint");
const timelineWorld = document.querySelector("#timeline-world");
const timelineViewport = document.querySelector("#timeline-viewport");
const starfieldCanvas = document.querySelector("#starfield-canvas");

let canvas = document.querySelector("#museum-canvas");
const panel = document.querySelector("#info-panel");
const closePanel = document.querySelector("#close-panel");
const artistName = document.querySelector("#artist-name");
const artistYears = document.querySelector("#artist-years");
const artistBio = document.querySelector("#artist-bio");
const artistImage = document.querySelector("#artist-image");
const artistUrl = document.querySelector("#artist-url");
const carouselPrev = document.querySelector("#carousel-prev");
const carouselNext = document.querySelector("#carousel-next");
const carouselCounter = document.querySelector("#carousel-counter");
const ttsBtn = document.querySelector("#tts-btn");
const artistRelations = document.querySelector("#artist-relations");
const relationsList = document.querySelector("#relations-list");
const favBtn = document.querySelector("#fav-btn");
const shareBtn = document.querySelector("#share-btn");

// Three.js refs
let renderer, scene, camera;
let roomGroup, textureLoader;
let paintings = [];
let portals = [];
const keys = new Set();
const clickModeKeys = new Set(["ShiftLeft", "ShiftRight", "Space"]);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let yaw = Math.PI;
let pitch = 0;
let isDragging = false;
let lastPointer = { x: 0, y: 0 };
let currentRoomIndex = 0;
const roomBounds = { x: 5.25, z: 5.25 };

const roomPalette = {
  Vorreformatorisch: { bg: 0x1a1510, fog: 0x1a1510, wall: 0xf0e8d8, floor: 0x6b5540, accent: 0x8b7355 },
  Renaissance: { bg: 0x15110d, fog: 0x15110d, wall: 0xf5f0e7, floor: 0x8a6b4b, accent: 0xc9a96e },
  Barock: { bg: 0x1a1210, fog: 0x1a1210, wall: 0xe8ddd0, floor: 0x5c3a20, accent: 0x8b4513 },
  Romantik: { bg: 0x0f1815, fog: 0x0f1815, wall: 0xe0e8e3, floor: 0x3d5a45, accent: 0x4a7c59 },
  Impressionismus: { bg: 0x121318, fog: 0x121318, wall: 0xf0f0f8, floor: 0x6b6b8a, accent: 0x6b5b95 },
  Moderne: { bg: 0x141414, fog: 0x141414, wall: 0xf5f5f5, floor: 0x2a2a2a, accent: 0xd4574a },
  Zeitgenössisch: { bg: 0x0f1117, fog: 0x0f1117, wall: 0xfafafa, floor: 0x1e1e2e, accent: 0x3b82f6 },
  "Asiatische Kunst": { bg: 0x1a1410, fog: 0x1a1410, wall: 0xf5ede0, floor: 0x5c4030, accent: 0xd4a574 },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMELINE STATE
// ═══════════════════════════════════════════════════════════════════════════════
const TIMELINE_START = 1200;
const TIMELINE_END = 2025;
const TIMELINE_SPAN = TIMELINE_END - TIMELINE_START;
const WORLD_WIDTH = 5200;

let viewZoom = 1;
let viewPanX = 0;
let targetZoom = 1;
let targetPanX = 0;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 10;

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
//  DATA
// ═══════════════════════════════════════════════════════════════════════════════
async function loadArtists() {
  const r = await fetch("data/artists.json");
  if (!r.ok) throw new Error(`Unable to load artist data: ${r.status}`);
  return r.json();
}

const epochDisplayNames = {
  Vorreformatorisch: "Proto-Renaissance", Renaissance: "Renaissance", Barock: "Baroque",
  Romantik: "Romanticism", Impressionismus: "Impressionism", Moderne: "Modern",
  Zeitgenössisch: "Contemporary", "Asiatische Kunst": "Asian Art",
};

// ═══════════════════════════════════════════════════════════════════════════════
//  I18N (EN / DE)
// ═══════════════════════════════════════════════════════════════════════════════
let currentLang = "en";

const I18N = {
  en: {
    subtitle: (n, e) => `Explore ${n} masterpieces across ${e} epochs of art history`,
    all: "All",
    surprise: "🎲 Surprise Me!",
    timelineHint: "🖱️ Scroll to zoom · Drag to pan · Click an epoch to explore",
    enterMuseum: "Enter 3D Museum Hall →",
    readAloud: "🔊 Read aloud",
    stop: "⏹ Stop",
    ttsUnsupported: "🔇 TTS not supported",
    openImage: "Open image source",
    backToTimeline: "← Back to Timeline",
    hudHint: "Click the room to look around. WASD moves, mouse drags/locks view, hold Shift or Space to click paintings.",
    artists: "artists",
    artist: "artist",
    noArtists: "No artists found",
    tryDifferent: "Try a different search term",
    found: "found",
    searchPlaceholder: "🔍 Search artists, movements, nationalities...",
    hall: "Hall",
  },
  de: {
    subtitle: (n, e) => `Entdecke ${n} Meisterwerke aus ${e} Epochen der Kunstgeschichte`,
    all: "Alle",
    surprise: "🎲 Überrasch mich!",
    timelineHint: "🖱️ Scrollen zum Zoomen · Ziehen zum Verschieben · Epoche anklicken zum Erkunden",
    enterMuseum: "3D-Museumssaal betreten →",
    readAloud: "🔊 Vorlesen",
    stop: "⏹ Stopp",
    ttsUnsupported: "🔇 TTS nicht unterstützt",
    openImage: "Bildquelle öffnen",
    backToTimeline: "← Zurück zur Timeline",
    hudHint: "Klicke in den Raum zum Umschauen. WASD bewegt, Maus zieht/sperrt die Sicht, Shift oder Leertaste halten zum Anklicken der Gemälde.",
    artists: "Künstler",
    artist: "Künstler",
    noArtists: "Keine Künstler gefunden",
    tryDifferent: "Versuche einen anderen Suchbegriff",
    found: "gefunden",
    searchPlaceholder: "🔍 Künstler, Strömungen, Nationalitäten suchen...",
    hall: "Saal",
  },
};

// German epoch display names (used when currentLang === "de")
const epochDisplayNamesDe = {
  Vorreformatorisch: "Proto-Renaissance", Renaissance: "Renaissance", Barock: "Barock",
  Romantik: "Romantik", Impressionismus: "Impressionismus", Moderne: "Moderne",
  Zeitgenössisch: "Zeitgenössisch", "Asiatische Kunst": "Asiatische Kunst",
};

function t(key) {
  return I18N[currentLang][key] ?? I18N.en[key] ?? key;
}

function getDisplayNameLocalized(e) {
  if (currentLang === "de") return epochDisplayNamesDe[e] || e;
  return epochDisplayNames[e] || e;
}

function applyLanguage() {
  const lang = currentLang;
  document.documentElement.lang = lang;

  // Subtitle
  const subtitle = document.querySelector("#timeline-subtitle");
  if (subtitle && allArtists.length) {
    subtitle.textContent = I18N[lang].subtitle(allArtists.length, epochDefs.length);
  }

  // Filter chips
  document.querySelectorAll(".filter-chip").forEach(chip => {
    const f = chip.dataset.filter;
    if (f === "all") { chip.textContent = t("all"); return; }
    chip.textContent = getDisplayNameLocalized(f);
  });

  // Static buttons / hints
  surpriseBtn.textContent = t("surprise");
  timelineHint.textContent = t("timelineHint");
  enterMuseumBtn.textContent = t("enterMuseum");
  backToTimelineBtn.textContent = t("backToTimeline");
  document.querySelector("#hud-hint").textContent = t("hudHint");
  searchInput.placeholder = t("searchPlaceholder");
  artistUrl.textContent = t("openImage");
  if (!ttsSpeaking) ttsBtn.textContent = t("readAloud");

  // Epoch markers (labels + years already localized via getDisplayNameLocalized)
  document.querySelectorAll(".epoch-marker").forEach(m => {
    const epochId = m.dataset.epoch;
    const label = m.querySelector(".epoch-label");
    if (label && epochId) label.textContent = getDisplayNameLocalized(epochId);
  });

  // HUD title (if in museum)
  if (isInMuseum && currentEpoch) {
    hudTitle.textContent = `${getDisplayNameLocalized(currentEpoch)} ${t("hall")}`;
  }

  // Lang switch active state
  document.querySelectorAll(".lang-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.lang === lang);
  });
}

function initLanguage() {
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      currentLang = btn.dataset.lang;
      applyLanguage();
      // Rebuild timeline markers so labels reflect the new language.
      buildTimeline();
    });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STARFIELD CANVAS
// ═══════════════════════════════════════════════════════════════════════════════
let sctx, stars = [], nebulae = [], particles = [];

function initStarfield() {
  sctx = starfieldCanvas.getContext("2d");
  resizeStarfield();
  stars = Array.from({ length: 500 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 2 + 0.2,
    brightness: Math.random(), speed: Math.random() * 0.015 + 0.003,
    offset: Math.random() * Math.PI * 2,
  }));
  nebulae = [
    // Galaxy core — a bright, warm center that anchors the "cosmic" feel
    { x: 0.5, y: 0.42, rx: 0.5, ry: 0.28, c: { r: 150, g: 90, b: 200 }, o: 0.16, a: 0.15 },
    { x: 0.5, y: 0.42, rx: 0.3, ry: 0.16, c: { r: 220, g: 160, b: 240 }, o: 0.14, a: 0.4 },
    // Purple / magenta nebulae (left)
    { x: 0.22, y: 0.3, rx: 0.34, ry: 0.18, c: { r: 120, g: 50, b: 170 }, o: 0.14, a: 0.3 },
    { x: 0.3, y: 0.55, rx: 0.3, ry: 0.16, c: { r: 90, g: 40, b: 140 }, o: 0.12, a: 0.9 },
    // Blue / cyan nebulae (right)
    { x: 0.72, y: 0.32, rx: 0.36, ry: 0.2, c: { r: 40, g: 80, b: 180 }, o: 0.14, a: 0.5 },
    { x: 0.78, y: 0.55, rx: 0.3, ry: 0.16, c: { r: 30, g: 100, b: 160 }, o: 0.12, a: 1.1 },
    // Warm amber / rose accents
    { x: 0.42, y: 0.2, rx: 0.26, ry: 0.13, c: { r: 200, g: 90, b: 90 }, o: 0.1, a: 0.7 },
    { x: 0.6, y: 0.68, rx: 0.28, ry: 0.14, c: { r: 180, g: 70, b: 120 }, o: 0.1, a: 1.3 },
    // Teal / green hint
    { x: 0.15, y: 0.7, rx: 0.24, ry: 0.12, c: { r: 40, g: 120, b: 110 }, o: 0.09, a: 0.6 },
  ];
  particles = Array.from({ length: 200 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.2 + 0.3,
    vx: (Math.random() - 0.5) * 0.0002, vy: (Math.random() - 0.5) * 0.0002,
    opacity: Math.random() * 0.5 + 0.15,
  }));
  drawStarfield();
}

function resizeStarfield() {
  const dpr = window.devicePixelRatio || 1;
  const w = starfieldCanvas.clientWidth;
  const h = starfieldCanvas.clientHeight;
  starfieldCanvas.width = w * dpr;
  starfieldCanvas.height = h * dpr;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.scale(dpr, dpr);
}

function drawStarfield(ts = 0) {
  if (!sctx || isInMuseum) { requestAnimationFrame(drawStarfield); return; }
  const w = starfieldCanvas.width / (window.devicePixelRatio || 1);
  const h = starfieldCanvas.height / (window.devicePixelRatio || 1);
  sctx.clearRect(0, 0, w, h);
  const bg = sctx.createRadialGradient(w * 0.5, h * 0.4, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
  bg.addColorStop(0, "#0d0b1a"); bg.addColorStop(0.5, "#080614"); bg.addColorStop(1, "#020108");
  sctx.fillStyle = bg; sctx.fillRect(0, 0, w, h);
  nebulae.forEach(n => {
    const nx = n.x * w, ny = n.y * h, nrx = n.rx * w, nry = n.ry * h;
    const g = sctx.createRadialGradient(nx, ny, 0, nx, ny, Math.max(nrx, nry));
    const { r, g: gn, b } = n.c;
    g.addColorStop(0, `rgba(${r},${gn},${b},${n.o * 1.5})`);
    g.addColorStop(0.5, `rgba(${r},${gn},${b},${n.o * 0.5})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    sctx.save(); sctx.translate(nx, ny); sctx.rotate(n.a); sctx.scale(1, nry / nrx);
    sctx.fillStyle = g; sctx.beginPath(); sctx.arc(0, 0, nrx, 0, Math.PI * 2); sctx.fill();
    sctx.restore();
  });
  const t = ts * 0.001;
  stars.forEach(s => {
    const tw = 0.5 + 0.5 * Math.sin(t * s.speed * 60 + s.offset);
    sctx.fillStyle = `rgba(220,210,255,${s.brightness * 0.6 + tw * 0.4})`;
    sctx.beginPath(); sctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2); sctx.fill();
  });
  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0;
    if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0;
    sctx.fillStyle = `rgba(180,160,220,${p.opacity})`;
    sctx.beginPath(); sctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2); sctx.fill();
  });
  requestAnimationFrame(drawStarfield);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HTML TIMELINE
// ═══════════════════════════════════════════════════════════════════════════════
function yearToWorldX(year) {
  return ((year - TIMELINE_START) / TIMELINE_SPAN) * WORLD_WIDTH;
}

function buildTimeline() {
  timelineWorld.innerHTML = "";
  const axis = document.createElement("div");
  axis.className = "timeline-axis";
  axis.style.top = "55%";
  axis.style.width = WORLD_WIDTH + "px";
  timelineWorld.appendChild(axis);

  epochDefs.forEach(epoch => {
    const centerX = yearToWorldX((epoch.start + epoch.end) / 2);
    const count = allArtists.filter(a => a.epoch === epoch.id).length;

    const marker = document.createElement("div");
    marker.className = "epoch-marker";
    marker.dataset.epoch = epoch.id;
    marker.style.left = centerX + "px";
    marker.style.top = "55%";

    const dot = document.createElement("div");
    dot.className = "epoch-dot";
    dot.style.background = `radial-gradient(circle at 35% 30%, #fff, ${epoch.glow} 40%, ${epoch.color})`;
    dot.style.boxShadow = `0 0 20px ${epoch.glow}44, 0 0 40px ${epoch.glow}22`;
    marker.appendChild(dot);

    const label = document.createElement("div");
    label.className = "epoch-label";
    label.textContent = getDisplayNameLocalized(epoch.id);
    marker.appendChild(label);

    const years = document.createElement("div");
    years.className = "epoch-years";
    years.textContent = `${epoch.start}–${epoch.end}`;
    marker.appendChild(years);

    const cnt = document.createElement("div");
    cnt.className = "epoch-count";
    cnt.textContent = `${count} ${count !== 1 ? t("artists") : t("artist")}`;
    marker.appendChild(cnt);

    marker.addEventListener("click", (e) => {
      e.stopPropagation();
      showEpochDetail(epoch.id);
    });

    timelineWorld.appendChild(marker);
  });

  applyTimelineTransform();
}

function applyTimelineTransform() {
  const vpW = timelineViewport.clientWidth;
  const vpH = timelineViewport.clientHeight;
  const scale = viewZoom;
  const tx = -viewPanX * scale + vpW / 2;
  const ty = vpH * 0.05;
  timelineWorld.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
  timelineWorld.style.transformOrigin = "0 0";
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMELINE INTERACTION
// ═══════════════════════════════════════════════════════════════════════════════
let isPanningTL = false;
let panStartTL = { x: 0, panX: 0 };

function bindTimelineControls() {
  timelineViewport.addEventListener("wheel", e => {
    e.preventDefault();
    const rect = timelineViewport.getBoundingClientRect();
    const mouseVPX = e.clientX - rect.left;
    const vpW = rect.width;
    const worldX = (mouseVPX - vpW / 2) / viewZoom + viewPanX;
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, targetZoom * factor));
    targetPanX = worldX - (mouseVPX - vpW / 2) / targetZoom;
  }, { passive: false });

  timelineViewport.addEventListener("pointerdown", e => {
    if (e.target.closest(".epoch-marker")) return;
    isPanningTL = true;
    panStartTL = { x: e.clientX, panX: viewPanX };
    timelineViewport.setPointerCapture(e.pointerId);
  });

  timelineViewport.addEventListener("pointermove", e => {
    if (!isPanningTL) return;
    const dx = e.clientX - panStartTL.x;
    targetPanX = panStartTL.panX - dx / viewZoom;
  });

  window.addEventListener("pointerup", () => { isPanningTL = false; });

  let pinchStart = 0, pinchStartZoom = 1;
  timelineViewport.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
      pinchStart = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      pinchStartZoom = targetZoom;
    }
  }, { passive: true });
  timelineViewport.addEventListener("touchmove", e => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pinchStartZoom * (d / pinchStart)));
    }
  }, { passive: true });
}

function animateTimeline() {
  if (isInMuseum) { requestAnimationFrame(animateTimeline); return; }
  const lerp = 0.1;
  viewZoom += (targetZoom - viewZoom) * lerp;
  viewPanX += (targetPanX - viewPanX) * lerp;
  applyTimelineTransform();
  const moved = Math.abs(viewZoom - 1) > 0.01 || Math.abs(viewPanX) > 1;
  timelineHint.style.opacity = moved ? "0.25" : "1";
  requestAnimationFrame(animateTimeline);
}

// Apply the active filter to epoch markers. Called on filter change and
// favorites change (not every frame) to avoid repeated localStorage reads.
function applyFilterToMarkers() {
  const favs = activeFilter === "favorites" ? getFavorites() : null;
  document.querySelectorAll(".epoch-marker").forEach(m => {
    if (activeFilter === "favorites") {
      const epochId = m.dataset.epoch;
      const hasFav = allArtists.some(a => a.epoch === epochId && favs.includes(a.id));
      m.style.display = hasFav ? "" : "none";
    } else {
      m.style.display = (activeFilter === "all" || m.dataset.epoch === activeFilter) ? "" : "none";
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════════════════════════════
function initSearch() {
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { searchResults.hidden = true; return; }
    const results = allArtists.filter(a => {
      const base = `${a.name} ${a.movement} ${a.nationality} ${a.epoch} ${a.bio}`.toLowerCase();
      if (base.includes(q)) return true;
      // Also match artwork titles (from the enriched artworks array).
      const titles = (a.artworks || []).map(w => w.title).join(" ").toLowerCase();
      return titles.includes(q);
    });
    if (results.length === 0) {
      searchResultsCount.textContent = "No artists found";
      searchResultsGrid.innerHTML = '<p style="color:var(--muted);text-align:center;grid-column:1/-1">Try a different search term</p>';
    } else {
      searchResultsCount.textContent = `${results.length} ${results.length > 1 ? t("artists") : t("artist")} ${t("found")}`;
      searchResultsGrid.innerHTML = "";
      results.forEach(a => {
        const c = document.createElement("div");
        c.className = "search-result-card";
        c.innerHTML = `<img class="artist-thumb" src="${a.imageUrl}" alt="${a.name}" loading="lazy" onerror="this.style.display='none'" /><span class="artist-name">${a.name}</span><span class="artist-meta">${a.years} · ${getDisplayNameLocalized(a.epoch)}</span>`;
        c.addEventListener("click", () => { searchResults.hidden = true; searchInput.value = ""; showArtistInPanel(a); });
        searchResultsGrid.appendChild(c);
      });
    }
    searchResults.hidden = false;
  });
  clearSearchBtn.addEventListener("click", () => { searchInput.value = ""; searchResults.hidden = true; });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !searchResults.hidden) { searchInput.value = ""; searchResults.hidden = true; } });
}

function showArtistInPanel(artist) {
  artistName.textContent = artist.name;
  artistYears.textContent = `${artist.years} · ${artist.movement}`;
  artistBio.textContent = artist.bio;
  currentPanelArtistId = artist.id;
  updateFavButton();
  // Build the carousel list: primary image + any additional artworks.
  const works = [
    { title: artist.name, imageUrl: artist.imageUrl },
    ...(artist.artworks || []),
  ];
  currentWorks = works;
  currentWorkIndex = 0;
  renderWork();
  renderRelations(artist);
  panel.hidden = false;
}

function renderRelations(artist) {
  const rels = artist.relations || [];
  if (!rels.length) {
    artistRelations.hidden = true;
    return;
  }
  artistRelations.hidden = false;
  relationsList.innerHTML = "";
  rels.forEach(r => {
    const chip = document.createElement("button");
    chip.className = "relation-chip";
    chip.type = "button";
    chip.innerHTML = `${r.name}<span class="rel-type">· ${r.type}</span>`;
    chip.addEventListener("click", () => {
      const target = allArtists.find(a => a.id === r.id);
      if (target) showArtistInPanel(target);
    });
    relationsList.appendChild(chip);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FAVORITES (localStorage)
// ═══════════════════════════════════════════════════════════════════════════════
const FAV_KEY = "museum-favorites";
let currentPanelArtistId = null;

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY)) || [];
  } catch {
    return [];
  }
}

function setFavorites(ids) {
  localStorage.setItem(FAV_KEY, JSON.stringify(ids));
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(id);
  setFavorites(favs);
  updateFavButton();
  if (activeFilter === "favorites") applyFilterToMarkers();
}

function updateFavButton() {
  if (!currentPanelArtistId) return;
  const saved = isFavorite(currentPanelArtistId);
  favBtn.classList.toggle("saved", saved);
  favBtn.textContent = saved ? "★ Saved" : "☆ Save";
}

function initFavorites() {
  favBtn.addEventListener("click", () => {
    if (currentPanelArtistId) toggleFavorite(currentPanelArtistId);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARE / DEEP LINK
// ═══════════════════════════════════════════════════════════════════════════════
function shareUrlForArtist(id) {
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set("artist", id);
  return url.toString();
}

function initShare() {
  shareBtn.addEventListener("click", async () => {
    if (!currentPanelArtistId) return;
    const url = shareUrlForArtist(currentPanelArtistId);
    try {
      if (navigator.share) {
        await navigator.share({ title: artistName.textContent, url });
        return;
      }
    } catch (e) {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      shareBtn.classList.add("copied");
      shareBtn.textContent = "✓ Copied";
      setTimeout(() => {
        shareBtn.classList.remove("copied");
        shareBtn.textContent = "🔗 Share";
      }, 1500);
    } catch (e) {
      // clipboard unavailable — show the URL in a prompt
      window.prompt("Copy this link:", url);
    }
  });
}

function handleDeepLink() {
  const params = new URLSearchParams(window.location.search);
  const artistId = params.get("artist");
  if (!artistId) return;
  const artist = allArtists.find(a => a.id === artistId);
  if (artist) showArtistInPanel(artist);
}

let currentWorks = [];
let currentWorkIndex = 0;

function renderWork() {
  const work = currentWorks[currentWorkIndex];
  if (!work) return;
  artistImage.src = work.imageUrl;
  artistImage.alt = work.title || artistName.textContent;
  artistUrl.href = work.imageUrl;
  const total = currentWorks.length;
  carouselCounter.textContent = total > 1 ? `${currentWorkIndex + 1} / ${total}` : "";
  carouselPrev.disabled = currentWorkIndex === 0;
  carouselNext.disabled = currentWorkIndex >= total - 1;
}

function stepWork(dir) {
  const next = currentWorkIndex + dir;
  if (next < 0 || next >= currentWorks.length) return;
  currentWorkIndex = next;
  renderWork();
}

function initCarousel() {
  carouselPrev.addEventListener("click", () => stepWork(-1));
  carouselNext.addEventListener("click", () => stepWork(1));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  AUDIO GUIDE (TTS)
// ═══════════════════════════════════════════════════════════════════════════════
let ttsSpeaking = false;
let ttsUtterance = null;

function ttsSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice() {
  if (!ttsSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  // Prefer a German or English voice matching the bio language.
  const preferred = ["de-DE", "de", "en-GB", "en-US", "en"];
  for (const lang of preferred) {
    const v = voices.find(v => v.lang && v.lang.toLowerCase().startsWith(lang));
    if (v) return v;
  }
  return voices[0];
}

function toggleTTS() {
  if (!ttsSupported()) {
    ttsBtn.textContent = "🔇 TTS not supported";
    return;
  }
  if (ttsSpeaking) {
    window.speechSynthesis.cancel();
    return;
  }
  const text = `${artistName.textContent}. ${artistBio.textContent}`;
  if (!text.trim()) return;
  const u = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang || "en";
  u.rate = 0.95;
  u.onstart = () => { ttsSpeaking = true; ttsBtn.classList.add("speaking"); ttsBtn.textContent = "⏹ Stop"; };
  u.onend = resetTTS;
  u.onerror = resetTTS;
  ttsUtterance = u;
  window.speechSynthesis.speak(u);
}

function resetTTS() {
  ttsSpeaking = false;
  ttsUtterance = null;
  ttsBtn.classList.remove("speaking");
  ttsBtn.textContent = "🔊 Read aloud";
}

function initTTS() {
  if (!ttsSupported()) {
    ttsBtn.disabled = true;
    ttsBtn.textContent = "🔇 TTS not supported";
    return;
  }
  ttsBtn.addEventListener("click", toggleTTS);
  // Warm up the voice list (some browsers load it async).
  window.speechSynthesis.onvoiceschanged = () => { /* voices ready */ };
  window.speechSynthesis.getVoices();
}

// ═══════════════════════════════════════════════════════════════════════════════
//  FILTERS
// ═══════════════════════════════════════════════════════════════════════════════
function initFilters() {
  filterChips.addEventListener("click", e => {
    const chip = e.target.closest(".filter-chip");
    if (!chip) return;
    activeFilter = chip.dataset.filter;
    filterChips.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    searchInput.value = ""; searchResults.hidden = true;
    applyFilterToMarkers();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SURPRISE ME
// ═══════════════════════════════════════════════════════════════════════════════
function initSurprise() {
  surpriseBtn.addEventListener("click", () => {
    const ra = allArtists[Math.floor(Math.random() * allArtists.length)];
    showEpochDetail(ra.epoch);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  EPOCH DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════════════
function showEpochDetail(epochId) {
  const epoch = epochDefs.find(e => e.id === epochId);
  if (!epoch) return;
  currentEpoch = epoch.id;
  currentEpochArtists = allArtists.filter(a => a.epoch === epoch.id);

  epochDetailName.textContent = getDisplayNameLocalized(epoch.id);
  const n = currentEpochArtists.length;
  epochDetailRange.textContent = `${epoch.start}–${epoch.end} · ${n} ${n !== 1 ? t("artists") : t("artist")}`;

  epochArtistsGrid.innerHTML = "";
  currentEpochArtists.forEach(a => {
    const card = document.createElement("div");
    card.className = "epoch-artist-card";
    card.innerHTML = `<img class="artist-thumb" src="${a.imageUrl}" alt="${a.name}" loading="lazy" onerror="this.style.display='none'" /><span class="artist-name">${a.name}</span><span class="artist-years">${a.years}</span>`;
    epochArtistsGrid.appendChild(card);
  });

  searchResults.hidden = true;
  epochDetail.hidden = false;
}

function hideEpochDetail() {
  epochDetail.hidden = true;
}

function initEpochDetail() {
  enterMuseumBtn.addEventListener("click", () => { hideEpochDetail(); enterMuseum(); });
  closeEpochDetailBtn.addEventListener("click", () => hideEpochDetail());
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !epochDetail.hidden) hideEpochDetail(); });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SCENE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════
function enterMuseum() {
  if (isInMuseum) return;
  if (!currentEpoch) {
    currentEpoch = epochDefs[0].id;
    currentEpochArtists = allArtists.filter(a => a.epoch === currentEpoch);
  }
  isInMuseum = true;

  timelineOverlay.hidden = true;
  museumView.hidden = false;
  hudTitle.textContent = `${getDisplayNameLocalized(currentEpoch)} ${t("hall")}`;
  showTouchControls();

  try {
    initMuseumScene();
  } catch (err) {
    console.error("Museum init failed:", err);
    exitMuseum();
  }
}

function exitMuseum() {
  isInMuseum = false;
  releasePointerLock();
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  unbindMuseumControls();
  disposeRoom();
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer = null;
  }
  scene = null;
  camera = null;
  textureLoader = null;
  paintings = [];
  portals = [];
  // Remove any dynamically created elements
  const dynCanvas = museumView.querySelector("canvas");
  if (dynCanvas) dynCanvas.remove();
  const placeholder = museumView.querySelector("#museum-placeholder");
  if (placeholder) placeholder.remove();
  museumView.hidden = true;
  panel.hidden = true;
  timelineOverlay.hidden = false;
  hideTouchControls();
  if (sctx) { resizeStarfield(); requestAnimationFrame(drawStarfield); }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  3D MUSEUM SCENE
// ═══════════════════════════════════════════════════════════════════════════════
function initMuseumScene() {
  if (renderer) renderer.dispose();
  disposeRoom();
  paintings = [];
  portals = [];

  const oldCanvas = museumView.querySelector("canvas");
  if (oldCanvas) oldCanvas.remove();

  const newCanvas = document.createElement("canvas");
  newCanvas.id = "museum-canvas";
  newCanvas.style.cssText = "position:fixed;inset:0;display:block;cursor:crosshair;z-index:1";
  newCanvas.width = window.innerWidth;
  newCanvas.height = window.innerHeight;
  museumView.appendChild(newCanvas);
  canvas = newCanvas;

  renderer = new THREE.WebGLRenderer({ canvas: newCanvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(newCanvas.clientWidth || window.innerWidth, newCanvas.clientHeight || window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  scene = new THREE.Scene();
  textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin("anonymous");

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1.65, 4.5);
  yaw = 0;
  pitch = 0;
  updateCameraRotation();

  currentRoomIndex = Math.max(0, epochDefs.findIndex(e => e.id === currentEpoch));
  loadRoom(currentRoomIndex);
  resizeRenderer();
  bindMuseumControls();
  animateMuseum();
}

function disposeMaterial(material) {
  const materials = Array.isArray(material) ? material : [material];
  materials.filter(Boolean).forEach(m => {
    Object.values(m).forEach(v => {
      if (v?.isTexture) v.dispose();
    });
    m.dispose?.();
  });
}

function disposeRoom() {
  if (!roomGroup) return;
  roomGroup.traverse(obj => {
    obj.geometry?.dispose?.();
    if (obj.material) disposeMaterial(obj.material);
  });
  scene?.remove(roomGroup);
  roomGroup = null;
}

function loadRoom(index, fromPortal = null) {
  const boundedIndex = (index + epochDefs.length) % epochDefs.length;
  currentRoomIndex = boundedIndex;
  currentEpoch = epochDefs[boundedIndex].id;
  currentEpochArtists = allArtists.filter(a => a.epoch === currentEpoch);
  paintings = [];
  portals = [];
  panel.hidden = true;

  disposeRoom();
  roomGroup = new THREE.Group();
  scene.add(roomGroup);

  const palette = roomPalette[currentEpoch] || roomPalette.Renaissance;
  scene.background = new THREE.Color(palette.bg);
  scene.fog = new THREE.Fog(palette.fog, 13, 34);
  buildRoomShell(palette);
  addRoomLighting();
  addRoomLabel(getDisplayNameLocalized(currentEpoch), palette);
  addNavigationPortals(palette);
  placePaintings(currentEpochArtists);

  hudTitle.textContent = `${getDisplayNameLocalized(currentEpoch)} ${t("hall")}`;
  if (fromPortal === "next") {
    camera.position.set(0, 1.65, 4.15);
    yaw = 0;
  } else if (fromPortal === "prev") {
    camera.position.set(0, 1.65, -4.15);
    yaw = Math.PI;
  } else {
    camera.position.set(0, 1.65, 4.5);
    yaw = 0;
  }
  pitch = 0;
  updateCameraRotation();
}

function buildRoomShell(palette) {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: palette.wall, roughness: 0.82 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: palette.floor, roughness: 0.68 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0xe8e1d5, roughness: 0.88 });

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  roomGroup.add(floor);

  const plankMaterial = new THREE.LineBasicMaterial({ color: 0x2d2118, transparent: true, opacity: 0.22 });
  for (let x = -5.5; x <= 5.5; x += 0.5) {
    const points = [new THREE.Vector3(x, 0.012, -6), new THREE.Vector3(x, 0.012, 6)];
    roomGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), plankMaterial));
  }

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), ceilingMaterial);
  ceiling.position.y = 3.4;
  ceiling.rotation.x = Math.PI / 2;
  roomGroup.add(ceiling);

  [[0, 1.7, -6, 0], [0, 1.7, 6, Math.PI], [-6, 1.7, 0, Math.PI / 2], [6, 1.7, 0, -Math.PI / 2]].forEach(([x, y, z, ry]) => {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(12, 3.4), wallMaterial);
    wall.position.set(x, y, z);
    wall.rotation.y = ry;
    wall.receiveShadow = true;
    roomGroup.add(wall);
  });
}

function addRoomLighting() {
  roomGroup.add(new THREE.HemisphereLight(0xfff3dc, 0x5c4837, 1.25));
  const ambient = new THREE.AmbientLight(0xffffff, 0.35);
  roomGroup.add(ambient);
  [[-3.6, 3.1, -3.8], [0, 3.1, -3.8], [3.6, 3.1, -3.8], [-4.4, 3.05, 1.2], [4.4, 3.05, 1.2]].forEach(([x, y, z]) => {
    const light = new THREE.SpotLight(0xffeed0, 5.2, 9, Math.PI / 6, 0.45, 1.2);
    light.position.set(x, y, z);
    light.target.position.set(x * 0.92, 1.65, z > 0 ? 5.5 : -5.5);
    light.castShadow = true;
    roomGroup.add(light);
    roomGroup.add(light.target);
  });
}

function addRoomLabel(label, palette) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f8f4ec";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#2a2118";
  ctx.lineWidth = 10;
  ctx.strokeRect(18, 18, c.width - 36, c.height - 36);
  ctx.fillStyle = "#2a2118";
  ctx.font = "700 82px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, c.width / 2, 112);
  ctx.fillStyle = `#${palette.accent.toString(16).padStart(6, "0")}`;
  ctx.font = "600 34px Inter, sans-serif";
  ctx.fillText(`${currentEpochArtists.length} artists`, c.width / 2, 178);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 0.95), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.62 }));
  sign.position.set(0, 2.65, 5.91);
  sign.rotation.y = Math.PI;
  roomGroup.add(sign);
}

function addNavigationPortals(palette) {
  const prev = epochDefs[(currentRoomIndex - 1 + epochDefs.length) % epochDefs.length];
  const next = epochDefs[(currentRoomIndex + 1) % epochDefs.length];
  addPortal(`← ${getDisplayNameLocalized(prev.id)}`, -3.6, 2.75, -5.88, 0, () => loadRoom(currentRoomIndex - 1, "prev"), palette);
  addPortal(`${getDisplayNameLocalized(next.id)} →`, 3.6, 2.75, -5.88, 0, () => loadRoom(currentRoomIndex + 1, "next"), palette);
}

function addPortal(label, x, y, z, rotationY, action, palette) {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#221b15";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = `#${palette.accent.toString(16).padStart(6, "0")}`;
  ctx.fillRect(0, 0, c.width, 18);
  ctx.fillRect(0, c.height - 18, c.width, 18);
  ctx.fillStyle = "#fff7e9";
  ctx.font = "700 42px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, c.width / 2, c.height / 2);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.5, emissive: palette.accent, emissiveIntensity: 0.08 });
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2.9, 0.72), material);
  portal.position.set(x, y, z);
  portal.rotation.y = rotationY;
  portal.userData.portalAction = action;
  portals.push(portal);
  roomGroup.add(portal);
}

function createFallbackTexture(artist, color) {
  const c = document.createElement("canvas"); c.width = 768; c.height = 512;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(34, 34, c.width - 68, c.height - 68);
  ctx.fillStyle = "#1f1711"; ctx.font = "700 48px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const words = artist.name.split(" "); let line = ""; const lines = [];
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > 620 && line) { lines.push(line); line = w; } else line = t; }
  lines.push(line);
  const sy = c.height / 2 - 18 - ((lines.length - 1) * 56) / 2;
  lines.forEach((l, i) => ctx.fillText(l, c.width / 2, sy + i * 56));
  ctx.font = "28px Georgia, serif"; ctx.fillText(artist.years, c.width / 2, c.height / 2 + 82);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}

function addPainting(artist, transform, color) {
  const g = new THREE.Group();
  g.position.set(...transform.position); g.rotation.y = transform.rotationY;
  const f = new THREE.Mesh(new THREE.BoxGeometry(2.08, 1.48, 0.12), new THREE.MeshStandardMaterial({ color: 0x3a2517, roughness: 0.55 }));
  f.castShadow = true; g.add(f);
  const am = new THREE.MeshStandardMaterial({ map: createFallbackTexture(artist, color), roughness: 0.62 });
  const a = new THREE.Mesh(new THREE.PlaneGeometry(1.78, 1.18), am);
  a.position.z = 0.071; a.userData.artist = artist; paintings.push(a); g.add(a);
  const plaque = createPlaque(artist);
  plaque.position.set(0, -0.92, 0.08);
  g.add(plaque);
  const textureUrl = getLoadableTextureUrl(artist.imageUrl);
  if (textureUrl) {
    textureLoader.load(textureUrl, tex => {
      if (!isInMuseum || !a.parent) {
        tex.dispose();
        return;
      }
      tex.colorSpace = THREE.SRGBColorSpace;
      am.map?.dispose?.();
      am.map = tex;
      am.needsUpdate = true;
    }, undefined, () => { am.needsUpdate = true; });
  }
  roomGroup.add(g);
}

function getLoadableTextureUrl(url) {
  try {
    const parsed = new URL(url, window.location.href);
    const sameOrigin = parsed.origin === window.location.origin;
    const safeProtocol = parsed.protocol === "data:" || parsed.protocol === "blob:";
    // Wikimedia serves CORS-enabled images from both upload.wikimedia.org and
    // commons.wikimedia.org (Special:FilePath redirects to upload.wikimedia.org).
    const wikimediaCorsReady =
      parsed.hostname === "upload.wikimedia.org" ||
      parsed.hostname === "commons.wikimedia.org";
    return sameOrigin || safeProtocol || wikimediaCorsReady ? parsed.href : null;
  } catch {
    return null;
  }
}

function createPlaque(artist) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#f4eddf";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#3a2d20";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, c.width - 16, c.height - 16);
  ctx.fillStyle = "#211c18";
  ctx.font = "700 34px Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(artist.name, c.width / 2, 60);
  ctx.fillStyle = "#766b5f";
  ctx.font = "600 22px Inter, sans-serif";
  ctx.fillText(artist.years, c.width / 2, 104);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.52), new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7 }));
}

function placePaintings(artists) {
  const d = artists.slice(0, 8);
  const p = [
    { position: [-3.6, 1.75, -5.92], rotationY: 0 }, { position: [0, 1.75, -5.92], rotationY: 0 },
    { position: [3.6, 1.75, -5.92], rotationY: 0 }, { position: [-5.92, 1.75, -2.5], rotationY: Math.PI / 2 },
    { position: [-5.92, 1.75, 1.5], rotationY: Math.PI / 2 }, { position: [5.92, 1.75, -2.5], rotationY: -Math.PI / 2 },
    { position: [5.92, 1.75, 1.5], rotationY: -Math.PI / 2 }, { position: [0, 1.75, 5.92], rotationY: Math.PI },
  ];
  const clrs = ["#b98b5d", "#9f6f60", "#c2a15b", "#9aa56b", "#7d8b9b", "#b57a6a", "#8b9a6b", "#a08b7b"];
  d.forEach((a, i) => { if (p[i]) addPainting(a, p[i], clrs[i % clrs.length]); });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MUSEUM CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
function isClickModeActive() { return [...clickModeKeys].some(c => keys.has(c)); }
function releasePointerLock() { if (document.pointerLockElement === canvas) document.exitPointerLock?.(); }
function updateCameraRotation() {
  pitch = Math.max(-1.25, Math.min(1.25, pitch));
  camera.rotation.order = "YXZ"; camera.rotation.y = yaw; camera.rotation.x = pitch;
}
function moveCamera(delta) {
  const s = 3.2 * delta;
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const rgt = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
  const mv = new THREE.Vector3();
  if (keys.has("KeyW")) mv.add(fwd); if (keys.has("KeyS")) mv.sub(fwd);
  if (keys.has("KeyD")) mv.add(rgt); if (keys.has("KeyA")) mv.sub(rgt);
  if (mv.lengthSq() > 0) { mv.normalize().multiplyScalar(s); camera.position.add(mv); camera.position.x = THREE.MathUtils.clamp(camera.position.x, -roomBounds.x, roomBounds.x); camera.position.z = THREE.MathUtils.clamp(camera.position.z, -roomBounds.z, roomBounds.z); }
}
function resizeRenderer() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (canvas.width !== w || canvas.height !== h) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
}
function onCanvasClick(e) {
  const r = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects([...paintings, ...portals], false)[0];
  if (hit?.object.userData.artist) showArtistInPanel(hit.object.userData.artist);
  else if (hit?.object.userData.portalAction) hit.object.userData.portalAction();
  else if (!document.pointerLockElement && !isClickModeActive()) canvas.requestPointerLock?.();
}

let museumListenersBound = false;

function onMuseumPointerDown(e) {
  if (isClickModeActive()) { releasePointerLock(); return; }
  isDragging = true;
  lastPointer = { x: e.clientX, y: e.clientY };
}

function onPointerUp() { isDragging = false; }
function onPointerMove(e) {
  if (!isInMuseum) return;
  const locked = document.pointerLockElement === canvas;
  if (!isDragging && !locked) return;
  const mx = locked ? e.movementX : e.clientX - lastPointer.x;
  const my = locked ? e.movementY : e.clientY - lastPointer.y;
  yaw -= mx * 0.0026; pitch -= my * 0.0026;
  lastPointer = { x: e.clientX, y: e.clientY }; updateCameraRotation();
}

function bindMuseumControls() {
  if (museumListenersBound) return;
  museumListenersBound = true;
  if (canvas) {
    canvas.addEventListener("click", onCanvasClick);
    canvas.addEventListener("pointerdown", onMuseumPointerDown);
  }
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointermove", onPointerMove);
}

function unbindMuseumControls() {
  museumListenersBound = false;
  if (!canvas) return;
  canvas.removeEventListener("click", onCanvasClick);
  canvas.removeEventListener("pointerdown", onMuseumPointerDown);
  window.removeEventListener("pointerup", onPointerUp);
  window.removeEventListener("pointermove", onPointerMove);
}

let animFrameId = null;
function animateMuseum() {
  if (animFrameId) cancelAnimationFrame(animFrameId);
  let prev = performance.now();
  function frame(now) {
    if (!isInMuseum) return;
    const d = Math.min((now - prev) / 1000, 0.05); prev = now;
    resizeRenderer(); moveCamera(d); applyTouchMove(d); renderer.render(scene, camera);
    animFrameId = requestAnimationFrame(frame);
  }
  animFrameId = requestAnimationFrame(frame);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MOBILE TOUCH CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
const touchControls = document.querySelector("#touch-controls");
const touchJoystick = document.querySelector("#touch-joystick");
const touchJoystickKnob = document.querySelector("#touch-joystick-knob");
const touchLook = document.querySelector("#touch-look");

let touchMove = { x: 0, y: 0 };
let joystickActive = false;
let joystickCenter = { x: 0, y: 0 };
let joystickPointerId = null;
let lookActive = false;
let lookLast = { x: 0, y: 0 };
let lookPointerId = null;

function isTouchDevice() {
  return window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
}

function showTouchControls() {
  if (isTouchDevice()) touchControls.hidden = false;
}

function hideTouchControls() {
  touchControls.hidden = true;
}

function bindTouchControls() {
  if (!isTouchDevice()) return;

  // Joystick (movement)
  touchJoystick.addEventListener("pointerdown", e => {
    joystickActive = true;
    joystickPointerId = e.pointerId;
    const r = touchJoystick.getBoundingClientRect();
    joystickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    touchJoystick.setPointerCapture(e.pointerId);
    updateJoystick(e.clientX, e.clientY);
  });
  touchJoystick.addEventListener("pointermove", e => {
    if (!joystickActive || e.pointerId !== joystickPointerId) return;
    updateJoystick(e.clientX, e.clientY);
  });
  const endJoystick = e => {
    if (e.pointerId !== joystickPointerId) return;
    joystickActive = false;
    joystickPointerId = null;
    touchMove = { x: 0, y: 0 };
    touchJoystickKnob.style.transform = "translate(-50%, -50%)";
  };
  touchJoystick.addEventListener("pointerup", endJoystick);
  touchJoystick.addEventListener("pointercancel", endJoystick);

  // Look area (right side)
  touchLook.addEventListener("pointerdown", e => {
    lookActive = true;
    lookPointerId = e.pointerId;
    lookLast = { x: e.clientX, y: e.clientY };
    touchLook.setPointerCapture(e.pointerId);
  });
  touchLook.addEventListener("pointermove", e => {
    if (!lookActive || e.pointerId !== lookPointerId) return;
    const dx = e.clientX - lookLast.x;
    const dy = e.clientY - lookLast.y;
    lookLast = { x: e.clientX, y: e.clientY };
    yaw -= dx * 0.004;
    pitch -= dy * 0.004;
    updateCameraRotation();
  });
  const endLook = e => {
    if (e.pointerId !== lookPointerId) return;
    lookActive = false;
    lookPointerId = null;
  };
  touchLook.addEventListener("pointerup", endLook);
  touchLook.addEventListener("pointercancel", endLook);
}

function updateJoystick(cx, cy) {
  const dx = cx - joystickCenter.x;
  const dy = cy - joystickCenter.y;
  const maxR = 40;
  const len = Math.hypot(dx, dy);
  const clamped = len > maxR ? maxR / len : 1;
  const nx = dx * clamped;
  const ny = dy * clamped;
  touchJoystickKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  // Normalize to -1..1; forward (up) = negative y
  touchMove = { x: nx / maxR, y: ny / maxR };
}

function applyTouchMove(delta) {
  if (!touchMove.x && !touchMove.y) return;
  const s = 3.2 * delta;
  const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const rgt = new THREE.Vector3().crossVectors(fwd, camera.up).normalize();
  const mv = new THREE.Vector3();
  mv.addScaledVector(fwd, -touchMove.y);
  mv.addScaledVector(rgt, touchMove.x);
  if (mv.lengthSq() > 0) {
    mv.normalize().multiplyScalar(s);
    camera.position.add(mv);
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -roomBounds.x, roomBounds.x);
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -roomBounds.z, roomBounds.z);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GLOBAL CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
function bindGlobalControls() {
  window.addEventListener("keydown", e => {
    keys.add(e.code);
    if (clickModeKeys.has(e.code)) { e.preventDefault(); releasePointerLock(); }
  });
  window.addEventListener("keyup", e => keys.delete(e.code));
  window.addEventListener("resize", () => {
    if (isInMuseum && renderer) resizeRenderer();
    else resizeStarfield();
  });
  closePanel.addEventListener("click", () => { panel.hidden = true; });
  backToTimelineBtn.addEventListener("click", () => exitMuseum());
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  try {
    allArtists = await loadArtists();
    const subtitle = document.querySelector("#timeline-subtitle");
    if (subtitle) {
      subtitle.textContent = `Explore ${allArtists.length} masterpieces across ${epochDefs.length} epochs of art history`;
    }
    initStarfield();
    buildTimeline();
    bindTimelineControls();
    animateTimeline();
    initSearch();
    initFilters();
    initSurprise();
    initEpochDetail();
    bindGlobalControls();
    bindTouchControls();
    initCarousel();
    initTTS();
    initLanguage();
    initFavorites();
    initShare();
    applyLanguage();
    handleDeepLink();
    museumView.hidden = true;
    timelineOverlay.hidden = false;
  } catch (err) {
    console.error(err);
    document.querySelector(".timeline-header p").textContent = "The museum could not start. Run it from a local HTTP server so the JSON data can load.";
  }
}
init();
