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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'saveEdit') {
    saveEditToURL(sender.tab.url, request.edit);
    return true;
  }
});
