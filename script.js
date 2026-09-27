const canvas = document.querySelector('#particleCanvas');
const ctx = canvas.getContext('2d');
const buttons = [...document.querySelectorAll('.shape-button')];
const swatches = [...document.querySelectorAll('.swatch')];
const densityInput = document.querySelector('#density');
const densityValue = document.querySelector('#densityValue');
const autoPlayButton = document.querySelector('#autoPlay');
const randomButton = document.querySelector('#randomize');
const shapeName = document.querySelector('#shapeName');

const shapeNames = { heart: 'Herz', star: 'Stern', circle: 'Kreis', moon: 'Mond', bolt: 'Blitz', infinity: 'Unendlich', flower: 'Blume', wave: 'Welle', spiral: 'Spirale' };
const shapePalettes = {
  heart: ['#ff155f', '#ff3f8f', '#ff79b7', '#ffb1d5', '#d92374'],
  star: ['#ffcf3a', '#fff09a', '#ff942f', '#ffe06b', '#fff5cf'],
  circle: ['#39e6ff', '#6599ff', '#a1d7ff', '#5784ff', '#73f4e9'],
  moon: ['#72a8ff', '#b9d7ff', '#e8f4ff', '#8b70ff', '#5bcfff'],
  bolt: ['#ffea3d', '#fff6a2', '#ff9938', '#ffffff', '#ffd451'],
  infinity: ['#aa63ff', '#e877ff', '#52cfff', '#dfadff', '#765eff'],
  flower: ['#ff63c3', '#ff8bec', '#b970ff', '#7cf3ff', '#ffd1f0'],
  wave: ['#9b5cff', '#e574ff', '#58d9ff', '#7197ff', '#d4a2ff'],
  spiral: ['#64f5cf', '#52a7ff', '#bb8cff', '#e5ffff', '#70ffe9']
};
const extraPalettes = {
  ocean: ['#16f1ff', '#298bff', '#245eff', '#9be9ff', '#427cff'],
  aurora: ['#42ffba', '#6dffef', '#8e77ff', '#dc65ff', '#b6ffd9'],
  sunset: ['#ffb52e', '#ff7a38', '#ff327f', '#ff75b5', '#ffe09b']
};

const lowPowerDevice = matchMedia('(max-width: 700px), (pointer: coarse)').matches;
let width = 0, height = 0, dpr = 1, particles = [];
let activeShape = 'heart', activePalette = 'shape', particleCount = lowPowerDevice ? 700 : 1200;
let autoTimer = null, resizeTimer = null, animationId = null, mainCanvasVisible = true;
const pointer = { x: -1000, y: -1000, active: false };
let mainPaused = false, motionSpeed = 1, pointScale = 1, brushRadius = 95, brushTool = 'grab';
let textPoints = [];
let quietMode = false;
let sandbox = false, dragId = null, heldParticles = [];
const sandboxToggle = document.querySelector('#sandboxToggle');
const sandboxReset = document.querySelector('#sandboxReset');

function releaseParticles() {
  const id = dragId;
  dragId = null;
  heldParticles = [];
  canvas.classList.remove('dragging');
  if (id !== null && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
}

function setSandbox(enabled) {
  releaseParticles();
  sandbox = enabled;
  if (enabled && autoTimer) toggleAuto();
  canvas.classList.toggle('sandbox', enabled);
  sandboxToggle.classList.toggle('active', enabled);
  sandboxToggle.setAttribute('aria-pressed', String(enabled));
  sandboxReset.hidden = !enabled;
  document.querySelector('.stage-label').textContent = enabled
    ? 'LINKSKLICK HALTEN & ZIEHEN · AUF DEM HANDY MIT DEM FINGER'
    : 'BEWEGE DIE MAUS DURCH DIE PARTIKEL';
  if (!enabled) changeShape(activeShape);
}
sandboxToggle.addEventListener('click', () => setSandbox(!sandbox));
sandboxReset.addEventListener('click', () => changeShape(activeShape));

function palette() {
  return activePalette === 'shape' ? (shapePalettes[activeShape] || extraPalettes.ocean) : extraPalettes[activePalette];
}

function pointFor(shape) {
  if (shape === 'text' && textPoints.length) {
    const target = textPoints[Math.floor(Math.random() * textPoints.length)];
    return { x: target.x * width, y: target.y * height };
  }
  const cx = width / 2, cy = height / 2, unit = Math.min(width, height);
  const rand = Math.sqrt(Math.random());
  let x, y, t, r, a;

  if (shape === 'diamond') {
    const u = Math.random() - .5, v = Math.random() - .5;
    return { x: cx + (u + v) * unit * .35, y: cy + (u - v) * unit * .4 };
  } else if (shape === 'ring') {
    a = Math.random() * Math.PI * 2; r = unit * (.26 + Math.random() * .06);
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  } else if (shape === 'heart') {
    t = Math.random() * Math.PI * 2;
    x = cx + 16 * Math.sin(t) ** 3 * unit * .028 * rand;
    y = cy - (13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * unit * .028 * rand;
  } else if (shape === 'star') {
    a = Math.random() * Math.PI * 2;
    r = unit * .35 * (.42 + .58 * Math.abs(Math.cos(a * 2.5))) * rand;
    x = cx + Math.cos(a - Math.PI / 2) * r;
    y = cy + Math.sin(a - Math.PI / 2) * r;
  } else if (shape === 'circle') {
    a = Math.random() * Math.PI * 2;
    r = unit * .33 * rand;
    x = cx + Math.cos(a) * r;
    y = cy + Math.sin(a) * r;
  } else if (shape === 'moon') {
    for (let attempt = 0; attempt < 20; attempt++) {
      a = Math.random() * Math.PI * 2;
      r = unit * .34 * Math.sqrt(Math.random());
      x = cx - unit * .035 + Math.cos(a) * r;
      y = cy + Math.sin(a) * r;
      if ((x - (cx + unit * .13)) ** 2 + (y - (cy - unit * .06)) ** 2 >= (unit * .28) ** 2) break;
    }
  } else if (shape === 'bolt') {
    const polygon = [[-.10,-.38],[.17,-.38],[.01,-.07],[.19,-.07],[-.18,.40],[-.05,.08],[-.22,.08]];
    const p1 = polygon[Math.floor(Math.random() * polygon.length)];
    const p2 = polygon[Math.floor(Math.random() * polygon.length)];
    const p3 = polygon[Math.floor(Math.random() * polygon.length)];
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    x = cx + (p1[0] + u * (p2[0] - p1[0]) + v * (p3[0] - p1[0])) * unit;
    y = cy + (p1[1] + u * (p2[1] - p1[1]) + v * (p3[1] - p1[1])) * unit;
  } else if (shape === 'infinity') {
    t = Math.random() * Math.PI * 2;
    const den = 1 + Math.sin(t) ** 2;
    x = cx + unit * .5 * Math.cos(t) / den + (Math.random() - .5) * unit * .055;
    y = cy + unit * .28 * Math.sin(t) * Math.cos(t) / den + (Math.random() - .5) * unit * .055;
  } else if (shape === 'flower') {
    a = Math.random() * Math.PI * 2;
    r = unit * .34 * Math.abs(Math.sin(3 * a)) * rand;
    x = cx + Math.cos(a) * r;
    y = cy + Math.sin(a) * r;
  } else if (shape === 'wave') {
    x = width * .1 + Math.random() * width * .8;
    y = cy + Math.sin((x / width) * Math.PI * 4) * height * .18 + (Math.random() - .5) * height * .14;
  } else {
    t = Math.sqrt(Math.random()) * Math.PI * 8;
    r = t * unit * .024;
    x = cx + Math.cos(t) * r + (Math.random() - .5) * 8;
    y = cy + Math.sin(t) * r + (Math.random() - .5) * 8;
  }
  return { x, y };
}

function makeParticles(scatter = false) {
  const colors = palette();
  particles = Array.from({ length: particleCount }, (_, i) => {
    const target = pointFor(activeShape);
    return {
      x: scatter ? Math.random() * width : target.x,
      y: scatter ? Math.random() * height : target.y,
      tx: target.x, ty: target.y, vx: 0, vy: 0,
      size: .6 + Math.random() * 1.55,
      color: colors[i % colors.length],
      speed: .025 + Math.random() * .045
    };
  });
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  if (Math.abs(width - rect.width) < 2 && Math.abs(height - rect.height) < 2) return;
  dpr = Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1.25 : 1.75);
  releaseParticles();
  const oldWidth = width, oldHeight = height;
  width = rect.width; height = rect.height;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (sandbox && oldWidth && oldHeight) {
    particles.forEach(p => {
      p.x *= width / oldWidth; p.tx *= width / oldWidth;
      p.y *= height / oldHeight; p.ty *= height / oldHeight;
      p.vx = p.vy = 0;
    });
  } else makeParticles();
}

function changeShape(shape, scatter = false) {
  releaseParticles();
  activeShape = shape;
  const colors = palette();
  if (scatter) particles.forEach(p => { p.x = Math.random() * width; p.y = Math.random() * height; });
  particles.forEach((p, i) => {
    const target = pointFor(shape);
    p.tx = target.x; p.ty = target.y; p.color = colors[i % colors.length];
  });
  shapeName.textContent = (shapeNames[shape] || 'Dein Text').toUpperCase();
  buttons.forEach(button => {
    const selected = button.dataset.shape === shape;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', selected);
  });
}

function setPalette(name) {
  activePalette = name;
  const colors = palette();
  particles.forEach((p, i) => p.color = colors[i % colors.length]);
  swatches.forEach(swatch => swatch.classList.toggle('active', swatch.dataset.palette === name));
}

function randomShape() {
  const choices = buttons.map(button => button.dataset.shape).filter(shape => shape !== activeShape);
  changeShape(choices[Math.floor(Math.random() * choices.length)], true);
}

function toggleAuto() {
  if (!autoTimer && sandbox) setSandbox(false);
  if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
  else { randomShape(); autoTimer = setInterval(randomShape, 3600); }
  const playing = Boolean(autoTimer);
  autoPlayButton.classList.toggle('active', playing);
  autoPlayButton.setAttribute('aria-pressed', playing);
  autoPlayButton.querySelector('span').textContent = playing ? 'Ⅱ' : '▶';
}

function updatePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const source = event.touches?.[0] || event;
  pointer.x = source.clientX - rect.left;
  pointer.y = source.clientY - rect.top;
  pointer.active = true;
}

function animate() {
  if (!mainCanvasVisible || document.hidden) { animationId = null; return; }
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    if (mainPaused || quietMode) continue;
    if (sandbox && dragId !== null && brushTool !== 'grab') {
      const dx = pointer.x - p.x, dy = pointer.y - p.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 1 && distance < brushRadius) {
        const force = (1 - distance / brushRadius) * (brushTool === 'attract' ? 3 : -5);
        p.tx = p.x = Math.max(3, Math.min(width - 3, p.x + dx / distance * force));
        p.ty = p.y = Math.max(3, Math.min(height - 3, p.y + dy / distance * force));
        p.vx = p.vy = 0;
      }
    }
    if (pointer.active && dragId === null && !(sandbox && brushTool === 'grab')) {
      const dx = p.x - pointer.x, dy = p.y - pointer.y;
      const distSq = dx * dx + dy * dy, radius = brushRadius;
      if (distSq < radius * radius && distSq > 1) {
        const distance = Math.sqrt(distSq);
        const force = (1 - distance / radius) * 1.1;
        p.vx += dx / distance * force;
        p.vy += dy / distance * force;
      }
    }
    p.vx = (p.vx + (p.tx - p.x) * p.speed * .08) * .91;
    p.vy = (p.vy + (p.ty - p.y) * p.speed * .08) * .91;
    p.x += ((p.tx - p.x) * p.speed + p.vx) * motionSpeed;
    p.y += ((p.ty - p.y) * p.speed + p.vy) * motionSpeed;
  }

  const colors = palette();
  ctx.shadowBlur = lowPowerDevice ? 0 : 5;
  for (const color of colors) {
    ctx.beginPath();
    for (const p of particles) {
      if (p.color === color) {
        ctx.moveTo(p.x + p.size * pointScale, p.y);
        ctx.arc(p.x, p.y, p.size * pointScale, 0, Math.PI * 2);
      }
    }
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  animationId = requestAnimationFrame(animate);
}

buttons.forEach(button => button.addEventListener('click', () => changeShape(button.dataset.shape, true)));
swatches.forEach(swatch => swatch.addEventListener('click', () => setPalette(swatch.dataset.palette)));
densityInput.addEventListener('input', () => {
  particleCount = Number(densityInput.value);
  densityValue.value = particleCount;
  makeParticles();
});
autoPlayButton.addEventListener('click', toggleAuto);
randomButton.addEventListener('click', randomShape);
canvas.addEventListener('pointermove', event => {
  if (dragId !== null && event.pointerId !== dragId) return;
  updatePointer(event);
  if (dragId === null) return;
  if (event.pointerType === 'mouse' && !(event.buttons & 1)) { releaseParticles(); return; }
  for (const held of mainPaused || quietMode ? [] : heldParticles) {
    const p = held.particle;
    p.x = p.tx = Math.max(p.size, Math.min(width - p.size, pointer.x + held.dx));
    p.y = p.ty = Math.max(p.size, Math.min(height - p.size, pointer.y + held.dy));
    p.vx = p.vy = 0;
  }
});
canvas.addEventListener('pointerdown', event => {
  if (dragId !== null || event.button !== 0) return;
  updatePointer(event);
  if (!sandbox) return;
  dragId = event.pointerId;
  canvas.setPointerCapture(dragId);
  canvas.classList.add('dragging');
  heldParticles = particles.filter(p => brushTool === 'grab' && Math.hypot(p.x - pointer.x, p.y - pointer.y) < brushRadius)
    .map(particle => {
      particle.tx = particle.x; particle.ty = particle.y;
      particle.vx = particle.vy = 0;
      return { particle, dx: particle.x - pointer.x, dy: particle.y - pointer.y };
    });
});
canvas.addEventListener('pointerleave', () => pointer.active = false);
canvas.addEventListener('pointerup', event => {
  if (event.pointerId === dragId) releaseParticles();
  pointer.active = false;
});
canvas.addEventListener('pointercancel', () => { releaseParticles(); pointer.active = false; });
canvas.addEventListener('lostpointercapture', releaseParticles);
window.addEventListener('blur', () => { releaseParticles(); pointer.active = false; });
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 160);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { cancelAnimationFrame(animationId); animationId = null; }
  else if (!animationId && mainCanvasVisible) animate();
});

const mainCanvasObserver = new IntersectionObserver(entries => {
  mainCanvasVisible = entries[0].isIntersecting;
  if (!mainCanvasVisible && animationId) { cancelAnimationFrame(animationId); animationId = null; }
  else if (mainCanvasVisible && !animationId && !document.hidden) animate();
}, { rootMargin: '100px' });

densityInput.value = particleCount;
densityValue.value = particleCount;
resize();
makeParticles(true);
animate();
mainCanvasObserver.observe(canvas);

// Particle Lab: drei zusätzliche, leichtgewichtige Canvas-Widgets.
const lab = document.querySelector('.particle-lab');
const fireCanvas = document.querySelector('#fireCanvas');
const timerCanvas = document.querySelector('#timerCanvas');
const waveCanvas = document.querySelector('#waveCanvas');
const fireCtx = fireCanvas.getContext('2d');
const timerCtx = timerCanvas.getContext('2d');
const waveCtx = waveCanvas.getContext('2d');
const timerStart = document.querySelector('#timerStart');
const timerAdd = document.querySelector('#timerAdd');
const timerReset = document.querySelector('#timerReset');
const waveBoost = document.querySelector('#waveBoost');

let fireParticles = [], timerParticles = [], waveParticles = [];
let widgetsVisible = false, widgetFrame = null, widgetResizeTimer = null;
let lastWidgetTime = performance.now(), boost = 0;
let wavePhase = 0, smoothBoost = 0;
let fireScale = 1, fireRate = 1;
let fireHeat = 1, fireTime = 0;
const fireSize = document.querySelector('#fireSize');
const fireSpeed = document.querySelector('#fireSpeed');
fireSize.addEventListener('input', () => {
  fireScale = Number(fireSize.value) / 100;
  document.querySelector('#fireSizeValue').value = `${fireSize.value} %`;
});
fireSpeed.addEventListener('input', () => {
  fireRate = Number(fireSpeed.value) / 100;
  document.querySelector('#fireSpeedValue').value = `${fireRate.toLocaleString('de-DE', { maximumFractionDigits: 2 })}×`;
});
let timerSeconds = 60, timerEnd = 0, timerInterval = null;

const digitMap = {
  '0': ['111','101','101','101','111'], '1': ['010','110','010','010','111'],
  '2': ['111','001','111','100','111'], '3': ['111','001','111','001','111'],
  '4': ['101','101','111','001','001'], '5': ['111','100','111','001','111'],
  '6': ['111','100','111','101','111'], '7': ['111','001','010','010','010'],
  '8': ['111','101','111','101','111'], '9': ['111','101','111','001','111'],
  ':': ['0','1','0','1','0']
};

function sizeMiniCanvas(canvas, context) {
  const rect = canvas.getBoundingClientRect();
  if (canvas.viewWidth === rect.width && canvas.viewHeight === rect.height) return false;
  const ratio = Math.min(devicePixelRatio || 1, lowPowerDevice ? 1 : 1.5);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvas.viewWidth = rect.width;
  canvas.viewHeight = rect.height;
  return true;
}

function resetFireParticle(particle, initial = false) {
  particle.spark = Math.random() < .08;
  particle.lane = Math.floor(Math.random() * 5);
  particle.spread = (Math.random() + Math.random() - 1);
  particle.duration = particle.spark ? 1.6 + Math.random() : .9 + Math.random() * .9;
  particle.age = initial ? Math.random() * particle.duration : 0;
  particle.size = particle.spark ? .7 + Math.random() * .6 : 1 + Math.random() * 1.6;
  particle.seed = Math.random() * Math.PI * 2;
}

function buildFire() {
  fireParticles = [];
  adjustFireCount();
}

function adjustFireCount() {
  const count = Math.round((lowPowerDevice ? 160 : 260) * fireHeat);
  // Bestehende Funken behalten ihre Position beim Verstellen.
  if (fireParticles.length > count) fireParticles.length = count;
  while (fireParticles.length < count) {
    const particle = {};
    resetFireParticle(particle, true);
    fireParticles.push(particle);
  }
}

function timerTargets() {
  const mins = Math.min(99, Math.floor(timerSeconds / 60));
  const secs = timerSeconds % 60;
  const text = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const widths = [...text].map(char => digitMap[char][0].length);
  const totalCols = widths.reduce((sum, value) => sum + value, 0) + text.length - 1;
  const w = timerCanvas.viewWidth, h = timerCanvas.viewHeight;
  const step = Math.min((w - 28) / totalCols, (h - 48) / 5, timerCanvas.closest('.fullview') ? 48 : 13);
  const originX = (w - totalCols * step) / 2;
  const originY = (h - 5 * step) / 2 - 2;
  const targets = [];
  let offset = 0;

  for (const char of text) {
    const pattern = digitMap[char];
    pattern.forEach((row, rowIndex) => [...row].forEach((cell, colIndex) => {
      if (cell !== '1') return;
      const cx = originX + (offset + colIndex + .5) * step;
      const cy = originY + (rowIndex + .5) * step;
      const spread = step * .17;
      targets.push({ x: cx - spread, y: cy - spread }, { x: cx + spread, y: cy - spread }, { x: cx - spread, y: cy + spread }, { x: cx + spread, y: cy + spread });
    }));
    offset += pattern[0].length + 1;
  }
  return targets;
}

function updateTimerShape(scatter = false) {
  const targets = timerTargets();
  while (timerParticles.length < targets.length) {
    timerParticles.push({ x: Math.random() * timerCanvas.viewWidth, y: Math.random() * timerCanvas.viewHeight, tx: 0, ty: 0, active: true });
  }
  timerParticles.forEach((particle, index) => {
    const target = targets[index];
    particle.active = Boolean(target);
    if (target) { particle.tx = target.x; particle.ty = target.y; }
    if (scatter && target) { particle.x = Math.random() * timerCanvas.viewWidth; particle.y = Math.random() * timerCanvas.viewHeight; }
  });
}

function buildWave() {
  const count = Math.min(110, Math.max(48, Math.round(waveCanvas.viewWidth / 5)));
  waveParticles = Array.from({ length: count * 3 }, (_, index) => ({ phase: (index % count) / (count - 1), layer: Math.floor(index / count) }));
}

function resizeWidgets() {
  if (sizeMiniCanvas(fireCanvas, fireCtx)) buildFire();
  if (sizeMiniCanvas(timerCanvas, timerCtx)) updateTimerShape();
  if (sizeMiniCanvas(waveCanvas, waveCtx)) buildWave();
}

function drawFire(delta) {
  fireStoke *= Math.exp(-delta * .2);
  fireWind *= Math.exp(-delta * 1.3);
  fireHeat += (Math.min(1.7, fireScale + fireStoke) - fireHeat) * (1 - Math.exp(-delta * 1.8));
  adjustFireCount();
  delta *= fireRate;
  fireTime += delta;
  const w = fireCanvas.viewWidth, h = fireCanvas.viewHeight;
  fireCtx.clearRect(0, 0, w, h);
  fireCtx.globalCompositeOperation = 'lighter';
  const baseY = h - 10;
  // Obere Reglerhälfte: überproportional mehr Energie und höhere Zungen.
  const fuel = Math.max(0, Math.min(1, (fireHeat - .4) / 1));
  const intensity = Math.pow(fuel, 1.65);
  const flameHeight = (h - 18) * (.24 + .74 * intensity);
  const baseWidth = Math.min(w * .65, h * .85) * (.7 + fireHeat * .2);
  for (const particle of fireParticles) {
    particle.age += delta;
    if (particle.age >= particle.duration) resetFireParticle(particle);
    const progress = particle.age / particle.duration;
    const lane = particle.lane - 2;
    const surge = Math.pow((1 + Math.sin(fireTime * 3.5 + lane * 1.7)) / 2, 2);
    const flicker = .76 + .12 * Math.sin(fireTime * 7.1 + lane)
      + (.12 + intensity * .28) * surge;
    const rise = Math.pow(progress, .8);
    const tongueHeight = Math.min(h - 18, flameHeight * (1 - Math.abs(lane) * .09) * flicker);
    const curl = Math.sin(fireTime * 3 - rise * 7 + lane) * baseWidth * (.055 + intensity * .07) * rise;
    const x = w / 2 + lane * baseWidth * .17 * (1 - rise * .5)
      + particle.spread * baseWidth * .16 * (1 - rise * .85) + curl
      + (particle.spark ? Math.sin(particle.seed + fireTime) * rise * 12 : 0) + fireWind * rise * rise;
    const y = Math.max(4, baseY - rise * tongueHeight * (particle.spark ? 1.05 : 1));
    const fadeIn = Math.min(1, progress * 14);
    fireCtx.globalAlpha = fadeIn * Math.pow(1 - progress, .5) * (.7 + fireHeat * .15);
    fireCtx.fillStyle = particle.spark ? '#ffd184' : progress < .22 ? '#fff0ad'
      : progress < .5 ? '#ffbc46' : progress < .78 ? '#ff7129' : '#d93618';
    fireCtx.beginPath();
    fireCtx.arc(x, y, particle.size * (1 - progress * .45), 0, Math.PI * 2);
    fireCtx.fill();
  }
  fireCtx.globalAlpha = 1;
  fireCtx.globalCompositeOperation = 'source-over';
}

function drawTimer() {
  const w = timerCanvas.viewWidth, h = timerCanvas.viewHeight;
  timerCtx.clearRect(0, 0, w, h);
  timerCtx.globalCompositeOperation = 'lighter';
  timerCtx.fillStyle = timerInterval ? '#69e8ff' : '#6b9dff';
  timerCtx.save();
  timerCtx.translate(w * .18, h * .68);
  timerCtx.scale(.64, .3);
  for (const particle of timerParticles) {
    if (!particle.active) continue;
    particle.x += (particle.tx - particle.x) * .12;
    particle.y += (particle.ty - particle.y) * .12;
    timerCtx.beginPath();
    const dotSize = timerCanvas.closest('.fullview') ? Math.max(1.65, Math.min(w / 150, h / 55, 5)) : lowPowerDevice ? 1.35 : 1.65;
    timerCtx.arc(particle.x, particle.y, dotSize, 0, Math.PI * 2);
    timerCtx.fill();
  }
  timerCtx.restore();
  drawHourglass(w, h);
  timerCtx.globalCompositeOperation = 'source-over';
}

function drawWave(time, delta) {
  const w = waveCanvas.viewWidth, h = waveCanvas.viewHeight;
  waveCtx.clearRect(0, 0, w, h);
  waveCtx.globalCompositeOperation = 'lighter';
  // Rund 20 Sekunden sichtbares Nachschwingen, sanfter Energieaufbau.
  boost *= Math.exp(-delta * .12);
  smoothBoost += (boost - smoothBoost) * (1 - Math.exp(-delta * 2));
  wavePhase += delta * (1.1 + smoothBoost * .65);
  waveBoost.classList.toggle('active', smoothBoost > .1 || boost > .1);
  const colors = ['#5bdcff', '#8b77ff', '#d368ff'];
  for (const particle of waveParticles) {
    const x = 12 + particle.phase * (w - 24);
    const envelope = Math.pow(Math.sin(particle.phase * Math.PI), .7);
    const scale = Math.min(h * .24, w * .16);
    const amplitude = scale * (.48 + smoothBoost * .55) * envelope;
    const phase = particle.phase * Math.PI * 4 - wavePhase + particle.layer * .24;
    // Grundwelle und kleinere Oberwellen bilden ein fließendes Band.
    const displacement = Math.sin(phase) * .72
      + Math.sin(phase * 1.73 + wavePhase * .31) * .2
      + Math.sin(particle.phase * Math.PI * 2 + wavePhase * .45) * .08;
    const separation = Math.min(h * .045, 18);
    const y = h / 2 + displacement * amplitude
      + (particle.layer - 1) * separation * (.7 + .3 * Math.cos(phase));
    waveCtx.globalAlpha = (.4 + particle.layer * .16) * (.65 + envelope * .35);
    waveCtx.fillStyle = colors[particle.layer];
    waveCtx.beginPath();
    waveCtx.arc(x, y, 1.1 + particle.layer * .35 + smoothBoost * .35, 0, Math.PI * 2);
    waveCtx.fill();
  }
  waveCtx.globalAlpha = 1;
  waveCtx.globalCompositeOperation = 'source-over';
}

function animateWidgets(time) {
  if (!widgetsVisible || document.hidden) { widgetFrame = null; return; }
  const delta = Math.min(.034, (time - lastWidgetTime) / 1000);
  lastWidgetTime = time;
  if (quietMode) {
    if (shouldDraw(timerCanvas)) drawTimer();
    relaxWidgets.filter(item => item.kind === 'rain' || item.kind === 'aurora').forEach(item => {
      if (shouldDraw(item.canvas)) drawUtility(item);
    });
    const clock = relaxWidgets.find(item => item.kind === 'clock');
    if (clock && shouldDraw(clock.canvas)) {
      clock.ctx.clearRect(0, 0, clock.canvas.viewWidth, clock.canvas.viewHeight);
      drawClock(clock);
    }
    widgetFrame = requestAnimationFrame(animateWidgets);
    return;
  }
  if (shouldDraw(fireCanvas)) drawFire(delta);
  if (shouldDraw(timerCanvas)) drawTimer();
  if (shouldDraw(waveCanvas)) drawWave(time, delta);
  drawRelaxWidgets(delta);
  widgetFrame = requestAnimationFrame(animateWidgets);
}

function setTimerRunning(running) {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  if (running && timerSeconds > 0) {
    timerEnd = Date.now() + timerSeconds * 1000;
    timerInterval = setInterval(() => {
      const next = Math.max(0, Math.ceil((timerEnd - Date.now()) / 1000));
      if (next !== timerSeconds) { timerSeconds = next; updateTimerShape(); }
      if (timerSeconds === 0) {
        setTimerRunning(false);
        document.querySelector('#focusStatus').textContent = 'Geschafft! Deine Fokuszeit ist vorbei.';
      }
    }, 200);
  }
  timerStart.textContent = timerInterval ? 'Ⅱ Pause' : '▶ Start';
  timerStart.classList.toggle('active', Boolean(timerInterval));
}

timerStart.addEventListener('click', () => setTimerRunning(!timerInterval));
timerAdd.addEventListener('click', () => {
  timerSeconds = Math.min(5999, timerSeconds + 60);
  if (timerInterval) timerEnd += 60000;
  updateTimerShape(true);
});
timerReset.addEventListener('click', () => {
  setTimerRunning(false); timerSeconds = Number(document.querySelector('#focusMinutes').value) * 60; updateTimerShape(true);
  document.querySelector('#focusStatus').textContent = 'Bereit für deinen Fokus';
});
waveBoost.addEventListener('click', () => { boost = 1; });

const labObserver = new IntersectionObserver(entries => {
  widgetsVisible = entries[0].isIntersecting;
  if (widgetsVisible && !widgetFrame && !document.hidden) {
    lastWidgetTime = performance.now();
    widgetFrame = requestAnimationFrame(animateWidgets);
  }
}, { rootMargin: '100px' });

window.addEventListener('resize', () => {
  clearTimeout(widgetResizeTimer);
  widgetResizeTimer = setTimeout(resizeWidgets, 180);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && widgetsVisible && !widgetFrame) widgetFrame = requestAnimationFrame(animateWidgets);
});

resizeWidgets();
labObserver.observe(lab);

// Vollansicht funktioniert auch ohne native Vollbild-Unterstützung.
let fullview = null, returnFocus = null;
function shouldDraw(surface) {
  if (fullview) return fullview.contains(surface);
  const rect = surface.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < innerHeight;
}

function refreshViews() {
  resize();
  resizeWidgets();
  relaxWidgets.forEach(item => sizeMiniCanvas(item.canvas, item.ctx));
  playgrounds.forEach(item => sizeMiniCanvas(item.canvas, item.ctx));
}

function closeFullview() {
  if (!fullview) return;
  const previous = fullview;
  fullview = null;
  previous.classList.remove('fullview');
  const button = previous.querySelector('.fullscreen-button');
  button.textContent = '⛶';
  button.setAttribute('aria-label', 'Vollansicht öffnen');
  button.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('has-fullview');
  document.querySelectorAll('[data-view-inert]').forEach(element => {
    element.inert = false;
    element.removeAttribute('data-view-inert');
  });
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  refreshViews();
  returnFocus?.focus({ preventScroll: true });
}

document.querySelectorAll('.particle-stage, .particle-widget').forEach(panel => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'fullscreen-button';
  button.textContent = '⛶';
  button.setAttribute('aria-label', 'Vollansicht öffnen');
  button.setAttribute('aria-expanded', 'false');
  panel.append(button);
  button.addEventListener('click', () => {
    if (fullview === panel) { closeFullview(); return; }
    fullview = panel;
    returnFocus = button;
    panel.classList.add('fullview');
    button.textContent = '×';
    button.setAttribute('aria-label', 'Vollansicht schließen');
    button.setAttribute('aria-expanded', 'true');
    document.body.classList.add('has-fullview');
    // Nur die aktive Karte bleibt per Tastatur bedienbar.
    let branch = panel;
    while (branch.parentElement && branch !== document.body) {
      [...branch.parentElement.children].forEach(sibling => {
        if (sibling !== branch && !sibling.inert) {
          sibling.inert = true;
          sibling.setAttribute('data-view-inert', '');
        }
      });
      branch = branch.parentElement;
    }
    refreshViews();
    if (panel.requestFullscreen) panel.requestFullscreen().catch(() => {});
  });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && fullview) closeFullview();
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && fullview) closeFullview();
  else refreshViews();
});

const relaxSettings = { galaxySize: 100, galaxySpeed: 100, orbitCount: 4, orbitSpeed: 100 };
Object.keys(relaxSettings).forEach(key => {
  document.querySelector('#' + key).addEventListener('input', event => {
    relaxSettings[key] = Number(event.target.value);
    document.querySelector('#' + key + 'Value').value = key.endsWith('Speed')
      ? (relaxSettings[key] / 100).toLocaleString('de-DE') + '×'
      : relaxSettings[key] + (key.endsWith('Size') ? ' %' : '');
  });
});
const relaxWidgets = ['stars', 'rain', 'aurora', 'galaxy', 'orbit', 'clock'].map(kind => {
  const surface = document.querySelector('#' + kind + 'Canvas');
  return {
    kind, canvas: surface, ctx: surface.getContext('2d'), time: 0,
    points: Array.from({ length: lowPowerDevice ? 150 : 240 }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random(),
      speed: .08 + Math.random() * .12
    }))
  };
});
relaxWidgets.forEach(item => sizeMiniCanvas(item.canvas, item.ctx));
window.addEventListener('resize', () => {
  relaxWidgets.forEach(item => sizeMiniCanvas(item.canvas, item.ctx));
});

function drawRelaxWidgets(delta) {
  for (const item of relaxWidgets) {
    if (!shouldDraw(item.canvas)) continue;
    const rate = item.kind === 'galaxy' ? relaxSettings.galaxySpeed / 100
      : item.kind === 'orbit' ? relaxSettings.orbitSpeed / 100 : 1;
    item.time += delta * rate;
    const context = item.ctx, w = item.canvas.viewWidth, h = item.canvas.viewHeight;
    context.clearRect(0, 0, w, h);
    if (item.kind === 'clock') { drawClock(item); continue; }
    if (item.kind === 'rain' || item.kind === 'aurora') { drawUtility(item); continue; }
    item.points.forEach((point, index) => {
      let x, y, radius = 1.2;
      if (item.kind === 'stars') {
        point.z -= delta * .065;
        if (point.z < .08) { point.z = 1; point.x = Math.random(); point.y = Math.random(); }
        x = w / 2 + (point.x - .5) * w * .3 / point.z;
        y = h / 2 + (point.y - .5) * h * .3 / point.z;
        radius = .5 + (1 - point.z) * 1.7;
        context.fillStyle = index % 3 ? '#9cbfff' : '#e3ddff';
        context.globalAlpha = 1 - point.z * .7;
      } else if (item.kind === 'rain') {
        point.y = (point.y + delta * point.speed) % 1;
        x = (point.x * w + Math.sin(item.time * .4 + index) * 4);
        y = point.y * h;
        context.fillStyle = index % 3 ? '#67beff' : '#9a99ff';
        context.globalAlpha = .35 + point.z * .65;
        radius = .8 + point.z;
      } else if (item.kind === 'galaxy') {
        const distance = Math.sqrt(point.x) * Math.min(w, h) * .3 * relaxSettings.galaxySize / 100;
        const angle = (index % 3) * Math.PI * 2 / 3 + point.x * 5 + item.time * .22 + point.y * .5;
        x = w / 2 + Math.cos(angle) * distance;
        y = h / 2 + Math.sin(angle) * distance * .72;
        context.fillStyle = index % 3 ? '#ab8dff' : '#85e8ff';
        context.globalAlpha = .45 + point.z * .55;
        radius = 1 + point.z;
      } else if (item.kind === 'orbit') {
        const lane = index % relaxSettings.orbitCount;
        const angle = point.x * Math.PI * 2 + item.time * (.25 + lane * .06);
        const tilt = lane * Math.PI / relaxSettings.orbitCount;
        const distance = Math.min(w, h) * .38;
        const ox = Math.cos(angle) * distance, oy = Math.sin(angle) * distance * .3;
        x = w / 2 + ox * Math.cos(tilt) - oy * Math.sin(tilt);
        y = h / 2 + ox * Math.sin(tilt) + oy * Math.cos(tilt);
        context.fillStyle = ['#7bdeff', '#ab9aff', '#68efd6'][lane % 3];
        context.globalAlpha = .4 + point.z * .6;
      } else {
        x = point.x * w;
        const ribbon = Math.sin(point.x * 7 + item.time * .4) * .13
          + Math.sin(point.x * 12 - item.time * .25) * .06;
        y = h * (.44 + ribbon + (point.y - .5) * .35);
        context.fillStyle = point.y < .5 ? '#69ffd3' : '#b38aff';
        context.globalAlpha = .25 + Math.sin(point.y * Math.PI) * .65;
        radius = 1 + point.z * .8;
      }
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    });
    context.globalAlpha = 1;
  }
}

function drawClock(item, customText = null) {
  const now = new Date();
  const text = customText || [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map(value => String(value).padStart(2, '0')).join(':');
  const context = item.ctx, w = item.canvas.viewWidth, h = item.canvas.viewHeight;
  const step = Math.min((w - 24) / 27, (h - 24) / 5);
  let column = 0;
  context.fillStyle = '#87dfff';
  for (const char of text) {
    digitMap[char].forEach((row, iy) => [...row].forEach((cell, ix) => {
      if (cell !== '1') return;
      const x = (w - 27 * step) / 2 + (column + ix + .5) * step;
      const y = (h - 5 * step) / 2 + (iy + .5) * step;
      context.beginPath();
      context.arc(x, y, Math.max(.8, step * .23), 0, Math.PI * 2);
      context.fill();
    }));
    column += digitMap[char][0].length + 1;
  }
  item.canvas.setAttribute('aria-label', (customText ? 'Zeit: ' : 'Lokale Uhrzeit: ') + text);
  if (customText) return;
  document.querySelector('#clockDate').textContent = now.toLocaleDateString('de-DE', {
    weekday: 'short', day: 'numeric', month: 'long'
  });
}

// Zusätzliche Werkzeuge für das große Punktefeld.
// Einstellungen werden am Ende der Initialisierung geladen.
let stopwatchElapsed = 0, stopwatchSince = null, lapElapsed = 0, lapNumber = 0;
let tasks = [];
try { const saved = JSON.parse(localStorage.getItem('neon-tasks') || '[]'); if (Array.isArray(saved)) tasks = saved.filter(t => t && typeof t.text === 'string').slice(0, 50).map(t => ({ text: t.text.slice(0, 100), done: Boolean(t.done) })); } catch {}
function elapsedWatch() {
  return stopwatchElapsed + (stopwatchSince === null ? 0 : performance.now() - stopwatchSince);
}
function durationText(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':');
}
function drawUtility(item) {
  item.ctx.clearRect(0, 0, item.canvas.viewWidth, item.canvas.viewHeight);
  if (item.kind === 'aurora') { drawClock(item, durationText(elapsedWatch())); return; }
  const fraction = tasks.length ? tasks.filter(t => t.done).length / tasks.length : 0;
  const w = item.canvas.viewWidth, h = item.canvas.viewHeight;
  for (let i = 0; i < 100; i++) {
    const angle = i / 100 * Math.PI * 2 - Math.PI / 2;
    const radius = Math.min(w, h) * .36;
    item.ctx.fillStyle = i < fraction * 100 ? '#70f4cf' : '#273b66';
    item.ctx.beginPath();
    item.ctx.arc(w / 2 + Math.cos(angle) * radius, h / 2 + Math.sin(angle) * radius, 2, 0, Math.PI * 2);
    item.ctx.fill();
  }
}
document.querySelector('#stopwatchStart').addEventListener('click', event => {
  if (stopwatchSince === null) stopwatchSince = performance.now();
  else { stopwatchElapsed = elapsedWatch(); stopwatchSince = null; }
  event.currentTarget.textContent = stopwatchSince === null ? 'Weiter' : 'Pause';
  document.querySelector('#stopwatchLap').disabled = stopwatchSince === null;
});
document.querySelector('#stopwatchLap').addEventListener('click', () => {
  const elapsed = elapsedWatch();
  const entry = document.createElement('li');
  entry.textContent = 'Runde ' + (++lapNumber) + ': ' + ((elapsed - lapElapsed) / 1000).toFixed(2) + ' s';
  lapElapsed = elapsed;
  const list = document.querySelector('#lapList');
  list.prepend(entry);
  if (list.children.length > 10) list.lastElementChild.remove();
});
document.querySelector('#stopwatchReset').addEventListener('click', () => {
  stopwatchElapsed = lapElapsed = lapNumber = 0; stopwatchSince = null;
  document.querySelector('#lapList').replaceChildren();
  document.querySelector('#stopwatchStart').textContent = 'Start';
  document.querySelector('#stopwatchLap').disabled = true;
});
function renderTasks(save = true) {
  const list = document.querySelector('#taskList');
  list.replaceChildren();
  tasks.forEach((task, index) => {
    const row = document.createElement('li'), label = document.createElement('label');
    const check = document.createElement('input'), text = document.createElement('span'), remove = document.createElement('button');
    check.type = 'checkbox'; check.checked = task.done; text.textContent = task.text;
    check.addEventListener('change', () => { task.done = check.checked; renderTasks(); });
    remove.className = 'mini-button'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Aufgabe löschen: ' + task.text);
    remove.addEventListener('click', () => { tasks.splice(index, 1); renderTasks(); });
    label.append(check, text); row.append(label, remove); list.append(row);
  });
  document.querySelector('#taskStatus').textContent = tasks.length ? tasks.filter(t => t.done).length + ' von ' + tasks.length + ' erledigt' : 'Noch keine Aufgaben';
  if (save) try { localStorage.setItem('neon-tasks', JSON.stringify(tasks)); } catch { document.querySelector('#taskStorage').textContent = 'Speichern nicht verfügbar – nur für diesen Besuch.'; }
}
document.querySelector('#taskForm').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#taskText');
  if (!input.value.trim()) return;
  if (tasks.length >= 50) { document.querySelector('#taskStatus').textContent = 'Maximal 50 Aufgaben. Entferne zuerst eine Aufgabe.'; return; }
  tasks.push({ text: input.value.trim().slice(0, 100), done: false }); input.value = ''; renderTasks();
});
renderTasks(false);
document.querySelector('#focusMinutes').addEventListener('change', event => {
  setTimerRunning(false);
  timerSeconds = Number(event.target.value) * 60;
  updateTimerShape();
  document.querySelector('#focusStatus').textContent = 'Bereit für deinen Fokus';
});
timerStart.addEventListener('click', () => {
  document.querySelector('#focusStatus').textContent = timerInterval ? 'Fokuszeit läuft' : 'Fokuszeit pausiert';
});
document.querySelector('#pageAccent').addEventListener('change', event => {
  document.body.dataset.accent = event.target.value;
});
document.querySelector('#quietMode').addEventListener('click', event => {
  quietMode = !quietMode;
  releaseParticles();
  if (quietMode && autoTimer) toggleAuto();
  document.body.classList.toggle('quiet-mode', quietMode);
  event.currentTarget.setAttribute('aria-pressed', String(quietMode));
  event.currentTarget.textContent = quietMode ? '▶ Animationen fortsetzen' : 'Ⅱ Ruhemodus';
  document.querySelector('#studioStatus').textContent = quietMode
    ? 'Animationen pausiert. Timer und Live-Uhr laufen weiter.' : 'Animationen laufen wieder.';
});
document.querySelector('#surpriseMix').addEventListener('click', () => {
  const names = ['shape', 'ocean', 'aurora', 'sunset'];
  setPalette(names[Math.floor(Math.random() * names.length)]);
  randomShape();
  document.querySelector('#studioStatus').textContent = 'Neue Form und Farbwelt gemischt.';
});
for (const [key, title, icon] of [['ring', 'Ring', '◎'], ['diamond', 'Diamant', '◇']]) {
  shapeNames[key] = title;
  const button = document.createElement('button');
  button.className = 'shape-button';
  button.dataset.shape = key;
  button.textContent = icon + ' ' + title;
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => changeShape(key, true));
  document.querySelector('.shape-picker').append(button);
  buttons.push(button);
}
document.querySelector('#motionSpeed').addEventListener('input', event => motionSpeed = Number(event.target.value) / 100);
document.querySelector('#pointSize').addEventListener('input', event => pointScale = Number(event.target.value) / 100);
document.querySelector('#brushRadius').addEventListener('input', event => brushRadius = Number(event.target.value));
document.querySelector('#brushTool').addEventListener('change', event => {
  brushTool = event.target.value;
  setSandbox(true);
});
document.querySelector('#pauseMain').addEventListener('click', event => {
  mainPaused = !mainPaused;
  releaseParticles();
  if (mainPaused && autoTimer) toggleAuto();
  event.currentTarget.textContent = mainPaused ? '▶ Weiter' : 'Ⅱ Pause';
  event.currentTarget.setAttribute('aria-pressed', String(mainPaused));
});
document.querySelector('#scatterMain').addEventListener('click', () => {
  releaseParticles();
  particles.forEach(p => {
    p.x = Math.random() * width; p.y = Math.random() * height;
    p.vx = p.vy = 0;
    if (sandbox) { p.tx = p.x; p.ty = p.y; }
  });
});
document.querySelector('#textForm').addEventListener('submit', event => {
  event.preventDefault();
  const text = document.querySelector('#particleText').value.trim();
  if (!text) {
    document.querySelector('#studioStatus').textContent = 'Bitte gib zuerst einen Text ein.';
    return;
  }
  const mask = document.createElement('canvas');
  mask.width = 600; mask.height = 240;
  const pen = mask.getContext('2d', { willReadFrequently: true });
  pen.font = 'bold 140px sans-serif';
  const size = Math.min(140, 140 * 540 / Math.max(1, pen.measureText(text).width));
  pen.font = 'bold ' + size + 'px sans-serif';
  pen.textAlign = 'center'; pen.textBaseline = 'middle';
  pen.fillText(text, 300, 120);
  const pixels = pen.getImageData(0, 0, 600, 240).data;
  textPoints = [];
  for (let y = 0; y < 240; y += 2) {
    for (let x = 0; x < 600; x += 2) {
      if (pixels[(y * 600 + x) * 4 + 3] > 100) textPoints.push({ x: .08 + x / 600 * .84, y: .25 + y / 240 * .5 });
    }
  }
  if (!textPoints.length) return;
  if (autoTimer) toggleAuto();
  changeShape('text');
  document.querySelector('#studioStatus').textContent = 'Dein Text wird aus Punkten geformt.';
});
document.querySelector('#saveImage').addEventListener('click', () => {
  const snapshot = document.createElement('canvas');
  snapshot.width = canvas.width; snapshot.height = canvas.height;
  const pen = snapshot.getContext('2d');
  pen.fillStyle = '#03081c'; pen.fillRect(0, 0, snapshot.width, snapshot.height);
  pen.drawImage(canvas, 0, 0);
  snapshot.toBlob(blob => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'neon-particles.png'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    document.querySelector('#studioStatus').textContent = 'PNG-Download gestartet.';
  }, 'image/png');
});

const savedControls = ['pageAccent', 'density', 'motionSpeed', 'pointSize', 'brushRadius', 'fireSize', 'fireSpeed', 'galaxySize', 'galaxySpeed', 'orbitCount', 'orbitSpeed'];
try {
  const settings = JSON.parse(localStorage.getItem('neon-settings') || '{}');
  for (const id of savedControls) {
    const control = document.getElementById(id), value = settings?.[id];
    if (value === undefined) continue;
    if (control.tagName === 'SELECT') {
      if (![...control.options].some(option => option.value === value)) continue;
    } else if (!Number.isFinite(Number(value)) || Number(value) < Number(control.min) || Number(value) > Number(control.max)) continue;
    control.value = value;
    control.dispatchEvent(new Event(control.tagName === 'SELECT' ? 'change' : 'input'));
  }
} catch {}
function savePreferences() {
  const settings = Object.fromEntries(savedControls.map(id => [id, document.getElementById(id).value]));
  try { localStorage.setItem('neon-settings', JSON.stringify(settings)); } catch {}
}
savedControls.forEach(id => document.getElementById(id).addEventListener('change', savePreferences));

// Auch Layoutänderungen durch Aufgabenlisten oder Bildschirmtastatur erfassen.
let layoutFrame = null;
const canvasLayoutObserver = new ResizeObserver(() => {
  if (layoutFrame !== null) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = null;
    refreshViews();
  });
});
document.querySelectorAll('canvas').forEach(surface => canvasLayoutObserver.observe(surface));

let fireStoke = 0, fireWind = 0, fireGesture = null;
fireCanvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || fireGesture) return;
  fireGesture = { id: event.pointerId, start: event.clientX, x: event.clientX, moved: false };
  fireCanvas.setPointerCapture(event.pointerId);
});
fireCanvas.addEventListener('pointermove', event => {
  if (!fireGesture || fireGesture.id !== event.pointerId) return;
  const movement = event.clientX - fireGesture.x;
  fireWind = Math.max(-80, Math.min(80, fireWind + movement * .65));
  fireGesture.x = event.clientX;
  if (Math.abs(event.clientX - fireGesture.start) > 8) fireGesture.moved = true;
});
fireCanvas.addEventListener('pointerup', event => {
  if (!fireGesture || fireGesture.id !== event.pointerId) return;
  if (!fireGesture.moved) fireStoke = Math.min(.65, fireStoke + .35);
  fireGesture = null;
});
fireCanvas.addEventListener('lostpointercapture', () => fireGesture = null);
fireCanvas.title = 'Tippen: Holz nachlegen · Ziehen: Wind';

function flipHourglass() {
  setTimerRunning(false);
  timerSeconds = Number(document.querySelector('#focusMinutes').value) * 60;
  updateTimerShape();
  timerCanvas.classList.remove('hourglass-flip');
  void timerCanvas.offsetWidth;
  timerCanvas.classList.add('hourglass-flip');
  setTimerRunning(true);
  document.querySelector('#focusStatus').textContent = 'Sanduhr umgedreht · Fokuszeit läuft';
}
timerCanvas.addEventListener('click', flipHourglass);
document.querySelector('#flipHourglass').addEventListener('click', flipHourglass);
function drawHourglass(w, h) {
  const total = Math.max(timerSeconds, Number(document.querySelector('#focusMinutes').value) * 60);
  const remaining = Math.min(1, timerSeconds / total);
  const cx = w / 2, top = h * .06, height = h * .57, half = Math.min(w * .24, height * .42);
  const dot = (x, y, color, radius = 1.5) => {
    timerCtx.fillStyle = color; timerCtx.beginPath(); timerCtx.arc(x, y, radius, 0, Math.PI * 2); timerCtx.fill();
  };
  for (let i = 0; i <= 30; i++) {
    const t = i / 30, extent = half * Math.abs(2 * t - 1);
    dot(cx - extent, top + t * height, '#648fbf');
    dot(cx + extent, top + t * height, '#648fbf');
    dot(cx - half + t * half * 2, top, '#97cfff');
    dot(cx - half + t * half * 2, top + height, '#97cfff');
  }
  for (let i = 0; i < 150; i++) {
    const u = ((i * 73) % 151) / 151, spread = ((i * 47) % 149) / 149 * 2 - 1;
    if (i / 150 < remaining) {
      const depth = .05 + u * .43;
      dot(cx + spread * half * (1 - depth * 2) * .88, top + depth * height, '#ffdc8b');
    } else {
      const depth = .98 - u * .42 * (1 - remaining);
      dot(cx + spread * half * (depth * 2 - 1) * .88, top + depth * height, '#ffb85f');
    }
  }
  if (timerInterval) for (let i = 0; i < 8; i++) {
    const t = ((performance.now() / 1100 + i / 8) % 1);
    dot(cx, top + height * (.5 + t * .43), '#ffe6b1', 1);
  }
}

const playgrounds = ['network', 'meteor', 'sand'].map(kind => {
  const canvas = document.querySelector('#' + kind + 'Canvas');
  const item = { kind, canvas, ctx: canvas.getContext('2d'), points: [], delay: 0 };
  sizeMiniCanvas(canvas, item.ctx);
  return item;
});
const network = playgrounds[0], meteors = playgrounds[1], sand = playgrounds[2];
network.points = Array.from({ length: lowPowerDevice ? 35 : 55 }, () => ({
  x: Math.random(), y: Math.random(), vx: (Math.random() - .5) * .07, vy: (Math.random() - .5) * .07
}));
function launchMeteor(x = Math.random() * .7, y = Math.random() * .35) {
  if (meteors.points.length >= 24) return;
  meteors.points.push({ x, y, life: 1, speed: .2 + Math.random() * .2 });
}
meteors.canvas.addEventListener('click', event => {
  const rect = meteors.canvas.getBoundingClientRect();
  launchMeteor((event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height);
});
document.querySelector('#meteorBurst').addEventListener('click', () => { for (let i = 0; i < 6; i++) launchMeteor(); });
let sandMode = 'pour', sandPointer = null, sandEmission = 0;
for (const [id, mode] of [['sandPour', 'pour'], ['sandSuck', 'suck']]) {
  document.querySelector('#' + id).addEventListener('click', () => {
    sandMode = mode;
    document.querySelector('#sandPour').setAttribute('aria-pressed', String(mode === 'pour'));
    document.querySelector('#sandSuck').setAttribute('aria-pressed', String(mode === 'suck'));
  });
}
sand.canvas.addEventListener('contextmenu', event => event.preventDefault());
function sandPosition(event) {
  const rect = sand.canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height };
}
sand.canvas.addEventListener('pointerdown', event => {
  if (sandPointer || ![0, 2].includes(event.button)) return;
  sandPointer = { ...sandPosition(event), id: event.pointerId, mode: event.button === 2 ? 'suck' : event.pointerType === 'mouse' ? 'pour' : sandMode };
  sand.canvas.setPointerCapture(event.pointerId);
});
sand.canvas.addEventListener('pointermove', event => {
  if (sandPointer?.id === event.pointerId) Object.assign(sandPointer, sandPosition(event));
});
for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) sand.canvas.addEventListener(type, () => sandPointer = null);
window.addEventListener('blur', () => sandPointer = null);
document.querySelector('#sandClear').addEventListener('click', () => sand.points = []);
let playgroundTime = performance.now();
function drawPlaygrounds(now) {
  const dt = Math.min(.04, Math.max(0, (now - playgroundTime) / 1000)); playgroundTime = now;
  for (const item of playgrounds) {
    if (document.hidden || quietMode || !shouldDraw(item.canvas)) continue;
    const c = item.ctx, w = item.canvas.viewWidth, h = item.canvas.viewHeight;
    c.clearRect(0, 0, w, h);
    if (item.kind === 'network') {
      const range = Number(document.querySelector('#networkRange').value);
      item.points.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.x < 0 || p.x > 1) { p.vx *= -1; p.x = Math.max(0, Math.min(1, p.x)); }
        if (p.y < 0 || p.y > 1) { p.vy *= -1; p.y = Math.max(0, Math.min(1, p.y)); }
      });
      item.points.forEach((p, i) => {
        for (let j = i + 1; j < item.points.length; j++) {
          const q = item.points[j], distance = Math.hypot((p.x - q.x) * w, (p.y - q.y) * h);
          if (distance < range) {
            c.strokeStyle = 'rgba(110,170,255,' + (.45 * (1 - distance / range)) + ')';
            c.beginPath(); c.moveTo(p.x * w, p.y * h); c.lineTo(q.x * w, q.y * h); c.stroke();
          }
        }
        c.fillStyle = '#9bddff'; c.beginPath(); c.arc(p.x * w, p.y * h, 1.8, 0, Math.PI * 2); c.fill();
      });
    } else if (item.kind === 'meteor') {
      item.delay -= dt; if (item.delay <= 0) { launchMeteor(); item.delay = 1 + Math.random() * 2; }
      item.points.forEach(p => {
        p.x += p.speed * dt; p.y += p.speed * dt; p.life -= dt * .32;
        for (let i = 0; i < 18; i++) {
          c.globalAlpha = Math.max(0, p.life) * (1 - i / 18);
          c.fillStyle = i < 3 ? '#eefaff' : '#8f9bff';
          c.beginPath(); c.arc(p.x * w - i * 3, p.y * h - i * 3, i < 3 ? 1.8 : 1, 0, Math.PI * 2); c.fill();
        }
      });
      item.points = item.points.filter(p => p.life > 0 && p.x < 1.3 && p.y < 1.3); c.globalAlpha = 1;
    } else {
      if (sandPointer?.mode === 'pour') {
        sandEmission += dt * 100;
        while (sandEmission >= 1 && item.points.length < 1400) {
          item.points.push({ x: Math.max(0, Math.min(.999, sandPointer.x + (Math.random() - .5) * .04)), y: sandPointer.y, vy: 0 });
          sandEmission--;
        }
        sandEmission = Math.min(1, sandEmission);
      } else sandEmission = 0;
      if (sandPointer?.mode === 'suck') item.points = item.points.filter(p => Math.hypot((p.x - sandPointer.x) * w, (p.y - sandPointer.y) * h) > 45);
      const columns = Math.max(10, Math.floor(w / 4)), levels = new Array(columns).fill(0);
      item.points.sort((a, b) => b.y - a.y);
      item.points.forEach(p => {
        const column = Math.min(columns - 1, Math.max(0, Math.floor(p.x * columns)));
        const floor = 1 - (levels[column] + 1) * 3 / h;
        p.vy += dt * .65; p.y = Math.min(floor, p.y + p.vy * dt);
        if (p.y >= floor - .005) { levels[column]++; p.vy = 0; }
        c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(p.x * w, p.y * h, 1.4, 0, Math.PI * 2); c.fill();
      });
    }
  }
  requestAnimationFrame(drawPlaygrounds);
}
requestAnimationFrame(drawPlaygrounds);
