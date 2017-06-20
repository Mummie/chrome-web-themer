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

  let textReplaceAction = function(txtFind, txtReplace) {
    if (txtReplace && txtReplace.length > 0) {
      const txtRplObj = {
        find: txtFind,
        replace: txtReplace
      };
      chrome.tabs.getSelected(null, function(tab) {
        const url = tab.url;
        chrome.tabs.sendRequest(tab.id, txtRplObj, function(res) {
          return {command: 'SaveEdit', url, edits: res};
        });
      });
    }
  };

  return {triggerEditAction: triggerEditAction, textReplaceAction: textReplaceAction};
});
