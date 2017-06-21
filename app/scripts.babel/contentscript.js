// All code that has to step outside of chrome app dom and go to current page dom
/* eslint-disable no-unused-vars */
console.log('hello from content script!');

const cssPath = chrome.extension.getURL('styles/inject.css');
const injectCSS = document.createElement('link');
injectCSS.setAttribute('rel', 'stylesheet');
injectCSS.setAttribute('type', 'text/css');
injectCSS.setAttribute('href', cssPath);

document.querySelector('head').append(injectCSS);

const port = chrome.runtime.connect({ name: 'commandHandler' });
if (!window.jQuery) {
    injectJQuery();
}

// content script now has access to jQuery object

function injectJQuery() {
    const path = chrome.extension.getURL('scripts/jquery.slim.min.js');
    const injectDomTraverse = document.createElement('script');
    injectDomTraverse.setAttribute('type', 'text/javascript');
    injectDomTraverse.setAttribute('src', path);
    document.querySelector('head').appendChild(injectDomTraverse);
}

function injectJQueryUI() {
    const path = chrome.extension.getURL('scripts/jquery.mobile.min.js');
    const injectDomTraverse = document.createElement('script');
    injectDomTraverse.setAttribute('type', 'text/javascript');
    injectDomTraverse.setAttribute('src', path);
    document.querySelector('head').appendChild(injectDomTraverse);
    const cssPath = chrome.extension.getURL('styles/jquery.mobile.structure.min.css');
    const injectCSS = document.createElement('link');
    injectCSS.setAttribute('rel', 'stylesheet');
    injectCSS.setAttribute('type', 'text/css');
    injectCSS.setAttribute('href', cssPath);

    document.querySelector('head').append(injectCSS);
}

document.onkeypress = evt => {
    evt = evt || window.event;
    if (evt.keyCode === 27) {
        //esc key was pressed
        removeHoverStyle();
    }
};

function findByTextContent(needle, haystack, precise) {
    // needle: String, the string to be found within the elements.
    // haystack: String, a selector to be passed to document.querySelectorAll(),
    //           NodeList, Array - to be iterated over within the function:
    // precise: Boolean, true - searches for that precise string, surrounded by
    //                          word-breaks,
    //                   false - searches for the string occurring anywhere
    let elems;

    // no haystack we quit here, to avoid having to search
    // the entire document:
    if (!haystack) {
        return false;
    }
    // if haystack is a string, we pass it to document.querySelectorAll(),
    // and turn the results into an Array:
    else if ('string' == typeof haystack) {
        elems = [].slice.call(document.querySelectorAll(haystack), 0);
    }
    // if haystack has a length property, we convert it to an Array
    // (if it's already an array, this is pointless, but not harmful):
    else if (haystack.length) {
        elems = [].slice.call(haystack, 0);
    }

    // work out whether we're looking at innerText (IE), or textContent
    // (in most other browsers)
    const textProp = 'textContent' in document ? 'textContent' : 'innerText';

    const // creating a regex depending on whether we want a precise match, or not:
    reg = precise === true ? new RegExp(`\\b${needle}\\b`) : new RegExp(needle);

    const // iterating over the elems array:
    found = elems.filter(el => // returning the elements in which the text is, or includes,
    // the needle to be found:
    reg.test(el[textProp]));

    return found.length ? found : false;
}

function findAndReplaceText(textToFind, textToReplace) {
    const pageElementsToSearch = document.querySelectorAll('a, p, span, h1, h2, h3, h4, h5, h6, label');
    const matchingElements = findByTextContent(textToFind, pageElementsToSearch, true);
    console.log(matchingElements);
    let textreplaceEdits = [];
    [].forEach.call(matchingElements, e => {
        console.log('original', e);

        e.textContent = e.textContent.replace(textToFind, textToReplace);
        e.innerText = e.innerText.replace(textToFind, textToReplace);

        console.log('changed', e.textContent);
        textreplaceEdits.push({ element: e.target, originalText: textToFind, replaceText: textToReplace });
    });
    return textreplaceEdits;
}


chrome.extension.onRequest.addListener((req, sender, res) => {
    if (req.find && req.replace) {
        const textEdits = findAndReplaceText(req.find, req.replace);
        if (textEdits.length > 1) {
            res(textEdits);
        }
    }

    if (req.command === 'editEvent') {
        injectHtmlTraverseScript();
        showHoverStyle();
        makeCursor('gray');
        console.log($('body').html());
        document.body.addEventListener('click', e => {
            if (e.default) {
                return;
            }

            e.preventDefault();
            removeHoverStyle();


            // todo: add code that will create a variable that is a valid editable element. add check for this editable element with editableElement.contains(e.target) and use conditional to handle element/err
            e = e || window.event;
            const target = e.target || e.srcElement;
            const text = target.textContent || text.innerText;
            const path = getDomPath(e.target);
            const currentCSS = window.getComputedStyle(target);
            runShadowInjections();
            console.log(`DOM Path ${path}`);
            if (target instanceof Element && target.id != 'undefined') {
                const clickedElement = { 'element': target.tagName.toUpperCase(), text, 'id': target.id, 'class': target.className, path, 'css': currentCSS };
                console.log(clickedElement);
                res(clickedElement);
            }
        });
    }

    if (req.command === 'changeColor' && req.color) {
        document.body.style.backgroundColor = req.color;
        res({ element: 'BODY', css: `background-color: ${req.color}`});
    }
});

function showHoverStyle() {
    document.body.addEventListener('mouseover', e => {
        if (typeof e.target != 'undefined') {
            console.log('hovering over', e.target);
            if (!e.target.classList.contains('chrome-web-themer-overlay')) {
                e.target.className += ' chrome-web-themer-overlay';
            }
        }
    });

    document.body.addEventListener('mouseout', e => {
        e.target.className = e.target.className.replace(new RegExp('(/:^|\\s)' + 'chrome-web-themer-overlay' + '(?:\\s|$)'), '');
    });
}

function removeHoverStyle() {
    document.body.removeEventListener('mouseover', () => {
        let hoveredElem = document.getElementsByClassName('chrome-web-themer-overlay');
        if (hoveredElem.length > 1) {
            [].forEach.call(hoveredElem, e => {
                e.target.className = e.target.className.replace(new RegExp('(/:^|\\s)' + 'chrome-web-themer-overlay' + '(?:\\s|$)'), '');
            });
        }
    });
}

// Wrap wrapper around nodes
// Just pass a collection of nodes, and a wrapper element
function wrapAll(nodes, wrapper) {
    // Cache the current parent and previous sibling of the first node.
    const parent = nodes.parentNode;
    const previousSibling = nodes.previousSibling;

    // Place each node in wrapper.
    //  - If nodes is an array, we must increment the index we grab from
    //    after each loop.
    //  - If nodes is a NodeList, each node is automatically removed from
    //    the NodeList when it is removed from its parent with appendChild.
    for (let i = 0; nodes.length - i; wrapper.firstChild === nodes[0] && i++) {
        wrapper.appendChild(nodes[i]);
    }

    // Place the wrapper just after the cached previousSibling
    parent.insertBefore(wrapper, previousSibling.nextSibling);

    return wrapper;
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
// ------------------A <-- element with id or name attribute ("anchor")
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

    // Prefer "#anchor", and only use /pathname?query#anchor if base-href is set.
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
            return shadowHost.attachShadow({ mode: 'open' });
        };
    } else if (baseHolder.createShadowRoot) {
        // Chrome 35+
        if ('all' in baseHolder.style) {
            // Chrome 37+ supports the "all" CSS keyword.
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
        const isPositioned = currentStyle.getPropertyValue('position') !== 'static'; // Neglect "inherit"
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
                // Ignore <param name="..." value="..."> etc.
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
