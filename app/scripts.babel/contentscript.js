/* eslint-disable no-console */

console.log('hello from content script!');
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

// map takes a function argument that will be executed to each item in 2nd argument array
// ex map(x => x * x, [1, 3, 4, 10]) returns [ 1, 9, 16, 100 ]
const map = (f, [x, ...xs]) => (
  (x === undefined && xs.length === 0) ? [] : [f(x), ...map(f, xs)]
);

function injectScript(filepath) {
  const chromeFileURL = chrome.extension.getURL(filepath);
  const s = document.createElement('script');
  s.setAttribute('src', chromeFileURL);
  $('head').insertBefore(s, $('head').firstChild);
}

injectScript('scripts/jscolor.min.js');
injectScript('scripts/custom-elements-es5-adapter.js');

function injectCSS(filepath) {
  const cssPath = chrome.extension.getURL(filepath);
  const injectCSS = document.createElement('link');
  injectCSS.setAttribute('rel', 'stylesheet');
  injectCSS.setAttribute('type', 'text/css');
  injectCSS.setAttribute('href', cssPath);
  $('head').appendChild(injectCSS);
}

injectCSS('styles/inject.css');
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
          console.log(edit);
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
        EditMode.init();
        $('body').addEventListener('keyup', e => {
          if (e.keyCode === 27) {
            document.body.style.cursor = originalPageStyles.cursor;
            EditMode.removeEventHandlers();
          }
        });

        $('body:not(.chrome-web-themer-overlay):not(.chrome-themer-popup-menu):not(.context-menu)').addEventListener('contextmenu', function(e) {
          e.preventDefault();
          const clickedElement = editClickHandler(e);
          if (clickedElement != 'undefined' || null) {
            res(clickedElement);
            return false;
          }

          return true;
        });
        return true;
      } catch (e) {
        console.error(e);
      }
      break;
    case 'changeColor':
      try {
        $(req.element).style.backgroundColor = req.color
        chrome.runtime.sendMessage({
          command: 'saveEdit',
          edit: {
            'backgroundColor': req.color,
            'element': req.element
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
  e.stopPropagation();
  if (e.default || EditElement == e.target) {
    return;
  }
  console.log($('.context-menu'));
  if($('.chrome-themer-popup-menu'))  {
    $('.chrome-themer-popup-menu').remove();
  }
  // todo: determine the kind of edit events that can be bound to clicked element
  // i.e cannot use contextMenu's changeText handler on an element that doesn't contain text
  // need to have contextMenu init have the ability to say which events should be called for element
  e = e || window.event;
  const target = e.target || e.srcElement;
  const text = target.textContent;
  const selector = getDomPath(target);
  const currentCSS = window.getComputedStyle(target);
  const color = currentCSS.getPropertyValue('color');
  const backgroundColor = currentCSS.getPropertyValue('background-color');
  const height = parseInt(currentCSS.getPropertyValue('height'), 10); // using parseInt to get rid of 'px' at the end
  const width = parseInt(currentCSS.getPropertyValue('width'), 10);
  const fontFamily = target.style.fontFamily;
  const fontSize = currentCSS.getPropertyValue('font-size');
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
      fontFamily,
      fontSize
    };

    EditElement = clickedElement;
    target.className += ' context-menu';
    console.log(clickedElement);
    console.log(color, width);
    let ctxtMenu = contextMenu(clickedElement);
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

function makeCursor() {
  const cursor = document.createElement('canvas');
  cursor.id = 'chrome-edit-cursor';
  const ctx = cursor.getContext('2d');
  cursor.width = 16;
  cursor.height = 16;

  ctx.lineWidth = 2;
  ctx.moveTo(2, 10);
  ctx.lineTo(2, 2);
  ctx.lineTo(10, 2);
  ctx.moveTo(2, 2);
  ctx.lineTo(30, 30);

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      ctx.strokeStyle = `rgb(0,${Math.floor(255 - 42.5 * i)},${Math.floor(255 - 42.5 * j)})`;
      ctx.stroke();
      document.body.style.cursor = `url(${cursor.toDataURL()}), auto`;
    }
}

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

const contextMenu = hostElement => {
  const shadowHost = $(hostElement.selector).createShadowRoot();
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

   ul {
    list-style: none;
  }

   ul li {
    list-style: none;
    color: #FFF;
  }

   ul li label {
     display: block;
    cursor: pointer;
  }

  input[type="checkbox"] {
    width: 60px;
    height: 60px;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

   nav a,
   .nav label {
    padding: .85rem;
    color: #fff;
    background-color: #151515;
    box-shadow: inset 0 -1px #1d1d1d;
    -webkit-transition: all .25s ease-in;
    transition: all .25s ease-in;
  }

   .nav a:focus,
   .nav a:hover,
   .nav label:focus,
   .nav label:hover {
    color: rgba(255, 255, 255, 0.5);
    background: #030303;
  }

   .group-list a,
   .group-list label {
    padding-left: 2rem;
    background: #252525;
    box-shadow: inset 0 -1px #373737;
  }

   .group-list a:focus,
   .group-list a:hover,
   .group-list label:focus,
   .group-list label:hover {
    background: #131313;
  }

   .sub-group-list a,
   .sub-group-list label {
    padding-left: 4rem;
    background: #353535;
    box-shadow: inset 0 -1px #474747;
  }

   .sub-group-list a:focus,
   .sub-group-list a:hover,
   .sub-group-list label:focus,
   .sub-group-list label:hover {
    background: #232323;
    cursor: pointer;
  }

   .sub-sub-group-list a,
   .sub-sub-group-list label {
    padding-left: 6rem;
    background: #454545;
    box-shadow: inset 0 -1px #575757;
  }

   .sub-sub-group-list a:focus,
   .sub-sub-group-list a:hover,
   .sub-sub-group-list label:focus,
   .sub-sub-group-list label:hover {
    background: #333333;
  }

   .group-list,
   .sub-group-list,
   .sub-sub-group-list {
    height: 100%;
    max-height: 0;
    overflow: hidden;
    -webkit-transition: max-height .5s ease-in-out;
    transition: max-height .5s ease-in-out;
  }

   .nav__list input[type=checkbox]:checked + label + ul {
    /* reset the height when checkbox is checked */
    max-height: 1000px;
  }
  </style>
  <nav class="chrome-themer-popup-menu" id="edit-popup-menu " role="navigation">
  <ul class="nav__list">
    <li>
      <input id="group-1" name="group-1" type="checkbox" hidden />
      <label for="group-1"><span class="fa fa-angle-right"></span>Colors</label>
      <ul class="group-list">
        <li>
          <label for="changeColor">Change Color</label>
          <input name="changeColor" class='chrome-web-themer-change-color jscolor {position: 'right'}' value="abs567" />
        </li>
        <li>
          <input name="sub-group-1" id="sub-group-1" type="checkbox" hidden />
          <label for="sub-group-1"><span class="fa fa-angle-right"></span> Second level</label>
          <ul class="sub-group-list">
            <li><a href="#">2nd level nav item</a>
            </li>
            <li><a href="#">2nd level nav item</a>
            </li>
            <li><a href="#">2nd level nav item</a>
            </li>
          </ul>
        </li>
      </ul>
      <input name="group-2" id="group-2" type="checkbox" hidden />
      <label for="group-2"><span class="fa fa-angle-right"></span>Text</label>
      <ul class="group-list">
        <li>
          <input type='text' class='chrome-web-themer-edit-text' value="${hostElement.text}" />
          <label for='chrome-web-themer-edit-text'>New Text: </label>
        </li>
      </ul>
      <input name="group-3" id="group-3" type="checkbox" hidden />
      <label for="group-3"><span class="fa fa-angle-right"></span>Size</label>
      <ul class="group-list">
        <li>
          <input type='number' name="chrome-web-themer-change-width" class='chrome-web-themer-change-width' value="${hostElement.width}" />
          <label for='chrome-web-themer-change-width'>Change Width</label>
        </li>
        <li>
          <input type='number' class='chrome-web-themer-change-height' value="${hostElement.height}" />
          <label for='chrome-web-themer-change-height'>Change Height</label>
        </li>
      </ul>
  </ul>
</nav>
`;
  console.log(shadowHost);
  shadowHost.appendChild(template.content);

  shadowHost.querySelector('.chrome-web-themer-change-color').addEventListener('change', e => {
    console.log(e);
    console.log(e.target.value);
    $(hostElement.selector).style.backgroundColor = `#${e}`;
    if($(hostElement.selector).style.backgroundColor === `#${e}`) {
      EditElement.backgroundColor = `#${e}`;
    }
    return false;
  });

  shadowHost.querySelector('.chrome-web-themer-edit-text').addEventListener('change', e => {
    const newText = e.target.value;
    if (newText.length > 0) {
      $(hostElement.selector).textContent = newText;
      if($(hostElement.selector).textContent === newText) {
        EditElement.textContent = newText;
      }
    }
    return false;
  });

  shadowHost.querySelector('.chrome-web-themer-change-width').addEventListener('change', e => {
    const newWidth = e.target.value;
    $(hostElement.selector).style.width = newWidth;
    console.log(newWidth);
    console.log($(hostElement.selector).style.width);
    if($(hostElement.selector).style.width === newWidth) {
      EditElement.width = newWidth;
    }
    return false;
  });

  shadowHost.querySelector('.chrome-web-themer-change-height').addEventListener('change', e => {
    const newHeight = e.target.value;
    $(hostElement.selector).style.height = newHeight;
    if($(hostElement.selector).style.height === newHeight) {
      EditElement.height = newHeight;
    }
    return false;
  });


  return shadowHost;
};


const EditMode = {

  edit: this,
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
        console.log(`node list removing ${e.event} ${e.handler}`);
        elem.removeEventListener(e.event, e.handler);
      });
    } else {
      console.log(`removing ${e.event} ${e.handler}`);
      e.$el.removeEventListener(e.event, e.handler);
    }
  },
  eventHandlers: [{
      $el: $('body:not(.context-menu)'),
      event: 'mouseover',
      handler(e) {
        let elem = e.target;
        const re = new RegExp("(^|\\s)" + 'chrome-web-themer-overlay' + "(\\s|$)", "g");
        if (re.test(elem.className)) return
        elem.className = (`${elem.className} chrome-web-themer-overlay`).replace(/\s+/g, " ").replace(/(^ | $)/g, "")

      }
    },
    {
      $el: $('body:not(.context-menu)'),
      event: 'mouseout',
      handler(e) {
        const re = new RegExp("(^|\\s)" + 'chrome-web-themer-overlay' + "(\\s|$)", "g");
        if(e.target.className) {
          e.target.className = e.target.className.replace(re, "$1").replace(/\s+/g, " ").replace(/(^ | $)/g, "");
        }
      }
    }
  ]
};
