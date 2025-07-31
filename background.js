// Function to convert base64 to Uint8Array
function base64ToUint8Array(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Function to upload to pCloud (JavaScript version of Python script)
async function uploadToPCloud(base64Data, filename, authToken) {
  try {
    console.log('Converting base64 to binary...');
    
    // Convert base64 to blob
    const uint8Array = base64ToUint8Array(base64Data);
    const blob = new Blob([uint8Array], { type: 'application/pdf' });
    
    console.log('Uploading to pCloud...');
    
    // Create FormData
    const formData = new FormData();
    formData.append('file', blob, filename);
    
    // Upload to pCloud
    const uploadUrl = `https://api.pcloud.com/uploadfile?auth=${authToken}&path=/Reading`;
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.result === 0) {
      console.log('✓ File uploaded successfully to pCloud:', filename);
      console.log('File ID:', data.metadata[0].fileid);
      return { success: true, data: data.metadata[0] };
    } else {
      throw new Error(data.error || 'Upload failed');
    }
    
  } catch (error) {
    console.error('❌ pCloud upload error:', error);
    return { success: false, error: error.message };
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'printAndUpload') {
    const debuggee = {tabId: message.tabId};
    
    chrome.debugger.attach(debuggee, '1.3', () => {
      if (chrome.runtime.lastError) {
        sendResponse({success: false, error: chrome.runtime.lastError.message});
        return;
      }
      
      console.log('Generating PDF for:', message.filename);
      
      chrome.debugger.sendCommand(debuggee, 'Page.printToPDF', {}, async (result) => {
        if (chrome.runtime.lastError) {
          sendResponse({success: false, error: chrome.runtime.lastError.message});
        } else {
          console.log('PDF generated, uploading to pCloud...');
          
          // Upload to pCloud
          const uploadResult = await uploadToPCloud(result.data, message.filename, message.token);
          
          if (uploadResult.success) {
            console.log('✓ Successfully uploaded to pCloud');
            sendResponse({success: true});
          } else {
            console.log('❌ Upload failed:', uploadResult.error);
            sendResponse({success: false, error: uploadResult.error});
          }
        }
        
        chrome.debugger.detach(debuggee);
      });
    });
  }
  
  return true; // Keep message channel open for async response
});
