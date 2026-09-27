const canvas = document.querySelector('#particleCanvas');
const ctx = canvas.getContext('2d');
const buttons = document.querySelectorAll('.shape-button');

let width, height, dpr, particles = [];
let activeShape = 'heart';
const PARTICLE_COUNT = 1600;
const palettes = {
  heart: ['#ff155f', '#ff3f8f', '#ff79b7', '#ffb1d5', '#d92374'],
  star: ['#ffcf3a', '#fff09a', '#ff942f', '#ffe06b', '#fff5cf'],
  circle: ['#39e6ff', '#6599ff', '#a1d7ff', '#5784ff', '#73f4e9'],
  wave: ['#9b5cff', '#e574ff', '#58d9ff', '#7197ff', '#d4a2ff'],
  spiral: ['#64f5cf', '#52a7ff', '#bb8cff', '#e5ffff', '#70ffe9']
};

function resize() {
  const rect = canvas.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width; height = rect.height;
  canvas.width = width * dpr; canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  makeParticles();
}

function pointFor(shape, i) {
  const cx = width / 2, cy = height / 2;
  const scale = Math.min(width, height) * .028;
  const rand = Math.sqrt(Math.random());
  let x, y, t, r;
  if (shape === 'heart') {
    t = Math.random() * Math.PI * 2;
    const edgeX = 16 * Math.sin(t) ** 3;
    const edgeY = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
    x = cx + edgeX * scale * rand; y = cy + edgeY * scale * rand;
  } else if (shape === 'star') {
    const a = Math.random() * Math.PI * 2; const outer = Math.min(width, height) * .35;
    const starR = outer * (0.42 + .58 * Math.abs(Math.cos(a * 2.5)));
    r = starR * rand; x = cx + Math.cos(a - Math.PI/2) * r; y = cy + Math.sin(a - Math.PI/2) * r;
  } else if (shape === 'circle') {
    const a = Math.random() * Math.PI * 2; r = Math.min(width, height) * .32 * rand;
    x = cx + Math.cos(a) * r; y = cy + Math.sin(a) * r;
  } else if (shape === 'wave') {
    x = width * .12 + Math.random() * width * .76;
    y = cy + Math.sin((x / width) * Math.PI * 4) * height * .18 + (Math.random() - .5) * height * .15;
  } else {
    t = Math.sqrt(Math.random()) * Math.PI * 8; r = t * Math.min(width, height) * .025;
    x = cx + Math.cos(t) * r; y = cy + Math.sin(t) * r;
  }
  return { x, y };
}

function makeParticles() {
  particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
    const target = pointFor(activeShape, i);
    return { x: Math.random() * width, y: Math.random() * height, tx: target.x, ty: target.y, size: .65 + Math.random() * 1.5, color: palettes[activeShape][i % 5], speed: .035 + Math.random() * .045 };
  });
}

function changeShape(shape) {
  activeShape = shape;
  particles.forEach((p, i) => {
    const target = pointFor(shape, i);
    p.tx = target.x; p.ty = target.y; p.color = palettes[shape][i % 5];
  });
  buttons.forEach(button => { const selected = button.dataset.shape === shape; button.classList.toggle('active', selected); button.setAttribute('aria-pressed', selected); });
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    p.x += (p.tx - p.x) * p.speed; p.y += (p.ty - p.y) * p.speed;
    ctx.fillStyle = p.color; ctx.shadowBlur = 8; ctx.shadowColor = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  requestAnimationFrame(animate);
}

buttons.forEach(button => button.addEventListener('click', () => changeShape(button.dataset.shape)));
window.addEventListener('resize', resize);
resize(); animate();
