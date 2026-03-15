/**
 * ChromiumNoShorts — Popup Logic
 * Manages toggle state, chrome.storage, and UI updates.
 */

const STORAGE_KEY = 'noshorts_state';

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

// DOM elements
const masterToggle = document.getElementById('masterToggle');
const statusBar = document.getElementById('statusBar');
const statusText = document.getElementById('statusText');
const statusDot = statusBar.querySelector('.status-dot');
const totalBlocked = document.getElementById('totalBlocked');
const popupContainer = document.querySelector('.popup-container');
const siteToggles = document.querySelectorAll('.site-toggle');

/**
 * Load state from storage and update UI
 */
async function loadState() {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const state = result[STORAGE_KEY] || DEFAULT_STATE;

    // Master toggle
    masterToggle.checked = state.enabled !== false;
    updateMasterUI(state.enabled !== false);

    // Site toggles
    siteToggles.forEach(toggle => {
        const site = toggle.dataset.site;
        toggle.checked = state.sites?.[site] !== false;
        updateCardUI(toggle);
    });

    // Stats
    updateStats(state.stats || {});

    // Detect current site
    detectCurrentSite();
}

/**
 * Save state to storage
 */
async function saveState() {
    const state = {
        enabled: masterToggle.checked,
        sites: {},
        stats: {}
    };

    // Gather site states
    siteToggles.forEach(toggle => {
        state.sites[toggle.dataset.site] = toggle.checked;
    });

    // Preserve existing stats
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const existing = result[STORAGE_KEY] || DEFAULT_STATE;
    state.stats = existing.stats || {};

    await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

/**
 * Update master toggle UI
 */
function updateMasterUI(enabled) {
    if (enabled) {
        popupContainer.classList.remove('disabled');
        statusDot.classList.add('active');
        statusText.textContent = 'Protection Active';
    } else {
        popupContainer.classList.add('disabled');
        statusDot.classList.remove('active');
        statusText.textContent = 'Protection Paused';
    }
}

/**
 * Update card disabled state
 */
function updateCardUI(toggle) {
    const card = toggle.closest('.platform-card');
    if (toggle.checked) {
        card.classList.remove('disabled');
    } else {
        card.classList.add('disabled');
    }
}

/**
 * Update stats display
 */
function updateStats(stats) {
    const total = Object.values(stats).reduce((sum, n) => sum + (n || 0), 0);
    totalBlocked.textContent = total.toLocaleString();
}

/**
 * Detect the current tab's site and highlight it
 */
async function detectCurrentSite() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) return;

        const url = tab.url;
        let currentSite = null;

        if (url.includes('youtube.com')) currentSite = 'youtube';
        else if (url.includes('instagram.com')) currentSite = 'instagram';
        else if (url.includes('tiktok.com')) currentSite = 'tiktok';
        else if (url.includes('twitter.com') || url.includes('x.com')) currentSite = 'twitter';
        else if (url.includes('facebook.com')) currentSite = 'facebook';

        // Highlight the current site card
        document.querySelectorAll('.platform-card').forEach(card => {
            card.style.removeProperty('border-color');
            card.style.removeProperty('background');
        });

        if (currentSite) {
            const card = document.querySelector(`.platform-card[data-site="${currentSite}"]`);
            if (card) {
                card.style.borderColor = 'rgba(108, 60, 225, 0.5)';
                card.style.background = 'rgba(108, 60, 225, 0.08)';
            }
        }
    } catch (e) {
        // May fail if no active tab
    }
}

// --- Event Listeners ---

// Master toggle
masterToggle.addEventListener('change', async () => {
    updateMasterUI(masterToggle.checked);
    await saveState();
});

// Site toggles
siteToggles.forEach(toggle => {
    toggle.addEventListener('change', async () => {
        updateCardUI(toggle);
        await saveState();
    });
});

// Listen for storage changes (e.g., stats updates from content scripts)
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) {
        const newState = changes[STORAGE_KEY].newValue;
        if (newState?.stats) {
            updateStats(newState.stats);
        }
    }
});

// Initialize
loadState();
