// AngularJS controller and directive code
const app = angular.module('themerApp', []);
app.controller('EditController', function($scope) {

    $scope.toggleTextReplace = false;
    $scope.toggleFilters = false;

    $scope.editElement = function() {
        $scope.output = 'Triggered Event Listener';

        document.getElementById('edit-button').focus();
        const clickedElement = $scope.inject();
        console.log(clickedElement);
        // Broadcast an event called 'parent' to the children
        $scope.$broadcast('parent', 'I am your father');
    };

    $scope.textReplace = function() {
        console.log($scope.txtReplace);

        if ($scope.txtReplace && $scope.txtReplace.length > 0) {
            const txtRplObj = { find: $scope.txtFind, replace: $scope.txtReplace };
            chrome.tabs.getSelected(null, function(tab) {
                chrome.tabs.sendRequest(tab.id, txtRplObj, function(res) {
                    console.log(res);
                });
            });
        }
    };
    // Listen for the parent event on $scope
    $scope.$on('parent', function(event, data) {
        console.log(data);
    });

    //Handle Errors
    $scope.$on('error', function(event, data) {
        $scope.errMessage = data;
    });

    $scope.inject = function() {
        chrome.tabs.query({ 'active': true },
            function(tabs) {
                if (tabs.length > 0) {
                    $scope.url = tabs[0].url;
                    chrome.tabs.sendMessage(tabs[0].id, { from: 'addEditEvent', request: 'editDOM' }, function(clickedElement) {
                        if (chrome.runtime.lastError) {
                            $scope.$broadcast('error', chrome.runtime.lastError);
                        } else {
                            return clickedElement;
                        }
                    });
                }
            });
    };
});