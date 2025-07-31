chrome.runtime.onMessage.addListener((message) => {
  const debuggee = {tabId: message.tabId};
  
  chrome.debugger.attach(debuggee, '1.3', () => {
    chrome.debugger.sendCommand(debuggee, 'Page.printToPDF', {}, (result) => {
      console.log('Base64 PDF:', result.data);
      chrome.debugger.detach(debuggee);
    });
  });
});
