# CSS Card Experiments

Una serie di esperimenti creativi su effetti CSS e JavaScript.
Ogni card esplora una tecnica diversa, dal rendering Canvas 2D agli shader WebGL.

Realizzato da **[Cristian Di Salvo](https://dslv.tech)** — DSLV.tech  
Con l'assistenza di **Antigravity AI** & **Claude** (Anthropic)

---

## Esperimenti

| # | Card | Tecnica | File |
|---|------|---------|------|
| 01 | ⚡ **Electric** | SVG path animation + JS | [`/electric`](./electric/) |
| 02 | 🔩 **Titanium** | CSS gradients + mouse tracking | [`/metal`](./metal/) |
| 03 | 🔥 **Inferno** | Canvas 2D particle system | [`/fire`](./fire/) |
| 04 | ✦ **Laser** | WebGL GLSL shader | [`/laser`](./laser/) |
| 05 | 💧 **Liquid Glass** | SVG feTurbulence + Glassmorphism | [`/glass`](./glass/) |

---

## Struttura del progetto

```
css-card-experiments/
│
├── electric/
│   ├── index.html   # Struttura HTML e markup
│   ├── style.css    # Reset, layout, stili card electric
│   └── script.js    # Fulmini SVG, surge mode, stats, tilt 3D
│
├── metal/
│   ├── index.html   # Struttura HTML e markup
│   ├── style.css    # Reset, layout, cornice brushed-metal
│   └── script.js    # Mouse reflection, tilt 3D, polish mode
│
├── fire/
│   ├── index.html   # Struttura HTML e markup
│   ├── style.css    # Reset, layout, stili fire + fix ember
│   └── script.js    # Particle system Canvas 2D, embers, eruption
│
├── laser/
│   ├── index.html   # Struttura HTML e markup
│   ├── style.css    # Reset, layout, stili laser card
│   └── script.js    # Vertex + fragment GLSL shader, WebGL init,
│                    # render loop, color picker, pulse mode
│
├── glass/
│   ├── index.html   # Struttura HTML, blob layer, SVG filter
│   ├── style.css    # Reset, layout, glassmorphism layers
│   └── script.js    # Turbulence animation, mouse reflection,
│                    # morph mode, stats
│
└── README.md
```

---

## Come usare

Ogni cartella è **completamente autonoma** — basta aprire `index.html` direttamente nel browser o pubblicarla su qualsiasi server statico.

### GitHub Pages

1. Fork o clona il repo
2. Vai su **Settings → Pages**
3. Seleziona branch `main`, root `/`
4. Ogni card sarà disponibile a:
   - `https://[username].github.io/[repo]/electric/`
   - `https://[username].github.io/[repo]/metal/`
   - `https://[username].github.io/[repo]/fire/`
   - `https://[username].github.io/[repo]/laser/`
   - `https://[username].github.io/[repo]/glass/`

### Locale

```bash
# Qualsiasi server statico funziona, ad esempio:
npx serve .
# oppure
python3 -m http.server 8080
```

---

## Tecniche

### ⚡ Electric — SVG path animation
I fulmini sono elementi `<path>` SVG generati proceduralmente come polilinee spezzate tra due punti casuali del perimetro della card. Ogni bolt viene iniettato nel DOM, vive 150ms, poi rimosso. Il filtro `feGaussianBlur` + merge crea l'alone luminoso.

### 🔩 Titanium — CSS gradients + mouse tracking
La cornice metallica è composta da 4 fasce `div` con `linear-gradient` a 7 stop che simulano la curvatura 3D del brushed-steel. Il riflesso dinamico è un `radial-gradient` il cui centro viene aggiornato a ogni `mousemove` via JavaScript.

### 🔥 Inferno — Canvas 2D particle system
Le particelle vengono generate lungo il perimetro del canvas (30px oltre la card) e animate frame-by-frame. Ogni particella ha posizione, velocità (vx/vy), vita e colore che scala da giallo → arancio → rosso in base al progresso vita. Le braci (embers) sono `div` DOM con animazione CSS keyframe.

### ✦ Laser — WebGL GLSL shader
Lo shader usa un **full-screen triangle** (più efficiente di un quad) e implementa: beam shape con falloff ellittico, wisps laterali animati, nebbia volumetrica con FBM noise a 5 ottave, edge masking e dithering per ridurre il banding. Il colore è controllato tramite uniform `uColor` aggiornato dal color picker.

### 💧 Liquid Glass — SVG feTurbulence
Il filtro SVG combina `feTurbulence` (rumore frattale) e `feDisplacementMap` per deformare visivamente i layer sottostanti. Il `baseFrequency` viene animato frame-by-frame via `setAttribute` per l'effetto liquido continuo. `backdrop-filter: blur + saturate` aggiunge il glassmorphism.

---

## Dipendenze

- **Google Fonts**: Orbitron + Inter (caricati non-blocking)
- Nessuna libreria JS o CSS esterna

---

## Licenza

MIT — libero da usare, modificare e condividere con attribuzione.
