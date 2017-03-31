'use strict';
chrome.tabs.query({ 'active': true, 'currentWindow': true }, function(tabs) {
    var url = tabs[0].url;
    console.log(url);
    loadEdits(url);
});

function loadEdits(url) {
    chrome.storage.local.get(`pageEdits[${url}]`, function(edits) {
        console.log(edits);
        // edits will be an array of css styles, changes to text and DOM elements
    });
}