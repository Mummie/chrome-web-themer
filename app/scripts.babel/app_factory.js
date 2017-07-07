const app = angular.module('ContentScriptFactory', ['ngLodash']);
app.factory('ContentScriptFactory', function($q, lodash) {
  let triggerEditAction = function() {
    var deferred = $q.defer();

    chrome.tabs.getSelected(null, function(tab) {
      chrome.tabs.sendMessage(tab.id, { command: 'editEvent' },
      function(clickedElement) {
        if (chrome.runtime.lastError) {
          deferred.reject(chrome.runtime.lastError);
        }
        deferred.resolve(clickedElement);
      });
    });

    return deferred.promise;
  };

  let textReplaceAction = function(url, textEdits) {
    let deferred = $q.defer();
    chrome.storage.sync.get(url, function(pageEdits) {
      console.log(pageEdits[url]);
      if (pageEdits[url].textReplaceEdits.length >= 1) {
        let obj = {
          textEdits
        };
        pageEdits[url].textReplaceEdits.push(textEdits);
        console.log(pageEdits[url].textReplaceEdits);
        chrome.storage.sync.set(pageEdits, function() {
          deferred.resolve(true);
        });
      } else {
        pageEdits[url].textReplaceEdits = [textEdits];

        chrome.storage.sync.set(pageEdits, function() {
          deferred.resolve(true);
        });
      }

    });

    return deferred.promise;
  };

  let saveBackgroundColorEdit = function(url, edit) {
    let deferred = $q.defer();
    if (edit === 'undefined' || null) {
      deferred.reject(false);
    }

    chrome.storage.sync.get(url, function(pageEdits) {
      console.log(pageEdits[url]);
      if(lodash.isEmpty(pageEdits[url])) {
        let obj = {};
        obj[url] = { 'backgroundColor': edit };
        chrome.storage.sync.set(obj, function() {
          deferred.resolve(true);
        });
      } else {
        pageEdits[url].backgroundColor = edit;
        console.log(pageEdits);
        chrome.storage.sync.set(pageEdits, function() {
          deferred.resolve(true);
        });
      }

    });

    return deferred.promise;
  };

  let getCurrentURLEdits = function() {
    let deferred = $q.defer();
    chrome.tabs.query({
      currentWindow: true,
      active: true
    }, function(tabs) {
      chrome.storage.sync.get(tabs[0].url, function(edits) {
        deferred.resolve(edits[tabs[0].url]);
      });
    });
    return deferred.promise;
  };

  return {
    triggerEditAction: triggerEditAction,
    textReplaceAction: textReplaceAction,
    saveBackgroundColorEdit: saveBackgroundColorEdit,
    getCurrentURLEdits: getCurrentURLEdits
  };
});
