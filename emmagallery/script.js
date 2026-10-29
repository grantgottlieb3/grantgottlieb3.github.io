/* ==========================================================================
   EMMA'S GALLERY: SCRIPT
   You should never need to edit this file to manage photos. Use photos.js.

   Sections
     1. Settings
     2. Data cleanup
     3. Helpers
     4. Filter bubbles
     5. Photo measuring
     6. Center-out cluster layout
     7. Filtering and transitions
     8. Pan, zoom, and fitting
     9. Lightbox
    10. Start up

   The layout and gestures are hand built so the gallery stays deterministic,
   dependency-free, and usable when opened straight from a local folder.
   ========================================================================== */

(function () {
  "use strict";

  /* 1. SETTINGS =========================================================== */
  const PATHS = {
    thumbs: "images/thumbs/",
    full: "images/full/",
  };

  // The cluster lives in its own fixed coordinate system. Because these
  // values never depend on the viewport, resizing the window cannot reshuffle
  // photos and adding a regular photo at the end cannot move earlier ones.
  const LAYOUT = {
    gap: 24,
    regularEdge: 232,     // square root of a regular tile's approximate area
    featuredEdge: 328,    // about twice the area of a regular tile
    sizeJitter: 0.08,
  };

  const VIEW = {
    paddingDesktop: 32,
    paddingPhone: 18,
    maxZoom: 6,
    wheelSpeed: 0.0015,
    clickSlop: 5,
    hoverScale: 1.08,
  };

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
      thumbWidth: 0,
      thumbHeight: 0,
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
  // photo always gets the same choices, so the cluster stays put between visits.
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
  let filterLayoutPending = false;

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
    updateGalleryHeight();
    // showPhotos owns the refit while its image measurements are pending.
    // This prevents a header-height ResizeObserver from fitting the old set.
    filterLayoutPending = true;
    showPhotos(filter);
  }


  /* 5. PHOTO MEASURING =====================================================
     A cluster with no cropping needs each photo's shape before placing it.
     If photos.js lists width and height, the page uses those.
     Otherwise it loads the small thumbnail once to read its shape. The
     browser then reuses that download for the collage itself. */
  const measuring = new Map();

  function measure(photo) {
    if (photo.ratio) return Promise.resolve(photo.ratio);
    if (photo.width > 0 && photo.height > 0) {
      photo.ratio = photo.height / photo.width;
      photo.thumbWidth = photo.width;
      photo.thumbHeight = photo.height;
      return Promise.resolve(photo.ratio);
    }
    if (measuring.has(photo.file)) return measuring.get(photo.file);

    const job = new Promise((resolve) => {
      const probe = new Image();
      probe.onload = () => {
        photo.thumbWidth = probe.naturalWidth;
        photo.thumbHeight = probe.naturalHeight;
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


  /* 6. CENTER-OUT CLUSTER LAYOUT ===========================================
     Photos use a fixed visual area while preserving their true aspect ratio.
     Featured photos are placed first and are larger; each group retains its
     photos.js order. Every new rectangle takes the available position whose
     center is closest to the origin.

     For an axis-aligned rectangle, the nearest free position must sit either
     on the center axis or on one of the exclusion boundaries made by an
     earlier rectangle. Trying every X boundary with every Y boundary therefore
     finds the nearest spot exactly, rather than sampling a loose spiral. */
  const collageEl = $("#collage");
  const worldEl = $("#cluster-world");
  const layoutCache = new Map();

  function tileSize(photo) {
    const base = photo.featured ? LAYOUT.featuredEdge : LAYOUT.regularEdge;
    const edge = base * (1 - LAYOUT.sizeJitter / 2 + seeded(photo.file, "size") * LAYOUT.sizeJitter);
    const rootRatio = Math.sqrt(photo.ratio || 1);
    return { w: edge / rootRatio, h: edge * rootRatio };
  }

  function uniqueNumbers(values) {
    const seen = new Set();
    return values.filter((value) => {
      const key = value.toFixed(6);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function overlapsWithGap(rect, other) {
    const epsilon = 0.000001;
    return rect.x < other.x + other.w + LAYOUT.gap - epsilon &&
      rect.x + rect.w > other.x - LAYOUT.gap + epsilon &&
      rect.y < other.y + other.h + LAYOUT.gap - epsilon &&
      rect.y + rect.h > other.y - LAYOUT.gap + epsilon;
  }

  function scorePlacement(rect, bounds, preferredAngle) {
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    const minX = Math.min(bounds.minX, rect.x);
    const minY = Math.min(bounds.minY, rect.y);
    const maxX = Math.max(bounds.maxX, rect.x + rect.w);
    const maxY = Math.max(bounds.maxY, rect.y + rect.h);
    const angle = Math.atan2(cy, cx);
    const angleDelta = Math.abs(Math.atan2(
      Math.sin(angle - preferredAngle),
      Math.cos(angle - preferredAngle)
    ));

    return [
      cx * cx + cy * cy,
      Math.max(Math.abs(minX), Math.abs(minY), Math.abs(maxX), Math.abs(maxY)),
      (maxX - minX) * (maxY - minY),
      Math.pow(minX + maxX, 2) + Math.pow(minY + maxY, 2),
      angleDelta,
      rect.y,
      rect.x,
    ];
  }

  function scoreIsBetter(score, bestScore) {
    if (!bestScore) return true;
    for (let i = 0; i < score.length; i++) {
      if (score[i] < bestScore[i] - 0.000001) return true;
      if (score[i] > bestScore[i] + 0.000001) return false;
    }
    return false;
  }

  function computeLayout(list) {
    const cacheKey = list.map((photo) => photo.file).join("\u001f");
    if (layoutCache.has(cacheKey)) return layoutCache.get(cacheKey);

    const ordered = list.filter((photo) => photo.featured)
      .concat(list.filter((photo) => !photo.featured));
    const positions = new Map();
    const placed = [];
    let bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

    ordered.forEach((photo, index) => {
      const size = tileSize(photo);
      let best = null;
      let bestScore = null;

      if (!index) {
        best = { x: -size.w / 2, y: -size.h / 2, w: size.w, h: size.h };
      } else {
        const xs = [-size.w / 2];
        const ys = [-size.h / 2];
        placed.forEach((other) => {
          xs.push(other.x - LAYOUT.gap - size.w, other.x + other.w + LAYOUT.gap);
          ys.push(other.y - LAYOUT.gap - size.h, other.y + other.h + LAYOUT.gap);
        });

        const candidateXs = uniqueNumbers(xs);
        const candidateYs = uniqueNumbers(ys);
        const preferredAngle = seeded(photo.file, "direction") * Math.PI * 2 - Math.PI;

        candidateXs.forEach((x) => {
          candidateYs.forEach((y) => {
            const candidate = { x, y, w: size.w, h: size.h };
            if (placed.some((other) => overlapsWithGap(candidate, other))) return;
            const score = scorePlacement(candidate, bounds, preferredAngle);
            if (scoreIsBetter(score, bestScore)) {
              best = candidate;
              bestScore = score;
            }
          });
        });
      }

      // Boundary candidates always include a free outer corner. Keep a simple
      // fallback so a malformed dimension can never prevent the gallery loading.
      if (!best) {
        best = { x: bounds.maxX + LAYOUT.gap, y: -size.h / 2, w: size.w, h: size.h };
      }

      positions.set(photo.file, best);
      placed.push(best);
      bounds = index ? {
        minX: Math.min(bounds.minX, best.x),
        minY: Math.min(bounds.minY, best.y),
        maxX: Math.max(bounds.maxX, best.x + best.w),
        maxY: Math.max(bounds.maxY, best.y + best.h),
      } : {
        minX: best.x,
        minY: best.y,
        maxX: best.x + best.w,
        maxY: best.y + best.h,
      };
    });

    const layout = { positions, bounds };
    layoutCache.set(cacheKey, layout);
    return layout;
  }


  /* 7. FILTERING AND TRANSITIONS ========================================== */
  const tiles = new Map();   // file name to its tile
  let visibleList = [];      // photos currently showing, in order
  let filterRun = 0;         // ignores slow measurements from an older click
  let currentLayout = null;

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
      // Pointer clicks are handled by the gesture code after it proves that
      // the pointer barely moved. A detail of zero is keyboard/assistive-tech
      // activation and should retain the button's native behavior.
      btn.addEventListener("click", (event) => {
        if (event.detail === 0) openLightbox(photo);
      });

      btn.appendChild(img);
      anim.appendChild(btn);
      tile.appendChild(anim);
      worldEl.appendChild(tile);

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

    const layout = computeLayout(list);
    currentLayout = layout;
    let order = 0;
    list.forEach((photo) => {
      const entry = tiles.get(photo.file);
      const position = layout.positions.get(photo.file);
      if (entry.visible) place(entry, position);
      else enter(entry, position, order++);
    });
    fitCluster(layout, list, camera.hasFit);
    filterLayoutPending = false;
  }


  /* 8. PAN, ZOOM, AND FITTING ============================================== */
  const siteMain = $(".site-main");
  const siteHeader = $(".site-header");
  const camera = {
    x: 0,
    y: 0,
    scale: 1,
    minScale: 1,
    maxScale: VIEW.maxZoom,
    bounds: null,
    hasFit: false,
  };
  const pointers = new Map();
  let gesture = null;
  let resizeFrame = 0;
  let resizeTimer = 0;
  let lastViewportWidth = 0;
  let lastViewportHeight = 0;
  let lastDevicePixelRatio = 0;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function viewportPadding() {
    return collageEl.clientWidth <= 640 ? VIEW.paddingPhone : VIEW.paddingDesktop;
  }

  function readRenderedCamera() {
    const transform = getComputedStyle(worldEl).transform;
    if (!transform || transform === "none") {
      return { x: camera.x, y: camera.y, scale: camera.scale };
    }

    try {
      const Matrix = window.DOMMatrixReadOnly || window.DOMMatrix || window.WebKitCSSMatrix;
      const matrix = new Matrix(transform);
      return { x: matrix.e, y: matrix.f, scale: matrix.a };
    } catch (error) {
      return { x: camera.x, y: camera.y, scale: camera.scale };
    }
  }

  function sharpZoomLimit(layout, list) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    let limit = VIEW.maxZoom;

    list.forEach((photo) => {
      const pos = layout.positions.get(photo.file);
      if (!pos || !photo.thumbWidth || !photo.thumbHeight) return;
      limit = Math.min(
        limit,
        photo.thumbWidth / (pos.w * dpr * VIEW.hoverScale),
        photo.thumbHeight / (pos.h * dpr * VIEW.hoverScale)
      );
    });

    return Math.max(0.01, limit);
  }

  function clampCamera() {
    if (!camera.bounds) return;
    const width = collageEl.clientWidth;
    const height = collageEl.clientHeight;
    const padding = viewportPadding();
    const bounds = camera.bounds;
    const scaledWidth = (bounds.maxX - bounds.minX) * camera.scale;
    const scaledHeight = (bounds.maxY - bounds.minY) * camera.scale;

    if (scaledWidth <= width - padding * 2) {
      camera.x = width / 2 - (bounds.minX + bounds.maxX) * camera.scale / 2;
    } else {
      camera.x = clamp(
        camera.x,
        width - padding - bounds.maxX * camera.scale,
        padding - bounds.minX * camera.scale
      );
    }

    if (scaledHeight <= height - padding * 2) {
      camera.y = height / 2 - (bounds.minY + bounds.maxY) * camera.scale / 2;
    } else {
      camera.y = clamp(
        camera.y,
        height - padding - bounds.maxY * camera.scale,
        padding - bounds.minY * camera.scale
      );
    }
  }

  function updateAtFitState() {
    const rendered = readRenderedCamera();
    const epsilon = 0.01;
    const isSettledAtFit = Boolean(camera.bounds) &&
      Math.abs(camera.scale - camera.minScale) <= 0.000001 &&
      Math.abs(rendered.scale - camera.scale) <= 0.00001 &&
      Math.abs(rendered.x - camera.x) <= epsilon &&
      Math.abs(rendered.y - camera.y) <= epsilon;
    collageEl.classList.toggle("is-at-fit", isSettledAtFit);
  }

  let noTransitionFrame = 0;

  function renderCamera(animate) {
    const rendered = readRenderedCamera();
    const targetChanged =
      Math.abs(rendered.scale - camera.scale) > 0.00001 ||
      Math.abs(rendered.x - camera.x) > 0.01 ||
      Math.abs(rendered.y - camera.y) > 0.01;
    let willAnimate = false;

    cancelAnimationFrame(noTransitionFrame);
    if (animate) {
      // An immediate gesture update may have left this helper class in place
      // until the next frame. Remove and commit it before setting an animated
      // target so a quick reset/filter click still gets its glide.
      worldEl.classList.remove("no-transition");
      void worldEl.offsetWidth;
      willAnimate = targetChanged && getComputedStyle(worldEl).transitionDuration
        .split(",")
        .some((duration) => parseFloat(duration) > 0);
    } else {
      worldEl.classList.add("no-transition");
    }
    worldEl.style.transform = "translate3d(" + camera.x.toFixed(3) + "px," +
      camera.y.toFixed(3) + "px,0) scale(" + camera.scale.toFixed(6) + ")";

    if (!animate) {
      // Commit both the no-transition rule and this transform together. A
      // style flush prevents browsers from coalescing the class removal and
      // accidentally animating an interaction that should track instantly.
      void worldEl.offsetWidth;
      noTransitionFrame = requestAnimationFrame(() => worldEl.classList.remove("no-transition"));
      updateAtFitState();
    } else if (willAnimate) {
      // Keep one-finger gestures owned by the collage until an animated refit
      // has visibly reached its fit scale, not merely when its target changes.
      collageEl.classList.remove("is-at-fit");
    } else {
      // A parent interaction class can temporarily disable transitions even
      // when the caller requested one. Commit that immediate target before
      // deciding whether the viewport is back at fit.
      void worldEl.offsetWidth;
      updateAtFitState();
    }
  }

  function settleCameraTransition(event) {
    if (event.target === worldEl && event.propertyName === "transform") updateAtFitState();
  }

  worldEl.addEventListener("transitionend", settleCameraTransition);
  worldEl.addEventListener("transitioncancel", settleCameraTransition);

  function syncCameraToRendered() {
    const rendered = readRenderedCamera();
    camera.x = rendered.x;
    camera.y = rendered.y;
    // A filter can animate from an old fit scale that is outside the new
    // layout's legal range. If an interaction interrupts that glide, land on
    // the nearest valid scale instead of freezing below fit or above sharpness.
    camera.scale = clamp(rendered.scale, camera.minScale, camera.maxScale);
    clampCamera();
    renderCamera(false);
  }

  function fitCluster(layout, list, animate) {
    const width = collageEl.clientWidth;
    const height = collageEl.clientHeight;
    const bounds = layout.bounds;
    const boundsWidth = Math.max(1, bounds.maxX - bounds.minX);
    const boundsHeight = Math.max(1, bounds.maxY - bounds.minY);
    const padding = viewportPadding();
    const fitScale = Math.min(
      Math.max(1, width - padding * 2) / boundsWidth,
      Math.max(1, height - padding * 2) / boundsHeight
    );
    const sharpLimit = sharpZoomLimit(layout, list);
    const targetScale = Math.min(fitScale, sharpLimit);
    const renderedScale = readRenderedCamera().scale;
    const shouldAnimate = Boolean(animate) &&
      !reducedMotion() &&
      renderedScale <= sharpLimit + 0.000001;

    camera.bounds = bounds;
    camera.minScale = targetScale;
    camera.maxScale = Math.max(targetScale, sharpLimit);
    camera.scale = targetScale;
    camera.x = width / 2 - (bounds.minX + bounds.maxX) * targetScale / 2;
    camera.y = height / 2 - (bounds.minY + bounds.maxY) * targetScale / 2;
    clampCamera();
    renderCamera(shouldAnimate);
    camera.hasFit = true;
    lastViewportWidth = width;
    lastViewportHeight = height;
    lastDevicePixelRatio = window.devicePixelRatio || 1;
    if (gesture && pointers.size) resetGestureBaseline();
  }

  function updateGalleryHeight() {
    const top = siteMain.getBoundingClientRect().top + window.scrollY;
    const height = Math.max(1, window.innerHeight - top);
    const value = height.toFixed(3) + "px";
    if (siteMain.style.getPropertyValue("--gallery-height") !== value) {
      siteMain.style.setProperty("--gallery-height", value);
    }
  }

  function handleViewportResize() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      const width = collageEl.clientWidth;
      const height = collageEl.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (width === lastViewportWidth &&
          height === lastViewportHeight &&
          dpr === lastDevicePixelRatio) return;
      if (!currentLayout || !visibleList.length) return;
      if (filterLayoutPending) return;

      collageEl.classList.add("is-resizing");
      fitCluster(currentLayout, visibleList, false);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => collageEl.classList.remove("is-resizing"), 120);
    });
  }

  function zoomAt(nextScale, localX, localY) {
    const scale = clamp(nextScale, camera.minScale, camera.maxScale);
    if (Math.abs(scale - camera.scale) < 0.000001) return;
    const worldX = (localX - camera.x) / camera.scale;
    const worldY = (localY - camera.y) / camera.scale;
    camera.scale = scale;
    camera.x = localX - worldX * scale;
    camera.y = localY - worldY * scale;
    clampCamera();
    renderCamera(false);
  }

  let wheelTimer = 0;
  collageEl.addEventListener("wheel", (event) => {
    if (!camera.bounds) return;
    const rect = collageEl.getBoundingClientRect();
    let delta = event.deltaY;
    if (event.deltaMode === 1) delta *= 16;
    else if (event.deltaMode === 2) delta *= collageEl.clientHeight;
    delta = clamp(delta, -400, 400);

    // Once fully zoomed out, let another downward scroll continue to the
    // footer instead of trapping the document inside the gallery.
    const rendered = readRenderedCamera();
    if (delta > 0 && rendered.scale <= camera.minScale + 0.000001) return;
    if (delta < 0 && rendered.scale >= camera.maxScale - 0.000001) return;

    event.preventDefault();
    if (!collageEl.classList.contains("is-gesturing")) syncCameraToRendered();

    collageEl.classList.add("is-gesturing");
    zoomAt(
      camera.scale * Math.exp(-delta * VIEW.wheelSpeed),
      event.clientX - rect.left,
      event.clientY - rect.top
    );
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => collageEl.classList.remove("is-gesturing"), 120);
  }, { passive: false });

  function localPoint(event) {
    const rect = collageEl.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function captureActivePointers() {
    pointers.forEach((point, id) => {
      if (!collageEl.hasPointerCapture(id)) {
        try { collageEl.setPointerCapture(id); } catch (error) { /* pointer already ended */ }
      }
    });
  }

  function markDragged(syncRendered = true) {
    if (!gesture) return;
    if (!gesture.moved && syncRendered) {
      syncCameraToRendered();
      if (gesture.baseline && gesture.baseline.type === "pan") {
        gesture.baseline.cameraX = camera.x;
        gesture.baseline.cameraY = camera.y;
      }
    }
    gesture.moved = true;
    collageEl.classList.add("is-dragging", "is-gesturing");
    captureActivePointers();
  }

  function resetGestureBaseline() {
    if (!gesture || !pointers.size) return;
    const active = Array.from(pointers.entries());

    if (active.length === 1) {
      const point = active[0][1];
      gesture.baseline = {
        type: "pan",
        id: active[0][0],
        x: point.x,
        y: point.y,
        cameraX: camera.x,
        cameraY: camera.y,
      };
      return;
    }

    const first = active[0][1];
    const second = active[1][1];
    const centerX = (first.x + second.x) / 2;
    const centerY = (first.y + second.y) / 2;
    if (!gesture.moved) syncCameraToRendered();
    gesture.baseline = {
      type: "pinch",
      ids: [active[0][0], active[1][0]],
      distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
      scale: camera.scale,
      worldX: (centerX - camera.x) / camera.scale,
      worldY: (centerY - camera.y) / camera.scale,
    };
    gesture.hadMultiplePointers = true;
    markDragged(false);
  }

  function updatePointer(event) {
    const point = pointers.get(event.pointerId);
    if (!point) return null;
    const local = localPoint(event);
    point.x = local.x;
    point.y = local.y;
    point.maxDistance = Math.max(
      point.maxDistance,
      Math.hypot(point.x - point.startX, point.y - point.startY)
    );
    if (point.maxDistance > VIEW.clickSlop) markDragged();
    return point;
  }

  function applyGesture() {
    if (!gesture || !gesture.moved || !gesture.baseline) return;
    const baseline = gesture.baseline;
    let pinchUpdate = null;

    if (baseline.type === "pan") {
      const point = pointers.get(baseline.id);
      if (!point) return;
      camera.x = baseline.cameraX + point.x - baseline.x;
      camera.y = baseline.cameraY + point.y - baseline.y;
    } else {
      const first = pointers.get(baseline.ids[0]);
      const second = pointers.get(baseline.ids[1]);
      if (!first || !second) return;
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      camera.scale = clamp(
        baseline.scale * distance / baseline.distance,
        camera.minScale,
        camera.maxScale
      );
      camera.x = centerX - baseline.worldX * camera.scale;
      camera.y = centerY - baseline.worldY * camera.scale;
      pinchUpdate = { centerX, centerY, distance };
    }

    clampCamera();
    if (pinchUpdate) {
      baseline.distance = pinchUpdate.distance;
      baseline.scale = camera.scale;
      baseline.worldX = (pinchUpdate.centerX - camera.x) / camera.scale;
      baseline.worldY = (pinchUpdate.centerY - camera.y) / camera.scale;
    }
    renderCamera(false);
  }

  collageEl.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const local = localPoint(event);

    if (!pointers.size) {
      const button = event.target.closest && event.target.closest(".tile-btn");
      gesture = {
        initialPointerId: event.pointerId,
        clickEntry: button ? Array.from(tiles.values()).find((entry) => entry.btn === button) : null,
        moved: false,
        hadMultiplePointers: false,
        baseline: null,
      };
    }

    pointers.set(event.pointerId, {
      x: local.x,
      y: local.y,
      startX: local.x,
      startY: local.y,
      maxDistance: 0,
    });
    // Touch and pen pointers otherwise receive implicit capture on the image
    // that was pressed. Own capture at the viewport from the start so moving
    // off a tile (or the edge of the viewport) cannot strand a gesture.
    try { collageEl.setPointerCapture(event.pointerId); } catch (error) { /* unsupported pointer */ }
    resetGestureBaseline();
  });

  collageEl.addEventListener("pointermove", (event) => {
    if (!updatePointer(event)) return;
    applyGesture();
    if (gesture && gesture.moved && event.cancelable) event.preventDefault();
  });

  function finishPointer(event, cancelled) {
    const point = pointers.get(event.pointerId);
    if (!point || !gesture) return;
    if (!cancelled) {
      updatePointer(event);
      applyGesture();
    } else {
      markDragged();
    }

    const clickEntry = gesture.clickEntry;
    const canOpen = !cancelled &&
      pointers.size === 1 &&
      event.pointerId === gesture.initialPointerId &&
      !gesture.moved &&
      !gesture.hadMultiplePointers &&
      clickEntry;

    pointers.delete(event.pointerId);

    if (pointers.size) {
      resetGestureBaseline();
      return;
    }

    collageEl.classList.remove("is-dragging", "is-gesturing");
    gesture = null;

    if (canOpen) {
      const releaseTarget = document.elementFromPoint(event.clientX, event.clientY);
      if (releaseTarget && clickEntry.btn.contains(releaseTarget)) openLightbox(clickEntry.photo);
    }
  }

  collageEl.addEventListener("pointerup", (event) => finishPointer(event, false));
  collageEl.addEventListener("pointercancel", (event) => finishPointer(event, true));
  collageEl.addEventListener("lostpointercapture", (event) => {
    if (event.target === collageEl && pointers.has(event.pointerId)) finishPointer(event, true);
  });

  // Native pointer clicks still fire after pointerup—even after capture and a
  // drag in some browsers. All pointer activation is handled above; only
  // keyboard/programmatic clicks are allowed through to the tile buttons.
  collageEl.addEventListener("click", (event) => {
    if (event.detail !== 0 || event.pointerType) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // The viewport itself is keyboard-operable. Tile buttons keep their own
  // key handling, while arrows pan the camera and +/- zoom around its center.
  collageEl.addEventListener("keydown", (event) => {
    if (event.target !== collageEl || event.altKey || event.ctrlKey || event.metaKey) return;
    const panStep = 64;
    let dx = 0;
    let dy = 0;

    if (event.key === "ArrowLeft") dx = panStep;
    else if (event.key === "ArrowRight") dx = -panStep;
    else if (event.key === "ArrowUp") dy = panStep;
    else if (event.key === "ArrowDown") dy = -panStep;

    if (dx || dy) {
      syncCameraToRendered();
      const beforeX = camera.x;
      const beforeY = camera.y;
      camera.x += dx;
      camera.y += dy;
      clampCamera();
      if (Math.abs(camera.x - beforeX) > 0.01 || Math.abs(camera.y - beforeY) > 0.01) {
        event.preventDefault();
        renderCamera(false);
      }
      return;
    }

    if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
      syncCameraToRendered();
      const beforeScale = camera.scale;
      const zoomIn = event.key === "+" || event.key === "=";
      zoomAt(
        camera.scale * (zoomIn ? 1.2 : 1 / 1.2),
        collageEl.clientWidth / 2,
        collageEl.clientHeight / 2
      );
      if (Math.abs(camera.scale - beforeScale) > 0.000001) event.preventDefault();
    } else if ((event.key === "0" || event.key === "Home") && currentLayout && visibleList.length) {
      event.preventDefault();
      fitCluster(currentLayout, visibleList, true);
    }
  });

  // After a visitor zooms in, keyboard focus can otherwise move to a tile
  // beyond the clipped edge. Gently pan only keyboard-visible focus back into
  // view; pointer focus is left alone so clicking never moves its target.
  worldEl.addEventListener("focusin", (event) => {
    const button = event.target.closest && event.target.closest(".tile-btn");
    if (!button || !button.matches(":focus-visible")) return;
    const tile = button.closest(".tile");
    if (!tile || tile.classList.contains("is-hidden")) return;

    const stageRect = collageEl.getBoundingClientRect();
    const tileRect = tile.getBoundingClientRect();
    const margin = Math.min(viewportPadding(), 18);
    const left = stageRect.left + margin;
    const right = stageRect.right - margin;
    const top = stageRect.top + margin;
    const bottom = stageRect.bottom - margin;
    let dx = 0;
    let dy = 0;

    if (tileRect.width > right - left) dx = (left + right - tileRect.left - tileRect.right) / 2;
    else if (tileRect.left < left) dx = left - tileRect.left;
    else if (tileRect.right > right) dx = right - tileRect.right;

    if (tileRect.height > bottom - top) dy = (top + bottom - tileRect.top - tileRect.bottom) / 2;
    else if (tileRect.top < top) dy = top - tileRect.top;
    else if (tileRect.bottom > bottom) dy = bottom - tileRect.bottom;

    if (!dx && !dy) return;
    syncCameraToRendered();
    camera.x += dx;
    camera.y += dy;
    clampCamera();
    renderCamera(!reducedMotion());
  });


  /* 9. LIGHTBOX =========================================================== */
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


  /* 10. START UP ========================================================== */
  updateGalleryHeight();

  if (!photos.length) {
    collageEl.innerHTML = '<p class="notice">No photos yet. Add some in photos.js.</p>';
    return;
  }

  buildFilters();
  buildTiles();

  const hasFeatured = photos.some((p) => p.featured);
  setFilter(hasFeatured ? { type: "featured" } : { type: "all" });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => updateGalleryHeight()).observe(siteHeader);
    new ResizeObserver(handleViewportResize).observe(collageEl);
  }

  window.addEventListener("resize", () => {
    updateGalleryHeight();
    handleViewportResize();
  });
})();
