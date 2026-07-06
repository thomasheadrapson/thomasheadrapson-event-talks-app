// State Management
let updatesState = [];
let filteredUpdates = [];
let selectedUpdate = null;

const filters = {
    search: '',
    type: 'all',
    sort: 'desc' // 'desc' (newest first) or 'asc' (oldest first)
};

const tweetSettings = {
    style: 'classic',
    includeLink: true,
    includeTags: true
};

// DOM Elements
const elements = {
    refreshBtn: document.getElementById('refresh-btn'),
    refreshIcon: document.getElementById('refresh-icon'),
    statusBadge: document.getElementById('status-badge'),
    statusText: document.getElementById('status-text'),
    lastUpdatedTime: document.getElementById('last-updated-time'),
    
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    typeFiltersContainer: document.getElementById('type-filters'),
    sortDescBtn: document.getElementById('sort-desc'),
    sortAscBtn: document.getElementById('sort-asc'),
    
    statFeatures: document.getElementById('stat-features'),
    statChanges: document.getElementById('stat-changes'),
    statDeprecations: document.getElementById('stat-deprecations'),
    visibleCount: document.getElementById('visible-count'),
    totalCount: document.getElementById('total-count'),
    
    loader: document.getElementById('loader'),
    updatesGrid: document.getElementById('updates-grid'),
    emptyState: document.getElementById('empty-state'),
    resetFiltersBtn: document.getElementById('reset-filters-btn'),
    
    // Modal Elements
    tweetModal: document.getElementById('tweet-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    previewType: document.getElementById('tweet-preview-type'),
    previewDate: document.getElementById('tweet-preview-date'),
    previewBody: document.getElementById('tweet-preview-body'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    includeLinkCheckbox: document.getElementById('option-include-link'),
    includeTagsCheckbox: document.getElementById('option-include-tags'),
    charCounter: document.getElementById('char-counter'),
    progressIndicator: document.getElementById('progress-indicator'),
    charCountWrapper: document.querySelector('.char-count-wrapper'),
    copyTweetBtn: document.getElementById('copy-tweet-btn'),
    publishTweetBtn: document.getElementById('publish-tweet-btn'),
    toastContainer: document.getElementById('toast-container')
};

// SVG Circle properties for character count progress
const CIRCLE_CIRCUMFERENCE = 75.39; // 2 * PI * r (12)

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    fetchUpdates(false);
});

// Event Listeners
function initEventListeners() {
    // Refresh action
    elements.refreshBtn.addEventListener('click', () => fetchUpdates(true));
    
    // Search action
    elements.searchInput.addEventListener('input', (e) => {
        filters.search = e.target.value.toLowerCase().trim();
        elements.clearSearchBtn.style.display = filters.search.length > 0 ? 'block' : 'none';
        applyFilters();
    });
    
    elements.clearSearchBtn.addEventListener('click', () => {
        elements.searchInput.value = '';
        filters.search = '';
        elements.clearSearchBtn.style.display = 'none';
        elements.searchInput.focus();
        applyFilters();
    });
    
    // Filter chips
    elements.typeFiltersContainer.addEventListener('click', (e) => {
        const chip = e.target.closest('.filter-chip');
        if (!chip) return;
        
        // Toggle active class
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        
        filters.type = chip.dataset.type;
        applyFilters();
    });
    
    // Sort buttons
    elements.sortDescBtn.addEventListener('click', () => {
        elements.sortDescBtn.classList.add('active');
        elements.sortAscBtn.classList.remove('active');
        filters.sort = 'desc';
        applyFilters();
    });
    
    elements.sortAscBtn.addEventListener('click', () => {
        elements.sortAscBtn.classList.add('active');
        elements.sortDescBtn.classList.remove('active');
        filters.sort = 'asc';
        applyFilters();
    });
    
    // Reset Empty State button
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Modal Actions
    elements.closeModalBtn.addEventListener('click', closeTweetModal);
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) closeTweetModal();
    });
    
    // Tweet composer input triggers
    elements.tweetTextarea.addEventListener('input', updateCharCount);
    
    elements.includeLinkCheckbox.addEventListener('change', (e) => {
        tweetSettings.includeLink = e.target.checked;
        regenerateTweetContent();
    });
    
    elements.includeTagsCheckbox.addEventListener('change', (e) => {
        tweetSettings.includeTags = e.target.checked;
        regenerateTweetContent();
    });
    
    // Template chips
    document.querySelectorAll('.template-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            document.querySelectorAll('.template-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            tweetSettings.style = chip.dataset.style;
            regenerateTweetContent();
        });
    });
    
    // Copy Tweet button
    elements.copyTweetBtn.addEventListener('click', copyTweetText);
    
    // Publish to Twitter/X
    elements.publishTweetBtn.addEventListener('click', publishTweet);
}

// Fetch Release Notes
async function fetchUpdates(forceRefresh = false) {
    // Show loading UI state
    elements.refreshBtn.disabled = true;
    elements.refreshIcon.classList.add('fa-spin');
    elements.statusBadge.className = 'status-badge loading';
    elements.statusText.textContent = 'Syncing...';
    
    if (forceRefresh || updatesState.length === 0) {
        elements.loader.style.display = 'flex';
        elements.updatesGrid.style.display = 'none';
        elements.emptyState.style.display = 'none';
    }
    
    try {
        const url = `/api/updates${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'warning') {
            updatesState = data.updates;
            
            // Format current time
            const now = new Date();
            elements.lastUpdatedTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            if (data.status === 'warning') {
                showToast(data.message, 'warning');
            } else if (forceRefresh) {
                showToast('Release notes synchronized successfully.', 'success');
            }
            
            updateMetadataCounts();
            applyFilters();
        } else {
            showToast(data.message || 'Failed to fetch release notes.', 'error');
            showEmptyState();
        }
    } catch (err) {
        console.error(err);
        showToast('Network error while fetching release notes.', 'error');
        showEmptyState();
    } finally {
        elements.refreshBtn.disabled = false;
        elements.refreshIcon.classList.remove('fa-spin');
        elements.statusBadge.className = 'status-badge synced';
        elements.statusText.textContent = 'Synced';
        elements.loader.style.display = 'none';
    }
}

// Update counters in Sidebar filters
function updateMetadataCounts() {
    const total = updatesState.length;
    const features = updatesState.filter(up => up.type === 'Feature').length;
    const changes = updatesState.filter(up => up.type === 'Change').length;
    const deprecations = updatesState.filter(up => up.type === 'Deprecation').length;
    const general = updatesState.filter(up => up.type === 'General').length;
    
    document.getElementById('count-all').textContent = total;
    document.getElementById('count-feature').textContent = features;
    document.getElementById('count-change').textContent = changes;
    document.getElementById('count-deprecation').textContent = deprecations;
    document.getElementById('count-general').textContent = general;
    
    elements.statFeatures.textContent = features;
    elements.statChanges.textContent = changes;
    elements.statDeprecations.textContent = deprecations;
    elements.totalCount.textContent = total;
}

// Reset Filters
function resetFilters() {
    elements.searchInput.value = '';
    filters.search = '';
    elements.clearSearchBtn.style.display = 'none';
    
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    document.querySelector('.filter-chip[data-type="all"]').classList.add('active');
    filters.type = 'all';
    
    elements.sortDescBtn.classList.add('active');
    elements.sortAscBtn.classList.remove('active');
    filters.sort = 'desc';
    
    applyFilters();
}

// Client-side Filters & Sorting
function applyFilters() {
    filteredUpdates = updatesState.filter(update => {
        // Search filter
        const textContent = (update.content + ' ' + update.type + ' ' + update.date).toLowerCase();
        const matchesSearch = textContent.includes(filters.search);
        
        // Type filter
        const matchesType = filters.type === 'all' || update.type === filters.type;
        
        return matchesSearch && matchesType;
    });
    
    // Sort
    filteredUpdates.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return filters.sort === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    elements.visibleCount.textContent = filteredUpdates.length;
    renderUpdatesGrid();
}

// Render release note cards
function renderUpdatesGrid() {
    if (filteredUpdates.length === 0) {
        elements.updatesGrid.style.display = 'none';
        elements.emptyState.style.display = 'block';
        return;
    }
    
    elements.emptyState.style.display = 'none';
    elements.updatesGrid.innerHTML = '';
    
    filteredUpdates.forEach(update => {
        const card = document.createElement('div');
        card.className = `update-card ${selectedUpdate && selectedUpdate.id === update.id ? 'selected' : ''}`;
        card.dataset.id = update.id;
        
        // Class mapping for type badges
        let badgeClass = 'badge-general';
        let typeIcon = 'fa-info-circle';
        if (update.type === 'Feature') {
            badgeClass = 'badge-feature';
            typeIcon = 'fa-circle-plus';
        } else if (update.type === 'Change') {
            badgeClass = 'badge-change';
            typeIcon = 'fa-pen-to-square';
        } else if (update.type === 'Deprecation') {
            badgeClass = 'badge-deprecation';
            typeIcon = 'fa-triangle-exclamation';
        }
        
        card.innerHTML = `
            <div class="update-card-header">
                <div class="card-badges">
                    <span class="badge ${badgeClass}">
                        <i class="fa-solid ${typeIcon}"></i> ${update.type}
                    </span>
                    <span class="date-badge">
                        <i class="fa-regular fa-calendar"></i> ${update.date}
                    </span>
                </div>
                <div class="card-actions">
                    <button class="card-action-btn copy-btn-quick" title="Copy Text Preview">
                        <i class="fa-solid fa-copy"></i>
                    </button>
                    <button class="card-action-btn tweet-btn-quick" title="Compose Tweet">
                        <i class="fa-brands fa-x-twitter"></i>
                    </button>
                    <div class="card-action-btn select-indicator" title="Selected Update">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </div>
            </div>
            <div class="update-card-content">
                ${update.content}
            </div>
        `;
        
        // Card click selection
        card.addEventListener('click', (e) => {
            // If user clicked link, don't trigger selection modal
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            
            // If user clicked copy quick action
            if (e.target.closest('.copy-btn-quick')) {
                e.stopPropagation();
                copyRawContent(update);
                return;
            }

            // Quick tweet or standard card click opens modal
            openTweetModal(update);
        });
        
        elements.updatesGrid.appendChild(card);
    });
    
    elements.updatesGrid.style.display = 'flex';
}

// Copy Raw Update text to clipboard
function copyRawContent(update) {
    const rawText = stripHtml(update.content);
    const textToCopy = `BigQuery Release Note [${update.date} - ${update.type}]:\n\n${rawText}`;
    
    navigator.clipboard.writeText(textToCopy)
        .then(() => showToast('Update text copied to clipboard.', 'success'))
        .catch(() => showToast('Failed to copy text.', 'error'));
}

// Open Tweet Composer
function openTweetModal(update) {
    selectedUpdate = update;
    
    // Highlight active card
    document.querySelectorAll('.update-card').forEach(card => {
        if (card.dataset.id === update.id) {
            card.classList.add('selected');
        } else {
            card.classList.remove('selected');
        }
    });
    
    // Populate Modal Preview
    elements.previewType.textContent = update.type;
    elements.previewType.className = `badge badge-${update.type.toLowerCase()}`;
    elements.previewDate.textContent = update.date;
    elements.previewBody.innerHTML = update.content;
    
    // Fill text editor
    regenerateTweetContent();
    
    // Open Overlay
    elements.tweetModal.style.display = 'flex';
    elements.tweetTextarea.focus();
}

function closeTweetModal() {
    elements.tweetModal.style.display = 'none';
}

// Strip HTML Helper
function stripHtml(html) {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    
    // Format list items nicely with bullets
    const listItems = tempDiv.querySelectorAll('li');
    listItems.forEach(li => {
        li.innerHTML = '• ' + li.innerHTML + '\n';
    });
    
    // Add extra spacing for paragraphs
    const paragraphs = tempDiv.querySelectorAll('p');
    paragraphs.forEach(p => {
        p.innerHTML = p.innerHTML + '\n\n';
    });
    
    let text = tempDiv.textContent || tempDiv.innerText || "";
    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, '\n\n').trim();
    return text;
}

// Smart Tweet Generator (Truncates summary to fit 280-char X limit exactly)
function regenerateTweetContent() {
    if (!selectedUpdate) return;
    
    const type = selectedUpdate.type;
    const date = selectedUpdate.date;
    const link = selectedUpdate.link;
    const hashtags = '#BigQuery #GoogleCloud #DataEngineering';
    
    // Strip HTML to get clean text
    const cleanContent = stripHtml(selectedUpdate.content);
    
    // Calculate static template structures
    let header = '';
    let bodyIntro = '';
    let bodyOutro = '';
    
    if (tweetSettings.style === 'classic') {
        header = `BigQuery ${type} Update (${date}):\n\n`;
    } else if (tweetSettings.style === 'exciting') {
        header = `🔥 New BigQuery ${type}! (${date})\n\n`;
        bodyIntro = `👉 `;
    } else if (tweetSettings.style === 'professional') {
        header = `Google Cloud has announced a new BigQuery ${type.toLowerCase()} (${date}).\n\n`;
    } else if (tweetSettings.style === 'minimal') {
        header = `BQ ${type} (${date}): `;
    }
    
    if (tweetSettings.includeLink && link) {
        bodyOutro += `\n\nRead more: ${link}`;
    }
    if (tweetSettings.includeTags) {
        bodyOutro += `\n${hashtags}`;
    }
    
    // Twitter/X 280 character limit matching
    const staticLength = header.length + bodyIntro.length + bodyOutro.length;
    const maxSummaryLength = 280 - staticLength;
    
    let summaryText = cleanContent;
    if (summaryText.length > maxSummaryLength) {
        // Leave room for ellipsis "..."
        summaryText = summaryText.substring(0, maxSummaryLength - 3).trim() + '...';
    }
    
    const finalTweetText = `${header}${bodyIntro}${summaryText}${bodyOutro}`;
    elements.tweetTextarea.value = finalTweetText;
    updateCharCount();
}

// Sync Composer Text box explicitly
function updateCharCount() {
    const text = elements.tweetTextarea.value;
    const length = text.length;
    const remaining = 280 - length;
    
    elements.charCounter.textContent = remaining;
    
    // Update indicator colors and class states
    if (remaining < 0) {
        elements.charCountWrapper.className = 'char-count-wrapper danger';
    } else if (remaining <= 30) {
        elements.charCountWrapper.className = 'char-count-wrapper warning';
    } else {
        elements.charCountWrapper.className = 'char-count-wrapper';
    }
    
    // SVG circular progress percentage offset calculation
    // Max capacity 280
    const progressPct = Math.min(length / 280, 1.0);
    const strokeOffset = CIRCLE_CIRCUMFERENCE - (progressPct * CIRCLE_CIRCUMFERENCE);
    elements.progressIndicator.style.strokeDashoffset = strokeOffset;
}

// Direct Action: Post to Twitter Web Intent
function publishTweet() {
    const text = elements.tweetTextarea.value;
    if (text.length === 0) return;
    
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(xUrl, '_blank');
}

// Copy Tweeting texts
function copyTweetText() {
    const text = elements.tweetTextarea.value;
    if (text.length === 0) return;
    
    navigator.clipboard.writeText(text)
        .then(() => {
            showToast('Tweet content copied to clipboard!', 'success');
        })
        .catch(() => {
            showToast('Failed to copy tweet.', 'error');
        });
}

// Toast Notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'warning') icon = 'fa-exclamation-triangle';
    if (type === 'error') icon = 'fa-times-circle';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;
    
    elements.toastContainer.appendChild(toast);
    
    // Animate removal after 3.5s
    setTimeout(() => {
        toast.style.transition = 'all 0.5s ease';
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 500);
    }, 3500);
}
