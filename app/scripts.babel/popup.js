'use strict';
chrome.tabs.query({ 'active': true, 'currentWindow': true }, function(tabs) {
    var url = tabs[0].url;
    console.log(url);
    chrome.storage.sync.get(`${url}`, function(edits) {
      if (Object.keys(edits).length < 1) {
        console.log(`No edits saved for this site ${url}`);
        // edits will be an array of css styles, changes to text and DOM elements
      } else {
        console.log(edits);
        chrome.tabs.sendRequest(tabs[0].id, {
          command: 'loadEdits',
          edits: edits
        }, function(res) {
          console.log(res);
        });
      }
    });
});
