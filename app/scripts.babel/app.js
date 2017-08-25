// AngularJS controller and directive code

const app = angular.module('themerApp', ['ContentScriptFactory', 'ngCookies', 'colorpicker.module', 'ngLodash', 'jdFontselect']);

class EditCtrl {
  constructor($scope, $cookies, ContentScriptFactory, lodash) {
    const _this = this;
    _this.toggleTextReplace = false;
    _this.toggleColorPicker = false;
    _this.toggleColorBlindFilter = false;
    _this.toggleNewEdit = false;
    _this.errorMessage = null;
    _this.showTab = 'Edit';
    _this.color = '#000';
    _this.edits = null;
    _this.showEdits = false;
    _this.showEdit = '';
    _this.ContentScriptFactory = ContentScriptFactory;
    _this.cookies = $cookies;
    _this.lodash = lodash;
    _this.filters = {};
    _this.isWebpageInversed = false;
    _this.colorBlindFilter;
    _this.selectedGlobalPageFont;

    chrome.runtime.onConnect.addListener(function(port) {

      port.onMessage.addListener(function(err) {
        console.log('error passed to background ' + err);
        Object.assign(_this.errorMessage, err);
      });
    });

    ContentScriptFactory.getCurrentURLEdits().then(edits => {
      if (!lodash.isEmpty(edits)) {
        _this.edits = lodash.assign({}, edits);
        console.log(_this.edits);
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

    $scope.fontChange = (font) => {
      _this.fontChange(font);
    };

    $scope.inverseWebpage = () => {
      _this.inverseWebpage();
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
      color: _this.color
    };
    chrome.tabs.getSelected(null, tab => {
      chrome.tabs.sendMessage(tab.id, colorObj);
    });
  }

  textReplace() {
    if (this.txtReplace && this.txtReplace.length > 0) {
      const _this = this;
      this.cookies.putObject('find', this.txtFind);
      this.cookies.putObject('replace', this.txtReplace);
      const txtRplObj = {
        find: this.txtFind,
        replace: this.txtReplace,
        command: 'textReplace'
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

  fontChange() {
    const _this = this;
    console.log(_this.selectedGlobalPageFont);
    chrome.tabs.getSelected(null, tab => {
      const url = tab.url;
      chrome.tabs.sendMessage(tab.id, { command: 'changePageFont', font: _this.selectedGlobalPageFont }, res => {
        if (res && typeof res != 'undefined') {
          _this.ContentScriptFactory.saveEditToURL(url, { 'fontFamily': _this.selectedGlobalPageFont });
        }
      });
    });
  }

  inverseWebpage() {
    const _this = this;
    _this.isWebpageInversed = !_this.isWebpageInversed;
    chrome.tabs.getSelected(null, tab => {
      chrome.tabs.sendMessage(tab.id, { command: 'Inverse Webpage', inverse: _this.isWebpageInversed }, res => {
        if(res) {
          console.log(res);
        }
      });
    });
  }
}

EditCtrl.$inject = ['$scope', '$cookies', 'ContentScriptFactory', 'lodash'];

app.controller('EditController', EditCtrl);

app.directive('fdFontDropdown', function() {
  return {
    restrict: 'A',
    controller: 'EditController',
    link: function(scope, element, attr, Ctrl) {
      Ctrl.loadFonts();
      scope.fontslist = Ctrl.FONTSLIST;
      scope.selectedIdx = Math.floor(Math.random() * scope.fontslist.length);
      scope.changeFont = function(idx) {
        scope.selectedIdx = idx;
        return console.log(idx);
      };
      return element.bind('click', function() {
        return element.toggleClass("active");
      });
    }
  };
});

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

app.directive('toggleInverse', () => ({
  restrict: 'A',
  scope: true,
  link(scope, element) {
    element.on('click', () => {
      console.log(scope.isWebpageInversed);
      scope.isWebpageInversed = !scope.isWebpageInversed;
      scope.inverseWebpage(scope.isWebpageInversed);
    });
  }
}))


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
