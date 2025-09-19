// Background script for Amigo Assignment Automator
chrome.runtime.onInstalled.addListener(function() {
  console.log('Amigo Assignment Automator installed');
  
  // Set default settings
  chrome.storage.sync.set({
    amigoSettings: {
      autoSubmit: true,
      randomAnswers: true,
      skipEndModuleAssignments: true,
      navigateContent: true,
      isActive: false
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleAutomation') {
    // Handle automation toggle
    sendResponse({ success: true });
  }
});

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('amigolms.amityonline.com')) {
    // Content script will be automatically injected based on manifest
    console.log('Amigo LMS page loaded');
  }
});
