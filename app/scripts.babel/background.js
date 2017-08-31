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
    }

    else {
      pageEdits[url].edits.find((e, i) => {
        if(e.element === edit.element) {
          //TODO: add functionality so that if the new edit is already stored on the element, replace the saved value with the new one
          pageEdits[url].edits[i].styles.find((s, j) => {
            console.log(s);
            if(edit === s) {
              pageEdits[url].edits[i].styles.splice(j, 1);
            }
          });
          pageEdits[url].edits[i].styles.push(edit);
        }

        else {
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


chrome.webNavigation.onHistoryStateUpdated.addListener(function() {
  chrome.tabs.executeScript(null, { file: 'scripts/contentscript.js' });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'saveEdit') {
    const isValid = isValidEditObject(request.edit);
    console.log(isValid);

    if(isValid) {
      saveEditToURL(sender.tab.url, request.edit);
      sendResponse(true);
      return true;
    }
    sendResponse('Edit Object passed is not valid');
  }
});

function isValidEditObject(edit) {

  const validStyleProps = ['color', 'backgroundColor', 'fontSize', 'fontFamily'];
  const keys = Object.keys(edit);
  if(keys.length < 2) {
    return false;
  }

  if(!edit.hasOwnProperty('element')) {
    return false;
  }

  return true;
}
