// Faculty Feedback Automation - Automatically fills all faculty feedback forms
(function() {
    'use strict';
    console.log('[FacultyAutomator] Script loaded successfully');
    console.log('[FacultyAutomator] Current URL:', window.location.href);

    class FacultyAutomator {
        constructor() {
            this.facultyQueue = null;
            this.isRunning = false;
            this.currentIndex = 0;
        }

        // Check if we're on the Faculty List page (My Faculty page)
        isFacultyListPage() {
            const url = window.location.href;
            // Adjust these patterns based on actual URL structure
            return url.includes('/faculty') ||
                   url.includes('/home') ||  
                   url.includes('/Faculty') || 
                   url.includes('MyFaculty') ||
                   document.title.toLowerCase().includes('faculty');
        }

        // Check if we're on a Faculty Feedback Form page
        isFacultyFormPage() {
            // Check for feedback form indicators
            const hasFeedbackForm = document.getElementById('FeedbackRating_Comments') !== null;
            const hasSubmitButton = document.getElementById('btnSubmit') !== null;
            const hasRadioButtons = document.querySelectorAll('input[type="radio"]').length > 0;
            
            return hasFeedbackForm || (hasSubmitButton && hasRadioButtons);
        }

        // Collect all faculty links from the Faculty List page
        collectFacultyLinks() {
            console.log('[FacultyAutomator] Collecting faculty links...');
            console.log('[FacultyAutomator] Current page title:', document.title);
            console.log('[FacultyAutomator] Current URL:', window.location.href);
            
            if (!this.isFacultyListPage()) {
                console.warn('[FacultyAutomator] Not on faculty list page');
                return [];
            }

            // Try multiple selectors to find faculty feedback links
            const facultyLinks = [];
            const seenUrls = new Set();

            // Strategy 1: Look for "Feedback" buttons/links (most specific)
            console.log('[FacultyAutomator] Strategy 1: Looking for Feedback buttons...');
            const feedbackButtons = document.querySelectorAll('a[href*="Feedback"], a[href*="feedback"], a:contains("Feedback"), button:contains("Feedback")');
            console.log(`[FacultyAutomator] Found ${feedbackButtons.length} potential feedback buttons`);
            
            feedbackButtons.forEach(button => {
                const href = button.href;
                const text = button.textContent.trim();
                
                if (href && !seenUrls.has(href) && href.startsWith('http')) {
                    seenUrls.add(href);
                    
                    // Try to find faculty name nearby
                    let facultyName = text;
                    const parent = button.closest('div, li, tr, section');
                    if (parent) {
                        const nameElement = parent.querySelector('h3, h4, h5, strong, b, .name, [class*="name"]');
                        if (nameElement) {
                            facultyName = nameElement.textContent.trim();
                        }
                    }
                    
                    facultyLinks.push({
                        url: href,
                        name: facultyName || 'Faculty Member',
                        selector: 'feedback-button'
                    });
                    console.log(`[FacultyAutomator] Added: ${facultyName} -> ${href}`);
                }
            });

            // Strategy 2: Look for all links on page and filter
            if (facultyLinks.length === 0) {
                console.log('[FacultyAutomator] Strategy 2: Scanning all links...');
                const allLinks = document.querySelectorAll('a[href]');
                console.log(`[FacultyAutomator] Total links on page: ${allLinks.length}`);
                
                allLinks.forEach(link => {
                    const href = link.href;
                    const text = link.textContent.trim().toLowerCase();
                    
                    // Look for feedback-related links
                    if (href && 
                        !seenUrls.has(href) && 
                        href.startsWith('http') &&
                        (text.includes('feedback') || 
                         href.toLowerCase().includes('feedback') ||
                         href.toLowerCase().includes('rating'))) {
                        
                        seenUrls.add(href);
                        facultyLinks.push({
                            url: href,
                            name: link.textContent.trim() || 'Faculty Member',
                            selector: 'all-links-scan'
                        });
                        console.log(`[FacultyAutomator] Added: ${link.textContent.trim()} -> ${href}`);
                    }
                });
            }

            // Strategy 3: Look in specific containers
            if (facultyLinks.length === 0) {
                console.log('[FacultyAutomator] Strategy 3: Looking in containers...');
                const selectors = [
                    'div[class*="course"] a',
                    'div[class*="faculty"] a',
                    '.panel a',
                    '.card a',
                    'table a',
                    'ul li a'
                ];

                selectors.forEach(selector => {
                    try {
                        const links = document.querySelectorAll(selector);
                        links.forEach(link => {
                            const href = link.href;
                            const text = link.textContent.trim();
                            
                            if (href && 
                                !seenUrls.has(href) && 
                                href.startsWith('http') &&
                                text.length > 2 &&
                                !text.toLowerCase().includes('logout') &&
                                !text.toLowerCase().includes('sign out')) {
                                
                                seenUrls.add(href);
                                facultyLinks.push({
                                    url: href,
                                    name: text,
                                    selector: selector
                                });
                            }
                        });
                    } catch (e) {
                        console.log(`[FacultyAutomator] Selector failed: ${selector}`, e);
                    }
                });
            }

            console.log(`[FacultyAutomator] ===== FINAL RESULTS =====`);
            console.log(`[FacultyAutomator] Found ${facultyLinks.length} total faculty links`);
            facultyLinks.forEach((link, idx) => {
                console.log(`[FacultyAutomator] ${idx + 1}. ${link.name} -> ${link.url}`);
            });
            console.log(`[FacultyAutomator] =======================`);

            return facultyLinks;
        }

        // Save faculty queue to sessionStorage
        saveFacultyQueue(links) {
            try {
                const queue = {
                    links: links,
                    currentIndex: 0,
                    totalCount: links.length,
                    startTime: new Date().toISOString()
                };
                sessionStorage.setItem('__amigoFacultyQueue', JSON.stringify(queue));
                console.log('[FacultyAutomator] Saved queue with', links.length, 'faculty members');
                return true;
            } catch (e) {
                console.error('[FacultyAutomator] Failed to save queue:', e);
                return false;
            }
        }

        // Load faculty queue from sessionStorage
        loadFacultyQueue() {
            try {
                const raw = sessionStorage.getItem('__amigoFacultyQueue');
                if (!raw) return null;
                return JSON.parse(raw);
            } catch (e) {
                console.error('[FacultyAutomator] Failed to load queue:', e);
                return null;
            }
        }

        // Update queue progress
        updateQueueProgress(index) {
            try {
                const queue = this.loadFacultyQueue();
                if (queue) {
                    queue.currentIndex = index;
                    sessionStorage.setItem('__amigoFacultyQueue', JSON.stringify(queue));
                }
            } catch (e) {
                console.error('[FacultyAutomator] Failed to update queue:', e);
            }
        }

        // Clear the queue
        clearQueue() {
            try {
                sessionStorage.removeItem('__amigoFacultyQueue');
                console.log('[FacultyAutomator] Queue cleared');
            } catch (e) {
                console.error('[FacultyAutomator] Failed to clear queue:', e);
            }
        }

        // Start the automation process
        startAutomation() {
            console.log('[FacultyAutomator] Starting automation...');

            // If we're on the faculty list page, collect links
            if (this.isFacultyListPage()) {
                const links = this.collectFacultyLinks();
                
                if (links.length === 0) {
                    console.error('[FacultyAutomator] No faculty links found!');
                    alert('❌ No faculty links found on this page.\n\nPlease make sure you are on the "My Faculty" page.');
                    return false;
                }

                // Save queue and start
                this.saveFacultyQueue(links);
                this.isRunning = true;
                
                // Navigate to first faculty
                setTimeout(() => {
                    this.navigateToNextFaculty();
                }, 1000);

                return true;
            }
            
            // If we're already on a form page, check if there's a queue
            if (this.isFacultyFormPage()) {
                const queue = this.loadFacultyQueue();
                if (queue) {
                    console.log('[FacultyAutomator] Resuming automation on form page...');
                    this.isRunning = true;
                    this.handleCurrentForm();
                    return true;
                } else {
                    console.warn('[FacultyAutomator] On form page but no queue found');
                    alert('⚠️ Please start automation from the Faculty List page first.');
                    return false;
                }
            }

            alert('⚠️ Please navigate to the "My Faculty" page first.');
            return false;
        }

        // Navigate to next faculty in queue
        navigateToNextFaculty() {
            const queue = this.loadFacultyQueue();
            
            if (!queue || !queue.links || queue.currentIndex >= queue.links.length) {
                console.log('[FacultyAutomator] ✅ All faculty forms completed!');
                this.clearQueue();
                this.isRunning = false;
                
                // Send completion notification
                try {
                    chrome.runtime.sendMessage({ 
                        action: 'facultyAutomationComplete',
                        totalCount: queue ? queue.totalCount : 0
                    });
                } catch (e) {
                    console.log('[FacultyAutomator] Could not send completion message');
                }
                
                alert('✅ All faculty feedback forms have been completed!\n\nTotal: ' + (queue ? queue.totalCount : 0) + ' forms filled.');
                return;
            }

            const currentFaculty = queue.links[queue.currentIndex];
            console.log(`[FacultyAutomator] Navigating to faculty ${queue.currentIndex + 1}/${queue.totalCount}: ${currentFaculty.name}`);
            
            // Update progress
            this.updateQueueProgress(queue.currentIndex);
            
            // Navigate to the faculty form page
            setTimeout(() => {
                window.location.href = currentFaculty.url;
            }, 1000);
        }

        // Handle the current form (fill and submit)
        handleCurrentForm() {
            console.log('[FacultyAutomator] Handling current form...');

            if (!this.isFacultyFormPage()) {
                console.warn('[FacultyAutomator] Not on a form page, checking queue...');
                // Maybe the page hasn't loaded yet, or we need to navigate
                setTimeout(() => {
                    const queue = this.loadFacultyQueue();
                    if (queue && queue.currentIndex < queue.links.length) {
                        this.navigateToNextFaculty();
                    }
                }, 2000);
                return;
            }

            // Wait for page to fully load
            setTimeout(() => {
                console.log('[FacultyAutomator] Filling form...');
                
                // Use the existing fillSurvey function if available
                if (typeof window.fillSurvey === 'function') {
                    try {
                        window.fillSurvey();
                        console.log('[FacultyAutomator] Form filled and submitted');
                        
                        // Wait for submission to complete, then move to next
                        setTimeout(() => {
                            const queue = this.loadFacultyQueue();
                            if (queue) {
                                queue.currentIndex++;
                                this.saveFacultyQueue(queue.links);
                                this.updateQueueProgress(queue.currentIndex);
                                
                                // Navigate to next faculty
                                this.navigateToNextFaculty();
                            }
                        }, 2000); // Wait 2 seconds after submission
                        
                    } catch (e) {
                        console.error('[FacultyAutomator] Error filling form:', e);
                        alert('❌ Error filling form: ' + e.message + '\n\nAutomation paused.');
                        this.isRunning = false;
                    }
                } else {
                    console.error('[FacultyAutomator] fillSurvey function not found!');
                    alert('❌ Survey handler not loaded. Please refresh the page.');
                    this.isRunning = false;
                }
            }, 1500); // Wait 1.5 seconds for page to load
        }

        // Stop the automation
        stopAutomation() {
            console.log('[FacultyAutomator] Stopping automation...');
            this.isRunning = false;
            this.clearQueue();
            alert('⏸️ Faculty automation stopped.');
        }

        // Get current progress
        getProgress() {
            const queue = this.loadFacultyQueue();
            if (!queue) {
                return { active: false, message: 'No automation running' };
            }
            
            return {
                active: true,
                current: queue.currentIndex + 1,
                total: queue.totalCount,
                percentage: Math.round((queue.currentIndex / queue.totalCount) * 100),
                message: `Processing ${queue.currentIndex + 1} of ${queue.totalCount} faculty members...`
            };
        }
    }

    // Create global instance
    window.facultyAutomator = new FacultyAutomator();
    console.log('[FacultyAutomator] ✅ Ready! Use window.facultyAutomator.startAutomation() to begin.');
    
    // Debug helper function
    window.debugFacultyPage = function() {
        console.log('=== FACULTY PAGE DEBUG INFO ===');
        console.log('Current URL:', window.location.href);
        console.log('Page Title:', document.title);
        console.log('Is Faculty List Page?', window.facultyAutomator.isFacultyListPage());
        console.log('Is Faculty Form Page?', window.facultyAutomator.isFacultyFormPage());
        
        console.log('\n--- Searching for Feedback links ---');
        const feedbackLinks = document.querySelectorAll('a[href*="Feedback"], a[href*="feedback"]');
        console.log(`Found ${feedbackLinks.length} feedback links:`);
        feedbackLinks.forEach((link, idx) => {
            console.log(`${idx + 1}. Text: "${link.textContent.trim()}" | URL: ${link.href}`);
        });
        
        console.log('\n--- All links on page ---');
        const allLinks = document.querySelectorAll('a[href]');
        console.log(`Total links: ${allLinks.length}`);
        console.log('First 20 links:');
        Array.from(allLinks).slice(0, 20).forEach((link, idx) => {
            console.log(`${idx + 1}. "${link.textContent.trim().substring(0, 50)}" -> ${link.href}`);
        });
        
        console.log('\n--- Try collecting faculty links ---');
        const collected = window.facultyAutomator.collectFacultyLinks();
        console.log(`Collected ${collected.length} links`);
        
        console.log('=== END DEBUG INFO ===');
        return collected;
    };
    console.log('[FacultyAutomator] 🔍 Debug helper available: window.debugFacultyPage()');

    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('[FacultyAutomator] Message received:', request.action);
            
            if (request.action === 'startFacultyAutomation') {
                const success = window.facultyAutomator.startAutomation();
                sendResponse({ success: success });
                return true;
            }
            
            if (request.action === 'stopFacultyAutomation') {
                window.facultyAutomator.stopAutomation();
                sendResponse({ success: true });
                return true;
            }
            
            if (request.action === 'getFacultyProgress') {
                const progress = window.facultyAutomator.getProgress();
                sendResponse(progress);
                return true;
            }
        });
        console.log('[FacultyAutomator] Message listener registered');
    }

    // Auto-resume if there's a queue and we're on a form page
    if (window.facultyAutomator.isFacultyFormPage()) {
        const queue = window.facultyAutomator.loadFacultyQueue();
        if (queue && queue.currentIndex < queue.links.length) {
            console.log('[FacultyAutomator] Auto-resuming automation...');
            window.facultyAutomator.isRunning = true;
            window.facultyAutomator.handleCurrentForm();
        }
    }

})();
