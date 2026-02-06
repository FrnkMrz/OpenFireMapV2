/**
 * mobile-ui.js
 * Additive Mobile-UI, ohne Desktop-Code zu verändern.
 *
 * Prinzip:
 * - Desktop bleibt 1:1 wie im main (ui.js/app.js/map.js unverändert).
 * - Auf Mobile blenden wir Desktop-Controls aus und zeigen eine eigene UI-Schicht.
 * - Aktionen werden über die existierenden Desktop-Buttons ausgelöst (button.click()).
 *   Dadurch müssen wir keine Imports/Exports anfassen und riskieren keine Desktop-Regression.
 */

(function initMobileUI() {
  const isMobile =
    window.matchMedia?.('(pointer: coarse)').matches ||
    window.innerWidth < 1024;

  if (!isMobile) return;

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);

  const show = (el) => el && el.classList.remove('hidden');
  const hide = (el) => el && el.classList.add('hidden');
  const isHidden = (el) => !el || el.classList.contains('hidden');

  function safeClick(id) {
    const el = $(id);
    if (!el) return false;
    el.click();
    return true;
  }

  function closeDesktopPopupMenus() {
    const layerMenu = $('layer-menu');
    const exportMenu = $('export-menu');
    const legalModal = $('legal-modal');

    // Nur schließen, wenn sichtbar
    if (layerMenu && !isHidden(layerMenu)) hide(layerMenu);
    if (exportMenu && !isHidden(exportMenu)) hide(exportMenu);
    if (legalModal && !isHidden(legalModal)) hide(legalModal);

    // aria state (falls vorhanden)
    $('layer-btn-trigger')?.setAttribute('aria-expanded', 'false');
    $('export-btn-trigger')?.setAttribute('aria-expanded', 'false');
    $('btn-legal-trigger')?.setAttribute('aria-expanded', 'false');
  }

  function wireLayerMenuAutoClose() {
    const layerMenu = $('layer-menu');
    if (!layerMenu) return;

    // 1) Beim Klick auf einen Layer-Button sofort schließen
    const btns = layerMenu.querySelectorAll('button');
    btns.forEach((b) => {
      // nur einmal binden
      if (b.__ofmMobileCloseBound) return;
      b.__ofmMobileCloseBound = true;

      b.addEventListener(
        'click',
        () => {
          // erst klick durchlassen, dann schließen
          setTimeout(() => {
            closeDesktopPopupMenus();
          }, 0);
        },
        { passive: true }
      );
    });

    // 2) Tap außerhalb des Menüs schließt sofort (capture, damit es nicht verschluckt wird)
    const closeOnOutside = (e) => {
      if (isHidden(layerMenu)) return;

      const t = e.target;
      const trigger = $('layer-btn-trigger');

      const inside =
        layerMenu.contains(t) ||
        (trigger && trigger.contains(t));

      if (!inside) closeDesktopPopupMenus();
    };

    // einmalig registrieren
    if (!document.__ofmMobileLayerOutsideBound) {
      document.__ofmMobileLayerOutsideBound = true;
      document.addEventListener('pointerdown', closeOnOutside, true);
    }
  }

  // ---------------------------
  // Elements
  // ---------------------------
  const desktopControls = $('desktop-controls');     // komplette Desktop-Bar (Search/Locate/Layer/Export)
  const desktopLegalBtn = $('btn-legal-trigger');    // Info & Recht (Desktop)

  const mobileControls = $('mobile-controls');
  const mobileMenu = $('mobile-menu');
  const mobileBurger = $('mobile-burger-btn');
  const mobileLocate = $('mobile-locate-btn');
  const mobileOpenLayers = $('mobile-open-layers');
  const mobileOpenSearch = $('mobile-open-search');
  const mobileOpenLegal = $('mobile-open-legal');
  const mobileClose = $('mobile-close-menu');

  // Wenn Markup fehlt: lieber gar nichts machen als Desktop kaputt.
  if (!mobileControls || !mobileBurger || !mobileLocate || !mobileMenu) return;

  function moveLocateToBottomCenter() {
    const btn = mobileLocate;
    if (!btn) return;

    // Container unten mittig
    let dock = document.getElementById('mobile-locate-dock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'mobile-locate-dock';
      dock.style.position = 'fixed';
      dock.style.left = '50%';
      dock.style.bottom = '32px';
      dock.style.transform = 'translateX(-50%)';
      dock.style.zIndex = '2500';
      dock.style.pointerEvents = 'auto';
      document.body.appendChild(dock);
    }

    dock.appendChild(btn);
  }

  function alignBurgerAndStatusTop() {
    const burger = document.getElementById('mobile-burger-btn');

    // Status-Box: versuche die üblichen Kandidaten
    const status =
      document.getElementById('status-box') ||
      document.getElementById('status-panel') ||
      document.getElementById('status') ||
      document.querySelector('[data-ofm-status]');

    if (!burger || !status) return;

    // Einheitliche Position für beide
    const TOP = '18px';
    const SIDE = '18px';

    burger.style.position = 'fixed';
    burger.style.top = TOP;
    burger.style.left = SIDE;
    burger.style.marginTop = '0';

    status.style.position = 'fixed';
    status.style.top = TOP;
    status.style.bottom = 'auto'; // Fix: Streckung auf iPad verhindern
    status.style.right = SIDE;
    status.style.marginTop = '0';
  }


  // ---------------------------
  // Desktop ausblenden / Mobile einblenden
  // ---------------------------
  hide(desktopControls);
  if (desktopLegalBtn) hide(desktopLegalBtn.parentElement || desktopLegalBtn);

  // Burger Button für iPad sichtbar machen (Klasse md:hidden stört dort)
  mobileControls.classList.remove('md:hidden');
  show(mobileControls);

  moveLocateToBottomCenter();

  alignBurgerAndStatusTop();

  if (mobileClose) hide(mobileClose);

  // ---------------------------
  // Burger Menü
  // ---------------------------
  function closeMobileMenu() {
    hide(mobileMenu);
    mobileBurger.setAttribute('aria-expanded', 'false');
  }

  function toggleMobileMenu() {
    const open = isHidden(mobileMenu);
    if (open) show(mobileMenu);
    else hide(mobileMenu);
    mobileBurger.setAttribute('aria-expanded', String(open));
  }

  mobileBurger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMobileMenu();
  });

  // Schließen Button
  if (mobileClose) {
    mobileClose.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
    });
  }

  // Klick außerhalb schließt Burger
  document.addEventListener('click', (e) => {
    if (isHidden(mobileMenu)) return;
    const t = e.target;
    const inside = mobileMenu.contains(t) || mobileBurger.contains(t);
    if (!inside) closeMobileMenu();
  });

  // ESC schließt Burger
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMobileMenu();
  });

  // ---------------------------
  // Locate (Mobile -> Desktop Locate-Button)
  // ---------------------------
  mobileLocate.addEventListener('click', (e) => {
    e.preventDefault();
    closeMobileMenu();
    closeDesktopPopupMenus();
    safeClick('locate-btn');
  });

  // ---------------------------
  // Layer (Mobile -> Desktop Layer Trigger)
  // ---------------------------
  if (mobileOpenLayers) {
    mobileOpenLayers.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      closeDesktopPopupMenus();

      // Desktop-Menü öffnen
      safeClick('layer-btn-trigger');

      // Auto-close Hooks setzen (nachdem es sichtbar ist)
      setTimeout(() => {
        wireLayerMenuAutoClose();
      }, 0);
    });
  }


  const mobileSearchModal = document.getElementById('mobile-search-modal');
  const mobileSearchBackdrop = document.getElementById('mobile-search-backdrop');
  const mobileSearchClose = document.getElementById('mobile-search-close');
  const mobileSearchInput = document.getElementById('mobile-search-input');
  const mobileSearchGo = document.getElementById('mobile-search-go');

  function openMobileSearch() {
    if (!mobileSearchModal) return;
    mobileSearchModal.classList.remove('hidden');
    setTimeout(() => mobileSearchInput?.focus(), 0);
  }

  function closeMobileSearch() {
    if (!mobileSearchModal) return;
    mobileSearchModal.classList.add('hidden');
  }

  if (mobileOpenSearch && !mobileOpenSearch.__bound) {
    mobileOpenSearch.__bound = true;

    mobileOpenSearch.addEventListener('click', (e) => {
      e.preventDefault();

      // Burger-Menü schließen (dein vorhandener Close-Call)
      if (typeof closeMobileMenu === 'function') closeMobileMenu();
      if (typeof closeMenu === 'function') closeMenu();

      openMobileSearch();
    });
  }

  // Close-Events
  mobileSearchClose?.addEventListener('click', closeMobileSearch);
  mobileSearchBackdrop?.addEventListener('click', closeMobileSearch);

  // Suche ausführen:
  // Wir benutzen die bestehende Desktop-Suche intern, aber ohne Desktop-Layout einzublenden.
  function runSearchFromMobile() {
    const q = (mobileSearchInput?.value || '').trim();
    if (!q) return;

    const desktopInput = document.getElementById('search-input');
    const desktopBtn = document.getElementById('search-btn'); // falls vorhanden

    if (desktopInput) {
      desktopInput.value = q;

      // Versuch 1: Button klicken, wenn du einen hast
      if (desktopBtn) desktopBtn.click();
      else {
        // Versuch 2: Enter-Event auf dem Desktop-Input auslösen
        desktopInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        desktopInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      }
    }

    // Modal schließen (auch wenn Suche async ist)
    closeMobileSearch();
  }

  mobileSearchGo?.addEventListener('click', runSearchFromMobile);
  mobileSearchInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSearchFromMobile();
  });

  // ---------------------------
  // Info & Recht (Mobile -> Desktop Legal Trigger)
  // ---------------------------
  if (mobileOpenLegal) {
    mobileOpenLegal.addEventListener('click', (e) => {
      e.preventDefault();
      closeMobileMenu();
      closeDesktopPopupMenus();
      safeClick('btn-legal-trigger');
    });
  }

  // ---------------------------
  // Robustheit bei Rotation / Resize:
  // - Wenn User plötzlich "Desktop" wird (z.B. Tablet), kehren wir zurück.
  // ---------------------------
  window.addEventListener('resize', () => {
    const nowMobile =
      window.matchMedia?.('(pointer: coarse)').matches ||
      window.innerWidth < 1024;

    if (!nowMobile) {
      // Desktop wieder herstellen
      show(desktopControls);
      if (desktopLegalBtn) show(desktopLegalBtn.parentElement || desktopLegalBtn);
      hide(mobileControls);
      mobileControls.classList.add('md:hidden'); // md:hidden wiederherstellen für Desktop
      closeMobileMenu();
      closeDesktopPopupMenus();

      // Reset mobile-specific styles for status box
      const status = document.getElementById('status-box');
      if (status) {
        status.style.top = '';
        status.style.bottom = '';
        status.style.right = '';
        status.style.position = '';
        status.style.marginTop = '';
      }
    }
  });
})();
