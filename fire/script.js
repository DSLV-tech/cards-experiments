/*
  ============================================================
  CSS CARD EXPERIMENTS — #03 INFERNO — script.js
  ============================================================
  Struttura:
    1. Utility         — rand(), lerp()
    2. DOM refs        — canvas, context, elementi UI
    3. FIRE_CONFIG     — parametri sistema particelle
    4. Canvas resize   — resizeFireCanvas(): sincronizza
                         le dimensioni canvas col wrapper
    5. Border points   — getFireBorderPoint(): punto casuale
                         sul perimetro del canvas (offset 30px)
    6. Spawn particle  — spawnFireParticle(): aggiunge una
                         particella all'array con fisica iniziale
    7. Render loop     — updateFire() via rAF:
                           - clearRect
                           - spawn N particelle per frame
                           - aggiorna fisica (vx, vy, life)
                           - disegna cerchio + glow
                           - rimuove morte (splice back-to-front)
    8. Embers DOM      — spawnEmber(), startEmbers():
                         div .ember con CSS keyframe emberRise
    9. Eruption mode   — activateIgnite(): moltiplica particelle
                         e braci per 3s
   10. Stats animate   — updateFireStats() via rAF (lerp)
   11. Tilt 3D mouse   — mousemove + mouseleave
   12. Particelle bg   — createParticles()
   13. Init            — DOMContentLoaded + resize listener

  Fix puntino angolo:
    Le braci vengono rimosse dal DOM dopo 3s via setTimeout.
    Il wrapper ha clip-path in CSS per tagliare eventuali
    residui visivi oltre i bordi.
  ============================================================
*/

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}


// ================================================
// ===== DOM — elementi cachati all'avvio =========
// ================================================
const fireCardWrapper = document.getElementById('fireCardWrapper');
const fireCanvas      = document.getElementById('fireCanvas');
const emberParticles  = document.getElementById('emberParticles');
const igniteBtn       = document.getElementById('igniteBtn');
const fireTempEl      = document.getElementById('fireTemp');
const fireFuelEl      = document.getElementById('fireFuel');
const fireCtx         = fireCanvas.getContext('2d');

// ================================================
// ===== CARD 3: FIRE — Elementi DOM  =============
// ================================================
const fireCardWrapper = document.getElementById('fireCardWrapper');
const fireCanvas = document.getElementById('fireCanvas');
const emberParticles = document.getElementById('emberParticles');
const igniteBtn = document.getElementById('igniteBtn');
const fireTempEl = document.getElementById('fireTemp');
const fireFuelEl = document.getElementById('fireFuel');
const fireCtx = fireCanvas.getContext('2d');


// ================================================
// ===== CARD 3: FIRE — Sistema particelle  =======
// ================================================

/*
  Le particelle di fuoco vengono generate lungo il bordo
  della card e salgono verso l'alto con una simulazione
  semplice di fisica (velocità, gravità, decadimento).
  Ogni particella ha colore, dimensione e durata variabili.
*/

// Array che contiene tutte le particelle attive
let fireParticles = [];
let isErupting = false;

// Configurazione fuoco
const FIRE_CONFIG = {
  particlesPerFrame: 3,        // particelle normali per frame
  eruptionMultiplier: 5,       // moltiplicatore durante eruption
  particleLife: 40,            // frame di vita media
  baseSpeed: 2,                // velocità base
  colors: [
    { r: 255, g: 240, b: 80 },   // giallo brillante (centro)
    { r: 255, g: 180, b: 0 },    // arancione chiaro
    { r: 255, g: 120, b: 0 },    // arancione
    { r: 255, g: 60, b: 0 },     // arancione scuro
    { r: 220, g: 30, b: 0 },     // rosso
    { r: 160, g: 15, b: 0 },     // rosso scuro (esterno)
  ],
  baseTemp: 1200,
  baseFuel: 78,
};

// Ridimensiona il canvas per corrispondere al suo contenitore
function resizeFireCanvas() {
  const rect = fireCardWrapper.getBoundingClientRect();
  fireCanvas.width = rect.width + 60;
  fireCanvas.height = rect.height + 60;
}

/*
  Genera un punto casuale lungo il bordo della card.
  Le coordinate sono relative al canvas (che è 30px più
  grande su ogni lato rispetto alla card).
*/
function getFireBorderPoint() {
  const margin = 30;  // offset del canvas
  const w = fireCanvas.width - margin * 2;
  const h = fireCanvas.height - margin * 2;
  const perimeter = 2 * (w + h);
  const pos = Math.random() * perimeter;

  let x, y;

  if (pos < w) {
    x = margin + pos;
    y = margin;
  } else if (pos < w + h) {
    x = margin + w;
    y = margin + (pos - w);
  } else if (pos < 2 * w + h) {
    x = margin + w - (pos - w - h);
    y = margin + h;
  } else {
    x = margin;
    y = margin + h - (pos - 2 * w - h);
  }

  return { x, y };
}

// Crea una singola particella di fuoco
function spawnFireParticle(intense = false) {
  const pos = getFireBorderPoint();
  const speed = FIRE_CONFIG.baseSpeed * (intense ? rand(1.5, 3) : rand(0.8, 1.8));
  const size = intense ? rand(4, 8) : rand(2, 5);

  fireParticles.push({
    x: pos.x + rand(-3, 3),
    y: pos.y + rand(-3, 3),
    // Velocità: le fiamme salgono (vy negativo) con leggero drift laterale
    vx: rand(-1, 1) * (intense ? 1.5 : 1),
    vy: -speed,
    size: size,
    life: FIRE_CONFIG.particleLife + rand(-10, 10),
    maxLife: FIRE_CONFIG.particleLife + rand(-10, 10),
    // Indice colore casuale (sarà interpolato durante la vita)
    colorIndex: 0,
  });
}

/*
  Loop di rendering delle fiamme.
  Ad ogni frame:
  1. Genera nuove particelle sul bordo
  2. Aggiorna posizione e vita di ogni particella
  3. Disegna ogni particella con colore basato sulla vita residua
  4. Rimuovi le particelle morte
*/
function updateFire() {
  // Pulisci il canvas
  fireCtx.clearRect(0, 0, fireCanvas.width, fireCanvas.height);

  // Genera nuove particelle
  const count = isErupting
    ? FIRE_CONFIG.particlesPerFrame * FIRE_CONFIG.eruptionMultiplier
    : FIRE_CONFIG.particlesPerFrame;

  for (let i = 0; i < count; i++) {
    spawnFireParticle(isErupting);
  }

  // Aggiorna e disegna ogni particella
  for (let i = fireParticles.length - 1; i >= 0; i--) {
    const p = fireParticles[i];

    // Aggiorna fisica
    p.x += p.vx;
    p.y += p.vy;
    p.vy *= 0.98;           // decadimento velocità verticale
    p.vx += rand(-0.2, 0.2); // turbulenza laterale
    p.life--;

    // Calcola progresso di vita (0 = appena nata, 1 = morta)
    const progress = 1 - (p.life / p.maxLife);

    // Scegli colore in base al progresso (giallo → arancione → rosso)
    const colorIdx = Math.min(
      Math.floor(progress * FIRE_CONFIG.colors.length),
      FIRE_CONFIG.colors.length - 1
    );
    const color = FIRE_CONFIG.colors[colorIdx];

    // Dimensione che si riduce verso la fine
    const currentSize = p.size * (1 - progress * 0.7);

    // Opacità: piena all'inizio, svanisce alla fine
    const alpha = progress < 0.3
      ? 0.9
      : 0.9 * (1 - (progress - 0.3) / 0.7);

    // Disegna la particella con glow
    fireCtx.beginPath();
    fireCtx.arc(p.x, p.y, currentSize, 0, Math.PI * 2);
    fireCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    fireCtx.fill();

    // Alone luminoso (glow)
    fireCtx.beginPath();
    fireCtx.arc(p.x, p.y, currentSize * 2.5, 0, Math.PI * 2);
    fireCtx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.15})`;
    fireCtx.fill();

    // Rimuovi particelle morte
    if (p.life <= 0) {
      fireParticles.splice(i, 1);
    }
  }

  requestAnimationFrame(updateFire);
}


// ================================================
// ===== CARD 3: FIRE — Braci volanti  ============
// ================================================

/*
  Le braci (embers) sono elementi DOM che salgono
  dal bordo della card. Sono più evidenti delle
  particelle canvas e danno profondità.
*/
let emberTimer = null;

function spawnEmber() {
  const ember = document.createElement('div');
  ember.classList.add('ember');

  // Posizione casuale lungo il bordo inferiore o laterale
  const side = Math.random();
  if (side < 0.5) {
    // Bordo inferiore
    ember.style.left = `${rand(10, 90)}%`;
    ember.style.bottom = '0';
  } else if (side < 0.75) {
    // Bordo sinistro
    ember.style.left = '0';
    ember.style.top = `${rand(30, 90)}%`;
  } else {
    // Bordo destro
    ember.style.right = '0';
    ember.style.top = `${rand(30, 90)}%`;
  }

  // Drift laterale casuale (variabile CSS)
  ember.style.setProperty('--ember-drift', `${rand(-30, 30)}px`);
  ember.style.animationDuration = `${rand(1.5, 3)}s`;

  // Dimensione e colore variabili
  const size = rand(2, 4);
  ember.style.width = `${size}px`;
  ember.style.height = `${size}px`;

  const emberColors = ['#ff8800', '#ffaa00', '#ff5500', '#ffcc00'];
  ember.style.background = emberColors[Math.floor(Math.random() * emberColors.length)];
  ember.style.boxShadow = `0 0 ${size * 2}px ${ember.style.background}`;

  emberParticles.appendChild(ember);

  // Rimuovi dopo l'animazione
  setTimeout(() => ember.remove(), 3000);
}

function startEmbers() {
  if (emberTimer) return;
  emberTimer = setInterval(() => {
    spawnEmber();
    if (Math.random() > 0.5) spawnEmber();
  }, 200);
}


// ================================================
// ===== CARD 3: FIRE — Interattività  ============
// ================================================

// Tilt 3D al passaggio del mouse
fireCardWrapper.addEventListener('mousemove', (e) => {
  const rect = fireCardWrapper.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;

  fireCardWrapper.style.transform = `
    scale(1.02)
    perspective(800px)
    rotateX(${-y * 6}deg)
    rotateY(${x * 6}deg)
  `;
});

fireCardWrapper.addEventListener('mouseleave', () => {
  fireCardWrapper.style.transform = '';
});


// ================================================
// ===== CARD 3: FIRE — Modalità Eruption  ========
// ================================================

/*
  Cliccando IGNITE, le fiamme si intensificano,
  vengono generate più braci, e i valori di
  temperatura/combustibile salgono alle stelle.
*/

// Animazione temperature fuoco
let fireTempTarget = FIRE_CONFIG.baseTemp;
let fireFuelTarget = FIRE_CONFIG.baseFuel;
let fireTempCurrent = 0;
let fireFuelCurrent = 0;

function updateFireStats() {
  fireTempCurrent = lerp(fireTempCurrent, fireTempTarget, 0.06);
  fireFuelCurrent = lerp(fireFuelCurrent, fireFuelTarget, 0.06);

  const flicker = isErupting ? rand(-20, 20) : 0;

  fireTempEl.textContent = Math.round(fireTempCurrent + flicker);
  fireFuelEl.textContent = Math.round(fireFuelCurrent + (isErupting ? rand(-3, 3) : 0));

  requestAnimationFrame(updateFireStats);
}

function activateIgnite() {
  if (isErupting) return;
  isErupting = true;

  fireCardWrapper.classList.add('erupting');
  igniteBtn.disabled = true;
  igniteBtn.textContent = '🔥 ERUPTING 🔥';

  // Temperatura e combustibile al massimo
  fireTempTarget = rand(3000, 5000);
  fireFuelTarget = 100;

  // Più braci durante eruption
  const eruptionEmberTimer = setInterval(() => {
    for (let i = 0; i < 4; i++) spawnEmber();
  }, 80);

  // Flash arancione sullo sfondo
  const flashInterval = setInterval(() => {
    document.body.style.backgroundColor = `rgba(255, 80, 0, ${rand(0.02, 0.06)})`;
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 50);
  }, 150);

  setTimeout(() => {
    clearInterval(eruptionEmberTimer);
    clearInterval(flashInterval);
    document.body.style.backgroundColor = '';
    fireCardWrapper.classList.remove('erupting');
    igniteBtn.disabled = false;
    igniteBtn.textContent = 'IGNITE';
    isErupting = false;
    fireTempTarget = FIRE_CONFIG.baseTemp;
    fireFuelTarget = FIRE_CONFIG.baseFuel;
  }, 3000);
}

igniteBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  activateIgnite();
});


// ================================================
// ===== INIT =====================================
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('particles');
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.classList.add('particle');
    p.style.left             = `${rand(0, 100)}%`;
    p.style.top              = `${rand(0, 100)}%`;
    p.style.animationDelay   = `${rand(0, 6)}s`;
    p.style.animationDuration = `${rand(4, 8)}s`;
    const s = `${rand(1, 3)}px`;
    p.style.width = s; p.style.height = s;
    if (Math.random() > 0.7) p.style.background = '#a855f7';
    container.appendChild(p);
  }
  resizeFireCanvas();
  updateFire();
  startEmbers();
  updateFireStats();
});

window.addEventListener('resize', resizeFireCanvas);
