// Function to slugify title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Load saved token on popup open
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['pcloudToken'], (result) => {
    if (result.pcloudToken) {
      document.getElementById('token').value = result.pcloudToken;
    }
  });
});

// Save token button
document.getElementById('saveToken').onclick = () => {
  const token = document.getElementById('token').value.trim();
  if (token) {
    chrome.storage.local.set({pcloudToken: token}, () => {
      document.getElementById('status').textContent = 'Token saved!';
      document.getElementById('status').style.color = 'green';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 2000);
    });
  } else {
    document.getElementById('status').textContent = 'Please enter a token';
    document.getElementById('status').style.color = 'red';
  }
};

// Print and upload button
document.getElementById('print').onclick = async () => {
  const button = document.getElementById('print');
  const status = document.getElementById('status');
  const originalText = button.textContent;
  
  try {
    // Check if token exists
    const result = await chrome.storage.local.get(['pcloudToken']);
    if (!result.pcloudToken) {
      status.textContent = 'Please save your pCloud token first';
      status.style.color = 'red';
      return;
    }
    
    button.disabled = true;
    status.style.color = 'blue';
    
    status.textContent = 'Getting tab info...';
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    // Slugify the title for filename
    const filename = slugify(tab.title) + '.pdf';
    
    status.textContent = 'Converting to PDF...';
    
    chrome.runtime.sendMessage({
      action: 'printAndUpload',
      tabId: tab.id,
      filename: filename,
      token: result.pcloudToken
    }, (response) => {
      if (response?.success) {
        status.textContent = `✓ Uploaded: ${filename}`;
        status.style.color = 'green';
      } else {
        status.textContent = `❌ Error: ${response?.error || 'Unknown error'}`;
        status.style.color = 'red';
      }
      
      button.textContent = originalText;
      button.disabled = false;
      
      // Clear status after 5 seconds
      setTimeout(() => {
        status.textContent = '';
      }, 5000);
    });
    
  } catch (error) {
    status.textContent = `❌ Error: ${error.message}`;
    status.style.color = 'red';
    button.textContent = originalText;
    button.disabled = false;
  }
};
