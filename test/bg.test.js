import vm from 'vm';
import util from 'util';
import sinon from 'sinon';
let mockEdits = require('./data/mock_edits.json');
import chrome from 'sinon-chrome';
import {
  assert,
  expect,
  should
} from 'chai';
import background from '../app/scripts.babel/background.js';

describe('background', () => {

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

  it('should send invalid message and fail', () => {

    assert.exists(background);
    chrome.runtime.sendMessage({
      command: 'saveEdit',
      edit: 'test'
    }, response => {
      assert.ok(sendResponse.calledOnce);
      assert.equal(response, 'Edit Object passed is not valid', 'Background should return string of invalid object');
    });
    assert.ok(chrome.runtime.sendMessage.calledOnce, 'Chrome Mock Message Sent');
    assert.ok(chrome.runtime.onMessage.addListener.calledOnce);
    assert.isNotOk(chrome.storage.sync.get.calledOnce);
    assert.isNotOk(chrome.webNavigation.onHistoryStateUpdated.addListener.calledOnce);
  });

  it('should store mock edits into chrome local storage and be able to retrieve edit at url', () => {
    assert.exists(background);
    chrome.storage.local.set(mockEdits);
    assert.ok(chrome.storage.local.set.calledOnce);
    chrome.storage.local.get.withArgs('https://www.youtube.com').yields(mockEdits);
    assert.ok(chrome.storage.local.get.calledOnce);
    chrome.storage.local.get.withArgs('https://www.youtube.com').returns(mockEdits);
  });
});
