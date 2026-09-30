/* ==========================================================================
   Paw & Whisker — main.js
   GSAP animations + UI behaviour (shared by all pages)
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.remove("no-js");

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasST = typeof window.ScrollTrigger !== "undefined";

  /* ------------------------------------------------------------------
     Scroll lock for the off-canvas drawers
     ------------------------------------------------------------------
     The mobile range sets `overflow-x: clip` on <html> to stop the fixed
     header drifting when content is wider than the screen. Because <html>
     is no longer `visible`, `overflow` no longer propagates up from <body>
     to the viewport, so a `body.is-open { overflow: hidden }` rule silently
     stops doing anything. The open class therefore has to land on both
     elements.

     The vertical scrollbar's width is parked in a custom property before
     the lock lands, so the page does not jump sideways when it disappears.
     `overscroll-behavior: none` is what actually stops a touch drag on the
     page behind the drawer from chaining through to it. */
  function setDrawerLock(on, cls) {
    var root = document.documentElement;
    if (on) {
      var gap = window.innerWidth - root.clientWidth;
      root.style.setProperty("--drawer-lock-gap", gap > 0 ? gap + "px" : "0px");
    } else {
      root.style.removeProperty("--drawer-lock-gap");
    }
    root.classList.toggle(cls, on);
    document.body.classList.toggle(cls, on);
  }

  /* Declared up front: the boot calls below run before any later statement,
     so a var assigned further down the file would still be undefined here. */
  var SESSION_KEY = "stackly:session";
  var SCROLL_KEY = "stackly:scroll:";
  var RETURN_KEY = "stackly:returnTo";
  var RETURN_MAX_AGE = 30 * 60 * 1000;

  /* Date styles for liveDate() — keyed by [data-date-mode]. */
  var DATE_MODES = {
    long:   { weekday: "long", month: "long",  day: "numeric", year: "numeric" },
    short:  { weekday: "long", month: "short", day: "numeric", year: "numeric" },
    medium: { weekday: "short", month: "long", day: "numeric", year: "numeric" },
    day:    { weekday: "long", month: "long", day: "numeric" },
    full:   { weekday: "long", month: "long", day: "numeric", year: "numeric",
              hour: "numeric", minute: "2-digit" }
  };

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  document.addEventListener("click", function(e) {
    var a = e.target.closest('a[href], button.product__wish, button.add-btn');
    if (!a) return;
    var href = a.matches('button') ? (a.closest('#products') ? '404.html' : '') : a.getAttribute('href');
    if (a.matches('button.add-btn') && a.closest('#products')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      remember404Origin();
      window.location.assign('404.html');
      return;
    }
    if (href && /^404\.html(?:[?#]|$)/.test(href)) remember404Origin();
  }, true);
  function remember404Origin() {
    var pane = document.querySelector('.dashboard-main');
    store('stackly:404-origin', JSON.stringify({url:pageUrl(location.href), y:window.scrollY||0, paneY:pane ? pane.scrollTop : 0, t:Date.now()}));
  }
  gsapFallback();
  scrollMemory();
  headerScroll();
  mobileNav();
  dashboardDrawer();
  smoothAnchors();
  backToTop();
  imageFallback();
  animations();
  notFoundPage();
  counters();
  parallax();
  accordions();
  tabs();
  filters();
  carousel();
  forms();
  passwordVisibility();
  userGreeting();
  logoutLinks();
  dashboardStubs();
  wishlist();
  savedItems();
  cart();
  countdown();
  year();
  liveDate();
  highlightNav();
  searchPanel();

  /* ------------------------------------------------------------------
     0. Scroll memory (lets the 404 "Go back" land where the user left off)
  ------------------------------------------------------------------ */
  function store(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) {}
  }

  function read(key) {
    try { return sessionStorage.getItem(key); } catch (e) { return null; }
  }

  function drop(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  function keep(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  function recall(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  function forget(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  function pageUrl(url) {
    var a = document.createElement("a");
    a.href = url;
    return a.origin + a.pathname + a.search;
  }

  function rememberScrollFor(url) {
    var key = SCROLL_KEY + pageUrl(url).replace(/^https?:\/\/[^/]+/, "");
    var saved = read(key);
    return saved ? parseInt(saved, 10) || 0 : 0;
  }

  function restoreScrollPosition() {
    var raw = read(RETURN_KEY);
    if (!raw) return;

    var data;
    try { data = JSON.parse(raw); } catch (e) { drop(RETURN_KEY); return; }
    if (!data || !data.url || Date.now() - (data.t || 0) > RETURN_MAX_AGE) {
      drop(RETURN_KEY);
      return;
    }
    if (data.url !== pageUrl(location.href)) return;

    drop(RETURN_KEY);
    var y = Math.max(0, data.y || 0);
    var root = document.documentElement;
    var previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    var jump = function () {
      window.scrollTo(0, y);
      if (typeof data.paneY === 'number') {
        var pane = document.querySelector('.dashboard-main');
        if (pane) pane.scrollTop = data.paneY;
      }
    };
    jump();
    window.requestAnimationFrame(jump);
    setTimeout(jump, 120);
    setTimeout(function () {
      jump();
      root.style.scrollBehavior = previousBehavior;
    }, 450);
    window.addEventListener('load', jump, {once:true});
  }

  function scrollMemory() {
    var key = SCROLL_KEY + location.pathname + location.search;
    var queued = false;

    var save = function () {
      store(key, String(Math.max(0, window.scrollY || window.pageYOffset || 0)));
    };

    window.addEventListener(
      "scroll",
      function () {
        if (queued) return;
        queued = true;
        window.requestAnimationFrame(function () {
          queued = false;
          save();
        });
      },
      { passive: true }
    );
    window.addEventListener("pagehide", save);

    var nav = performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
    var reloaded = nav ? nav.type === "reload" : performance.navigation && performance.navigation.type === 1;
    if (reloaded) drop(RETURN_KEY);
    var resetOrRestore = function () {
      if (reloaded) {
        document.documentElement.style.scrollBehavior = "auto";
        window.scrollTo(0, 0);
        requestAnimationFrame(function () { window.scrollTo(0, 0); document.documentElement.style.scrollBehavior = ""; });
      } else restoreScrollPosition();
    };
    resetOrRestore();
    window.addEventListener("pageshow", resetOrRestore);
  }

  /* ------------------------------------------------------------------
     20. Dashboard mobile drawer (sidebar off-canvas under sticky bar)
  ------------------------------------------------------------------ */
  function dashboardDrawer() {
    var toggle = document.querySelector(".dashboard-mobilebar__toggle");
    var panel = document.querySelector(".dashboard-sidebar");
    if (!toggle || !panel) return;

    var scrim = document.createElement("div");
    scrim.className = "dashboard-scrim";
    document.body.appendChild(scrim);

    var setOpen = function (open) {
      setDrawerLock(open, "dashboard-nav-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("dashboard-nav-open"));
    });
    scrim.addEventListener("click", function () { setOpen(false); });
    panel.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     1. Fallback reveal when GSAP is unavailable
  ------------------------------------------------------------------ */
  function gsapFallback() {
    if (hasGSAP) return;
    var items = document.querySelectorAll(
      '[data-reveal], [data-stagger] > *, [data-reveal="left"], [data-reveal="right"]'
    );
    Array.prototype.forEach.call(items, function (el) {
      el.style.opacity = 1;
      el.style.transform = "none";
      el.style.visibility = "visible";
    });
  }

  /* ------------------------------------------------------------------
     2. Sticky header shadow
  ------------------------------------------------------------------ */
  function headerScroll() {
    var header = document.querySelector(".site-header");
    if (!header) return;
    var apply = function () {
      header.classList.toggle("is-stuck", window.scrollY > 12);
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
  }

  /* ------------------------------------------------------------------
     3. Mobile navigation drawer
  ------------------------------------------------------------------ */
  function mobileNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.querySelector(".nav");
    if (!toggle || !nav) return;

    var scrim = document.createElement("div");
    scrim.className = "nav__scrim";
    document.body.appendChild(scrim);

    var setOpen = function (open) {
      setDrawerLock(open, "nav-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };

    toggle.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });
    scrim.addEventListener("click", function () { setOpen(false); });
    var drawerClose = nav.querySelector(".nav__drawer-close");
    if (drawerClose) {
      drawerClose.addEventListener("click", function () {
        setOpen(false);
        toggle.focus();
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setOpen(false);
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1024) setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     4. Smooth anchor scrolling with sticky-header offset
  ------------------------------------------------------------------ */
  function smoothAnchors() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href");
      if (!id || id === "#" || id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var header = document.querySelector(".site-header");
      var offset = header ? header.offsetHeight + 18 : 0;
      var scroller = null;
      if (target.parentElement) {
        var node = target.parentElement;
        while (node && node !== document.body) {
          var style = window.getComputedStyle(node);
          if (/(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight) {
            scroller = node;
            break;
          }
          node = node.parentElement;
        }
      }
      if (scroller) {
        var top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop - 24;
        scroller.scrollTo({ top: top < 0 ? 0 : top, behavior: prefersReduced ? "auto" : "smooth" });
      } else {
        var page = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: page, behavior: prefersReduced ? "auto" : "smooth" });
      }
      history.replaceState(null, "", id);
    });
  }

  /* ------------------------------------------------------------------
     5. Back-to-top button
  ------------------------------------------------------------------ */
  function backToTop() {
    var btn = document.querySelector(".to-top");
    if (!btn) return;
    var apply = function () {
      btn.classList.toggle("is-visible", window.scrollY > 500);
    };
    apply();
    window.addEventListener("scroll", apply, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------------
     6. Image fallback (keeps layout beautiful if a photo fails)
  ------------------------------------------------------------------ */
  function imageFallback() {
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="72" height="72" fill="none" ' +
      'stroke="#1d6b52" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
      '<ellipse cx="32" cy="42" rx="12" ry="10"/>' +
      '<ellipse cx="18" cy="28" rx="5" ry="6.5"/><ellipse cx="28" cy="20" rx="5" ry="6.5"/>' +
      '<ellipse cx="40" cy="20" rx="5" ry="6.5"/><ellipse cx="49" cy="28" rx="5" ry="6.5"/></svg>';
    document.addEventListener(
      "error",
      function (e) {
        var t = e.target;
        if (t.tagName !== "IMG" || t.dataset.fallbackApplied) return;
        t.dataset.fallbackApplied = "1";
        t.removeAttribute("src");
        t.src =
          "data:image/svg+xml;charset=UTF-8," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
              '<rect width="400" height="400" fill="#dcf3ea"/>' +
              '<g transform="translate(164 164)">' + svg + "</g></svg>"
          );
        t.style.objectFit = "contain";
      },
      true
    );
  }

  /* ------------------------------------------------------------------
     7. GSAP reveal animations
  ------------------------------------------------------------------ */
  function animations() {
    if (!hasGSAP) return;
    if (hasST) gsap.registerPlugin(ScrollTrigger);
    gsap.defaults({ ease: "power3.out" });

    /* Page-load hero timeline */
    var heroBits = document.querySelectorAll("[data-hero]");
    if (heroBits.length) {
      var tl = gsap.timeline({ defaults: { duration: 1, ease: "power3.out" } });
      tl.from("[data-hero='eyebrow']", { y: 26, autoAlpha: 0, duration: 0.7 })
        .from("[data-hero='title']", { y: 40, autoAlpha: 0 }, "-=0.45")
        .from("[data-hero='text']", { y: 30, autoAlpha: 0 }, "-=0.6")
        .from("[data-hero='cta'] > *", { y: 26, autoAlpha: 0, stagger: 0.11 }, "-=0.45")
        .from("[data-hero='stats'] > *", { y: 22, autoAlpha: 0, stagger: 0.09 }, "-=0.35")
        .from("[data-hero='visual']", { y: 50, autoAlpha: 0, scale: 0.94, duration: 1.1 }, "-=1.1")
        .from("[data-hero='float']", { scale: 0.7, autoAlpha: 0, stagger: 0.14, duration: 0.7 }, "-=0.6");
    }

    /* Generic scroll reveals (skip directional variants handled below) */
    gsap.utils.toArray('[data-reveal]:not([data-reveal="left"]):not([data-reveal="right"])').forEach(function (el) {
      var delay = parseFloat(el.getAttribute("data-reveal-delay")) || 0;
      gsap.fromTo(
        el,
        { y: 44, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.95,
          delay: delay,
          scrollTrigger: { trigger: el, start: "top 88%", once: true }
        }
      );
    });

    /* Section headings */
    gsap.utils.toArray("[data-reveal='left']").forEach(function (el) {
      gsap.fromTo(
        el,
        { x: -50, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 1, scrollTrigger: { trigger: el, start: "top 86%", once: true } }
      );
    });
    gsap.utils.toArray("[data-reveal='right']").forEach(function (el) {
      gsap.fromTo(
        el,
        { x: 50, autoAlpha: 0 },
        { x: 0, autoAlpha: 1, duration: 1, scrollTrigger: { trigger: el, start: "top 86%", once: true } }
      );
    });

    /* Stagger grids */
    gsap.utils.toArray("[data-stagger]").forEach(function (group) {
      var kids = group.children;
      if (!kids.length) return;
      gsap.fromTo(
        kids,
        { y: 48, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.9,
          stagger: parseFloat(group.getAttribute("data-stagger")) || 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: group, start: "top 85%", once: true }
        }
      );
    });

    /* Floating decorative shapes */
    if (!prefersReduced) {
      gsap.utils.toArray("[data-float]").forEach(function (el) {
        gsap.to(el, {
          y: "+=22",
          duration: parseFloat(el.getAttribute("data-float")) || 3,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut"
        });
      });
    }

    /* Progress / bar fills */
    if (hasST) {
      gsap.utils.toArray("[data-bar]").forEach(function (bar) {
        gsap.fromTo(
          bar,
          { width: "0%" },
          {
            width: bar.getAttribute("data-bar") + "%",
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: bar, start: "top 92%", once: true }
          }
        );
      });

      /* Horizontal timeline scrub */
      var rail = document.querySelector("[data-rail]");
      if (rail) {
        var track = rail.querySelector(".timeline-rail__track");
        if (track) {
          var dist = track.scrollWidth - rail.offsetWidth;
          if (dist > 0) {
            gsap.to(track, {
              x: -dist,
              ease: "none",
              scrollTrigger: {
                trigger: rail,
                pin: true,
                scrub: 1,
                end: function () { return "+=" + dist; },
                invalidateOnRefresh: true
              }
            });
          }
        }
      }
    }

    /* Refresh after images load */
    window.addEventListener("load", function () {
      if (hasST) ScrollTrigger.refresh();
    });
  }

  /* ------------------------------------------------------------------
     8. Animated counters
  ------------------------------------------------------------------ */
  function counters() {
    var nums = document.querySelectorAll("[data-count]");
    if (!nums.length) return;

    var run = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = (el.getAttribute("data-decimals") || "0") | 0;
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";

      if (!hasGSAP || prefersReduced) {
        el.textContent = prefix + target.toFixed(decimals) + suffix;
        return;
      }
      var proxy = { v: 0 };
      gsap.to(proxy, {
        v: target,
        duration: 2,
        ease: "power2.out",
        onUpdate: function () {
          el.textContent = prefix + proxy.v.toFixed(decimals) + suffix;
        }
      });
    };

    if (hasST) {
      Array.prototype.forEach.call(nums, function (el) {
        ScrollTrigger.create({
          trigger: el,
          start: "top 90%",
          once: true,
          onEnter: function () { run(el); }
        });
      });
    } else {
      Array.prototype.forEach.call(nums, run);
    }
  }

  /* ------------------------------------------------------------------
     9. Parallax layers
  ------------------------------------------------------------------ */
  function parallax() {
    if (!hasGSAP || !hasST || prefersReduced) return;
    gsap.utils.toArray("[data-parallax]").forEach(function (el) {
      var depth = parseFloat(el.getAttribute("data-parallax")) || 60;
      gsap.to(el, {
        yPercent: -depth / 10,
        ease: "none",
        scrollTrigger: { trigger: el.closest("section") || el, start: "top bottom", end: "bottom top", scrub: true }
      });
    });
  }

  /* ------------------------------------------------------------------
     10. Accordion (FAQ)
  ------------------------------------------------------------------ */
  function accordions() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".acc-btn");
      if (!btn) return;
      var item = btn.closest(".acc-item");
      var panel = item.querySelector(".acc-panel");
      var inner = item.querySelector(".acc-panel__inner");
      var isOpen = item.classList.contains("is-open");

      /* close siblings in the same group */
      var group = item.parentElement;
      Array.prototype.forEach.call(group.querySelectorAll(".acc-item.is-open"), function (other) {
        if (other === item) return;
        other.classList.remove("is-open");
        var op = other.querySelector(".acc-panel");
        if (hasGSAP && !prefersReduced) {
          gsap.to(op, { height: 0, duration: 0.4, ease: "power2.inOut" });
        } else {
          op.style.height = "0px";
        }
      });

      if (isOpen) {
        item.classList.remove("is-open");
        if (hasGSAP && !prefersReduced) {
          gsap.to(panel, { height: 0, duration: 0.4, ease: "power2.inOut" });
        } else {
          panel.style.height = "0px";
        }
      } else {
        item.classList.add("is-open");
        if (hasGSAP && !prefersReduced) {
          gsap.to(panel, {
            height: inner.offsetHeight,
            duration: 0.5,
            ease: "power3.out",
            onComplete: function () {
              if (item.classList.contains("is-open")) panel.style.height = "auto";
            }
          });
        } else {
          panel.style.height = "auto";
        }
      }
    });
  }

  /* ------------------------------------------------------------------
     11. Tabs
  ------------------------------------------------------------------ */
  function tabs() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tab]");
      if (!btn) return;
      var group = btn.closest("[data-tabs]");
      if (!group) return;
      var key = btn.getAttribute("data-tab");

      group.querySelectorAll("[data-tab]").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", String(b === btn));
      });
      group.querySelectorAll(".tab-panel").forEach(function (p) {
        var on = p.getAttribute("data-panel") === key;
        p.classList.toggle("is-active", on);
        if (on) revealPanel(p);
      });
      /* Swapping panels changes the section's height, so every trigger below
         it is measured against stale positions until this runs. */
      if (hasST) ScrollTrigger.refresh();
    });
  }

  /* A panel that is display:none at load never reaches its ScrollTrigger
     start, so its staggered children keep the fromTo start state
     (opacity 0 / visibility hidden) and the panel opens blank. Clearing the
     inline state on show keeps the copy visible whichever panel was opened,
     and the local tween restores the entrance without waiting for a scroll. */
  function revealPanel(panel) {
    var kids = panel.querySelectorAll("[data-stagger] > *, [data-reveal]");
    Array.prototype.forEach.call(kids, function (el) {
      el.style.opacity = "";
      el.style.visibility = "";
      el.style.transform = "";
    });
    if (!hasGSAP || prefersReduced || !kids.length) return;
    gsap.fromTo(
      kids,
      { y: 34, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: "power3.out", overwrite: "auto" }
    );
  }

  /* ------------------------------------------------------------------
     12. Blog category filter
  ------------------------------------------------------------------ */
  function filters() {
    var bar = document.querySelector("[data-filter-bar]");
    var grid = document.querySelector("[data-filter-grid]");
    if (!bar || !grid) return;

    var items = Array.prototype.slice.call(grid.querySelectorAll("[data-cat]"));
    var empty = document.querySelector("[data-filter-empty]");

    bar.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-filter]");
      if (!btn) return;
      var val = btn.getAttribute("data-filter");

      bar.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("is-active", b === btn);
      });

      var shown = 0;
      items.forEach(function (item) {
        var show = val === "all" || item.getAttribute("data-cat") === val;
        if (show) {
          shown++;
          item.style.display = "";
          if (hasGSAP && !prefersReduced) {
            gsap.fromTo(item, { autoAlpha: 0, y: 24, scale: 0.97 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "power2.out" });
          }
        } else {
          item.style.display = "none";
        }
      });

      if (empty) empty.style.display = shown ? "none" : "block";
    });
  }

  /* ------------------------------------------------------------------
     13. Auto-rotating highlight carousel (testimonials / logos)
  ------------------------------------------------------------------ */
  function carousel() {
    var track = document.querySelector("[data-carousel]");
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    if (slides.length < 2) return;
    var index = 0;
    var timer;

    var show = function (i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (s, n) { s.classList.toggle("is-active", n === index); s.hidden = n !== index; s.setAttribute("aria-hidden", String(n !== index)); });
      var dots = document.querySelectorAll("[data-carousel-dot]");
      dots.forEach(function (d, n) { d.classList.toggle("is-active", n === index); d.setAttribute("aria-pressed", String(n === index)); });
    };

    var play = function () {
      clearInterval(timer);
      if (prefersReduced || document.hidden) return;
      timer = setInterval(function () { show(index + 1); }, 5200);
    };
    var stop = function () { clearInterval(timer); };

    var step = function (dir) { stop(); show(index + dir); play(); };

    document.querySelectorAll("[data-carousel-dot]").forEach(function (dot, n) {
      dot.addEventListener("click", function () { step(n - index); });
    });
    document.querySelectorAll("[data-carousel-prev]").forEach(function (btn) {
      btn.addEventListener("click", function () { step(-1); });
    });
    document.querySelectorAll("[data-carousel-next]").forEach(function (btn) {
      btn.addEventListener("click", function () { step(1); });
    });

    var root = track.closest("section") || track;
    /* Only pause for keyboard focus so mouse clicks on the arrows keep auto-rotation alive. */
    var keyboardFocus = function (el) {
      try { return !!(el && el.matches && el.matches(":focus-visible")); } catch (err) { return true; }
    };
    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", play);
    root.addEventListener("focusin", function (e) { if (keyboardFocus(e.target)) stop(); });
    root.addEventListener("focusout", function(e) { if (!root.contains(e.relatedTarget)) play(); });
    document.addEventListener("visibilitychange", function() { stop(); if (!document.hidden) play(); });

    show(0);
    play();
  }

  /* ------------------------------------------------------------------
     14. Form validation + toast feedback
  ------------------------------------------------------------------ */
  function forms() {
    var toastEl = document.createElement("div");
    toastEl.className = "toast";
    toastEl.setAttribute("role", "status");
    toastEl.innerHTML =
      '<i class="fa-solid fa-check ico" aria-hidden="true" style="font-size:20px"></i><span></span>';
    document.body.appendChild(toastEl);
    var toastMsg = toastEl.querySelector("span");
    var toastTimer;

    window.showToast = function (msg) {
      toastMsg.textContent = msg;
      toastEl.classList.add("is-visible");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 3600);
    };

    document.addEventListener("submit", function (e) {
      var form = e.target;
      if (!form.matches("form[data-validate], form.newsletter-form")) return;
      e.preventDefault();

      if (form.hasAttribute("data-gmail-only")) {
        var gmailInput = form.querySelector('input[type="email"]');
        var gmailErr = form.querySelector("[data-inline-error]");
        var gmailVal = (gmailInput ? gmailInput.value : "").trim();
        var gmailMsg = "";

        if (!gmailVal) gmailMsg = "Please enter your email address to subscribe.";
        else if (!/^[^\s@]+@gmail\.com$/i.test(gmailVal)) gmailMsg = "Only @gmail.com email addresses are accepted.";

        if (gmailMsg) {
          if (gmailErr) {
            gmailErr.innerHTML =
              '<i class="fa-solid fa-circle-exclamation ico" aria-hidden="true" style="font-size:16px"></i><span></span>';
            gmailErr.querySelector("span").textContent = gmailMsg;
            gmailErr.classList.add("is-visible");
          }
          if (gmailInput) {
            gmailInput.classList.add("is-invalid");
            gmailInput.setAttribute("aria-invalid", "true");
            gmailInput.focus();
          }
          return;
        }

        if (gmailErr) gmailErr.classList.remove("is-visible");
        if (gmailInput) {
          gmailInput.classList.remove("is-invalid");
          gmailInput.removeAttribute("aria-invalid");
        }
        remember404Origin();
        window.location.href = form.getAttribute("data-redirect") || "404.html";
        return;
      }

      var valid = true;
      var firstBad = null;

      form.querySelectorAll("[required], [data-alpha-only], [data-gmail-domain], [data-minlength]").forEach(function (input) {
        var field = input.closest(".field") || input.closest(".checkbox");
        var errEl = field ? field.querySelector(".err") : null;
        var val = input.type === "checkbox" ? "" : (input.value || "").trim();
        var isEmpty = val.length === 0;
        var isRequired = input.hasAttribute("required");
        var ok = input.type === "checkbox" ? input.checked : isEmpty ? !isRequired : true;
        if (ok && !isEmpty && input.type === "email") ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
        if (ok && !isEmpty && input.hasAttribute("data-gmail-domain")) ok = /^[^\s@]+@gmail\.com$/i.test(val);
        if (ok && !isEmpty && input.hasAttribute("data-minlength")) {
          var minChars = parseInt(input.getAttribute("data-minlength"), 10) || 0;
          ok = val.length >= minChars;
        }
        if (ok && !isEmpty && input.hasAttribute("data-alpha-only")) ok = /^[A-Za-z]+(?:[\s'-][A-Za-z]+)*$/.test(val);
        if (ok && input.type === "tel") ok = val.replace(/\D/g, "").length >= 7;
        if (ok && input.type === "password" && input.hasAttribute("data-password-rules")) {
          var minLen = parseInt(input.getAttribute("minlength"), 10) || 8;
          ok = val.length >= minLen && /[A-Za-z]/.test(val) && /\d/.test(val);
        }
        var matchId = input.getAttribute("data-match");
        if (ok && matchId) {
          var matchInput = form.elements.namedItem(matchId);
          ok = !!matchInput && val === (matchInput.value || "").trim();
        }
        if (!ok) {
          valid = false;
          if (field) field.classList.add("has-error");
          if (field === null) input.classList.add("is-invalid");
          var msg = input.getAttribute("data-err");
          if (msg && errEl) errEl.textContent = msg;
          if (!firstBad) firstBad = input;
        } else if (field) {
          field.classList.remove("has-error");
        } else {
          input.classList.remove("is-invalid");
        }
      });

      if (!valid) {
        if (firstBad) firstBad.focus();
        if (!form.hasAttribute("data-no-toast")) {
          window.showToast("Please complete the highlighted fields.");
        }
        return;
      }

      if (form.hasAttribute("data-auth-form")) {
        var nameField = form.querySelector('[name="name"]');
        var emailField = form.querySelector('[name="email"]');
        var roleField = form.querySelector('[name="role"]');
        var rememberBox = form.querySelector('[name="remember"]');
        var role = (roleField && roleField.value) || "user";

        var account = {
          name: ((nameField && nameField.value) || "").trim(),
          email: ((emailField && emailField.value) || "").trim(),
          role: role,
          at: Date.now()
        };

        saveSession(account, !!(rememberBox && rememberBox.checked));

        var landing = role === "admin" ? "admin-dashboard.html" : "user-dashboard.html";
        var handover =
          "?name=" + encodeURIComponent(account.name) +
          "&email=" + encodeURIComponent(account.email) +
          "&role=" + encodeURIComponent(role);

        window.location.href = landing + handover;
        return;
      }

      var redirect = form.getAttribute("data-redirect");
      if (redirect) {
        window.location.href = redirect;
        return;
      }

      var alert = form.querySelector(".form-alert");
      if (alert) {
        alert.classList.add("is-visible");
        alert.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
      form.reset();
      window.showToast(form.getAttribute("data-success") || "Thanks! We'll be in touch shortly.");
    });

    /* keep alphabet-only fields free of numbers and symbols while typing/pasting */
    document.addEventListener("input", function (e) {
      var el = e.target;
      if (!el.matches || !el.matches("[data-alpha-only]")) return;
      var cleaned = el.value.replace(/[^A-Za-z\s'-]/g, "");
      if (cleaned !== el.value) el.value = cleaned;
    });

    /* clear error on input */
    document.addEventListener("input", function (e) {
      var field = e.target.closest(".field");
      if (field) field.classList.remove("has-error");
      e.target.classList.remove("is-invalid");
      e.target.removeAttribute("aria-invalid");
      var inlineErr = e.target.closest("form") ? e.target.closest("form").querySelector("[data-inline-error]") : null;
      if (inlineErr) inlineErr.classList.remove("is-visible");
    });
  }

  function passwordVisibility() {
    document.querySelectorAll("[data-password-toggle]").forEach(function (toggle) {
      var input = document.getElementById(toggle.getAttribute("data-password-toggle"));
      if (!input) return;
      toggle.innerHTML = '<i class="fa-regular fa-eye" aria-hidden="true"></i>';
      toggle.addEventListener("click", function () {
        var showing = input.type === "text";
        input.type = showing ? "password" : "text";
        toggle.innerHTML = showing ? '<i class="fa-regular fa-eye" aria-hidden="true"></i>' : '<i class="fa-regular fa-eye-slash" aria-hidden="true"></i>';
        toggle.setAttribute("aria-label", (showing ? "Show" : "Hide") + " password");
        toggle.setAttribute("aria-pressed", String(!showing));
      });
    });
  }

  /* ------------------------------------------------------------------
     14b. Auth session — remembers who logged in and paints the dashboards
  ------------------------------------------------------------------ */
  function readSession() {
    var raw = recall(SESSION_KEY) || read(SESSION_KEY);
    if (!raw) return null;
    var data;
    try { data = JSON.parse(raw); } catch (e) { return null; }
    return data && data.email ? data : null;
  }

  function saveSession(data, remember) {
    var raw = JSON.stringify(data);
    store(SESSION_KEY, raw);
    if (remember) keep(SESSION_KEY, raw);
    else forget(SESSION_KEY);
  }

  function clearSession() {
    forget(SESSION_KEY);
    drop(SESSION_KEY);
  }

  /* login hands the identity over in the query string, so the first dashboard
     is correct even where storage is unavailable (e.g. opened over file://).
     It is folded into storage, then the query is dropped from the URL. */
  function adoptQuerySession() {
    if (!window.location.search) return;

    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }

    var email = (params.get("email") || "").trim();
    if (!email) return;

    store(
      SESSION_KEY,
      JSON.stringify({
        name: (params.get("name") || "").trim(),
        email: email,
        role: params.get("role") || "user",
        at: Date.now()
      })
    );

    if (window.history && window.history.replaceState) {
      try { window.history.replaceState(null, "", window.location.pathname); } catch (e) {}
    }
  }

  function nameFromSession(session) {
    var typed = ((session && session.name) || "").trim();
    if (typed) return typed;

    var email = (session && session.email) || "";
    var words = email.split("@")[0].split(/[^A-Za-z]+/).filter(Boolean);
    if (!words.length) return email;

    return words
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(" ");
  }

  function firstNameOf(name) {
    return ((name || "").trim().split(/\s+/) || [""])[0];
  }

  function initialsOf(name) {
    var parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  function userGreeting() {
    adoptQuerySession();

    var session = readSession();
    var name = nameFromSession(session);
    var first = firstNameOf(name);
    var initials = initialsOf(name);
    var email = (session && session.email) || "";

    document.querySelectorAll("[data-user-name]").forEach(function (el) {
      if (name) el.textContent = name;
    });
    document.querySelectorAll("[data-user-first]").forEach(function (el) {
      if (first) el.textContent = first;
    });
    document.querySelectorAll("[data-user-email]").forEach(function (el) {
      if (!email) return;
      if (el.tagName === "INPUT") el.value = email;
      else el.textContent = email;
    });
    document.querySelectorAll("[data-user-avatar]").forEach(function (el) {
      if (initials) el.textContent = initials;
      if (name) el.setAttribute("aria-label", name);
      if (email) el.setAttribute("title", email);
    });
  }

  function logoutLinks() {
    document.querySelectorAll("[data-logout]").forEach(function (link) {
      link.addEventListener("click", function () { clearSession(); });
    });
  }

  /* ------------------------------------------------------------------
     21. Dashboard stubs — on the account/admin console every button and
        icon is a dead end (404), except the Stackly logo, the sidebar
        options, Log out and the mobile drawer toggle (which has to keep
        working or the sidebar options are unreachable on phones).
        Keyed off .dashboard-shell so it covers the dashboards and their
        sub-pages and nothing else.
  ------------------------------------------------------------------ */
  var DASHBOARD_KEEP =
    ".brand, .dashboard-nav__link, .dashboard-mobilebar__toggle, [data-logout], .skip-link";

  function dashboardStubs() {
    if (!document.querySelector(".dashboard-shell")) return;

    document.addEventListener("click", function (e) {
      var control = e.target.closest("a[href], button, input[type='submit'], input[type='button'], input[type='reset']");
      if (!control) return;
      if (control.closest(DASHBOARD_KEEP)) return;

      e.preventDefault();
      remember404Origin();
      window.location.href = "404.html";
    });
  }

  /* ------------------------------------------------------------------
     15. Wishlist toggle
  ------------------------------------------------------------------ */
  function wishlist() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".product__wish");
      if (!btn) return;
      if (btn.closest("#products")) { remember404Origin(); window.location.assign("404.html"); return; }
      var on = btn.classList.toggle("is-active");
      btn.setAttribute("aria-pressed", String(on));
      var count = document.querySelectorAll(".product__wish.is-active").length;
      var badge = document.querySelector("[data-wish-count]");
      if (badge) badge.textContent = count;
      if (window.showToast) {
        window.showToast(on ? "Added to your wishlist." : "Removed from your wishlist.");
      }
    });
  }

  function savedItems() {
    document.addEventListener("click", function (e) {
      var remove = e.target.closest("[data-remove-saved]");
      if (remove) {
        var item = remove.closest("[data-saved-item]");
        if (item) {
          item.remove();
          var count = document.querySelector("[data-saved-count]");
          if (count) count.textContent = document.querySelectorAll("[data-saved-item]").length;
          var empty = document.querySelector("[data-filter-empty]");
          if (empty && !document.querySelector("[data-saved-item]")) empty.style.display = "grid";
          if (window.showToast) window.showToast("Removed from your saved items.");
        }
        return;
      }

      if (e.target.closest("[data-notification-save]") && window.showToast) {
        window.showToast("Notification preferences saved.");
      }
    });
  }

  /* ------------------------------------------------------------------
     16. Cart counter
  ------------------------------------------------------------------ */
  function cart() {
    var badge = document.querySelector("[data-cart-count]");
    if (!badge) return;
    var count = 0;
    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".add-btn");
      if (!btn) return;
      if (btn.closest("#products")) { remember404Origin(); window.location.assign("404.html"); return; }
      count += 1;
      badge.textContent = count;
      if (!hasGSAP) return;
      gsap.fromTo(badge, { scale: 1 }, { scale: 1.6, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
      gsap.fromTo(btn, { rotate: 0, scale: 1 }, { rotate: 90, scale: 1.15, duration: 0.4, ease: "back.out(2)" });
    });
  }

  /* ------------------------------------------------------------------
     17. Flash-sale countdown
  ------------------------------------------------------------------ */
  function countdown() {
    var el = document.querySelector("[data-countdown]");
    if (!el) return;
    var target = new Date(el.getAttribute("data-countdown")).getTime();

    var pad = function (n) { return String(n).padStart(2, "0"); };

    var tick = function () {
      var diff = target - Date.now();
      if (diff < 0) diff += 7 * 24 * 60 * 60 * 1000; /* loop weekly */
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);

      var map = { "data-d": d, "data-h": pad(h), "data-m": pad(m), "data-s": pad(s) };
      Object.keys(map).forEach(function (attr) {
        var node = el.querySelector("[" + attr + "]");
        if (node) node.textContent = map[attr];
      });
    };
    tick();
    setInterval(tick, 1000);
  }

  function notFoundPage() {
    var page = document.querySelector("[data-error-page]");
    if (!page) return;

    var backButton = document.querySelector("[data-go-back]");
    var homeButton = document.querySelector("[data-error-home]");
    var leaving = false;

    var leave = function (callback) {
      if (leaving) return;
      leaving = true;
      if (!hasGSAP || prefersReduced) {
        callback();
        return;
      }
      gsap.timeline({ onComplete: callback })
        .to(page, { autoAlpha: 0, y: -18, duration: 0.38, ease: "power2.in" }, 0);
    };

    if (backButton) {
      backButton.addEventListener("click", function () {
        leave(function () {
          var saved;
          try { saved = JSON.parse(read('stackly:404-origin') || 'null'); } catch (e) { saved = null; }
          var referrer = document.referrer;
          var destination = saved && saved.url && Date.now() - saved.t < RETURN_MAX_AGE ? saved.url : referrer;
          try {
            if (!destination || new URL(destination, location.href).origin !== location.origin || pageUrl(destination) === pageUrl(location.href)) destination = null;
          } catch (e) { destination = null; }
          if (!destination) { window.location.assign('index.html'); return; }
          var sameOrigin = saved && saved.url === pageUrl(destination);
          store(RETURN_KEY, JSON.stringify({
            url: pageUrl(destination),
            y: sameOrigin ? saved.y : rememberScrollFor(destination),
            paneY: sameOrigin ? saved.paneY : 0,
            t: Date.now()
          }));
          drop('stackly:404-origin');
          window.location.assign(destination);

        });
      });
    }

    if (homeButton) {
      homeButton.addEventListener("click", function (e) {
        e.preventDefault();
        leave(function () { window.location.assign("index.html"); });
      });
    }

    if (!hasGSAP || prefersReduced) return;

    var timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    timeline
      .from("[data-error-logo]", { y: -18, autoAlpha: 0, scale: 0.94, duration: 0.7 })
      .from("[data-error-code]", { x: -85, autoAlpha: 0, rotation: -5, duration: 0.9 }, "-=0.42")
      .from(
        "[data-error-digit], [data-error-zero]",
        {
          y: -85,
          scale: 0.4,
          autoAlpha: 0,
          rotation: function (i) { return i % 2 ? 12 : -12; },
          duration: 0.85,
          stagger: 0.12,
          ease: "back.out(1.8)"
        },
        "-=0.52"
      )
      .from("[data-error-kicker]", { y: 22, autoAlpha: 0, duration: 0.6 }, "-=0.48")
      .from("[data-error-title]", { y: 34, autoAlpha: 0, duration: 0.9 }, "-=0.42")
      .from("[data-error-text]", { y: 26, autoAlpha: 0, duration: 0.75 }, "-=0.6")
      .from("[data-error-actions] > *", { y: 22, autoAlpha: 0, stagger: 0.12, duration: 0.65 }, "-=0.5")
      .from("[data-error-note]", { y: 16, autoAlpha: 0, duration: 0.55 }, "-=0.35")
      .from("[data-error-shape]", { scale: 0.7, autoAlpha: 0, stagger: 0.12, duration: 0.7, ease: "back.out(1.5)" }, "-=0.35");

    gsap.to("[data-error-zero]", {
      scale: 1.08,
      duration: 0.65,
      repeat: -1,
      repeatDelay: 1.7,
      yoyo: true,
      ease: "sine.inOut"
    });
    gsap.to("[data-error-shape]", {
      y: 18,
      scale: 1.05,
      duration: 3.4,
      repeat: -1,
      yoyo: true,
      stagger: 0.5,
      ease: "sine.inOut"
    });
  }

  /* ------------------------------------------------------------------
     18. Footer year
  ------------------------------------------------------------------ */
  function year() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ------------------------------------------------------------------
     18b. Live date ([data-today]) — "Friday, September 25, 2026".
     Re-renders on the tab's own clock schedule, and again on focus or
     on return to the tab, so an overnight / timezone change is picked up
     without a reload. [data-date-mode] picks the style; [data-time]
     adds a live clock to the same line. DATE_MODES lives with the other
     constants at the top, because the boot calls below run before the
     body of this function and would read it as undefined.
  ------------------------------------------------------------------ */
  function liveDate() {
    var nodes = document.querySelectorAll("[data-today]");
    if (!nodes.length) return;

    var render = function () {
      var now = new Date();
      nodes.forEach(function (el) {
        var mode = DATE_MODES[el.getAttribute("data-date-mode") || "short"] || DATE_MODES.short;
        el.textContent = now.toLocaleDateString("en-US", mode);
        var clock = el.querySelector("[data-time]");
        if (clock) clock.textContent = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      });
    };

    var hasClock = !!document.querySelector("[data-today] [data-time]");
    render();

    /* A minute tick refreshes any clock; a 30s tick is enough to notice a
       DST or system-time change for date-only lines. */
    setInterval(render, hasClock ? 1000 : 30000);
    document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
    window.addEventListener("focus", render);
    window.addEventListener("pageshow", render);
  }

  /* ------------------------------------------------------------------
     20. Search panel toggle
  ------------------------------------------------------------------ */
  function searchPanel() {
    var header = document.querySelector(".site-header");
    var open = document.getElementById("searchToggle");
    var close = document.getElementById("searchClose");
    var input = document.querySelector(".search-panel__form input");
    if (!header || !open) return;

    var setOpen = function (state) {
      header.classList.toggle("is-searching", state);
      open.setAttribute("aria-expanded", String(state));
      if (state && input) setTimeout(function () { input.focus(); }, 220);
    };

    open.addEventListener("click", function () {
      setOpen(!header.classList.contains("is-searching"));
    });
    if (close) close.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     19. Active nav link based on current file
  ------------------------------------------------------------------ */
  function highlightNav() {
    var here = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    document.querySelectorAll(".nav__link").forEach(function (link) {
      var href = (link.getAttribute("href") || "").toLowerCase();
      var name = href.split("/").pop() || "";
      if (name === here) link.classList.add("is-active");
    });
  }
})();
