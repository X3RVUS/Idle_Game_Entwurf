import { log, checkInitialLoad } from '../js/utils/Utils.js';
import { CONFIG } from '../js/config.js';

/** Simple helper to mock offset properties on an element */
function mockDimensions(el, width = 10, height = 10) {
  Object.defineProperty(el, 'offsetWidth', { get: () => width });
  Object.defineProperty(el, 'offsetHeight', { get: () => height });
}

test('log outputs message when debugMode is true', () => {
  CONFIG.Game.debugMode = true;
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  log('Hello World', 123);
  expect(spy).toHaveBeenCalledWith(expect.stringContaining('Hello World'), 123);
  spy.mockRestore();
});

test('checkInitialLoad invokes callback when elements are ready', () => {
  const game = document.createElement('div');
  const planets = document.createElement('div');
  const base = document.createElement('div');
  mockDimensions(game); 
  mockDimensions(planets); 
  mockDimensions(base);
  const cb = jest.fn();
  checkInitialLoad(game, planets, base, cb);
  expect(cb).toHaveBeenCalled();
});
