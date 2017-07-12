// All code that has to step outside of chrome app dom and go to current page dom
/* eslint-disable no-console */
console.log('hello from content script!');
const originalPageStyles = {
  originalHTML: document.body,
  cursor: document.body.style.cursor
};

const cssPath = chrome.extension.getURL('styles/inject.css');
const injectCSS = document.createElement('link');
injectCSS.setAttribute('rel', 'stylesheet');
injectCSS.setAttribute('type', 'text/css');
injectCSS.setAttribute('href', cssPath);

document.querySelector('head').append(injectCSS);

var app = angular.module('ChromeThemer', []);

var html = document.querySelector('html');
html.setAttribute('ng-csp', '');

var body = document.querySelector('body');
body.setAttribute('ng-controller', 'MainController');

app.controller('MainController', function($scope) {
  $scope.isEditMode = false;
  body.setAttribute('ng-model', $scope.isEditMode);

  if ($scope.isEditMode) {
    body.setAttribute('ng-keydown', 'onKeyUp()');
    body.setAttribute('ng-mouseover', 'showHoverStyle()');
    body.setAttribute('ng-mouseleave', 'removeHoverStyle()');
    body.setAttribute('ng-click', 'triggerEditAction()');
  }

  $scope.getDomPath = function(el) {
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
  };

  $scope.findAndReplaceText = function(textToFind, textToReplace) {

    let textreplaceEdits = {
      originalText: textToFind,
      replaceText: textToReplace
    };
    document.body.innerHTML = document.body.innerHTML.split(textToFind).join(textToReplace);

    return textreplaceEdits;
  };


  $scope.makeCursor = function(color) {
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
  };


  $scope.onKeyUp = function(e) {
    if (e.keyCode === 27) {
      console.log('esc pressed');
      $scope.isEditMode = false;
      //remove edit event handlers
    }
  };


  $scope.showHoverStyle = function(e) {
    if (typeof e.target != 'undefined') {
      console.log('hovering over', e.target);
      if (!e.target.classList.contains('chrome-web-themer-overlay')) {
        e.target.className += ' chrome-web-themer-overlay';
      }
    }
  };

  $scope.triggerEditAction = function(e) {
    if (e.default) {
      return;
    }
    e.stopImmediatePropagation();
    e.preventDefault();

    e = e || window.event;
    const target = e.target || e.srcElement;
    const text = target.textContent || text.innerText;
    const path = $scope.getDomPath(target);
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
  };

  $scope.removeHoverStyle = function(e) {
    e.target.className = e.target.className.replace(new RegExp('(/:^|\\s)' + 'chrome-web-themer-overlay' + '(?:\\s|$)'), '');
    document.body.style.cursor = originalPageStyles.cursor;
    angular.element('#chrome-edit-cursor').remove();
  };

  // check if there are any saved edits for the current URL
  chrome.storage.sync.get(window.location.href, function(edits) {
    if (Object.keys(edits).length >= 1) {
      // edits will be an array of css styles, changes to text and DOM elements
      let e = edits[window.location.href];
      if (e.backgroundColor) {
        document.body.style.backgroundColor = e.backgroundColor.color;
      }

      if (e.textReplaceEdits) {
        for (let i = 0, textEditsLen = e.textReplaceEdits.length; i < textEditsLen; i++) {
          $scope.findAndReplaceText(e.textReplaceEdits[i].originalText, e.textReplaceEdits[i].replaceText);
        }
      }
    }
  });

  chrome.extension.onMessage.addListener((req, sender, res) => {
    console.log(req);
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

});

app.directive('editPopupMenu', function($compile) {

  var template = `
    <div id='edit-popup-menu'>
      <button class='close' value='close'>close</button>
      <ul>
        <li>Edit Text</li>
        <li>Change Looks</li>
      </ul>
    </div>`;

  return {
    link: function(scope, element) {
      scope.$apply(function() {
        var content = $compile(template)(scope);
        element.append(content);
      });
    }
  };
});

app.directive('clickOff', function($parse, $document) {
  var dir = {
    compile: function($element, attr) {
      // Parse the expression to be executed
      // whenever someone clicks _off_ this element.
      var fn = $parse(attr["clickOff"]);
      return function(scope, element, attr) {
        // add a click handler to the element that
        // stops the event propagation.
        element.bind("click", function(event) {
          console.log("stopProp");
          event.stopPropagation();
        });
        angular.element($document[0].body).bind("click", function(event) {
          console.log("cancel.");
          scope.$apply(function() {
            fn(scope, {
              $event: event
            });
          });
        });
      };
    }
  };
});
angular.bootstrap(html, ['ChromeThemer'], []);
