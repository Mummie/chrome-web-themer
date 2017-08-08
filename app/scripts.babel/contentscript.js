// All code that has to step outside of chrome app dom and go to current page dom
/* eslint-disable no-console */
console.log('hello from content script!');

let $ = window.jQuery || jQuery;
if(!$) {
  const jQueryPath = chrome.extension.getURL('scripts/jquery.min.js');
  const injectJQuery = $(`<script src="${jQueryPath}"></script>`);
  $('head').append(injectJQuery);
  console.log('check jquery');
}

const cssPath = chrome.extension.getURL('styles/inject.css');
const injectCSS = $('<link>');
injectCSS.attr({
  'rel': 'stylesheet',
  'type': 'text/css',
  'href': cssPath
});
$('head').append(injectCSS);
const url = window.location.href;
const originalPageStyles = {
  cursor: $('body').css('cursor'),
  pageSource: $('body').html()
};
var EditElement = {};
var EditMode = {
    init: function() {
        this.bindEventHandlers();
    },
    bindEventHandlers: function() {
        for (var i=0; i<this.eventHandlers.length; i++) {
            this.bindEvent(this.eventHandlers[i]);
        }
    },
    bindEvent: function(e) {
        e.$el.on(e.event, e.handler);
        console.log('Bound ' + e.event + ' handler for', e.$el);
    },
    removeEventHandlers: function() {
      for (var i=0; i<this.eventHandlers.length; i++) {
          this.removeEvent(this.eventHandlers[i]);
      }
    },
    eventHandlers: [
        {
            $el: $(document),
            event: "keyup",
            handler: function(e) {
                if (e.keyCode === 27) {
                  console.log('esc pressed');
                  removeEventHandlers();
                  $.contextMenu('destroy');
                  $(document.body).off('mousedown');
                  $(document.body).off('mouseout', showHoverStyle);
                  removeHoverStyle();
                }
              }

        },
        {
          $el: $('#edit-popup-menu'),
          event: 'focusout',
          handler: function() {
            $(this).animation({
              display: 'none'
            });
            $(this).remove();
          }
        },
        {
          $el: $('body>*:not(#edit-popup-menu )'),
          event: 'click',
          handler: editClickHandler
        },
        {
            $el: $('#new-element-text'),
            event: "change",
            handler: function() {
                let newText = $(this).text();
                if(newText.length > 0) {
                  element.innerText = newText;
                }
             }
        }
    ]
};

let editedPageStyles = {};
chrome.storage.sync.get(url, function(edits) {
    let e = edits[url];
    console.log(e);
    if(e) {

      if (e['backgroundColor']) {
        $('body').css('background-color', e['backgroundColor'].color);
      }

      if (e['fontFamily']) {
        $('body').css('font-family', e['fontFamily'].font);
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

const updateElementText = element => {
  $('#new-element-text').on('change', function() {
    let newText = $(this).text();
    if(newText.length > 0) {
      element.innerText = newText;
    }
  });
}

const getTextNodesIn = function(el, text) {
    return $(el).find(":not(iframe)").addBack().contents().filter(function() {
      if(this.nodeType == 3 && this.textContent.indexOf(text) != -1)
        return this;
    });
};

function findAndReplaceText(textToFind, textToReplace) {
  try {
    console.log(textToFind + ' ' + textToReplace);
    let textreplaceEdits = {
      originalText: textToFind,
      replaceText: textToReplace
    };

    const textNodes = getTextNodesIn(originalPageStyles.pageSource, textToFind);
    for(let i =0; i < textNodes.length; i++) {
      console.log($(textNodes[i].parentNode));
      $(textNodes[i]).text(textToReplace);
    }

    return textreplaceEdits;

  }
  catch(e) {
    console.error('text replace error ' + e);
  }
}

chrome.runtime.onMessage.addListener(function(req, sender, res) {
  console.log(req.command);
    switch(req.command) {
      case "textReplace":
        const textEdits = findAndReplaceText(req.find, req.replace);
        if (textEdits.originalText != '' && textEdits.replaceText != '') {
          res(textEdits);
        }
        break;
      case "changePageFont":
        $('body').css('font-family', req.font);
        res(true);
        break;
      case 'editEvent':
        showHoverStyle();
        makeCursor('gray');
        EditMode.init();
        if(EditElement != 'undefined' || null) {
          res(EditElement);
        }
        break;
      case 'changeColor':
        $('body').css('background-color', req.color);
        res({
          element: 'body',
          color: `${req.color}`
        });
        break;

      case 'Inverse Webpage':
        console.log(req.inverse);
        $('html').addClass('inverse-webpage');
        res(true);
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
  const text = e.innerText || '';
  const path = getDomPath(target);
  const currentCSS = window.getComputedStyle(target);
  console.log(`DOM Path ${path}`);
  injectEditPopupMenu(target);
  $('#edit-popup-menu').focus();
  updateElementText(target);
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
    EditElement = clickedElement;
    return clickedElement;
  }
}

const injectEditPopupMenu = (elementContainer) => {
  if ($('#edit-popup-menu')) {
    $('edit-popup-menu').remove();
    console.log('removed');
  }

  //TODO: reposition menu to prepend on top of element container
  // Automatically trigger the menu to popup without right clicking
  $.contextMenu({
    selector: '.context-menu-one',
    reposition: true,
    trigger: 'hover',
    position: function(opt, x, y){
        opt.$menu.css({top: 123, left: 123});
    },
    callback: function(key, options) {
      var m = "clicked: " + key;
      window.console && console.log(m) || alert(m);
    },
    items: {
      "edit": {
        "name": "Edit",
        "icon": "edit"
      },
      "cut": {
        "name": "Cut",
        "icon": "cut"
      },
      "sep1": "---------",
      "quit": {
        "name": "Quit",
        "icon": "quit"
      },
      "sep2": "---------",
      "fold1": {
        "name": "Sub group",
        "items": {
          "fold1-key1": {
            "name": "Foo bar"
          },
          "fold2": {
            "name": "Sub group 2",
            "items": {
              "fold2-key1": {
                "name": "alpha"
              },
              "fold2-key2": {
                "name": "bravo"
              },
              "fold2-key3": {
                "name": "charlie"
              }
            }
          },
          "fold1-key3": {
            "name": "delta"
          }
        }
      },
      "fold1a": {
        "name": "Other group",
        "items": {
          "fold1a-key1": {
            "name": "echo"
          },
          "fold1a-key2": {
            "name": "foxtrot"
          },
          "fold1a-key3": {
            "name": "golf"
          }
        }
      }
    }
  });
  const contextMenuHTML = $('<span class="context-menu-one btn btn-neutral">Right Click Me</span>');

  const popupMenuHTML = `<nav class="chrome-themer-popup-menu" id="edit-popup-menu " role="navigation">
	<ul class="nav__list">
		<li>
			<input id="group-1" type="checkbox" hidden
			/>
			<label for="group-1"><span class="fa fa-angle-right"></span>				First level</label>
			<ul class="group-list">
				<li>
					<input type='text' id='new-element-text'
					/>
					<label for='new-element-text'>New Text: </label>
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
  $(elementContainer).append(popupMenuHTML);
  $(elementContainer).prepend(contextMenuHTML);
  $('#edit-popup-menu').hide().fadeIn(1000);
  $('button.close').on('click', function() {
    $('#edit-popup-menu').hide().fadeOut(1000);
    $('#edit-popup-menu').remove();
  });
};

function showHoverStyle() {
  $(document.body).on('mouseover', e => {
    if (typeof e.target != 'undefined') {
      console.log('hovering over', e.target);
      if (!e.target.classList.contains('chrome-web-themer-overlay')) {
        e.target.className += ' chrome-web-themer-overlay';
      }
    }
  });

  $(document.body).on('mouseout', e => {
    e.target.className = e.target.className.replace(new RegExp('(/:^|\\s)' + 'chrome-web-themer-overlay' + '(?:\\s|$)'), '');
  });
}

function removeHoverStyle() {
  $(document.body).off('mouseover', () => {
    let hoveredElem = document.getElementsByClassName('chrome-web-themer-overlay');
    if (hoveredElem.length > 1) {
      [].forEach.call(hoveredElem, e => {
        e.target.className = e.target.className.replace(new RegExp('(/:^|\\s)' + 'chrome-web-themer-overlay' + '(?:\\s|$)'), '');
      });
    }
  });
  document.body.style.cursor = originalPageStyles.cursor;
  $('#chrome-edit-cursor').remove();
}

function getDomPath(el) {
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

//  Default placement:
// ------------------A <-- element with id or name attribute ('anchor')
//           #fragment <-- aligned at the right, at the same line as the anchor.
// When an anchor is too small (smaller than MINIMUM_REQ_WIDTH_PX), then the
// element is aligned at the left instead of at the right. This is to make sure
// that at least a part of the anchor is visible, even if the container clips
// its content using overflow:hidden.
//                  A         <!-- anchor

const runShadowInjections = () => {


  //                  #fragment <!-- left-aligned link.
  const MINIMUM_REQ_WIDTH_PX = 16;

  // For some elements, it does not make sense to add an anchor.
  const SELECTOR_ELEMENTS_WITHOUT_ANCHOR =
    // Embedded content
    'audio,applet,canvas,embed,iframe,img,math,object,svg,video,' +
    // Some interactive content where <a> as a child does not make sense.
    // Although e.g. nested <a> elements are not allowed, Firefox and Chrome
    // appears to render them just fine, with the deepest <a> being clickable.
    'input,keygen,select,textarea,' +
    // Empty elements which may be used in a special way.
    'col,meta,' +
    // Elements whose content have a special meaning.
    'noframes,noscript,script,style,template';

  // Prefer '#anchor', and only use /pathname?query#anchor if base-href is set.
  // #anchor is preferred to deal correctly with pages that use the history API to rewrite the URL.
  const baseURI = document.querySelector('base[href]') ? location.pathname + location.search : '';

  // Non-standard HTML element to avoid collisions with page's scripts
  // Hey, this name is so exotic that it must be unique ;)
  const baseHolder = document.createElement(':a.href:');
  const baseWrappr = document.createElement('span');
  const baseAnchor = document.createElement('a');

  baseWrappr.style.cssText =
    'position: absolute;' +
    'top: 0;';
  baseAnchor.style.cssText =
    'position: absolute;' +
    'right: 0;' + // Grow element in left direction (to avoid horizontal scrollbars)
    'display: inline-block;' +
    'white-space: pre;' +
    'margin-top: -2px;' +
    'padding: 2px 4px;' +
    'background-color: rgba(255, 255, 255, 0.9);';

  function stopPropagation(event) {
    event.stopPropagation();
  }

  let getShadowRoot;
  if (baseHolder.attachShadow) {
    // Chrome 53+
    getShadowRoot = holder => {
      // attachShadow is only allowed for whitelisted elements.
      // https://github.com/w3c/webcomponents/issues/110
      const shadowHost = document.createElement('span');
      shadowHost.style.setProperty('all', 'inherit', 'important');
      holder.appendChild(shadowHost);
      return shadowHost.attachShadow({
        mode: 'open'
      });
    };
  } else if (baseHolder.createShadowRoot) {
    // Chrome 35+
    if ('all' in baseHolder.style) {
      // Chrome 37+ supports the 'all' CSS keyword.
      getShadowRoot = holder => holder.createShadowRoot();
    } else {
      getShadowRoot = holder => {
        const shadowRoot = holder.createShadowRoot();
        shadowRoot.resetStyleInheritance = true;
        return shadowRoot;
      };
    }
  } else if (baseHolder.webkitCreateShadowRoot) {
    // Chrome 33+
    getShadowRoot = holder => {
      const shadowRoot = holder.webkitCreateShadowRoot();
      shadowRoot.resetStyleInheritance = true;
      return shadowRoot;
    };
  } else {
    // Firefox, etc.
    getShadowRoot = holder => holder;
    // There is no style isolation through shadow DOM, need manual work...
    [baseWrappr, baseAnchor].forEach(baseNode => {
      baseNode.className = 'display-anchors-style-reset';
      baseNode.style.cssText =
        baseNode.style.cssText.replace(/;/g, '!important;');
    });
  }

  /**
   * @param {string} anchorValue is the ID or name of the anchor element.
   * @param {Element} elem - the element to which the ID or name belongs.
   * @param {object} options - user preferences.
   * @returns {HTMLElement|null}
   */
  function getAnchor(anchorValue, elem, options) {
    const holder = baseHolder.cloneNode();
    const anchor = baseAnchor.cloneNode();
    const shadow = getShadowRoot(holder);

    holder.addEventListener('transitionend', event => {
      if (event.propertyName !== 'z-index') {
        return;
      }
      const elapsedTime = Math.round(event.elapsedTime * 1000);
      if (elapsedTime === 1) { // Default
        elem.removeAttribute('a-href:hover');
        anchor.style.setProperty('outline', '', 'important');
      } else if (elapsedTime === 2) { // Parent:hover
        elem.removeAttribute('a-href:hover');
        anchor.style.setProperty('outline', 'rgba(203, 145, 67, 0.90) dashed 2px', 'important');
      } else if (elapsedTime === 3) { // Anchor:hover
        elem.setAttribute('a-href:hover', '');
        anchor.style.setProperty('outline', '', 'important');
      }
    });

    const currentStyle = getComputedStyle(elem);
    if (!currentStyle) {
      return null;
    }
    const isPositioned = currentStyle.getPropertyValue('position') !== 'static'; // Neglect 'inherit'
    if (isPositioned) {
      holder.style.setProperty('top', '0', 'important');
      if (elem.offsetLeft > MINIMUM_REQ_WIDTH_PX) {
        holder.style.setProperty('right', '0', 'important');
      } else {
        holder.style.setProperty('left', '0', 'important');
        anchor.style.setProperty('left', '0', 'important');
        anchor.style.setProperty('right', 'auto', 'important');
      }
      shadow.appendChild(anchor);
    } else {
      const paddingLeft = parseFloat(currentStyle.getPropertyValue('padding-left')) || 0;
      const borderLeft = parseFloat(currentStyle.getPropertyValue('border-left-width')) || 0;
      const visibleHorizontalSpace = elem.offsetLeft + elem.offsetWidth - paddingLeft - borderLeft;
      if (visibleHorizontalSpace < MINIMUM_REQ_WIDTH_PX) {
        anchor.style.setProperty('left', '0', 'important');
        anchor.style.setProperty('right', 'auto', 'important');
        shadow.appendChild(anchor);
      } else {
        const wrappr = baseWrappr.cloneNode();
        const paddingTop = parseFloat(currentStyle.getPropertyValue('padding-top')) || 0;
        wrappr.style.setProperty('top', `${-paddingTop}px`, 'important');
        wrappr.style.setProperty(
          'left', `${elem.offsetWidth - paddingLeft - borderLeft}px`, 'important');
        wrappr.appendChild(anchor);
        shadow.appendChild(wrappr);
      }
    }

    anchor.href = `${baseURI}#${anchorValue}`;
    anchor.textContent = options.useAnchorText ? `#${anchorValue}` : options.customTextValue;
    anchor.addEventListener('click', stopPropagation);
    anchor.addEventListener('dblclick', stopPropagation);
    anchor.addEventListener('mousedown', stopPropagation);

    return holder;
  }

  function removeAllAnchors() {
    [].forEach.call(document.body.querySelectorAll('\\:a\\.href\\:'), elem => {
      elem.parentNode.removeChild(elem);
    });
  }

  let matchesSelector;
  ['webkitM', 'm'].some(prefix => {
    let name = `${prefix}atches`;
    if (name in document.documentElement) matchesSelector = name;
    name += 'Selector';
    if (name in document.documentElement) matchesSelector = name;
    return matchesSelector; // If found, then truthy, and [].some() ends.
  });

  let closest = (element, selector) => element && element.closest(selector);
  if (!baseHolder.closest) {
    closest = (element, selector) => {
      while (element) {
        if (element[matchesSelector](selector)) {
          return element;
        }
        element = element.parentElement;
      }
    };
  }

  /**
   * @param {object} options - user preferences.
   */
  function addAllAnchors(options) {
    const elems = (document.body || document.documentElement).querySelectorAll('[id],[name]');
    let elem;
    const length = elems.length;
    const anchors = new Array(length);
    const parentNodes = new Array(length);
    const nextSiblings = new Array(length);
    // First generate the elements...
    for (var i = 0; i < length; ++i) {
      elem = elems[i];
      if (!closest(elem, SELECTOR_ELEMENTS_WITHOUT_ANCHOR)) {
        // Ignore <param name='...' value='...'> etc.
        const anchorValue = elem.id || elem.name;
        if (anchorValue && (elem = getInsertionPoint(elem))) {
          parentNodes[i] = elem;
          nextSiblings[i] = elem.firstChild;
          anchors[i] = getAnchor(anchorValue, elem, options);
        }
      }
    }
    // ... then insert them the elements
    // Not doing this causes a repaint for every element
    for (i = 0; i < length; ++i) {
      if (anchors[i]) {
        parentNodes[i].insertBefore(anchors[i], nextSiblings[i]);
      }
    }
  }

  function getInsertionPoint(element) {
    switch (element.tagName.toUpperCase()) {
      case 'TABLE':
      case 'THEAD':
      case 'TBODY':
      case 'TFOOT':
        return element.rows[0] && element.rows[0].cells[0];
      case 'TR':
        return element.cells[0];
      default:
        return element;
    }
  }


  // Content script is programatically activated. So, do something (toggle):
  removeAllAnchors();
  if (!window.hasShown) {
    const defaultConfig = {
      useAnchorText: true,
      customTextValue: '\xb6' // paragraph symbol.
    };
    if (typeof chrome === 'object' && chrome && chrome.storage) {
      // storage-sync-polyfill.js is not loaded, so storage.sync may be unset,
      const storageArea = chrome.storage.sync || chrome.storage.local;
      // Keep defaults in sync with background.js and options.js
      storageArea.get(defaultConfig, items => {
        if (items) {
          addAllAnchors(items);
        } else {
          // Fall back from storage.sync to storage.local.
          chrome.storage.local.get(defaultConfig, items => {
            addAllAnchors(items || defaultConfig);
          });
        }
      });
    } else {
      addAllAnchors(defaultConfig);
    }
  }
  window.hasShown = !window.hasShown;

  // Used to communicate to the background whether the CSS file needs to be inserted.
  if (window.hasrun) {
    return false;
  } else {
    window.hasrun = true;
    return true;
  }
};
