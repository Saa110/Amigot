# Amigo Assignment Automator

A browser extension that automatically handles assignments and navigates content on the Amigo LMS platform.

- **Suggested workflow**: First complete your Module Assessments manually. After that, enable the bot so its skip logic helps prevent accidentally attempting assessments.

## Features

- **Automated Content Navigation**: Clicks through non-assessment course content, skipping completed items
- **Quiz Automation**: Attempts quizzes by selecting answers and submitting with a streamlined `QuizHandler`
- **Survey Form Filler**: Automatically fills survey forms with positive responses (Strongly Agree/Yes) and submits them
- **Smart Skipping**: Avoids end-of-module assessments and already completed activities
- **Configurable Settings**: Popup toggles control behavior; state persists across pages
- **Multiple Question Types**: Radios, checkboxes, text inputs, and dropdowns (best with radios via `QuizHandler`)

## Installation

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your browser toolbar

**Note**: The extension works on both `amigolms.amityonline.com` (for course content) and `s.amizone.net` (for survey forms).

## Usage

1. Navigate to your Amigo LMS course page
2. Click the extension icon in your browser toolbar
3. Configure your settings:
   - **Auto Submit**: Auto-advance and submit on supported activities
   - **Random Answers**: Select random options/fill random text where applicable
   - **Skip End Module**: Avoid end-of-module assessments
   - **Navigate Content**: Open non-assessment content automatically
   - **Run Quizzes**: Navigate and attempt quizzes after content
4. Click "Start Automation" to begin. The active state is saved and honored on subsequent pages.
5. For survey forms, click the "📝 Fill Survey Form" button to automatically fill and submit with positive responses.

## How It Works

### Assignment Handling
- Detects quiz, assignment, and lesson pages
- Uses a dedicated `QuizHandler` to run a strict flow: enter → fill radios → finish attempt → submit all and finish
- Falls back to legacy handlers for checkboxes, text inputs, and selects if the streamlined path is unavailable
- Skips end-of-module assignments based on breadcrumb keywords and URL patterns

### Content Navigation
- Identifies non-assessment content links inside `.activity-item`
- Skips items already marked as completed (see Completion Detection below)
- Opens each content item in sequence using an in-page queue
- After finishing content, automatically proceeds to quizzes if enabled

### Safety Features
- Skips file upload assignments
- Avoids end-of-module assessments
- Provides configurable settings for different use cases

### Completion Detection
- For general activities, looks for completion cues like green `btn-success`, visible "Done" text, or a check icon in the completion region
- For quizzes, requires both sub-requirements to be marked done: "View" and "Receive a grade"

### Queues and Persistence
- Content and quiz URLs are stored in `sessionStorage` to navigate sequentially and avoid duplicates
- Keys used: `__amigoNavQueue`, `__amigoQuizQueue`, `__amigoQuizLinks`, `__amigoQuizScanned`, `__amigoNavigated`
- The popup’s active state and toggles are saved in `chrome.storage.sync` under `amigoSettings`

## Supported Question Types

- Multiple choice (radio buttons)
- Multiple select (checkboxes)
- Text inputs and textareas
- Dropdown selections
- Basic form submissions

## Important Notes

⚠️ **Academic Integrity Warning**: This extension is for educational purposes only. Using automated tools to complete assignments may violate your institution's academic integrity policies. Use at your own risk.

⚠️ **End-of-Module Assignments**: The extension attempts to skip assignments at the end of modules, but this detection may not be 100% accurate. Always review your course structure before using the extension.


## File Structure

```
├── manifest.json          # Extension configuration
├── content.js            # Main automation logic (navigation, legacy handlers)
├── quizHandler.js        # Streamlined quiz automation flow
├── surveyHandler.js      # Survey form automation with positive responses
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── background.js         # Background service worker
└── README.md            # This file
```

## Development

To modify the extension:

1. Edit the relevant files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension
4. Test your changes

## Troubleshooting

- **Extension not working**: Make sure you're on an Amigo LMS page and the extension is enabled
- **Assignments not being skipped**: Breadcrumb/URL heuristics may need adjustment on your course
- **Content not opening**: Ensure items are inside `.activity-item` and not already completed
- **Quizzes not progressing**: If only "Re-attempt" is available, the quiz is considered done and will be skipped
- **Host permission**: Confirm the site matches `https://amigolms.amityonline.com/*` as set in `manifest.json`

## Disclaimer

This extension is provided as-is for educational purposes. The authors are not responsible for any academic consequences resulting from its use. Always ensure compliance with your institution's policies and terms of service.