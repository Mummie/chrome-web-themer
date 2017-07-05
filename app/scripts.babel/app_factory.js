const app = angular.module('ContentScriptFactory', []);
app.factory('ContentScriptFactory', function($q, $timeout) {
  let triggerEditAction = function() {
    var deferred = $q.defer();

    $timeout(function() {
      deferred.reject('timeout for selecting an element to edit');
    }, 10000);

    chrome.tabs.query({
      'active': true
    }, function(tabs) {
      if (tabs.length > 0) {
        chrome.tabs.sendRequest(tabs[0].id, {
          command: 'editEvent'
        }, function(clickedElement) {
          if (chrome.runtime.lastError) {
            deferred.reject(chrome.runtime.lastError);
          } else {
            deferred.resolve(clickedElement);
          }
        });
      }
    });

    return deferred.promise;
  };

  let textReplaceAction = function(url, textEdits) {
    let deferred = $q.defer();
    chrome.storage.sync.get(url, function(pageEdits) {
      if (pageEdits.length > 1 && pageEdits.textReplaceEdits.length > 1) {
        let obj = {
          textEdits
        };
        pageEdits.textReplaceEdits.push(obj);
        console.log(pageEdits.textReplaceEdits);
        chrome.storage.sync.set(pageEdits.textReplaceEdits, function() {
          deferred.resolve(true);
        });
      } else {
        let obj = {};
        obj[url]['textReplaceEdits'] = [textEdits];

        chrome.storage.sync.set(obj, function() {
          deferred.resolve(true);
        });
      }

    });

    return deferred.promise;
  };

  let saveBackgroundColorEdit = function(url, edit) {
    let deferred = $q.defer();
    chrome.storage.sync.get(url, function(pageEdits) {
      console.log('page edit l from factory ', pageEdits);
      let obj = {};
      obj[url].backgroundColor = edit;
      console.log(obj[url].backgroundColor);
        chrome.storage.sync.set(obj[url].backgroundColor, function() {
          deferred.resolve(true);
        });
    });

    return deferred.promise;
  };

  return {
    triggerEditAction: triggerEditAction,
    textReplaceAction: textReplaceAction,
    saveBackgroundColorEdit: saveBackgroundColorEdit
  };
});
