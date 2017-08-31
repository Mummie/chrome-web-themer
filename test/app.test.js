import vm from 'vm';
import fs from 'fs';
import util from 'util';
import sinon from 'sinon';
import chrome from 'sinon-chrome';
import {assert, expect, should} from 'chai';
import background from '../app/scripts.babel/app.js';

const url = 'chrome-extension://igchocapjlndhicdblddcdmfpbpbopml/popup.html';
describe('app', () => {

  const sandbox = sinon.sandbox.create();
  sandbox.stub(window.chrome.runtime, 'sendMessage');

    before(() => {
      global.chrome = chrome;
      window.chrome = chrome;
    });

    after(() => {
        chrome.flush();
        delete global.chrome;
    });

    it('should call getAllEdits and return mock edit response', () => {

      assert.exists(background);
      chrome.runtime.sendMessage({command: 'saveEdit', edit: 'test'}, response => {
        assert.ok(sendResponse.calledOnce);
        assert.equal(response, 'Edit Object passed is not valid', 'Background should return string of invalid object');
      });
      assert.ok(chrome.runtime.sendMessage.calledOnce, 'Chrome Mock Message Sent');
      assert.ok(chrome.runtime.onMessage.addListener.calledOnce);
      assert.isNotOk(chrome.storage.sync.get.calledOnce);
      assert.isNotOk(chrome.webNavigation.onHistoryStateUpdated.addListener.calledOnce);
    });
});
