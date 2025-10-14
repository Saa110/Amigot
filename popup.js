// Popup script for Amigo Assignment Automator
document.addEventListener('DOMContentLoaded', function() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const fillSurveyBtn = document.getElementById('fillSurveyBtn');
  const startFacultyAutomationBtn = document.getElementById('startFacultyAutomationBtn');
  const stopFacultyAutomationBtn = document.getElementById('stopFacultyAutomationBtn');
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
  let settingsExpanded = false; // Start collapsed

  // Settings collapse/expand
  const settingsToggle = document.getElementById('settingsToggle');
  const settingsContent = document.getElementById('settingsContent');
  const settingsIcon = document.getElementById('settingsIcon');

  settingsToggle.addEventListener('click', function() {
    settingsExpanded = !settingsExpanded;
    
    if (settingsExpanded) {
      settingsContent.style.display = 'block';
      settingsContent.style.color = 'black';
      settingsIcon.style.transform = 'rotate(40deg)';
    } else {
      settingsContent.style.display = 'none';
      settingsContent.style.color = 'white';
      settingsIcon.style.transform = 'rotate(0deg)';
    }
    
    // Save preference
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.set({settingsExpanded: settingsExpanded});
    }
  });

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

  // Fill Survey button listener
  fillSurveyBtn.addEventListener('click', function() {
    console.log('[Popup] Fill Survey button clicked');
    
    // Visual feedback - disable button temporarily
    fillSurveyBtn.disabled = true;
    fillSurveyBtn.textContent = '⏳ Filling...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || !tabs[0]) {
        console.error('[Popup] No active tab found');
        fillSurveyBtn.disabled = false;
        fillSurveyBtn.textContent = '📝 Fill Survey Form';
        alert('Error: No active tab found');
        return;
      }
      
      console.log('[Popup] Sending fillSurvey message to tab:', tabs[0].id);
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'fillSurvey'
      }, function(response) {
        // Re-enable button
        fillSurveyBtn.disabled = false;
        fillSurveyBtn.textContent = '📝 Fill Survey Form';
        
        if (chrome.runtime.lastError) {
          console.error('[Popup] Error:', chrome.runtime.lastError.message);
          alert('Error: ' + chrome.runtime.lastError.message + '\n\nMake sure you are on an Amigo LMS page.');
        } else if (response && response.success) {
          console.log('[Popup] Survey filled successfully:', response);
          alert('✅ Survey filled successfully!\nFilled ' + (response.count || 0) + ' options.');
        } else {
          console.error('[Popup] Failed to fill survey:', response ? response.error : 'Unknown error');
          alert('⚠️ Failed to fill survey: ' + (response ? response.error : 'Unknown error'));
        }
      });
    });
  });

  // Start Faculty Automation button listener
  startFacultyAutomationBtn.addEventListener('click', function() {
    console.log('[Popup] Start Faculty Automation button clicked');
    
    // Visual feedback
    startFacultyAutomationBtn.disabled = true;
    startFacultyAutomationBtn.textContent = '🔄 Starting...';
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || !tabs[0]) {
        startFacultyAutomationBtn.disabled = false;
        startFacultyAutomationBtn.textContent = '🚀 Auto-Fill All Faculty Forms';
        alert('Error: No active tab found');
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'startFacultyAutomation'
      }, function(response) {
        startFacultyAutomationBtn.disabled = false;
        startFacultyAutomationBtn.textContent = '🚀 Auto-Fill All Faculty Forms';
        
        if (chrome.runtime.lastError) {
          console.error('[Popup] Error:', chrome.runtime.lastError.message);
          alert('❌ Error: ' + chrome.runtime.lastError.message + 
                '\n\nMake sure you are on the "My Faculty" page and the extension is loaded.' +
                '\n\nSteps:\n1. Reload extension (chrome://extensions/)\n2. Refresh page\n3. Try again');
        } else if (response && response.success) {
          console.log('[Popup] Faculty automation started successfully');
          alert('✅ Faculty automation started!\n\nThe extension will now:\n' +
                '1. Navigate to each faculty member\n' +
                '2. Fill their feedback form\n' +
                '3. Submit automatically\n\n' +
                'You can close this popup and let it run.\n' +
                'You will be notified when all forms are completed.');
        } else {
          console.error('[Popup] Failed to start automation');
          alert('⚠️ Failed to start automation.\n\nPlease ensure you are on the "My Faculty" page.');
        }
      });
    });
  });

  // Stop Faculty Automation button listener
  stopFacultyAutomationBtn.addEventListener('click', function() {
    console.log('[Popup] Stop Faculty Automation button clicked');
    
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs || !tabs[0]) {
        alert('Error: No active tab found');
        return;
      }
      
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'stopFacultyAutomation'
      }, function(response) {
        if (chrome.runtime.lastError) {
          console.error('[Popup] Error:', chrome.runtime.lastError.message);
          alert('Error: ' + chrome.runtime.lastError.message);
        } else {
          console.log('[Popup] Faculty automation stopped');
          alert('⏸️ Faculty automation has been stopped.');
        }
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
      // Update status dot and text
      statusDot.classList.add('active');
      statusText.classList.add('active');
      statusText.textContent = 'Active';
      
      // Update button
      toggleBtn.textContent = 'Stop Automation';
      toggleBtn.classList.add('active');
    } else {
      // Update status dot and text
      statusDot.classList.remove('active');
      statusText.classList.remove('active');
      statusText.textContent = 'Inactive';
      
      // Update button
      toggleBtn.textContent = 'Start Automation';
      toggleBtn.classList.remove('active');
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(['amigoSettings', 'settingsExpanded'], function(result) {
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
      
      // Load settings expanded state
      if (result.settingsExpanded !== undefined) {
        settingsExpanded = result.settingsExpanded;
        if (settingsExpanded) {
          settingsContent.style.display = 'block';
          settingsIcon.style.transform = 'rotate(180deg)';
        } else {
          settingsContent.style.display = 'none';
          settingsIcon.style.transform = 'rotate(0deg)';
        }
      }
    });
  }

  function loadSettingsLegacy() {
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
