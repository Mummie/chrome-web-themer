'use strict';

chrome.tabs.query({ 'active': true, 'currentWindow': true }, function(tabs) {
    currentURL = tabs[0].url;
    chrome.storage.sync.get(`${currentURL}`, function(edits) {
      if (Object.keys(edits).length < 1) {
        console.log(`No edits saved for this site ${currentURL}`);
      } else {
        // edits will be an array of css styles, changes to text and DOM elements
        console.log(edits);
        chrome.tabs.sendMessage(tabs[0].id, { pageEdits: edits[currentURL] });
      }
    });
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    console.log(request);
      sendResponse({farewell: "goodbye"});
      return true;
  });
