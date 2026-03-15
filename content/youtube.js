/**
 * ChromiumNoShorts — YouTube Shorts Blocker
 * Blocks Shorts shelves, sidebar links, /shorts/ URLs, and channel tabs.
 */

(async () => {
    await NoShorts.init('youtube');

    // --- URL Redirect: /shorts/VIDEO_ID → /watch?v=VIDEO_ID ---
    function checkAndRedirect() {
        NoShorts.redirectIfMatch(
            /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
            (match) => `https://www.youtube.com/watch?v=${match[1]}`
        );
    }

    // Check on initial load
    checkAndRedirect();

    // Check on SPA navigation
    NoShorts.onUrlChange(() => {
        checkAndRedirect();
        scanAndHide();
    });

    // --- DOM Scanning ---
    const SELECTORS = [
        // Shorts shelves
        'ytd-reel-shelf-renderer',
        'ytd-rich-shelf-renderer[is-shorts]',
        // Individual shorts in grids
        'ytd-rich-item-renderer:has([overlay-style="SHORTS"])',
        'ytd-grid-video-renderer:has([overlay-style="SHORTS"])',
        'ytd-video-renderer:has([overlay-style="SHORTS"])',
        'ytd-compact-video-renderer:has([overlay-style="SHORTS"])',
        // Sidebar links
        'ytd-guide-entry-renderer:has(a[title="Shorts"])',
        'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
        // Channel tab
        'yt-tab-shape[tab-title="Shorts"]',
        // Shorts player
        'ytd-shorts'
    ];

    function scanAndHide() {
        if (!NoShorts.isActive()) return;

        SELECTORS.forEach(selector => {
            try {
                NoShorts.hideElements(selector);
            } catch (e) {
                // :has() may not be supported in older browsers, CSS handles it
            }
        });
    }

    // --- MutationObserver for dynamic content ---
    NoShorts.observe(() => {
        scanAndHide();
    });
})();
