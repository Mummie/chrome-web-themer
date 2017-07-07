// AngularJS controller and directive code

const app = angular.module('themerApp', ['ContentScriptFactory', 'ngCookies', 'colorpicker.module', 'ngLodash']);
app.controller('EditController', function($scope, $cookies, ContentScriptFactory, lodash) {
    $scope.toggleTextReplace = false;
    $scope.showTab = 'Edit';
    $scope.color = '#000';
    $scope.edits = null;
    $scope.showEdit = '';

    ContentScriptFactory.getCurrentURLEdits().then(function(edits) {
      if(!lodash.isEmpty(edits)) {
        $scope.edits = lodash.assign({}, edits);
        console.log('Saved Edits ', $scope.edits);
        if($scope.edits.backgroundColor && $scope.edits.backgroundColor.color) {
          $scope.color = $scope.edits.backgroundColor.color;
        }
      }
    });

    $scope.triggerEditElementAction = function() {
        ContentScriptFactory.triggerEditAction().then(function(editedElement) {
            console.log('edit', editedElement);
        });
    };



    $scope.txtFind = $cookies.get('find');
    $scope.txtReplace = $cookies.get('replace');

    $scope.filters = {};

    $scope.changeBackgroundColor = function() {
      const colorObj = { command: 'changeColor', color: $scope.color };
      chrome.tabs.getSelected(null, function(tab) {
        chrome.tabs.sendMessage(tab.id, colorObj, function(res) {
          if(res && res.color) {
            ContentScriptFactory.saveBackgroundColorEdit(tab.url, res).then(function(isSaved) {
              console.log(isSaved);
            });
          }
        });
      });
    };

    $scope.textReplace = function() {
        if ($scope.txtReplace && $scope.txtReplace.length > 0) {
            $cookies.putObject('find', $scope.txtFind);
            $cookies.putObject('replace', $scope.txtReplace);
            const txtRplObj = {
                find: $scope.txtFind,
                replace: $scope.txtReplace
            };
            chrome.tabs.getSelected(null, function(tab) {
                const url = tab.url;
                chrome.tabs.sendMessage(tab.id, txtRplObj, function(res) {
                    if (typeof res != 'undefined') {
                      ContentScriptFactory.textReplaceAction(url, res).then(function(isSaved) {
                        console.log(isSaved);
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
app.directive('rainbowTextDir', function($compile) {
  return {
    restrict: 'EA',
    replace: false,
    scope: true,
    link: function(scope, element) {
      let html = 'Chrome Web Themer';
      let chars = html.trim().split('');
      let template = '<span>' + chars.join('</span><span>') + '</span';
      const linkFn = $compile(template);
      const content = linkFn(scope);
      element.append(content);
    }
  };
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
