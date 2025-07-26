import { CONFIG } from '../js/config.js';

function createDOM() {
  return {
    scoreDisplay: document.createElement('div'),
    storageDisplay: document.createElement('div'),
    goodsDisplay: document.createElement('div'),
    storageFill: document.createElement('div'),
    goodsFill: document.createElement('div'),
    ui: { elements: {} }
  };
}

test('updateScore adjusts score and display', async () => {
  jest.resetModules();
  const { default: gameManager } = await import('../js/GameManager.js');
  const dom = createDOM();
  gameManager.init(dom.scoreDisplay, dom.storageDisplay, dom.goodsDisplay, dom.storageFill, dom.goodsFill, dom.ui);
  gameManager.updateScore(5);
  expect(gameManager.getScore()).toBe(CONFIG.Game.initialScore + 5);
  expect(dom.scoreDisplay.textContent).toBe(`Score: ${CONFIG.Game.initialScore + 5}`);
});

test('upgradeStorage increases capacity and decreases score', async () => {
  jest.resetModules();
  const { default: gameManager } = await import('../js/GameManager.js');
  const dom = createDOM();
  gameManager.init(dom.scoreDisplay, dom.storageDisplay, dom.goodsDisplay, dom.storageFill, dom.goodsFill, dom.ui);
  const startMax = gameManager.getMaxStorage();
  const startScore = gameManager.getScore();
  const cost = CONFIG.Storage.upgradeCost;
  gameManager.upgradeStorage();
  expect(gameManager.getMaxStorage()).toBe(Math.ceil(startMax * CONFIG.Storage.upgradeCapacityMultiplier));
  expect(gameManager.getScore()).toBe(startScore - cost);
});
