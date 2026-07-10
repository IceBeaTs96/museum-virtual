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

  // Close search on Escape
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

    // Update active state
    filterChips.querySelectorAll(".filter-chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");

    // Filter timeline markers
    const markers = document.querySelectorAll(".epoch-marker");
    markers.forEach((m) => {
      if (filter === "all" || m.dataset.epoch === filter) {
        m.style.display = "";
      } else {
        m.style.display = "none";
      }
    });

    // Clear search
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

    // Highlight the right marker
    document.querySelectorAll(".epoch-marker").forEach((m) => m.classList.remove("active"));
    const marker = document.querySelector(`.epoch-marker[data-epoch="${CSS.escape(randomArtist.epoch)}"]`);
    if (marker) marker.classList.add("active");

    // Show epoch detail
    selectEpoch(randomArtist.epoch, randomArtist.epochRange);

    // Auto-enter museum after a short delay
    setTimeout(() => {
      enterMuseum();
    }, 800);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  TIMELINE LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
function initTimeline() {
  const markers = document.querySelectorAll(".epoch-marker");

  markers.forEach((marker) => {
    marker.addEventListener("click", () => {
      markers.forEach((m) => m.classList.remove("active"));
      marker.classList.add("active");

      const epoch = marker.dataset.epoch;
      const range = marker.dataset.range;
      selectEpoch(epoch, range);
    });
  });

  closeEpochDetailBtn.addEventListener("click", () => {
    epochDetail.hidden = true;
    markers.forEach((m) => m.classList.remove("active"));
  });

  enterMuseumBtn.addEventListener("click", () => {
    enterMuseum();
  });

  backToTimelineBtn.addEventListener("click", () => {
    exitMuseum();
  });
}

function selectEpoch(epochName, epochRange) {
  currentEpoch = epochName;
  currentEpochArtists = allArtists.filter((a) => a.epoch === epochName);

  epochDetailName.textContent = getDisplayName(epochName);
  epochDetailRange.textContent = epochRange;

  // Build artist grid
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
  // Show up to 8 paintings in the room
  const displayArtists = artists.slice(0, 8);
  const placements = [
    // Back wall (3 paintings)
    { position: [-3.6, 1.75, -5.92], rotationY: 0 },
    { position: [0, 1.75, -5.92], rotationY: 0 },
    { position: [3.6, 1.75, -5.92], rotationY: 0 },
    // Left wall (2 paintings)
    { position: [-5.92, 1.75, -2.5], rotationY: Math.PI / 2 },
    { position: [-5.92, 1.75, 1.5], rotationY: Math.PI / 2 },
    // Right wall (2 paintings)
    { position: [5.92, 1.75, -2.5], rotationY: -Math.PI / 2 },
    { position: [5.92, 1.75, 1.5], rotationY: -Math.PI / 2 },
    // Front wall (1 painting, near door)
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
    }
  });

  closePanel.addEventListener("click", () => {
    panel.hidden = true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════════════════════
async function init() {
  try {
    allArtists = await loadArtists();
    initTimeline();
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
