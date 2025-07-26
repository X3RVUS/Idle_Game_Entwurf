import { CONFIG } from '../config.js';

const BASE_COSTS = {
    collectorBuy: 10,
    collectorSpeed: 20,
    collectorYield: 10,
    storageUpgrade: 50,
    goodsUpgrade: 75,
    factoryBuild: 10,
    factoryYieldUpgrade: 10,
    factorySpeedUpgrade: 20,
    tradeBuild: 50,
    tradePriceUpgrade: 20,
    tradeSpeedUpgrade: 30,
};

class LevelManager {
    constructor() {
        this.level = parseInt(localStorage.getItem('gameLevel')) || 1;
        this.ui = null;
    }

    init(ui) {
        this.ui = ui;
        this.applyCostMultiplier();
        this.applyLevelVisuals();
    }

    getCostMultiplier() {
        return this.level + 1;
    }

    applyCostMultiplier() {
        const m = this.getCostMultiplier();
        CONFIG.Collectors.buyCost = BASE_COSTS.collectorBuy * m;
        CONFIG.Collectors.speedUpgradeCost = BASE_COSTS.collectorSpeed * m;
        CONFIG.Collectors.yieldUpgradeCost = BASE_COSTS.collectorYield * m;
        CONFIG.Storage.upgradeCost = BASE_COSTS.storageUpgrade * m;
        CONFIG.Goods.upgradeCost = BASE_COSTS.goodsUpgrade * m;
        CONFIG.Factories.buildCost = BASE_COSTS.factoryBuild * m;
        CONFIG.Factories.initialYieldUpgradeCost = BASE_COSTS.factoryYieldUpgrade * m;
        CONFIG.Factories.initialSpeedUpgradeCost = BASE_COSTS.factorySpeedUpgrade * m;
        CONFIG.TradePost.buildCost = BASE_COSTS.tradeBuild * m;
        CONFIG.TradePost.initialPriceUpgradeCost = BASE_COSTS.tradePriceUpgrade * m;
        CONFIG.TradePost.initialSpeedUpgradeCost = BASE_COSTS.tradeSpeedUpgrade * m;
    }

    applyLevelVisuals() {
        if (!this.ui) return;
        const sizeMultiplier = 1 + 0.1 * (this.level - 1);
        const width = 40 * sizeMultiplier;
        const height = 24 * sizeMultiplier;
        this.ui.elements.miningBase.style.width = `calc(${width} * var(--game-unit))`;
        this.ui.elements.miningBase.style.height = `calc(${height} * var(--game-unit))`;

        const unlocked = this.level + 1; // level 1 => 2 slots
        this.ui.elements.buildPlotElements.forEach((el, idx) => {
            const container = el.parentElement;
            if (container) {
                container.style.display = idx < unlocked ? 'flex' : 'none';
            }
        });
    }

    advanceLevel() {
        this.level += 1;
        localStorage.setItem('gameLevel', this.level);
        window.location.reload();
    }
}

const levelManager = new LevelManager();
export default levelManager;
