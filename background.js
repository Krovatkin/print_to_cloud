// Function to upload to pCloud (returns fileId)
async function uploadToPCloud(base64Data, filename, authToken) {
  try {
    console.log('Converting base64 to binary...');
    
    const response = await fetch(`data:application/pdf;base64,${base64Data}`);
    const blob = await response.blob();
    
    console.log('Uploading to pCloud...');
    
    const formData = new FormData();
    formData.append('file', blob, filename);
    
    const uploadUrl = `https://api.pcloud.com/uploadfile?auth=${authToken}&path=/Reading`;
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });
    
    const data = await uploadResponse.json();
    
    if (data.result === 0) {
      console.log('✓ File uploaded successfully to pCloud:', filename);
      const fileId = data.metadata[0].fileid;
      
      return { 
        success: true, 
        filename: filename,
        fileId: fileId
      };
    } else {
      throw new Error(data.error || 'Upload failed');
    }
    
  } catch (error) {
    console.error('❌ pCloud upload error:', error);
    return { success: false, error: error.message };
  }
}

// Handle messages from popup (return fileId)
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
          
          const uploadResult = await uploadToPCloud(result.data, message.filename, message.token);
          
          if (uploadResult.success) {
            console.log('✓ Successfully uploaded to pCloud');
            sendResponse({
              success: true, 
              filename: uploadResult.filename,
              fileId: uploadResult.fileId
            });
          } else {
            console.log('❌ Upload failed:', uploadResult.error);
            sendResponse({success: false, error: uploadResult.error});
          }
        }
        
        chrome.debugger.detach(debuggee);
      });
    });
  }
  
  return true;
});
