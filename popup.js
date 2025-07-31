document.getElementById('print').onclick = async () => {
  const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  chrome.runtime.sendMessage({tabId: tab.id});
};