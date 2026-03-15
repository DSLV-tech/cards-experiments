/*
  ============================================================
  CSS CARD EXPERIMENTS — #04 LASER — script.js
  ============================================================
  Struttura:
    1. Utility         — rand(), lerp()
    2. DOM refs        — canvas, elementi UI, color buttons
    3. GLSL Shaders    — LASER_VERT (vertex shader minimale),
                         LASER_FRAG (fragment shader ~300 righe)
    4. WebGL init      — initLaserWebGL():
                           - crea contesto webgl
                           - compila vertex + fragment shader
                           - linka il program
                           - crea buffer full-screen triangle
                           - ottiene location di tutti gli uniform
    5. Canvas resize   — resizeLaserCanvas(): DPR-aware
    6. Render loop     — renderLaser() via rAF:
                           - aggiorna iTime, flowTime, fogTime
                           - setta tutti gli uniform
                           - drawArrays TRIANGLES (full-screen triangle)
    7. Stats laser     — updateLaserStats() via rAF (lerp)
    8. Pulse mode      — activatePulse(): moltiplica densità
                         e intensità shader per 3s
    9. Color picker    — aggiorna uniform uColor con hex → vec3 GL
   10. Tilt 3D mouse   — mousemove (aggiorna anche iMouse per fog tilt)
   11. Particelle bg
   12. Init            — DOMContentLoaded + resize listener

  Tecnica chiave — full-screen triangle:
    Invece di un quad (2 triangoli), usiamo un singolo triangolo
    grande abbastanza da coprire tutto il canvas.
    Vertici: (-1,-1), (3,-1), (-1,3) in clip space.
    Più efficiente per shader fullscreen (nessun overdraw).

  Nota GLSL:
    Il fragment shader implementa:
    - Beam shape: fascio laser con falloff ellittico
    - Wisps: scie laterali animate
    - Fog: nebbia volumetrica con fbm noise
    - Edge masking: dissolvenza ai bordi
    - Dithering: riduce banding sul gradiente
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
const laserCardWrapper = document.getElementById('laserCardWrapper');
const laserCanvas      = document.getElementById('laserCanvas');
const pulseBtn         = document.getElementById('pulseBtn');
const laserWavelengthEl = document.getElementById('laserWavelength');
const laserIntensityEl  = document.getElementById('laserIntensity');
const colorBtns        = document.querySelectorAll('.laser-color-btn');

// ===== CARD 4: LASER FLOW — Elementi DOM  =======
// ================================================
const laserCardWrapper = document.getElementById('laserCardWrapper');
const laserCanvas = document.getElementById('laserCanvas');
const pulseBtn = document.getElementById('pulseBtn');
const laserWavelengthEl = document.getElementById('laserWavelength');
const laserIntensityEl = document.getElementById('laserIntensity');
const colorBtns = document.querySelectorAll('.laser-color-btn');

// ================================================
// ===== CARD 4: LASER FLOW — WebGL Shader  =======
// ================================================

/*
  Questo shader è portato dal componente React Bits
  "LaserFlow" rimuovendo completamente la dipendenza
  da Three.js. Usiamo direttamente l'API WebGL nativa.
*/

const LASER_VERT = `
precision highp float;
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const LASER_FRAG = `
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#define HAS_DERIVATIVES
#endif

precision highp float;
precision mediump int;

uniform float iTime;
uniform vec3 iResolution;
uniform vec4 iMouse;
uniform float uWispDensity;
uniform float uTiltScale;
uniform float uFlowTime;
uniform float uFogTime;
uniform float uBeamXFrac;
uniform float uBeamYFrac;
uniform float uFlowSpeed;
uniform float uVLenFactor;
uniform float uHLenFactor;
uniform float uFogIntensity;
uniform float uFogScale;
uniform float uWSpeed;
uniform float uWIntensity;
uniform float uFlowStrength;
uniform float uDecay;
uniform float uFalloffStart;
uniform float uFogFallSpeed;
uniform vec3 uColor;
uniform float uFade;

#define PI 3.14159265359
#define TWO_PI 6.28318530718
#define EPS 1e-5

// Beam shape
#define R_H 40.0
#define R_V 100.0
#define TAP_RADIUS 3
#define DT_LOCAL 0.15
#define EDGE_SOFT 0.45
#define FLOW_PERIOD 5.0
#define FLOW_SHARPNESS 1.5
#define FLARE_HEIGHT 30.0
#define FLARE_EXP 2.5
#define FLARE_AMOUNT 2.5
#define TOP_FADE_START 0.7
#define TOP_FADE_EXP 3.0

// Wisps
#define W_LANES 4
#define W_CELL 20.0
#define W_BASE_X 0.8
#define W_LAYER_GAP 1.2
#define W_HALF 0.25
#define W_AA 0.15
#define W_SIDE_DECAY 0.4
#define W_SEG_MIN 0.15
#define W_SEG_MAX 0.55
#define W_CURVE_RANGE 40.0
#define W_CURVE_AMOUNT 1.2
#define W_BOTTOM_EXP 10.0

// Fog
#define FOG_ON 1
#define FOG_OCTAVES 5
#define FOG_CONTRAST 1.6
#define FOG_BEAM_MIN 0.015
#define FOG_BEAM_MAX 0.08
#define FOG_MASK_GAMMA 0.7
#define FOG_EXPAND_SHAPE 2.0
#define FOG_EDGE_MIX 0.5
#define FOG_BOTTOM_BIAS 0.3
#define FOG_TILT_SHAPE 2.0
#define FOG_TILT_MAX_X 0.4
#define HFOG_Y_RADIUS 80.0
#define HFOG_Y_SOFT 60.0
#define HFOG_EDGE_START 0.2
#define HFOG_EDGE_END 0.6
#define HFOG_EDGE_GAMMA 1.5

// Edge masking
#define EDGE_X0 0.7
#define EDGE_X1 1.0
#define EDGE_X_GAMMA 1.5
#define EDGE_LUMA_T0 0.05
#define EDGE_LUMA_T1 0.3
#define DITHER_STRENGTH 1.0

float g(float x) { return x <= 0.00031308 ? 12.92 * x : 1.055 * pow(x, 1.0/2.4) - 0.055; }

float bs(vec2 p, vec2 q, float powr) {
  float d = distance(p, q);
  float f = powr * uFalloffStart;
  float r = (f * f) / (d * d + EPS);
  return powr * min(1.0, r);
}

float bsa(vec2 p, vec2 q, float powr, vec2 s) {
  vec2 d = p - q;
  float dd = (d.x*d.x)/(s.x*s.x) + (d.y*d.y)/(s.y*s.y);
  float f = powr * uFalloffStart;
  float r = (f * f) / (dd + EPS);
  return powr * min(1.0, r);
}

float tri01(float x) { float f = fract(x); return 1.0 - abs(f * 2.0 - 1.0); }

float tauWf(float t, float tmin, float tmax) {
  float a = smoothstep(tmin, tmin + EDGE_SOFT, t);
  float b = 1.0 - smoothstep(tmax - EDGE_SOFT, tmax, t);
  return max(0.0, a * b);
}

float h21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 34.123);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = h21(i), b = h21(i + vec2(1,0)), c = h21(i + vec2(0,1)), d = h21(i + vec2(1,1));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm2(vec2 p) {
  float v = 0.0, amp = 0.6;
  mat2 m = mat2(0.86, 0.5, -0.5, 0.86);
  for (int i = 0; i < FOG_OCTAVES; ++i) {
    v += amp * vnoise(p);
    p = m * p * 2.03 + 17.1;
    amp *= 0.52;
  }
  return v;
}

float rGate(float x, float l) {
  float a = smoothstep(0.0, W_AA, x);
  float b = 1.0 - smoothstep(l, l + W_AA, x);
  return max(0.0, a * b);
}

float flareY(float y) {
  float t = clamp(1.0 - (clamp(y, 0.0, FLARE_HEIGHT) / max(FLARE_HEIGHT, EPS)), 0.0, 1.0);
  return pow(t, FLARE_EXP);
}

float vWisps(vec2 uv, float topF) {
  float y = uv.y;
  float yf = (y + uFlowTime * uWSpeed) / W_CELL;
  float dRaw = clamp(uWispDensity, 0.0, 2.0);
  float d = dRaw <= 0.0 ? 1.0 : dRaw;
  float lanesF = floor(float(W_LANES) * min(d, 1.0) + 0.5);
  int lanes = int(max(1.0, lanesF));
  float sp = min(d, 1.0);
  float ep = max(d - 1.0, 0.0);
  float fm = flareY(max(y, 0.0));
  float rm = clamp(1.0 - (y / max(W_CURVE_RANGE, EPS)), 0.0, 1.0);
  float cm = fm * rm;
  const float G = 0.05;
  float xS = 1.0 + (FLARE_AMOUNT * W_CURVE_AMOUNT * G) * cm;
  float sPix = clamp(y / R_V, 0.0, 1.0);
  float bGain = pow(1.0 - sPix, W_BOTTOM_EXP);
  float sum = 0.0;

  for (int s = 0; s < 2; ++s) {
    float sgn = s == 0 ? -1.0 : 1.0;
    for (int i = 0; i < W_LANES; ++i) {
      if (i >= lanes) break;
      float off = W_BASE_X + float(i) * W_LAYER_GAP;
      float xc = sgn * (off * xS);
      float dx = abs(uv.x - xc);
      float lat = 1.0 - smoothstep(W_HALF, W_HALF + W_AA, dx);
      float amp = exp(-off * W_SIDE_DECAY);
      float seed = h21(vec2(off, sgn * 17.0));
      float yf2 = yf + seed * 7.0;
      float ci = floor(yf2);
      float fy = fract(yf2);
      float seg = mix(W_SEG_MIN, W_SEG_MAX, h21(vec2(ci, off * 2.3)));
      float spR = h21(vec2(ci, off + sgn * 31.0));
      float seg1 = rGate(fy, seg) * step(spR, sp);
      if (ep > 0.0) {
        float spR2 = h21(vec2(ci * 3.1 + 7.0, off * 5.3 + sgn * 13.0));
        float f2 = fract(fy + 0.5);
        seg1 += rGate(f2, seg * 0.9) * step(spR2, ep);
      }
      sum += amp * lat * seg1;
    }
  }

  float span = smoothstep(-3.0, 0.0, y) * (1.0 - smoothstep(R_V - 6.0, R_V, y));
  return uWIntensity * sum * topF * bGain * span;
}

void mainImage(out vec4 fc, in vec2 frag) {
  vec2 C = iResolution.xy * 0.5;
  float invW = 1.0 / max(C.x, 1.0);
  vec2 sc = (512.0 / iResolution.xy) * 0.4;
  vec2 uv = (frag - C) * sc;
  vec2 off = vec2(uBeamXFrac * iResolution.x * sc.x, uBeamYFrac * iResolution.y * sc.y);
  vec2 uvc = uv - off;

  float a = 0.0, b = 0.0;
  float basePhase = 1.5 * PI + uDecay * 0.5;
  float tauMin = basePhase - uDecay;
  float tauMax = basePhase;

  float cx = clamp(uvc.x / (R_H * uHLenFactor), -1.0, 1.0);
  float tH = clamp(TWO_PI - acos(cx), tauMin, tauMax);

  for (int k = -TAP_RADIUS; k <= TAP_RADIUS; ++k) {
    float tu = tH + float(k) * DT_LOCAL;
    float wt = tauWf(tu, tauMin, tauMax);
    if (wt <= 0.0) continue;
    float spd = max(abs(sin(tu)), 0.02);
    float u = clamp((basePhase - tu) / max(uDecay, EPS), 0.0, 1.0);
    float env = pow(1.0 - abs(u * 2.0 - 1.0), 0.8);
    vec2 p = vec2((R_H * uHLenFactor) * cos(tu), 0.0);
    a += wt * bs(uvc, p, env * spd);
  }

  float yPix = uvc.y;
  float cy = clamp(-yPix / (R_V * uVLenFactor), -1.0, 1.0);
  float tV = clamp(TWO_PI - acos(cy), tauMin, tauMax);

  for (int k = -TAP_RADIUS; k <= TAP_RADIUS; ++k) {
    float tu = tV + float(k) * DT_LOCAL;
    float wt = tauWf(tu, tauMin, tauMax);
    if (wt <= 0.0) continue;
    float yb = (-R_V) * cos(tu);
    float s = clamp(yb / R_V, 0.0, 1.0);
    float spd = max(abs(sin(tu)), 0.02);
    float env = pow(1.0 - s, 0.6) * spd;
    float cap = 1.0 - smoothstep(TOP_FADE_START, 1.0, s);
    cap = pow(cap, TOP_FADE_EXP);
    env *= cap;
    float ph = s / max(FLOW_PERIOD, EPS) + uFlowTime * uFlowSpeed;
    float fl = pow(tri01(ph), FLOW_SHARPNESS);
    env *= mix(1.0 - uFlowStrength, 1.0, fl);
    float yp = (-R_V * uVLenFactor) * cos(tu);
    float m = pow(smoothstep(FLARE_HEIGHT, 0.0, yp), FLARE_EXP);
    float wx = 1.0 + FLARE_AMOUNT * m;
    vec2 sig = vec2(wx, 1.0);
    vec2 p = vec2(0.0, yp);
    float mask = step(0.0, yp);
    b += wt * bsa(uvc, p, mask * env, sig);
  }

  float sPix = clamp(yPix / R_V, 0.0, 1.0);
  float topA = pow(1.0 - smoothstep(TOP_FADE_START, 1.0, sPix), TOP_FADE_EXP);
  float L = a + b * topA;
  float w = vWisps(vec2(uvc.x, yPix), topA);
  float fog = 0.0;

#if FOG_ON
  vec2 fuv = uvc * uFogScale;
  float mAct = step(1.0, length(iMouse.xy));
  float nx = ((iMouse.x - C.x) * invW) * mAct;
  float ax = abs(nx);
  float stMag = mix(ax, pow(ax, FOG_TILT_SHAPE), 0.35);
  float st = sign(nx) * stMag * uTiltScale;
  st = clamp(st, -FOG_TILT_MAX_X, FOG_TILT_MAX_X);
  vec2 dir = normalize(vec2(st, 1.0));
  fuv += uFogTime * uFogFallSpeed * dir;
  vec2 prp = vec2(-dir.y, dir.x);
  fuv += prp * (0.08 * sin(dot(uvc, prp) * 0.08 + uFogTime * 0.9));
  float n = fbm2(fuv + vec2(fbm2(fuv + vec2(7.3,2.1)), fbm2(fuv + vec2(-3.7,5.9))) * 0.6);
  n = pow(clamp(n, 0.0, 1.0), FOG_CONTRAST);
  float pixW = 1.0 / max(iResolution.y, 1.0);

#ifdef HAS_DERIVATIVES
  float wL = max(fwidth(L), pixW);
#else
  float wL = pixW;
#endif

  float m0 = pow(smoothstep(FOG_BEAM_MIN - wL, FOG_BEAM_MAX + wL, L), FOG_MASK_GAMMA);
  float bm = 1.0 - pow(1.0 - m0, FOG_EXPAND_SHAPE);
  bm = mix(bm * m0, bm, FOG_EDGE_MIX);
  float yP = 1.0 - smoothstep(HFOG_Y_RADIUS, HFOG_Y_RADIUS + HFOG_Y_SOFT, abs(yPix));
  float nxF = abs((frag.x - C.x) * invW);
  float hE = 1.0 - smoothstep(HFOG_EDGE_START, HFOG_EDGE_END, nxF);
  hE = pow(clamp(hE, 0.0, 1.0), HFOG_EDGE_GAMMA);
  float hW = mix(1.0, hE, clamp(yP, 0.0, 1.0));
  float bBias = mix(1.0, 1.0 - sPix, FOG_BOTTOM_BIAS);
  float browserFogIntensity = uFogIntensity * 1.8;
  float radialFade = 1.0 - smoothstep(0.0, 0.7, length(uvc) / 120.0);
  fog = n * browserFogIntensity * bBias * bm * hW * radialFade;
#endif

  float LF = L + fog;
  float dith = (h21(frag) - 0.5) * (DITHER_STRENGTH / 255.0);
  float tone = g(LF + w);
  vec3 col = tone * uColor + dith;
  float alpha = clamp(g(L + w * 0.6) + dith * 0.6, 0.0, 1.0);
  float nxE = abs((frag.x - C.x) * invW);
  float xF = pow(clamp(1.0 - smoothstep(EDGE_X0, EDGE_X1, nxE), 0.0, 1.0), EDGE_X_GAMMA);
  float scene = LF + max(0.0, w) * 0.5;
  float hi = smoothstep(EDGE_LUMA_T0, EDGE_LUMA_T1, scene);
  float eM = mix(xF, 1.0, hi);
  col *= eM;
  alpha *= eM;
  col *= uFade;
  alpha *= uFade;
  fc = vec4(col, alpha);
}

void main() {
  vec4 fc;
  mainImage(fc, gl_FragCoord.xy);
  gl_FragColor = fc;
}
`;

// ================================================
// ===== CARD 4: LASER FLOW — Init WebGL  =========
// ================================================

let laserGL = null;
let laserProgram = null;
let laserUniforms = {};
let laserFlowTime = 0;
let laserFogTime = 0;
let laserFade = 0;
let laserMouseX = 0;
let laserMouseY = 0;
let laserColor = { r: 1.0, g: 0.475, b: 0.776 }; // #FF79C6
let isPulsing = false;

function hexToGL(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const n = parseInt(c, 16) || 0xffffff;
  return {
    r: ((n >> 16) & 255) / 255,
    g: ((n >> 8) & 255) / 255,
    b: (n & 255) / 255
  };
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initLaserWebGL() {
  const gl = laserCanvas.getContext('webgl', {
    antialias: false,
    alpha: true,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false
  });

  if (!gl) {
    console.warn('WebGL non supportato, card laser non disponibile');
    return;
  }

  // Enable derivatives extension if available
  gl.getExtension('OES_standard_derivatives');

  laserGL = gl;

  // Compile shaders
  const vert = createShader(gl, gl.VERTEX_SHADER, LASER_VERT);
  const frag = createShader(gl, gl.FRAGMENT_SHADER, LASER_FRAG);

  if (!vert || !frag) return;

  // Link program
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(program));
    return;
  }

  laserProgram = program;
  gl.useProgram(program);

  // Full-screen triangle
  const posBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  3, -1,  -1, 3
  ]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Get uniform locations
  const uNames = [
    'iTime', 'iResolution', 'iMouse',
    'uWispDensity', 'uTiltScale', 'uFlowTime', 'uFogTime',
    'uBeamXFrac', 'uBeamYFrac', 'uFlowSpeed',
    'uVLenFactor', 'uHLenFactor', 'uFogIntensity', 'uFogScale',
    'uWSpeed', 'uWIntensity', 'uFlowStrength',
    'uDecay', 'uFalloffStart', 'uFogFallSpeed',
    'uColor', 'uFade'
  ];

  for (const name of uNames) {
    laserUniforms[name] = gl.getUniformLocation(program, name);
  }

  // Resize canvas
  resizeLaserCanvas();
}

function resizeLaserCanvas() {
  const rect = laserCardWrapper.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  laserCanvas.width = rect.width * dpr;
  laserCanvas.height = rect.height * dpr;
  laserCanvas.style.width = rect.width + 'px';
  laserCanvas.style.height = rect.height + 'px';
}

// ================================================
// ===== CARD 4: LASER FLOW — Render Loop  ========
// ================================================

let laserLastTime = 0;

function renderLaser(timestamp) {
  if (!laserGL || !laserProgram) {
    requestAnimationFrame(renderLaser);
    return;
  }

  const gl = laserGL;
  const dt = Math.min(0.033, Math.max(0.001, (timestamp - laserLastTime) / 1000));
  laserLastTime = timestamp;

  laserFlowTime += dt;
  laserFogTime += dt;
  laserFade = Math.min(1.0, laserFade + dt);

  gl.viewport(0, 0, laserCanvas.width, laserCanvas.height);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(laserProgram);

  // Set uniforms
  const pulseMultiplier = isPulsing ? 1.8 : 1.0;

  gl.uniform1f(laserUniforms.iTime, timestamp / 1000);
  gl.uniform3f(laserUniforms.iResolution, laserCanvas.width, laserCanvas.height, 1.0);
  gl.uniform4f(laserUniforms.iMouse, laserMouseX, laserMouseY, 0, 0);
  gl.uniform1f(laserUniforms.uWispDensity, 1.0 * pulseMultiplier);
  gl.uniform1f(laserUniforms.uTiltScale, 0.01);
  gl.uniform1f(laserUniforms.uFlowTime, laserFlowTime);
  gl.uniform1f(laserUniforms.uFogTime, laserFogTime);
  gl.uniform1f(laserUniforms.uBeamXFrac, 0.1);
  gl.uniform1f(laserUniforms.uBeamYFrac, 0.0);
  gl.uniform1f(laserUniforms.uFlowSpeed, 0.35 * pulseMultiplier);
  gl.uniform1f(laserUniforms.uVLenFactor, 2.0);
  gl.uniform1f(laserUniforms.uHLenFactor, 0.5);
  gl.uniform1f(laserUniforms.uFogIntensity, 0.45 * pulseMultiplier);
  gl.uniform1f(laserUniforms.uFogScale, 0.3);
  gl.uniform1f(laserUniforms.uWSpeed, 15.0);
  gl.uniform1f(laserUniforms.uWIntensity, 5.0 * pulseMultiplier);
  gl.uniform1f(laserUniforms.uFlowStrength, 0.25);
  gl.uniform1f(laserUniforms.uDecay, 1.1);
  gl.uniform1f(laserUniforms.uFalloffStart, 1.2);
  gl.uniform1f(laserUniforms.uFogFallSpeed, 0.6);
  gl.uniform3f(laserUniforms.uColor, laserColor.r, laserColor.g, laserColor.b);
  gl.uniform1f(laserUniforms.uFade, laserFade);

  // Enable blending for transparency
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  gl.drawArrays(gl.TRIANGLES, 0, 3);

  requestAnimationFrame(renderLaser);
}


// ================================================
// ===== CARD 4: LASER FLOW — Interattività  ======
// ================================================

// Tilt 3D al passaggio del mouse
laserCardWrapper.addEventListener('mousemove', (e) => {
  const rect = laserCardWrapper.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;

  laserCardWrapper.style.transform = `
    scale(1.02)
    perspective(800px)
    rotateX(${-y * 6}deg)
    rotateY(${x * 6}deg)
  `;

  // Aggiorna posizione mouse per lo shader
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  laserMouseX = (e.clientX - rect.left) * dpr;
  laserMouseY = (rect.height - (e.clientY - rect.top)) * dpr;
});

laserCardWrapper.addEventListener('mouseleave', () => {
  laserCardWrapper.style.transform = '';
  laserMouseX = 0;
  laserMouseY = 0;
});

// Color picker
colorBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    // Rimuovi active da tutti
    colorBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    // Aggiorna colore
    const hex = btn.getAttribute('data-color');
    laserColor = hexToGL(hex);
  });
});


// ================================================
// ===== CARD 4: LASER FLOW — Pulse Mode  =========
// ================================================

// Animazione stats laser
let laserIntensityTarget = 65;
let laserIntensityCurrent = 0;
let laserWavelengthTarget = 780;
let laserWavelengthCurrent = 780;

function updateLaserStats() {
  laserIntensityCurrent = lerp(laserIntensityCurrent, laserIntensityTarget, 0.06);
  laserWavelengthCurrent = lerp(laserWavelengthCurrent, laserWavelengthTarget, 0.06);

  const flicker = isPulsing ? rand(-3, 3) : 0;
  laserIntensityEl.textContent = Math.round(laserIntensityCurrent + flicker);
  laserWavelengthEl.textContent = Math.round(laserWavelengthCurrent + (isPulsing ? rand(-5, 5) : 0));

  requestAnimationFrame(updateLaserStats);
}

function activatePulse() {
  if (isPulsing) return;
  isPulsing = true;

  laserCardWrapper.classList.add('pulsing');
  pulseBtn.disabled = true;
  pulseBtn.textContent = '✦ PULSING ✦';

  laserIntensityTarget = rand(85, 100);
  laserWavelengthTarget = rand(380, 700);

  // Flash viola sullo sfondo
  const flashInterval = setInterval(() => {
    document.body.style.backgroundColor = `rgba(189, 147, 249, ${rand(0.02, 0.06)})`;
    setTimeout(() => {
      document.body.style.backgroundColor = '';
    }, 50);
  }, 150);

  setTimeout(() => {
    clearInterval(flashInterval);
    document.body.style.backgroundColor = '';
    laserCardWrapper.classList.remove('pulsing');
    pulseBtn.disabled = false;
    pulseBtn.textContent = 'PULSE BEAM';
    isPulsing = false;
    laserIntensityTarget = 65;
    laserWavelengthTarget = 780;
  }, 3000);
}

pulseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  activatePulse();
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
  initLaserWebGL();
  requestAnimationFrame(renderLaser);
  updateLaserStats();
});

window.addEventListener('resize', resizeLaserCanvas);
