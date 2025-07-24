// js/main.js
import { CONFIG } from './config.js';
import { log, checkInitialLoad } from './utils/Utils.js';
import GameManager from './GameManager.js';
import UI from './UI.js';
import PlanetManager from './managers/PlanetManager.js';
import CollectorManager from './managers/CollectorManager.js';
import FactoryManager from './managers/FactoryManager.js';
import TradeManager from './managers/TradeManager.js';

// Globale DOM-Elemente für den Initialisierungscheck
let gameContainerForLoadCheck;
let planetsContainerForLoadCheck;
let miningBaseForLoadCheck;

// Haupt-Game-Loop-Variable
let lastFrameTime = 0;

/**
 * Der Haupt-Game-Loop, der bei jedem Frame aufgerufen wird.
 * @param {DOMHighResTimeStamp} currentTime - Die aktuelle Zeit in Millisekunden.
 */
function gameLoop(currentTime) {
    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    UI.updateGameUnit();
    // ui.elements.miningBase ist schon in UI.js zugewiesen
    UI.updateRenderedElementPositions(PlanetManager.getPlanets(), UI.elements.miningBase);

    CollectorManager.updateCollectors(deltaTime);
    FactoryManager.updateFactories();
    TradeManager.updateTraders(deltaTime);

    requestAnimationFrame(gameLoop);
}

/**
 * Führt die eigentliche Initialisierung des Spiels durch.
 */
function performInit() {
    log('Starting game initialization (performInit)...');

    // UI-Elemente zuweisen (UI.js kümmert sich um document.getElementById)
    UI.initDOMElements();

    // GameManager mit den benötigten UI-Referenzen initialisieren
    GameManager.init(
        UI.elements.scoreDisplay,
        UI.elements.storageDisplay,
        UI.elements.goodsDisplay,
        UI.elements.storageFill,
        UI.elements.goodsFill,
        UI
    );

    // Initialisiere die Manager und übergebe Referenzen
    PlanetManager.init(UI.elements.planetsContainer, GameManager, UI);
    CollectorManager.init(UI.elements.gameContainer, GameManager, UI, PlanetManager);
    FactoryManager.init(UI.elements.gameContainer, GameManager, UI);
    TradeManager.init(UI.elements.gameContainer, GameManager, UI);


    // Initialisiere Planeten
    PlanetManager.initializePlanets();

    // Initialisiere Sammler
    for (let i = 0; i < CONFIG.Collectors.initialCount; i++) {
        CollectorManager.addCollectorShip();
    }
    // Weise initialen Sammlern Ziele zu
    CollectorManager.reassignIdleCollectors();

    // Füge Event Listener für Buttons hinzu
    UI.elements.buyCollectorButton.addEventListener('click', () => CollectorManager.buyCollector());
    UI.elements.upgradeCollectorSpeedButton.addEventListener('click', () => CollectorManager.upgradeCollectorSpeed());
    UI.elements.upgradeCollectorYieldButton.addEventListener('click', () => CollectorManager.upgradeCollectorYield());
    UI.elements.upgradeStorageButton.addEventListener('click', () => GameManager.upgradeStorage());
    UI.elements.upgradeGoodsStorageButton.addEventListener('click', () => GameManager.upgradeGoodsStorage());

    // Fabrik und Handelsposten Bau/Upgrade Listener
    FactoryManager.initializePlotListeners();
    // Der Handelsposten-Plot-Listener ist Teil des TradeManager
    if (UI.elements.tradePostPlotElement) {
        UI.elements.tradePostPlotElement.addEventListener('click', () => UI.showBuildMenu(CONFIG.TradePost.slotIndex, 'tradePost', GameManager));
    }

    // Build Menu Buttons
    UI.elements.buildFactoryButton.addEventListener('click', () => FactoryManager.buildFactory());
    UI.elements.buildTradePostButton.addEventListener('click', () => TradeManager.buildTradePost());
    UI.elements.closeBuildMenuButton.addEventListener('click', () => UI.hideBuildMenu());

    // Factory Upgrade Menu Buttons
    UI.elements.closeFactoryUpgradeMenuButton.addEventListener('click', () => UI.hideFactoryUpgradeMenu());
    UI.elements.upgradeFactoryYieldButton.addEventListener('click', () => FactoryManager.upgradeFactoryYield());
    UI.elements.upgradeFactorySpeedButton.addEventListener('click', () => FactoryManager.upgradeFactorySpeed());

    // Trade Post Upgrade Menu Buttons
    UI.elements.closeTradePostUpgradeMenuButton.addEventListener('click', () => UI.hideTradePostUpgradeMenu());
    UI.elements.upgradeTradePostPriceButton.addEventListener('click', () => TradeManager.upgradeTradePostPrice());
    UI.elements.upgradeTradePostSpeedButton.addEventListener('click', () => TradeManager.upgradeTradePostSpeed());

    // Zoom-Funktionalität
    UI.elements.gameContainer.addEventListener('wheel', UI.handleZoom);
    window.addEventListener('resize', () => UI.updateGameUnit());

    // Initialen Button-Zustand setzen
    GameManager.checkButtonStates();

    log('Starting game loop...');
    requestAnimationFrame(gameLoop); // Game Loop starten
}

// Robusterer Start-Check
function initialLoadCheckWrapper() {
    log("Running checkInitialLoad (wrapper)...");
    // Zuweisung hier für den initialen Check
    gameContainerForLoadCheck = document.getElementById('game-container');
    planetsContainerForLoadCheck = document.getElementById('planets-container');
    miningBaseForLoadCheck = document.getElementById('mining-base');

    checkInitialLoad(
        gameContainerForLoadCheck,
        planetsContainerForLoadCheck,
        miningBaseForLoadCheck,
        performInit
    );
}

// Führt die Initialisierung aus, sobald der DOM vollständig geladen ist
window.addEventListener('load', initialLoadCheckWrapper);// Debugging-Funktion, um den aktuellen Zustand der UI-Elemente zu überprüfen
function debugUIElements() {
    log("Debugging UI Elements:");
    for (const key in UI.elements) {
        if (UI.elements.hasOwnProperty(key)) {
            const element = UI.elements[key];
            if (element instanceof HTMLElement) {
                log(`  ${key}: ID='${element.id}', Class='${element.className}', Display='${element.style.display}', Hidden=${element.classList.contains('hidden')}`);
            } else if (Array.isArray(element)) {
                log(`  ${key}: Array with ${element.length} elements.`);
            } else {
                log(`  ${key}: ${element}`);
            }
        }
    }
}

// Optional: Debugging nach einer kurzen Verzögerung nach dem Start
// setTimeout(debugUIElements, 2000);
