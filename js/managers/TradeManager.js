// js/managers/TradeManager.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung
import { TradePost } from '../entities/TradePost.js'; // Pfadanpassung
import { TraderShip } from '../entities/TraderShip.js'; // Pfadanpassung

class TradeManager {
    constructor() {
        this.tradePost = null;
        this.traderShips = [];

        this.gameContainer = null;
        this.gameManager = null; // Referenz zum GameManager
        this.ui = null; // Referenz zur UI

        log('TradeManager initialized.');
    }

    /**
     * Initialisiert den TradeManager.
     * @param {HTMLElement} gameContainer - Der Haupt-Spiel-Container.
     * @param {GameManager} gameManager - Instanz des GameManager.
     * @param {UI} ui - Instanz der UI.
     */
    init(gameContainer, gameManager, ui) {
        this.gameContainer = gameContainer;
        this.gameManager = gameManager;
        this.ui = ui;
        this.gameManager.setTradeManager(this); // Sich selbst beim GameManager registrieren
    }

    /**
     * Baut den Handelsposten an seinem vorgesehenen Slot.
     */
    buildTradePost() {
        const slotIndex = this.ui.currentFactorySlotIndex; // Der UI hält den aktuell ausgewählten Slot
        if (slotIndex !== CONFIG.TradePost.slotIndex) {
            log(`[ERROR] TradeManager.buildTradePost: Attempted to build Trade Post in wrong slot: ${slotIndex}. Expected: ${CONFIG.TradePost.slotIndex}`);
            return;
        }
        if (this.tradePost !== null) {
            log("Trade Post is already built.");
            return;
        }

        const targetPlot = this.ui.elements.tradePostPlotElement;
        if (!targetPlot) {
            log("[ERROR] TradeManager.buildTradePost: Trade post plot element not found for building!");
            return;
        }

        if (this.gameManager.getScore() >= CONFIG.TradePost.buildCost) {
            this.gameManager.updateScore(-CONFIG.TradePost.buildCost);
            this.ui.hideBuildMenu();

            const tradePostElement = document.createElement('div');
            tradePostElement.classList.add('trade-post');

            targetPlot.parentNode.replaceChild(tradePostElement, targetPlot);

            this.tradePost = new TradePost(tradePostElement, CONFIG.TradePost.slotIndex);

            tradePostElement.addEventListener('click', () => {
                this.ui.showTradePostUpgradeMenu(this.tradePost);
                this.gameManager.checkButtonStates();
            });

            this.gameManager.checkButtonStates();
            log(`Trade Post built.`);
        } else {
            log("Cannot build Trade Post: Not enough score.");
        }
    }

    /**
     * Spawnt ein neues Handelsschiff.
     */
    spawnTrader() {
        if (!this.tradePost || this.gameManager.getCurrentGoods() === 0) {
            log("Cannot spawn trader: Trade Post not built or no goods available.");
            return;
        }

        const traderElement = document.createElement('div');
        traderElement.classList.add('trader-ship');

        const tradePostTopLeft = this.ui.getElementTopLeftInPercent(this.tradePost.element);
        const tradePostCenter = this.ui.getElementCenterInPercent(this.tradePost.element);

        traderElement.style.left = `110%`; // Startet rechts außerhalb des Bildschirms
        traderElement.style.top = `${tradePostTopLeft.y + (tradePostTopLeft.height / 2)}%`;

        this.gameContainer.appendChild(traderElement);

        const newTrader = new TraderShip(
            traderElement,
            110, // Start X
            tradePostTopLeft.y + (tradePostTopLeft.height / 2), // Start Y
            tradePostCenter.x, // Ziel X (Mitte des Handelspostens)
            tradePostCenter.y, // Ziel Y (Mitte des Handelspostens)
            this.gameManager.getCurrentGoods(), // Verkauft alle aktuellen Güter
            this.tradePost.traderSpeed
        );
        this.traderShips.push(newTrader);
        log(`Spawned trader. Total traders: ${this.traderShips.length}`);
    }

    /**
     * Aktualisiert den Zustand aller Handelsschiffe.
     * @param {number} deltaTime - Die vergangene Zeit seit dem letzten Frame in Millisekunden.
     */
    updateTraders(deltaTime) {
        // Händler spawnen, wenn genug Zeit vergangen ist und Güter vorhanden sind
        const currentTimeMs = Date.now();
        if (this.tradePost && this.gameManager.getCurrentGoods() > 0 && currentTimeMs - this.tradePost.lastTraderSpawnTime >= CONFIG.TradePost.traderSpawnIntervalMs) {
            this.spawnTrader();
            this.tradePost.lastTraderSpawnTime = currentTimeMs;
        }

        // Händler-Logik aktualisieren
        this.traderShips = this.traderShips.filter(trader => {
            const shouldRemove = trader.update(deltaTime, this.ui);

            // Wenn ein Händler den 'selling' Zustand erreicht, führe den Verkauf durch
            if (trader.state === 'selling') {
                const goodsSold = trader.goodsToSell;
                const scoreGained = goodsSold * this.tradePost.sellPrice;

                this.gameManager.updateGoods(-goodsSold);
                this.gameManager.updateScore(scoreGained);

                // Setze den Händler auf den 'departing'-Zustand
                trader.completeSell(goodsSold, scoreGained, trader.targetX_percent, trader.targetY_percent, this.ui);
            }
            return !shouldRemove; // Entferne den Händler nur, wenn update true zurückgibt (vollständig abgereist)
        });
    }

    /**
     * Upgraded den Verkaufspreis des Handelspostens.
     */
    upgradeTradePostPrice() {
        if (this.tradePost && this.gameManager.getScore() >= this.tradePost.priceUpgradeCost) {
            this.gameManager.updateScore(-this.tradePost.priceUpgradeCost);
            this.tradePost.upgradePrice();
            this.ui.updateTradePostUpgradeMenuDisplay();
            this.gameManager.checkButtonStates();
            log(`Trade Post price upgraded.`);
        } else {
            log("Cannot upgrade Trade Post price: Not enough score.");
        }
    }

    /**
     * Upgraded die Geschwindigkeit der Händler des Handelspostens.
     */
    upgradeTradePostSpeed() {
        if (this.tradePost && this.gameManager.getScore() >= this.tradePost.speedUpgradeCost) {
            this.gameManager.updateScore(-this.tradePost.speedUpgradeCost);
            this.tradePost.upgradeSpeed();
            this.ui.updateTradePostUpgradeMenuDisplay();
            this.gameManager.checkButtonStates();
            log(`Trade Post speed upgraded.`);
        } else {
            log("Cannot upgrade Trade Post speed: Not enough score.");
        }
    }

    /**
     * Aktualisiert den Zustand des Build Trade Post Buttons.
     * @param {number} currentScore - Aktueller Score des Spielers.
     * @param {HTMLElement} buildTradePostButton - Der Button.
     */
    updateBuildButtonState(currentScore, buildTradePostButton) {
        const hasTradePost = this.tradePost !== null;
        buildTradePostButton.disabled = currentScore < CONFIG.TradePost.buildCost || hasTradePost;
        // Text-Aktualisierung findet bereits im GameManager.checkButtonStates statt
    }

    /**
     * Aktualisiert den Zustand der Upgrade-Buttons im Handelsposten-Upgrade-Menü.
     * @param {number} currentScore - Aktueller Score des Spielers.
     * @param {HTMLElement} upgradePriceButton - Button für Preis-Upgrade.
     * @param {HTMLElement} upgradeSpeedButton - Button für Tempo-Upgrade.
     */
    updateUpgradeMenuButtonState(currentScore, upgradePriceButton, upgradeSpeedButton) {
        if (this.ui.currentSelectedTradePost) {
            upgradePriceButton.disabled = currentScore < this.ui.currentSelectedTradePost.priceUpgradeCost;
            upgradeSpeedButton.disabled = currentScore < this.ui.currentSelectedTradePost.speedUpgradeCost;
            upgradePriceButton.textContent = `Preis erhöhen (Kosten: ${this.ui.currentSelectedTradePost.priceUpgradeCost})`;
            upgradeSpeedButton.textContent = `Händler Tempo (Kosten: ${this.ui.currentSelectedTradePost.speedUpgradeCost})`;
        } else {
            upgradePriceButton.disabled = true;
            upgradeSpeedButton.disabled = true;
            upgradePriceButton.textContent = `Preis erhöhen (Kosten: N/A)`;
            upgradeSpeedButton.textContent = `Händler Tempo (Kosten: N/A)`;
        }
    }
}

const tradeManager = new TradeManager();
export default tradeManager;