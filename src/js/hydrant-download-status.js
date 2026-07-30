/**
 * Sichtbare Rückmeldung für den Ladevorgang von Hydrantendaten.
 * Die Komponente kennt keine Karte und kann deshalb auch außerhalb von Leaflet verwendet werden.
 */

import { Config } from './config.js';
import { t } from './i18n.js';

function format(message, values = {}) {
  return message.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? '');
}

export function getHydrantDownloadStatusText(status) {
  const count = Number.isFinite(status.count) ? status.count : 0;

  switch (status.state) {
    case 'loading': return t('hydrant_load_started');
    case 'refreshing': return format(t('hydrant_load_more'), { count });
    case 'slow': return format(t('hydrant_load_slow'), { count });
    case 'success': return format(t('hydrant_load_success'), { count });
    case 'error': return t('hydrant_load_error');
    default: return '';
  }
}

export function createHydrantDownloadStatus(container, {
  onRetry = null,
  showDelayMs = Config.performance.hydrantStatusShowDelayMs,
  slowAfterMs = Config.performance.hydrantStatusSlowAfterMs,
  successDurationMs = Config.performance.hydrantStatusSuccessDurationMs
} = {}) {
  if (!container) throw new Error('Hydranten-Status benötigt ein Container-Element.');

  const element = document.createElement('div');
  element.className = 'hydrant-download-status hidden';
  element.setAttribute('role', 'status');
  element.setAttribute('aria-live', 'polite');
  container.replaceChildren(element);

  let showTimer = null;
  let slowTimer = null;
  let successTimer = null;
  let activeStatus = null;
  let generation = 0;

  const clearTimers = () => {
    for (const timer of [showTimer, slowTimer, successTimer]) {
      if (timer !== null) clearTimeout(timer);
    }
    showTimer = null;
    slowTimer = null;
    successTimer = null;
  };

  const hide = () => {
    element.replaceChildren();
    element.dataset.state = '';
    element.classList.add('hidden');
  };

  const render = (status, withRetry = false) => {
    const text = getHydrantDownloadStatusText(status);
    element.replaceChildren();
    element.dataset.state = status.state || '';
    element.classList.toggle('hidden', !text);
    if (!text) return;

    const indicator = document.createElement('span');
    indicator.className = 'hydrant-download-status__indicator';
    indicator.setAttribute('aria-hidden', 'true');
    const message = document.createElement('span');
    message.textContent = text;
    element.append(indicator, message);

    if (withRetry && typeof onRetry === 'function') {
      const retryButton = document.createElement('button');
      retryButton.id = 'hydrant-data-retry';
      retryButton.type = 'button';
      retryButton.className = 'hydrant-download-status__retry';
      retryButton.textContent = '↻';
      retryButton.setAttribute('aria-label', t('hydrant_load_error'));
      retryButton.title = t('hydrant_load_error');
      retryButton.addEventListener('click', onRetry);
      element.append(retryButton);
    }
  };

  const setLoading = (status) => {
    clearTimers();
    activeStatus = status;
    const currentGeneration = ++generation;
    hide();

    showTimer = setTimeout(() => {
      if (generation === currentGeneration) render(activeStatus);
    }, showDelayMs);
    slowTimer = setTimeout(() => {
      if (generation === currentGeneration) render({ state: 'slow', count: activeStatus.count });
    }, slowAfterMs);
  };

  return {
    update(status) {
      if (status.state === 'loading' || status.state === 'refreshing') {
        setLoading(status);
        return;
      }

      const wasVisible = !element.classList.contains('hidden');
      clearTimers();
      ++generation;
      activeStatus = status;

      if (status.state === 'success') {
        if (!wasVisible) return hide();
        render(status);
        successTimer = setTimeout(hide, successDurationMs);
      } else if (status.state === 'error') {
        render(status, true);
      } else {
        hide();
      }
    },
    clear() {
      clearTimers();
      ++generation;
      activeStatus = null;
      hide();
    },
    destroy() {
      this.clear();
      container.replaceChildren();
    },
    element
  };
}
