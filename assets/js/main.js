/* ═══════════════════════════════════════════════════════════════════════════
   THE CHAMELEON — interaction layer
   · reversible scroll motion (IntersectionObserver, same transition both ways)
   · lerped parallax, single rAF loop, idles when settled
   · hero film: autoplay, toggle, full screen, restrained scroll transform
   · eye-turret diagram: independent tracking, frontal convergence
   · colour-role switcher, marquee, scale bar
   No dependencies. ~9 KB.
   ═══════════════════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ── CLOUDINARY ────────────────────────────────────────────────────────
     Requested configuration, verbatim:
       const player = cloudinary.player('player', {
         cloudName: 'hitdvpiy',
         publicId:  'mixkit-green-vailed-chameleon-seen-from-one-side-1489-full-hd'
       });
     The library is not loaded from a CDN (the preview sandbox blocks
     external requests), so the hero plays the identical asset — same
     cloudName, same publicId — through the native element. If the official
     player ever becomes available, this upgrades to it automatically.      */
  const CLOUDINARY = {
    cloudName: 'hitdvpiy',
    publicId: 'mixkit-green-vailed-chameleon-seen-from-one-side-1489-full-hd'
  };
  function initCloudinaryPlayer() {
    if (!window.cloudinary || typeof window.cloudinary.player !== 'function') return false;
    try {
      const player = window.cloudinary.player('player', {
        cloudName: CLOUDINARY.cloudName,
        publicId: CLOUDINARY.publicId
      });
      if (player && typeof player.mute === 'function') player.mute(true);
      return true;
    } catch (err) { return false; }
  }

  /* ══ 1 · REVERSIBLE SCROLL MOTION ═══════════════════════════════════════ */
  const Motion = (() => {
    const items = [];
    let io = null;

    function setupStagger() {
      $$('[data-stagger]').forEach(group => {
        const kids = $$(':scope > [data-anim]', group);
        kids.forEach((k, i) => {
          k.style.setProperty('--i', i);
          k.style.setProperty('--n', kids.length);
        });
      });
    }

    function init() {
      if (reduce.matches) return;           // CSS already shows everything
      setupStagger();

      const nodes = $$('[data-anim], [data-lines], [data-hero-in], [data-scalebar]');
      if (!('IntersectionObserver' in window)) {
        nodes.forEach(n => n.classList.add('is-in'));
        return;
      }

      // negative top margin: reverse only once the element has left the frame
      io = new IntersectionObserver(entries => {
        for (const entry of entries) {
          const el = entry.target;
          if (entry.isIntersecting) {
            el.classList.remove('is-out');
            el.classList.add('is-in');
          } else if (el.classList.contains('is-in')) {
            el.classList.add('is-out');
            el.classList.remove('is-in');
          }
        }
      }, { rootMargin: '-4% 0px -12% 0px', threshold: 0 });

      nodes.forEach(n => {
        items.push(n);
        io.observe(n);
      });
    }

    /* hero entrance waits for the webfonts so the reveal never reflows */
    function revealHero() {
      const hero = $$('[data-hero-in]');
      hero.forEach((el, i) => {
        window.setTimeout(() => {
          el.classList.remove('is-out');
          el.classList.add('is-in');
        }, reduce.matches ? 0 : 90 + i * 95);
      });
      const badge = $('[data-hero-badge]');
      if (badge) badge.classList.add('is-in');
    }

    return { init, revealHero, get items() { return items; } };
  })();

  /* ══ 2 · PARALLAX + HERO FILM TRANSFORM (one rAF loop) ══════════════════ */
  const Parallax = (() => {
    let layers = [], heroMedia = null, heroVideo = null, hero = null;
    let raf = null, busy = false;

    function init() {
      hero = $('.hero');
      heroMedia = $('[data-hero-media]');
      heroVideo = $('[data-hero-video]');
      if (reduce.matches) return;

      layers = $$('[data-parallax]').map(el => {
        const isFigure = el.classList.contains('figure');
        const target = isFigure ? $('.figure__img img', el) : el;
        return {
          frame: el,
          target,
          k: parseFloat(el.dataset.parallax) || 0.05,
          isFigure,
          cur: 0
        };
      }).filter(l => l.target);
      request();
    }

    function measure() {
      const vh = window.innerHeight;
      const mid = vh / 2;

      for (const l of layers) {
        const r = l.frame.getBoundingClientRect();
        if (r.bottom < -vh * 0.35 || r.top > vh * 1.35) { continue; }
        const p = clamp((mid - (r.top + r.height / 2)) / vh, -1, 1);
        let goal = p * l.k * vh;
        if (l.isFigure) goal = clamp(p * l.k * r.height, -r.height * 0.062, r.height * 0.062);
        l.goal = goal;
        busy = true;
      }

      /* hero film: a slight push-in and lift as the section is left behind */
      if (hero && heroMedia && heroVideo) {
        const r = hero.getBoundingClientRect();
        const past = clamp(-r.top / Math.max(r.height, 1), 0, 1);
        if (past < 1.05 && r.bottom > 0) {
          const scale = 1 + past * 0.075;
          const lift = past * vh * 0.05;
          const fade = 1 - past * 0.5;
          heroVideo.style.transform = `translate3d(0,${lift.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
          heroVideo.style.opacity = fade.toFixed(3);
          busy = true;
        }
      }
    }

    function step() {
      let moving = false;

      for (const l of layers) {
        if (l.goal === undefined) continue;
        const d = l.goal - l.cur;
        l.cur += d * 0.16;
        if (Math.abs(d) < 0.06) l.cur = l.goal;
        l.target.style.setProperty('--py', l.cur.toFixed(2) + 'px');
        if (l.cur !== l.goal) moving = true;
      }

      if (moving) { raf = requestAnimationFrame(step); }
      else { busy = false; raf = null; }
    }

    function request() {
      if (raf) return;
      busy = true;
      raf = requestAnimationFrame(step);
    }

    return { init, measure: () => { measure(); request(); } };
  })();

  /* ══ 3 · CHROME: progress bar, nav state ═══════════════════════════════ */
  const Chrome = (() => {
    let bar = null, nav = null, lastY = 0, ticking = false;

    function update() {
      const y = window.scrollY || window.pageYOffset;
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      if (bar) bar.style.transform = `scaleX(${clamp(y / max, 0, 1)})`;

      if (nav) {
        nav.classList.toggle('is-scrolled', y > 40);
        const goingDown = y > lastY && y > 320;
        const far = y < document.documentElement.scrollHeight - window.innerHeight - 200;
        nav.classList.toggle('is-hidden', goingDown && far);
      }
      lastY = y;
      ticking = false;
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
      Parallax.measure();
    }

    function init() {
      bar = $('#progressBar');
      nav = $('#nav');
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', () => { update(); Parallax.measure(); }, { passive: true });
      update();
    }

    return { init };
  })();

  /* ══ 4 · HERO FILM ════════════════════════════════════════════════════
     No player chrome sits over the footage. Accessibility for the looping
     film is preserved by three mechanisms instead of a visible button:
       · clicking the film plays or pauses it
       · the film pauses automatically whenever the hero leaves the viewport
       · prefers-reduced-motion starts it on the poster frame, not moving   */
  const Film = (() => {
    let video, wrap, tries = 0, dead = false, wantPlay = true, onScreen = true;

    function play() {
      if (dead || !onScreen) return;
      const p = video.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => { if (tries++ < 3) window.setTimeout(play, 300 * tries); });
      }
    }
    function pause() { video.pause(); }

    /* If the browser cannot decode the asset at all, the poster — a real
       frame of the same footage — holds the composition and the film
       controls stand down rather than pretending to work. */
    function markDead() {
      dead = true;
      wrap.classList.add('is-media-unavailable');
      wrap.parentElement.classList.add('is-media-unavailable');
    }

    function init() {
      video = $('[data-hero-video]');
      if (!video) return;
      wrap = $('[data-hero-media]');

      video.muted = true;                 // required for autoplay
      video.playsInline = true;

      if (initCloudinaryPlayer()) return;

      /* metred or data-saving connections: metadata and poster only */
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const thrifty = conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || ''));

      video.addEventListener('error', () => {
        if (!video.error || video.error.code === 4 || video.error.code === 3) {
          markDead();
          // expose the browser's own controls so the footage is still reachable
          video.controls = true;
          video.preload = 'metadata';
        }
      });

      /* The film is its own control. The listener sits on the hero rather than
         the video, because the type block is a full-width element laid over
         the footage and would otherwise swallow every click. Clicks that land
         on the copy — or on a link — are left alone so text stays selectable. */
      const stage = $('.hero');
      const toggleFilm = () => {
        if (dead) return;
        if (video.paused) { wantPlay = true; play(); } else { wantPlay = false; pause(); }
      };
      if (stage) {
        stage.addEventListener('click', ev => {
          if (ev.target.closest('a, button, input, textarea, .hero__col, .nav, .scroll-cue')) return;
          if (window.getSelection && String(window.getSelection()).length) return;  // a selection, not a tap
          toggleFilm();
        });
        stage.addEventListener('keydown', ev => {
          if (ev.key === ' ' || ev.key === 'Enter') {
            if (ev.target.closest('a, button')) return;
            ev.preventDefault(); toggleFilm();
          }
        });
      }

      /* stop the moving image the moment it is out of sight */
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          for (const e of entries) {
            onScreen = e.isIntersecting;
            if (onScreen) { if (wantPlay && !reduce.matches && !thrifty) play(); }
            else pause();
          }
        }, { threshold: 0.12 }).observe(wrap);
      }

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
        else if (wantPlay) play();
      });

      /* first play: script-driven, so motion preferences are honoured */
      if (reduce.matches || thrifty) {
        wantPlay = false;
        video.removeAttribute('loop');   // a still frame, but genuinely available
        return;
      }
      play();
      const unlock = () => { if (video.paused && wantPlay && !dead) play(); };
      ['pointerdown', 'keydown', 'touchstart', 'scroll'].forEach(ev =>
        window.addEventListener(ev, unlock, { passive: true, once: true }));
    }

    return { init };
  })();

  /* ══ 5 · EYE TURRET DIAGRAM ═══════════════════════════════════════════ */
  const EyeViz = (() => {
    /* Two turrets, two rhythms. The left eye reacts quickly, the right eye
       lags behind it — so the independence is visible, not just asserted.
       A target inside the frontal wedge locks both eyes onto it.          */
    const EYES = [
      { key: 'L', x: 258, y: 252, ease: 0.22, reach: 20, drift: 0.16, phase: 0.0,  w: 0.00040 },
      { key: 'R', x: 642, y: 252, ease: 0.09, reach: 20, drift: 0.30, phase: 2.05, w: 0.00027 }
    ];
    const HEAD = { x: 450, y: 252 };
    const LOCK_HALF = 40 * Math.PI / 180;

    let svg, host, freezeBtn, raf = null, live = false;
    let ptr = null, frozen = false;
    const t0 = performance.now();
    const pupils = {}, rays = {}, reads = {}, needles = {};
    let target = null;
    let locked = false;

    const norm = a => Math.atan2(Math.sin(a), Math.cos(a));
    const bearing = a => String(Math.round(((a * 180 / Math.PI) + 360) % 360)).padStart(3, '0') + '°';

    /* pointer position in viewBox units, clamped to the diagram proper so the
       target marker and the sight lines never run into the readout strip      */
    function toLocal(clientX, clientY) {
      const vb = svg.viewBox.baseVal;
      const r = svg.getBoundingClientRect();
      const scale = Math.min(r.width / vb.width, r.height / vb.height);
      const x = (clientX - r.left - (r.width - vb.width * scale) / 2) / scale;
      const y = (clientY - r.top - (r.height - vb.height * scale) / 2) / scale;
      return { x: clamp(x, 74, 826), y: clamp(y, 54, 322) };
    }

    function targets(now) {
      const t = now - t0;
      const dx = ptr ? ptr.x - HEAD.x : 0;
      const dy = ptr ? ptr.y - HEAD.y : 0;
      locked = !!ptr && Math.abs(norm(Math.atan2(dy, dx) + Math.PI / 2)) < LOCK_HALF && Math.hypot(dx, dy) > 96;

      return EYES.map(e => {
        let angle;
        if (ptr) {
          const lerp = locked ? 1 : 0.34;            // partial aim when unlocked
          const want = Math.atan2(ptr.y - e.y, ptr.x - e.x);
          const rest = (e.key === 'L' ? -1.1 : -1.1 + Math.PI) + Math.sin(t * e.w + e.phase) * e.drift;
          angle = want * lerp + rest * (1 - lerp);
        } else {
          // idle: each turret scans a different arc on its own clock
          angle = e.key === 'L'
            ? -0.45 + Math.sin(t * e.w + e.phase) * 1.25
            :  2.95 + Math.sin(t * e.w * 1.31 + e.phase) * 1.45;
        }
        return { x: Math.cos(angle) * e.reach, y: Math.sin(angle) * e.reach, angle };
      });
    }

    function draw(now) {
      const want = targets(now);
      let settled = true;

      EYES.forEach((e, i) => {
        const w = want[i];
        const g = pupils[e.key];
        const cur = g._v || { x: w.x, y: w.y };
        const nx = cur.x + (w.x - cur.x) * e.ease;
        const ny = cur.y + (w.y - cur.y) * e.ease;
        g._v = { x: nx, y: ny };
        if (Math.abs(w.x - nx) > 0.07 || Math.abs(w.y - ny) > 0.07) settled = false;

        g.setAttribute('transform', `translate(${nx.toFixed(2)} ${ny.toFixed(2)})`);

        const read = reads[e.key];
        if (read) read.textContent = bearing(Math.atan2(ny, nx));

        const m = Math.max(1e-3, Math.hypot(nx, ny));
        const ux = nx / m, uy = ny / m;

        // bearing needle on the rim: 0° points up in SVG space
        const nd = needles[e.key];
        if (nd) nd.setAttribute('transform', `rotate(${(((Math.atan2(ny, nx) * 180 / Math.PI) + 90 + 360) % 360).toFixed(1)} 0 0)`);

        // sight line: short when searching alone, meeting at the target when locked
        const ray = rays[e.key];
        if (ray) {
          ray.setAttribute('x1', e.x); ray.setAttribute('y1', e.y);
          if (locked && ptr) {
            ray.setAttribute('x2', ptr.x.toFixed(1)); ray.setAttribute('y2', ptr.y.toFixed(1));
          } else {
            ray.setAttribute('x2', (e.x + ux * 186).toFixed(1));
            ray.setAttribute('y2', (e.y + uy * 186).toFixed(1));
          }
        }
      });

      if (target) {
        target.setAttribute('transform', ptr ? `translate(${ptr.x.toFixed(1)} ${ptr.y.toFixed(1)})` : 'translate(450 168)');
      }

      host.classList.toggle('is-locked', locked);
      const status = reads.status;
      if (status) {
        const txt = locked ? 'CONVERGED · DEPTH LOCK' : 'SEARCHING · NO OVERLAP';
        if (status.textContent !== txt) status.textContent = txt;
      }

      const idleAndHeld = !ptr && frozen;
      if (live && !idleAndHeld && (!settled || ptr)) raf = requestAnimationFrame(draw);
      else raf = null;
    }

    function start() { if (!raf) raf = requestAnimationFrame(draw); }
    function stop() { if (raf) { cancelAnimationFrame(raf); raf = null; } }

    function init() {
      host = $('[data-eyeviz]');
      if (!host) return;
      svg = $('svg', host);
      freezeBtn = $('[data-eyeviz-freeze]', host);

      $$('[data-pupil]', svg).forEach(g => { pupils[g.dataset.pupil] = g; g._v = null; });
      $$('[data-ray]', svg).forEach(l => { rays[l.dataset.ray] = l; });
      $$('[data-needle]', svg).forEach(g => { needles[g.dataset.needle] = g; });
      target = $('[data-target]', svg);
      $$('[data-read]', svg).forEach(t => { reads[t.dataset.read] = t; });

      if (reduce.matches) {
        // a still, accurate diagram: both eyes forward, one over the other
        EYES.forEach((e, i) => {
          const a = e.key === 'L' ? -1.02 : -2.12;
          const pos = { x: Math.cos(a) * e.reach, y: Math.sin(a) * e.reach };
          pupils[e.key]._v = pos;
          pupils[e.key].setAttribute('transform', `translate(${pos.x.toFixed(1)} ${pos.y.toFixed(1)})`);
          if (reads[e.key]) reads[e.key].textContent = bearing(a);
        });
        host.classList.add('has-target');
        if (target) target.setAttribute('transform','translate(450 168)');
        return;
      }

      const onMove = ev => {
        const pt = ev.touches ? ev.touches[0] : ev;
        ptr = toLocal(pt.clientX, pt.clientY);
        host.classList.add('has-target');
        start();
      };
      svg.addEventListener('pointermove', onMove, { passive: true });
      svg.addEventListener('pointerdown', onMove, { passive: true });
      svg.addEventListener('pointerleave', () => {
        ptr = null;
        host.classList.remove('has-target');
        start();
      });
      svg.addEventListener('pointercancel', () => { ptr = null; host.classList.remove('has-target'); start(); });

      if (freezeBtn) {
        freezeBtn.addEventListener('click', () => {
          frozen = !frozen;
          freezeBtn.setAttribute('aria-pressed', frozen ? 'true' : 'false');
          freezeBtn.textContent = frozen ? 'Resume sweep' : 'Freeze sweep';
          start();
        });
      }

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
          for (const e of entries) {
            live = e.isIntersecting;
            if (live) start(); else stop();
          }
        }, { threshold: 0.12 }).observe(host);
      } else { live = true; start(); }
    }

    return { init };
  })();

  /* ══ 6 · COLOUR ROLE SWITCHER ═════════════════════════════════════════ */
  const Tones = (() => {
    function init() {
      const host = $('[data-tones]');
      if (!host) return;
      const tabs = $$('[role="tab"]', host);
      const panes = $$('[data-pane]', host);
      const field = $('[data-tone-field]', host);
      const num = $('[data-tone-num]', host);
      const nameEl = $('[data-tone-name]', host);
      const hexEl = $('[data-tone-hex]', host);
      const hint = $('[data-tones-hint]', host);

      function select(tab, focus) {
        const key = tab.dataset.tone;
        tabs.forEach(t => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
        tabs.forEach(t => { t.tabIndex = t === tab ? 0 : -1; });
        panes.forEach(p => {
          const on = p.dataset.pane === key;
          p.hidden = !on;
          p.classList.toggle('is-active', on);
          if (on) {
            p.classList.remove('is-entering');
            void p.offsetWidth;
            p.classList.add('is-entering');
          }
        });
        const label = tab.textContent.trim().replace(/^\d+\s*/, '');
        if (field) field.style.backgroundColor = tab.dataset.colour;
        if (num) num.textContent = tab.textContent.trim().split(' ')[0];
        if (nameEl) nameEl.textContent = label;
        if (hexEl) hexEl.textContent = 'PHOTIC FIELD · ' + tab.dataset.colour.toUpperCase();
        if (hint) hint.textContent = label + ' — selected';
        if (focus) tab.focus();
      }

      tabs.forEach((tab, i) => {
        tab.tabIndex = tab.getAttribute('aria-selected') === 'true' ? 0 : -1;
        tab.addEventListener('click', () => select(tab));
        tab.addEventListener('keydown', ev => {
          const keys = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 };
          if (!(ev.key in keys)) return;
          ev.preventDefault();
          let idx = keys[ev.key] === -99 ? 0 : keys[ev.key] === 99 ? tabs.length - 1 : (i + keys[ev.key] + tabs.length) % tabs.length;
          select(tabs[idx], true);
        });
      });

      const first = tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0];
      if (first && first.dataset.colour && field) {
        field.style.backgroundColor = first.dataset.colour;
        if (nameEl) nameEl.textContent = first.textContent.trim().replace(/^\d+\s*/, '');
        if (hexEl) hexEl.textContent = 'PHOTIC FIELD · ' + first.dataset.colour.toUpperCase();
      }
    }
    return { init };
  })();

  /* ══ 7 · MARQUEE + SCALE BAR ══════════════════════════════════════════ */
  function extras() {
    const mq = $('[data-marquee]');
    if (mq && 'IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        for (const e of entries) mq.classList.toggle('is-paused', !e.isIntersecting);
      }, { threshold: 0 }).observe(mq);
    }
    const sb = $('[data-scalebar]');
    if (sb && 'IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        for (const e of entries) sb.classList.toggle('is-in', e.isIntersecting);
      }, { threshold: 0.4 }).observe(sb);
    }
  }

  /* ══ 8 · BOOT ════════════════════════════════════════════════════════ */
  function boot() {
    Motion.init();
    Chrome.init();
    Film.init();
    EyeViz.init();
    Tones.init();
    extras();
    Parallax.init();
    Parallax.measure();

    const reveal = () => Motion.revealHero();
    if (document.fonts && document.fonts.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise(res => window.setTimeout(res, 900))
      ]).then(() => requestAnimationFrame(reveal));
    } else {
      window.setTimeout(reveal, 120);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  // keep the layout honest when the viewport becomes a different shape
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => Parallax.measure(), 150);
  }, { passive: true });
})();
