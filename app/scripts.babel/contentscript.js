// All code that has to step outside of chrome app dom and go to current page dom
/* eslint-disable no-unused-vars */
console.log('hello from content script!');
var cssPath = chrome.extension.getURL('styles/inject.css');
var injectCSS = document.createElement('link');
injectCSS.setAttribute('rel', 'stylesheet');
injectCSS.setAttribute('type', 'text/css');
injectCSS.setAttribute('href', cssPath);

document.querySelector('head').append(injectCSS);

var htmlTextNodes = textNodesUnder(document.body);
console.log(htmlTextNodes);

chrome.runtime.onMessage.addListener(function(msg, sender, response) {
    if (msg.from === 'addEditEvent') {
        showHoverStyle();
        document.addEventListener('click', function(e) {
            if (e.default) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            // todo: add code that will create a variable that is a valid editable element. add check for this editable element with editableElement.contains(e.target) and use conditional to handle element/err
            e = e || window.event;
            var target = e.target || e.srcElement,
                text = target.textContent || text.innerText;
            var clickedElement = { 'element': target.tagName.toUpperCase(), text, 'id': target.id, 'class': target.class };
            console.log(clickedElement);
            response(clickedElement);
        });
    }
});

function showHoverStyle() {
    document.body.addEventListener('mouseover', function(e) {
        var overlay = document.createElement('div');
        overlay.id = 'overlay';
        e.target.parentNode.append(overlay);
    });

    document.body.addEventListener('mouseout', function(e) {
        var hoverElem = e.target.getElementById('overlay');
        e.target.parentNode.remove(hoverElem);
    });
}

chrome.extension.onRequest.addListener(function(req, sender, res) {
    if (req.find && req.replace) {
        console.log(`find: ${req.find} \n replace: ${req.replace}`);
        findAndReplaceText(req.find, req.replace);
        res(true);
    } else {
        res({});
    }
});

//textNodesUnder will use treewalkerAPI to find all text nodes
function textNodesUnder(el) {
    var rejectScriptTextFilter = {
        acceptNode: function(node) {
            switch (node) {
                case node.parentNode.nodeName === 'SCRIPT' || 'STYLE':
                    return NodeFilter.FILTER_REJECT;
                case /^[\r\n ]+$/.test(node.data):
                    return NodeFilter.FILTER_REJECT;
                case /\s/.test(node.data):
                    return NodeFilter.FILTER_REJECT;
                case node.data === '↵':
                    return NodeFilter.FILTER_REJECT;
                default:
                    return NodeFilter.FILTER_ACCEPT;
            }
        }
    };

    var n, a = [],
        walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, rejectScriptTextFilter, false);
    while ((n = walk.nextNode()) !== null) {
        a.push(n);
    }

    return a;
}

function findAndReplaceText(textToFind, textToReplace) {
    if (!document.body) {
        return false;
    }

    for (var i = 0, htmlArrLen = htmlTextNodes.length; i < htmlArrLen; i++) {
        console.log(htmlTextNodes[i].innerText);
        var phraseToSearch = new RegExp('/\b' + textToFind + '\b/i');
        if (phraseToSearch.test(htmlTextNodes[i].innerText)) {
            htmlTextNodes[i].innerText.replace(phraseToSearch, textToReplace);
        }
    }
}

// todo: need to set color variable to be a linear gradient that transitions the color pallete from background-y to default color i.e white
// on click, take the cursor color to be rainbow and each second drain the color to white until timer reaches 5
function loop() {
    var color = 'rgb(' + ((255 * Math.random()) | 0) + ',' +
        ((255 * Math.random()) | 0) + ',' +
        ((255 * Math.random()) | 0) + ')';
    makeCursor(color);
    setTimeout(loop, 5000);
}

function makeCursor(color) {

    var cursor = document.createElement('canvas'),
        ctx = cursor.getContext('2d');

    cursor.width = 16;
    cursor.height = 16;

    ctx.strokeStyle = color;

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.moveTo(2, 12);
    ctx.lineTo(2, 2);
    ctx.lineTo(12, 2);
    ctx.moveTo(2, 2);
    ctx.lineTo(30, 30);
    ctx.stroke();

    document.body.style.cursor = 'url(' + cursor.toDataURL() + '), auto';
}

//  Default placement:
// ------------------A <-- element with id or name attribute ("anchor")
//           #fragment <-- aligned at the right, at the same line as the anchor.
// When an anchor is too small (smaller than MINIMUM_REQ_WIDTH_PX), then the
// element is aligned at the left instead of at the right. This is to make sure
// that at least a part of the anchor is visible, even if the container clips
// its content using overflow:hidden.
//                  A         <!-- anchor

// (function() {


//     //                  #fragment <!-- left-aligned link.
//     var MINIMUM_REQ_WIDTH_PX = 16;

//     // For some elements, it does not make sense to add an anchor.
//     var SELECTOR_ELEMENTS_WITHOUT_ANCHOR =
//         // Embedded content
//         'audio,applet,canvas,embed,iframe,img,math,object,svg,video,' +
//         // Some interactive content where <a> as a child does not make sense.
//         // Although e.g. nested <a> elements are not allowed, Firefox and Chrome
//         // appears to render them just fine, with the deepest <a> being clickable.
//         'input,keygen,select,textarea,' +
//         // Empty elements which may be used in a special way.
//         'col,meta,' +
//         // Elements whose content have a special meaning.
//         'noframes,noscript,script,style,template';

//     // Prefer "#anchor", and only use /pathname?query#anchor if base-href is set.
//     // #anchor is preferred to deal correctly with pages that use the history API to rewrite the URL.
//     var baseURI = document.querySelector('base[href]') ? location.pathname + location.search : '';

//     // Non-standard HTML element to avoid collisions with page's scripts
//     // Hey, this name is so exotic that it must be unique ;)
//     var baseHolder = document.createElement(':a.href:');
//     var baseWrappr = document.createElement('span');
//     var baseAnchor = document.createElement('a');

//     baseWrappr.style.cssText =
//         'position: absolute;' +
//         'top: 0;';
//     baseAnchor.style.cssText =
//         'position: absolute;' +
//         'right: 0;' + // Grow element in left direction (to avoid horizontal scrollbars)
//         'display: inline-block;' +
//         'white-space: pre;' +
//         'margin-top: -2px;' +
//         'padding: 2px 4px;' +
//         'background-color: rgba(255, 255, 255, 0.9);';

//     function stopPropagation(event) {
//         event.stopPropagation();
//     }

//     var getShadowRoot;
//     if (baseHolder.attachShadow) {
//         // Chrome 53+
//         getShadowRoot = function(holder) {
//             // attachShadow is only allowed for whitelisted elements.
//             // https://github.com/w3c/webcomponents/issues/110
//             var shadowHost = document.createElement('span');
//             shadowHost.style.setProperty('all', 'inherit', 'important');
//             holder.appendChild(shadowHost);
//             return shadowHost.attachShadow({ mode: 'open' });
//         };
//     } else if (baseHolder.createShadowRoot) {
//         // Chrome 35+
//         if ('all' in baseHolder.style) {
//             // Chrome 37+ supports the "all" CSS keyword.
//             getShadowRoot = function(holder) {
//                 return holder.createShadowRoot();
//             };
//         } else {
//             getShadowRoot = function(holder) {
//                 var shadowRoot = holder.createShadowRoot();
//                 shadowRoot.resetStyleInheritance = true;
//                 return shadowRoot;
//             };
//         }
//     } else if (baseHolder.webkitCreateShadowRoot) {
//         // Chrome 33+
//         getShadowRoot = function(holder) {
//             var shadowRoot = holder.webkitCreateShadowRoot();
//             shadowRoot.resetStyleInheritance = true;
//             return shadowRoot;
//         };
//     } else {
//         // Firefox, etc.
//         getShadowRoot = function(holder) {
//             return holder;
//         };
//         // There is no style isolation through shadow DOM, need manual work...
//         [baseWrappr, baseAnchor].forEach(function(baseNode) {
//             baseNode.className = 'display-anchors-style-reset';
//             baseNode.style.cssText =
//                 baseNode.style.cssText.replace(/;/g, '!important;');
//         });
//     }

//     /**
//      * @param {string} anchorValue is the ID or name of the anchor element.
//      * @param {Element} elem - the element to which the ID or name belongs.
//      * @param {object} options - user preferences.
//      * @returns {HTMLElement|null}
//      */
//     function getAnchor(anchorValue, elem, options) {
//         var holder = baseHolder.cloneNode();
//         var anchor = baseAnchor.cloneNode();
//         var shadow = getShadowRoot(holder);

//         holder.addEventListener('transitionend', function(event) {
//             if (event.propertyName !== 'z-index') {
//                 return;
//             }
//             var elapsedTime = Math.round(event.elapsedTime * 1000);
//             if (elapsedTime === 1) { // Default
//                 elem.removeAttribute('a-href:hover');
//                 anchor.style.setProperty('outline', '', 'important');
//             } else if (elapsedTime === 2) { // Parent:hover
//                 elem.removeAttribute('a-href:hover');
//                 anchor.style.setProperty('outline', 'rgba(203, 145, 67, 0.90) dashed 2px', 'important');
//             } else if (elapsedTime === 3) { // Anchor:hover
//                 elem.setAttribute('a-href:hover', '');
//                 anchor.style.setProperty('outline', '', 'important');
//             }
//         });

//         var currentStyle = getComputedStyle(elem);
//         if (!currentStyle) {
//             return null;
//         }
//         var isPositioned = currentStyle.getPropertyValue('position') !== 'static'; // Neglect "inherit"
//         if (isPositioned) {
//             holder.style.setProperty('top', '0', 'important');
//             if (elem.offsetLeft > MINIMUM_REQ_WIDTH_PX) {
//                 holder.style.setProperty('right', '0', 'important');
//             } else {
//                 holder.style.setProperty('left', '0', 'important');
//                 anchor.style.setProperty('left', '0', 'important');
//                 anchor.style.setProperty('right', 'auto', 'important');
//             }
//             shadow.appendChild(anchor);
//         } else {
//             var paddingLeft = parseFloat(currentStyle.getPropertyValue('padding-left')) || 0;
//             var borderLeft = parseFloat(currentStyle.getPropertyValue('border-left-width')) || 0;
//             var visibleHorizontalSpace = elem.offsetLeft + elem.offsetWidth - paddingLeft - borderLeft;
//             if (visibleHorizontalSpace < MINIMUM_REQ_WIDTH_PX) {
//                 anchor.style.setProperty('left', '0', 'important');
//                 anchor.style.setProperty('right', 'auto', 'important');
//                 shadow.appendChild(anchor);
//             } else {
//                 var wrappr = baseWrappr.cloneNode();
//                 var paddingTop = parseFloat(currentStyle.getPropertyValue('padding-top')) || 0;
//                 wrappr.style.setProperty('top', (-paddingTop) + 'px', 'important');
//                 wrappr.style.setProperty(
//                     'left', (elem.offsetWidth - paddingLeft - borderLeft) + 'px', 'important');
//                 wrappr.appendChild(anchor);
//                 shadow.appendChild(wrappr);
//             }
//         }

//         anchor.href = baseURI + '#' + anchorValue;
//         anchor.textContent = options.useAnchorText ? '#' + anchorValue : options.customTextValue;
//         anchor.addEventListener('click', stopPropagation);
//         anchor.addEventListener('dblclick', stopPropagation);
//         anchor.addEventListener('mousedown', stopPropagation);

//         return holder;
//     }

//     function removeAllAnchors() {
//         [].forEach.call(document.body.querySelectorAll('\\:a\\.href\\:'), function(elem) {
//             elem.parentNode.removeChild(elem);
//         });
//     }

//     var matchesSelector;
//     ['webkitM', 'm'].some(function(prefix) {
//         var name = prefix + 'atches';
//         if (name in document.documentElement) matchesSelector = name;
//         name += 'Selector';
//         if (name in document.documentElement) matchesSelector = name;
//         return matchesSelector; // If found, then truthy, and [].some() ends.
//     });

//     var closest = function(element, selector) {
//         return element && element.closest(selector);
//     };
//     if (!baseHolder.closest) {
//         closest = function(element, selector) {
//             while (element) {
//                 if (element[matchesSelector](selector)) {
//                     return element;
//                 }
//                 element = element.parentElement;
//             }
//         };
//     }

//     /**
//      * @param {object} options - user preferences.
//      */
//     function addAllAnchors(options) {
//         var elems = (document.body || document.documentElement).querySelectorAll('[id],[name]');
//         var elem;
//         var length = elems.length;
//         var anchors = new Array(length);
//         var parentNodes = new Array(length);
//         var nextSiblings = new Array(length);
//         // First generate the elements...
//         for (var i = 0; i < length; ++i) {
//             elem = elems[i];
//             if (!closest(elem, SELECTOR_ELEMENTS_WITHOUT_ANCHOR)) {
//                 // Ignore <param name="..." value="..."> etc.
//                 var anchorValue = elem.id || elem.name;
//                 if (anchorValue && (elem = getInsertionPoint(elem))) {
//                     parentNodes[i] = elem;
//                     nextSiblings[i] = elem.firstChild;
//                     anchors[i] = getAnchor(anchorValue, elem, options);
//                 }
//             }
//         }
//         // ... then insert them the elements
//         // Not doing this causes a repaint for every element
//         for (i = 0; i < length; ++i) {
//             if (anchors[i]) {
//                 parentNodes[i].insertBefore(anchors[i], nextSiblings[i]);
//             }
//         }
//     }

//     function getInsertionPoint(element) {
//         switch (element.tagName.toUpperCase()) {
//             case 'TABLE':
//             case 'THEAD':
//             case 'TBODY':
//             case 'TFOOT':
//                 return element.rows[0] && element.rows[0].cells[0];
//             case 'TR':
//                 return element.cells[0];
//             default:
//                 return element;
//         }
//     }


//     // Content script is programatically activated. So, do something (toggle):
//     removeAllAnchors();
//     if (!window.hasShown) {
//         var defaultConfig = {
//             useAnchorText: true,
//             customTextValue: '\xb6' // paragraph symbol.
//         };
//         if (typeof chrome === 'object' && chrome && chrome.storage) {
//             // storage-sync-polyfill.js is not loaded, so storage.sync may be unset,
//             var storageArea = chrome.storage.sync || chrome.storage.local;
//             // Keep defaults in sync with background.js and options.js
//             storageArea.get(defaultConfig, function(items) {
//                 if (items) {
//                     addAllAnchors(items);
//                 } else {
//                     // Fall back from storage.sync to storage.local.
//                     chrome.storage.local.get(defaultConfig, function(items) {
//                         addAllAnchors(items || defaultConfig);
//                     });
//                 }
//             });
//         } else {
//             addAllAnchors(defaultConfig);
//         }
//     }
//     window.hasShown = !window.hasShown;

//     // Used to communicate to the background whether the CSS file needs to be inserted.
//     if (window.hasrun) {
//         return false;
//     } else {
//         window.hasrun = true;
//         return true;
//     }

//     // document.body.style.backgroundColor = 'black';
//     // document.body.onclick = function(e) {
//     //     e = e || window.event;
//     //     var target = e.target || e.srcElement,
//     //         text = target.textContent || text.innerText;
//     //     console.log(target);
//     //     console.log(text);
//     // };
// })();