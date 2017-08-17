'use strict';

let saveEditToURL = function(url, edit) {

  chrome.storage.sync.get(url, function(pageEdits) {
      for(let key in Object.keys(edit)) {
        if(lodash.isEmpty(pageEdits[url])) {
          let obj = {};
          obj[url][key] = edit[key];
          console.log(obj[url][key]);
          chrome.storage.sync.set(obj);
        }
        else {
          pageEdits[url][key] = edit[key];
          console.log(pageEdits[url][key]);
          chrome.storage.sync.set(pageEdits);
        }
      }

  });
}

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
    if(request.command === 'saveEdit') {
      saveEditToURL(sender.tab.url, request.edit);
    }
      sendResponse({farewell: "goodbye"});
      return true;
  });
