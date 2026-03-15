/*
  ============================================================
  CSS CARD EXPERIMENTS — #05 LIQUID GLASS — script.js
  ============================================================
  Struttura:
    1. Utility         — rand(), lerp()
    2. DOM refs        — wrapper, reflection, morph button,
                         metriche, turbulence element (SVG),
                         displacement map (SVG, cachato 1 volta)
    3. Turbulence anim — animateTurbulence() via rAF:
                         oscilla baseFrequency con sin/cos
                         per l'effetto vetro fuso continuo
    4. Mouse tracking  — mousemove: tilt 3D + aggiorna
                         radial-gradient riflesso luce
    5. Morph mode      — activateMorph():
                           - aggiunge .morphing al wrapper
                           - aumenta displacement scale (18 → 35)
                           - intensifica target stats
                           - flash azzurro background
    6. Stats glass     — updateGlassStats() via rAF (lerp)
    7. Particelle bg
    8. Init            — DOMContentLoaded

  Tecnica chiave — animazione SVG filter:
    turbulenceEl.setAttribute('baseFrequency', ...) viene chiamato
    ogni frame. Cambiare un attributo SVG è più efficiente di
    ricalcolare via CSS perché non triggera layout/paint,
    solo il ricalcolo del filtro applicato ai layer sottostanti.

  Note:
    displacementMapEl è cachato fuori da activateMorph()
    per evitare querySelector ripetuto ad ogni click.
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
const glassCardWrapper   = document.getElementById('glassCardWrapper');
const glassReflection    = document.getElementById('glassReflection');
const morphBtn           = document.getElementById('morphBtn');
const glassRefractionEl  = document.getElementById('glassRefraction');
const glassViscosityEl   = document.getElementById('glassViscosity');
const turbulenceEl       = document.getElementById('turbulence');
// Cachato una volta sola — evita querySelector ripetuto in activateMorph
const displacementMapEl  = document.querySelector('#liquidFilter feDisplacementMap');

// ================================================
// ===== CARD 5: LIQUID GLASS — Elementi DOM  =====
// ================================================
const glassCardWrapper = document.getElementById('glassCardWrapper');
const glassDistortion = document.getElementById('glassDistortion');
const glassReflection = document.getElementById('glassReflection');
const morphBtn = document.getElementById('morphBtn');
const glassRefractionEl = document.getElementById('glassRefraction');
const glassViscosityEl = document.getElementById('glassViscosity');
const turbulenceEl = document.getElementById('turbulence');


// ================================================
// ===== CARD 5: LIQUID GLASS — Animazione SVG  ===
// ================================================

/*
  Animiamo il baseFrequency del filtro feTurbulence
  per creare un effetto di distorsione liquida che
  si muove continuamente, simulando vetro fuso.
*/

let glassTime = 0;
let isMorphing = false;

function animateTurbulence() {
  glassTime += isMorphing ? 0.008 : 0.003;

  // Oscillazione lenta del baseFrequency per effetto liquido
  const freqX = 0.012 + Math.sin(glassTime * 0.7) * 0.005;
  const freqY = 0.012 + Math.cos(glassTime * 0.9) * 0.005;

  if (turbulenceEl) {
    turbulenceEl.setAttribute('baseFrequency', `${freqX.toFixed(4)} ${freqY.toFixed(4)}`);
  }

  requestAnimationFrame(animateTurbulence);
}


// ================================================
// ===== CARD 5: LIQUID GLASS — Interattività  ====
// ================================================

// Tilt 3D + riflesso al passaggio del mouse
glassCardWrapper.addEventListener('mousemove', (e) => {
  const rect = glassCardWrapper.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width);
  const y = ((e.clientY - rect.top) / rect.height);

  // Tilt 3D
  const tiltX = (x - 0.5) * 8;
  const tiltY = (y - 0.5) * -8;
  glassCardWrapper.style.transform = `
    scale(1.02)
    perspective(800px)
    rotateX(${tiltY}deg)
    rotateY(${tiltX}deg)
  `;

  // Riflesso luce
  glassReflection.style.background = `
    radial-gradient(
      250px circle at ${x * 100}% ${y * 100}%,
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0.1) 25%,
      transparent 60%
    )
  `;
});

glassCardWrapper.addEventListener('mouseleave', () => {
  glassCardWrapper.style.transform = '';
  glassReflection.style.background = `
    radial-gradient(
      250px circle at 50% 50%,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.08) 30%,
      transparent 65%
    )
  `;
});


// ================================================
// ===== CARD 5: LIQUID GLASS — Morph Mode  =======
// ================================================

let glassRefractionTarget = 1.52;
let glassRefractionCurrent = 0;
let glassViscosityTarget = 42;
let glassViscosityCurrent = 0;

function updateGlassStats() {
  glassRefractionCurrent = lerp(glassRefractionCurrent, glassRefractionTarget, 0.05);
  glassViscosityCurrent = lerp(glassViscosityCurrent, glassViscosityTarget, 0.05);

  const flik = isMorphing ? rand(-0.02, 0.02) : 0;
  glassRefractionEl.textContent = (glassRefractionCurrent + flik).toFixed(2);
  glassViscosityEl.textContent = Math.round(glassViscosityCurrent + (isMorphing ? rand(-3, 3) : 0));

  requestAnimationFrame(updateGlassStats);
}

function activateMorph() {
  if (isMorphing) return;
  isMorphing = true;

  glassCardWrapper.classList.add('morphing');
  morphBtn.disabled = true;
  morphBtn.textContent = '💧 MORPHING 💧';

  // Intensifica la distorsione
  glassRefractionTarget = rand(1.8, 2.5);
  glassViscosityTarget = rand(80, 120);

  // Incrementa lo scale del displacement durante il morph
  // displacementMapEl è cachato in cima al file
  if (displacementMapEl) displacementMapEl.setAttribute('scale', '35');

  // Flash azzurro sullo sfondo
  const flashInterval = setInterval(() => {
    document.body.style.backgroundColor = `rgba(100, 180, 255, ${rand(0.02, 0.05)})`;
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 50);
  }, 180);

  setTimeout(() => {
    clearInterval(flashInterval);
    document.body.style.backgroundColor = '';
    glassCardWrapper.classList.remove('morphing');
    morphBtn.disabled = false;
    morphBtn.textContent = 'MORPH GLASS';
    isMorphing = false;
    glassRefractionTarget = 1.52;
    glassViscosityTarget = 42;

    // Ripristina lo scale originale
    if (displacementMapEl) displacementMapEl.setAttribute('scale', '18');
  }, 3000);
}

morphBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  activateMorph();
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
  animateTurbulence();
  updateGlassStats();
});
