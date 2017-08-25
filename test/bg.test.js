var vm = require('vm');
var fs = require('fs');
var chrome = require('sinon-chrome');
var assert = require('chai').assert;
var background = require('../app/scripts.babel/background.js');

describe('background', function () {

    before(function () {
        global.chrome = chrome;
    });

    after(function () {
        delete global.chrome;
    });

    describe('setBadge', function () {

        it('should call chrome api with correct args', function () {
            assert.ok(chrome.browserAction.setIcon.notCalled, 'setIcon method not called');
            assert.ok(chrome.browserAction.setBadgeText.calledOnce);
            assert.ok(chrome.browserAction.setBadgeText.calledWithMatch({
              text: '2'
            }));
        });
    });
});
// // 1. mock `chrome.tabs.query` to return predefined response
// chrome.tabs.query.yields([
//   {id: 1, title: 'Tab 1'},
//   {id: 2, title: 'Tab 2'}
// ]);
//
// // 2. inject our mocked chrome.* api into some environment
// var context = {
//   chrome: chrome
// };
//
// // 3. run our extension code in this environment
// var code = fs.readFileSync('app/scripts/background.js');
// vm.runInNewContext(code, context);
//
// // 4. assert that button badge equals to '2'
// assert.calledOnce(chrome.browserAction.setBadgeText);
// assert.calledWithMatch(chrome.browserAction.setBadgeText, {
//   text: "2"
// });
