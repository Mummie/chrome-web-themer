// pageEdits returns an object containing stored edits to the page
// pageEdits[url] may be empty if nothing is stored
// pageEdits[url][edits] contains an array of objects, each object
// having an element and a array of css styles to be injected
// if a new edit is sent that applys a new css rule to a stored element,
// the css style will be appended to that elements' array of styles
let saveEditToURL = (url, edit) => {

  chrome.storage.sync.get(url, pageEdits => {
    console.log(JSON.stringify(edit));
    console.log('page edits key length ', Object.keys(pageEdits).length);
    let obj = {};
    Object.getOwnPropertyNames(edit).forEach((prop, index) => {
      obj[prop] = edit[prop];
    });

    if (Object.keys(pageEdits).length < 1) {
      let saveEdit = {
        [url]: edit
      };
      chrome.storage.sync.set(saveEdit);
    }

    else {
      pageEdits[url][edits].push(edit);
      console.log(pageEdits[url]);
      chrome.storage.sync.set(pageEdits[url]);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'saveEdit') {
    saveEditToURL(sender.tab.url, request.edit);
    return true;
  }

});
