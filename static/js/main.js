// Frontend Application Logic - BigQuery Release Notes Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // State Management
    let allEntries = [];
    let selectedUpdate = null;
    let selectedHashtags = new Set(['#BigQuery', '#GoogleCloud']); // Default tags
    let currentTheme = 'dark-theme';
    let currentFilter = 'all';
    let searchQuery = '';
    let isEditingTweet = false;
    let originalTweetBody = '';

    // DOM Elements
    const feedContainer = document.getElementById('feed-content');
    const skeletonLoader = document.getElementById('skeleton-loader');
    const emptyState = document.getElementById('empty-state');
    const warningBanner = document.getElementById('warning-banner');
    const warningText = document.getElementById('warning-text');
    const closeWarningBtn = document.getElementById('close-warning-btn');
    
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastSyncTimeSpan = document.getElementById('last-sync-time');
    
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    
    // Stats Elements
    const statTotal = document.getElementById('stat-total').querySelector('.stat-value');
    const statFeatures = document.getElementById('stat-features').querySelector('.stat-value');
    const statIssues = document.getElementById('stat-issues').querySelector('.stat-value');
    const statChanges = document.getElementById('stat-changes').querySelector('.stat-value');
    
    // Controls
    const searchInput = document.getElementById('search-input');
    const filterTags = document.querySelectorAll('.filter-tag');
    
    // Tweet Drawer Elements
    const tweetDrawer = document.getElementById('tweet-drawer');
    const closeDrawerBtn = document.getElementById('close-drawer-btn');
    const selectedCardPreview = document.getElementById('selected-card-preview');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const charCounter = document.getElementById('char-counter');
    const hashtagsList = document.getElementById('hashtags-list');
    const copyTweetBtn = document.getElementById('copy-tweet-btn');
    const tweetSubmitBtn = document.getElementById('tweet-submit-btn');
    const toast = document.getElementById('toast-message');

    // ----------------------------------------------------
    // Initialization
    // ----------------------------------------------------
    initTheme();
    loadReleaseNotes(false);
    setupEventListeners();

    // ----------------------------------------------------
    // Event Listeners Setup
    // ----------------------------------------------------
    function setupEventListeners() {
        // Refresh Button
        refreshBtn.addEventListener('click', () => {
            loadReleaseNotes(true);
        });

        // Theme Toggle
        themeToggleBtn.addEventListener('click', toggleTheme);

        // Search Input
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().strip();
            renderFeed();
        });

        // Close Warning Banner
        closeWarningBtn.addEventListener('click', () => {
            warningBanner.classList.add('hidden');
        });

        // Filter Tags
        filterTags.forEach(tag => {
            tag.addEventListener('click', (e) => {
                filterTags.forEach(t => t.classList.remove('active'));
                tag.classList.add('active');
                currentFilter = tag.dataset.type;
                renderFeed();
            });
        });

        // Close Drawer Button
        closeDrawerBtn.addEventListener('click', closeComposerDrawer);

        // Tweet Textarea Input
        tweetTextarea.addEventListener('input', () => {
            isEditingTweet = true;
            updateCharCount();
        });

        // Hashtags Clicks
        const hashtagButtons = hashtagsList.querySelectorAll('.hashtag-tag');
        // Pre-activate default tags in UI
        hashtagButtons.forEach(btn => {
            const tag = btn.dataset.tag;
            if (selectedHashtags.has(tag)) {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                toggleHashtag(tag, btn);
            });
        });

        // Copy Button
        copyTweetBtn.addEventListener('click', copyTweetToClipboard);

        // Submit to X Button
        tweetSubmitBtn.addEventListener('click', submitTweetToX);
    }

    // Helper to strip whitespaces
    String.prototype.strip = function() {
        return this.replace(/^\s+|\s+$/g, '');
    };

    // ----------------------------------------------------
    // Theme Management
    // ----------------------------------------------------
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            currentTheme = savedTheme;
        } else {
            // Check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            currentTheme = prefersDark ? 'dark-theme' : 'light-theme';
        }
        
        document.body.className = currentTheme;
    }

    function toggleTheme() {
        if (currentTheme === 'dark-theme') {
            currentTheme = 'light-theme';
        } else {
            currentTheme = 'dark-theme';
        }
        document.body.className = currentTheme;
        localStorage.setItem('theme', currentTheme);
    }

    // ----------------------------------------------------
    // Data Loading & API Calls
    // ----------------------------------------------------
    async function loadReleaseNotes(forceRefresh = false) {
        setLoadingState(true);
        warningBanner.classList.add('hidden');
        
        const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Server returned status ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error) {
                showWarning(data.error);
                setLoadingState(false);
                return;
            }
            
            if (data.warning) {
                showWarning(data.warning);
            }
            
            allEntries = data.entries || [];
            
            // Update stats
            updateStatsUI(data.stats, data.last_updated);
            
            // Render feed
            renderFeed();
            
        } catch (error) {
            console.error('Error loading release notes:', error);
            showWarning(`Failed to fetch release notes: ${error.message}. Please try again later.`);
            
            // Show empty state if we have no entries at all
            if (allEntries.length === 0) {
                emptyState.classList.remove('hidden');
            }
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshIcon.classList.add('spinning');
            refreshBtn.disabled = true;
            skeletonLoader.classList.remove('hidden');
            feedContainer.classList.add('hidden');
            emptyState.classList.add('hidden');
        } else {
            refreshIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
            skeletonLoader.classList.add('hidden');
            feedContainer.classList.remove('hidden');
        }
    }

    function showWarning(message) {
        warningText.textContent = message;
        warningBanner.classList.remove('hidden');
    }

    function updateStatsUI(stats, lastUpdated) {
        if (!stats) return;
        statTotal.textContent = stats.total_updates || 0;
        statFeatures.textContent = stats.feature || 0;
        statIssues.textContent = stats.issue || 0;
        statChanges.textContent = stats.change || 0;
        
        if (lastUpdated) {
            // Format last updated string for view
            lastSyncTimeSpan.textContent = lastUpdated;
        }
    }

    // ----------------------------------------------------
    // Feed Rendering
    // ----------------------------------------------------
    function renderFeed() {
        feedContainer.innerHTML = '';
        
        let filteredEntriesCount = 0;
        
        allEntries.forEach(entry => {
            // Filter the updates inside this entry
            const filteredUpdates = entry.updates.filter(update => {
                // Type Filter
                const typeMatches = currentFilter === 'all' || 
                                    update.type.toLowerCase().includes(currentFilter);
                
                // Search Query Filter
                const searchMatches = searchQuery === '' || 
                                      update.text.toLowerCase().includes(searchQuery) ||
                                      update.type.toLowerCase().includes(searchQuery) ||
                                      entry.date.toLowerCase().includes(searchQuery);
                                      
                return typeMatches && searchMatches;
            });
            
            if (filteredUpdates.length > 0) {
                filteredEntriesCount++;
                
                // Create Date Group
                const dateGroup = document.createElement('article');
                dateGroup.className = 'date-group';
                
                // Date Header
                const dateHeader = document.createElement('div');
                dateHeader.className = 'date-header';
                
                const dateTitle = document.createElement('h2');
                dateTitle.className = 'date-title';
                dateTitle.textContent = entry.date;
                
                const divider = document.createElement('div');
                divider.className = 'date-divider';
                
                const link = document.createElement('a');
                link.className = 'date-link';
                link.href = entry.link;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.innerHTML = `
                    <span>Source</span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                `;
                
                dateHeader.appendChild(dateTitle);
                dateHeader.appendChild(divider);
                dateHeader.appendChild(link);
                dateGroup.appendChild(dateHeader);
                
                // Cards Container
                const cardsContainer = document.createElement('div');
                cardsContainer.className = 'date-cards';
                
                filteredUpdates.forEach(update => {
                    // Create Card
                    const card = document.createElement('div');
                    card.className = `update-card card-${update.type.toLowerCase().replace(/\s+/g, '-')}`;
                    card.id = update.id;
                    
                    // Keep card state active if selected
                    if (selectedUpdate && selectedUpdate.id === update.id) {
                        card.classList.add('selected');
                    }
                    
                    // Card Selection Checkbox
                    const selector = document.createElement('div');
                    selector.className = 'card-selector';
                    selector.innerHTML = `
                        <div class="checkbox-custom" id="check-${update.id}">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                    `;
                    
                    // Card Content
                    const contentWrapper = document.createElement('div');
                    contentWrapper.className = 'card-content-wrapper';
                    
                    const cardHeader = document.createElement('div');
                    cardHeader.className = 'card-header';
                    
                    const badge = document.createElement('span');
                    badge.className = 'badge';
                    badge.textContent = update.type;
                    
                    cardHeader.appendChild(badge);
                    
                    const cardBody = document.createElement('div');
                    cardBody.className = 'card-body';
                    cardBody.innerHTML = update.html; // Insert the safe HTML parsed from feed
                    
                    // Quick Tweet link inside card
                    const quickTweetBtn = document.createElement('button');
                    quickTweetBtn.className = 'quick-tweet-btn';
                    quickTweetBtn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16"><path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/></svg>
                        <span>Select & Compose Tweet</span>
                    `;
                    
                    contentWrapper.appendChild(cardHeader);
                    contentWrapper.appendChild(cardBody);
                    contentWrapper.appendChild(quickTweetBtn);
                    
                    card.appendChild(selector);
                    card.appendChild(contentWrapper);
                    
                    // Card click handler
                    card.addEventListener('click', (e) => {
                        // Prevent triggering if clicking standard links inside the card
                        if (e.target.tagName === 'A') return;
                        toggleCardSelection(update, entry.date);
                    });
                    
                    cardsContainer.appendChild(card);
                });
                
                dateGroup.appendChild(cardsContainer);
                feedContainer.appendChild(dateGroup);
            }
        });
        
        // Show/hide empty state
        if (filteredEntriesCount === 0) {
            emptyState.classList.remove('hidden');
        } else {
            emptyState.classList.add('hidden');
        }
    }

    // ----------------------------------------------------
    // Tweet Selection & Composition Drawer
    // ----------------------------------------------------
    function toggleCardSelection(update, date) {
        const previouslySelected = selectedUpdate;
        
        // Deselect current selected cards in UI
        const allCards = document.querySelectorAll('.update-card');
        allCards.forEach(c => c.classList.remove('selected'));
        
        if (previouslySelected && previouslySelected.id === update.id) {
            // Just toggling off
            selectedUpdate = null;
            closeComposerDrawer();
        } else {
            // Selecting a new update
            selectedUpdate = update;
            selectedUpdate.date = date;
            
            // Add selected class to the specific card DOM element
            const selectedCard = document.getElementById(update.id);
            if (selectedCard) {
                selectedCard.classList.add('selected');
            }
            
            openComposerDrawer();
            generateTweetText();
        }
    }

    function openComposerDrawer() {
        tweetDrawer.classList.add('open');
    }

    function closeComposerDrawer() {
        tweetDrawer.classList.remove('open');
        
        // Deselect cards
        selectedUpdate = null;
        const allCards = document.querySelectorAll('.update-card');
        allCards.forEach(c => c.classList.remove('selected'));
        isEditingTweet = false;
    }

    function toggleHashtag(tag, btnElement) {
        if (selectedHashtags.has(tag)) {
            selectedHashtags.delete(tag);
            btnElement.classList.remove('active');
        } else {
            selectedHashtags.add(tag);
            btnElement.classList.add('active');
        }
        
        // Regenerate tweet text (unless user has manually edited it extensively, but to keep tags working, we append them)
        generateTweetText();
    }

    function generateTweetText() {
        if (!selectedUpdate) {
            selectedCardPreview.textContent = 'Select a release note card to compose a Tweet.';
            tweetTextarea.value = '';
            updateCharCount();
            return;
        }

        // Set card preview text
        selectedCardPreview.innerHTML = `
            <strong>[${selectedUpdate.type}]</strong> ${selectedUpdate.text.substring(0, 120)}${selectedUpdate.text.length > 120 ? '...' : ''}
        `;

        // Compose Tweet Body
        // Structure: "BigQuery [Type] ([Date]): [Body text] [Hashtags]"
        const dateStr = selectedUpdate.date;
        const header = `BigQuery ${selectedUpdate.type} (${dateStr}): `;
        const hashtagsStr = Array.from(selectedHashtags).join(' ');
        
        // Total budget is 280 chars. 
        // We need: header_length + hashtags_length + 2 (spaces) + content
        const maxContentLength = 280 - header.length - hashtagsStr.length - 2;
        
        let bodyText = selectedUpdate.text;
        if (bodyText.length > maxContentLength) {
            // Truncate text to fit
            bodyText = bodyText.substring(0, maxContentLength - 3) + '...';
        }
        
        originalTweetBody = `${header}${bodyText}`;
        
        // Only set textarea if user is not currently typing their own custom text
        if (!isEditingTweet) {
            tweetTextarea.value = `${originalTweetBody}\n\n${hashtagsStr}`;
        } else {
            // If user is editing, just append new hashtags if they clicked tags,
            // but for a better UX, let's update it. Let's reset edit status on card switch.
            // When switching cards, we always overwrite.
            tweetTextarea.value = `${originalTweetBody}\n\n${hashtagsStr}`;
            isEditingTweet = false;
        }
        
        updateCharCount();
    }

    function updateCharCount() {
        const count = tweetTextarea.value.length;
        const remaining = 280 - count;
        
        charCounter.textContent = remaining;
        
        // Visual indicator of character budget
        charCounter.className = '';
        if (remaining < 0) {
            charCounter.classList.add('error');
            tweetSubmitBtn.disabled = true;
        } else if (remaining < 40) {
            charCounter.classList.add('warning');
            tweetSubmitBtn.disabled = false;
        } else {
            tweetSubmitBtn.disabled = false;
        }
        
        if (count === 0) {
            tweetSubmitBtn.disabled = true;
        }
    }

    // ----------------------------------------------------
    // Drawer Actions (Copy & Share)
    // ----------------------------------------------------
    function copyTweetToClipboard() {
        const text = tweetTextarea.value;
        if (!text) return;
        
        navigator.clipboard.writeText(text).then(() => {
            // Show toast message
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        }).catch(err => {
            console.error('Could not copy text: ', err);
            // Fallback for older browsers
            tweetTextarea.select();
            document.execCommand('copy');
            
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
            }, 2000);
        });
    }

    function submitTweetToX() {
        const text = tweetTextarea.value;
        if (!text || text.length > 280) return;
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    }
});
