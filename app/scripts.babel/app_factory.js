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

    return { triggerEditAction: triggerEditAction };
});