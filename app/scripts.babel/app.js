// AngularJS controller and directive code

const app = angular.module('themerApp', ['ContentScriptFactory', 'ngCookies', 'colorpicker.module', 'ngLodash']);

var EditCtrl = function($scope, $cookies, ContentScriptFactory, lodash) {
  var _this = this;
  _this.toggleTextReplace = false;
  _this.toggleColorPicker = false;
  _this.showTab = 'Edit';
  _this.color = '#000';
  _this.edits = null;
  _this.showEdit = '';
  _this.ContentScriptFactory = ContentScriptFactory;
  _this.cookies = $cookies;
  _this.lodash = lodash;
  _this.filters = {};

  ContentScriptFactory.getCurrentURLEdits().then(function(edits) {
    if (!lodash.isEmpty(edits)) {
      _this.edits = lodash.assign({}, edits);
      console.log('Saved Edits ', _this.edits);
      if (_this.edits.backgroundColor && _this.edits.backgroundColor.color) {
        _this.color = _this.edits.backgroundColor.color;
      }
    }
  });

  $scope.triggerEditElementAction = function() {
    _this.triggerEditElementAction();
  };

  $scope.getAllEdits = _this.getAllEdits();

  $scope.changeBackgroundColor = function() {
    _this.changeBackgroundColor();
  };

  $scope.textReplace = function() {
    _this.textReplace();
  };
};

EditCtrl.prototype.triggerEditElementAction = function() {
  this.ContentScriptFactory.triggerEditAction()
    .then(function(editedElement) {
      console.log('edit', editedElement);
    });
};

EditCtrl.prototype.getAllEdits = function() {
  this.ContentScriptFactory.getAllEdits()
    .then(function(edits) {
      console.log('all edits', edits);
      return edits;
    });
};

EditCtrl.prototype.changeBackgroundColor = function() {
  var _this = this;
  const colorObj = {
    command: 'changeColor',
    color: this.color
  };
  chrome.tabs.getSelected(null, function(tab) {
    chrome.tabs.sendMessage(tab.id, colorObj, function(res) {
      if (res && res.color) {
      _this.ContentScriptFactory.saveBackgroundColorEdit(tab.url, res)
      .then(function(isSaved) {
          console.log(isSaved);
        });
      }
    });
  });
};

EditCtrl.prototype.textReplace = function() {
  if (this.txtReplace && this.txtReplace.length > 0) {
    var _this = this;
    this.cookies.putObject('find', this.txtFind);
    this.cookies.putObject('replace', this.txtReplace);
    const txtRplObj = {
      find: this.txtFind,
      replace: this.txtReplace
    };
    chrome.tabs.getSelected(null, function(tab) {
      const url = tab.url;
      chrome.tabs.sendMessage(tab.id, txtRplObj, function(res) {
        if (typeof res != 'undefined') {
          _this.ContentScriptFactory.textReplaceAction(url, res)
          .then(function(isSaved) {
            console.log(isSaved);
          });
        }
      });
    });
  }
};

EditCtrl.$inject = ['$scope', '$cookies', 'ContentScriptFactory', 'lodash'];

app.controller('EditController', EditCtrl);

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
