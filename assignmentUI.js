// Assignment Automation UI Script
document.addEventListener('DOMContentLoaded', function() {
  const answersInput = document.getElementById('answersInput');
  const validateBtn = document.getElementById('validateBtn');
  const fillBtn = document.getElementById('fillBtn');
  const backBtn = document.getElementById('backBtn');
  const validationMessage = document.getElementById('validationMessage');
  const charCount = document.getElementById('charCount');
  const questionsCount = document.getElementById('questionsCount');
  const lastProcessed = document.getElementById('lastProcessed');
  const statsSection = document.getElementById('statsSection');

  let currentAnswers = null;
  let isValid = false;

  // Load saved answers from storage
  loadSavedAnswers();

  // Character count
  answersInput.addEventListener('input', function() {
    charCount.textContent = answersInput.value.length;
    
    // Reset validation state on input change
    if (isValid) {
      isValid = false;
      fillBtn.disabled = true;
      answersInput.classList.remove('success', 'error');
      hideValidationMessage();
    }
  });

  // Back button
  backBtn.addEventListener('click', function() {
    // Save current input before going back
    saveAnswersToStorage(answersInput.value);
    window.location.href = 'popup.html';
  });

  // Validate button
  validateBtn.addEventListener('click', function() {
    validateJSON();
  });

  // Fill button
  fillBtn.addEventListener('click', function() {
    fillAssignment();
  });

  function validateJSON() {
    const input = answersInput.value.trim();
    
    if (!input) {
      showValidationMessage('Please paste your JSON answers first.', 'error');
      answersInput.classList.add('error');
      answersInput.classList.remove('success');
      isValid = false;
      fillBtn.disabled = true;
      return;
    }

    try {
      // Parse JSON
      const parsed = JSON.parse(input);
      
      // Check if it's an object
      if (typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('JSON must be an object with question-answer pairs');
      }

      // Check if it has at least one question
      const questionCount = Object.keys(parsed).length;
      if (questionCount === 0) {
        throw new Error('JSON must contain at least one question-answer pair');
      }

      // Validation successful
      currentAnswers = parsed;
      isValid = true;
      fillBtn.disabled = false;
      answersInput.classList.remove('error');
      answersInput.classList.add('success');
      
      showValidationMessage(
        `✅ Valid JSON! Found ${questionCount} question${questionCount > 1 ? 's' : ''}.`,
        'success'
      );

      // Update stats
      questionsCount.textContent = questionCount;
      statsSection.style.display = 'block';

      // Save to storage
      saveAnswersToStorage(input);

    } catch (error) {
      currentAnswers = null;
      isValid = false;
      fillBtn.disabled = true;
      answersInput.classList.add('error');
      answersInput.classList.remove('success');
      
      showValidationMessage(
        `❌ Invalid JSON: ${error.message}`,
        'error'
      );
      
      statsSection.style.display = 'none';
    }
  }

  function fillAssignment() {
    if (!isValid || !currentAnswers) {
      showValidationMessage('Please validate your JSON first.', 'error');
      return;
    }

    // Disable button to prevent double-click
    fillBtn.disabled = true;
    fillBtn.textContent = '⏳ Filling Assignment...';
    
    showValidationMessage('🔄 Sending answers to the assignment page...', 'info');

    // Send message to active tab
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || !tabs[0]) {
        showValidationMessage('Error: No active tab found.', 'error');
        fillBtn.disabled = false;
        fillBtn.textContent = '✨ Fill Assignment';
        return;
      }

      console.log('[Assignment UI] Sending fillAssignment message to tab:', tabs[0].id);
      console.log('[Assignment UI] Answers:', currentAnswers);

      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'fillAssignment',
        answers: currentAnswers
      }, function(response) {
        // Re-enable button
        fillBtn.disabled = false;
        fillBtn.textContent = '✨ Fill Assignment';

        if (chrome.runtime.lastError) {
          console.error('[Assignment UI] Error:', chrome.runtime.lastError.message);
          showValidationMessage(
            '❌ Error: ' + chrome.runtime.lastError.message + 
            '\n\nMake sure you are on an assignment page.',
            'error'
          );
        } else if (response && response.success) {
          console.log('[Assignment UI] Success:', response);
          
          const message = `✅ Success! Filled ${response.questionsProcessed} of ${response.totalQuestions} question(s).`;
          
          if (response.questionsNotFound && response.questionsNotFound.length > 0) {
            showValidationMessage(
              message + `\n\n⚠️ Warning: ${response.questionsNotFound.length} answer(s) not found on the page.`,
              'success'
            );
          } else {
            showValidationMessage(message, 'success');
          }

          // Update stats
          lastProcessed.textContent = response.questionsProcessed;
          
        } else {
          console.error('[Assignment UI] Failed:', response);
          showValidationMessage(
            '❌ Failed: ' + (response ? response.error : 'Unknown error'),
            'error'
          );
        }
      });
    });
  }

  function showValidationMessage(message, type) {
    validationMessage.textContent = message;
    validationMessage.className = 'validation-message show ' + type;
  }

  function hideValidationMessage() {
    validationMessage.className = 'validation-message';
  }

  function saveAnswersToStorage(answersText) {
    chrome.storage.local.set({
      assignmentAnswers: answersText,
      assignmentAnswersTimestamp: Date.now()
    }, function() {
      console.log('[Assignment UI] Answers saved to storage');
    });
  }

  function loadSavedAnswers() {
    chrome.storage.local.get(['assignmentAnswers', 'assignmentAnswersTimestamp'], function(result) {
      if (result.assignmentAnswers) {
        answersInput.value = result.assignmentAnswers;
        charCount.textContent = result.assignmentAnswers.length;
        
        // Show info message about loaded data
        const timestamp = result.assignmentAnswersTimestamp;
        if (timestamp) {
          const date = new Date(timestamp);
          const timeAgo = getTimeAgo(date);
          showValidationMessage(
            `ℹ️ Loaded previously saved answers (from ${timeAgo}). Click "Validate JSON" to verify.`,
            'info'
          );
        }
      }
    });
  }

  function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
    return Math.floor(seconds / 86400) + ' days ago';
  }

  // Auto-validate if there's content
  if (answersInput.value.trim()) {
    setTimeout(() => {
      validateJSON();
    }, 500);
  }
});
