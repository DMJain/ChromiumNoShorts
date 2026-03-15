/**
 * ChromiumNoShorts — Background Service Worker
 * Handles extension lifecycle, badge updates, and message passing.
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

// Initialize on install
chrome.runtime.onInstalled.addListener(async (details) => {
    if (details.reason === 'install') {
        await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_STATE });
    } else {
        // On update, merge with existing state to preserve user settings
        const result = await chrome.storage.local.get(STORAGE_KEY);
        const existing = result[STORAGE_KEY] || {};
        const merged = { ...DEFAULT_STATE, ...existing };
        merged.sites = { ...DEFAULT_STATE.sites, ...(existing.sites || {}) };
        merged.stats = { ...DEFAULT_STATE.stats, ...(existing.stats || {}) };
        await chrome.storage.local.set({ [STORAGE_KEY]: merged });
    }

    updateBadge();
});

// Listen for storage changes to update badge
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEY]) {
        updateBadge(changes[STORAGE_KEY].newValue);
    }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'STATS_UPDATE') {
        updateStats(message.site, message.count);
        sendResponse({ ok: true });
    } else if (message.type === 'GET_STATE') {
        chrome.storage.local.get(STORAGE_KEY).then(result => {
            sendResponse(result[STORAGE_KEY] || DEFAULT_STATE);
        });
        return true; // Async response
    }
});

/**
 * Update the extension badge to reflect on/off state
 */
async function updateBadge(state) {
    if (!state) {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        state = result[STORAGE_KEY] || DEFAULT_STATE;
    }

    if (state.enabled) {
        await chrome.action.setBadgeText({ text: 'ON' });
        await chrome.action.setBadgeBackgroundColor({ color: '#6C3CE1' });
        try { await chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); } catch (e) { }
    } else {
        await chrome.action.setBadgeText({ text: 'OFF' });
        await chrome.action.setBadgeBackgroundColor({ color: '#6B7280' });
        try { await chrome.action.setBadgeTextColor({ color: '#FFFFFF' }); } catch (e) { }
    }
}

/**
 * Update stats from content scripts
 */
async function updateStats(site, count) {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const state = result[STORAGE_KEY] || DEFAULT_STATE;

    if (!state.stats) state.stats = {};
    state.stats[site] = (state.stats[site] || 0) + count;

    await chrome.storage.local.set({ [STORAGE_KEY]: state });
}

// Set badge on startup
updateBadge();
