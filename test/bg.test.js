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
