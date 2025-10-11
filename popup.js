// Popup script for Amigo Assignment Automator
document.addEventListener('DOMContentLoaded', function() {
  const statusElement = document.getElementById('status');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const runEndModuleBtn = document.getElementById('runEndModuleBtn');
  const startEndModuleBtn = document.getElementById('startEndModuleBtn');
  const stopEndModuleBtn = document.getElementById('stopEndModuleBtn');
  
  const toggles = {
    autoSubmit: document.getElementById('autoSubmit'),
    randomAnswers: document.getElementById('randomAnswers'),
    skipEndModule: document.getElementById('skipEndModule'),
    navigateContent: document.getElementById('navigateContent'),
    navigateQuizzes: document.getElementById('navigateQuizzes')
  };

  let isActive = false;

  // Load saved settings
  loadSettings();

  // Set up toggle listeners
  Object.keys(toggles).forEach(key => {
    toggles[key].addEventListener('click', function() {
      this.classList.toggle('active');
      saveSettings();
    });
  });

  // Toggle button listener
  toggleBtn.addEventListener('click', function() {
    isActive = !isActive;
    updateUI();
    saveSettings();
    
    // Send message to content script
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'toggleAutomation',
        enabled: isActive
      });
    });
  });

  // Run End Module Assignment Handler exclusively
  runEndModuleBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'amigo:run-end-module-handler'
      });
    });
  });

  startEndModuleBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'amigo:start-end-module-monitor'
      });
    });
  });

  stopEndModuleBtn.addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'amigo:stop-end-module-monitor'
      });
    });
  });

  function updateUI() {
    if (isActive) {
      statusElement.classList.add('active');
      statusText.textContent = 'Active';
      toggleBtn.textContent = 'Stop Automation';
    } else {
      statusElement.classList.remove('active');
      statusText.textContent = 'Inactive';
      toggleBtn.textContent = 'Start Automation';
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(['amigoSettings'], function(result) {
      if (result.amigoSettings) {
        const settings = result.amigoSettings;
        
        // Update toggles based on saved settings
        Object.keys(toggles).forEach(key => {
          if (settings[key] !== undefined) {
            if (settings[key]) {
              toggles[key].classList.add('active');
            } else {
              toggles[key].classList.remove('active');
            }
          }
        });
        
        isActive = settings.isActive || false;
        updateUI();
      }
    });
  }

  function saveSettings() {
    const settings = {
      autoSubmit: toggles.autoSubmit.classList.contains('active'),
      randomAnswers: toggles.randomAnswers.classList.contains('active'),
      skipEndModule: toggles.skipEndModule.classList.contains('active'),
      navigateContent: toggles.navigateContent.classList.contains('active'),
      navigateQuizzes: toggles.navigateQuizzes.classList.contains('active'),
      isActive: isActive
    };

    chrome.storage.sync.set({amigoSettings: settings}, function() {
      console.log('Settings saved');
    });
  }
});
