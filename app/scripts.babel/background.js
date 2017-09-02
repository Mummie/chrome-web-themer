// pageEdits returns an object containing stored edits to the page
// pageEdits[url] may be empty if nothing is stored
// pageEdits[url][edits] contains an array of objects, each object
// having an element and a array of css styles to be injected
// if a new edit is sent that applys a new css rule to a stored element,
// the css style will be appended to that elements' array of styles
let saveEditToURL = (url, edit) => {

  chrome.storage.sync.get(url, pageEdits => {

    if (Object.keys(pageEdits).length < 1) {
      let saveEdit = {
        [url]: {
          'edits': [edit]
        }
      };
      chrome.storage.sync.set(saveEdit);
    } else {
      pageEdits[url].edits.find((e, i) => {
        if (e.element === edit.element) {
          //TODO: add functionality so that if the new edit is already stored on the element, replace the saved value with the new one
          let cleanStyles = pageEdits[url].edits[i].styles.filter(e => e !== edit);
          console.log('filtered', cleanStyles);
          let existingEditKey = pageEdits[url].edits[i].styles.find((s, j) => {
            console.log(s);
            if (edit === s) {
              return j;
            }
          });

          console.log(existingEditKey);
          if (existingEditKey) {
            delete pageEdits[url].edits[i].styles[existingEditKey];
            pageEdits[url].edits[i].styles.push(edit);
          } else {
            delete edit.element;
            pageEdits[url].edits[i].push(edit);
          }
        } else {
          const stylesObject = {
            element: edit.element,
            styles: [edit]
          };
          pageEdits[url].edits.push(stylesObject);
        }
      });

      chrome.storage.sync.set(pageEdits);
    }
  });
}


chrome.webNavigation.onHistoryStateUpdated.addListener(() => {
  chrome.tabs.executeScript(null, {
    file: 'scripts/contentscript.js'
  });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request);
  switch (request.command) {
    case 'saveEdit':
      const isValid = isValidEditObject(request.edit);
      console.log(isValid);

      if (isValid) {
        saveEditToURL(sender.tab.url, request.edit);
        sendResponse(true);
        return true;
      }
      sendResponse('Edit Object passed is not valid');
      break;
    case 'getContextMenuHTML':
      const filepath = chrome.extension.getURL('scripts/context_menu.html');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', filepath, true);
      xhr.onload = () => {
        let parser = new DOMParser();
        let doc = parser.parseFromString(xhr.responseText, 'text/html');
        const cleanHTML = setContextMenuNodeValues(doc, request.element);
        sendResponse(cleanHTML);
      }
      xhr.onerror = err => {
        console.error(err);
        sendResponse(err);
      }
      xhr.send();
      return true;
      break;
    default:
      sendResponse(null);
      break;
  }

});

function setContextMenuNodeValues(cDocument, values) {
  Object.keys(values).forEach(e => {
    if(e === 'text') {
      let textInput = cDocument.body.querySelector('.chrome-web-themer-edit-text').setAttribute('value', values[e].trim());
    }

    if(e === 'backgroundColor') {
      let colorInput = cDocument.body.querySelector('.chrome-web-themer-change-color').setAttribute('value', values[e]);
    }

    if(e === 'width') {
      let widthInput = cDocument.body.querySelector('.chrome-web-themer-change-width').setAttribute('value', values[e]);
    }

    if(e === 'height') {
      let heightInput = cDocument.body.querySelector('.chrome-web-themer-change-height').setAttribute('value', values[e]);
    }
  });
  return cDocument.body.parentNode.innerHTML;
}

function isValidEditObject(edit) {

  if (edit.hasOwnProperty('originalText') && edit.hasOwnProperty('replaceText')) {
    return true;
  }

  const validStyleProps = ['color', 'backgroundColor', 'fontSize', 'fontFamily'];
  const keys = Object.keys(edit);
  if (keys.length < 2) {
    return false;
  }

  if (!edit.hasOwnProperty('element')) {
    return false;
  }

  return true;
}
