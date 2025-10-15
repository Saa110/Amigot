// Survey Form Handler - Automatically fills survey forms with positive responses
(function() {
    'use strict';
    console.log('[SurveyHandler] Script loaded successfully');
    console.log('[SurveyHandler] Current URL:', window.location.href);

    function fillSurvey() {
        console.log('[SurveyHandler] fillSurvey function called');
        console.log('[SurveyHandler] Page title:', document.title);
        let count = 0;
        
        // --- You can add more positive responses to this list ---
        const positiveResponses = ['strongly agree', 'yes'];

        // --- Handle Radio Buttons ---
        const radioButtons = document.querySelectorAll('input[type="radio"]');
        console.log(`[SurveyHandler] Found ${radioButtons.length} radio buttons`);
        
        radioButtons.forEach(radio => {
            let shouldCheck = false;
            const radioValue = (radio.value || '').trim().toLowerCase();
            
            // Find associated label text
            let labelText = '';
            const label = document.querySelector(`label[for="${radio.id}"]`) || radio.closest('label');
            if (label) {
                labelText = label.textContent.trim().toLowerCase();
            }

            // Check if value or label text is a positive response
            if (positiveResponses.includes(radioValue) || positiveResponses.includes(labelText)) {
                shouldCheck = true;
            }

            if (shouldCheck && !radio.checked) {
                radio.checked = true;
                count++;
                // Dispatch events to let the page know the input has changed
                radio.dispatchEvent(new Event('change', { bubbles: true }));
                radio.dispatchEvent(new Event('click', { bubbles: true }));
            }
        });

        // --- Handle Select Dropdowns ---
        const selects = document.querySelectorAll('select');
        console.log(`[SurveyHandler] Found ${selects.length} select dropdowns`);
        
        selects.forEach(select => {
            // Find the first option that matches a positive response
            const positiveOption = Array.from(select.options).find(option =>
                positiveResponses.includes(option.text.trim().toLowerCase()) ||
                positiveResponses.includes(option.value.trim().toLowerCase())
            );
            if (positiveOption && select.value !== positiveOption.value) {
                select.value = positiveOption.value;
                count++;
                // Dispatch a change event for the select element
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        // --- Handle Comment Textarea ---
        const commentBox = document.getElementById('FeedbackRating_Comments');
        if (commentBox) {
            commentBox.value = 'Satisfactory';
            // Dispatch events to let the page know the input has changed
            commentBox.dispatchEvent(new Event('input', { bubbles: true }));
            commentBox.dispatchEvent(new Event('change', { bubbles: true }));
            console.log('[SurveyHandler] ✅ Comment "Satisfactory" added.');
        } else {
            console.log('[SurveyHandler] ⚠️ Comment box not found');
        }

        console.log(`[SurveyHandler] ✅ Bot finished filling ${count} positive option(s).`);

        // --- Handle Submit Button ---
        const submitButton = document.getElementById('btnSubmit');
        if (submitButton) {
            console.log('[SurveyHandler] ✅ Found submit button. Submitting form...');
            submitButton.click();
        } else {
            console.log('[SurveyHandler] ⚠️ Could not find the submit button with id "btnSubmit".');
        }
        
        return count;
    }

    // Make fillSurvey available globally for debugging
    window.fillSurvey = fillSurvey;
    console.log('[SurveyHandler] window.fillSurvey() is now available for manual testing');

    // Listen for messages from popup
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('[SurveyHandler] Message received:', request.action);
            
            if (request.action === 'fillSurvey') {
                console.log('[SurveyHandler] Executing fillSurvey...');
                
                // Add small delay to ensure page is fully loaded
                setTimeout(() => {
                    try {
                        const count = fillSurvey();
                        console.log('[SurveyHandler] Successfully filled', count, 'items');
                        sendResponse({ success: true, message: 'Survey filled successfully', count: count });
                    } catch (error) {
                        console.error('[SurveyHandler] Error filling survey:', error);
                        sendResponse({ success: false, error: error.message });
                    }
                }, 500); // 500ms delay
                
                return true; // Keep the message channel open for async response
            }
        });
        console.log('[SurveyHandler] Message listener registered successfully');
    } else {
        console.error('[SurveyHandler] Chrome runtime API not available');
    }
    
    // Announce ready state
    console.log('[SurveyHandler] ✅ Ready to fill surveys!');
})();
