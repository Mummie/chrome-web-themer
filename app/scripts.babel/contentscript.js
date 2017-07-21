// All code that has to step outside of chrome app dom and go to current page dom
/* eslint-disable no-console */
console.log('hello from content script!');
const originalPageStyles = {
  originalHTML: document.body,
  cursor: document.body.style.cursor
};

function walk(elm) {
    let node;

    let styles = [];
    const style = window.getComputedStyle(elm);
    styles.push(style);
    console.log(styles);
    // Handle child elements
    for (node = elm.firstChild; node; node = node.nextSibling) {
        if (node.nodeType === 1) { // 1 == Element
            walk(node);
        }
    }
}

const cssPath = chrome.extension.getURL('styles/inject.css');
const injectCSS = document.createElement('link');
injectCSS.setAttribute('rel', 'stylesheet');
injectCSS.setAttribute('type', 'text/css');
injectCSS.setAttribute('href', cssPath);

document.querySelector('head').append(injectCSS);

const app = angular.module('ChromeThemer', []);

const html = document.querySelector('html');
html.setAttribute('ng-csp', '');

const body = document.querySelector('body');
body.setAttribute('ng-controller', 'MainController');
class ContentScriptCtrl {
  constructor($scope) {
    const _this = this;
    _this.isEditMode = false;

    body.setAttribute('ng-model', _this.isEditMode);

    if (_this.isEditMode) {
      body.setAttribute('ng-keydown', 'onKeyUp()');
      body.setAttribute('ng-mouseover', 'showHoverStyle()');
      body.setAttribute('ng-mouseleave', 'removeHoverStyle()');
      body.setAttribute('ng-click', 'triggerEditAction()');
    }

    $scope.getDomPath = el => {
      _this.getDomPath(el);
    };

    $scope.findAndReplaceText = (textToFind, textToReplace) => {
      _this.findAndReplaceText(textToFind, textToReplace);
    };

    $scope.makeCursor = color => {
      _this.makeCursor(color);
    };

    $scope.walk = el => {
      _this.walk(el);
    };

    $scope.onKeyUp = e => {
      _this.onKeyUp(e);
    };

    $scope.showHoverStyle = e => {
      _this.showHoverStyle(e);
    };

    $scope.triggerEditAction = e => {
      _this.triggerEditAction(e);
    };

    $scope.removeHoverStyle = e => {
      _this.removeHoverStyle(e);
    };

    // check if there are any saved edits for the current URL
    // edits will be an array of css styles, changes to text and DOM elements
    chrome.storage.sync.get(window.location.href, function(edits) {
      if (Object.keys(edits).length >= 1) {
        let e = edits[window.location.href];
        if (e.backgroundColor) {
          document.body.style.backgroundColor = e.backgroundColor.color;
        }

        // if there are saved text edits, loop through them and call replace func
        if (e.textReplaceEdits) {
          for (let i = 0, textEditsLen = e.textReplaceEdits.length; i < textEditsLen; i++) {
            $scope.findAndReplaceText(e.textReplaceEdits[i].originalText, e.textReplaceEdits[i].replaceText);
          }
        }
      }
    });

    chrome.extension.onMessage.addListener((req, sender, res) => {
      if (req.find && req.replace) {
        const textEdits = $scope.findAndReplaceText(req.find, req.replace);
        if (textEdits.originalText != '' && textEdits.replaceText != '') {
          res(textEdits);
        }
      }

      if (req.command === 'editEvent') {
        $scope.isEditMode = true;
        $scope.makeCursor('gray');
      }

      if (req.command === 'changeColor' && req.color) {
        document.body.style.backgroundColor = req.color;
        res({
          element: 'body',
          color: `${req.color}`
        });
      }
    });

  }

  getDomPath(el) {
    const stack = [];
    while (el.parentNode != null) {
      let sibCount = 0;
      let sibIndex = 0;

      for (const sib of el.parentNode.childNodes) {
        if (sib.nodeName == el.nodeName) {
          if (sib === el) {
            sibIndex = sibCount;
          }
          sibCount++;
        }
      }

      if (el.hasAttribute('id') && el.id != '') {
        stack.unshift(`${el.nodeName.toLowerCase()}#${el.id}`);
      } else if (sibCount > 1) {
        stack.unshift(`${el.nodeName.toLowerCase()}:eq(${sibIndex})`);
      } else {
        stack.unshift(el.nodeName.toLowerCase());
      }
      el = el.parentNode;
    }

    return stack.slice(1).join(' > '); // removes the html element
  }

  findAndReplaceText(textToFind, textToReplace) {
    let textreplaceEdits = {
      originalText: textToFind,
      replaceText: textToReplace
    };
    document.body.innerHTML =
    document.body.innerHTML.split(textToFind).join(textToReplace);

    return textreplaceEdits;
  }

  makeCursor(color) {
    const cursor = document.createElement('canvas');
    cursor.id = 'chrome-edit-cursor';
    const ctx = cursor.getContext('2d');

    cursor.width = 16;
    cursor.height = 16;

    ctx.fillStyle = color;

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.moveTo(2, 12);
    ctx.lineTo(2, 2);
    ctx.lineTo(12, 2);
    ctx.moveTo(2, 2);
    ctx.lineTo(30, 30);
    ctx.stroke();

    document.body.style.cursor = `url(${cursor.toDataURL()}), auto`;
  }

  onKeyUp(e) {
    if (e.keyCode === 27) {
      this.isEditMode = false;
    }
  }

  showHoverStyle(e) {
    if (typeof e.target != 'undefined') {
      console.log('hovering over', e.target);
      if (!e.target.classList.contains('chrome-web-themer-overlay')) {
        e.target.className += ' chrome-web-themer-overlay';
      }
    }
  }

  triggerEditAction(e) {
    if (e.default) {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();

    e = e || window.event;
    const target = e.target || e.srcElement;
    const text = target.textContent || text.innerText;
    const path = this.getDomPath(target);
    const currentCSS = window.getComputedStyle(target);
    console.log(`DOM Path ${path}`);
    if (target instanceof Element && path != 'undefined' || '') {
      const clickedElement = {
        'element': target.tagName.toUpperCase(),
        text,
        'id': target.id,
        'class': target.className,
        path,
        'originalCSS': currentCSS
      };
      console.log(clickedElement);
      return clickedElement;
    }
  }

  removeHoverStyle(e) {
    e.target.className = e.target.className.replace(
      new RegExp('(/:^|\\s)' + 'chrome-web-themer-overlay' + '(?:\\s|$)'), ''
    );
    document.body.style.cursor = originalPageStyles.cursor;
    angular.element('#chrome-edit-cursor').remove();
  }
}

ContentScriptCtrl.$inject = ['$scope'];
app.controller('MainController', ContentScriptCtrl);

app.directive('editPopupMenu', $compile => {

  const template = `
    <div id='edit-popup-menu'>
      <button class='close' value='close'>close</button>
      <ul>
        <li>Edit Text</li>
        <li>Change Looks</li>
      </ul>
    </div>`;

  return {
    link(scope, element) {
      scope.$apply(() => {
        const content = $compile(template)(scope);
        element.append(content);
      });
    }
  };
});
angular.bootstrap(html, ['ChromeThemer'], []);
