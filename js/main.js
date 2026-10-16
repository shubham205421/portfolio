/* ══════════════════════════════════════════════
   SHUBHAM CHAUHAN — 3D PORTFOLIO JAVASCRIPT
   Three.js particle background + interactions
══════════════════════════════════════════════ */

'use strict';

/* ── Loader ── */
(function initLoader() {
  const loader = document.createElement('div');
  loader.className = 'loader';
  loader.innerHTML = `
    <div class="loader-text">Loading</div>
    <div class="loader-bar"><div class="loader-fill"></div></div>
  `;
  document.body.prepend(loader);

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => loader.remove(), 700);
    }, 1200);
  });
})();

/* ═══════════════════════════════════
   THREE.JS PARTICLE BACKGROUND
═══════════════════════════════════ */
(function initThreeBackground() {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 5;

  /* ── Particles ── */
  const particleCount = 1800;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);

  const colorPalette = [
    new THREE.Color(0x3b82f6), // blue
    new THREE.Color(0x8b5cf6), // purple
    new THREE.Color(0x06b6d4), // cyan
    new THREE.Color(0x1e3a8a), // dark blue
  ];

  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    // Spread in a sphere-ish volume
    const r = 30 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i3 + 2] = r * Math.cos(phi);

    const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
    colors[i3]     = c.r;
    colors[i3 + 1] = c.g;
    colors[i3 + 2] = c.b;

    sizes[i] = Math.random() * 2.5 + 0.5;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors,    3));
  geometry.setAttribute('size',     new THREE.BufferAttribute(sizes,     1));

  /* Circular particle texture */
  const particleTexture = (function () {
    const canvas2 = document.createElement('canvas');
    canvas2.width = canvas2.height = 64;
    const ctx = canvas2.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,   'rgba(255,255,255,1)');
    grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
    grad.addColorStop(1,   'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas2);
  })();

  const material = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    map: particleTexture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  /* ── Connection Lines (sparse) ── */
  const lineGeometry = new THREE.BufferGeometry();
  const linePositions = [];
  const lineColors = [];
  const threshold = 3;

  // Only connect particles that are near the "front" (z > 25) to keep density low
  const frontIndices = [];
  for (let i = 0; i < particleCount; i++) {
    if (positions[i * 3 + 2] > 22) frontIndices.push(i);
  }

  for (let a = 0; a < frontIndices.length; a++) {
    for (let b = a + 1; b < frontIndices.length; b++) {
      if (linePositions.length > 3600) break; // cap
      const ia = frontIndices[a] * 3;
      const ib = frontIndices[b] * 3;
      const dx = positions[ia]     - positions[ib];
      const dy = positions[ia + 1] - positions[ib + 1];
      const dz = positions[ia + 2] - positions[ib + 2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < threshold) {
        linePositions.push(positions[ia], positions[ia+1], positions[ia+2]);
        linePositions.push(positions[ib], positions[ib+1], positions[ib+2]);
        const alpha = 1 - dist / threshold;
        lineColors.push(0.23, 0.51, 0.96, alpha);
        lineColors.push(0.23, 0.51, 0.96, alpha);
      }
    }
  }

  if (linePositions.length > 0) {
    lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: false,
      color: 0x3b82f6,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMat);
    scene.add(lines);
  }

  /* ── Mouse parallax ── */
  const mouse = { x: 0, y: 0 };
  const mouseTarget = { x: 0, y: 0 };

  window.addEventListener('mousemove', (e) => {
    mouseTarget.x = (e.clientX / window.innerWidth  - 0.5) * 0.6;
    mouseTarget.y = (e.clientY / window.innerHeight - 0.5) * 0.4;
  });

  /* ── Resize ── */
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ── Animate ── */
  const clock = new THREE.Clock();

  (function animate() {
    requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    // Slow rotation
    particles.rotation.y = elapsed * 0.03;
    particles.rotation.x = elapsed * 0.01;

    // Mouse parallax (smooth)
    mouse.x += (mouseTarget.x - mouse.x) * 0.04;
    mouse.y += (mouseTarget.y - mouse.y) * 0.04;
    camera.position.x = mouse.x * 3;
    camera.position.y = -mouse.y * 2;
    camera.lookAt(scene.position);

    renderer.render(scene, camera);
  })();
})();

/* ═══════════════════════════════════
   CUSTOM CURSOR
═══════════════════════════════════ */
(function initCursor() {
  const cursor = document.getElementById('cursor');
  const follower = document.getElementById('cursor-follower');
  if (!cursor || !follower) return;

  let cx = 0, cy = 0;
  let fx = 0, fy = 0;

  document.addEventListener('mousemove', (e) => {
    cx = e.clientX; cy = e.clientY;
    cursor.style.transform = `translate(${cx - 5}px, ${cy - 5}px)`;
  });

  // Follower uses rAF for smooth lag
  (function animateCursor() {
    requestAnimationFrame(animateCursor);
    fx += (cx - fx) * 0.12;
    fy += (cy - fy) * 0.12;
    follower.style.transform = `translate(${fx - 18}px, ${fy - 18}px)`;
  })();

  // Interactive hover state
  document.querySelectorAll('a, button, .project-card, .skill-item, .tech-tag, .highlight-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursor.style.transform += ' scale(2)';
      cursor.style.background = 'var(--accent-purple)';
      follower.style.width = '50px';
      follower.style.height = '50px';
      follower.style.borderColor = 'rgba(139,92,246,0.5)';
    });
    el.addEventListener('mouseleave', () => {
      cursor.style.background = 'var(--accent-blue)';
      follower.style.width = '36px';
      follower.style.height = '36px';
      follower.style.borderColor = 'rgba(139,92,246,0.6)';
    });
  });
})();

/* ═══════════════════════════════════
   NAVBAR
═══════════════════════════════════ */
(function initNavbar() {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  const allNavLinks = document.querySelectorAll('.nav-link');

  // Scroll shadow
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });

  // Mobile hamburger
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks?.classList.toggle('open');
  });

  // Close on link click
  allNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('open');
      navLinks?.classList.remove('open');
    });
  });

  // Active section highlighting
  const sections = document.querySelectorAll('section[id]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        allNavLinks.forEach(link => {
          link.classList.toggle('active', link.dataset.section === id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });

  sections.forEach(s => observer.observe(s));
})();

/* ═══════════════════════════════════
   SCROLL REVEAL ANIMATIONS
═══════════════════════════════════ */
(function initReveal() {
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

  revealEls.forEach(el => observer.observe(el));
})();

/* ═══════════════════════════════════
   SKILL BARS ANIMATION
═══════════════════════════════════ */
(function initSkillBars() {
  const fills = document.querySelectorAll('.skill-fill');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  fills.forEach(fill => observer.observe(fill));
})();

/* ═══════════════════════════════════
   COUNTER ANIMATION
═══════════════════════════════════ */
(function initCounters() {
  const counters = document.querySelectorAll('.stat-number');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const duration = 1500;
      const start = performance.now();

      const tick = (now) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        el.textContent = Math.floor(eased * target);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      };

      requestAnimationFrame(tick);
      observer.unobserve(el);
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
})();

/* ═══════════════════════════════════
   3D CARD TILT
═══════════════════════════════════ */
(function initCardTilt() {
  const cards = document.querySelectorAll('.project-card');

  cards.forEach(card => {
    let raf;

    card.addEventListener('mousemove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width  - 0.5;
        const y = (e.clientY - rect.top)  / rect.height - 0.5;

        const rotateX = -y * 10;
        const rotateY =  x * 10;

        card.style.transform = `
          perspective(800px)
          rotateX(${rotateX}deg)
          rotateY(${rotateY}deg)
          translateZ(10px)
          scale(1.02)
        `;
      });
    });

    card.addEventListener('mouseleave', () => {
      cancelAnimationFrame(raf);
      card.style.transform = '';
    });
  });
})();

/* ═══════════════════════════════════
   HERO 3D PARALLAX (mouse)
═══════════════════════════════════ */
(function initHeroParallax() {
  const hero3d = document.getElementById('hero-3d');
  if (!hero3d) return;

  const windows = hero3d.querySelectorAll('[data-depth]');

  document.addEventListener('mousemove', (e) => {
    const cx = (e.clientX / window.innerWidth  - 0.5);
    const cy = (e.clientY / window.innerHeight - 0.5);

    windows.forEach(el => {
      const depth = parseFloat(el.dataset.depth) || 0.3;
      const tx = cx * 40 * depth;
      const ty = cy * 30 * depth;
      el.style.transform = `translate(${tx}px, ${ty}px)`;
    });
  });
})();

/* ═══════════════════════════════════
   SMOOTH SCROLL
═══════════════════════════════════ */
(function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();

/* ═══════════════════════════════════
   CONTACT FORM
═══════════════════════════════════ */
(function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('.submit-btn');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `<span>Sending…</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = `<span>Message Sent! ✓</span>`;
      btn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
      form.reset();

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.style.background = '';
        btn.disabled = false;
      }, 3000);
    }, 1800);
  });
})();

/* ═══════════════════════════════════
   TYPING EFFECT (hero role)
═══════════════════════════════════ */
(function initTypewriter() {
  const roles = ['Java Developer', 'Full Stack Developer', 'CS Engineering Student', 'Problem Solver'];
  let roleIndex = 0;
  let charIndex = 0;
  let deleting = false;

  // Find the last role badge or create a typed element
  const heroBio = document.querySelector('.hero-bio');
  if (!heroBio) return;

  const typedEl = document.createElement('span');
  typedEl.className = 'typed-role';
  typedEl.style.cssText = `
    display: inline-block;
    color: var(--accent-cyan);
    font-weight: 600;
    font-size: 0.95rem;
    min-height: 1.4em;
  `;
  // Insert before hero-bio
  heroBio.parentElement.insertBefore(typedEl, heroBio);

  function type() {
    const current = roles[roleIndex];
    if (deleting) {
      typedEl.textContent = current.substring(0, charIndex--) + '|';
      if (charIndex < 0) {
        deleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        setTimeout(type, 400);
        return;
      }
    } else {
      typedEl.textContent = current.substring(0, ++charIndex) + '|';
      if (charIndex === current.length) {
        deleting = true;
        setTimeout(type, 2000);
        return;
      }
    }
    setTimeout(type, deleting ? 50 : 90);
  }

  setTimeout(type, 1000);
})();

/* ═══════════════════════════════════
   FLOATING PARTICLE ELEMENTS
   (Decorative mini-cubes around scene)
═══════════════════════════════════ */
(function initFloatingCubes() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  const cubeCount = 8;
  for (let i = 0; i < cubeCount; i++) {
    const cube = document.createElement('div');
    cube.style.cssText = `
      position: absolute;
      width: ${Math.random() * 10 + 6}px;
      height: ${Math.random() * 10 + 6}px;
      background: linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3));
      border: 1px solid rgba(99,155,255,0.3);
      border-radius: 3px;
      top: ${Math.random() * 80 + 10}%;
      left: ${Math.random() * 90 + 5}%;
      animation: cube-float ${Math.random() * 6 + 6}s ${Math.random() * -6}s ease-in-out infinite;
      pointer-events: none;
      z-index: 0;
      transform: rotate(${Math.random() * 45}deg);
    `;
    hero.appendChild(cube);
  }

  /* Inject CSS for cube animation */
  if (!document.getElementById('cube-anim-style')) {
    const style = document.createElement('style');
    style.id = 'cube-anim-style';
    style.textContent = `
      @keyframes cube-float {
        0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
        33%  { transform: translateY(-20px) rotate(15deg); opacity: 1; }
        66%  { transform: translateY(10px) rotate(-10deg); opacity: 0.4; }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }
})();

/* ═══════════════════════════════════
   SKILL ITEM HTML FIX
   Restructures .skill-item to use
   header row + bar layout
═══════════════════════════════════ */
(function fixSkillItems() {
  document.querySelectorAll('.skill-item').forEach(item => {
    const iconWrap = item.querySelector('.skill-icon-wrap');
    const span = item.querySelector('span');
    const bar = item.querySelector('.skill-bar');

    if (!iconWrap || !span || !bar) return;

    // Clear and reconstruct
    item.innerHTML = '';

    const row = document.createElement('div');
    row.className = 'skill-item-row';
    row.style.cssText = 'display:flex;align-items:center;gap:10px;';
    row.appendChild(iconWrap);
    row.appendChild(span);
    item.appendChild(row);
    item.appendChild(bar);
  });
})();

/* ═══════════════════════════════════
   ACTIVE SECTION GLOW
   Adds ambient glow to active section
═══════════════════════════════════ */
(function initSectionGlow() {
  const sections = document.querySelectorAll('.section');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.transition = 'background 0.8s ease';
      }
    });
  }, { threshold: 0.3 });

  sections.forEach(s => observer.observe(s));
})();

/* ── Final: trigger initial reveals for hero ── */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure hero elements show immediately
  document.querySelectorAll('.hero .reveal, .hero .reveal-left, .hero .reveal-right').forEach(el => {
    el.classList.add('visible');
  });
});
