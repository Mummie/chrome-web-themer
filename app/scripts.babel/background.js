'use strict';
chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

function saveEditToURL(url, edits) {
    var obj = {};
    obj[url] = edits;
    chrome.storage.sync.set(obj, function() {
        console.log('Settings Saved', obj);
    });
}

var currentURL = '';

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

chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
      switch (request.command) {
        case "GetURL":
          var tabURL = "";
          chrome.tabs.query({
            active: true
          }, function(tabs) {
            if (tabs.length === 0) {
              sendResponse({});
              return;
            }
            tabURL = tabs[0].url;
            sendResponse({
              url: tabURL
            });
          });
          break;

        case 'SaveEdit':
            saveEditToURL(request.url, request.edits);
            sendResponse({
                success: true
            });
            break;
      }
    });
