// All code that has to step outside of chrome app dom and go to current page dom
/* eslint-disable no-console */
console.log('hello from content script!');
const supportsShadowDOMV1 = !!HTMLElement.prototype.attachShadow;

const errorProxy = document.createElement('script');
errorProxy.id = 'myErrorProxyScriptID';
errorProxy.dataset.lastError = '';

/* Make the content as non-obtrusive as possible */
errorProxy.textContent = [
  '',
  '(function() {',
  `    var script = document.querySelector("script#${errorProxy.id}");`,
  '    window.addEventListener("error", function(evt) {',
  '        script.dataset.lastError = evt.error;',
  '    }, true);',
  '})();',
  ''
].join('\n');

/* Add the <script> element to the DOM */
document.documentElement.appendChild(errorProxy);

/* Create an observer for `errorProxy`'s attributes
 * (the `data-last-error` attribute is of interest) */
const errorObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    if ((mutation.type === 'attributes') &&
      (mutation.attributeName === 'data-last-error')) {
      console.log('Content script detected new error:\n',
        errorProxy.dataset.lastError);
    }
  });
});
errorObserver.observe(errorProxy, {
  attributes: true
});

const $ = e => document.querySelector(e);

const $$ = e => document.querySelectorAll(e);

const errPort = chrome.runtime.connect({
  name: "errChannel"
});


const cssPath = chrome.extension.getURL('styles/inject.css');
const injectCSS = document.createElement('link');
injectCSS.setAttribute('rel', 'stylesheet');
injectCSS.setAttribute('type', 'text/css');
injectCSS.setAttribute('href', cssPath);
$('head').appendChild(injectCSS);

const url = window.location.href;
const originalPageStyles = {
  cursor: $('body').style.cursor,
  pageSource: $('body').innerHTML
};

let EditElement = {};
let editedPageStyles = {};

const contextMenu = selector => ({
  //hardcode for now,
  selector,

  isBackground: true,

  init() {
    this.buildHTML();
    this.bindEventHandlers();
  },

  bindEventHandlers() {
    for (let i = 0; i < this.eventHandlers.length; i++) {
      this.bindEvent(this.eventHandlers[i]);
    }
  },

  bindEvent(e) {
    console.log(e);
    if (isNodeList(e.element)) {
      [].forEach.call(e.element, elem => {
        elem.addEventListener(e.event, e.handler, false)
      })
      console.log(`Bound ${e.event} handler for`, e.$el);
    } else {
      e.element.addEventListener(e.event, e.handler);
    }
  },

  shadowRoot: $('template').shadowRoot,

  buildHTML() {
    const popupMenuHTML = `<nav class="chrome-themer-popup-menu" id="edit-popup-menu " role="navigation">
      <ul class="nav__list">
          <li>
              <input id="group-1" type="checkbox" hidden
              />
              <label for="group-1"><span class="fa fa-angle-right"></span>				First level</label>
              <ul class="group-list">
                  <li>
                      <input type='text' class='chrome-web-themer-edit-text'
                      />
                      <label for='new-element-text'>New Text: </label>
                  </li>
          <li>
            <input class='chrome-web-themer-change-color jscolor' value />
          </li>
                  <li>
                      <input id="sub-group-1" type="checkbox" hidden
                      />
                      <label for="sub-group-1"><span class="fa fa-angle-right"></span>						Second level</label>
                      <ul class="sub-group-list">
                          <li><a href="#">2nd level nav item</a>
                          </li>
                          <li><a href="#">2nd level nav item</a>
                          </li>
                          <li><a href="#">2nd level nav item</a>
                          </li>
                          <li>
                              <input id="sub-sub-group-1" type="checkbox"
                              hidden />
                              <label for="sub-sub-group-1"><span class="fa fa-angle-right"></span>								Third level</label>
                              <ul class="sub-sub-group-list">
                                  <li><a href="#">3rd level nav item</a>
                                  </li>
                                  <li><a href="#">3rd level nav item</a>
                                  </li>
                                  <li><a href="#">3rd level nav item</a>
                                  </li>
                              </ul>
                          </li>
                      </ul>
                  </li>
              </ul>
      </ul>
  </nav>
  `;
    console.log($(selector));
    let shadow = $(selector).attachShadow({mode: 'open'});
    shadow.innerHTML = popupMenuHTML;
    $(selector).parentNode.append(o);
  },

  eventHandlers: [{
      name: 'changeText',
      icon: 'text',
      element: this.shadowRoot.querySelector('.chrome-web-themer-edit-text'),
      event: 'change',
      handler(e) {
        const newText = e.target.value;
        if (newText.length > 0) {
          $(EditElement.path).text(newText);
        }
      }
    },
    {
      name: 'changeColor',
      icon: 'color',
      element: this.shadowRoot.querySelector('.chrome-web-themer-change-color'),
      event: 'change',
      handler(e) {
        let _this = this;
        ColorPicker(this, hex => {
          if (_this.isBackground) {
            $(EditElement.path).style.backgroundColor = hex;
          } else {
            $(EditElement.path).style.color = hex;
          }
        });
      }
    }
  ]
});

const EditMode = {
  init() {
    this.bindEventHandlers();
  },
  bindEventHandlers() {
    for (let i = 0; i < this.eventHandlers.length; i++) {
      this.bindEvent(this.eventHandlers[i]);
    }
  },
  bindEvent(e) {
    console.log(e.$el);
    if (isNodeList(e.$el)) {
      [].forEach.call(e.$el, elem => {
        elem.addEventListener(e.event, e.handler, false)
      });
      console.log(`Bound ${e.event} handler for`, e.$el);
    } else {
      e.$el.addEventListener(e.event, e.handler);
    }
  },
  removeEventHandlers() {
    for (let i = 0; i < this.eventHandlers.length; i++) {
      this.removeEvent(this.eventHandlers[i]);
    }
  },
  removeEvent(e) {
    if(isNodeList(e.$el)) {
      [].forEach.call(e.$el, elem => {
        elem.removeEventListener(e.event, e.handler);
      });
    } else {
      e.$el.removeEventListener(e.event, e.handler);
    }
  },
  eventHandlers: [{
      $el: $('body'),
      event: 'mouseover',
      handler(e) {
        let elem = e.target;
        elem.className += ' chrome-web-themer-overlay';
        elem.className.trim().replace(/\s+/g, ' ');
      }
    },
    {
      $el: $('body'),
      event: 'mouseout',
      handler(e) {
        e.target.className = e.target.className.replace('chrome-web-themer-overlay', '');
      }
    },
    {
      $el: $$('body:not(.chrome-web-themer-overlay):not(.context-menu-root):not(.context-menu)'),
      event: 'click',
      handler: editClickHandler
    }
  ]
};

$('body').addEventListener('keyup', e => {
  if (e.keyCode === 27) {
    console.log('esc pressed');
    document.body.style.cursor = originalPageStyles.cursor;
    EditMode.removeEventHandlers();
  }
});

chrome.storage.sync.get(url, edits => {
  let e = edits[url];
  console.log(`edits for url${JSON.stringify(e)}`);
  if (e) {

    if (e['edits']) {
      // todo: map over edits array and apply style to dom
    }
    if (e['backgroundColor']) {
      $('body').style.backgroundColor = e['backgroundColor'].color
    }

    if (e['fontFamily']) {
      $('body').style.fontFamily = e['fontFamily'].font;
    }

    if (e['textReplaceEdits']) {
      for (let i = 0, textEditsLen = e['textReplaceEdits'].length; i < textEditsLen; i++) {
        console.log(e['textReplaceEdits'][i].originalText, e['textReplaceEdits'][i].replaceText);
        findAndReplaceText(e['textReplaceEdits'][i].originalText, e['textReplaceEdits'][i].replaceText);
      }
    }
  }
});

// map takes a function argument that will be executed to each item in 2nd argument array
// ex map(x => x * x, [1, 3, 4, 10]) returns [ 1, 9, 16, 100 ]
const map = (f, [x, ...xs]) => (
  (x === undefined && xs.length === 0) ? [] : [f(x), ...map(f, xs)]
);

function isNodeList(nodes) {
  const stringRepr = Object.prototype.toString.call(nodes);

  return typeof nodes === 'object' &&
    /^\[object (HTMLCollection|NodeList|Object)\]$/.test(stringRepr) &&
    (typeof nodes.length === 'number') &&
    (nodes.length === 0 || (typeof nodes[0] === "object" && nodes[0].nodeType > 0));
}

function findAndReplaceText(textToFind, textToReplace) {
  try {
    let textreplaceEdits = {
      originalText: textToFind,
      replaceText: textToReplace
    };

    // directly converting the found elements into an Array,
    // then iterating over that array with Array.prototype.forEach():
    // This will find all elements that have text nodes that equal the string value in textToFind, after removing leading and trailing whitespace
    const matchingElements = document.evaluate(`//*/text()[normalize-space(.)='${textToFind}']`, document, null, XPathResult.ANY_TYPE, null);
    let elem = matchingElements.iterateNext();
    if (elem) {
      elem.nodeValue = textToReplace;
    }

    return textreplaceEdits;

  } catch (e) {
    console.error(`text replace error ${e}`);
    errPort.postMessage(e);
  }
}

chrome.runtime.onMessage.addListener((req, sender, res) => {
  switch (req.command) {
    case "textReplace":
      try {
        const textEdits = findAndReplaceText(req.find, req.replace);
        if (textEdits.originalText != '' && textEdits.replaceText != '') {
          res(textEdits);
        }
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
    case "changePageFont":
      try {
        $('body').style.fontFamily = req.font;
        if ($('body').style.fontFamily === req.font) {
          chrome.runtime.sendMessage({
            saveEdit: {
              element: 'body',
              font: req.font
            }
          }, response => {
            console.log(response);
          });
        }
        res(true);
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
    case 'editEvent':
      //TODO: use async functions to return promise of clicked element, save edits
      // then resolve when user clicks submit or something
      try {
        makeCursor('gray');
        EditMode.init();
        if (EditElement != 'undefined' || null) {
          res(EditElement);
        }
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
    case 'changeColor':
      try {
        $('body').style.backgroundColor = req.color
        res({
          element: 'body',
          color: `${req.color}`
        });
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
    case 'Inverse Webpage':
      try {
        $('body').className += ' inverse-webpage';
        res(true);
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
  }
});

function editClickHandler(e) {
  if (e.default) {
    return false;
  }
  e.preventDefault();
  // todo: add code that will create a variable that is a valid editable element. add check for this editable element with editableElement.contains(e.target) and use conditional to handle element/err
  e = e || window.event;
  const target = e.target || e.srcElement;
  Object.assign(EditElement, target);
  const text = e.textContent || '';
  const selector = getDomPath(target);
  const currentCSS = window.getComputedStyle(target);
  const color = currentCSS.getPropertyValue('color');
  const backgroundColor = currentCSS.getPropertyValue('background-color');
  const height = currentCSS.getPropertyValue('height');
  const width = currentCSS.getPropertyValue('width');
  if (target instanceof Element && selector != 'undefined' || '') {
    const clickedElement = {
      'element': target.tagName.toUpperCase(),
      text,
      'id': target.id,
      'class': target.className,
      selector,
      color,
      backgroundColor,
      height,
      width,
      'originalCSS': currentCSS
    };
    let ctxtMenu = contextMenu(selector);
    ctxtMenu.init();
    return clickedElement;
  }
}

function getDomPath(el) {
  const names = [];
  while (el.parentNode){
    if (el.id){
      names.unshift(`#${el.id}`);
      break;
    }else{
      if (el == el.ownerDocument.documentElement) {
        names.unshift(el.tagName);
      }

      else {
        for (var c = 1 ,e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
        names.unshift(`${el.tagName}:nth-child(${c})`);
      }
      el = el.parentNode;
    }
  }
  return names.join(" > ");
}

// todo: need to set color variable to be a linear gradient that transitions the color pallete from background-y to default color i.e white
// on click, take the cursor color to be rainbow and each second drain the color to white until timer reaches 5

function makeCursor(color) {
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
