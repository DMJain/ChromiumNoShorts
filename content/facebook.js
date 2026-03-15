/**
 * ChromiumNoShorts — Facebook Reels Blocker
 * Blocks Reels in feed, Watch tab, and sidebar navigation.
 * Uses MutationObserver heavily since Facebook re-injects removed DOM.
 */

(async () => {
    await NoShorts.init('facebook');

    // --- URL Redirect: /reel/ and /reels/ ---
    function checkAndRedirect() {
        NoShorts.redirectIfMatch(
            /facebook\.com\/reel\//,
            () => 'https://www.facebook.com/'
        );
        NoShorts.redirectIfMatch(
            /facebook\.com\/reels\//,
            () => 'https://www.facebook.com/'
        );
    }

    checkAndRedirect();
    NoShorts.onUrlChange(() => {
        checkAndRedirect();
        scanAndHide();
    });

    // --- DOM Scanning ---
    function scanAndHide() {
        if (!NoShorts.isActive()) return;

        // Hide Reels sections by aria-label
        NoShorts.hideElements('div[aria-label="Reels"]');
        NoShorts.hideElements('div[aria-label="reel"]');
        NoShorts.hideElements('div[aria-label="Reels and short videos"]');

        // Hide Reels links
        NoShorts.hideElements('a[href*="/reel/"]');
        NoShorts.hideElements('a[href*="/reels/"]');

        // Hide Reels navigation items
        NoShorts.hideElements('a[aria-label="Reels"]');

        // Scan for "Reels" text in sidebar navigation
        document.querySelectorAll('a[role="link"], div[role="link"]').forEach(link => {
            const text = link.textContent?.trim();
            const ariaLabel = link.getAttribute('aria-label');

            if (
                (text === 'Reels' || ariaLabel === 'Reels') &&
                !link.hasAttribute('data-noshorts-hidden')
            ) {
                link.setAttribute('data-noshorts-hidden', 'true');
                link.style.setProperty('display', 'none', 'important');
            }
        });

        // Hide feed units containing Reels carousels
        document.querySelectorAll('div[data-pagelet^="FeedUnit"]').forEach(unit => {
            const hasReels = unit.querySelector(
                'div[aria-label="Reels"], div[aria-label="Reels and short videos"], a[href*="/reel/"]'
            );
            if (hasReels && !unit.hasAttribute('data-noshorts-hidden')) {
                unit.setAttribute('data-noshorts-hidden', 'true');
                unit.style.setProperty('display', 'none', 'important');
            }
        });

        // Hide Reels-related containers by walking up from reel links
        document.querySelectorAll('a[href*="/reel/"]').forEach(link => {
            let parent = link.parentElement;
            let depth = 0;
            while (parent && depth < 8) {
                // Look for a significant container
                const pagelet = parent.getAttribute('data-pagelet');
                if (pagelet && pagelet.includes('FeedUnit')) {
                    if (!parent.hasAttribute('data-noshorts-hidden')) {
                        parent.setAttribute('data-noshorts-hidden', 'true');
                        parent.style.setProperty('display', 'none', 'important');
                    }
                    break;
                }
                parent = parent.parentElement;
                depth++;
            }
        });
    }

    // --- MutationObserver ---
    // Facebook aggressively re-renders, so we observe continuously
    NoShorts.observe(() => {
        scanAndHide();
    });

    // Also run on storage changes
    chrome.storage.onChanged.addListener(() => {
        setTimeout(scanAndHide, 100);
    });
})();
