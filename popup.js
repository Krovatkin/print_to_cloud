document.addEventListener('DOMContentLoaded', function() {
  const authTokenInput = document.getElementById('authToken');
  const uploadPathInput = document.getElementById('uploadPath');
  const saveButton = document.getElementById('saveSettings');
  const printButton = document.getElementById('printAndUpload');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  loadSettings();

  // Slugify function for filename
  function slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  // Save settings
  saveButton.addEventListener('click', function() {
    const authToken = authTokenInput.value.trim();
    const uploadPath = uploadPathInput.value.trim();
    
    if (!authToken) {
      showStatus('Please enter an auth token', 'error');
      return;
    }
    
    if (!uploadPath) {
      showStatus('Please enter an upload path', 'error');
      return;
    }
    
    // Ensure path starts with /
    const normalizedPath = uploadPath.startsWith('/') ? uploadPath : '/' + uploadPath;
    
    // Save to localStorage
    chrome.storage.local.set({
      'pcloud_auth_token': authToken,
      'pcloud_upload_path': normalizedPath
    }, function() {
      if (chrome.runtime.lastError) {
        showStatus('Error saving settings: ' + chrome.runtime.lastError.message, 'error');
      } else {
        showStatus('Settings saved successfully!', 'success');
        uploadPathInput.value = normalizedPath; // Update display
        printButton.disabled = false;
      }
    });
  });

  // Print and upload
  printButton.addEventListener('click', async function() {
    try {
      printButton.disabled = true;
      printButton.textContent = 'Processing...';
      showStatus('Generating PDF and uploading...', 'success');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // Get saved settings
      const settings = await getStoredSettings();
      
      if (!settings.authToken || !settings.uploadPath) {
        showStatus('Please save your settings first', 'error');
        return;
      }

      // Generate filename using slugify
      const slugifiedTitle = slugify(tab.title).substring(0, 50);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${slugifiedTitle}_${timestamp}.pdf`;

      // Send message to background script
      chrome.runtime.sendMessage({
        action: 'printAndUpload',
        tabId: tab.id,
        filename: filename,
        token: settings.authToken,
        uploadPath: settings.uploadPath
      }, function(response) {
        if (response && response.success) {
          showStatus(`Successfully uploaded: ${response.filename}`, 'success');
        } else {
          const errorMsg = response ? response.error : 'Unknown error occurred';
          showStatus(`Upload failed: ${errorMsg}`, 'error');
        }
        
        printButton.disabled = false;
        printButton.textContent = 'Print & Upload to pCloud';
      });

    } catch (error) {
      showStatus('Error: ' + error.message, 'error');
      printButton.disabled = false;
      printButton.textContent = 'Print & Upload to pCloud';
    }
  });

  // Check if settings exist and enable/disable print button
  authTokenInput.addEventListener('input', checkSettings);
  uploadPathInput.addEventListener('input', checkSettings);

  function loadSettings() {
    chrome.storage.local.get(['pcloud_auth_token', 'pcloud_upload_path'], function(result) {
      if (result.pcloud_auth_token) {
        authTokenInput.value = result.pcloud_auth_token;
      }
      
      if (result.pcloud_upload_path) {
        uploadPathInput.value = result.pcloud_upload_path;
      }
      
      checkSettings();
    });
  }

  function getStoredSettings() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['pcloud_auth_token', 'pcloud_upload_path'], function(result) {
        resolve({
          authToken: result.pcloud_auth_token,
          uploadPath: result.pcloud_upload_path
        });
      });
    });
  }

  function checkSettings() {
    const hasToken = authTokenInput.value.trim().length > 0;
    const hasPath = uploadPathInput.value.trim().length > 0;
    printButton.disabled = !(hasToken && hasPath);
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';
    
    // Hide status after 5 seconds for success messages
    if (type === 'success') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
});
