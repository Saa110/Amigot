// Amigo Assignment Automator - Content Script
console.log('Amigo Assignment Automator loaded');

class AmigoAutomator {
  constructor() {
    this.isEnabled = false;
    this.timeouts = [];
    this.settings = {
      autoSubmit: true,
      randomAnswers: true,
      skipEndModuleAssignments: true,
      navigateContent: true
    };
    this.init();
  }

  async init() {
    // Load settings from storage
    await this.loadSettings();
    // Honor persisted active state
    this.isEnabled = Boolean(this.settings.isActive);
    if (this.isEnabled) {
      this.runAutomationIfApplicable();
      this.continueNavigationIfQueued();
      //this.continueQuizNavigationIfQueued();
    }
  }

  runAutomationIfApplicable() {
    if (!this.isEnabled) return;

    
    if (this.isAssignmentPage()) {
      this.setupAssignmentAutomation();
      return;
    }
    
    // Check if we're on a resource page
    if (this.isResourcePage()) {
      this.setupResourceAutomation();
      return;
    }
    
    // Check if we're on a course page
    if (this.isCoursePage()) {
      this.setupCourseAutomation();
    }
    
    
    
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['amigoSettings']);
      if (result.amigoSettings) {
        this.settings = { ...this.settings, ...result.amigoSettings };
        // Backward compatibility for renamed keys
        if (result.amigoSettings.skipEndModule !== undefined) {
          this.settings.skipEndModuleAssignments = result.amigoSettings.skipEndModule;
        }
      }
    } catch (error) {
      console.log('Using default settings');
    }
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    // Force fresh collections each time automation starts
    try {
      console.log('[Amigo] enable() - Clearing session storage (including quiz queue)');
      sessionStorage.removeItem('__amigoQuizScanned');
      sessionStorage.removeItem('__amigoQuizLinks');
      sessionStorage.removeItem('__amigoNavQueue');
      sessionStorage.removeItem('__amigoQuizQueue');
      sessionStorage.removeItem('__amigoNavigated');
    } catch (e) {}
    try { window.__amigoQuizScanned = false; } catch (e) {}
    try { window.__amigoNavigated = false; } catch (e) {}

    // Re-collect immediately to reflect the current page state
    try { this.collectQuizLinks(); } catch (e) {}
    this.runAutomationIfApplicable();
  }

  disable() {
    if (!this.isEnabled) return;
    this.isEnabled = false;
    this.clearAllTimeouts();
    try {
      console.log('[Amigo] disable() - Clearing session storage (including quiz queue)');
      sessionStorage.removeItem('__amigoNavigated');
      sessionStorage.removeItem('__amigoNavQueue');
      sessionStorage.removeItem('__amigoQuizQueue');
    } catch (e) {
      // ignore
    }
  }

  setManagedTimeout(callback, delayMs) {
    const id = setTimeout(() => {
      callback();
    }, delayMs);
    this.timeouts.push(id);
    return id;
  }

  clearAllTimeouts() {
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts = [];
  }

  

  isCoursePage() {
    return window.location.href.includes('/course/view.php') || 
           (window.location.href.includes('/mod/') && !this.isResourcePage());
  }

  isResourcePage() {
    return window.location.href.includes('/mod/resource/');
  }

  isAssignmentPage() {
    return window.location.href.includes('/mod/quiz/') ||
           window.location.href.includes('/mod/assign/') ||
           window.location.href.includes('/mod/lesson/');
  }

  setupCourseAutomation() {
    if (!this.isEnabled) return;
    console.log('Setting up course automation');
    // One-time quiz link collection per session
    if (!window.__amigoQuizScanned) {
      this.collectQuizLinks();
    }
    
    // Wait for page to load completely
    this.setManagedTimeout(() => {
      if (this.settings.navigateContent) {
        console.log('Setting up course navigation');
        this.navigateCourseContent();
      } else if (this.settings.navigateQuizzes) {
        // If skipping content but running quizzes, start quiz queue directly
        console.log('Setting up quizzes navigation');
        this.startQuizNavigationIfAvailable();
      }
    }, 2000);
  }

  setupResourceAutomation() {
    if (!this.isEnabled) return;
    console.log('Setting up resource automation');
    
    // Resource pages just need to be viewed, then continue navigation
    // Wait a moment for the page to load, then continue to next item
    this.setManagedTimeout(() => {
      console.log('Resource page loaded, continuing navigation...');
      this.continueNavigationIfQueued();
    }, 2000);
  }

  setupAssignmentAutomation() {
    if (!this.isEnabled) return;
    console.log('Setting up assignment automation');
    
    // Check if this is an end-of-module assignment
    if (this.isEndOfModuleAssignment()) {
      console.log('Skipping end-of-module assignment');
      return;
    }

    // Wait for assignment to load
    console.log('About to call handleAssignment in 3 seconds...');
    this.setManagedTimeout(() => {
      this.handleAssignment();
    }, 1000);
  }

  isEndOfModuleAssignment() {
    // Check if assignment is at the end of a module
    // Look for breadcrumbs or navigation that indicates end position
    const breadcrumbs = document.querySelector('.breadcrumb');
    if (breadcrumbs) {
      const breadcrumbText = breadcrumbs.textContent.toLowerCase();
      return breadcrumbText.includes('assessment') || 
             breadcrumbText.includes('module')
    }
    
    // Check URL patterns that might indicate end-of-module
    const url = window.location.href;
    return url.includes('end') || url.includes('final') || url.includes('conclusion');
  }

  // Determines if an activity is already completed ("Done") by checking
  // multiple cues: green success button, visible Done text, or check icon.
  isActivityDone(activityItem) {
    if (!activityItem) return false;
    const region = activityItem.querySelector('.activity-completion, [data-region="completion-info"]') || activityItem;

    // Primary: Moodle marks completion button with btn-success
    const successBtn = region.querySelector('.btn-success');
    if (successBtn) return true;

    // Fallbacks: visible Done text on the toggle/button
    const anyButton = region.querySelector('button, .btn, [role="button"]');
    const btnText = (anyButton && (anyButton.textContent || anyButton.value || '')) || '';
    if (btnText.trim().toLowerCase().includes('done')) return true;

    // Icon cue within completion dropdown/region
    const checkIcon = region.querySelector('.fa-check, .icon.fa-check');
    if (checkIcon) return true;

    // As a last resort, look for Done text in the completion region content
    const regionText = (region.textContent || '').toLowerCase();
    if (regionText.includes('done')) return true;

    return false;
  }

  // For quiz activities, require both "View" and "Receive a grade" to be done
  isQuizActivityDone(activityItem) {
    if (!activityItem) return false;
    const region = activityItem.querySelector('[data-region="completion-info"], .activity-completion') || activityItem;
    const listItems = Array.from(region.querySelectorAll('[data-region="completionrequirements"] [role="listitem"], .completion-dialog [role="listitem"], [role="listitem"]'));

    const normalize = (s) => (s || '').toLowerCase();
    const isRowDone = (el) => {
      if (!el) return false;
      // Marked as done if row or its child has text-success, or shows a check icon, or contains sr-only Done label
      if (el.classList && el.classList.contains('text-success')) return true;
      if (el.querySelector('.text-success')) return true;
      if (el.querySelector('.fa-check, .icon.fa-check')) return true;
      const srOnly = el.querySelector('.sr-only');
      if (srOnly && normalize(srOnly.textContent).includes('done')) return true;
      return false;
    };

    let viewDone = false;
    let gradeDone = false;
    let viewRowExists = false;
    listItems.forEach(li => {
      const rowText = normalize(li.textContent);
      if (!viewDone && rowText.includes('view')) {
        viewRowExists = true;
        viewDone = isRowDone(li);
      }
      if (!gradeDone && (rowText.includes('receive a grade') || rowText.includes('recieve a grade') || rowText.includes('received a grade'))) {
        gradeDone = isRowDone(li);
      }
    });

    // Make "View" optional: if a View row exists, require it; otherwise, grade alone is sufficient
    return gradeDone && (!viewRowExists || viewDone);
  }

  navigateCourseContent() {
    if (!this.isEnabled) return;
    if (!this.settings.navigateContent) return;
    if (window.__amigoNavigated) {
      console.log('Navigation already initiated on this page, skipping.');
      return;
    }
    try {
      if (sessionStorage.getItem('__amigoNavigated') === '1') {
        console.log('Navigation already initiated in this session, skipping.');
        return;
      }
    } catch (e) {
      // ignore storage access errors
    }

    console.log('Navigating course content');
    window.__amigoNavigated = true;
    try {
      sessionStorage.setItem('__amigoNavigated', '1');
    } catch (e) {
      // ignore
    }
    
    // Build content list with robust filtering and deduplication
    const allAnchors = Array.from(document.querySelectorAll('a[href*="/mod/"]'));
    const filtered = allAnchors
      .map(a => ({ element: a, href: a.href, text: (a.textContent || '').toLowerCase() }))
      .filter(item => {
        const { href, text } = item;
        // Skip assignments/quizzes/lessons/assessments/tests
        const isAssessment = href.includes('/mod/quiz/') ||
                             href.includes('/mod/assign/') ||
                             href.includes('/mod/lesson/') ||
                             text.includes('assignment') ||
                             text.includes('quiz') ||
                             text.includes('assessment') ||
                             text.includes('test');
        if (isAssessment) return false;
        // Require an activity item wrapper
        const activityItem = item.element.closest('.activity-item');
        if (!activityItem) return false;
        // Skip completed items
        if (this.isActivityDone(activityItem)) {
          try { console.log('[Amigo] Skipping completed content:', item.href); } catch (_) {}
          return false;
        }
        return true;
      });

    // Deduplicate by href
    const seenContent = new Set();
    const deduped = filtered.filter(item => {
      if (seenContent.has(item.href)) return false;
      seenContent.add(item.href);
      return true;
    });

    const urls = deduped.map(item => item.href);
    console.log(`Found ${urls.length} content links after filtering/dedup`);
    if (urls.length === 0) {
      console.log('No content links found; starting quiz navigation directly...');
      this.startQuizNavigationIfAvailable();
      return;
    }
    // Clear any stale queue before saving a fresh one
    try { sessionStorage.removeItem('__amigoNavQueue'); } catch (_) {}
    this.saveNavQueue(urls);
    // Start with the first item
    this.continueNavigationIfQueued();
    // When we reach the end of content queue, kick off quiz queue
    // Poll for completion
    this.setManagedTimeout(() => this.pollNavQueueCompletion(), 500);
  }

  pollNavQueueCompletion() {
    if (!this.isEnabled) return;
    const queue = this.loadNavQueue();
    if (!queue || !Array.isArray(queue.urls)) return;
    if (queue.index >= queue.urls.length) {
      console.log('Finished content navigation.');
      // Re-collect quiz links with latest completion state before starting
      try { this.collectQuizLinks(); } catch (_) {}
      
      if (!this.isAssignmentPage()) {
        // Clear any stale quiz queue from previous runs only when actually starting quiz navigation
        try { 
          console.log('[Amigo] pollNavQueueCompletion() - Clearing stale quiz queue before starting quiz navigation');
          sessionStorage.removeItem('__amigoQuizQueue'); 
        } catch (_) {}
        console.log('Starting quiz navigation...');
        this.startQuizNavigationIfAvailable();
      } else {
        console.log('Currently on an assignment page; deferring quiz navigation to assignment completion.');
        console.log('[Amigo] pollNavQueueCompletion() - NOT clearing quiz queue since we\'re deferring navigation');
      }
      return;
    }
    this.setManagedTimeout(() => this.pollNavQueueCompletion(), 1000);
  }

  // When quiz queue is completed, notify and stop
  pollQuizQueueCompletion() {
    if (!this.isEnabled) return;
    const queue = this.loadQuizQueue();
    if (!queue || !Array.isArray(queue.urls)) return;
    if (queue.index >= queue.urls.length) {
      console.log('Finished quiz navigation. All links processed.');
      this.notifyCompletionAndStop();
      return;
    }
    this.setManagedTimeout(() => this.pollQuizQueueCompletion(), 1000);
  }

  notifyCompletionAndStop() {
    console.log('All automation completed. Notifying and stopping...');
    try {
      chrome.runtime.sendMessage({ action: 'amigo:all-done' });
    } catch (e) {
      console.log('Failed to send completion message:', e);
    }
    // Stop the automator
    try { 
      this.disable(); 
    } catch (e) {
      console.log('Failed to disable automator:', e);
    }
  }

  saveNavQueue(urls) {
    try {
      const payload = { urls, index: 0 };
      sessionStorage.setItem('__amigoNavQueue', JSON.stringify(payload));
    } catch (e) {
      console.log('Failed to save navigation queue');
    }
  }

  loadNavQueue() {
    try {
      const raw = sessionStorage.getItem('__amigoNavQueue');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  updateNavQueue(queue) {
    try {
      sessionStorage.setItem('__amigoNavQueue', JSON.stringify(queue));
    } catch (e) {
      // ignore
    }
  }

  continueNavigationIfQueued() {
    if (!this.isEnabled) return;
    const queue = this.loadNavQueue();
    if (!queue || !Array.isArray(queue.urls)) return;
    if (queue.index >= queue.urls.length) {
      // Content queue is finished, start quiz navigation
      console.log('Content queue finished, starting quiz navigation...');
      // Re-collect quiz links with latest completion state before starting
      try { this.collectQuizLinks(); } catch (_) {}
      
      if (!this.isAssignmentPage()) {
        // Clear any stale quiz queue from previous runs only when actually starting quiz navigation
        try { 
          console.log('[Amigo] continueNavigationIfQueued() - Clearing stale quiz queue before starting quiz navigation');
          sessionStorage.removeItem('__amigoQuizQueue'); 
        } catch (_) {}
        console.log('Starting quiz navigation...');
        this.startQuizNavigationIfAvailable();
      } else {
        console.log('Currently on an assignment page; deferring quiz navigation to assignment completion.');
        console.log('[Amigo] continueNavigationIfQueued() - NOT clearing quiz queue since we\'re deferring navigation');
      }
      return;
    }
    const nextUrl = queue.urls[queue.index];
    // Increment the index before navigating to avoid duplicate navs on reload
    queue.index += 1;
    this.updateNavQueue(queue);
    this.setManagedTimeout(() => {
      if (!this.isEnabled) return;
      console.log(`Opening content: ${document.title || 'Next item'}`);
      window.location.href = nextUrl;
    }, 1000);
  }

  // ----- QUIZ NAVIGATION QUEUE -----
  saveQuizQueue(urls) {
    try {
      const payload = { urls, index: 0 };
      sessionStorage.setItem('__amigoQuizQueue', JSON.stringify(payload));
    } catch (e) {
      console.log('Failed to save quiz navigation queue');
    }
  }

  loadQuizQueue() {
    try {
      const raw = sessionStorage.getItem('__amigoQuizQueue');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  updateQuizQueue(queue) {
    try {
      sessionStorage.setItem('__amigoQuizQueue', JSON.stringify(queue));
    } catch (e) {
      // ignore
    }
  }

  startQuizNavigationIfAvailable() {
    if (!this.isEnabled) return;
    let matches = [];
    try {
      matches = JSON.parse(sessionStorage.getItem('__amigoQuizLinks') || '[]');
    } catch (e) {}
    
    // Debug: Print what we found
    console.log('[Amigo] startQuizNavigationIfAvailable - Raw matches:', matches);
    console.log('[Amigo] startQuizNavigationIfAvailable - Matches length:', matches.length);
    
    const urls = (matches || []).map(m => m.href).filter(Boolean);
    console.log('[Amigo] startQuizNavigationIfAvailable - Extracted URLs:', urls);
    console.log('[Amigo] startQuizNavigationIfAvailable - URLs length:', urls.length);
    
    if (!urls.length) {
      console.log('No quiz links found to navigate.');
      // No quiz links, so we're completely done - show notification and stop
      this.notifyCompletionAndStop();
      return;
    }
    this.saveQuizQueue(urls);
    this.continueQuizNavigationIfQueued();
    // Start polling for quiz completion now that we have quiz links
    this.setManagedTimeout(() => this.pollQuizQueueCompletion(), 500);
  }

  
continueQuizNavigationIfQueued() {
    if (!this.isEnabled) return;
    const queue = this.loadQuizQueue();
    if (!queue || !Array.isArray(queue.urls)) return;
    if (queue.index >= queue.urls.length) return;
    const nextUrl = queue.urls[queue.index];
    queue.index += 1;
    this.updateQuizQueue(queue);
    
    // Always navigate to the next quiz URL
    this.setManagedTimeout(() => {
      if (!this.isEnabled) return;
      console.log('Opening quiz page...');
      window.location.href = nextUrl;
    }, 1000);
  }
  handleAssignment() {
    if (!this.isEnabled) return;
    if (!this.settings.autoSubmit) return;

    console.log('Handling assignment');
    console.log('[Amigo] handleAssignment() invoked at', new Date().toISOString(), 'URL:', window.location.href);
    // Handle different types of assignments
    if (this.isQuiz()) {
      // Prefer streamlined QuizHandler if present
      if (window.QuizHandler) {
        console.log('[Amigo] Using QuizHandler');
        try {
          const handler = new window.QuizHandler({
            loggerPrefix: '[Amigo:QuizHandler]',
            onAdvance: () => {
              // Debug: Print quiz queue before advancing
              const queue = this.loadQuizQueue();
              console.log('[Amigo:QuizHandler] Quiz queue state:', queue);
              console.log('[Amigo:QuizHandler] Quiz queue URLs:', queue ? queue.urls : 'No queue');
              console.log('[Amigo:QuizHandler] Current index:', queue ? queue.index : 'No queue');
              console.log('[Amigo:QuizHandler] Remaining quizzes:', queue ? queue.urls.length - queue.index : 'No queue');
              
              this.setManagedTimeout(() => this.continueQuizNavigationIfQueued(), 500);
            },
            isEnabled: this.isEnabled,
            stepDelayMs: 600,
            finishDelayMs: 1000
          });
          handler.run();
        } catch (e) {
          console.log('QuizHandler failed, falling back to legacy handleQuiz');
          this.handleQuiz();
        }
      } else {
        this.handleQuiz();
      }
    } else if (this.isAssignment()) {
      this.handleAssignmentSubmission();
    } else if (this.isLesson()) {
      this.handleLesson();
    }
  }

  isQuiz() {
    return window.location.href.includes('/mod/quiz/');
  }

  isAssignment() {
    return window.location.href.includes('/mod/assign/');
  }

  isLesson() {
    return window.location.href.includes('/mod/lesson/');
  }

  /*handleQuiz() {
    if (!this.isEnabled) return;
    console.log('Handling quiz');
    console.log('[Amigo] handleQuiz() invoked at', new Date().toISOString(), 'URL:', window.location.href);
    
    // Simple entry click logic:
    // 1) Click "Attempt quiz" (but not "Re-attempt")
    // 2) Else click any "Continue"
    // 3) Never click "Re-attempt"
    const candidates = Array.from(document.querySelectorAll('button, input[type="submit"], a[role="button"], a.btn, button.btn'));
    const textOf = (el) => (el.textContent || el.value || '').toLowerCase();
    const isReAttempt = (el) => textOf(el).includes('re-attempt quiz');
    const isAttemptQuiz = (el) => textOf(el).includes('attempt quiz') && !isReAttempt(el);
    const isContinue = (el) => textOf(el).includes('continue');

    // Debug logging for candidates and matches (omitted for streamlined flow)

    const attemptBtn = candidates.find(isAttemptQuiz);
    const continueBtn = candidates.find(isContinue);
    const reattemptBtn = candidates.find(isReAttempt);

    console.log('Matched attemptBtn:', attemptBtn ? (attemptBtn.textContent || attemptBtn.value || '').trim() : null);
    console.log('Matched continueBtn:', continueBtn ? (continueBtn.textContent || continueBtn.value || '').trim() : null);
    console.log('Matched reattemptBtn:', reattemptBtn ? (reattemptBtn.textContent || reattemptBtn.value || '').trim() : null);

    if (attemptBtn) {
      console.log('Clicking: Attempt quiz');
      attemptBtn.click();
      return;
    }

    if (continueBtn) {
      console.log('Clicking: Continue');
      continueBtn.click();
      return;
    }
    
    if (reattemptBtn) {
      console.log('Found Re-attempt button; not clicking.');
    }
    else {
      console.log('No attempt or continue button found; not clicking.');
    }
    
    // Find all question forms
    const questionForms = document.querySelectorAll('form[id*="q"]');
    
    questionForms.forEach((form, formIndex) => {
      this.setManagedTimeout(() => {
        if (!this.isEnabled) return;
        this.fillQuizForm(form);
      }, formIndex * 1000);
    });

    // Auto-submit after filling all forms
    this.setManagedTimeout(() => {
      if (!this.isEnabled) return;
      this.submitQuiz();
    }, questionForms.length * 1000 + 2000);
  }*/

  fillQuizForm(form) {
    if (!this.isEnabled) return;
    console.log('Filling quiz form');
    
    // Handle multiple choice questions
    const radioButtons = form.querySelectorAll('input[type="radio"]');
    if (radioButtons.length > 0) {
      const randomRadio = radioButtons[Math.floor(Math.random() * radioButtons.length)];
      randomRadio.checked = true;
      randomRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Handle checkboxes
    const checkboxes = form.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      if (Math.random() > 0.5) { // 50% chance to check
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Handle text inputs
    const textInputs = form.querySelectorAll('input[type="text"], textarea');
    textInputs.forEach(input => {
      const randomText = this.generateRandomText();
      input.value = randomText;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Handle select dropdowns
    const selects = form.querySelectorAll('select');
    selects.forEach(select => {
      const options = Array.from(select.options).filter(opt => opt.value !== '');
      if (options.length > 0) {
        const randomOption = options[Math.floor(Math.random() * options.length)];
        select.value = randomOption.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  generateRandomText() {
    const randomTexts = [
      "This is a random response for the assignment.",
      "I have completed this task as requested.",
      "The answer to this question is not known to me.",
      "This is an automated response for the assignment.",
      "I am submitting this assignment with random answers.",
      "The content of this response is generated automatically.",
      "This is a placeholder answer for the assignment.",
      "I have attempted to answer this question randomly."
    ];
    return randomTexts[Math.floor(Math.random() * randomTexts.length)];
  }

  submitQuiz() {
    if (!this.isEnabled) return;
    console.log('Submitting quiz');
    
    // If we're on the confirmation page, click "Submit all and finish"
    const confirmSubmitAllBtn = document.querySelector('button#single_button, button[id^="single_button"], button[type="submit"][id^="single_button"], button.btn.btn-primary');
    if (confirmSubmitAllBtn) {
      const label = (confirmSubmitAllBtn.textContent || confirmSubmitAllBtn.value || '').toLowerCase();
      if (label.includes('submit all and finish')) {
        confirmSubmitAllBtn.click();
        return;
      }
    }

    // Prefer explicit Moodle quiz finish button if present
    const finishAttemptButton = document.querySelector('#mod_quiz-next-nav, .mod_quiz-next-nav, input[type="submit"][name="next"][value*="Finish attempt"], input[type="submit"][value*="Finish attempt"]');
    if (finishAttemptButton) {
      finishAttemptButton.click();
      return;
    }

    // Look for generic submit buttons
    const submitButton = document.querySelector('input[type="submit"][value*="Submit" i], button[type="submit"]');
    if (submitButton) {
      submitButton.click();
      return;
    }

    // Fallback: search any clickable buttons/inputs by label text
    const buttons = document.querySelectorAll('button, input[type="button"], input[type="submit"]');
    const lowerIncludes = (s, sub) => (s || '').toLowerCase().includes(sub);
    const submitBtn = Array.from(buttons).find(btn => 
      lowerIncludes(btn.textContent, 'submit') ||
      lowerIncludes(btn.value, 'submit') ||
      lowerIncludes(btn.textContent, 'finish attempt') ||
      lowerIncludes(btn.value, 'finish attempt')
    );
    if (submitBtn) {
      submitBtn.click();
    }
  }

  handleAssignmentSubmission() {
    if (!this.isEnabled) return;
    console.log('Handling assignment submission');
    
    // Fill text areas with random content
    const textAreas = document.querySelectorAll('textarea');
    textAreas.forEach(textarea => {
      textarea.value = this.generateRandomText();
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    });

    // Handle file uploads (skip for now)
    const fileInputs = document.querySelectorAll('input[type="file"]');
    console.log(`Found ${fileInputs.length} file upload inputs (skipping)`);

    // Submit assignment
    this.setManagedTimeout(() => {
      if (!this.isEnabled) return;
      this.submitAssignment();
    }, 2000);
  }

  submitAssignment() {
    if (!this.isEnabled) return;
    console.log('Submitting assignment');
    
    const submitButton = document.querySelector('input[type="submit"], button[type="submit"]');
    if (submitButton) {
      submitButton.click();
    }
  }

  handleLesson() {
    if (!this.isEnabled) return;
    console.log('Handling lesson');
    
    // Navigate through lesson pages
    const nextButton = document.querySelector('input[value*="Next"], button:contains("Next")');
    if (nextButton) {
      this.setManagedTimeout(() => {
        if (!this.isEnabled) return;
        nextButton.click();
      }, 3000);
    }
  }

  collectQuizLinks() {
    if (!this.isEnabled) return;
    try {
      if (sessionStorage.getItem('__amigoQuizScanned') === '1') {
        console.log('Quiz links already collected in this session, skipping.');
        window.__amigoQuizScanned = true;
        return;
      }
    } catch (e) {
      // ignore storage access errors
    }

    const anchors = Array.from(document.querySelectorAll('a'));
    const isQuizText = (el) => {
      const text = (el.textContent || '').toLowerCase();
      const title = (el.title || '').toLowerCase();
      const aria = (el.getAttribute && el.getAttribute('aria-label')) ? el.getAttribute('aria-label').toLowerCase() : '';
      return text.includes('quiz') || title.includes('quiz') || aria.includes('quiz');
    };
    const isAssessmentText = (el) => {
      const text = (el.textContent || '').toLowerCase();
      const title = (el.title || '').toLowerCase();
      const aria = (el.getAttribute && el.getAttribute('aria-label')) ? el.getAttribute('aria-label').toLowerCase() : '';
      return text.includes('assessment') || title.includes('assessment') || aria.includes('assessment');
    };
    // First pass: filter to quiz-like anchors and not assessments
    let matches = anchors
      .filter(a => (isQuizText(a) || ((a.href || '').includes('/mod/quiz/'))) && !isAssessmentText(a))
      .map(a => ({ element: a, href: a.href, text: (a.textContent || '').trim() }))
      .filter(item => item.href);

    // Second pass: require an activity item container and skip completed
    matches = matches.filter(item => {
      const activityItem = item.element.closest('.activity-item');
      if (!activityItem) return false;
      // For quizzes, require both sub-requirements to be done
      if (this.isQuizActivityDone(activityItem)) {
        try { console.log('[Amigo] Skipping completed quiz (view+grade done):', item.href); } catch (_) {}
        return false;
      }
      return true;
    });

    // Deduplicate by href
    const seen = new Set();
    matches = matches.filter(item => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });

    // Final shape
    matches = matches.map(item => ({ text: item.text, href: item.href }));

    console.log(`Collected ${matches.length} quiz links after filtering/dedup`);
    try {
      sessionStorage.setItem('__amigoQuizLinks', JSON.stringify(matches));
      sessionStorage.setItem('__amigoQuizScanned', '1');
    } catch (e) {
      console.log('Failed to persist quiz links');
    }
    window.__amigoQuizScanned = true;
  }
}

// Initialize the automator when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.amigoAutomator = new AmigoAutomator();
  });
} else {
  window.amigoAutomator = new AmigoAutomator();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleAutomation' && window.amigoAutomator) {
    (async () => {
      try {
        await window.amigoAutomator.loadSettings();
      } catch (e) {
        // proceed with existing settings if reload fails
      }
      const shouldEnable = Boolean(request.enabled);
      if (shouldEnable) {
        window.amigoAutomator.enable();
      } else {
        window.amigoAutomator.disable();
      }
      sendResponse({ success: true, enabled: window.amigoAutomator.isEnabled });
    })();
    return true; // keep the message channel open for async response
  }
  if (request.action === 'amigo:run-end-module-handler' && window.amigoAutomator) {
    // Delegated to standalone handler listener; no-op here
    sendResponse({ success: true, delegated: true });
    return true;
  }
  // start/stop monitor handled by handler; ignore here
});
