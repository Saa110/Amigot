// Popup script for Amigo Assignment Automator
document.addEventListener('DOMContentLoaded', function() {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const toggleBtn = document.getElementById('toggleBtn');
  const fillSurveyBtn = document.getElementById('fillSurveyBtn');
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
