// js/GameManager.js
import { CONFIG } from './config.js';
import { log } from './utils/Utils.js';
import LevelManager from './managers/LevelManager.js';

class GameManager {
    constructor() {
        this.score = CONFIG.Game.initialScore * LevelManager.level;
        this.currentStorage = CONFIG.Game.initialStorage;
        this.maxStorage = CONFIG.Game.initialMaxStorage;
        this.currentGoods = CONFIG.Goods.initialGoods;
        this.maxGoods = CONFIG.Goods.initialMaxGoods;

        // Referenzen auf DOM-Elemente für die Anzeige (werden in init gesetzt)
        this.scoreDisplay = null;
        this.storageDisplay = null;
        this.goodsDisplay = null;
        this.storageFill = null;
        this.goodsFill = null;

        // Referenz auf die UI-Instanz
        this.ui = null;

        // Referenzen auf alle Spielobjekt-Manager
        this.planetManager = null;
        this.collectorManager = null;
        this.factoryManager = null;
        this.tradeManager = null;

        log('GameManager initialized.');
    }

    /**
     * Initialisiert den GameManager mit den notwendigen DOM-Referenzen und der UI-Instanz.
     * @param {HTMLElement} scoreDisplay - Das Element für die Score-Anzeige.
     * @param {HTMLElement} storageDisplay - Das Element für die Lageranzeige.
     * @param {HTMLElement} goodsDisplay - Das Element für die Güteranzeige.
     * @param {HTMLElement} storageFill - Das Element für die Füllanzeige des Lagers.
     * @param {HTMLElement} goodsFill - Das Element für die Füllanzeige der Güter.
     * @param {UI} ui - Die Instanz der UI-Klasse.
     */
    init(scoreDisplay, storageDisplay, goodsDisplay, storageFill, goodsFill, ui) {
        this.scoreDisplay = scoreDisplay;
        this.storageDisplay = storageDisplay;
        this.goodsDisplay = goodsDisplay;
        this.storageFill = storageFill;
        this.goodsFill = goodsFill;
        this.ui = ui;

        // Startwerte basierend auf aktuellem Level
        this.score = CONFIG.Game.initialScore * LevelManager.level;
        this.currentStorage = CONFIG.Game.initialStorage;
        this.maxStorage = CONFIG.Game.initialMaxStorage;
        this.currentGoods = CONFIG.Goods.initialGoods;
        this.maxGoods = CONFIG.Goods.initialMaxGoods;

        // Initialisiere Anzeigen
        this.updateScore(0);
        this.updateStorage(0);
        this.updateGoods(0);
        this.checkButtonStates();
    }

    /**
     * Setzt die Referenzen zu anderen Managern. Wird von main.js aufgerufen.
     * @param {PlanetManager} planetManager
     * @param {CollectorManager} collectorManager
     * @param {FactoryManager} factoryManager
     * @param {TradeManager} tradeManager
     */
    setManagers(planetManager, collectorManager, factoryManager, tradeManager) {
        this.planetManager = planetManager;
        this.collectorManager = collectorManager;
        this.factoryManager = factoryManager;
        this.tradeManager = tradeManager;
    }

    /**
     * Registriert den PlanetManager.
     * @param {import('./managers/PlanetManager.js').default} manager
     */
    setPlanetManager(manager) { this.planetManager = manager; }

    /**
     * Registriert den CollectorManager.
     * @param {import('./managers/CollectorManager.js').default} manager
     */
    setCollectorManager(manager) { this.collectorManager = manager; }

    /**
     * Registriert den FactoryManager.
     * @param {import('./managers/FactoryManager.js').default} manager
     */
    setFactoryManager(manager) { this.factoryManager = manager; }

    /**
     * Registriert den TradeManager.
     * @param {import('./managers/TradeManager.js').default} manager
     */
    setTradeManager(manager) { this.tradeManager = manager; }

    /**
     * Aktualisiert den Score des Spielers.
     * @param {number} amount - Der Betrag, um den der Score geändert werden soll.
     */
    updateScore(amount) {
        this.score = Math.round(this.score + amount);
        this.scoreDisplay.textContent = `Score: ${this.score}`;
        this.checkButtonStates();
        log(`Score updated: ${amount}, new score: ${this.score}`);
    }

    /**
     * Aktualisiert die aktuelle Lagermenge.
     * @param {number} amount - Der Betrag, um den das Lager geändert werden soll.
     */
    updateStorage(amount) {
        this.currentStorage = Math.min(this.maxStorage, this.currentStorage + amount);
        this.storageDisplay.textContent = `Lager: ${this.currentStorage} / ${this.maxStorage}`;
        if (this.storageFill) {
            this.storageFill.style.width = `${(this.currentStorage / this.maxStorage) * 100}%`;
        }
        if (this.factoryManager) {
            this.factoryManager.checkFactoryProduction();
        }
        this.checkButtonStates();
        log(`Storage updated: ${amount}, new storage: ${this.currentStorage}`);
    }

    /**
     * Aktualisiert die aktuelle Gütermenge.
     * @param {number} amount - Der Betrag, um den die Güter geändert werden sollen.
     */
    updateGoods(amount) {
        this.currentGoods = Math.min(this.maxGoods, this.currentGoods + amount);
        this.goodsDisplay.textContent = `Güter: ${this.currentGoods} / ${this.maxGoods}`;
        if (this.goodsFill) {
            this.goodsFill.style.width = `${(this.currentGoods / this.maxGoods) * 100}%`;
        }
        if (this.factoryManager) {
            this.factoryManager.checkFactoryProduction();
        }
        this.checkButtonStates();
        log(`Goods updated: ${amount}, new goods: ${this.currentGoods}`);
    }

    /**
     * Überprüft und aktualisiert den Zustand aller kaufbaren/upgradbaren Buttons.
     */
    checkButtonStates() {
        if (!this.ui || !this.ui.elements.buyCollectorButton) {
            log("[WARNING] GameManager.checkButtonStates: UI elements not yet available. Skipping check.");
            return;
        }

        // Delegiere die Button-Statusprüfung an die jeweiligen Manager
        // Collector Buttons
        this.ui.elements.buyCollectorButton.disabled = this.score < CONFIG.Collectors.buyCost || (this.collectorManager ? this.collectorManager.getCollectorCount() >= CONFIG.Collectors.maxDocks : true);
        this.ui.elements.buyCollectorButton.textContent = `Neuer Sammler (Kosten: ${CONFIG.Collectors.buyCost})`;

        this.ui.elements.upgradeCollectorSpeedButton.disabled = this.score < CONFIG.Collectors.speedUpgradeCost;
        this.ui.elements.upgradeCollectorSpeedButton.textContent = `Sammler Tempo (Kosten: ${CONFIG.Collectors.speedUpgradeCost})`;

        this.ui.elements.upgradeCollectorYieldButton.disabled = this.score < CONFIG.Collectors.yieldUpgradeCost;
        this.ui.elements.upgradeCollectorYieldButton.textContent = `Sammler Ertrag (Kosten: ${CONFIG.Collectors.yieldUpgradeCost})`;

        // Storage Buttons
        this.ui.elements.upgradeStorageButton.disabled = this.score < CONFIG.Storage.upgradeCost;
        this.ui.elements.upgradeStorageButton.textContent = `Lager erweitern (Kosten: ${CONFIG.Storage.upgradeCost})`;
        this.ui.elements.upgradeGoodsStorageButton.disabled = this.score < CONFIG.Goods.upgradeCost;
        this.ui.elements.upgradeGoodsStorageButton.textContent = `Güterlager erweitern (Kosten: ${CONFIG.Goods.upgradeCost})`;

        // Factory Build Button
        if (this.ui.elements.buildFactoryButton && this.factoryManager) {
            this.factoryManager.updateBuildButtonState(this.score, this.ui.elements.buildFactoryButton, this.ui.currentSlotIndex);
        }

        // Trade Post Build Button
        if (this.ui.elements.buildTradePostButton && this.tradeManager) {
            this.tradeManager.updateBuildButtonState(this.score, this.ui.elements.buildTradePostButton, this.ui.currentSlotIndex);
        }

        // Factory Upgrade Buttons
        if (this.ui.currentSelectedFactory && this.factoryManager) {
            this.factoryManager.updateUpgradeMenuButtonState(this.score, this.ui.elements.upgradeFactoryYieldButton, this.ui.elements.upgradeFactorySpeedButton);
        }

        // Trade Post Upgrade Buttons
        if (this.ui.currentSelectedTradePost && this.tradeManager) {
            this.tradeManager.updateUpgradeMenuButtonState(this.score, this.ui.elements.upgradeTradePostPriceButton, this.ui.elements.upgradeTradePostSpeedButton);
        }
        log(`Button states checked.`);
    }

    /**
     * Führt das Upgrade des Hauptlagers durch.
     */
    upgradeStorage() {
        if (this.score >= CONFIG.Storage.upgradeCost) {
            this.updateScore(-CONFIG.Storage.upgradeCost);
            this.maxStorage = Math.ceil(this.maxStorage * CONFIG.Storage.upgradeCapacityMultiplier);
            CONFIG.Storage.upgradeCost = Math.ceil(CONFIG.Storage.upgradeCost * CONFIG.Storage.upgradeCostMultiplier); // Konfiguration wird aktualisiert!
            this.updateStorage(0); // Anzeige aktualisieren
            log(`Storage upgraded. New max storage: ${this.maxStorage}`);
        } else {
            log("Cannot upgrade storage: Not enough score.");
        }
    }

    /**
     * Führt das Upgrade des Güterlagers durch.
     */
    upgradeGoodsStorage() {
        if (this.score >= CONFIG.Goods.upgradeCost) {
            this.updateScore(-CONFIG.Goods.upgradeCost);
            this.maxGoods = Math.ceil(this.maxGoods * CONFIG.Goods.upgradeCapacityMultiplier);
            CONFIG.Goods.upgradeCost = Math.ceil(CONFIG.Goods.upgradeCost * CONFIG.Goods.upgradeCostMultiplier); // Konfiguration wird aktualisiert!
            this.updateGoods(0); // Anzeige aktualisieren
            log(`Goods storage upgraded. New max goods: ${this.maxGoods}`);
        } else {
            log("Cannot upgrade goods storage: Not enough score.");
        }
    }

    // Getter für den Spielzustand
    getScore() { return this.score; }
    getCurrentStorage() { return this.currentStorage; }
    getMaxStorage() { return this.maxStorage; }
    getCurrentGoods() { return this.currentGoods; }
    getMaxGoods() { return this.maxGoods; }
}

const gameManager = new GameManager();
export default gameManager;