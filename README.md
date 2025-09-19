# Amigo Assignment Automator

A browser extension that automatically handles assignments and navigates content on the Amigo LMS platform.

## Features

- **Random Answer Selection**: Automatically fills in random answers for quizzes and assignments
- **Content Navigation**: Automatically opens and navigates through non-assessment content
- **Smart Assignment Detection**: Skips end-of-module assignments to avoid completing important assessments
- **Configurable Settings**: Toggle different automation features on/off
- **Multiple Question Types**: Supports multiple choice, checkboxes, text inputs, and dropdowns

## Installation

1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The extension will appear in your browser toolbar

## Usage

1. Navigate to your Amigo LMS course page
2. Click the extension icon in your browser toolbar
3. Configure your settings:
   - **Auto Submit**: Automatically submit assignments
   - **Random Answers**: Fill in random answers for questions
   - **Skip End Module**: Skip assignments at the end of modules
   - **Navigate Content**: Automatically open non-assessment content
4. Click "Start Automation" to begin

## How It Works

### Assignment Handling
- Detects quiz, assignment, and lesson pages
- Fills in random answers for all question types
- Automatically submits completed assignments
- Skips end-of-module assignments based on URL patterns and breadcrumbs

### Content Navigation
- Identifies non-assessment content links
- Automatically clicks through course materials
- Staggers navigation to avoid overwhelming the server

### Safety Features
- Skips file upload assignments
- Avoids end-of-module assessments
- Provides configurable settings for different use cases

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
├── content.js            # Main automation logic
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
- **Assignments not being skipped**: Check the URL patterns and breadcrumb detection logic
- **Content not opening**: Verify that the content links are being detected correctly

## Disclaimer

This extension is provided as-is for educational purposes. The authors are not responsible for any academic consequences resulting from its use. Always ensure compliance with your institution's policies and terms of service.