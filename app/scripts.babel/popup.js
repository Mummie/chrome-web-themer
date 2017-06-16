'use strict';
chrome.tabs.query({ 'active': true, 'currentWindow': true }, function(tabs) {
    var url = tabs[0].url;
    console.log(url);
    testSave();
    loadEdits(url);
});

function loadEdits(url) {
    chrome.storage.sync.get(`${url}`, function(edits) {
        if (typeof edits != 'undefined' && edits.length >= 1) {
            console.log(edits);
            console.log(edits[0].element);
            // edits will be an array of css styles, changes to text and DOM elements
        } else {
            console.log(`No edits saved for this site ${url}`);
        }
    });
}

function testSave(url, edits) {
    var obj = {};
    obj[url] = edits;
    chrome.storage.sync.set(obj, function() {
        console.log('Settings Saved', obj);
    });
}