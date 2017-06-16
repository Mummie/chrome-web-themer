'use strict';

chrome.runtime.onInstalled.addListener(details => {
  console.log('previousVersion', details.previousVersion);
});

// Inject our Angular app, taking care
// not to interfere with page's Angular (if any)
function injectAngular(tabId) {
  // Prevent immediate automatic bootstrapping
  chrome.tabs.executeScript(tabId, {
    code: 'window.name = "NG_DEFER_BOOTSTRAP!" + window.name;'
  }, function() {
    // Inject AngularJS
    chrome.tabs.executeScript(tabId, {
      file: '../bower_components/angular/angular.js'
    }, function() {
      // Inject our app's script
      chrome.tabs.executeScript(tabId, {
        file: 'app.js'
      });
    });
  });
}

function saveEditToURL(url, edits) {
    var obj = {};
    obj[url] = edits;
    chrome.storage.sync.set(obj, function() {
        console.log('Settings Saved', obj);
    });
}

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

    // Call `injectAngular()` when the user clicks the browser-action button
    chrome.browserAction.onClicked.addListener(function(tab) {
      console.log('clicked browser action');
      injectAngular(tab.id);
    });