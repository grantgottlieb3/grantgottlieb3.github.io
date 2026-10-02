/* ==========================================================================
   EMMA'S GALLERY: SCRIPT
   You should never need to edit this file to manage photos. Use photos.js.

   Sections
     1. Settings
     2. Data cleanup
     3. Helpers
     4. Filter bubbles
     5. Photo measuring
     6. Collage layout
     7. Filtering and transitions
     8. Lightbox
     9. Start up

   Why no layout library: Masonry.js and similar tools place photos well,
   but they do not handle the enter, leave, and glide animations this site
   needs, and they would still need custom code for the organic offsets.
   The hand built layout in section 6 is about 50 lines, has no outside
   dependency, and works offline from a local folder.
   ========================================================================== */

(function () {
  "use strict";

  /* 1. SETTINGS =========================================================== */
  const PATHS = {
    thumbs: "images/thumbs/",
    full: "images/full/",
  };

  // Columns by collage width in pixels. Phones always get two.
  const COLUMN_STEPS = [
    { minWidth: 1180, columns: 4 },
    { minWidth: 760, columns: 3 },
    { minWidth: 0, columns: 2 },
  ];

  const GAP = { desktop: 22, phone: 12 };

  // Keep these in step with --t-leave and --t-fade in styles.css.
  const TIMING = {
    leave: 300,
    enterDelay: 140,     // let leaving photos start fading before new ones appear
    enterStagger: 45,    // delay between each entering photo
    maxStagger: 650,
    lightboxFade: 260,
    lightboxSwap: 140,
  };

  const SWIPE_MIN = 45;  // pixels of horizontal movement that count as a swipe

  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = () => motionQuery.matches;


  /* 2. DATA CLEANUP ========================================================
     Reads photos.js and tidies each entry so small typos (extra spaces,
     "true" in quotes) do not break the page. */
  const rawPhotos = typeof PHOTOS !== "undefined" && Array.isArray(PHOTOS) ? PHOTOS : [];
  const preferredOrder = typeof CATEGORY_ORDER !== "undefined" && Array.isArray(CATEGORY_ORDER) ? CATEGORY_ORDER : [];

  const photos = rawPhotos
    .filter((p) => p && typeof p.file === "string" && p.file.trim())
    .map((p) => ({
      file: p.file.trim(),
      category: String(p.category || "").trim(),
      subcategory: String(p.subcategory || "").trim(),
      featured: p.featured === true || p.featured === "true",
      alt: String(p.alt || "").trim(),
      width: Number(p.width) || 0,
      height: Number(p.height) || 0,
      ratio: 0,   // height divided by width, filled in by section 5
    }));


  /* 3. HELPERS ============================================================ */
  const $ = (selector) => document.querySelector(selector);

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  const thumbSrc = (photo) => PATHS.thumbs + encodeURIComponent(photo.file);
  const fullSrc = (photo) => PATHS.full + encodeURIComponent(photo.file);

  // Repeatable "random" number between 0 and 1 based on a word. The same
  // photo always gets the same offset, so the collage stays put between visits.
  function seeded(text, salt) {
    let h = 2166136261;
    const s = text + "|" + salt;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10000) / 10000;
  }



  /* 4. FILTER BUBBLES ===================================================== */
  const filtersEl = $("#filters");
  const subfiltersEl = $("#subfilters");

  // A filter looks like { type: "all" } or { type: "featured" } or
  // { type: "category", category: "Sessions", sub: "Grad" }.
  let activeFilter = null;

  function categoryList() {
    const seen = [];
    photos.forEach((p) => {
      if (p.category && !seen.includes(p.category)) seen.push(p.category);
    });
    const ordered = preferredOrder.filter((c) => seen.includes(c));
    seen.forEach((c) => { if (!ordered.includes(c)) ordered.push(c); });
    return ordered;   // only categories that have at least one photo
  }

  function subcategoryList(category) {
    const seen = [];
    photos.forEach((p) => {
      if (p.category === category && p.subcategory && !seen.includes(p.subcategory)) seen.push(p.subcategory);
    });
    return seen;
  }

  function matches(photo, filter) {
    if (filter.type === "all") return true;
    if (filter.type === "featured") return photo.featured;
    return photo.category === filter.category && (!filter.sub || photo.subcategory === filter.sub);
  }

  function makePill(label, isSub, onClick) {
    const pill = el("button", isSub ? "pill pill--sub" : "pill");
    pill.type = "button";
    pill.textContent = label;
    pill.setAttribute("aria-pressed", "false");

    // Gentle, unique drift for each bubble: a few pixels over 8 to 13 seconds.
    const r = (salt) => seeded(label, salt);
    pill.style.setProperty("--dx", ((r("dx") * 2 - 1) * 3).toFixed(1) + "px");
    pill.style.setProperty("--dy", ((r("dy") * 2 - 1) * 4).toFixed(1) + "px");
    pill.style.setProperty("--dur", (8 + r("dur") * 5).toFixed(2) + "s");
    pill.style.setProperty("--delay", (-r("delay") * 12).toFixed(2) + "s");

    pill.addEventListener("click", onClick);
    return pill;
  }

  function buildFilters() {
    filtersEl.innerHTML = "";

    if (photos.some((p) => p.featured)) {
      const pill = makePill("Featured", false, () => setFilter({ type: "featured" }));
      pill.dataset.key = "featured";
      filtersEl.appendChild(pill);
    }

    categoryList().forEach((category) => {
      const pill = makePill(category, false, () => {
        // Clicking an already selected category clears its subcategory.
        setFilter({ type: "category", category });
      });
      pill.dataset.key = "category:" + category;
      filtersEl.appendChild(pill);
    });

    const allPill = makePill("All", false, () => setFilter({ type: "all" }));
    allPill.dataset.key = "all";
    filtersEl.appendChild(allPill);
  }

  function updateFilterStates() {
    const key = activeFilter.type === "category" ? "category:" + activeFilter.category : activeFilter.type;
    filtersEl.querySelectorAll(".pill").forEach((pill) => {
      pill.setAttribute("aria-pressed", String(pill.dataset.key === key));
    });

    // Subcategory bubbles appear only under a category that has them (Sessions).
    const category = activeFilter.type === "category" ? activeFilter.category : null;
    const subs = category ? subcategoryList(category) : [];

    if (!subs.length) {
      subfiltersEl.hidden = true;
      subfiltersEl.innerHTML = "";
      subfiltersEl.dataset.category = "";
      return;
    }

    // Build the row only when the category changes, so the soft entrance
    // plays once instead of on every subcategory click.
    if (subfiltersEl.dataset.category !== category) {
      subfiltersEl.innerHTML = "";
      subfiltersEl.dataset.category = category;
      subs.forEach((sub, i) => {
        const pill = makePill(sub, true, () => {
          const same = activeFilter.sub === sub;
          setFilter({ type: "category", category, sub: same ? undefined : sub });
        });
        pill.dataset.key = sub;
        pill.style.animationDelay = (i * 60) + "ms, " + pill.style.getPropertyValue("--delay");
        subfiltersEl.appendChild(pill);
      });
      subfiltersEl.hidden = false;
    }

    subfiltersEl.querySelectorAll(".pill").forEach((pill) => {
      pill.setAttribute("aria-pressed", String(pill.dataset.key === activeFilter.sub));
    });
  }

  function setFilter(filter) {
    const same = activeFilter &&
      activeFilter.type === filter.type &&
      activeFilter.category === filter.category &&
      activeFilter.sub === filter.sub;
    if (same) return;
    activeFilter = filter;
    updateFilterStates();
    showPhotos(filter);
  }


  /* 5. PHOTO MEASURING =====================================================
     A collage with no gaps and no cropping needs each photo's shape before
     placing it. If photos.js lists width and height, the page uses those.
     Otherwise it loads the small thumbnail once to read its shape. The
     browser then reuses that download for the collage itself. */
  const measuring = new Map();

  function measure(photo) {
    if (photo.ratio) return Promise.resolve(photo.ratio);
    if (photo.width > 0 && photo.height > 0) {
      photo.ratio = photo.height / photo.width;
      return Promise.resolve(photo.ratio);
    }
    if (measuring.has(photo.file)) return measuring.get(photo.file);

    const job = new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => {
        photo.ratio = probe.naturalWidth ? probe.naturalHeight / probe.naturalWidth : 1;
        resolve(photo.ratio);
      };
      probe.onerror = () => {
        console.warn("Emma's Gallery: could not find " + thumbSrc(photo) + ". Check the filename in photos.js.");
        photo.ratio = 1;   // keep a square spot so the layout still works
        resolve(1);
      };
      probe.src = thumbSrc(photo);
    });
    measuring.set(photo.file, job);
    return job;
  }


  /* 6. COLLAGE LAYOUT ======================================================
     Masonry: each photo drops into the shortest column. For an organic,
     curated feel each photo gets a slightly different size and offset
     inside its column. Featured photos fill their column, so they read
     larger. Offsets stay small, so no gaps open up. */
  const collageEl = $("#collage");

  function columnCount(width) {
    return COLUMN_STEPS.find((step) => width >= step.minWidth).columns;
  }

  function computeLayout(list) {
    const width = collageEl.clientWidth;
    const columns = columnCount(width);
    const phone = columns <= 2;
    const gap = phone ? GAP.phone : GAP.desktop;
    const columnWidth = (width - gap * (columns - 1)) / columns;
    const heights = new Array(columns).fill(0);
    const featuredOnly = list.length > 0 && list.every((p) => p.featured);

    const positions = list.map((photo) => {
      const rSize = seeded(photo.file, "size");
      const rX = seeded(photo.file, "x");
      const rY = seeded(photo.file, "y");

      // Size as a share of the column width.
      let scale;
      if (featuredOnly) scale = phone ? 0.92 + rSize * 0.08 : 0.86 + rSize * 0.14;
      else if (photo.featured) scale = 1;
      else scale = phone ? 0.84 + rSize * 0.1 : 0.74 + rSize * 0.16;

      const w = columnWidth * scale;
      const h = w * (photo.ratio || 1);

      let col = 0;
      for (let i = 1; i < columns; i++) if (heights[i] < heights[col] - 0.5) col = i;

      const x = col * (columnWidth + gap) + (columnWidth - w) * rX;
      const y = heights[col] + rY * gap * 1.2;
      heights[col] = y + h + gap;

      return { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
    });

    return { positions, height: Math.max(0, Math.round(Math.max(...heights) - gap)) };
  }


  /* 7. FILTERING AND TRANSITIONS ========================================== */
  const tiles = new Map();   // file name to its tile
  let visibleList = [];      // photos currently showing, in order
  let filterRun = 0;         // ignores slow measurements from an older click

  // One tile per photo, built once, in photos.js order, so keyboard Tab
  // order follows the collage.
  function buildTiles() {
    photos.forEach((photo) => {
      const tile = el("div", "tile is-hidden");
      const anim = el("div", "tile-anim");
      const btn = el("button", "tile-btn");
      const img = el("img");

      btn.type = "button";
      btn.tabIndex = -1;
      img.alt = photo.alt;
      img.loading = "lazy";
      img.decoding = "async";
      if (photo.width && photo.height) {
        img.width = photo.width;
        img.height = photo.height;
      }

      img.addEventListener("load", () => tile.classList.add("is-loaded"));
      btn.addEventListener("click", () => openLightbox(photo));

      btn.appendChild(img);
      anim.appendChild(btn);
      tile.appendChild(anim);
      collageEl.appendChild(tile);

      tiles.set(photo.file, { photo, tile, btn, img, visible: false, timer: 0 });
    });
  }

  function place(entry, pos) {
    const s = entry.tile.style;
    s.transform = "translate3d(" + pos.x + "px," + pos.y + "px,0)";
    s.width = pos.w + "px";
    s.height = pos.h + "px";
  }

  function leave(entry) {
    entry.visible = false;
    entry.btn.tabIndex = -1;
    entry.tile.classList.add("is-leaving");
    clearTimeout(entry.timer);
    entry.timer = setTimeout(() => {
      entry.tile.classList.add("is-hidden");
      entry.tile.classList.remove("is-leaving");
    }, TIMING.leave + 40);
  }

  function enter(entry, pos, order) {
    clearTimeout(entry.timer);
    entry.visible = true;
    entry.btn.tabIndex = 0;

    // Caught halfway out: turn it around and glide it to its new spot.
    if (entry.tile.classList.contains("is-leaving")) {
      entry.tile.classList.remove("is-leaving");
      place(entry, pos);
      return;
    }

    // Set the start state with no animation, then let it fade and scale in.
    if (!entry.img.src) entry.img.src = thumbSrc(entry.photo);
    const t = entry.tile;
    t.classList.add("no-transition", "is-entering");
    t.classList.remove("is-hidden");
    place(entry, pos);
    void t.offsetWidth;   // apply the start state before animating
    t.classList.remove("no-transition");

    const delay = Math.min(TIMING.enterDelay + order * TIMING.enterStagger, TIMING.maxStagger);
    t.style.setProperty("--stagger", delay + "ms");
    requestAnimationFrame(() => t.classList.remove("is-entering"));
    entry.timer = setTimeout(() => t.style.removeProperty("--stagger"), delay + 500);
  }

  async function showPhotos(filter) {
    const run = ++filterRun;
    const list = photos.filter((p) => matches(p, filter));
    await Promise.all(list.map(measure));
    if (run !== filterRun) return;   // a newer click took over

    visibleList = list;
    const keep = new Set(list.map((p) => p.file));
    tiles.forEach((entry) => {
      if (entry.visible && !keep.has(entry.photo.file)) leave(entry);
    });

    const { positions, height } = computeLayout(list);
    let order = 0;
    list.forEach((photo, i) => {
      const entry = tiles.get(photo.file);
      if (entry.visible) place(entry, positions[i]);
      else enter(entry, positions[i], order++);
    });
    collageEl.style.height = height + "px";
  }

  // Re-flow on resize without animation, so photos do not trail the window.
  let lastWidth = 0;
  let resizeTimer = 0;
  function relayout() {
    const width = collageEl.clientWidth;
    if (!visibleList.length || width === lastWidth) return;
    lastWidth = width;
    collageEl.classList.add("is-resizing");
    const { positions, height } = computeLayout(visibleList);
    visibleList.forEach((photo, i) => place(tiles.get(photo.file), positions[i]));
    collageEl.style.height = height + "px";
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => collageEl.classList.remove("is-resizing"), 150);
  }


  /* 8. LIGHTBOX =========================================================== */
  const lb = {
    root: $("#lightbox"),
    img: $("#lightbox .lb-img"),
    prev: $("#lightbox .lb-prev"),
    next: $("#lightbox .lb-next"),
    close: $("#lightbox .lb-close"),
    list: [],
    index: 0,
    isOpen: false,
    returnFocus: null,
    run: 0,
    closeTimer: 0,
  };

  // Largest size that fits the screen while leaving a calm margin.
  function fitLightboxImage(photo) {
    const phone = window.innerWidth <= 640;
    const maxW = Math.min(window.innerWidth * (phone ? 0.92 : 0.74), 1500);
    const maxH = window.innerHeight * (phone ? 0.7 : 0.78);
    const ratio = photo.ratio || 1;
    let w = maxW;
    let h = w * ratio;
    if (h > maxH) { h = maxH; w = h / ratio; }
    lb.img.style.width = Math.round(w) + "px";
    lb.img.style.height = Math.round(h) + "px";
  }

  function loadLightboxPhoto(photo, run) {
    lb.img.alt = photo.alt;
    fitLightboxImage(photo);
    lb.img.src = thumbSrc(photo);   // already downloaded, shows instantly
    lb.img.classList.remove("is-swapping");

    const full = new Image();
    full.onload = () => { if (run === lb.run) lb.img.src = full.src; };
    full.src = fullSrc(photo);

    // Warm up the neighbors so arrows feel instant.
    [-1, 1].forEach((step) => {
      const n = lb.list[(lb.index + step + lb.list.length) % lb.list.length];
      if (n && n !== photo) new Image().src = fullSrc(n);
    });
  }

  function showLightboxPhoto(index) {
    const count = lb.list.length;
    lb.index = (index + count) % count;
    const photo = lb.list[lb.index];
    const run = ++lb.run;

    if (!lb.isOpen) {
      loadLightboxPhoto(photo, run);
      return;
    }
    lb.img.classList.add("is-swapping");
    setTimeout(() => { if (run === lb.run) loadLightboxPhoto(photo, run); }, TIMING.lightboxSwap);
  }

  function openLightbox(photo) {
    lb.list = visibleList.slice();   // arrows cycle through the current filter only
    const index = lb.list.indexOf(photo);
    if (index < 0) return;

    clearTimeout(lb.closeTimer);
    lb.returnFocus = document.activeElement;
    const single = lb.list.length < 2;
    lb.prev.hidden = single;
    lb.next.hidden = single;

    showLightboxPhoto(index);
    lb.isOpen = true;
    lb.root.hidden = false;
    document.documentElement.classList.add("lb-locked");
    requestAnimationFrame(() => lb.root.classList.add("is-open"));
    lb.close.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lb.isOpen) return;
    lb.isOpen = false;
    lb.run++;
    lb.root.classList.remove("is-open");
    document.documentElement.classList.remove("lb-locked");
    lb.closeTimer = setTimeout(() => {
      lb.root.hidden = true;
      lb.img.removeAttribute("src");
    }, reducedMotion() ? 0 : TIMING.lightboxFade);
    if (lb.returnFocus && lb.returnFocus.focus) lb.returnFocus.focus({ preventScroll: true });
  }

  const step = (n) => { if (lb.list.length > 1) showLightboxPhoto(lb.index + n); };

  lb.close.addEventListener("click", closeLightbox);
  lb.prev.addEventListener("click", () => step(-1));
  lb.next.addEventListener("click", () => step(1));

  // Backdrop click closes. Clicks on the photo itself do nothing.
  lb.root.addEventListener("click", (e) => {
    if (e.target === lb.root || e.target.classList.contains("lb-stage")) closeLightbox();
  });

  document.addEventListener("keydown", (e) => {
    if (!lb.isOpen) return;
    if (e.key === "Escape") { e.preventDefault(); closeLightbox(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    else if (e.key === "Tab") {
      // Keep keyboard focus inside the lightbox while it is open.
      const focusable = [lb.close, lb.prev, lb.next].filter((b) => !b.hidden);
      const i = focusable.indexOf(document.activeElement);
      e.preventDefault();
      const nextIndex = e.shiftKey ? (i <= 0 ? focusable.length - 1 : i - 1) : (i + 1) % focusable.length;
      focusable[nextIndex].focus();
    }
  });

  // Swipe left or right on phones. Two finger gestures (pinch) are ignored.
  let touchStart = null;
  lb.root.addEventListener("touchstart", (e) => {
    touchStart = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
  }, { passive: true });

  lb.root.addEventListener("touchend", (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * 1.3) step(dx < 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener("resize", () => {
    if (lb.isOpen) fitLightboxImage(lb.list[lb.index]);
  });


  /* 9. START UP =========================================================== */
  if (!photos.length) {
    collageEl.innerHTML = '<p class="notice">No photos yet. Add some in photos.js.</p>';
    return;
  }

  buildFilters();
  buildTiles();

  const hasFeatured = photos.some((p) => p.featured);
  setFilter(hasFeatured ? { type: "featured" } : { type: "all" });

  if ("ResizeObserver" in window) new ResizeObserver(() => requestAnimationFrame(relayout)).observe(collageEl);
  else window.addEventListener("resize", relayout);

  lastWidth = collageEl.clientWidth;
})();
