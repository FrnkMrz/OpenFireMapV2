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
    window.innerWidth < 1023;

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

  // ---------------------------
  // Desktop ausblenden / Mobile einblenden
  // ---------------------------
  hide(desktopControls);
  if (desktopLegalBtn) hide(desktopLegalBtn.parentElement || desktopLegalBtn);

  show(mobileControls);

  moveLocateToBottomCenter();

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
      window.innerWidth < 768;

    if (!nowMobile) {
      // Desktop wieder herstellen
      show(desktopControls);
      if (desktopLegalBtn) show(desktopLegalBtn.parentElement || desktopLegalBtn);
      hide(mobileControls);
      closeMobileMenu();
      closeDesktopPopupMenus();
    }
  });
})();
