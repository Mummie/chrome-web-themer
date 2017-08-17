var node_modules = '../../node_modules/';
// load mocha
phantom.injectJs(node_modules + 'mocha/mocha.js');
phantom.injectJs(node_modules + 'sinon-chrome/src/phantom-tweaks.js');
mocha.setup({ui: 'bdd', reporter: 'spec'});

var fs = require('fs');
var page;
var beforeLoadFn;

beforeEach(function() {
  page = require('webpage').create();

  page.onConsoleMessage = function(msg) {
    console.log(msg);
  };

  page.onError = function(msg, trace) {
    var msgStack = [msg];
    if (trace && trace.length) {
      msgStack.push('TRACE:');
      trace.forEach(function(t) {
        msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
      });
    }
    // we need try..catch here as mocha throws error that catched by phantom.onError
    try {
      mocha.throwError(msgStack.join('\n'));
    } catch(e) { }
  };

  // inject chrome.* api mocks and other stuff into page
  page.onInitialized = function() {
    page.injectJs(node_modules + 'chai/chai.js');
    page.injectJs(node_modules + 'sinon/pkg/sinon-1.11.1.js');
    page.injectJs(node_modules + 'sinon-chrome/chrome.js');
    page.injectJs(node_modules + 'sinon-chrome/src/phantom-tweaks.js');
    page.evaluate(function() {
      assert = chai.assert;
    });
    // run additional functions before page load
    if (beforeLoadFn) {
      beforeLoadFn();
    }
  };
});

afterEach(function() {
  page.close();
  beforeLoadFn = null;
});

// tests
describe('background page', function() {

  // sometimes it takes time to start phantomjs
  this.timeout(4000);

  it('should display opened tabs in button badge', function(done) {
    // #1. open empty page and inject chrome.* api mocks
    page.open('test/empty.html', function() {
      // #2. stub `chrome.tabs.query` to return pre-defined response
      page.evaluate(function(tabs) {
        chrome.tabs.query.yields(JSON.parse(tabs));
      }, fs.read('test/data/tabs.query.json'));

      // #3. run background js
      page.injectJs('src/background.js');

      // #4. assert that button badge equals to '2'
      page.evaluate(function() {
        sinon.assert.calledOnce(chrome.browserAction.setBadgeText);
        sinon.assert.calledWithMatch(chrome.browserAction.setBadgeText, {
            text: "2"
        });
      });
      done();
    });
  });

});

// run
mocha.run(function(failures) {
  phantom.exit(failures);
});
