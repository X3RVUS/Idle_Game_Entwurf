// js/entities/TradePost.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung

export class TradePost {
    /**
     * Erstellt eine Instanz eines Handelspostens.
     * @param {HTMLElement} element - Das DOM-Element des Handelspostens.
     * @param {number} slotIndex - Der Index des Bauplatzes des Handelspostens.
     */
    constructor(element, slotIndex) {
        this.element = element;
        this.slotIndex = slotIndex;
        this.sellPrice = CONFIG.TradePost.baseValuePerGood;
        this.traderSpeed = CONFIG.TradePost.traderSpeed;
        this.priceUpgradeCost = CONFIG.TradePost.initialPriceUpgradeCost;
        this.speedUpgradeCost = CONFIG.TradePost.initialSpeedUpgradeCost;
        this.lastTraderSpawnTime = Date.now();
        log('TradePost created.');
    }

    /**
     * Führt das Preis-Upgrade für diesen Handelsposten durch.
     */
    upgradePrice() {
        this.sellPrice += CONFIG.TradePost.priceUpgradeIncrease;
        this.priceUpgradeCost = Math.ceil(this.priceUpgradeCost * CONFIG.TradePost.priceUpgradeCostMultiplier);
        log(`TradePost price upgraded to: ${this.sellPrice}. New cost: ${this.priceUpgradeCost}`);
    }

    /**
     * Führt das Geschwindigkeits-Upgrade für diesen Handelsposten durch.
     */
    upgradeSpeed() {
        this.traderSpeed += CONFIG.TradePost.speedUpgradeIncrease;
        this.speedUpgradeCost = Math.ceil(this.speedUpgradeCost * CONFIG.TradePost.speedUpgradeCostMultiplier);
        log(`TradePost speed upgraded to: ${this.traderSpeed}. New cost: ${this.speedUpgradeCost}`);
    }
}