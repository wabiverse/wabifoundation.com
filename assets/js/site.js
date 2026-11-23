/* wabi foundation — site behavior. no dependencies. */

(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- theme ---------- */

  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("wabi-theme");
    if (saved) root.setAttribute("data-theme", saved);
  } catch (e) {}

  document.addEventListener("click", function (ev) {
    var t = ev.target.closest("[data-theme-toggle]");
    if (!t) return;
    var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("wabi-theme", next); } catch (e) {}
  });

  /* ---------- header shadow ---------- */

  var header = document.querySelector("header.site");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- scroll reveal ---------- */

  var revealables = document.querySelectorAll(".rv");
  if (revealables.length && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        var delay = parseFloat(el.getAttribute("data-delay") || "0");
        setTimeout(function () { el.classList.add("in"); }, delay * 1000);
        io.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- card pointer glow ---------- */

  document.querySelectorAll(".card").forEach(function (card) {
    card.addEventListener("pointermove", function (ev) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (ev.clientX - r.left) + "px");
      card.style.setProperty("--my", (ev.clientY - r.top) + "px");
    });
  });

  /* ---------- copy buttons ---------- */

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sel = btn.getAttribute("data-copy");
      var src = sel ? document.querySelector(sel) : btn.parentElement.querySelector("pre");
      if (!src) return;
      var text = (src.innerText || "").replace(/^\s*#.*$/gm, "").trim();
      navigator.clipboard.writeText(src.innerText.trim()).then(function () {
        var old = btn.textContent;
        btn.textContent = "copied";
        btn.classList.add("done");
        setTimeout(function () { btn.textContent = old; btn.classList.remove("done"); }, 1600);
      }).catch(function () {});
      void text;
    });
  });

  /* ---------- animated counters ---------- */

  var counters = document.querySelectorAll("[data-count]");
  if (counters.length && "IntersectionObserver" in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        cio.unobserve(el);
        var target = parseFloat(el.getAttribute("data-count"));
        var suffix = el.getAttribute("data-suffix") || "";
        var prefix = el.getAttribute("data-prefix") || "";
        var dur = reduced ? 0 : 1100;
        var t0 = performance.now();
        var step = function (now) {
          var p = dur ? Math.min(1, (now - t0) / dur) : 1;
          var e = 1 - Math.pow(1 - p, 3);
          var v = target * e;
          el.textContent = prefix + (target % 1 ? v.toFixed(1) : Math.round(v)) + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- pipeline cycler ---------- */

  var pipe = document.querySelector("[data-pipeline]");
  if (pipe) buildPipeline(pipe);

  function buildPipeline(pipe) {
    var stages = Array.prototype.slice.call(pipe.querySelectorAll(".stage"));
    if (!stages.length) return;
    var caption = document.querySelector("[data-pipe-caption]");
    var DWELL = 2400;

    var glow = document.createElement("span");
    glow.className = "pipe-glow";
    var marker = document.createElement("span");
    marker.className = "pipe-marker";
    var fill = document.createElement("span");
    fill.className = "pipe-fill";
    pipe.appendChild(glow);
    pipe.appendChild(marker);
    pipe.appendChild(fill);

    var i = 0;
    var timer = null;

    function place(el, instant) {
      var x = el.offsetLeft, y = el.offsetTop, w = el.offsetWidth, h = el.offsetHeight;
      [marker, glow].forEach(function (m) {
        if (instant) m.style.transition = "none";
        m.style.left = x + "px";
        m.style.top = y + "px";
        m.style.width = w + "px";
        m.style.height = h + "px";
        if (instant) { void m.offsetWidth; m.style.transition = ""; }
      });
      fill.style.left = x + "px";
      fill.style.top = (y + h - 2) + "px";

      // the fill runs the length of the dwell, then snaps back under the next stage
      fill.style.transitionProperty = "left, top";
      fill.style.width = "0px";
      void fill.offsetWidth;
      if (!reduced) {
        fill.style.transitionProperty = "left, top, width";
        fill.style.transitionDuration = "0.62s, 0.62s, " + (DWELL / 1000) + "s";
        fill.style.transitionTimingFunction = "cubic-bezier(.22,.9,.26,1), cubic-bezier(.22,.9,.26,1), linear";
        fill.style.width = w + "px";
      } else {
        fill.style.width = w + "px";
      }
    }

    function show(instant) {
      var el = stages[i];
      stages.forEach(function (s, n) { s.classList.toggle("on", n === i); });
      place(el, instant);
      marker.classList.add("lit");
      glow.classList.add("lit");

      var note = el.getAttribute("data-note") || "";
      if (caption) {
        if (instant || reduced) {
          caption.textContent = note;
        } else {
          caption.classList.add("swapping");
          setTimeout(function () {
            caption.textContent = note;
            caption.classList.remove("swapping");
          }, 240);
        }
      }
      i = (i + 1) % stages.length;
    }

    // start only once the strip is on screen, so the sweep is not already
    // halfway round by the time anyone looks at it
    var started = false;
    function start() {
      if (started) return;
      started = true;
      show(true);
      if (!reduced) timer = setInterval(show, DWELL);
    }

    if ("IntersectionObserver" in window) {
      var pio = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          pio.unobserve(en.target);
          start();
        });
      }, { threshold: 0.25 });
      pio.observe(pipe);
    } else {
      start();
    }

    // the stages wrap, so a resize moves them under the marker
    var rt;
    function reflow() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var prev = (i - 1 + stages.length) % stages.length;
        if (started) place(stages[prev], true);
      }, 150);
    }
    if (typeof ResizeObserver === "function") new ResizeObserver(reflow).observe(pipe);
    else window.addEventListener("resize", reflow);

    // hovering a stage takes it over, and the loop picks up from there
    stages.forEach(function (el, n) {
      el.addEventListener("pointerenter", function () {
        if (!started || reduced) return;
        clearInterval(timer);
        i = n;
        show(false);
        timer = setInterval(show, DWELL);
      });
    });
  }

  /* ---------- release countdown ---------- */

  document.querySelectorAll("[data-countdown]").forEach(function (el) {
    var target = Date.parse(el.getAttribute("data-countdown"));
    if (isNaN(target)) return;
    var units = [
      { k: "days", d: 86400000 },
      { k: "hours", d: 3600000 },
      { k: "minutes", d: 60000 },
      { k: "seconds", d: 1000 }
    ];
    var cells = units.map(function (u) {
      var box = document.createElement("div");
      box.className = "unit";
      box.innerHTML = '<div class="v">--</div><div class="k">' + u.k + "</div>";
      el.appendChild(box);
      return { box: box, v: box.querySelector(".v"), d: u.d, last: null };
    });
    var tick = function () {
      var left = target - Date.now();
      if (left <= 0) {
        el.innerHTML = '<div class="unit" style="min-width:auto;padding:14px 22px"><div class="v">shipped</div><div class="k">it is out</div></div>';
        clearInterval(timer);
        return;
      }
      cells.forEach(function (c) {
        var v = Math.floor(left / c.d);
        left -= v * c.d;
        var s = String(v).padStart(2, "0");
        if (s !== c.last) {
          c.v.textContent = s;
          c.last = s;
          if (!reduced) {
            c.box.classList.remove("tick");
            void c.box.offsetWidth;
            c.box.classList.add("tick");
          }
        }
      });
    };
    tick();
    var timer = setInterval(tick, 1000);
  });

  /* ---------- looping motion ---------- */

  // safari on macos stops drawing gpu animations while the page scrolls, and it
  // leaves the clipped part of a css animated element unpainted when that part
  // slides into view, so the loops are stepped here with a style write per frame

  if (!reduced) buildLoops();

  function buildLoops() {
    var track = document.querySelector(".strip .track");
    var blobs = Array.prototype.slice.call(document.querySelectorAll(".aurora i"));
    var scan = document.querySelector(".viewport .scanline");
    var plats = Array.prototype.slice.call(document.querySelectorAll(".plat.soon"));
    if (!track && !blobs.length && !scan && !plats.length) return;

    // the same curve as css ease-in-out
    function easeInOut(x) {
      var lo = 0, hi = 1;
      for (var n = 0; n < 24; n++) {
        var t = (lo + hi) / 2;
        var bx = 3 * (1 - t) * (1 - t) * t * 0.42 + 3 * (1 - t) * t * t * 0.58 + t * t * t;
        if (bx < x) lo = t; else hi = t;
      }
      var u = (lo + hi) / 2;
      return 3 * (1 - u) * u * u + u * u * u;
    }

    // one loop is the distance from the first label to its repeat, so the
    // wrap lands exactly on the same pixel
    var period = 0;
    function measure() {
      if (!track) return;
      var spans = track.children;
      var half = spans.length / 2;
      period = half >= 1 ? spans[half].offsetLeft - spans[0].offsetLeft : track.scrollWidth / 2;
    }
    measure();
    if (track) {
      if (typeof ResizeObserver === "function") new ResizeObserver(measure).observe(track);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    }

    // the blobs keep the offsets their css delays gave them
    var blobDelay = [0, 9, 17];

    root.classList.add("js-motion");
    var t0 = performance.now();

    function step(now) {
      var s = (now - t0) / 1000;

      if (track && period > 0) {
        track.style.transform = "translateX(" + (-((s / 46) * period) % period) + "px)";
      }

      blobs.forEach(function (el, n) {
        var local = s + (blobDelay[n] || 0);
        var iter = Math.floor(local / 26);
        var p = (local % 26) / 26;
        if (iter % 2) p = 1 - p;
        var e = easeInOut(p);
        el.style.transform = "translate3d(" + 5 * e + "vw, " + 7 * e + "vh, 0) scale(" + (1 + 0.15 * e) + ")";
      });

      if (scan) {
        scan.style.transform = "translateY(" + (-120 + 680 * ((s % 7) / 7)) + "px)";
      }

      if (plats.length) {
        var q = (s % 5.5) / 5.5;
        var x = q < 0.62 ? -100 : -100 + 200 * easeInOut((q - 0.62) / 0.38);
        plats.forEach(function (el) { el.style.setProperty("--shimmer-x", x + "%"); });
      }

      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- hero viewport: rotating wireframe ---------- */

  var hero = document.querySelector("[data-viewport]");
  if (hero) buildViewport(hero);

  function buildViewport(canvas) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    function resize() {
      var r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      if (Math.round(r.width) === Math.round(W) && Math.round(r.height) === Math.round(H)) return;
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // on a phone the box is sized by aspect-ratio, which can still be resolving when
    // this runs. measuring once leaves the sphere collapsed to a dot in the middle, so
    // watch the element instead of waiting for a window resize that never comes.
    if (typeof ResizeObserver === "function") {
      new ResizeObserver(resize).observe(canvas);
    } else {
      window.addEventListener("resize", resize);
      window.addEventListener("orientationchange", resize);
    }

    /* icosahedron, subdivided twice, normalized to a sphere */
    var t = (1 + Math.sqrt(5)) / 2;
    var verts = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
    ];
    var faces = [
      [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
      [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
      [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
      [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1]
    ];

    var cache = {};
    function mid(a, b) {
      var key = a < b ? a + "_" + b : b + "_" + a;
      if (cache[key] !== undefined) return cache[key];
      var va = verts[a], vb = verts[b];
      verts.push([(va[0] + vb[0]) / 2, (va[1] + vb[1]) / 2, (va[2] + vb[2]) / 2]);
      cache[key] = verts.length - 1;
      return cache[key];
    }
    for (var s = 0; s < 2; s++) {
      var next = [];
      faces.forEach(function (f) {
        var a = mid(f[0], f[1]), b = mid(f[1], f[2]), c = mid(f[2], f[0]);
        next.push([f[0], a, c], [f[1], b, a], [f[2], c, b], [a, b, c]);
      });
      faces = next;
    }
    verts = verts.map(function (v) {
      var l = Math.hypot(v[0], v[1], v[2]);
      return [v[0] / l, v[1] / l, v[2] / l];
    });

    var edgeSet = {};
    var edges = [];
    faces.forEach(function (f) {
      [[f[0], f[1]], [f[1], f[2]], [f[2], f[0]]].forEach(function (e) {
        var key = Math.min(e[0], e[1]) + "_" + Math.max(e[0], e[1]);
        if (edgeSet[key]) return;
        edgeSet[key] = 1;
        edges.push(e);
      });
    });

    /* an orbiting dust field, like a point cloud around the asset */
    var dust = [];
    for (var d = 0; d < 170; d++) {
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      var rad = 1.35 + Math.random() * 0.85;
      dust.push({
        p: [rad * Math.sin(ph) * Math.cos(th), rad * Math.cos(ph) * 0.62, rad * Math.sin(ph) * Math.sin(th)],
        s: 0.4 + Math.random() * 1.1,
        o: 0.12 + Math.random() * 0.4
      });
    }

    var mx = 0, my = 0, tx = 0, ty = 0;
    canvas.parentElement.addEventListener("pointermove", function (ev) {
      var r = canvas.getBoundingClientRect();
      tx = ((ev.clientX - r.left) / r.width - 0.5) * 0.6;
      ty = ((ev.clientY - r.top) / r.height - 0.5) * 0.5;
    });
    canvas.parentElement.addEventListener("pointerleave", function () { tx = 0; ty = 0; });

    function rot(p, ax, ay) {
      var x = p[0], y = p[1], z = p[2];
      var ca = Math.cos(ay), sa = Math.sin(ay);
      var x1 = x * ca - z * sa, z1 = x * sa + z * ca;
      var cb = Math.cos(ax), sb = Math.sin(ax);
      var y1 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
      return [x1, y1, z2];
    }

    function project(p) {
      var scale = Math.min(W, H) * 0.3;
      var persp = 3.2 / (3.2 + p[2]);
      return [W / 2 + p[0] * scale * persp, H / 2 + p[1] * scale * persp, persp];
    }

    function lerpColor(p) {
      /* magenta -> violet -> blue across the sweep */
      var c1 = [214, 38, 140], c2 = [123, 63, 228], c3 = [47, 99, 230];
      var a, b, k;
      if (p < 0.5) { a = c1; b = c2; k = p * 2; } else { a = c2; b = c3; k = (p - 0.5) * 2; }
      return [
        Math.round(a[0] + (b[0] - a[0]) * k),
        Math.round(a[1] + (b[1] - a[1]) * k),
        Math.round(a[2] + (b[2] - a[2]) * k)
      ];
    }

    var fpsEl = document.querySelector("[data-fps]");
    var frames = 0, fpsAt = performance.now();
    var start = performance.now();

    function frame(now) {
      if (!W || !H) { requestAnimationFrame(frame); return; }
      var time = (now - start) / 1000;
      mx += (ty - mx) * 0.06;
      my += (tx - my) * 0.06;

      var ax = -0.38 + mx + Math.sin(time * 0.22) * 0.1;
      var ay = time * (reduced ? 0 : 0.17) + my;

      ctx.clearRect(0, 0, W, H);

      /* dust first, behind the shell */
      var dp = dust.map(function (g) {
        var r = rot(g.p, ax, ay);
        return { pr: project(r), z: r[2], g: g };
      }).sort(function (a, b) { return b.z - a.z; });

      dp.forEach(function (o) {
        var depth = (o.z + 2.2) / 4.4;
        var c = lerpColor(Math.max(0, Math.min(1, depth)));
        ctx.globalAlpha = o.g.o * (0.35 + depth * 0.65);
        ctx.fillStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
        ctx.beginPath();
        ctx.arc(o.pr[0], o.pr[1], o.g.s * o.pr[2], 0, Math.PI * 2);
        ctx.fill();
      });

      /* the shell */
      var pv = verts.map(function (v) {
        var r = rot(v, ax, ay);
        return { pr: project(r), z: r[2] };
      });

      ctx.lineWidth = 1;
      edges.forEach(function (e) {
        var a = pv[e[0]], b = pv[e[1]];
        var z = (a.z + b.z) / 2;
        var depth = (z + 1) / 2;
        var sweep = (Math.sin(time * 0.8 - depth * 3.4) + 1) / 2;
        var c = lerpColor(Math.max(0, Math.min(1, depth * 0.65 + sweep * 0.35)));
        ctx.globalAlpha = 0.06 + depth * 0.5 + sweep * 0.16;
        ctx.strokeStyle = "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
        ctx.beginPath();
        ctx.moveTo(a.pr[0], a.pr[1]);
        ctx.lineTo(b.pr[0], b.pr[1]);
        ctx.stroke();
      });

      /* vertices */
      pv.forEach(function (p) {
        var depth = (p.z + 1) / 2;
        if (depth < 0.42) return;
        ctx.globalAlpha = (depth - 0.42) * 1.1;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(p.pr[0], p.pr[1], 0.9 * p.pr[2], 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;

      frames++;
      if (fpsEl && now - fpsAt > 500) {
        fpsEl.textContent = Math.round((frames * 1000) / (now - fpsAt));
        frames = 0;
        fpsAt = now;
      }

      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---------- year ---------- */

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
