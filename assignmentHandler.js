// Assignment Handler - Automatically fills assignment questions based on user-provided JSON
(function() {
  'use strict';
  
  console.log('[AssignmentHandler] Script loaded');

  // Store the user's answer map
  let userAnswersMap = null;

  /**
   * Fills in the correct radio button for a given quiz question based on a map of answers.
   * @param {Object} answersMap - A map where keys are question texts and values are answer texts.
   */
  function fillAssignmentAnswers(answersMap) {
    console.log('[AssignmentHandler] Starting assignment answer filling...');
    console.log('[AssignmentHandler] Answer map:', answersMap);

    // Get all quiz question containers on the page
    const questionContainers = document.querySelectorAll('.que.multichoice');
    
    if (questionContainers.length === 0) {
      console.warn('[AssignmentHandler] No question containers found. Are you on an assignment page?');
      return {
        success: false,
        error: 'No question containers found. Make sure you are on an assignment page with questions.',
        questionsProcessed: 0
      };
    }

    console.log(`[AssignmentHandler] Found ${questionContainers.length} question container(s)`);
    
    let questionsProcessed = 0;
    let questionsNotFound = [];

    // Iterate over each question container
    questionContainers.forEach((container, index) => {
      // Find the question text element (adjust selector if needed for other quiz layouts)
      const questionTextElement = container.querySelector('.qtext');
      
      if (!questionTextElement) {
        console.warn('[AssignmentHandler] Could not find question text in container', index);
        return;
      }

      // Get the inner text and trim it for comparison
      const questionText = questionTextElement.textContent.trim();
      
      // Check if we have an answer for this question
      const correctAnswerText = answersMap[questionText];

      if (correctAnswerText) {
        console.log(`[AssignmentHandler] Found answer for question: "${questionText}"`);
        console.log(`[AssignmentHandler] Target answer text: "${correctAnswerText}"`);
        
        // Find all answer labels/divs within the current question container
        const answerLabels = container.querySelectorAll('[data-region="answer-label"]');
        let found = false;

        answerLabels.forEach(label => {
          // Get the text content of the entire label
          const labelText = label.textContent.trim();
          
          // Check if the label's text includes the correct answer text
          if (labelText.includes(correctAnswerText)) {
            // We found the correct answer label. Now find the associated radio input.
            const radioId = label.id.replace('_label', ''); 
            const radioInput = document.getElementById(radioId);
            
            if (radioInput && radioInput.type === 'radio') {
              // Check the radio button
              radioInput.checked = true;
              
              // Fire a change event to let the quiz interface know the selection changed
              const event = new Event('change', { bubbles: true });
              radioInput.dispatchEvent(event);
              
              console.log(`[AssignmentHandler] ✅ Successfully checked radio button for: ${correctAnswerText}`);
              found = true;
              questionsProcessed++;
            }
          }
        });

        if (!found) {
          console.warn(`[AssignmentHandler] ❌ Could not find answer choice: "${correctAnswerText}"`);
          questionsNotFound.push({
            question: questionText,
            expectedAnswer: correctAnswerText
          });
        }

      } else {
        console.log(`[AssignmentHandler] No answer provided for: "${questionText}"`);
      }
    });
    
    console.log(`[AssignmentHandler] Finished. Processed ${questionsProcessed} of ${questionContainers.length} question(s)`);
    
    return {
      success: true,
      questionsProcessed: questionsProcessed,
      totalQuestions: questionContainers.length,
      questionsNotFound: questionsNotFound
    };
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[AssignmentHandler] Received message:', request.action);

    if (request.action === 'fillAssignment') {
      try {
        if (!request.answers) {
          sendResponse({
            success: false,
            error: 'No answers provided'
          });
          return;
        }

        const result = fillAssignmentAnswers(request.answers);
        sendResponse(result);
      } catch (error) {
        console.error('[AssignmentHandler] Error:', error);
        sendResponse({
          success: false,
          error: error.message
        });
      }
      return true; // Keep message channel open for async response
    }

    if (request.action === 'checkAssignmentPage') {
      // Check if we're on an assignment page
      const questionContainers = document.querySelectorAll('.que.multichoice');
      sendResponse({
        isAssignmentPage: questionContainers.length > 0,
        questionCount: questionContainers.length
      });
      return true;
    }
  });

  console.log('[AssignmentHandler] Ready and listening for messages');
})();
