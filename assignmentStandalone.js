// 1. Define the answers in a JSON object.
// Key: The exact question text (or a unique part of it).
// Value: The exact text of the correct answer choice.
const quizAnswers = {
    // Example: "Which city was the capital of the Mauryan Empire?": "Pataliputra",
    // Add more questions and answers here following the same structure
    // "Another question text?": "Correct Answer B", 
};
 
/**
 * Fills in the correct radio button for a given quiz question based on a map of answers.
 * @param {Object} answersMap - A map where keys are question texts and values are answer texts.
 */
function fillQuizAnswers(answersMap) {
    console.log("Starting quiz answer filling script...");
 
    // Get all quiz question containers on the page
    const questionContainers = document.querySelectorAll('.que.multichoice');
    
    let questionsProcessed = 0;
 
    // Iterate over each question container
    questionContainers.forEach(container => {
        // Find the question text element (adjust selector if needed for other quiz layouts)
        const questionTextElement = container.querySelector('.qtext');
        
        if (!questionTextElement) {
            console.warn("Could not find question text in a container. Skipping.");
            return;
        }
 
        // Get the inner text and trim it for comparison
        const questionText = questionTextElement.textContent.trim();
        
        // Check if we have an answer for this question
        const correctAnswerText = answersMap[questionText];
 
        if (correctAnswerText) {
            console.log(`\nFound answer for question: "${questionText}".`);
            console.log(`Target answer text is: "${correctAnswerText}".`);
            
            // Find all answer labels/divs within the current question container
            // The selector targets the div containing the 'answernumber' and the answer text
            const answerLabels = container.querySelectorAll('[data-region="answer-label"]');
            let found = false;
 
            answerLabels.forEach(label => {
                // Get the text content of the entire label (which includes 'a.', 'b.', etc.)
                const labelText = label.textContent.trim();
                
                // Check if the label's text includes the correct answer text
                if (labelText.includes(correctAnswerText)) {
                    // We found the correct answer label. Now find the associated radio input.
                    // The 'aria-labelledby' attribute links the radio input to the label div.
                    // We can use the label's ID to find the radio button.
                    const radioId = label.id.replace('_label', ''); 
                    const radioInput = document.getElementById(radioId);
                    
                    if (radioInput && radioInput.type === 'radio') {
                        // Check the radio button
                        radioInput.checked = true;
                        
                        // Fire a change event to let the quiz interface know the selection changed
                        // This is crucial for some sites to register the answer.
                        const event = new Event('change', { bubbles: true });
                        radioInput.dispatchEvent(event);
                        
                        console.log(`✅ Successfully checked radio button for answer: ${correctAnswerText}`);
                        found = true;
                        questionsProcessed++;
                    }
                }
            });
 
            if (!found) {
                console.warn(`❌ Could not find an answer choice matching "${correctAnswerText}" in the DOM.`);
            }
 
        } else {
            // console.log(`No answer found in the map for question: "${questionText}"`);
        }
    });
    
    console.log(`\nScript finished. Successfully processed ${questionsProcessed} question(s).`);
}
 
// 2. Execute the function
fillQuizAnswers(quizAnswers);