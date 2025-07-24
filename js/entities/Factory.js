// js/entities/Factory.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung

export class Factory {
    /**
     * Erstellt eine Instanz einer Fabrik.
     * @param {HTMLElement} element - Das DOM-Element der Fabrik.
     * @param {number} slotIndex - Der Index des Bauplatzes der Fabrik.
     */
    constructor(element, slotIndex) {
        this.element = element;
        this.slotIndex = slotIndex;
        this.yield = CONFIG.Factories.goodsYield;
        this.yieldMultiplier = 1;
        this.speedMultiplier = 1;
        this.duration = CONFIG.Factories.baseDurationMs;
        this.yieldUpgradeCost = CONFIG.Factories.initialYieldUpgradeCost;
        this.speedUpgradeCost = CONFIG.Factories.initialSpeedUpgradeCost;
        this.productionInterval = null;
        this.productionProgressFill = element.querySelector('.factory-progress-fill');
        this.productionStartTime = 0;
    }

    /**
     * Startet oder setzt die Produktion der Fabrik fort.
     * @param {GameManager} gameManager - Instanz des GameManager.
     * @param {UI} ui - Instanz der UI.
     */
    startProduction(gameManager, ui) {
        if (this.productionInterval) {
            clearInterval(this.productionInterval);
            this.productionInterval = null;
        }

        const currentProductionDuration = CONFIG.Factories.baseDurationMs / this.speedMultiplier;
        const requiredStorage = CONFIG.Factories.storageConsumption;
        const potentialGoods = Math.round(this.yield * this.yieldMultiplier);

        // Prüfen, ob die Bedingungen für den Start der Produktion erfüllt sind
        if (gameManager.getCurrentStorage() >= requiredStorage &&
            gameManager.getCurrentGoods() + potentialGoods <= gameManager.getMaxGoods()) {

            this.productionStartTime = Date.now();

            this.productionInterval = setInterval(() => {
                // Prüfen der Bedingungen auch während der Produktion, um pausieren zu können
                if (gameManager.getCurrentStorage() >= requiredStorage &&
                    gameManager.getCurrentGoods() + potentialGoods <= gameManager.getMaxGoods()) {

                    gameManager.updateStorage(-requiredStorage);
                    gameManager.updateGoods(potentialGoods);
                    const factoryCenter = ui.getElementCenterInPercent(this.element);
                    ui.showPlusAmount(potentialGoods,
                        factoryCenter.x,
                        factoryCenter.y - (5 * ui.gameUnitPx / ui.elements.gameContainer.offsetHeight * 100),
                        'goods'
                    );
                    this.productionStartTime = Date.now(); // Zurücksetzen für den nächsten Zyklus
                } else {
                    // Produktion pausieren, wenn Bedingungen nicht mehr erfüllt sind
                    clearInterval(this.productionInterval);
                    this.productionInterval = null;
                    if (this.productionProgressFill) {
                        this.productionProgressFill.style.width = '0%';
                    }
                    log(`Factory in slot ${this.slotIndex}: Production paused (resources or goods storage full).`);
                    // Informiere den Manager, dass eine erneute Überprüfung nötig ist
                    if (gameManager.factoryManager) {
                        gameManager.factoryManager.checkFactoryProduction();
                    }
                }
            }, currentProductionDuration);
            log(`Factory production for slot ${this.slotIndex} started for ${currentProductionDuration}ms.`);
        } else {
            if (this.productionProgressFill) {
                this.productionProgressFill.style.width = '0%';
            }
            log(`Factory in slot ${this.slotIndex}: Not enough resources or goods storage full to start production.`);
        }
    }

    /**
     * Aktualisiert den Fortschrittsbalken der Fabrik.
     */
    updateProgressBar() {
        if (this.productionInterval) {
            const elapsedTime = Date.now() - this.productionStartTime;
            const currentProductionDuration = CONFIG.Factories.baseDurationMs / this.speedMultiplier;
            const progress = Math.min(1, elapsedTime / currentProductionDuration);
            if (this.productionProgressFill) {
                this.productionProgressFill.style.width = `${progress * 100}%`;
            }
        } else if (this.productionProgressFill) {
            this.productionProgressFill.style.width = '0%';
        }
    }

    /**
     * Führt das Ertrags-Upgrade für diese Fabrik durch.
     */
    upgradeYield() {
        this.yieldMultiplier = Math.round((this.yieldMultiplier + CONFIG.Factories.yieldUpgradeIncrease) * 10) / 10;
        this.yieldUpgradeCost = Math.ceil(this.yieldUpgradeCost * CONFIG.Factories.yieldUpgradeCostMultiplier);
        log(`Factory in slot ${this.slotIndex} yield upgraded to: ${this.yield * this.yieldMultiplier}. New cost: ${this.yieldUpgradeCost}`);
    }

    /**
     * Führt das Geschwindigkeits-Upgrade für diese Fabrik durch.
     */
    upgradeSpeed() {
        this.speedMultiplier = Math.round((this.speedMultiplier + CONFIG.Factories.speedUpgradeIncrease) * 10) / 10;
        this.speedUpgradeCost = Math.ceil(this.speedUpgradeCost * CONFIG.Factories.speedUpgradeCostMultiplier);
        log(`Factory in slot ${this.slotIndex} speed upgraded to: ${this.speedMultiplier}. New cost: ${this.speedUpgradeCost}`);
    }
}