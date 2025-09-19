// Amigo Assignment Automator - Content Script
console.log('Amigo Assignment Automator loaded');

class AmigoAutomator {
  constructor() {
    this.isEnabled = false;
    this.settings = {
      autoSubmit: true,
      randomAnswers: true,
      skipEndModuleAssignments: true,
      navigateContent: true
    };
    this.init();
  }

  init() {
    // Load settings from storage
    this.loadSettings();
    
    // Check if we're on a course page
    if (this.isCoursePage()) {
      this.setupCourseAutomation();
    }
    
    // Check if we're on an assignment/quiz page
    if (this.isAssignmentPage()) {
      this.setupAssignmentAutomation();
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['amigoSettings']);
      if (result.amigoSettings) {
        this.settings = { ...this.settings, ...result.amigoSettings };
      }
    } catch (error) {
      console.log('Using default settings');
    }
  }

  isCoursePage() {
    return window.location.href.includes('/course/view.php') || 
           window.location.href.includes('/mod/');
  }

  isAssignmentPage() {
    return window.location.href.includes('/mod/quiz/') ||
           window.location.href.includes('/mod/assign/') ||
           window.location.href.includes('/mod/lesson/');
  }

  setupCourseAutomation() {
    console.log('Setting up course automation');
    
    // Wait for page to load completely
    setTimeout(() => {
      this.navigateCourseContent();
    }, 2000);
  }

  setupAssignmentAutomation() {
    console.log('Setting up assignment automation');
    
    // Check if this is an end-of-module assignment
    if (this.isEndOfModuleAssignment()) {
      console.log('Skipping end-of-module assignment');
      return;
    }

    // Wait for assignment to load
    setTimeout(() => {
      this.handleAssignment();
    }, 3000);
  }

  isEndOfModuleAssignment() {
    // Check if assignment is at the end of a module
    // Look for breadcrumbs or navigation that indicates end position
    const breadcrumbs = document.querySelector('.breadcrumb');
    if (breadcrumbs) {
      const breadcrumbText = breadcrumbs.textContent.toLowerCase();
      return breadcrumbText.includes('end') || 
             breadcrumbText.includes('final') ||
             breadcrumbText.includes('conclusion');
    }
    
    // Check URL patterns that might indicate end-of-module
    const url = window.location.href;
    return url.includes('end') || url.includes('final') || url.includes('conclusion');
  }

  navigateCourseContent() {
    if (!this.settings.navigateContent) return;

    console.log('Navigating course content');
    
    // Find all clickable content links
    const contentLinks = document.querySelectorAll('a[href*="/mod/"]');
    const nonAssessmentLinks = Array.from(contentLinks).filter(link => {
      const href = link.href;
      const text = link.textContent.toLowerCase();
      
      // Skip assignment, quiz, and assessment links
      return !href.includes('/mod/quiz/') && 
             !href.includes('/mod/assign/') &&
             !href.includes('/mod/lesson/') &&
             !text.includes('assignment') &&
             !text.includes('quiz') &&
             !text.includes('assessment') &&
             !text.includes('test');
    });

    console.log(`Found ${nonAssessmentLinks.length} non-assessment content links`);

    // Click on each non-assessment content link
    nonAssessmentLinks.forEach((link, index) => {
      setTimeout(() => {
        console.log(`Opening content: ${link.textContent.trim()}`);
        link.click();
      }, index * 2000); // Stagger clicks by 2 seconds
    });
  }

  handleAssignment() {
    if (!this.settings.autoSubmit) return;

    console.log('Handling assignment');
    
    // Handle different types of assignments
    if (this.isQuiz()) {
      this.handleQuiz();
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

  handleQuiz() {
    console.log('Handling quiz');
    
    // Find all question forms
    const questionForms = document.querySelectorAll('form[id*="q"]');
    
    questionForms.forEach((form, formIndex) => {
      setTimeout(() => {
        this.fillQuizForm(form);
      }, formIndex * 1000);
    });

    // Auto-submit after filling all forms
    setTimeout(() => {
      this.submitQuiz();
    }, questionForms.length * 1000 + 2000);
  }

  fillQuizForm(form) {
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
    console.log('Submitting quiz');
    
    // Look for submit button
    const submitButton = document.querySelector('input[type="submit"][value*="Submit"], button[type="submit"]');
    if (submitButton) {
      submitButton.click();
    } else {
      // Try to find any submit-related button
      const buttons = document.querySelectorAll('button, input[type="button"]');
      const submitBtn = Array.from(buttons).find(btn => 
        btn.textContent.toLowerCase().includes('submit') ||
        btn.value.toLowerCase().includes('submit')
      );
      if (submitBtn) {
        submitBtn.click();
      }
    }
  }

  handleAssignmentSubmission() {
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
    setTimeout(() => {
      this.submitAssignment();
    }, 2000);
  }

  submitAssignment() {
    console.log('Submitting assignment');
    
    const submitButton = document.querySelector('input[type="submit"], button[type="submit"]');
    if (submitButton) {
      submitButton.click();
    }
  }

  handleLesson() {
    console.log('Handling lesson');
    
    // Navigate through lesson pages
    const nextButton = document.querySelector('input[value*="Next"], button:contains("Next")');
    if (nextButton) {
      setTimeout(() => {
        nextButton.click();
      }, 3000);
    }
  }
}

// Initialize the automator when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new AmigoAutomator();
  });
} else {
  new AmigoAutomator();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleAutomation') {
    // Toggle automation on/off
    sendResponse({ success: true });
  }
});
