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
      navigateQuizzes: true,
      isActive: false
    }
  });
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggleAutomation') {
    // Handle automation toggle
    sendResponse({ success: true });
  } else if (request.action === 'amigo:all-done') {
    try {
      chrome.notifications.create('amigo_all_done', {
        type: 'basic',
        iconUrl: 'logo.png',
        title: 'Amigo Automator',
        message: 'Bot has processed all links, stopping now'
      });
    } catch (e) {
      // ignore
    }
    sendResponse({ success: true });
  } else if (request.action === 'amigo:export-answers') {
    try {
      const { courseName, assignmentName, payload } = request;
      const safeCourse = (courseName || 'Unknown Course').replace(/[^a-z0-9\-_\s]/gi, '_').trim();
      const safeAssignment = (assignmentName || 'Assignment').replace(/[^a-z0-9\-_\s]/gi, '_').trim();
      const filename = `Database/${safeCourse}/${safeAssignment}.json`;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({ url, filename, saveAs: false }, (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
        // Revoke after a short delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      });
    } catch (e) {
      sendResponse({ success: false, error: String(e) });
    }
    return true;
  }
});

// Handle tab updates to inject content script
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('amigolms.amityonline.com')) {
    // Content script will be automatically injected based on manifest
    console.log('Amigo LMS page loaded');
  }
});
