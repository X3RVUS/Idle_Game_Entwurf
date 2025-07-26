import { CONFIG } from '../config.js';

// Ship layout definition per level. Each level specifies how many
// build plots are unlocked and how the base should be sized. The
// `cols` and `rows` values define how many build plot slots fit
// horizontally and vertically on the ship. This allows us to change the
// actual form of the ship instead of only scaling it.
const SHIP_LAYOUTS = {
    1: { cols: 2, rows: 1, slots: 2 }, // two plots next to each other
    // Level 2 forms an L-shape with two plots in the first row and one below
    2: { cols: 2, rows: 2, slots: 3 },
};

// Width/height of a single build plot including margin. Used to size the
// mining base according to the layout above.
const SLOT_UNIT = 8;

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

        // Determine layout for current level. If no specific layout is defined
        // fallback to a simple horizontal expansion using the old logic.
        const layout = SHIP_LAYOUTS[this.level] || {
            cols: this.level + 1,
            rows: 1,
            slots: this.level + 1,
        };

        const width = layout.cols * SLOT_UNIT;
        const height = layout.rows * SLOT_UNIT;

        this.ui.elements.miningBase.style.width = `calc(${width} * var(--game-unit))`;
        this.ui.elements.miningBase.style.height = `calc(${height} * var(--game-unit))`;

        // Show only the unlocked build plots
        this.ui.elements.buildPlotElements.forEach((el, idx) => {
            const container = el.parentElement;
            if (container) {
                container.style.display = idx < layout.slots ? 'flex' : 'none';
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
