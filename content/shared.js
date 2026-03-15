/**
 * ChromiumNoShorts — Shared Utilities
 * Common utilities used by all platform-specific content scripts.
 */

const NoShorts = (() => {
  const STORAGE_KEY = 'noshorts_state';
  const CSS_CLASS = 'noshorts-active';
  let _siteName = '';
  let _observer = null;
  let _blockedCount = 0;
  let _initialized = false;
  let _enabled = true;
  let _siteEnabled = true;

  /**
   * Default storage state
   */
  const DEFAULT_STATE = {
    enabled: true,
    sites: {
      youtube: true,
      instagram: true,
      tiktok: true,
      twitter: true,
      facebook: true
    },
    stats: {
      youtube: 0,
      instagram: 0,
      tiktok: 0,
      twitter: 0,
      facebook: 0
    }
  };

  /**
   * Initialize the blocker for a specific site
   */
  async function init(siteName) {
    _siteName = siteName;
    _initialized = true;

    // Get current state
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const state = result[STORAGE_KEY] || DEFAULT_STATE;
      _enabled = state.enabled !== false;
      _siteEnabled = state.sites?.[siteName] !== false;
    } catch (e) {
      // If storage fails, default to enabled
      _enabled = true;
      _siteEnabled = true;
    }

    applyState();

    // Listen for state changes
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        const newState = changes[STORAGE_KEY].newValue || DEFAULT_STATE;
        _enabled = newState.enabled !== false;
        _siteEnabled = newState.sites?.[siteName] !== false;
        applyState();
      }
    });
  }

  /**
   * Apply/remove the active CSS class on <html>
   */
  function applyState() {
    if (isActive()) {
      document.documentElement.classList.add(CSS_CLASS);
    } else {
      document.documentElement.classList.remove(CSS_CLASS);
    }
  }

  /**
   * Check if blocking is currently active for this site
   */
  function isActive() {
    return _enabled && _siteEnabled;
  }

  /**
   * Create a MutationObserver with debounced callback
   */
  function observe(callback, target = null) {
    if (_observer) {
      _observer.disconnect();
    }

    let debounceTimer = null;
    const debouncedCallback = (mutations) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isActive()) {
          callback(mutations);
        }
      }, 100);
    };

    const observeTarget = target || document.body || document.documentElement;
    _observer = new MutationObserver(debouncedCallback);

    // If body isn't ready yet, wait for it
    if (!document.body) {
      const bodyObserver = new MutationObserver(() => {
        if (document.body) {
          bodyObserver.disconnect();
          _observer.observe(document.body, {
            childList: true,
            subtree: true
          });
          // Run callback once immediately
          if (isActive()) callback([]);
        }
      });
      bodyObserver.observe(document.documentElement, { childList: true });
    } else {
      _observer.observe(observeTarget, {
        childList: true,
        subtree: true
      });
      // Run callback once immediately
      if (isActive()) callback([]);
    }

    return _observer;
  }

  /**
   * Hide elements matching a CSS selector
   * Returns the number of newly hidden elements
   */
  function hideElements(selector) {
    if (!isActive()) return 0;

    const elements = document.querySelectorAll(selector);
    let count = 0;

    elements.forEach(el => {
      if (!el.hasAttribute('data-noshorts-hidden')) {
        el.setAttribute('data-noshorts-hidden', 'true');
        el.style.setProperty('display', 'none', 'important');
        count++;
      }
    });

    if (count > 0) {
      _blockedCount += count;
      reportStats(count);
    }

    return count;
  }

  /**
   * Show previously hidden elements (when toggled off)
   */
  function showElements(selector) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.hasAttribute('data-noshorts-hidden')) {
        el.removeAttribute('data-noshorts-hidden');
        el.style.removeProperty('display');
      }
    });
  }

  /**
   * Redirect if current URL matches a pattern
   */
  function redirectIfMatch(urlPattern, getNewUrl) {
    if (!isActive()) return false;

    const currentUrl = window.location.href;
    const match = currentUrl.match(urlPattern);

    if (match) {
      const newUrl = getNewUrl(match);
      if (newUrl && newUrl !== currentUrl) {
        window.location.replace(newUrl);
        return true;
      }
    }
    return false;
  }

  /**
   * Report blocked stats to background script
   */
  function reportStats(count) {
    try {
      chrome.runtime.sendMessage({
        type: 'STATS_UPDATE',
        site: _siteName,
        count: count
      });
    } catch (e) {
      // Extension context may be invalidated, ignore
    }
  }

  /**
   * Create a full-page overlay blocker (for TikTok)
   */
  function createOverlay(message) {
    const existingOverlay = document.getElementById('noshorts-overlay');
    if (existingOverlay) return existingOverlay;

    const overlay = document.createElement('div');
    overlay.id = 'noshorts-overlay';
    overlay.innerHTML = `
      <div class="noshorts-overlay-content">
        <div class="noshorts-overlay-icon">🛡️</div>
        <h2>Short-form content blocked</h2>
        <p>${message}</p>
        <div class="noshorts-overlay-badge">ChromiumNoShorts</div>
      </div>
    `;

    // Wait for body
    if (document.body) {
      document.body.appendChild(overlay);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(overlay);
      });
    }

    return overlay;
  }

  /**
   * Remove the overlay
   */
  function removeOverlay() {
    const overlay = document.getElementById('noshorts-overlay');
    if (overlay) overlay.remove();
  }

  /**
   * Wait for an element to appear in the DOM
   */
  function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);

      const observer = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) {
          observer.disconnect();
          resolve(el);
        }
      });

      if (document.body) {
        observer.observe(document.body, { childList: true, subtree: true });
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          observer.observe(document.body, { childList: true, subtree: true });
        });
      }

      setTimeout(() => {
        observer.disconnect();
        resolve(null);
      }, timeout);
    });
  }

  /**
   * Listen for URL changes (for SPA navigation)
   */
  function onUrlChange(callback) {
    let lastUrl = location.href;

    // Listen for popstate
    window.addEventListener('popstate', () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        callback(lastUrl);
      }
    });

    // Observe URL changes via history API
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        callback(lastUrl);
      }
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        callback(lastUrl);
      }
    };
  }

  return {
    init,
    isActive,
    observe,
    hideElements,
    showElements,
    redirectIfMatch,
    createOverlay,
    removeOverlay,
    waitForElement,
    onUrlChange,
    reportStats,
    get blockedCount() { return _blockedCount; },
    get siteName() { return _siteName; }
  };
})();
