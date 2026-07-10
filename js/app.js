import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const canvas = document.querySelector("#museum-canvas");
const panel = document.querySelector("#info-panel");
const closePanel = document.querySelector("#close-panel");
const artistName = document.querySelector("#artist-name");
const artistYears = document.querySelector("#artist-years");
const artistBio = document.querySelector("#artist-bio");
const artistImage = document.querySelector("#artist-image");
const artistUrl = document.querySelector("#artist-url");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x15110d);
scene.fog = new THREE.Fog(0x15110d, 12, 32);

const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100);
camera.position.set(0, 1.65, 4.5);

const paintings = [];
const keys = new Set();
const clickModeKeys = new Set(["ShiftLeft", "ShiftRight", "Space"]);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let yaw = Math.PI;
let pitch = 0;
let isDragging = false;
let lastPointer = { x: 0, y: 0 };

function isClickModeActive() {
  return [...clickModeKeys].some((code) => keys.has(code));
}

function releasePointerLockForClickMode() {
  if (document.pointerLockElement === canvas) {
    document.exitPointerLock?.();
  }
}

function createRoom() {
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f0e7, roughness: 0.82 });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x8a6b4b, roughness: 0.72 });
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
    [0, 3.15, 2.5]
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
    roughness: 0.62
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

async function loadArtists() {
  const response = await fetch("data/artists.json");
  if (!response.ok) {
    throw new Error(`Unable to load artist data: ${response.status}`);
  }
  return response.json();
}

function placePaintings(artists) {
  const placements = [
    { position: [-3.6, 1.75, -5.92], rotationY: 0 },
    { position: [0, 1.75, -5.92], rotationY: 0 },
    { position: [3.6, 1.75, -5.92], rotationY: 0 },
    { position: [-5.92, 1.75, -1.8], rotationY: Math.PI / 2 },
    { position: [5.92, 1.75, -1.8], rotationY: -Math.PI / 2 }
  ];
  const colors = ["#b98b5d", "#9f6f60", "#c2a15b", "#9aa56b", "#7d8b9b"];
  artists.forEach((artist, index) => addPainting(artist, placements[index], colors[index]));
}

function showArtist(artist) {
  artistName.textContent = artist.name;
  artistYears.textContent = artist.years;
  artistBio.textContent = artist.bio;
  artistImage.src = artist.imageUrl;
  artistImage.alt = `Artwork associated with ${artist.name}`;
  artistUrl.href = artist.imageUrl;
  panel.hidden = false;
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

function bindControls() {
  window.addEventListener("keydown", (event) => {
    keys.add(event.code);
    if (clickModeKeys.has(event.code)) {
      event.preventDefault();
      releasePointerLockForClickMode();
    }
  });
  window.addEventListener("keyup", (event) => keys.delete(event.code));

  canvas.addEventListener("pointerdown", (event) => {
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
    const locked = document.pointerLockElement === canvas;
    if (!isDragging && !locked) return;
    const movementX = locked ? event.movementX : event.clientX - lastPointer.x;
    const movementY = locked ? event.movementY : event.clientY - lastPointer.y;
    yaw -= movementX * 0.0026;
    pitch -= movementY * 0.0026;
    lastPointer = { x: event.clientX, y: event.clientY };
    updateCameraRotation();
  });

  canvas.addEventListener("click", onCanvasClick);
  closePanel.addEventListener("click", () => {
    panel.hidden = true;
  });
  window.addEventListener("resize", resizeRenderer);
}

function animate() {
  let previous = performance.now();
  function frame(now) {
    const delta = Math.min((now - previous) / 1000, 0.05);
    previous = now;
    resizeRenderer();
    moveCamera(delta);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

async function init() {
  createRoom();
  addLighting();
  updateCameraRotation();
  bindControls();
  const artists = await loadArtists();
  placePaintings(artists.slice(0, 5));
  animate();
}

init().catch((error) => {
  console.error(error);
  document.querySelector("#hud span").textContent =
    "The museum could not start. Run it from a local HTTP server so the JSON data can load.";
});
