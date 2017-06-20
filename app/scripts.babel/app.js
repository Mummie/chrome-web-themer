// AngularJS controller and directive code
const app = angular.module('themerApp', ['ContentScriptFactory', 'ngCookies', 'colorpicker.module']);
app.controller('EditController', function($scope, $cookies, ContentScriptFactory) {
    $scope.toggleTextReplace = false;
    $scope.showTab = 'Edit';
    $scope.color = '#000';
    $scope.triggerEditElementAction = function() {
        ContentScriptFactory.triggerEditAction().then(function(editedElement) {
            console.log('edit', editedElement);
        });
    };



    $scope.txtFind = $cookies.get('find');
    $scope.txtReplace = $cookies.get('replace');

    $scope.filters = {};
    $scope.filters.colorblind = [{
        mode: 'Protonopia',
        selected: false
    }, {
        mode: 'Deuteranopia',
        selected: false
    }];

    $scope.changeBackgroundColor = function() {
      const colorObj = { command: 'changeColor', color: $scope.color };
      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendRequest(tab.id, colorObj, function(res) {
          console.log(res);
        });
      });
    };

    $scope.textReplace = function() {
        console.log($scope.txtReplace);
        if ($scope.txtReplace && $scope.txtReplace.length > 0) {
            $cookies.putObject('find', $scope.txtFind);
            $cookies.putObject('replace', $scope.txtReplace);
            const txtRplObj = {
                find: $scope.txtFind,
                replace: $scope.txtReplace
            };
            chrome.tabs.getSelected(null, function(tab) {
                const url = tab.url;
                chrome.tabs.sendRequest(tab.id, txtRplObj, function(res) {
                    console.log(res);
                    if (typeof res != 'undefined') {

                        chrome.extension.sendMessage({
                                command: "SaveEdit",
                                url,
                                edits: res
                            },
                            function(cmdRes) {
                                if (cmdRes.success) {
                                    console.log('Saved from App');
                                }
                            });
                    }
                });
            });
        }
    };

    //Handle Errors
    $scope.$on('error', function(event, data) {
        $scope.errMessage = data;
    });
});

app.directive('editButtonDirective', function($compile) {
    return {
        restrict: 'A',
        scope: true,
        link: function(scope, element) {
            const template = "<button ng-click='triggerEditElementAction()' id='edit-button' class='button-small pure-button'>+ Edit</button>";
            const linkFn = $compile(template);
            const content = linkFn(scope);
            element.append(content);
        }
    };
});

app.directive('sel', function() {
    return {
        template: '<select ng-model="selectedValue" ng-options="f.mode for f in filters.colorblind"></select>',
        restrict: 'E',
        scope: {
            selectedValue: '='
        },
        link: function(scope, elem) {
            scope.filters.colorblind = [{
                mode: 'Protonopia',
                selected: false
            }, {
                mode: 'Deuteranopia',
                selected: false
            }];

            scope.selectedValue = scope.filters.colorblind[1];
        }
    };
});
