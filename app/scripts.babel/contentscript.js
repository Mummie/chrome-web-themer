/* eslint-disable no-console */

console.log('hello from content script!');
const supportsShadowDOMV1 = !!HTMLElement.prototype.attachShadow;
console.log('Supports SHadow DOM? ', supportsShadowDOMV1);
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

function injectScript(filepath) {
  const chromeFileURL = chrome.extension.getURL(filepath);
  const s = document.createElement('script');
  s.setAttribute('src', chromeFileURL);
  $('head').insertBefore(s, $('head').firstChild);
}
injectScript('scripts/custom-elements-es5-adapter.js')
injectScript('scripts/jscolor.min.js');

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

let EditElement = null;
let editedPageStyles = null;

chrome.storage.sync.get(url, edits => {
  try {
    let e = edits[url];
    console.log(`edits for url${JSON.stringify(e)}`);
    if (e) {
      editedPageStyles = e;
      if (e['edits']) {
        map(edit => {
          if (edit.newText) {
            $(edit.path).textContent = edit.newText;
          }

          if (edit.styles && edit.styles.length > 0) {
            edit.styles.forEach(obj => {
              Object.getOwnPropertyNames(obj).forEach((prop, index) => {
                if(edit.path) {
                  $(edit.path).style[prop] = obj[prop];
                }
                else {
                  $(edit.element).style[prop] = obj[prop];
                }
              });
            });
          }
        }, e['edits']);
      }
      // if (e['backgroundColor']) {
      //   $('body').style.backgroundColor = e['backgroundColor'].color
      // }

      if (e['fontFamily']) {
        $('body').style.fontFamily = e['fontFamily'].font;
      }

      if (e['textReplaceEdits']) {
        for (let i = 0, textEditsLen = e['textReplaceEdits'].length; i < textEditsLen; i++) {
          findAndReplaceText(e['textReplaceEdits'][i].originalText, e['textReplaceEdits'][i].replaceText);
        }
      }
    }
  }
  catch (e) {
    errPort.postMessage(e);
  }
});

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
            command: 'saveEdit',
            edit: {
              'fontFamily': req.font,
              'element': 'BODY'
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
        chrome.runtime.sendMessage({
          command: 'saveEdit',
          edit: {
            'backgroundColor': req.color,
            'element': 'BODY'
          }
        });
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
    case 'Inverse Webpage':
      try {
        if (req.inverse) {
          $('body').className += ' inverse-webpage';
        } else {
          $('body').className = $('body').className.replace('inverse-webpage', '');
        }
        res(true);
      } catch (e) {
        errPort.postMessage(e);
      }
      break;
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

//TODO: check if shadow dom context menu already exists on page, and on each click remove it so that theres only 1 shadow element
function editClickHandler(e) {
  if (e.default || EditElement == e.target) {
    return;
  }

  e.preventDefault();
  // todo: add code that will create a variable that is a valid editable element. add check for this editable element with editableElement.contains(e.target) and use conditional to handle element/err
  e = e || window.event;
  const target = e.target || e.srcElement;
  const text = target.textContent;
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
      target,
      'id': target.id,
      'class': target.className,
      selector,
      color,
      backgroundColor,
      height,
      width,
      'originalCSS': currentCSS
    };
    EditElement = target;
    target.className += ' context-menu';
    console.log(clickedElement);
    console.log(target);
    let ctxtMenu = contextMenu(clickedElement.selector);
    return clickedElement;
  }
}

function getDomPath(el) {
  const names = [];
  while (el.parentNode) {
    if (el.id) {
      names.unshift(`#${el.id}`);
      break;
    } else {
      if (el == el.ownerDocument.documentElement) {
        names.unshift(el.tagName);
      } else {
        for (var c = 1, e = el; e.previousElementSibling; e = e.previousElementSibling, c++);
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

  ctx.strokeStyle = color;

  ctx.lineWidth = 2;
  ctx.moveTo(2, 10);
  ctx.lineTo(2, 2);
  ctx.lineTo(10, 2);
  ctx.moveTo(2, 2);
  ctx.lineTo(30, 30);
  ctx.stroke();

  document.body.style.cursor = `url(${cursor.toDataURL()}), auto`;
}

class ContextMenu extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.initShadowDOM();
    this.addInputListener();
  }

  initShadowDOM() {
    let shadowRoot = this.attachShadow({
      mode: 'open'
    });
    shadowRoot.innerHTML = this.template;
  }

  addInputListener() {
    this.changeTextNode.addEventListener('input', e => {
      const newText = e.target.value;
      if (newText.length > 0) {
        $(EditElement.path).text(newText);
      }
    });

    this.changeColorNode.addEventListener('input', e => {
      let _this = this;
      ColorPicker(this, hex => {
        if (_this.isBackground) {
          $(EditElement.path).style.backgroundColor = hex;
        } else {
          $(EditElement.path).style.color = hex;
        }
      });
    });
  }

  get changeTextNode() {
    return this.shadowRoot.querySelector('.chrome-web-themer-edit-text');
  }

  get changeColorNode() {
    return this.shadowRoot.querySelector('.chrome-web-themer-change-color');
  }

  get template() {
    return `<nav class="chrome-themer-popup-menu" id="edit-popup-menu " role="navigation">
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
  }
}

const contextMenu = selector => {
  const shadowHost = $(selector).createShadowRoot();
  const template = document.createElement('template');
  template.innerHTML = `
  <style>
   .chrome-themer-popup-menu {
    z-index: 9999;
    position: fixed;
    width: 270px;
    background-color: black;
    top: 0;
    margin-left: 200px;
  }

  :host ul {
    list-style: none;
  }

  :host ul li {
    list-style: none;
    color: #FFF;
  }

  :host ul li label {
    cursor: pointer;
  }

  :host nav a,
  :host .nav label {
    display: block;
    padding: .85rem;
    cursor: pointer;
    color: #fff;
    background-color: #151515;
    box-shadow: inset 0 -1px #1d1d1d;
    -webkit-transition: all .25s ease-in;
    transition: all .25s ease-in;
  }

  :host .nav a:focus,
  :host .nav a:hover,
  :host .nav label:focus,
  :host .nav label:hover {
    color: rgba(255, 255, 255, 0.5);
    background: #030303;
  }

  :host .group-list a,
  :host .group-list label {
    padding-left: 2rem;
    background: #252525;
    box-shadow: inset 0 -1px #373737;
  }

  :host .group-list a:focus,
  :host .group-list a:hover,
  :host .group-list label:focus,
  :host .group-list label:hover {
    background: #131313;
  }

  :host .sub-group-list a,
  :host .sub-group-list label {
    padding-left: 4rem;
    background: #353535;
    box-shadow: inset 0 -1px #474747;
  }

  :host .sub-group-list a:focus,
  :host .sub-group-list a:hover,
  :host .sub-group-list label:focus,
  :host .sub-group-list label:hover {
    background: #232323;
    cursor: pointer;
  }

  :host .sub-sub-group-list a,
  :host .sub-sub-group-list label {
    padding-left: 6rem;
    background: #454545;
    box-shadow: inset 0 -1px #575757;
  }

  :host .sub-sub-group-list a:focus,
  :host .sub-sub-group-list a:hover,
  :host .sub-sub-group-list label:focus,
  :host .sub-sub-group-list label:hover {
    background: #333333;
  }

  :host .group-list,
  :host .sub-group-list,
  :host .sub-sub-group-list {
    height: 100%;
    max-height: 0;
    overflow: hidden;
    -webkit-transition: max-height .5s ease-in-out;
    transition: max-height .5s ease-in-out;
  }

  :host .nav__list input[type=checkbox]:checked + label + ul {
    /* reset the height when checkbox is checked */
    max-height: 1000px;
  }
  </style>
  <nav class="chrome-themer-popup-menu" id="edit-popup-menu " role="navigation">
  <ul class="nav__list">
    <li>
      <input id="group-1" type="checkbox" hidden />
      <label for="group-1"><span class="fa fa-angle-right"></span>Colors</label>
      <ul class="group-list">
        <li>
          <label>Change Color</label>
          <input class='chrome-web-themer-change-color jscolor {position: 'right'}' value="abs567" />
        </li>
        <li>
          <input id="sub-group-1" type="checkbox" hidden />
          <label for="sub-group-1"><span class="fa fa-angle-right"></span> Second level</label>
          <ul class="sub-group-list">
            <li><a href="#">2nd level nav item</a>
            </li>
            <li><a href="#">2nd level nav item</a>
            </li>
            <li><a href="#">2nd level nav item</a>
            </li>
            <li>
              <input id="sub-sub-group-1" type="checkbox" hidden />
              <label for="sub-sub-group-1"><span class="fa fa-angle-right"></span> Third level</label>
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
      <input id="group-2" type="checkbox" hidden />
      <label for="group-2"><span class="fa fa-angle-right"></span>Text</label>
      <ul class="group-list">
        <li>
          <input type='text' class='chrome-web-themer-edit-text' />
          <label for='chrome-web-themer-edit-text'>New Text: </label>
        </li>
      </ul>
  </ul>
</nav>
`;
  shadowHost.appendChild(template.content);
  shadowHost.querySelector('.chrome-web-themer-edit-text').addEventListener('keyup', e => {
    const newText = e.target.value;
    if (newText.length > 0) {
      $(selector).textContent = newText;
    }
  });

  shadowHost.querySelector('.chrome-web-themer-change-color').addEventListener('onFineChange', function(e) {
    console.log(e);
    console.log(e.target.value);
    $(selector).style.backgroundColor = '#' + e;
  });

  return shadowHost;
};


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
      e.$el.addEventListener(e.event, e.handler, false);
    }
  },
  removeEventHandlers() {
    for (let i = 0; i < this.eventHandlers.length; i++) {
      this.removeEvent(this.eventHandlers[i]);
    }
  },
  removeEvent(e) {
    if (isNodeList(e.$el)) {
      [].forEach.call(e.$el, elem => {
        elem.removeEventListener(e.event, e.handler);
      });
    } else {
      e.$el.removeEventListener(e.event, e.handler);
    }
  },
  eventHandlers: [{
      $el: $$('body'),
      event: 'hover',
      handler(e) {
        let elem = e.target;
        if (typeof prev !== 'undefined') {
          console.log('prev', prev);
          prev.className = prev.className.replace(/\bchrome-web-themer-overlay\b/, '');
          prev = undefined;
          return;
        }

        elem.className += 'chrome-web-themer-overlay';
        elem.className.trim().replace(/\s+/g, ' ');

      }
    },
    {
      $el: $('body'),
      event: 'keyup',
      handler(e) {
        if (e.keyCode === 27) {
          document.body.style.cursor = originalPageStyles.cursor;
          this.removeEventHandlers();
        }
      }
    },
    {
      $el: $('body'),
      event: 'mouseout',
      handler(e) {
        e.target.className = e.target.className.replace(/\bchrome-web-themer-overlay\b/, '');
      }
    },
    {
      $el: $$('body:not(.chrome-web-themer-overlay):not(.chrome-themer-popup-menu):not(.context-menu)'),
      event: 'click',
      handler: editClickHandler
    }
  ]
};
