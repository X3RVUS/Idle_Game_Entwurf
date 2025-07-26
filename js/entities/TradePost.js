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

        // Positionseigenschaften des Handelspostens in Prozent relativ zum Game Container
        this.centerX_percent = 0;
        this.centerY_percent = 0;
        this.topLeftX_percent = 0;
        this.topLeftY_percent = 0;
        this.width_percent = 0;
        this.height_percent = 0;
        log('TradePost created.');
    }

    /**
     * Aktualisiert die gespeicherten Positionsdaten des Handelspostens.
     * @param {UI} ui - Die UI Instanz, die Hilfsfunktionen für Positionsberechnungen bereitstellt.
     */
    updatePosition(ui) {
        const { x, y, width, height } = ui.getElementTopLeftInPercent(this.element);
        const { x: centerX, y: centerY } = ui.getElementCenterInPercent(this.element);
        this.topLeftX_percent = x;
        this.topLeftY_percent = y;
        this.width_percent = width;
        this.height_percent = height;
        this.centerX_percent = centerX;
        this.centerY_percent = centerY;
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