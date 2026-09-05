"use strict";

/* =========================================================
   ELEMENTLER
========================================================= */
const scene = document.getElementById("scene");
const closeDiscover = document.getElementById("closeDiscover");
const menuTrigger = document.getElementById("menuTrigger");
const exploreBtn = document.getElementById("exploreBtn");
const cornerMenu = document.getElementById("cornerMenu");
const discoverOverlay = document.getElementById("discoverOverlay");
let lastDiscoverTrigger = menuTrigger;

const pages = {
  home: document.getElementById("page-home"),
  gallery: document.getElementById("page-gallery"),
  info: document.getElementById("page-info"),
  contact: document.getElementById("page-contact")
};

const pageTitles = {
  home: "Eleni Aksoy — Kişisel Sayfa",
  gallery: "Galeri — Eleni Aksoy",
  info: "Bilgi — Eleni Aksoy",
  contact: "İletişim — Eleni Aksoy"
};

/* =========================================================
   GİZLİLİK-DOSTU EVENT KANCASI
   - Netlify Web Analytics sunucu tarafı sayfa trafiğini ölçer.
   - Bu fonksiyon ayrıca gelecekte Plausible / gtag eklenirse
     aynı tıklama olaylarını otomatik aktarabilecek şekilde hazırdır.
========================================================= */
function trackEvent(name, detail = {}) {
  const payload = { name, ...detail, at: Date.now() };
  window.dispatchEvent(new CustomEvent("eleni:analytics", { detail: payload }));

  try {
    const key = "eleni-event-counts";
    const counts = JSON.parse(sessionStorage.getItem(key) || "{}");
    counts[name] = (counts[name] || 0) + 1;
    sessionStorage.setItem(key, JSON.stringify(counts));
  } catch (_) {}

  if (typeof window.plausible === "function") {
    window.plausible(name, { props: detail });
  }
  if (typeof window.gtag === "function") {
    window.gtag("event", name, detail);
  }
}

/* =========================================================
   KEŞFET MENÜSÜ
========================================================= */
function openDiscover(trigger = menuTrigger) {
  lastDiscoverTrigger = trigger || menuTrigger;
  scene?.classList.add("discover-open");
  menuTrigger?.setAttribute("aria-expanded", "true");
  exploreBtn?.setAttribute("aria-expanded", "true");
  discoverOverlay?.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => discoverOverlay?.querySelector("button")?.focus({ preventScroll: true }));
}

function closeDiscoverMenu({ restoreFocus = true } = {}) {
  scene?.classList.remove("discover-open");
  menuTrigger?.setAttribute("aria-expanded", "false");
  exploreBtn?.setAttribute("aria-expanded", "false");
  discoverOverlay?.setAttribute("aria-hidden", "true");
  if (restoreFocus && lastDiscoverTrigger && !lastDiscoverTrigger.hidden) {
    lastDiscoverTrigger.focus({ preventScroll: true });
  }
}

function goTo(pageName, { updateHash = true } = {}) {
  if (!pages[pageName]) return;

  Object.entries(pages).forEach(([name, page]) => {
    const active = name === pageName;
    page?.classList.toggle("active", active);
    page?.setAttribute("aria-hidden", String(!active));
    if (page) page.inert = !active;
  });

  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.go === pageName);
    if (btn.dataset.go === pageName) btn.setAttribute("aria-current", "page");
    else btn.removeAttribute("aria-current");
  });

  document.title = pageTitles[pageName] || pageTitles.home;
  closeDiscoverMenu({ restoreFocus: false });
  cornerMenu?.classList.remove("open");

  // Ana sayfada sol üst menü ikonu gizli, diğer tüm sayfalarda görünür.
  if (cornerMenu) {
    const isHome = pageName === "home";
    cornerMenu.hidden = isHome;
    cornerMenu.setAttribute("aria-hidden", String(isHome));
  }

  if (updateHash) history.replaceState({ page: pageName }, "", `#${pageName}`);
  trackEvent("page_change", { page: pageName });

  if (pageName === "gallery") startGalleryExpiry();
}

closeDiscover?.addEventListener("click", () => closeDiscoverMenu());

menuTrigger?.addEventListener("click", event => {
  event.stopPropagation();
  cornerMenu?.classList.remove("open");
  scene?.classList.contains("discover-open") ? closeDiscoverMenu() : openDiscover(menuTrigger);
});

exploreBtn?.addEventListener("click", event => {
  event.stopPropagation();
  scene?.classList.contains("discover-open") ? closeDiscoverMenu() : openDiscover(exploreBtn);
  trackEvent("discover_open", { source: "home_button" });
});

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => goTo(btn.dataset.go));
});

discoverOverlay?.addEventListener("click", event => {
  if (event.target === discoverOverlay) closeDiscoverMenu();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && scene?.classList.contains("discover-open")) {
    closeDiscoverMenu();
  }
});

/* =========================================================
   GALERİ SLIDER
========================================================= */
const slider = document.getElementById("gallerySlider");
const track = document.getElementById("galleryTrack");
const dotsWrap = document.getElementById("galleryDots");
const prevBtn = document.getElementById("prevSlide");
const nextBtn = document.getElementById("nextSlide");
const galleryControls = document.getElementById("galleryControls");
const galleryEmpty = document.getElementById("galleryEmpty");
const swipeHint = document.getElementById("swipeHint");

let currentIndex = 0;
let startX = 0;
let deltaX = 0;
let dragging = false;
let expiryTimer = null;
let galleryHasSwiped = false;
const EXPIRY_MS = 60_000;
const EXPIRY_KEY = "eleni-gallery-expires-at";

function slides() {
  return track ? [...track.querySelectorAll(".gallery-slide")] : [];
}

function makeDots() {
  if (!dotsWrap) return;
  dotsWrap.innerHTML = "";
  slides().forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = `gallery-dot${i === currentIndex ? " active" : ""}`;
    dot.setAttribute("aria-hidden", "true");
    dotsWrap.appendChild(dot);
  });
}

function updateSlider() {
  if (!slider || !track) return;
  const list = slides();

  if (!list.length) {
    slider.style.display = "none";
    if (galleryControls) galleryControls.style.display = "none";
    if (galleryEmpty) galleryEmpty.style.setProperty("display", "grid", "important");
    return;
  }

  slider.style.display = "block";
  if (galleryEmpty) galleryEmpty.style.setProperty("display", "none", "important");
  currentIndex = Math.max(0, Math.min(currentIndex, list.length - 1));
  track.style.transform = `translateX(-${currentIndex * 100}%)`;
  makeDots();
}

function nextSlide() {
  const list = slides();
  if (!list.length) return;
  currentIndex = (currentIndex + 1) % list.length;
  updateSlider();
  trackEvent("gallery_slide", { index: currentIndex + 1 });
}

function prevSlide() {
  const list = slides();
  if (!list.length) return;
  currentIndex = (currentIndex - 1 + list.length) % list.length;
  updateSlider();
  trackEvent("gallery_slide", { index: currentIndex + 1 });
}

nextBtn?.addEventListener("click", nextSlide);
prevBtn?.addEventListener("click", prevSlide);

slider?.addEventListener("pointerdown", event => {
  dragging = true;
  startX = event.clientX;
  deltaX = 0;
  slider.setPointerCapture?.(event.pointerId);
});

slider?.addEventListener("pointermove", event => {
  if (dragging) deltaX = event.clientX - startX;
});

slider?.addEventListener("pointerup", () => {
  if (!dragging) return;
  dragging = false;
  if (Math.abs(deltaX) > 45) {
    deltaX < 0 ? nextSlide() : prevSlide();
    if (!galleryHasSwiped) {
      galleryHasSwiped = true;
      swipeHint?.classList.add("hidden");
    }
  }
});

slider?.addEventListener("pointercancel", () => { dragging = false; });

/* =========================================================
   GALERİ 60 SANİYE — GERÇEK DAVRANIŞ AÇIKLAMASI
   Dosyalar sunucudan silinmez; yalnızca bu sekme oturumunda gizlenir.
========================================================= */
function expireGallery() {
  if (!track) return;
  const list = slides();
  list.forEach(slide => {
    slide.style.transition = "opacity .45s ease, transform .45s ease";
    slide.style.opacity = "0";
    slide.style.transform = "scale(.985)";
  });

  window.setTimeout(() => {
    list.forEach(slide => {
      const img = slide.querySelector("img");
      if (img) {
        img.removeAttribute("src");
        img.removeAttribute("srcset");
      }
      slide.remove();
    });
    currentIndex = 0;
    updateSlider();
    trackEvent("gallery_expired");
  }, 450);
}

function startGalleryExpiry() {
  if (!track || !slides().length) return;

  let expiresAt = 0;
  try { expiresAt = Number(sessionStorage.getItem(EXPIRY_KEY) || 0); } catch (_) {}

  if (!expiresAt) {
    expiresAt = Date.now() + EXPIRY_MS;
    try { sessionStorage.setItem(EXPIRY_KEY, String(expiresAt)); } catch (_) {}
  }

  const remaining = expiresAt - Date.now();
  if (remaining <= 0) {
    expireGallery();
    return;
  }

  if (expiryTimer) clearTimeout(expiryTimer);
  expiryTimer = setTimeout(expireGallery, remaining);
}

makeDots();

/* =========================================================
   GÖRSEL SÜRÜKLEME KORUMASI
   Not: Web'de ekran görüntüsünü veya doğrudan ağ erişimini tamamen
   engellemek mümkün değildir. Bu yalnızca yanlışlıkla sürüklemeyi önler.
========================================================= */
document.addEventListener("dragstart", event => {
  if (event.target instanceof HTMLImageElement) event.preventDefault();
});

/* =========================================================
   HASH / İLK SAYFA
========================================================= */
const initialHash = location.hash.replace("#", "");
goTo(pages[initialHash] ? initialHash : "home", { updateHash: false });

window.addEventListener("hashchange", () => {
  const hash = location.hash.replace("#", "");
  if (pages[hash]) goTo(hash, { updateHash: false });
});

/* =========================================================
   BİLGİ — SHOW / REAL / GRUP
========================================================= */
const infoChoice = document.getElementById("infoChoice");
const infoDetailCards = [...document.querySelectorAll(".info-detail-card")];

function resetGroupView() {
  const choice = document.getElementById("groupChoice");
  if (choice) choice.style.display = "flex";
  document.querySelectorAll(".group-detail").forEach(el => el.classList.remove("active"));
}

function resetInfoView() {
  infoDetailCards.forEach(card => card.classList.remove("active"));
  if (infoChoice) infoChoice.style.display = "flex";
  resetGroupView();
}

const infoMessages = {
  real: "Merhaba. Siteden ulaştım, sizinle buluşmak istiyorum.",
  show: "Merhaba. Sizinle show olarak ilgileniyorum.",
  group: "Merhaba. Swinger Grup ile ilgili yazdım.",
  cuckold: "Merhaba. Cuckold ile ilgili yazdım.",
  grup: "Merhaba. Grup ile ilgili yazdım.",
  "swinger-group": "Merhaba. Swingerlikle ilgili yazdım."
};

function setInfoContactMessage(key) {
  const card = document.querySelector(".info-detail-card.active");
  if (!card) return;

  let msg = infoMessages[key] || infoMessages[card.dataset.message] || infoMessages.real;
  if (card.id === "info-group") {
    const title = card.querySelector(".group-detail.active .eleni")?.textContent?.trim();
    if (title) msg = `Merhaba. ${title} ile ilgili yazdım.`;
  }

  card.querySelectorAll(".quick-contact").forEach(link => {
    if (link.dataset.channel === "whatsapp") {
      link.href = `https://wa.me/905411181447?text=${encodeURIComponent(msg)}`;
    }
    if (link.dataset.channel === "telegram") {
      link.href = `https://t.me/Eleni_1791?text=${encodeURIComponent(msg)}`;
    }
    link.target = "_self";
    link.rel = "noopener";
  });
}

function openInfoCard(name) {
  const target = document.getElementById(`info-${name}`);
  if (!target) return;
  if (infoChoice) infoChoice.style.display = "none";
  infoDetailCards.forEach(card => card.classList.toggle("active", card === target));
  if (name === "group") resetGroupView();
  setInfoContactMessage(name);
  trackEvent("info_open", { card: name });
}

document.querySelectorAll("[data-info-card]").forEach(btn => {
  btn.addEventListener("click", () => openInfoCard(btn.dataset.infoCard));
});

document.querySelectorAll(".info-back").forEach(btn => {
  btn.addEventListener("click", resetInfoView);
});

document.querySelectorAll('[data-go="info"]').forEach(btn => {
  btn.addEventListener("click", () => setTimeout(resetInfoView, 0));
});

document.querySelectorAll("[data-group-card]").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.groupCard;
    const choice = document.getElementById("groupChoice");
    if (choice) choice.style.display = "none";
    document.querySelectorAll(".group-detail").forEach(el => {
      el.classList.toggle("active", el.id === `group-${key}`);
    });
    setInfoContactMessage(key);
    trackEvent("group_open", { card: key });
  });
});

/* =========================================================
   İLETİŞİM TIKLAMA EVENTLERİ
========================================================= */
document.querySelectorAll("[data-track]").forEach(link => {
  link.addEventListener("click", () => trackEvent(link.dataset.track));
});

/* =========================================================
   PWA / SERVICE WORKER
========================================================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, { once: true });
}
