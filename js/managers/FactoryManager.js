// js/managers/FactoryManager.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung
import { Factory } from '../entities/Factory.js'; // Pfadanpassung

class FactoryManager {
    constructor() {
        this.factories = [];
        this.gameContainer = null;
        this.gameManager = null; // Referenz zum GameManager
        this.ui = null; // Referenz zur UI

        log('FactoryManager initialized.');
    }

    /**
     * Initialisiert den FactoryManager.
     * @param {HTMLElement} gameContainer - Der Haupt-Spiel-Container.
     * @param {GameManager} gameManager - Instanz des GameManager.
     * @param {UI} ui - Instanz der UI.
     */
    init(gameContainer, gameManager, ui) {
        this.gameContainer = gameContainer;
        this.gameManager = gameManager;
        this.ui = ui;
        this.gameManager.setFactoryManager(this); // Sich selbst beim GameManager registrieren
    }

    /**
     * Fügt Event Listener zu den Fabrik-Bauplätzen hinzu.
     */
    initializePlotListeners() {
        this.ui.elements.buildPlotElements.forEach(plot => {
            plot.addEventListener('click', () => this.ui.showBuildMenu(parseInt(plot.dataset.slotIndex), this.gameManager));
        });
        log('Build plot event listeners added.');
    }

    /**
     * Baut eine neue Fabrik an einem bestimmten Slot.
     */
    buildFactory() {
        const slotIndex = this.ui.currentSlotIndex;
        if (slotIndex === -1) return;

        const targetPlot = document.getElementById(`build-plot-${slotIndex}`);
        if (!targetPlot) {
            log(`[ERROR] FactoryManager.buildFactory: Target plot build-plot-${slotIndex} not found!`);
            return;
        }

        const hasFactoryInSlot = this.factories.some(f => f.slotIndex === slotIndex);

        if (this.gameManager.getScore() >= CONFIG.Factories.buildCost && !hasFactoryInSlot) {
            this.gameManager.updateScore(-CONFIG.Factories.buildCost);
            this.ui.hideBuildMenu();

            const factoryElement = document.createElement('div');
            factoryElement.classList.add('factory');

            const progressBar = document.createElement('div');
            progressBar.classList.add('factory-progress-bar');
            const progressFill = document.createElement('div');
            progressFill.classList.add('factory-progress-fill');
            progressBar.appendChild(progressFill);
            factoryElement.appendChild(progressBar);

            targetPlot.parentNode.replaceChild(factoryElement, targetPlot);

            const newFactory = new Factory(factoryElement, slotIndex);
            this.factories.push(newFactory);

            factoryElement.addEventListener('click', () => {
                this.ui.currentSelectedFactory = newFactory; // Setze die ausgewählte Fabrik in der UI
                this.ui.showFactoryUpgradeMenu(newFactory);
                this.gameManager.checkButtonStates(); // Buttons im Upgrade-Menü aktualisieren
            });

            this.checkFactoryProduction();
            this.gameManager.checkButtonStates();
            log(`Factory built in slot ${newFactory.slotIndex}.`);
        } else {
            log("Cannot build factory: Not enough score or slot occupied.");
        }
    }

    /**
     * Überprüft und startet/pausiert die Produktion aller Fabriken basierend auf Lagerbeständen.
     */
    checkFactoryProduction() {
        this.factories.forEach(factory => {
            const requiredStorage = CONFIG.Factories.storageConsumption;
            const potentialGoods = Math.round(factory.yield * factory.yieldMultiplier);

            // Prüfe, ob die Fabrik die Produktion starten kann
            if (!factory.productionInterval &&
                this.gameManager.getCurrentStorage() >= requiredStorage &&
                this.gameManager.getCurrentGoods() + potentialGoods <= this.gameManager.getMaxGoods()) {
                factory.startProduction(this.gameManager, this.ui);
            }
            // Die Logik zum Pausieren ist bereits in der Factory-Klasse selbst implementiert
            // (im setInterval-Callback), die dann checkFactoryProduction erneut aufruft.
        });
    }

    /**
     * Upgraded den Ertrag der aktuell ausgewählten Fabrik.
     */
    upgradeFactoryYield() {
        if (this.ui.currentSelectedFactory && this.gameManager.getScore() >= this.ui.currentSelectedFactory.yieldUpgradeCost) {
            this.gameManager.updateScore(-this.ui.currentSelectedFactory.yieldUpgradeCost);
            this.ui.currentSelectedFactory.upgradeYield();
            this.ui.updateFactoryUpgradeMenuDisplay();
            this.gameManager.checkButtonStates();
            log(`Factory yield upgraded for slot ${this.ui.currentSelectedFactory.slotIndex}.`);
        } else {
            log("Cannot upgrade factory yield: Not enough score.");
        }
    }

    /**
     * Upgraded die Geschwindigkeit der aktuell ausgewählten Fabrik.
     */
    upgradeFactorySpeed() {
        if (this.ui.currentSelectedFactory && this.gameManager.getScore() >= this.ui.currentSelectedFactory.speedUpgradeCost) {
            this.gameManager.updateScore(-this.ui.currentSelectedFactory.speedUpgradeCost);
            this.ui.currentSelectedFactory.upgradeSpeed();
            this.ui.currentSelectedFactory.startProduction(this.gameManager, this.ui); // Produktion mit neuer Geschwindigkeit neu starten
            this.ui.updateFactoryUpgradeMenuDisplay();
            this.gameManager.checkButtonStates();
            log(`Factory speed upgraded for slot ${this.ui.currentSelectedFactory.slotIndex}.`);
        } else {
            log("Cannot upgrade factory speed: Not enough score.");
        }
    }

    /**
     * Aktualisiert den Fortschrittsbalken aller Fabriken. Wird im Game Loop aufgerufen.
     */
    updateFactories() {
        this.factories.forEach(factory => {
            factory.updateProgressBar();
        });
    }

    /**
     * Aktualisiert den Zustand des Build Factory Buttons.
     * @param {number} currentScore - Aktueller Score des Spielers.
     * @param {HTMLElement} buildFactoryButton - Der Button.
     * @param {number} currentSlotIndex - Der aktuell ausgewählte Slot Index.
     */
    updateBuildButtonState(currentScore, buildFactoryButton, currentSlotIndex) {
        const hasFactoryInSlot = this.factories.some(f => f.slotIndex === currentSlotIndex);
        buildFactoryButton.disabled = currentScore < CONFIG.Factories.buildCost || hasFactoryInSlot;
        // Text-Aktualisierung findet bereits im GameManager.checkButtonStates statt
    }

    /**
     * Aktualisiert den Zustand der Upgrade-Buttons im Fabrik-Upgrade-Menü.
     * @param {number} currentScore - Aktueller Score des Spielers.
     * @param {HTMLElement} upgradeYieldButton - Button für Ertrags-Upgrade.
     * @param {HTMLElement} upgradeSpeedButton - Button für Tempo-Upgrade.
     */
    updateUpgradeMenuButtonState(currentScore, upgradeYieldButton, upgradeSpeedButton) {
        if (this.ui.currentSelectedFactory) {
            upgradeYieldButton.disabled = currentScore < this.ui.currentSelectedFactory.yieldUpgradeCost;
            upgradeSpeedButton.disabled = currentScore < this.ui.currentSelectedFactory.speedUpgradeCost;
            upgradeYieldButton.textContent = `Ertrag upgraden (Kosten: ${this.ui.currentSelectedFactory.yieldUpgradeCost})`;
            upgradeSpeedButton.textContent = `Tempo upgraden (Kosten: ${this.ui.currentSelectedFactory.speedUpgradeCost})`;
        } else {
            // Dies sollte nicht passieren, wenn das Menü richtig versteckt/angezeigt wird
            upgradeYieldButton.disabled = true;
            upgradeSpeedButton.disabled = true;
            upgradeYieldButton.textContent = `Ertrag upgraden (Kosten: N/A)`;
            upgradeSpeedButton.textContent = `Tempo upgraden (Kosten: N/A)`;
        }
    }
}

const factoryManager = new FactoryManager();
export default factoryManager;