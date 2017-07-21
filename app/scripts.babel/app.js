// AngularJS controller and directive code

const app = angular.module('themerApp', ['ContentScriptFactory', 'ngCookies', 'colorpicker.module', 'ngLodash']);

class EditCtrl {
  constructor($scope, $cookies, ContentScriptFactory, lodash) {
    const _this = this;
    _this.toggleTextReplace = false;
    _this.toggleColorPicker = false;
    _this.toggleColorBlindFilter = false;
    _this.showTab = 'Edit';
    _this.color = '#000';
    _this.edits = null;
    _this.showEdit = '';
    _this.ContentScriptFactory = ContentScriptFactory;
    _this.cookies = $cookies;
    _this.lodash = lodash;
    _this.filters = {};
    _this.colorBlindFilter;

    ContentScriptFactory.getCurrentURLEdits().then(edits => {
      if (!lodash.isEmpty(edits)) {
        _this.edits = lodash.assign({}, edits);
        if (_this.edits.backgroundColor && _this.edits.backgroundColor.color) {
          _this.color = _this.edits.backgroundColor.color;
        }
      }
    });

    $scope.triggerEditElementAction = () => {
      _this.triggerEditElementAction();
    };

    $scope.getAllEdits = _this.getAllEdits();

    $scope.changeBackgroundColor = () => {
      _this.changeBackgroundColor();
    };

    $scope.textReplace = () => {
      _this.textReplace();
    };
  }

  triggerEditElementAction() {
    this.ContentScriptFactory.triggerEditAction()
      .then(editedElement => {
        console.log('edit', editedElement);
      });
  }

  getAllEdits() {
    this.ContentScriptFactory.getAllEdits()
      .then(edits => {
        console.log('all edits', edits);
        return edits;
      });
  }

  changeBackgroundColor() {
    const _this = this;
    const colorObj = {
      command: 'changeColor',
      color: this.color
    };
    chrome.tabs.getSelected(null, tab => {
      chrome.tabs.sendMessage(tab.id, colorObj, res => {
        if (res && res.color) {
        _this.ContentScriptFactory.saveBackgroundColorEdit(tab.url, res)
        .then(isSaved => {
            console.log(isSaved);
          });
        }
      });
    });
  }

  textReplace() {
    if (this.txtReplace && this.txtReplace.length > 0) {
      const _this = this;
      this.cookies.putObject('find', this.txtFind);
      this.cookies.putObject('replace', this.txtReplace);
      const txtRplObj = {
        find: this.txtFind,
        replace: this.txtReplace
      };
      chrome.tabs.getSelected(null, tab => {
        const url = tab.url;
        chrome.tabs.sendMessage(tab.id, txtRplObj, res => {
          if (typeof res != 'undefined') {
            _this.ContentScriptFactory.textReplaceAction(url, res)
            .then(isSaved => {
              console.log(isSaved);
            });
          }
        });
      });
    }
  }
}

EditCtrl.$inject = ['$scope', '$cookies', 'ContentScriptFactory', 'lodash'];

app.controller('EditController', EditCtrl);

app.directive('rainbowTextDir', $compile => ({
  restrict: 'EA',
  replace: false,
  scope: true,

  link(scope, element) {
    let html = 'Chrome Web Themer';
    let chars = html.trim().split('');
    let template = `<span>${chars.join('</span><span>')}</span`;
    const linkFn = $compile(template);
    const content = linkFn(scope);
    element.append(content);
  }
}));


app.directive('sel', () => ({
  template: `
  <select
    ng-model="colorBlindFilter"
    ng-change="applyColorBlindFilter(colorBlindFilter)"
    ng-options="f.mode for f in filters.colorblind">
  </select>`,
  restrict: 'E',

  scope: {
    colorBlindFilter: '=',
    applyColorBlindFilter: '&'
  },

  link(scope) {
    scope.filters.colorblind = [{
      mode: 'Protonopia',
      selected: false
    }, {
      mode: 'Deuteranopia',
      selected: false
    }];

    scope.selectedValue = scope.filters.colorblind[1];
  }
}));
