/**
 * ChromiumNoShorts — Instagram Reels Blocker
 * Blocks Reels tab, Reels in feed, and /reels/ URLs.
 * Instagram is a full SPA, so MutationObserver is essential.
 */

(async () => {
    await NoShorts.init('instagram');

    // --- URL Redirect: /reels/ → / ---
    function checkAndRedirect() {
        NoShorts.redirectIfMatch(
            /instagram\.com\/reels\/?/,
            () => 'https://www.instagram.com/'
        );
        // Also redirect individual reel URLs
        NoShorts.redirectIfMatch(
            /instagram\.com\/reel\//,
            () => 'https://www.instagram.com/'
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

        // Hide Reels navigation links
        NoShorts.hideElements('a[href="/reels/"]');
        NoShorts.hideElements('a[href*="/reels/"]');

        // Hide individual reel links in feed
        NoShorts.hideElements('a[href*="/reel/"]');

        // Hide Reels nav items by finding navigation with "Reels" text
        document.querySelectorAll('nav a, a[role="link"]').forEach(link => {
            const text = link.textContent?.trim();
            const ariaLabel = link.getAttribute('aria-label');
            if (
                (text === 'Reels' || ariaLabel === 'Reels') &&
                !link.hasAttribute('data-noshorts-hidden')
            ) {
                // Hide the parent list item or the link itself
                const parent = link.closest('div[role="navigation"]') ? link.parentElement : link;
                parent.setAttribute('data-noshorts-hidden', 'true');
                parent.style.setProperty('display', 'none', 'important');
            }
        });

        // Hide Reels suggestions in feed (containers with reel links)
        document.querySelectorAll('article, div[role="presentation"]').forEach(el => {
            const reelLinks = el.querySelectorAll('a[href*="/reel/"]');
            if (reelLinks.length > 0 && !el.hasAttribute('data-noshorts-hidden')) {
                // Check if this is a reel suggestion section (not a regular post)
                const hasVideo = el.querySelector('video');
                const clipIcon = el.querySelector('svg[aria-label*="Clip"], svg[aria-label*="Reel"]');
                if (hasVideo || clipIcon || reelLinks.length > 1) {
                    el.setAttribute('data-noshorts-hidden', 'true');
                    el.style.setProperty('display', 'none', 'important');
                }
            }
        });
    }

    // --- MutationObserver ---
    NoShorts.observe(() => {
        scanAndHide();
    });
})();
