/**
 * ChromiumNoShorts — X (Twitter) Short Video Blocker
 * Blocks "Videos for you" sections, immersive video player,
 * and video carousels in Explore/Search.
 */

(async () => {
    await NoShorts.init('twitter');

    // --- URL Redirect: /i/videos → /explore ---
    function checkAndRedirect() {
        NoShorts.redirectIfMatch(
            /(?:twitter\.com|x\.com)\/i\/videos/,
            () => {
                const host = window.location.hostname;
                return `https://${host}/explore`;
            }
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

        // Hide immersive media viewer
        NoShorts.hideElements('div[data-testid="immersive-media-viewer"]');

        // Hide video links
        NoShorts.hideElements('a[href="/i/videos"]');

        // Hide "Videos for you" sections by finding heading text
        document.querySelectorAll('h2, span[dir="ltr"]').forEach(el => {
            const text = el.textContent?.trim().toLowerCase();
            if (
                text &&
                (text.includes('videos for you') || text.includes('trending videos')) &&
                !el.hasAttribute('data-noshorts-processed')
            ) {
                el.setAttribute('data-noshorts-processed', 'true');
                // Walk up to find the section container
                let parent = el.parentElement;
                let depth = 0;
                while (parent && depth < 10) {
                    const role = parent.getAttribute('role');
                    const ariaLabel = parent.getAttribute('aria-label');

                    if (role === 'region' || (ariaLabel && ariaLabel.toLowerCase().includes('video'))) {
                        parent.setAttribute('data-noshorts-hidden', 'true');
                        parent.style.setProperty('display', 'none', 'important');
                        break;
                    }

                    // Check if parent is a timeline section
                    if (parent.getAttribute('data-testid') === 'cellInnerDiv') {
                        parent.setAttribute('data-noshorts-hidden', 'true');
                        parent.style.setProperty('display', 'none', 'important');
                        break;
                    }

                    parent = parent.parentElement;
                    depth++;
                }
            }
        });

        // Hide video carousels (horizontal scroll containers with videos)
        document.querySelectorAll('div[data-testid="cellInnerDiv"]').forEach(cell => {
            const videos = cell.querySelectorAll('video, div[data-testid="videoComponent"]');
            const links = cell.querySelectorAll('a[href*="/status/"]');
            // If a cell has videos but is structured like a carousel (multiple videos)
            if (videos.length > 1 && !cell.hasAttribute('data-noshorts-hidden')) {
                cell.setAttribute('data-noshorts-hidden', 'true');
                cell.style.setProperty('display', 'none', 'important');
            }
        });
    }

    // --- MutationObserver ---
    NoShorts.observe(() => {
        scanAndHide();
    });
})();
