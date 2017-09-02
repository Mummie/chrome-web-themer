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

const url = window.location.href;

const $ = e => document.querySelector(e);

const $$ = e => document.querySelectorAll(e);

const errPort = chrome.runtime.connect({
  name: "errChannel"
});

let editObserver = new MutationObserver(mutations => {
  mutations.forEach(mutation => {
    const previousElement = {
      mutation,
      element: mutation.target,
      text: mutation.target.textContent,
      color: mutation.target.style.color,
      backgroundColor: mutation.target.style.backgroundColor,
      oldValue: mutation.oldValue
    };
    console.log('DOM change detected: ', previousElement);
  });
});

// editedPageStyles contains an array of the edits a user has currently made before saving to chrome storage
let editedPageStyles = new WeakMap();
let EditElement = {};

function runObserverWhenContextMenuInjected() {
  const contextMenuDOM = $('.context-menu');
  if (!contextMenuDOM) {
    window.setTimeout(runObserverWhenContextMenuInjected, 500);
    return;
  }
  const editObserverConfig = {
    attributes: true,
    childList: true,
    subtree: true,
    characterData: true
  };
  editObserver.observe(contextMenuDOM, editObserverConfig);
  let EditElementProxy = new Proxy(EditElement, handler);

}

runObserverWhenContextMenuInjected();

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

function injectCSS(filepath) {
  const cssPath = chrome.extension.getURL(filepath);
  const injectCSS = document.createElement('link');
  injectCSS.setAttribute('rel', 'stylesheet');
  injectCSS.setAttribute('type', 'text/css');
  injectCSS.setAttribute('href', cssPath);
  $('head').appendChild(injectCSS);
}

injectCSS('styles/inject.css');

const originalPageStyles = {
  cursor: $('body').style.cursor,
  pageSource: $('body').innerHTML
};

const handler = {
  set(target, key, value) {
    console.log(`Setting value ${key} as ${value}`)
    chrome.runtime.sendMessage({
      command: 'clickedEdit',
      edit: target
    });
    target[key] = value;
    //TODO send Message to app.js that will show edit element on edit element app view
  },
};


// getContextMenuHTML will retrieve the html of the contextmenu and assign nodevalues based on the keys pf element
function getContextMenuHTML(element) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      command: 'getContextMenuHTML',
      element
    }, res => {
      resolve(res);
    });
  });
}


chrome.storage.sync.get(url, edits => {
  try {
    let e = edits[url];
    if (e && e['edits']) {
      map(edit => {
        console.log(edit);
        if ($(edit.path) === null) {
          throw ('Invalid Element', edit);
        }
        if (edit.newText && 'textContent' in $(edit.path)) {
          $(edit.path).textContent = edit.newText;
        }

        if (edit.styles && edit.styles.length > 0) {
          edit.styles.forEach(obj => {
            Object.getOwnPropertyNames(obj).forEach((prop, index) => {
              //if the edit is tied to a specific element, it should have a path to the element
              // if not, the edit is applied to multiple elements ex all a tags
              if (edit.path) {

                if (edit.path === '*') {
                  map(elem => {
                    elem.style[prop] = obj[prop]
                  }, $$(edit.element));
                } else {
                  $(edit.path).style[prop] = obj[prop];
                }
              } else {
                $(edit.element).style[prop] = obj[prop];
              }
            });
          });
        }
      }, e['edits']);


      if (e['fontFamily']) {
        $('body').style.fontFamily = e['fontFamily'].font;
      }

      if (e['textReplaceEdits']) {
        for (let i = 0, textEditsLen = e['textReplaceEdits'].length; i < textEditsLen; i++) {
          findAndReplaceText(e['textReplaceEdits'][i].originalText, e['textReplaceEdits'][i].replaceText);
        }
      }
    }
  } catch (e) {
    console.error(e);
    port.postMessage(e);
  }
});

// Messages coming from the app will be sent to this listener and call functions
// depending on what the user has triggered. Text replacements, font changes, clicking Add Edit etc
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

      try {
        EditMode.init();
        $('body').addEventListener('keyup', e => {
          if (e.keyCode === 27) {
            document.body.style.cursor = originalPageStyles.cursor;
            EditMode.removeEventHandlers();
          }
        });

        let checkEditClick = setInterval(() => {
          if (EditElement && Object.keys(EditElement).length > 1) {
            console.log('Received Edit ',EditElement);
            res(EditElement);
            clearInterval(checkEditClick);
          } else {
            console.log('Edit Element hasnt been initialized yet');
          }
        }, 3000);

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
// editClickHandler will build the edit object from the clicked elements' styles, dom path and assign the newly defined object to global EditElement
// will also inject HTML of context menu and append to the clicked element
function editClickHandler(e) {
  e.preventDefault();

  e = e || window.event;
  let clickedElement = {};
  let editmode = new editMode();

  if (e.target instanceof Element && getDomPath(e.target) != 'undefined' || '') {

    clickedElement.target = e.target || e.srcElement;
    clickedElement.text = e.target.textContent;
    clickedElement.path = getDomPath(e.target);
    clickedElement.currentCSS = window.getComputedStyle(e.target);
    clickedElement.color = clickedElement.currentCSS.getPropertyValue('color');
    clickedElement.backgroundColor = clickedElement.currentCSS.getPropertyValue('background-color');
    clickedElement.height = parseInt(clickedElement.currentCSS.getPropertyValue('height'), 10); // using parseInt to get rid of 'px' at the end
    clickedElement.width = parseInt(clickedElement.currentCSS.getPropertyValue('width'), 10);
    clickedElement.fontFamily = e.target.style.fontFamily;
    clickedElement.fontSize = clickedElement.currentCSS.getPropertyValue('font-size');

    EditElement = clickedElement;
    e.target.className += ' context-menu';
    editmode.sendMessage(clickedElement);
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

/*
 * Publish/Subscribe Pattern
 */
class PubSub {
  constructor() {
    this.handlers = [];
  }

  subscribe(event, handler, context) {
    if (typeof context === 'undefined') {
      context = handler;
    }
    this.handlers.push({
      event,
      handler: handler.bind(context)
    });
  }

  publish(event, args) {
    this.handlers.forEach(topic => {
      if (topic.event === event) {
        topic.handler(args)
      }
    });
  }
}

//TODO: use subscribe class to send messages on element changes to subscriber which will be sent to background
class editMode {
  constructor() {
    this.pubsub = new PubSub();
    this.pubsub.subscribe('message', this.emitMessage, this);
  }

  emitMessage(msg) {
    console.group('PubSub');
    console.log('user sent message!', msg);
    console.groupEnd();
  }

  sendMessage(msg) {
    this.pubsub.publish('message', msg);
  }
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
//TODO: build HTML context menu based on the props of hostElement
//for any change made through the context menu, the event listener will need to build the edit object and append to an array for all applied
// styles and edits
const contextMenu = hostElement => {
  const shadowHost = $(hostElement.path).createShadowRoot();
  const template = document.createElement('template');
  template.className = 'context-menu';

  // sends message to background script that responds with the html content of the context menu
  //TODO use async await for getContextMenu to avoid throwing everything in the callback
  getContextMenuHTML(hostElement)
    .then(html => {
      console.log(html);
      template.innerHTML = html;
    }).then(() => {
      shadowHost.appendChild(template.content);

      shadowHost.querySelectorAll('input').forEach(i => {
        i.addEventListener('click', e => {
          console.log(e);
          console.log('clicked', e.target);
        });
      });

      shadowHost.querySelector('.chrome-web-themer-change-color').addEventListener('change', e => {
        e.stopPropagation();
        const color = `#${e}`;
        $(hostElement.path).style.backgroundColor = color;
        if ($(hostElement.path).style.backgroundColor === color) {
          EditElement.backgroundColor = color;
        }
      });

      if ($(hostElement.path).textContent.length > 0) {
        shadowHost.querySelector('.chrome-web-themer-edit-text').addEventListener('keyup', e => {
          const newText = e.target.value;
          if (newText.length > 0) {
            $(hostElement.path).textContent = newText;
            if ($(hostElement.path).textContent === newText) {
              EditElement.textContent = newText;
            }
          }
        });
      }

      shadowHost.querySelector('.chrome-web-themer-change-width').addEventListener('change', e => {
        const newWidth = e.target.value;
        $(hostElement.path).style.width = newWidth;
        console.log(newWidth);
        console.log($(hostElement.path).style.width);
        if ($(hostElement.path).style.width === newWidth) {
          EditElement.width = newWidth;
        }
      }, false);

      shadowHost.querySelector('.chrome-web-themer-change-height').addEventListener('change', e => {
        const newHeight = e.target.value;
        $(hostElement.path).style.height = newHeight;
        if ($(hostElement.path).style.height === newHeight) {
          EditElement.height = newHeight;
        }
      }, false);
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
    let overlay = $('.chrome-web-themer-overlay');
    overlay.className = overlay.className.replace('chrome-web-themer-overlay', '');
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
        if (e.target.className) {
          e.target.className = e.target.className.replace(re, "$1").replace(/\s+/g, " ").replace(/(^ | $)/g, "");
        }
      }
    },
    {
      $el: $('body:not(.chrome-web-themer-overlay):not(.chrome-themer-popup-menu):not(.context-menu)'),
      event: 'contextmenu',
      handler: editClickHandler
    }
  ]
};
