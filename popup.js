// Function to slugify title
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
  const status = document.getElementById('status');
  
  if (token) {
    chrome.storage.local.set({pcloudToken: token}, () => {
      status.innerHTML = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">Token saved!</span>';
      setTimeout(() => {
        status.innerHTML = '';
      }, 2000);
    });
  } else {
    status.innerHTML = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">Please enter a token</span>';
    setTimeout(() => {
      status.innerHTML = '';
    }, 3000);
  }
};

// Print and upload button
document.getElementById('print').onclick = async () => {
  const button = document.getElementById('print');
  const status = document.getElementById('status');
  const originalText = button.textContent;
  
  try {
    const result = await chrome.storage.local.get(['pcloudToken']);
    if (!result.pcloudToken) {
      status.innerHTML = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">Please save your pCloud token first</span>';
      return;
    }
    
    button.disabled = true;
    
    status.innerHTML = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Getting tab info...</span>';
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    
    const filename = slugify(tab.title) + '.pdf';
    status.innerHTML = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">Converting to PDF...</span>';
    
    chrome.runtime.sendMessage({
      action: 'printAndUpload',
      tabId: tab.id,
      filename: filename,
      token: result.pcloudToken
    }, (response) => {
      if (response?.success) {
        const pcloudUrl = `https://my.pcloud.com/#/revisions?fileid=${response.fileId}`;
        
        status.innerHTML = `<div class="bg-green-100 text-green-800 px-3 py-2 rounded-md text-sm">
          <div class="font-semibold text-green-900">SUCCESS</div>
          <div class="mt-1">Uploaded: ${response.filename}</div>
          <div class="mt-2">
            <a href="${pcloudUrl}" target="_blank" 
               class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
              View in pCloud
            </a>
          </div>
        </div>`;
        
      } else {
        const errorMsg = response?.error || 'Unknown error';
        status.innerHTML = `<div class="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm">
          <div class="font-semibold text-red-900">ERROR</div>
          <div class="mt-1">${errorMsg}</div>
        </div>`;
      }
      
      button.textContent = originalText;
      button.disabled = false;
      
      setTimeout(() => {
        status.innerHTML = '';
      }, 8000);
    });
    
  } catch (error) {
    status.innerHTML = `<div class="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm">
      <div class="font-semibold text-red-900">ERROR</div>
      <div class="mt-1">${error.message}</div>
    </div>`;
    button.textContent = originalText;
    button.disabled = false;
    
    setTimeout(() => {
      status.innerHTML = '';
    }, 5000);
  }
};
