/*
  ============================================================
  CSS CARD EXPERIMENTS — #02 TITANIUM — script.js
  ============================================================
  Struttura:
    1. Utility         — rand(), lerp()
    2. DOM refs        — elementi cachati all'avvio
    3. Mouse tracking  — mousemove: aggiorna radial-gradient
                         del riflesso + tilt 3D wrapper
    4. Polish mode     — activatePolish(): aggiunge .polishing
                         al wrapper per 1.5s (CSS animation)
    5. Particelle bg   — loop createParticles
    6. Init            — DOMContentLoaded

  Tecnica chiave — riflesso dinamico:
    Su ogni mousemove calcoliamo la posizione normalizzata
    del cursore rispetto alla card (0-100%) e aggiorniamo
    il background del div .metal-reflection con un
    radial-gradient centrato su quella coordinata.
    Il tilt usa perspective(800px) + rotateX/Y per simulare
    la profondità 3D senza CSS 3D vero.
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
const metalCardWrapper = document.getElementById('metalCardWrapper');
const metalReflection  = document.getElementById('metalReflection');
const polishBtn        = document.getElementById('polishBtn');

// ================================================
// ===== CARD 2: METALLIC — Logica riflesso  ======
// ================================================

/*
  Il riflesso metallico segue la posizione del mouse.
  Calcoliamo la posizione relativa del cursore rispetto
  alla card e spostiamo il centro del radial-gradient
  di conseguenza.
*/
metalCardWrapper.addEventListener('mousemove', (e) => {
  const rect = metalCardWrapper.getBoundingClientRect();
  // Posizione percentuale del mouse sulla card (0-100%)
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;

  // Aggiorna il gradiente del riflesso centrando la "luce" sul cursore
  metalReflection.style.background = `
    radial-gradient(
      300px circle at ${x}% ${y}%,
      rgba(255, 255, 255, 0.2) 0%,
      rgba(255, 255, 255, 0.08) 30%,
      transparent 70%
    )
  `;

  // Tilt 3D leggero anche sulla card metallica
  const tiltX = (x / 100 - 0.5) * 8;
  const tiltY = (y / 100 - 0.5) * -8;
  metalCardWrapper.style.transform = `
    scale(1.02)
    perspective(800px)
    rotateX(${tiltY}deg)
    rotateY(${tiltX}deg)
  `;
});

// Quando il mouse esce, resetta il riflesso e il tilt
metalCardWrapper.addEventListener('mouseleave', () => {
  metalReflection.style.background = `
    radial-gradient(
      300px circle at 50% 50%,
      rgba(255, 255, 255, 0.15) 0%,
      rgba(255, 255, 255, 0.05) 40%,
      transparent 70%
    )
  `;
  metalCardWrapper.style.transform = '';
});


// ================================================
// ===== CARD 2: METALLIC — Effetto Polish  =======
// ================================================

/*
  Cliccando "POLISH SURFACE", la cornice metallica
  si illumina con un'animazione di lucidatura.
*/
let isPolishing = false;

function activatePolish() {
  if (isPolishing) return;
  isPolishing = true;

  metalCardWrapper.classList.add('polishing');
  polishBtn.textContent = '✨ POLISHING...';
  polishBtn.disabled = true;

  // Dopo la durata dell'animazione, resetta
  setTimeout(() => {
    metalCardWrapper.classList.remove('polishing');
    polishBtn.textContent = 'POLISH SURFACE';
    polishBtn.disabled = false;
    isPolishing = false;
  }, 1500);
}

polishBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  activatePolish();
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
});
