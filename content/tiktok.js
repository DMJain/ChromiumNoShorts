/**
 * ChromiumNoShorts — TikTok Blocker
 * Overlays the entire For You feed since TikTok is 100% short-form.
 * Profile pages, search, and other sections remain accessible.
 */

(async () => {
    await NoShorts.init('tiktok');

    const BLOCKED_PATHS = ['/', '/foryou', '/following'];

    function isBlockedPage() {
        const path = window.location.pathname;
        return BLOCKED_PATHS.some(p => path === p || path === p + '/');
    }

    function applyBlock() {
        if (!NoShorts.isActive()) {
            NoShorts.removeOverlay();
            return;
        }

        if (isBlockedPage()) {
            NoShorts.createOverlay(
                'TikTok\'s For You feed is blocked to protect your focus. ' +
                'You can still browse profiles, search, and use other features. ' +
                'Toggle off in the ChromiumNoShorts extension to unblock.'
            );
            NoShorts.reportStats(1);
        } else {
            NoShorts.removeOverlay();
        }
    }

    // Initial check
    applyBlock();

    // Watch for SPA navigation
    NoShorts.onUrlChange(() => {
        applyBlock();
    });

    // MutationObserver to handle dynamic rendering
    NoShorts.observe(() => {
        if (isBlockedPage() && NoShorts.isActive()) {
            const overlay = document.getElementById('noshorts-overlay');
            if (!overlay) {
                applyBlock();
            }
        }
    });

    // Listen for state changes
    chrome.storage.onChanged.addListener(() => {
        setTimeout(applyBlock, 100);
    });
})();
