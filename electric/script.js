/*
  ============================================================
  CSS CARD EXPERIMENTS — #01 ELECTRIC — script.js
  ============================================================
  Struttura:
    1. CONFIG          — parametri fulmini, surge, particelle
    2. DOM refs        — elementi cachati all'avvio
    3. Utility         — rand(), lerp()
    4. Lightning       — generateLightningPath(), getRandomBorderPoint(),
                         getNearbyBorderPoint(), createBolt()
    5. Loop fulmini    — startLightning(), stopLightning()
    6. Surge mode      — activateSurge() — intensifica tutto per 2.5s
    7. Stats animate   — animateStats(), updateStats() via rAF
    8. Particelle bg   — createParticles() — 40 dot CSS animati
    9. Interattività   — mousemove tilt 3D, mouseleave reset
   10. Init            — DOMContentLoaded

  Tecnica chiave:
    I fulmini sono <path> SVG con attributo "d" generato casualmente
    come polilinea spezzata tra due punti del perimetro della card.
    Ogni bolt viene aggiunto al DOM, vive CONFIG.boltLifetime ms,
    poi rimosso. Nessun pooling — la card è isolata e il rate è basso.
  ============================================================
*/

// ================================================
// ===== CONFIGURAZIONE GENERALE =================
// ================================================
const CONFIG = {
  // Fulmini
  boltInterval: 80,          // ms tra un fulmine e l'altro
  boltSegments: 8,            // segmenti per fulmine
  boltJitter: 18,             // deviazione casuale dei fulmini
  boltLifetime: 150,          // durata visibilità fulmine (ms)

  // Surge mode
  surgeDuration: 2500,        // durata dell'effetto surge (ms)
  surgeInterval: 20,          // intervallo fulmini durante surge

  // Particelle
  particleCount: 40,

  // Stats
  baseVoltage: 47,
  baseFrequency: 60,
  basePower: 12
};


// ================================================
// ===== DOM — elementi cachati all'avvio =========
// ================================================
const lightningGroup      = document.getElementById('lightningGroup');
const lightningGroupIntense = document.getElementById('lightningGroupIntense');
const cardWrapper         = document.getElementById('cardWrapper');
const surgeBtn            = document.getElementById('surgeBtn');
const particlesContainer  = document.getElementById('particles');
const voltageEl           = document.getElementById('voltage');
const frequencyEl         = document.getElementById('frequency');
const powerEl             = document.getElementById('power');

// ================================================
// ===== UTILITY ==================================
// ================================================
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}


// ================================================

// Genera un path SVG che simula un fulmine tra due punti
function generateLightningPath(x1, y1, x2, y2, segments, jitter) {
  let points = [{ x: x1, y: y1 }];

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const baseX = lerp(x1, x2, t);
    const baseY = lerp(y1, y2, t);
    points.push({
      x: baseX + rand(-jitter, jitter),
      y: baseY + rand(-jitter, jitter)
    });
  }

  points.push({ x: x2, y: y2 });

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

// ===== POSIZIONI SUL BORDO DELLA CARD =====
// Le coordinate sono nel sistema SVG (viewBox 400x500)
// La card ha un offset di 12px nel SVG (il viewBox è più grande della card)
function getRandomBorderPoint() {
  const margin = 12;
  const w = 400 - margin * 2;
  const h = 500 - margin * 2;
  const perimeter = 2 * (w + h);
  const pos = Math.random() * perimeter;

  let x, y;

  if (pos < w) {
    // Lato superiore
    x = margin + pos;
    y = margin;
  } else if (pos < w + h) {
    // Lato destro
    x = margin + w;
    y = margin + (pos - w);
  } else if (pos < 2 * w + h) {
    // Lato inferiore
    x = margin + w - (pos - w - h);
    y = margin + h;
  } else {
    // Lato sinistro
    x = margin;
    y = margin + h - (pos - 2 * w - h);
  }

  return { x, y };
}

// Ottieni un punto vicino a un altro punto sul bordo
function getNearbyBorderPoint(origin, maxDist) {
  const margin = 12;
  const w = 400 - margin * 2;
  const h = 500 - margin * 2;

  // Muovi lungo il bordo di una distanza casuale
  const dist = rand(30, maxDist);
  const direction = Math.random() > 0.5 ? 1 : -1;

  let x = origin.x;
  let y = origin.y;
  let remaining = dist * direction;

  // Determina su quale lato si trova il punto
  if (Math.abs(y - margin) < 2) {
    // Lato superiore
    x += remaining;
    x = Math.max(margin, Math.min(margin + w, x));
    y = margin + rand(-3, 3);
  } else if (Math.abs(x - (margin + w)) < 2) {
    // Lato destro
    y += remaining;
    y = Math.max(margin, Math.min(margin + h, y));
    x = margin + w + rand(-3, 3);
  } else if (Math.abs(y - (margin + h)) < 2) {
    // Lato inferiore
    x -= remaining;
    x = Math.max(margin, Math.min(margin + w, x));
    y = margin + h + rand(-3, 3);
  } else {
    // Lato sinistro
    y -= remaining;
    y = Math.max(margin, Math.min(margin + h, y));
    x = margin + rand(-3, 3);
  }

  return { x, y };
}

// ===== CREAZIONE FULMINE =====
function createBolt(intense = false) {
  const start = getRandomBorderPoint();
  const end = getNearbyBorderPoint(start, 120);

  const pathD = generateLightningPath(
    start.x, start.y,
    end.x, end.y,
    CONFIG.boltSegments + (intense ? 4 : 0),
    CONFIG.boltJitter + (intense ? 8 : 0)
  );

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', pathD);
  path.classList.add('lightning-bolt');

  if (intense) {
    path.classList.add('intense');
    path.style.stroke = Math.random() > 0.5 ? '#ffffff' : '#a855f7';
    lightningGroupIntense.appendChild(path);
  } else {
    // Variazione di colore
    const colors = ['#00f0ff', '#00d4ff', '#00bbff', '#44ffff'];
    path.style.stroke = colors[Math.floor(Math.random() * colors.length)];
    lightningGroup.appendChild(path);
  }

  // Ramificazione casuale
  if (Math.random() > 0.6) {
    const branchStart = {
      x: lerp(start.x, end.x, rand(0.3, 0.7)),
      y: lerp(start.y, end.y, rand(0.3, 0.7))
    };
    const branchEnd = getNearbyBorderPoint(branchStart, 40);
    const branchPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    branchPath.setAttribute('d', generateLightningPath(
      branchStart.x, branchStart.y,
      branchEnd.x, branchEnd.y,
      4, CONFIG.boltJitter * 0.6
    ));
    branchPath.classList.add('lightning-bolt');
    branchPath.style.stroke = '#00f0ff';
    branchPath.style.strokeWidth = '1';
    branchPath.style.opacity = '0.6';
    lightningGroup.appendChild(branchPath);

    setTimeout(() => branchPath.remove(), CONFIG.boltLifetime);
  }

  // Rimuovi il fulmine dopo la sua durata
  setTimeout(() => path.remove(), CONFIG.boltLifetime);
}

// ===== LOOP FULMINI =====
let boltTimer = null;

function startLightning() {
  if (boltTimer) return;
  boltTimer = setInterval(() => {
    createBolt();
    // Secondo fulmine random
    if (Math.random() > 0.5) {
      setTimeout(() => createBolt(), rand(10, 40));
    }
  }, CONFIG.boltInterval);
}

function stopLightning() {
  if (boltTimer) {
    clearInterval(boltTimer);
    boltTimer = null;
  }
}

// ===== SURGE MODE =====
let isSurging = false;

function activateSurge() {
  if (isSurging) return;
  isSurging = true;

  cardWrapper.classList.add('surge');
  surgeBtn.disabled = true;
  surgeBtn.querySelector('.btn-text').textContent = '⚡ SURGING ⚡';

  // Fulmini intensi durante il surge
  const surgeTimer = setInterval(() => {
    createBolt(true);
    createBolt(true);
    createBolt();
  }, CONFIG.surgeInterval);

  // Anima i valori delle stats
  animateStats(true);

  // Flash sullo sfondo
  document.body.style.transition = 'background-color 0.1s';
  const flashInterval = setInterval(() => {
    document.body.style.backgroundColor = `rgba(0, 240, 255, ${rand(0.02, 0.08)})`;
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 50);
  }, 200);

  setTimeout(() => {
    clearInterval(surgeTimer);
    clearInterval(flashInterval);
    document.body.style.backgroundColor = '';
    cardWrapper.classList.remove('surge');
    surgeBtn.disabled = false;
    surgeBtn.querySelector('.btn-text').textContent = 'ACTIVATE SURGE';
    isSurging = false;
    animateStats(false);
  }, CONFIG.surgeDuration);
}

// ===== ANIMAZIONE STATS =====
let statsAnimFrame = null;
let statsTarget = { voltage: CONFIG.baseVoltage, frequency: CONFIG.baseFrequency, power: CONFIG.basePower };
let statsCurrent = { voltage: 0, frequency: 0, power: 0 };

function animateStats(surge = false) {
  if (surge) {
    statsTarget = {
      voltage: rand(200, 500),
      frequency: rand(200, 999),
      power: rand(80, 250)
    };
  } else {
    statsTarget = {
      voltage: CONFIG.baseVoltage,
      frequency: CONFIG.baseFrequency,
      power: CONFIG.basePower
    };
  }
}

function updateStats() {
  statsCurrent.voltage = lerp(statsCurrent.voltage, statsTarget.voltage, 0.08);
  statsCurrent.frequency = lerp(statsCurrent.frequency, statsTarget.frequency, 0.08);
  statsCurrent.power = lerp(statsCurrent.power, statsTarget.power, 0.08);

  // Aggiungi flicker durante il surge
  const flicker = isSurging ? rand(-5, 5) : 0;

  voltageEl.textContent = Math.round(statsCurrent.voltage + flicker);
  frequencyEl.textContent = Math.round(statsCurrent.frequency + flicker);
  powerEl.textContent = Math.round(statsCurrent.power + flicker);

  requestAnimationFrame(updateStats);
}

// ===== PARTICELLE DI SFONDO =====
function createParticles() {
  for (let i = 0; i < CONFIG.particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = `${rand(0, 100)}%`;
    particle.style.top = `${rand(0, 100)}%`;
    particle.style.animationDelay = `${rand(0, 6)}s`;
    particle.style.animationDuration = `${rand(4, 8)}s`;
    particle.style.width = `${rand(1, 3)}px`;
    particle.style.height = particle.style.width;

    // Colori variati
    if (Math.random() > 0.7) {
      particle.style.background = '#a855f7';
    }

    particlesContainer.appendChild(particle);
  }
}

// ================================================
// ===== CARD 1: ELECTRIC — Interattività mouse ===
// ================================================

// Effetto tilt 3D sulla card elettrica al passaggio del mouse
cardWrapper.addEventListener('mousemove', (e) => {
  const rect = cardWrapper.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;

  cardWrapper.style.transform = `
    scale(1.02)
    perspective(800px)
    rotateX(${-y * 6}deg)
    rotateY(${x * 6}deg)
  `;
});

cardWrapper.addEventListener('mouseleave', () => {
  cardWrapper.style.transform = '';
});

// Bottone Surge
surgeBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  activateSurge();
});


// ================================================
// ===== PARTICELLE DI SFONDO =====================
// ================================================
function createParticles() {
  for (let i = 0; i < CONFIG.particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left            = `${rand(0, 100)}%`;
    particle.style.top             = `${rand(0, 100)}%`;
    particle.style.animationDelay  = `${rand(0, 6)}s`;
    particle.style.animationDuration = `${rand(4, 8)}s`;
    particle.style.width           = `${rand(1, 3)}px`;
    particle.style.height          = particle.style.width;
    if (Math.random() > 0.7) particle.style.background = '#a855f7';
    particlesContainer.appendChild(particle);
  }
}

// ================================================
// ===== INIT =====================================
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  createParticles();
  startLightning();
  updateStats();
  statsTarget = {
    voltage:   CONFIG.baseVoltage,
    frequency: CONFIG.baseFrequency,
    power:     CONFIG.basePower
  };
});
