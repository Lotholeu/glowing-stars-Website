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

function palette() {
  return activePalette === 'shape' ? shapePalettes[activeShape] : extraPalettes[activePalette];
}

function pointFor(shape) {
  const cx = width / 2, cy = height / 2, unit = Math.min(width, height);
  const rand = Math.sqrt(Math.random());
  let x, y, t, r, a;

  if (shape === 'heart') {
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
  width = rect.width; height = rect.height;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  makeParticles();
}

function changeShape(shape, scatter = false) {
  activeShape = shape;
  const colors = palette();
  if (scatter) particles.forEach(p => { p.x = Math.random() * width; p.y = Math.random() * height; });
  particles.forEach((p, i) => {
    const target = pointFor(shape);
    p.tx = target.x; p.ty = target.y; p.color = colors[i % colors.length];
  });
  shapeName.textContent = shapeNames[shape].toUpperCase();
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
    if (pointer.active) {
      const dx = p.x - pointer.x, dy = p.y - pointer.y;
      const distSq = dx * dx + dy * dy, radius = 95;
      if (distSq < radius * radius && distSq > 1) {
        const distance = Math.sqrt(distSq);
        const force = (1 - distance / radius) * 1.1;
        p.vx += dx / distance * force;
        p.vy += dy / distance * force;
      }
    }
    p.vx = (p.vx + (p.tx - p.x) * p.speed * .08) * .91;
    p.vy = (p.vy + (p.ty - p.y) * p.speed * .08) * .91;
    p.x += (p.tx - p.x) * p.speed + p.vx;
    p.y += (p.ty - p.y) * p.speed + p.vy;
  }

  const colors = palette();
  ctx.shadowBlur = lowPowerDevice ? 0 : 5;
  for (const color of colors) {
    ctx.beginPath();
    for (const p of particles) {
      if (p.color === color) {
        ctx.moveTo(p.x + p.size, p.y);
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
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
canvas.addEventListener('pointermove', updatePointer);
canvas.addEventListener('pointerdown', updatePointer);
canvas.addEventListener('pointerleave', () => pointer.active = false);
canvas.addEventListener('touchmove', updatePointer, { passive: true });
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
  const ratio = Math.min(devicePixelRatio || 1, lowPowerDevice ? 1 : 1.5);
  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  canvas.viewWidth = rect.width;
  canvas.viewHeight = rect.height;
}

function resetFireParticle(particle, initial = false) {
  const w = fireCanvas.viewWidth, h = fireCanvas.viewHeight;
  particle.x = w * (.24 + Math.random() * .52);
  particle.y = initial ? h * (.2 + Math.random() * .8) : h + Math.random() * 15;
  particle.vx = (Math.random() - .5) * 34;
  particle.vy = 65 + Math.random() * 115;
  particle.life = .45 + Math.random() * .55;
  particle.maxLife = particle.life;
  particle.size = .8 + Math.random() * 2.2;
}

function buildFire() {
  const count = lowPowerDevice ? 80 : 140;
  fireParticles = Array.from({ length: count }, () => {
    const particle = {};
    resetFireParticle(particle, true);
    return particle;
  });
}

function timerTargets() {
  const mins = Math.min(99, Math.floor(timerSeconds / 60));
  const secs = timerSeconds % 60;
  const text = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const widths = [...text].map(char => digitMap[char][0].length);
  const totalCols = widths.reduce((sum, value) => sum + value, 0) + text.length - 1;
  const w = timerCanvas.viewWidth, h = timerCanvas.viewHeight;
  const step = Math.min((w - 28) / totalCols, (h - 48) / 5, 13);
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
  const count = lowPowerDevice ? 60 : 95;
  waveParticles = Array.from({ length: count }, (_, index) => ({ phase: index / (count - 1), layer: index % 3 }));
}

function resizeWidgets() {
  sizeMiniCanvas(fireCanvas, fireCtx);
  sizeMiniCanvas(timerCanvas, timerCtx);
  sizeMiniCanvas(waveCanvas, waveCtx);
  buildFire();
  buildWave();
  updateTimerShape(true);
}

function drawFire(delta) {
  const w = fireCanvas.viewWidth, h = fireCanvas.viewHeight;
  fireCtx.clearRect(0, 0, w, h);
  fireCtx.globalCompositeOperation = 'lighter';
  for (const particle of fireParticles) {
    particle.life -= delta * .72;
    particle.x += (particle.vx + Math.sin(particle.y * .055) * 16) * delta;
    particle.y -= particle.vy * delta;
    if (particle.life <= 0 || particle.y < 4) resetFireParticle(particle);
    const life = Math.max(0, particle.life / particle.maxLife);
    fireCtx.globalAlpha = Math.min(1, life * 1.45);
    fireCtx.fillStyle = life > .66 ? '#fff2a8' : life > .34 ? '#ff8a30' : '#ff315f';
    fireCtx.beginPath();
    fireCtx.arc(particle.x, particle.y, particle.size * (.45 + life), 0, Math.PI * 2);
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
  for (const particle of timerParticles) {
    if (!particle.active) continue;
    particle.x += (particle.tx - particle.x) * .12;
    particle.y += (particle.ty - particle.y) * .12;
    timerCtx.beginPath();
    timerCtx.arc(particle.x, particle.y, lowPowerDevice ? 1.35 : 1.65, 0, Math.PI * 2);
    timerCtx.fill();
  }
  timerCtx.globalCompositeOperation = 'source-over';
}

function drawWave(time, delta) {
  const w = waveCanvas.viewWidth, h = waveCanvas.viewHeight;
  waveCtx.clearRect(0, 0, w, h);
  waveCtx.globalCompositeOperation = 'lighter';
  boost = Math.max(0, boost - delta * .48);
  waveBoost.classList.toggle('active', boost > .2);
  const colors = ['#5bdcff', '#8b77ff', '#d368ff'];
  for (const particle of waveParticles) {
    const x = 12 + particle.phase * (w - 24);
    const envelope = Math.sin(particle.phase * Math.PI);
    const amplitude = (22 + boost * 28) * envelope;
    const y = h / 2 + Math.sin(particle.phase * Math.PI * 5 - time * (.0026 + boost * .002)) * amplitude + (particle.layer - 1) * 9;
    waveCtx.globalAlpha = .5 + particle.layer * .2;
    waveCtx.fillStyle = colors[particle.layer];
    waveCtx.beginPath();
    waveCtx.arc(x, y, 1.1 + particle.layer * .45 + boost * .35, 0, Math.PI * 2);
    waveCtx.fill();
  }
  waveCtx.globalAlpha = 1;
  waveCtx.globalCompositeOperation = 'source-over';
}

function animateWidgets(time) {
  if (!widgetsVisible || document.hidden) { widgetFrame = null; return; }
  const delta = Math.min(.034, (time - lastWidgetTime) / 1000);
  lastWidgetTime = time;
  drawFire(delta);
  drawTimer();
  drawWave(time, delta);
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
      if (timerSeconds === 0) setTimerRunning(false);
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
timerReset.addEventListener('click', () => { setTimerRunning(false); timerSeconds = 60; updateTimerShape(true); });
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
