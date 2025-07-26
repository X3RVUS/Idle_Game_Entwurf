// js/UI.js
import { CONFIG } from './config.js';
import { log } from './utils/Utils.js';

class UI {
    constructor() {
        this.elements = {}; // Speichert alle DOM-Element-Referenzen
        this.gameUnitPx = 1; // 1 game unit in Pixeln (wird dynamisch gesetzt)
        this.currentSlotIndex = -1; // Für Build Menu Logic
        this.currentSelectedFactory = null; // Aktuell ausgewähltes Fabrikobjekt für Upgrade-Menü
        this.currentSelectedTradePost = null; // Aktuell ausgewähltes Handelspostenobjekt für Upgrade-Menü

        // Binden der Methoden an 'this', damit sie als Event Listener funktionieren
        this.handleZoom = this.handleZoom.bind(this);
        this.updateGameUnit = this.updateGameUnit.bind(this);

        log('UI Manager initialized.');
    }

    /**
     * Weist alle benötigten DOM-Elemente zu.
     */
    initDOMElements() {
        this.elements.gameContainer = document.getElementById('game-container');
        this.elements.planetsContainer = document.getElementById('planets-container');
        this.elements.miningBase = document.getElementById('mining-base');
        this.elements.storageArea = document.getElementById('storage-area');
        this.elements.storageFill = document.getElementById('storage-fill');

        this.elements.scoreDisplay = document.getElementById('score-display');
        this.elements.collectorCountDisplay = document.getElementById('collector-count-display');
        this.elements.storageDisplay = document.getElementById('storage-display');

        this.elements.goodsDisplay = document.getElementById('goods-display');
        this.elements.goodsArea = document.getElementById('goods-area');
        this.elements.goodsFill = document.getElementById('goods-fill');
        this.elements.upgradeGoodsStorageButton = document.getElementById('upgrade-goods-storage-button');
        this.elements.nextLevelButton = document.getElementById('next-level-button');

        this.elements.buyCollectorButton = document.getElementById('buy-collector-button');
        this.elements.upgradeCollectorSpeedButton = document.getElementById('upgrade-collector-speed-button');
        this.elements.upgradeStorageButton = document.getElementById('upgrade-storage-button');
        this.elements.upgradeCollectorYieldButton = document.getElementById('upgrade-collector-yield-button');

        this.elements.buildPlotElements = [];

        this.elements.buildMenu = document.getElementById('build-menu');
        this.elements.buildFactoryButton = document.getElementById('build-factory-button');
        this.elements.buildTradePostButton = document.getElementById('build-trade-post-button');
        this.elements.closeBuildMenuButton = document.getElementById('close-build-menu-button');

        this.elements.factoryUpgradeMenu = document.getElementById('factory-upgrade-menu');
        this.elements.upgradeFactoryYieldButton = document.getElementById('upgrade-factory-yield-button');
        this.elements.upgradeFactorySpeedButton = document.getElementById('upgrade-factory-speed-button');
        this.elements.closeFactoryUpgradeMenuButton = document.getElementById('close-factory-upgrade-menu-button');
        this.elements.factoryUpgradeStatusDisplay = document.getElementById('factory-upgrade-status');

        this.elements.tradePostUpgradeMenu = document.getElementById('trade-post-upgrade-menu');
        this.elements.upgradeTradePostPriceButton = document.getElementById('upgrade-trade-post-price-button');
        this.elements.upgradeTradePostSpeedButton = document.getElementById('upgrade-trade-post-speed-button');
        this.elements.closeTradePostUpgradeMenuButton = document.getElementById('close-trade-post-upgrade-menu-button');
        this.elements.tradePostUpgradeStatusDisplay = document.getElementById('trade-post-upgrade-status');

        log('All DOM elements assigned in UI.');
    }

    refreshBuildPlotElements() {
        this.elements.buildPlotElements = Array.from(
            this.elements.miningBase.querySelectorAll('.build-plot')
        );
    }

    /**
     * Aktualisiert die gerenderten Pixel-Positionen und -Größen der dynamischen DOM-Elemente.
     * @param {Array<object>} planets - Array von Planetenobjekten mit einem 'element' Property.
     * @param {HTMLElement} miningBaseElement - Das DOM-Element der Mining Base.
     */
    updateRenderedElementPositions(planets, miningBaseElement) {
        if (!this.elements.gameContainer || !this.elements.gameContainer.offsetWidth) {
            return;
        }

        // Diese Werte direkt in UI speichern, da sie oft benötigt werden
        const containerRect = this.elements.gameContainer.getBoundingClientRect();
        const baseRect = miningBaseElement.getBoundingClientRect();

        this.elements.miningBaseRenderedWidth = baseRect.width;
        this.elements.miningBaseRenderedHeight = baseRect.height;
        this.elements.miningBaseRenderedX = (baseRect.left - containerRect.left) + baseRect.width / 2;
        this.elements.miningBaseRenderedY = (baseRect.top - containerRect.top) + baseRect.height / 2;

        planets.forEach(p => {
            const planetElement = p.element;
            if (planetElement && planetElement.offsetWidth) {
                const rect = planetElement.getBoundingClientRect();
                p.renderedX = (rect.left - containerRect.left) + rect.width / 2;
                p.renderedY = (rect.top - containerRect.top) + rect.height / 2;
                p.renderedRadius = rect.width / 2;
            }
        });
    }

    /**
     * Aktualisiert die CSS-Variable --game-unit basierend auf der Fenstergröße.
     */
    updateGameUnit() {
        if (!this.elements.gameContainer || !this.elements.gameContainer.offsetWidth || !this.elements.gameContainer.offsetHeight) {
            log("[WARNING] UI.updateGameUnit: gameContainer not yet available or has no dimensions.");
            return;
        }
        const minDim = Math.min(this.elements.gameContainer.offsetWidth, this.elements.gameContainer.offsetHeight);
        this.gameUnitPx = minDim / 100;

        this.gameUnitPx = Math.max(
            CONFIG.Game.gameUnitMinScale,
            Math.min(this.gameUnitPx, CONFIG.Game.gameUnitMaxScale)
        );

        document.documentElement.style.setProperty('--game-unit', `${this.gameUnitPx}px`);
        log(`[CSS] --game-unit set to: ${this.gameUnitPx}px (Container: ${this.elements.gameContainer.offsetWidth}x${this.elements.gameContainer.offsetHeight})`);
    }

    /**
     * Berechnet die prozentuale Mittelposition eines Elements relativ zum Game Container.
     * @param {HTMLElement} element - Das HTML-Element.
     * @returns {{x: number, y: number}} - Die X- und Y-Koordinate in Prozent.
     */
    getElementCenterInPercent(element) {
        if (!element || !element.offsetWidth || !this.elements.gameContainer.offsetWidth) {
            log(`[WARNING] UI.getElementCenterInPercent: Element not available or container not rendered. Element: ${element ? element.id : 'N/A'}`);
            return { x: 0, y: 0 };
        }

        const containerRect = this.elements.gameContainer.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const x = ((rect.left - containerRect.left) + rect.width / 2) / containerRect.width * 100;
        const y = ((rect.top - containerRect.top) + rect.height / 2) / containerRect.height * 100;

        return { x, y };
    }

    /**
     * Berechnet die prozentuale Top-Left-Position und Größe eines Elements relativ zum Game Container.
     * @param {HTMLElement} element - Das HTML-Element.
     * @returns {{x: number, y: number, width: number, height: number}} - Position und Größe in Prozent.
     */
    getElementTopLeftInPercent(element) {
        if (!element || !element.offsetWidth || !this.elements.gameContainer.offsetWidth) {
            log(`[WARNING] UI.getElementTopLeftInPercent: Element not available or container not rendered. Element: ${element ? element.id : 'N/A'}`);
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        const containerRect = this.elements.gameContainer.getBoundingClientRect();
        const rect = element.getBoundingClientRect();

        const x = (rect.left - containerRect.left) / containerRect.width * 100;
        const y = (rect.top - containerRect.top) / containerRect.height * 100;
        const width = rect.width / containerRect.width * 100;
        const height = rect.height / containerRect.height * 100;

        return { x, y, width, height };
    }

    /**
     * Berechnet die prozentuale Top-Left-Position und Größe der Mining Base.
     * @returns {{x: number, y: number, width: number, height: number}} - Position und Größe in Prozent.
     */
    getMiningBaseTopLeft() {
        return this.getElementTopLeftInPercent(this.elements.miningBase);
    }

    /**
     * Berechnet die prozentuale Mittelposition der Mining Base.
     * @returns {{x: number, y: number}} - Die X- und Y-Koordinate in Prozent.
     */
    getMiningBaseCenter() {
        return this.getElementCenterInPercent(this.elements.miningBase);
    }

    /**
     * Zeigt das Build-Menü an einem bestimmten Slot an.
     * @param {number} slotIndex - Der Index des Slots.
     * @param {GameManager} gameManager - Instanz des GameManager.
     */
    showBuildMenu(slotIndex, gameManager) {
        this.currentSlotIndex = slotIndex;
        this.elements.buildMenu.classList.remove('hidden');
        if (this.elements.buildFactoryButton) this.elements.buildFactoryButton.classList.remove('hidden');
        if (this.elements.buildTradePostButton) this.elements.buildTradePostButton.classList.remove('hidden');
        gameManager.checkButtonStates(); // Buttons im Build-Menü aktualisieren
        log(`Showing build menu for slot ${slotIndex}`);
    }

    /**
     * Verbirgt das Build-Menü.
     */
    hideBuildMenu() {
        this.elements.buildMenu.classList.add('hidden');
        this.currentSlotIndex = -1;
        log('Build menu hidden.');
    }

    /**
     * Zeigt das Upgrade-Menü für Fabriken an.
     * @param {Factory} factory - Das Fabrik-Objekt, das ausgewählt wurde.
     */
    showFactoryUpgradeMenu(factory) {
        this.currentSelectedFactory = factory;
        this.elements.factoryUpgradeMenu.classList.remove('hidden');
        this.updateFactoryUpgradeMenuDisplay();
    }

    /**
     * Verbirgt das Upgrade-Menü für Fabriken.
     */
    hideFactoryUpgradeMenu() {
        this.elements.factoryUpgradeMenu.classList.add('hidden');
        this.currentSelectedFactory = null;
    }

    /**
     * Aktualisiert die Anzeige des Fabrik-Upgrade-Menüs.
     */
    updateFactoryUpgradeMenuDisplay() {
        if (this.currentSelectedFactory) {
            const yieldText = `Ertrag: ${Math.round(this.currentSelectedFactory.yield * this.currentSelectedFactory.yieldMultiplier)} Güter`;
            const speedText = `Tempo: ${Math.round(CONFIG.Factories.baseDurationMs / this.currentSelectedFactory.speedMultiplier / 1000 * 10) / 10}s`;
            this.elements.factoryUpgradeStatusDisplay.textContent = `${yieldText}, ${speedText}`;
        }
    }

    /**
     * Zeigt das Upgrade-Menü für Handelsposten an.
     * @param {TradePost} tradePost - Das Handelsposten-Objekt.
     */
    showTradePostUpgradeMenu(tradePost) {
        this.currentSelectedTradePost = tradePost;
        this.elements.tradePostUpgradeMenu.classList.remove('hidden');
        this.updateTradePostUpgradeMenuDisplay();
    }

    /**
     * Verbirgt das Upgrade-Menü für Handelsposten.
     */
    hideTradePostUpgradeMenu() {
        this.elements.tradePostUpgradeMenu.classList.add('hidden');
        this.currentSelectedTradePost = null;
    }

    /**
     * Aktualisiert die Anzeige des Handelsposten-Upgrade-Menüs.
     */
    updateTradePostUpgradeMenuDisplay() {
        if (this.currentSelectedTradePost) {
            const priceText = `Verkaufspreis: ${this.currentSelectedTradePost.sellPrice} Score/Gut`;
            const speedText = `Händler Tempo: ${Math.round(this.currentSelectedTradePost.traderSpeed * 10) / 10}x`;
            this.elements.tradePostUpgradeStatusDisplay.textContent = `${priceText}, ${speedText}`;
        }
    }

    /**
     * Fügt Zoom-Funktionalität hinzu.
     * @param {WheelEvent} event - Das Mausrad-Event.
     */
    handleZoom(event) {
        event.preventDefault();
        const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
        this.elements.gameContainer.style.transform = `scale(${zoomFactor})`;
    }

    /**
     * Zeigt einen schwebenden Betrag an (z.B. +Score, +Güter).
     * @param {number} amount - Der anzuzeigende Betrag.
     * @param {number} x_percent - X-Position in Prozent.
     * @param {number} y_percent - Y-Position in Prozent.
     * @param {'score'|'goods'} type - Der Typ des Betrags (bestimmt die CSS-Klasse).
     */
    showPlusAmount(amount, x_percent, y_percent, type = 'score') {
        const pulse = document.createElement('div');
        pulse.classList.add(type === 'score' ? 'score-pulse' : 'goods-pulse');
        pulse.textContent = `+${amount}`;
        pulse.style.left = `${x_percent}%`;
        pulse.style.top = `${y_percent}%`;
        this.elements.gameContainer.appendChild(pulse);
        pulse.addEventListener('animationend', () => pulse.remove());
        log(`Showing +${amount} pulse at ${x_percent}%, ${y_percent}% (type: ${type})`);
    }
}

const ui = new UI();
export default ui;