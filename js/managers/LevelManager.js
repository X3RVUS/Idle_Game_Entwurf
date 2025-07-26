import { CONFIG } from '../config.js';
import { LEVEL_LAYOUTS } from '../levelLayouts.js';

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

const SLOT_SIZE = 7; // in game units
const GAP_SIZE = 1; // total gap between slots

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

        const layout = LEVEL_LAYOUTS[this.level - 1] || LEVEL_LAYOUTS[0];

        const step = SLOT_SIZE + GAP_SIZE;
        const width = layout.cols * step;
        const height = layout.rows * step;

        const base = this.ui.elements.miningBase;
        base.style.width = `calc(${width} * var(--game-unit))`;
        base.style.height = `calc(${height} * var(--game-unit))`;
        base.innerHTML = '';

        this.ui.elements.buildPlotElements = [];

        layout.slots.forEach((pos, idx) => {
            const slotContainer = document.createElement('div');
            slotContainer.classList.add('build-slot');
            const centerX = (pos.x * step) + SLOT_SIZE / 2 + GAP_SIZE / 2;
            const centerY = (pos.y * step) + SLOT_SIZE / 2 + GAP_SIZE / 2;
            slotContainer.style.left = `calc(${centerX} * var(--game-unit))`;
            slotContainer.style.top = `calc(${centerY} * var(--game-unit))`;

            const plot = document.createElement('div');
            plot.id = `build-plot-${idx}`;
            plot.classList.add('build-plot');
            plot.dataset.slotIndex = idx.toString();

            slotContainer.appendChild(plot);
            base.appendChild(slotContainer);
            this.ui.elements.buildPlotElements.push(plot);
        });

        if (typeof this.ui.refreshBuildPlotElements === 'function') {
            this.ui.refreshBuildPlotElements();
        }
    }

    advanceLevel() {
        this.level += 1;
        localStorage.setItem('gameLevel', this.level);
        window.location.reload();
    }
}

const levelManager = new LevelManager();
export default levelManager;
