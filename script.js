// --- Konfiguration importieren ---
import { CONFIG } from './config.js';

// --- Debug-Logging Funktion ---
function log(message, ...args) {
    if (typeof CONFIG !== 'undefined' && CONFIG.Game && CONFIG.Game.debugMode) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('de-DE', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[${timestamp}] ${message}`, ...args);
    } else if (typeof CONFIG === 'undefined') {
        console.log(`[PRE-CONFIG LOG] ${message}`, ...args);
    }
}

log("Script loaded. Logging enabled if debugMode is true in config.js.");

// --- Globale DOM-Element Referenzen (werden in performInit zugewiesen) ---
// Wichtig: Nur Deklarieren. Zuweisung mit document.getElementById() erfolgt in performInit().
let gameContainer;
let planetsContainer;
let miningBase;
let storageArea;
let storageFill;

let scoreDisplay;
let collectorCountDisplay;
let storageDisplay;

let goodsDisplay;
let goodsArea;
let goodsFill;
let upgradeGoodsStorageButton;

let buyCollectorButton;
let upgradeCollectorSpeedButton;
let upgradeStorageButton;
let upgradeCollectorYieldButton;

let factoryPlotElements = [];
let tradePostPlotElement;

let buildMenu;
let buildFactoryButton;
let buildTradePostButton;
let closeBuildMenuButton;

let factoryUpgradeMenu;
let upgradeFactoryYieldButton;
let upgradeFactorySpeedButton;
let closeFactoryUpgradeMenuButton;
let factoryUpgradeStatusDisplay;

let tradePostUpgradeMenu;
let upgradeTradePostPriceButton;
let upgradeTradePostSpeedButton;
let closeTradePostUpgradeMenuButton;
let tradePostUpgradeStatusDisplay;

let miningBaseRenderedWidth = 0;
let miningBaseRenderedHeight = 0;
let miningBaseRenderedX = 0;
let miningBaseRenderedY = 0;

// --- Variablen ---
let score = CONFIG.Game.initialScore;
let collectors = [];
let collectorBaseSpeed = CONFIG.Collectors.baseSpeed;
let collectorBaseYield = CONFIG.Collectors.baseYield;
let collectorYieldMultiplier = 1;

let buyCollectorCost = CONFIG.Collectors.buyCost;
let collectorSpeedUpgradeCost = CONFIG.Collectors.speedUpgradeCost;
let collectorYieldUpgradeCost = CONFIG.Collectors.yieldUpgradeCost;

let currentStorage = CONFIG.Game.initialStorage;
let maxStorage = CONFIG.Game.initialMaxStorage;
let storageUpgradeCost = CONFIG.Storage.upgradeCost;

let currentGoods = CONFIG.Goods.initialGoods;
let maxGoods = CONFIG.Goods.initialMaxGoods;
let goodsUpgradeCost = CONFIG.Goods.upgradeCost; // Korrigiert

let gameUnitPx = 1; // 1 game unit in Pixeln (wird dynamisch gesetzt)


let planets = [];

const STATE_RETURNING_TO_SOURCE = 'returningToSource';
const STATE_MINING = 'mining';
const STATE_RETURNING_TO_BASE = 'returningToBase';
const STATE_DELIVERING = 'delivering';
const STATE_IDLE_NO_PLANETS = 'idleNoPlanets';

let factories = [];
let currentSelectedFactory = null;
let currentFactorySlotIndex = -1;
let currentSelectedTradePost = null;

let tradePost = null;
let traderShips = [];
let lastTraderSpawnTime = 0;


// --- Helper-Funktionen (Definieren Sie diese vor ihrer Verwendung!) ---

// NEU: updateRenderedElementPositions Funktion wieder hinzugefügt
// Diese Funktion erfasst die aktuellen Pixel-Positionen und -Größen der dynamischen DOM-Elemente.
// Sie ist entscheidend, da CSS-Werte (vmin, %) erst zur Laufzeit in Pixel umgerechnet werden.
function updateRenderedElementPositions() {
    // Sicherstellen, dass gameContainer und andere Kernelemente schon im DOM existieren
    // und Dimensionen haben. Dies wird durch checkInitialLoad() vorperformInit() gewährleistet.
    if (!gameContainer || !gameContainer.offsetWidth) {
        // log("[WARNING] updateRenderedElementPositions: gameContainer not ready.");
        return;
    }

    // Aktualisiere die Referenzen auf die gerenderten Größen und Positionen (in Pixeln)
    miningBaseRenderedWidth = miningBase.offsetWidth;
    miningBaseRenderedHeight = miningBase.offsetHeight;

    miningBaseRenderedX = miningBase.offsetLeft + miningBaseRenderedWidth / 2;
    miningBaseRenderedY = miningBase.offsetTop + miningBaseRenderedHeight / 2;

    // Für Planeten müssen wir ihre individuellen gerenderten Positionen aktualisieren
    planets.forEach(p => {
        const planetElement = p.element;
        if (planetElement && planetElement.offsetWidth) { // Prüfen, ob Planet-Element existiert und gerendert ist
            p.renderedX = planetElement.offsetLeft + planetElement.offsetWidth / 2;
            p.renderedY = planetElement.offsetTop + planetElement.offsetHeight / 2;
            p.renderedRadius = planetElement.offsetWidth / 2;
        }
    });
}

function updateGameUnit() {
    if (!gameContainer || !gameContainer.offsetWidth || !gameContainer.offsetHeight) {
        log("[WARNING] updateGameUnit: gameContainer not yet available or has no dimensions.");
        return;
    }
    const minDim = Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight);
    gameUnitPx = minDim / 100;

    gameUnitPx = Math.max(
        CONFIG.Game.gameUnitMinScale,
        Math.min(gameUnitPx, CONFIG.Game.gameUnitMaxScale)
    );

    document.documentElement.style.setProperty('--game-unit', `${gameUnitPx}px`);
    log(`[CSS] --game-unit set to: ${gameUnitPx}px (Container: ${gameContainer.offsetWidth}x${gameContainer.offsetHeight})`);
}

function getElementCenterInPercent(element) {
    if (!element || !element.offsetWidth || !gameContainer.offsetWidth) {
        log(`[WARNING] getElementCenterInPercent: Element not available or container not rendered. Element: ${element ? element.id : 'N/A'}`);
        return { x: 0, y: 0 };
    }
    const x = (element.offsetLeft + element.offsetWidth / 2) / gameContainer.offsetWidth * 100;
    const y = (element.offsetTop + element.offsetHeight / 2) / gameContainer.offsetHeight * 100;
    return { x, y };
}

function getMiningBaseTopLeft() {
    if (!miningBase || !miningBase.offsetWidth || !gameContainer.offsetWidth) {
        log(`[WARNING] getMiningBaseTopLeft: miningBase not yet available or container not rendered.`);
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    const x = miningBase.offsetLeft / gameContainer.offsetWidth * 100;
    const y = miningBase.offsetTop / gameContainer.offsetHeight * 100;
    const width = miningBase.offsetWidth / gameContainer.offsetWidth * 100;
    const height = miningBase.offsetHeight / gameContainer.offsetHeight * 100;
    return { x, y, width, height };
}

function getMiningBaseCenter() {
    if (!miningBase || !miningBase.offsetWidth || !gameContainer.offsetWidth) {
        log(`[WARNING] getMiningBaseCenter: miningBase not yet available or container not rendered.`);
        return { x: 0, y: 0 };
    }
    const x = (miningBase.offsetLeft + miningBase.offsetWidth / 2) / gameContainer.offsetWidth * 100;
    const y = (miningBase.offsetTop + miningBase.offsetHeight / 2) / gameContainer.offsetHeight * 100;
    return { x, y };
}

function logicalToRenderedPx(logicalValue, referenceDimensionType) {
    if (!gameContainer.offsetWidth || !gameContainer.offsetHeight) {
        log(`[WARNING] logicalToRenderedPx: Container not rendered. Returning 0. Container: ${gameContainer.offsetWidth}x${gameContainer.offsetHeight}`);
        return 0;
    }
    if (referenceDimensionType === 'width') {
        return (logicalValue / CONFIG.Reference.width) * gameContainer.offsetWidth;
    } else if (referenceDimensionType === 'height') {
        return (logicalValue / CONFIG.Reference.height) * gameContainer.offsetHeight;
    }
    return logicalValue;
}

function renderedToLogicalPx(renderedValue, referenceDimensionType) {
    if (!gameContainer.offsetWidth || !gameContainer.offsetHeight) {
        log(`[WARNING] renderedToLogicalPx: Container not rendered. Returning 0. Container: ${gameContainer.offsetWidth}x${gameContainer.offsetHeight}`);
        return 0;
    }
    if (referenceDimensionType === 'width') {
        return (renderedValue / gameContainer.offsetWidth) * CONFIG.Reference.width;
    } else if (referenceDimensionType === 'height') {
        return (renderedValue / gameContainer.offsetHeight) * CONFIG.Reference.height;
    }
    return renderedValue;
}


// --- Spiel Logik Funktionen --- (Definieren Sie diese vor ihrer Verwendung!)
function updateScore(amount) {
    score = Math.round(score + amount);
    scoreDisplay.textContent = `Score: ${score}`;
    checkButtonStates();
    log(`Score updated: ${amount}, new score: ${score}`);
}

function updateStorage(amount) {
    currentStorage = Math.min(maxStorage, currentStorage + amount);
    storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
    if (storageFill) {
        storageFill.style.width = `${(currentStorage / maxStorage) * 100}%`;
    }
    checkFactoryProduction();
    checkButtonStates();
    log(`Storage updated: ${amount}, new storage: ${currentStorage}`);
}

function updateGoods(amount) {
    currentGoods = Math.min(maxGoods, currentGoods + amount);
    goodsDisplay.textContent = `Güter: ${currentGoods} / ${maxGoods}`;
    if (goodsFill) {
        goodsFill.style.width = `${(currentGoods / maxGoods) * 100}%`;
    }
    checkButtonStates();
    log(`Goods updated: ${amount}, new goods: ${currentGoods}`);
}

function checkButtonStates() {
    // Stellen Sie sicher, dass die Buttons existieren, bevor auf sie zugegriffen wird
    if (!buyCollectorButton) {
        log("[WARNING] checkButtonStates: Buttons not yet available. Skipping check.");
        return;
    }
    buyCollectorButton.disabled = score < CONFIG.Collectors.buyCost || collectors.length >= CONFIG.Collectors.maxDocks;
    buyCollectorButton.textContent = `Neuer Sammler (Kosten: ${CONFIG.Collectors.buyCost})`;

    upgradeCollectorSpeedButton.disabled = score < CONFIG.Collectors.speedUpgradeCost;
    upgradeCollectorSpeedButton.textContent = `Sammler Tempo (Kosten: ${CONFIG.Collectors.speedUpgradeCost})`;

    upgradeCollectorYieldButton.disabled = score < CONFIG.Collectors.yieldUpgradeCost;
    upgradeCollectorYieldButton.textContent = `Sammler Ertrag (Kosten: ${CONFIG.Collectors.yieldUpgradeCost})`;

    upgradeStorageButton.disabled = score < CONFIG.Storage.upgradeCost;
    upgradeStorageButton.textContent = `Lager erweitern (Kosten: ${CONFIG.Storage.upgradeCost})`;
    upgradeGoodsStorageButton.disabled = score < CONFIG.Goods.upgradeCost;
    upgradeGoodsStorageButton.textContent = `Güterlager erweitern (Kosten: ${CONFIG.Goods.upgradeCost})`;

    if (buildFactoryButton) {
        const hasFactoryInSlot = factories.some(f => f.slotIndex === currentFactorySlotIndex);
        buildFactoryButton.disabled = score < CONFIG.Factories.buildCost || hasFactoryInSlot;
        buildFactoryButton.textContent = `Fabrik bauen (Kosten: ${CONFIG.Factories.buildCost})`;
    }
    if (buildTradePostButton) {
        const hasTradePost = tradePost !== null;
        buildTradePostButton.disabled = score < CONFIG.TradePost.buildCost || hasTradePost;
        buildTradePostButton.textContent = `Handelsposten bauen (Kosten: ${CONFIG.TradePost.buildCost})`;
    }

    if (currentSelectedFactory) {
        upgradeFactoryYieldButton.disabled = score < currentSelectedFactory.yieldUpgradeCost;
        upgradeFactorySpeedButton.disabled = score < currentSelectedFactory.speedUpgradeCost;
        upgradeFactoryYieldButton.textContent = `Ertrag upgraden (Kosten: ${currentSelectedFactory.yieldUpgradeCost})`;
        upgradeFactorySpeedButton.textContent = `Tempo upgraden (Kosten: ${currentSelectedFactory.speedUpgradeCost})`;
    }
    if (currentSelectedTradePost) {
        upgradeTradePostPriceButton.disabled = score < currentSelectedTradePost.priceUpgradeCost;
        upgradeTradePostSpeedButton.disabled = score < currentSelectedTradePost.speedUpgradeCost;
        upgradeTradePostPriceButton.textContent = `Preis erhöhen (Kosten: ${currentSelectedTradePost.priceUpgradeCost})`;
        upgradeTradePostSpeedButton.textContent = `Händler Tempo (Kosten: ${currentSelectedTradePost.speedUpgradeCost})`;
    }
    log(`Button states checked.`);
}

function showPlusAmount(amount, x_percent, y_percent, type = 'score') {
    const pulse = document.createElement('div');
    pulse.classList.add(type === 'score' ? 'score-pulse' : 'goods-pulse');
    pulse.textContent = `+${amount}`;
    pulse.style.left = `${x_percent}%`;
    pulse.style.top = `${y_percent}%`;
    gameContainer.appendChild(pulse);
    pulse.addEventListener('animationend', () => pulse.remove());
    log(`Showing +${amount} pulse at ${x_percent}%, ${y_percent}% (type: ${type})`);
}


// --- Planeten Funktionen --- (Definieren Sie diese vor ihrer Verwendung!)
function spawnPlanet() {
    const el = document.createElement('div');
    el.classList.add('planet');
    el.id = `planet-${planets.length}`;

    const planetSizePercent = CONFIG.Planets.sizePercent;

    const x_percent = Math.random() * (100 - planetSizePercent) + (planetSizePercent / 2);
    const y_min_percent = CONFIG.Planets.spawnAreaTopRelative * 100;
    const y_max_percent = CONFIG.Planets.spawnAreaBottomRelative * 100;
    const y_percent = Math.random() * (y_max_percent - y_min_percent - planetSizePercent) + y_min_percent + (planetSizePercent / 2);


    el.style.left = `${x_percent - (planetSizePercent / 2)}%`;
    el.style.top = `${y_percent - (planetSizePercent / 2)}%`;
    
    const resources = Math.floor(Math.random() * (CONFIG.Planets.maxResources - CONFIG.Planets.minResources)) + CONFIG.Planets.minResources;
    const resDisplay = document.createElement('div');
    resDisplay.classList.add('planet-resources');
    resDisplay.textContent = resources;
    el.appendChild(resDisplay);

    planetsContainer.appendChild(el);
    const newPlanet = {
        element: el,
        resources: resources,
        x_percent: x_percent,
        y_percent: y_percent,
        resourcesDisplay: resDisplay
    };
    planets.push(newPlanet);
    log(`Spawned planet ${newPlanet.element.id} at %: ${x_percent.toFixed(2)}, ${y_percent.toFixed(2)} with ${resources} resources.`);
    return newPlanet;
}

function initializePlanets() {
    log('Attempting to initialize planets...');
    planets.forEach(p => p.element.remove());
    planets = [];
    for (let i = 0; i < CONFIG.Planets.initialCount; i++) {
        spawnPlanet();
    }
    log(`Initialized ${planets.length} planets. First planet element details:`, planets[0] ? {id: planets[0].element.id, offsetW: planets[0].element.offsetWidth, offsetH: planets[0].element.offsetHeight} : 'N/A');
    updateRenderedElementPositions();
}

function getNextAvailablePlanet() {
    return planets.find(p => p.resources > 0);
}

function handleZoom(event) {
    event.preventDefault();
    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;
    gameContainer.style.transform = `scale(${zoomFactor})`;
}

function removePlanet(planetToRemove) {
    log(`Removing planet with ${planetToRemove.resources} resources.`);
    planetToRemove.element.remove();
    planets = planets.filter(p => p !== planetToRemove);
    if (planets.length === 0) {
        log("All planets removed. Spawning new ones soon...");
        setTimeout(() => {
            initializePlanets();
            collectors.forEach(c => {
                if (c.state === STATE_IDLE_NO_PLANETS) {
                    c.targetPlanet = getNextAvailablePlanet();
                    if (c.targetPlanet) {
                        c.state = STATE_RETURNING_TO_SOURCE;
                        log(`Collector ${c.element.id || 'N/A'} switched from IDLE to RETURNING_TO_SOURCE.`);
                    }
                }
            });
        }, CONFIG.Planets.respawnDelayMs);
    }
}


// --- Sammler Logik Funktionen --- (Definieren Sie diese vor ihrer Verwendung!)
const DOCK_OFFSET_Y_PERCENT = 1;
const COLLECTOR_SIZE_PERCENT = 1.5;

function addCollectorShip() {
    if (collectors.length >= CONFIG.Collectors.maxDocks) {
        log("Maximum number of collectors reached.");
        return;
    }

    const collectorDotElement = document.createElement('div');
    collectorDotElement.classList.add('collector-dot');
    collectorDotElement.id = `collector-${collectors.length}`;

    const miningProgressBar = document.createElement('div');
    miningProgressBar.classList.add('mining-progress-bar');
    const progressFill = document.createElement('div');
    progressFill.classList.add('mining-progress-fill');
    miningProgressBar.appendChild(progressFill);
    collectorDotElement.appendChild(miningProgressBar);

    gameContainer.appendChild(collectorDotElement);

    const baseTopLeft = getMiningBaseTopLeft();

    const dockSpacingPercent = (baseTopLeft.width / CONFIG.Collectors.maxDocks);
    const dockPosX_percent = baseTopLeft.x + (dockSpacingPercent * (collectors.length % CONFIG.Collectors.maxDocks)) + (dockSpacingPercent / 2) - (COLLECTOR_SIZE_PERCENT / 2);
    const dockPosY_percent = baseTopLeft.y - DOCK_OFFSET_Y_PERCENT;

    const collector = {
        element: collectorDotElement,
        miningProgressBar: miningProgressBar,
        progressFill: progressFill,
        x_percent: dockPosX_percent,
        y_percent: dockPosY_percent,
        state: STATE_IDLE_NO_PLANETS,
        targetPlanet: null,
        deliveryAmount: Math.round(CONFIG.Collectors.baseYield * collectorYieldMultiplier),
        dockIndex: collectors.length % CONFIG.Collectors.maxDocks,
        miningStartTime: 0
    };
    collectors.push(collector);

    collectorCountDisplay.textContent = `Sammler: ${collectors.length}`;
    log(`Added collector ${collector.element.id} at %: ${collector.x_percent.toFixed(2)}, ${collector.y_percent.toFixed(2)}. State: ${collector.state}`);
}


// --- Fabrik Logik Funktionen --- (Definieren Sie diese vor ihrer Verwendung!)

function initializeFactoryPlots() {
    // Diese Funktion wird nun nur dazu verwendet, Event Listener hinzuzufügen.
    // factoryPlotElements wird in performInit einmalig mit den Elementen befüllt.
    factoryPlotElements.forEach(plot => {
        // Sicherstellen, dass der Plot nicht der Handelsposten-Plot ist (dessen Listener separat behandelt wird)
        if (plot.id !== 'trade-post-plot-0') {
            plot.addEventListener('click', () => showBuildMenu(parseInt(plot.dataset.slotIndex), 'factory'));
        }
    });
    // Separater Listener für den Handelsposten-Plot
    if (tradePostPlotElement) {
        tradePostPlotElement.addEventListener('click', () => showBuildMenu(CONFIG.TradePost.slotIndex, 'tradePost'));
    }
    log('Factory plots event listeners added.');
}

function showBuildMenu(slotIndex, type) {
    currentFactorySlotIndex = slotIndex;
    buildMenu.classList.remove('hidden');
    log(`Showing build menu for slot ${slotIndex}, type: ${type}`);

    if (type === 'factory') {
        buildFactoryButton.classList.remove('hidden');
        if (buildTradePostButton) buildTradePostButton.classList.add('hidden');
    } else if (type === 'tradePost') {
        buildFactoryButton.classList.add('hidden');
        if (buildTradePostButton) buildTradePostButton.classList.remove('hidden');
    }
    checkButtonStates();
}

function hideBuildMenu() {
    buildMenu.classList.add('hidden');
    currentFactorySlotIndex = -1;
    log('Build menu hidden.');
}

function buildFactory() {
    if (currentFactorySlotIndex === -1) return;

    const targetPlot = document.getElementById(`factory-plot-${currentFactorySlotIndex}`);
    if (!targetPlot) {
        log(`[ERROR] buildFactory: Target plot factory-plot-${currentFactorySlotIndex} not found!`);
        return;
    }
    
    const hasFactoryInSlot = factories.some(f => f.slotIndex === currentFactorySlotIndex);

    if (score >= CONFIG.Factories.buildCost && !hasFactoryInSlot) {
        updateScore(-CONFIG.Factories.buildCost);
        hideBuildMenu();

        const factoryElement = document.createElement('div');
        factoryElement.classList.add('factory');

        const progressBar = document.createElement('div');
        progressBar.classList.add('factory-progress-bar');
        const progressFill = document.createElement('div');
        progressFill.classList.add('factory-progress-fill');
        progressBar.appendChild(progressFill);
        factoryElement.appendChild(progressBar);

        targetPlot.parentNode.replaceChild(factoryElement, targetPlot);


        const newFactory = {
            element: factoryElement,
            slotIndex: currentFactorySlotIndex,
            yield: CONFIG.Factories.goodsYield,
            yieldMultiplier: 1,
            speedMultiplier: 1,
            duration: CONFIG.Factories.baseDurationMs,
            yieldUpgradeCost: CONFIG.Factories.initialYieldUpgradeCost,
            speedUpgradeCost: CONFIG.Factories.initialSpeedUpgradeCost,
            productionInterval: null,
            productionProgressFill: progressFill,
            productionStartTime: 0
        };
        factories.push(newFactory);

        factoryElement.addEventListener('click', () => showFactoryUpgradeMenu(newFactory));

        checkFactoryProduction();
        checkButtonStates();
        log(`Factory built in slot ${newFactory.slotIndex}.`);
    } else {
        log("Cannot build factory: Not enough score or slot occupied.");
    }
}

function buildTradePost() {
    if (currentFactorySlotIndex !== CONFIG.TradePost.slotIndex) {
        log(`[ERROR] Attempted to build Trade Post in wrong slot: ${currentFactorySlotIndex}. Expected: ${CONFIG.TradePost.slotIndex}`);
        return;
    }
    if (tradePost !== null) {
        log("Trade Post is already built.");
        return;
    }

    const targetPlot = tradePostPlotElement;
    if (!targetPlot) {
        log("[ERROR] Trade post plot element not found for building!");
        return;
    }

    if (score >= CONFIG.TradePost.buildCost) {
        updateScore(-CONFIG.TradePost.buildCost);
        hideBuildMenu();

        const tradePostElement = document.createElement('div');
        tradePostElement.classList.add('trade-post');

        targetPlot.parentNode.replaceChild(tradePostElement, targetPlot);

        tradePost = {
            element: tradePostElement,
            slotIndex: CONFIG.TradePost.slotIndex,
            sellPrice: CONFIG.TradePost.baseValuePerGood,
            traderSpeed: CONFIG.TradePost.traderSpeed,
            priceUpgradeCost: CONFIG.TradePost.initialPriceUpgradeCost,
            speedUpgradeCost: CONFIG.TradePost.initialSpeedUpgradeCost,
            lastTraderSpawnTime: Date.now(),
            traders: []
        };

        tradePostElement.addEventListener('click', () => showTradePostUpgradeMenu(tradePost));
        checkButtonStates();
        log(`Trade Post built.`);
    } else {
        log("Cannot build Trade Post: Not enough score.");
    }
}


function startFactoryProduction(factory) {
    if (factory.productionInterval) {
        clearInterval(factory.productionInterval);
        factory.productionInterval = null;
    }

    if (currentStorage >= CONFIG.Factories.storageConsumption &&
        currentGoods + (factory.yield * factory.yieldMultiplier) <= maxGoods) {
        
        factory.productionStartTime = Date.now();
        const currentProductionDuration = CONFIG.Factories.baseDurationMs / factory.speedMultiplier;

        if (factory.productionInterval) clearInterval(factory.productionInterval);

        factory.productionInterval = setInterval(() => {
            if (currentStorage >= CONFIG.Factories.storageConsumption &&
                currentGoods + (factory.yield * factory.yieldMultiplier) <= maxGoods) {
                
                updateStorage(-CONFIG.Factories.storageConsumption);
                const generatedGoods = Math.round(factory.yield * factory.yieldMultiplier);
                updateGoods(generatedGoods);
                const factoryCenter = getElementCenterInPercent(factory.element);
                showPlusAmount(generatedGoods,
                    factoryCenter.x,
                    factoryCenter.y - (5 * gameUnitPx / gameContainer.offsetHeight * 100),
                    'goods'
                );
                factory.productionStartTime = Date.now();
            } else {
                clearInterval(factory.productionInterval);
                factory.productionInterval = null;
                factory.productionProgressFill.style.width = '0%';
                log(`Factory in slot ${factory.slotIndex}: Production paused (resources or goods storage full).`);
                checkFactoryProduction();
            }
        }, currentProductionDuration);
        log(`Factory production for slot ${factory.slotIndex} started for ${currentProductionDuration}ms.`);
    } else {
        factory.productionProgressFill.style.width = '0%';
        log(`Factory in slot ${factory.slotIndex}: Not enough resources or goods storage full to start production.`);
    }
}


function checkFactoryProduction() {
    factories.forEach(factory => {
        if (!factory.productionInterval &&
            currentStorage >= CONFIG.Factories.storageConsumption &&
            currentGoods + (factory.yield * factory.yieldMultiplier) <= maxGoods) {
            startFactoryProduction(factory);
        }
    });
}


function showFactoryUpgradeMenu(factory) {
    currentSelectedFactory = factory;
    factoryUpgradeMenu.classList.remove('hidden');
    updateFactoryUpgradeMenuDisplay();
    checkButtonStates();
}

function hideFactoryUpgradeMenu() {
    factoryUpgradeMenu.classList.add('hidden');
    currentSelectedFactory = null;
}

function updateFactoryUpgradeMenuDisplay() {
    if (currentSelectedFactory) {
        const yieldText = `Ertrag: ${currentSelectedFactory.yield * currentSelectedFactory.yieldMultiplier} Güter`;
        const speedText = `Tempo: ${Math.round(CONFIG.Factories.baseDurationMs / currentSelectedFactory.speedMultiplier / 1000 * 10) / 10}s`;
        factoryUpgradeStatusDisplay.textContent = `${yieldText}, ${speedText}`;
    }
}

function upgradeFactoryYield() {
    if (currentSelectedFactory && score >= currentSelectedFactory.yieldUpgradeCost) {
        updateScore(-currentSelectedFactory.yieldUpgradeCost);
        currentSelectedFactory.yieldMultiplier = Math.round((currentSelectedFactory.yieldMultiplier + CONFIG.Factories.yieldUpgradeIncrease) * 10) / 10;
        currentSelectedFactory.yieldUpgradeCost = Math.ceil(currentSelectedFactory.yieldUpgradeCost * CONFIG.Factories.yieldUpgradeCostMultiplier);
        updateFactoryUpgradeMenuDisplay();
        checkButtonStates();
    }
}

function upgradeFactorySpeed() {
    if (currentSelectedFactory && score >= currentSelectedFactory.speedUpgradeCost) {
        updateScore(-currentSelectedFactory.speedUpgradeCost);
        currentSelectedFactory.speedMultiplier = Math.round((currentSelectedFactory.speedMultiplier + CONFIG.Factories.speedUpgradeIncrease) * 10) / 10;
        currentSelectedFactory.speedUpgradeCost = Math.ceil(currentSelectedFactory.speedUpgradeCost * CONFIG.Factories.speedUpgradeCostMultiplier);
        startFactoryProduction(currentSelectedFactory);
        updateFactoryUpgradeMenuDisplay();
        checkButtonStates();
    }
}

// Handelsposten Upgrade Menü Funktionen
function showTradePostUpgradeMenu(post) {
    currentSelectedTradePost = post;
    tradePostUpgradeMenu.classList.remove('hidden');
    updateTradePostUpgradeMenuDisplay();
    checkButtonStates();
}

function hideTradePostUpgradeMenu() {
    tradePostUpgradeMenu.classList.add('hidden');
    currentSelectedTradePost = null;
}

function updateTradePostUpgradeMenuDisplay() {
    if (currentSelectedTradePost) {
        const priceText = `Verkaufspreis: ${currentSelectedTradePost.sellPrice} Score/Gut`;
        const speedText = `Händler Tempo: ${Math.round(currentSelectedTradePost.traderSpeed * 10) / 10}x`;
        tradePostUpgradeStatusDisplay.textContent = `${priceText}, ${speedText}`;
    }
}

function upgradeTradePostPrice() {
    if (currentSelectedTradePost && score >= currentSelectedTradePost.priceUpgradeCost) {
        updateScore(-currentSelectedTradePost.priceUpgradeCost);
        currentSelectedTradePost.sellPrice += CONFIG.TradePost.priceUpgradeIncrease;
        currentSelectedTradePost.priceUpgradeCost = Math.ceil(currentSelectedTradePost.priceUpgradeCost * CONFIG.TradePost.priceUpgradeCostMultiplier);
        updateTradePostUpgradeMenuDisplay();
        checkButtonStates();
    }
}

function upgradeTradePostSpeed() {
    if (currentSelectedTradePost && score >= currentSelectedTradePost.speedUpgradeCost) {
        updateScore(-currentSelectedTradePost.speedUpgradeCost);
        currentSelectedTradePost.traderSpeed += CONFIG.TradePost.speedUpgradeIncrease;
        currentSelectedTradePost.speedUpgradeCost = Math.ceil(currentSelectedTradePost.speedUpgradeCost * CONFIG.TradePost.speedUpgradeCostMultiplier);
        updateTradePostUpgradeMenuDisplay();
        checkButtonStates();
    }
}

// Händler-Logik
function getElementTopLeftInPercent(element) {
    if (!element || !element.offsetWidth || !gameContainer.offsetWidth) {
        log(`[WARNING] getElementTopLeftInPercent: Element not available or container not rendered. Element: ${element ? element.id : 'N/A'}`);
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    const x = element.offsetLeft / gameContainer.offsetWidth * 100;
    const y = element.offsetTop / gameContainer.offsetHeight * 100;
    const width = element.offsetWidth / gameContainer.offsetWidth * 100;
    const height = element.offsetHeight / gameContainer.offsetHeight * 100;
    return { x, y, width, height };
}

function spawnTrader() {
    if (!tradePost || currentGoods === 0) {
        log("Cannot spawn trader: Trade Post not built or no goods available.");
        return;
    }

    const traderElement = document.createElement('div');
    traderElement.classList.add('trader-ship');

    traderElement.style.left = `110%`;
    traderElement.style.top = `${getElementTopLeftInPercent(tradePost.element).y + (getElementTopLeftInPercent(tradePost.element).height / 2)}%`;

    gameContainer.appendChild(traderElement);

    const trader = {
        element: traderElement,
        x_percent: 110,
        y_percent: getElementTopLeftInPercent(tradePost.element).y + (getElementTopLeftInPercent(tradePost.element).height / 2),
        state: 'approaching',
        targetX_percent: getElementCenterInPercent(tradePost.element).x,
        targetY_percent: getElementCenterInPercent(tradePost.element).y,
        goodsToSell: currentGoods,
        speed: tradePost.traderSpeed
    };
    traderShips.push(trader);
    log(`Spawned trader. Total traders: ${traderShips.length}`);
}

function updateTraders(deltaTime) {
    traderShips.forEach(trader => {
        const traderRenderedSize = trader.element.offsetWidth;

        if (trader.state === 'approaching') {
            const dx = trader.targetX_percent - trader.x_percent;
            const dy = trader.y_percent - trader.y_percent; // Y sollte sich nicht ändern wenn horizontal abfliegend
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (traderRenderedSize / gameContainer.offsetWidth * 100) * 1.5) { // Kollision in %
                trader.state = 'selling';
                const goodsSold = trader.goodsToSell;
                const scoreGained = goodsSold * tradePost.sellPrice;

                updateGoods(-goodsSold);
                updateScore(scoreGained);
                showPlusAmount(scoreGained, trader.targetX_percent, trader.targetY_percent - (3 * gameUnitPx / gameContainer.offsetHeight * 100), 'score');

                trader.state = 'departing';
                trader.targetX_percent = -10;
                trader.y_percent = trader.y_percent;
            } else {
                trader.x_percent += (dx / distance) * trader.speed * (deltaTime / 16.66);
                trader.y_percent += (dy / distance) * trader.speed * (deltaTime / 16.66);
            }
        } else if (trader.state === 'departing') {
            const dx = trader.targetX_percent - trader.x_percent;
            const dy = trader.y_percent - trader.y_percent; // Y sollte sich nicht ändern wenn horizontal abfliegend
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (traderRenderedSize / gameContainer.offsetWidth * 100) * 1.5) {
                trader.element.remove();
                traderShips = traderShips.filter(t => t !== trader);
            } else {
                trader.x_percent += (dx / distance) * trader.speed * (deltaTime / 16.66);
                trader.y_percent += (dy / distance) * trader.speed * (deltaTime / 16.66);
            }
        }
        trader.element.style.left = `${trader.x_percent}%`;
        trader.element.style.top = `${trader.y_percent}%`;
    });
}


// --- Haupt-Game-Loop ---
let lastFrameTime = 0;
function gameLoop(currentTime) {
    if (!lastFrameTime) lastFrameTime = currentTime;
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;

    updateGameUnit(); // Aktualisiert --game-unit bei jeder Frame
    updateRenderedElementPositions(); // Wichtig: Immer die aktuellen Größen/Positionen holen


    // Sammler-Logik
    collectors.forEach(collector => {
        const currentSpeed = collectorBaseSpeed;
        const collectorSizePercent = CONFIG.Collectors.sizePercent;

        collector.miningProgressBar.style.display = 'none'; // Verstecke den Ladebalken standardmäßig

        if (collector.state === STATE_RETURNING_TO_SOURCE) {
            if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                collector.targetPlanet = getNextAvailablePlanet();
                if (!collector.targetPlanet) {
                    collector.state = STATE_IDLE_NO_PLANETS;
                    return; // Sammler hat nichts zu tun
                }
            }
            const targetX = collector.targetPlanet.x_percent;
            const targetY = collector.targetPlanet.y_percent;

            const dx = targetX - collector.x_percent;
            const dy = targetY - collector.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const planetRenderedRadius = collector.targetPlanet.element.offsetWidth / 2;
            const collectorRenderedRadius = collector.element.offsetWidth / 2;
            const currentCollectorRenderedX = collector.x_percent / 100 * gameContainer.offsetWidth;
            const currentCollectorRenderedY = collector.y_percent / 100 * gameContainer.offsetHeight;
            const targetPlanetRenderedX = collector.targetPlanet.x_percent / 100 * gameContainer.offsetWidth;
            const targetPlanetRenderedY = collector.targetPlanet.y_percent / 100 * gameContainer.offsetHeight;

            const distancePx = Math.sqrt(
                Math.pow(targetPlanetRenderedX - currentCollectorRenderedX, 2) +
                Math.pow(targetPlanetRenderedY - currentCollectorRenderedY, 2)
            );

            if (distancePx < planetRenderedRadius + collectorRenderedRadius + (2 * gameUnitPx)) {
                collector.state = STATE_MINING;
                collector.miningStartTime = Date.now();
                collector.miningProgressBar.style.display = 'block';
                log(`Collector ${collector.element.id} reached planet ${collector.targetPlanet.element.id || 'N/A'}, starting mining.`);
            } else {
                collector.x_percent += (dx / distance) * currentSpeed * 1.2 * (deltaTime / 16.66);
                collector.y_percent += (dy / distance) * currentSpeed * 1.2 * (deltaTime / 16.66);
            }

        } else if (collector.state === STATE_MINING) {
            collector.miningProgressBar.style.display = 'block';

            const elapsedTime = Date.now() - collector.miningStartTime;
            const progress = Math.min(1, elapsedTime / CONFIG.Collectors.miningDurationMs);

            collector.progressFill.style.width = `${progress * 100}%`;

            if (progress >= 1) {
                if (collector.targetPlanet) {
                    log(`Collector ${collector.element.id} finished mining planet ${collector.targetPlanet.element.id || 'N/A'}. Resources left: ${collector.targetPlanet.resources - collector.deliveryAmount}`);
                    collector.targetPlanet.resources -= collector.deliveryAmount;
                    collector.targetPlanet.resourcesDisplay.textContent = Math.max(0, collector.targetPlanet.resources);
                    if (collector.targetPlanet.resources <= 0) {
                        log(`Planet ${collector.targetPlanet.element.id || 'N/A'} depleted!`);
                        removePlanet(collector.targetPlanet);
                        collector.targetPlanet = null;
                    }
                }
                collector.state = STATE_RETURNING_TO_BASE;
            }
            if (collector.targetPlanet) {
                collector.x_percent = collector.targetPlanet.x_percent;
                collector.y_percent = collector.targetPlanet.y_percent;
            } else {
                collector.state = STATE_RETURNING_TO_BASE;
            }

        } else if (collector.state === STATE_RETURNING_TO_BASE) {
            const baseTopLeft = getMiningBaseTopLeft();
            const dockSpacingPercent = (baseTopLeft.width / CONFIG.Collectors.maxDocks);
            const specificDockPosX_percent = baseTopLeft.x + (dockSpacingPercent * (collector.dockIndex % CONFIG.Collectors.maxDocks)) + (dockSpacingPercent / 2) - (COLLECTOR_SIZE_PERCENT / 2);
            const specificDockPosY_percent = baseTopLeft.y - DOCK_OFFSET_Y_PERCENT;

            const dx = specificDockPosX_percent - collector.x_percent;
            const dy = specificDockPosY_percent - collector.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const collectorRenderedRadius = collector.element.offsetWidth / 2;
            const currentCollectorRenderedX = collector.x_percent / 100 * gameContainer.offsetWidth;
            const currentCollectorRenderedY = collector.y_percent / 100 * gameContainer.offsetHeight;
            const targetDockRenderedX = specificDockPosX_percent / 100 * gameContainer.offsetWidth;
            const targetDockRenderedY = specificDockPosY_percent / 100 * gameContainer.offsetHeight;

            const distancePx = Math.sqrt(
                Math.pow(targetDockRenderedX - currentCollectorRenderedX, 2) +
                Math.pow(targetDockRenderedY - currentCollectorRenderedY, 2)
            );

            if (distancePx < collectorRenderedRadius + (2 * gameUnitPx)) {
                collector.state = STATE_DELIVERING;
                collector.x_percent = specificDockPosX_percent;
                collector.y_percent = specificDockPosY_percent;
                log(`Collector ${collector.element.id} reached base, starting delivery.`);
            } else {
                collector.x_percent += (dx / distance) * currentSpeed * 1.5 * (deltaTime / 16.66);
                collector.y_percent += (dy / distance) * currentSpeed * 1.5 * (deltaTime / 16.66);
            }

        } else if (collector.state === STATE_DELIVERING) {
            const amountToDeliver = collector.deliveryAmount;
            const baseCenter = getMiningBaseCenter();

            if (currentStorage + amountToDeliver <= maxStorage) {
                updateStorage(amountToDeliver);
                updateScore(amountToDeliver);
                showPlusAmount(amountToDeliver, baseCenter.x, baseCenter.y - (10 * gameUnitPx / gameContainer.offsetHeight * 100));
                
                collector.state = STATE_RETURNING_TO_SOURCE;
                collector.targetPlanet = null; // Zwingt Sammler, neuen Planeten zu suchen
                log(`Collector ${collector.element.id} delivered ${amountToDeliver}.`);
            } else {
                // Lager voll, Sammler wartet am Dock
                    log(`Collector ${collector.element.id} waiting at base, storage full.`);
                    collector.targetPlanet = null; // damit er später wieder ein neues Ziel suchen kann
                    collector.state = STATE_IDLE_NO_PLANETS; // damit er sofort wieder in die Idle-Logik kommt
            }
        } else if (collector.state === STATE_IDLE_NO_PLANETS) {
            collector.miningProgressBar.style.display = 'none';
            if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                collector.targetPlanet = getNextAvailablePlanet();
            }
            if (collector.targetPlanet) {
                collector.state = STATE_RETURNING_TO_SOURCE;
                log(`Collector ${collector.element.id} found new planet from idle, state: RETURNING_TO_SOURCE.`);
            }
        }
        collector.element.style.left = `${collector.x_percent}%`;
        collector.element.style.top = `${collector.y_percent}%`;
    });

    // Fabrik Produktion ProgressBar Update
    factories.forEach(factory => {
        if (factory.productionInterval) {
            const elapsedTime = Date.now() - factory.productionStartTime;
            const currentProductionDuration = CONFIG.Factories.baseDurationMs / factory.speedMultiplier;
            const progress = Math.min(1, elapsedTime / currentProductionDuration);
            factory.productionProgressFill.style.width = `${progress * 100}%`;
        } else if (factory.productionProgressFill) {
            factory.productionProgressFill.style.width = '0%';
        }
    });

    // Händler-Logik aufrufen
    const currentTimeMs = Date.now();
    if (tradePost && currentGoods > 0 && currentTimeMs - tradePost.lastTraderSpawnTime >= CONFIG.TradePost.traderSpawnIntervalMs) {
        spawnTrader();
        tradePost.lastTraderSpawnTime = currentTimeMs;
    }
    updateTraders(deltaTime);

    requestAnimationFrame(gameLoop);
}

// --- Initialisierung ---
function buyCollector() {
    if (score >= CONFIG.Collectors.buyCost && collectors.length < CONFIG.Collectors.maxDocks) {
        updateScore(-CONFIG.Collectors.buyCost);
        addCollectorShip();
        checkButtonStates();
    } else {
        log("Cannot buy collector: not enough score or max docks reached.");
    }
}

function upgradeCollectorSpeed() {
    if (score >= CONFIG.Collectors.speedUpgradeCost) {
        updateScore(-CONFIG.Collectors.speedUpgradeCost);
        collectorBaseSpeed += CONFIG.Collectors.speedUpgradeIncrease;
        CONFIG.Collectors.speedUpgradeCost = Math.ceil(CONFIG.Collectors.speedUpgradeCost * CONFIG.Collectors.speedUpgradeCostMultiplier);
        checkButtonStates();
        log(`Collector speed upgraded. New base speed: ${collectorBaseSpeed}`);
    } else {
        log("Cannot upgrade speed: Not enough score.");
    }
}

function upgradeCollectorYield() {
    if (score >= CONFIG.Collectors.yieldUpgradeCost) {
        updateScore(-CONFIG.Collectors.yieldUpgradeCost);
        collectorYieldMultiplier = Math.round((collectorYieldMultiplier + CONFIG.Collectors.yieldUpgradeIncrease) * 10) / 10;
        CONFIG.Collectors.yieldUpgradeCost = Math.ceil(CONFIG.Collectors.yieldUpgradeCost * CONFIG.Collectors.yieldUpgradeCostMultiplier);
        checkButtonStates();
        log(`Collector yield upgraded. New yield multiplier: ${collectorYieldMultiplier}`);
    } else {
        log("Cannot upgrade yield: Not enough score.");
    }
}

function upgradeStorage() {
    if (score >= CONFIG.Storage.upgradeCost) {
        updateScore(-CONFIG.Storage.upgradeCost);
        maxStorage = Math.ceil(maxStorage * CONFIG.Storage.upgradeCapacityMultiplier);
        CONFIG.Storage.upgradeCost = Math.ceil(CONFIG.Storage.upgradeCost * CONFIG.Storage.upgradeCostMultiplier);
        storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
        checkButtonStates();
        log(`Storage upgraded. New max storage: ${maxStorage}`);
    } else {
        log("Cannot upgrade storage: Not enough score.");
    }
}

function upgradeGoodsStorage() {
    if (score >= CONFIG.Goods.upgradeCost) {
        updateScore(-CONFIG.Goods.upgradeCost);
        maxGoods = Math.ceil(maxGoods * CONFIG.Goods.upgradeCapacityMultiplier);
        CONFIG.Goods.upgradeCost = Math.ceil(CONFIG.Goods.upgradeCost * CONFIG.Goods.upgradeCostMultiplier);
        goodsDisplay.textContent = `Güter: ${currentGoods} / ${maxGoods}`;
        checkButtonStates();
        log(`Goods storage upgraded. New max goods: ${maxGoods}`);
    } else {
        log("Cannot upgrade goods storage: Not enough score.");
    }
}


// Funktion, die die eigentliche Initialisierung durchführt
function performInit() {
    log('Starting game initialization (performInit)...');

    // --- Zuweisung aller DOM-Elemente hier ---
    gameContainer = document.getElementById('game-container'); log(`gameContainer: ${!!gameContainer}`);
    planetsContainer = document.getElementById('planets-container'); log(`planetsContainer: ${!!planetsContainer}`);
    miningBase = document.getElementById('mining-base'); log(`miningBase: ${!!miningBase}`);
    storageArea = document.getElementById('storage-area'); log(`storageArea: ${!!storageArea}`);
    storageFill = document.getElementById('storage-fill'); log(`storageFill: ${!!storageFill}`);

    scoreDisplay = document.getElementById('score-display'); log(`scoreDisplay: ${!!scoreDisplay}`);
    collectorCountDisplay = document.getElementById('collector-count-display'); log(`collectorCountDisplay: ${!!collectorCountDisplay}`);
    storageDisplay = document.getElementById('storage-display'); log(`storageDisplay: ${!!storageDisplay}`);

    goodsDisplay = document.getElementById('goods-display'); log(`goodsDisplay: ${!!goodsDisplay}`);
    goodsArea = document.getElementById('goods-area'); log(`goodsArea: ${!!goodsArea}`);
    goodsFill = document.getElementById('goods-fill'); log(`goodsFill: ${!!goodsFill}`);
    upgradeGoodsStorageButton = document.getElementById('upgrade-goods-storage-button'); log(`upgradeGoodsStorageButton: ${!!upgradeGoodsStorageButton}`);

    buyCollectorButton = document.getElementById('buy-collector-button'); log(`buyCollectorButton: ${!!buyCollectorButton}`);
    upgradeCollectorSpeedButton = document.getElementById('upgrade-collector-speed-button'); log(`upgradeCollectorSpeedButton: ${!!upgradeCollectorSpeedButton}`);
    upgradeStorageButton = document.getElementById('upgrade-storage-button'); log(`upgradeStorageButton: ${!!upgradeStorageButton}`);
    upgradeCollectorYieldButton = document.getElementById('upgrade-collector-yield-button'); log(`upgradeCollectorYieldButton: ${!!upgradeCollectorYieldButton}`);

    // Fabrik-Plot-Elemente müssen hier einzeln geholt werden
    for (let i = 0; i < CONFIG.Factories.maxSlots; i++) {
        const plotElement = document.getElementById(`factory-plot-${i}`);
        if (plotElement) {
            factoryPlotElements.push(plotElement); // Element zum Array hinzufügen
            // Event Listener werden unten nach der Zuweisung aller Buttons hinzugefügt
        } else {
            // Dies ist der Fall für factory-plot-6, der eigentlich trade-post-plot-0 ist
            log(`[WARNING] Factory plot with ID factory-plot-${i} not found in DOM or is a Trade Post plot!`);
        }
    }
    log(`factoryPlotElements count: ${factoryPlotElements.length}`); // Sollte 7 sein (0-5, 7)
    tradePostPlotElement = document.getElementById(`trade-post-plot-0`); log(`tradePostPlotElement: ${!!tradePostPlotElement}`);

    buildMenu = document.getElementById('build-menu'); log(`buildMenu: ${!!buildMenu}`);
    buildFactoryButton = document.getElementById('build-factory-button'); log(`buildFactoryButton: ${!!buildFactoryButton}`);
    buildTradePostButton = document.getElementById('build-trade-post-button'); log(`buildTradePostButton: ${!!buildTradePostButton}`);
    closeBuildMenuButton = document.getElementById('close-build-menu-button'); log(`closeBuildMenuButton: ${!!closeBuildMenuButton}`);

    factoryUpgradeMenu = document.getElementById('factory-upgrade-menu'); log(`factoryUpgradeMenu: ${!!factoryUpgradeMenu}`);
    upgradeFactoryYieldButton = document.getElementById('upgrade-factory-yield-button'); log(`upgradeFactoryYieldButton: ${!!upgradeFactoryYieldButton}`);
    upgradeFactorySpeedButton = document.getElementById('upgrade-factory-speed-button'); log(`upgradeFactorySpeedButton: ${!!upgradeFactorySpeedButton}`);
    closeFactoryUpgradeMenuButton = document.getElementById('close-factory-upgrade-menu-button'); log(`closeFactoryUpgradeMenuButton: ${!!closeFactoryUpgradeMenuButton}`);
    factoryUpgradeStatusDisplay = document.getElementById('factory-upgrade-status'); log(`factoryUpgradeStatusDisplay: ${!!factoryUpgradeStatusDisplay}`);

    tradePostUpgradeMenu = document.getElementById('trade-post-upgrade-menu'); log(`tradePostUpgradeMenu: ${!!tradePostUpgradeMenu}`);
    upgradeTradePostPriceButton = document.getElementById('upgrade-trade-post-price-button'); log(`upgradeTradePostPriceButton: ${!!upgradeTradePostPriceButton}`);
    upgradeTradePostSpeedButton = document.getElementById('upgrade-trade-post-speed-button'); log(`upgradeTradePostSpeedButton: ${!!upgradeTradePostSpeedButton}`);
    closeTradePostUpgradeMenuButton = document.getElementById('close-trade-post-upgrade-menu-button'); log(`closeTradePostUpgradeMenuButton: ${!!closeTradePostUpgradeMenuButton}`);
    tradePostUpgradeStatusDisplay = document.getElementById('trade-post-upgrade-status'); log(`tradePostUpgradeStatusDisplay: ${!!tradePostUpgradeStatusDisplay}`);
    // --- Ende der DOM-Zuweisung ---

    // Event Listener für Buttons (jetzt sicher, da Elemente zugewiesen sind)
    buyCollectorButton.addEventListener('click', buyCollector);
    upgradeCollectorSpeedButton.addEventListener('click', upgradeCollectorSpeed);
    upgradeCollectorYieldButton.addEventListener('click', upgradeCollectorYield);
    upgradeStorageButton.addEventListener('click', upgradeStorage);
    upgradeGoodsStorageButton.addEventListener('click', upgradeGoodsStorage);

    // Event Listener für Bau- und Upgrade-Menü-Buttons
    if (buildFactoryButton) buildFactoryButton.addEventListener('click', buildFactory);
    if (buildTradePostButton) buildTradePostButton.addEventListener('click', buildTradePost);
    if (closeBuildMenuButton) closeBuildMenuButton.addEventListener('click', hideBuildMenu);

    if (closeFactoryUpgradeMenuButton) closeFactoryUpgradeMenuButton.addEventListener('click', hideFactoryUpgradeMenu);
    if (upgradeFactoryYieldButton) upgradeFactoryYieldButton.addEventListener('click', upgradeFactoryYield);
    if (upgradeFactorySpeedButton) upgradeFactorySpeedButton.addEventListener('click', upgradeFactorySpeed);

    if (closeTradePostUpgradeMenuButton) closeTradePostUpgradeMenuButton.addEventListener('click', hideTradePostUpgradeMenu);
    if (upgradeTradePostPriceButton) upgradeTradePostPriceButton.addEventListener('click', upgradeTradePostPrice);
    if (upgradeTradePostSpeedButton) upgradeTradePostSpeedButton.addEventListener('click', upgradeTradePostSpeed);

    // Event Listener für Fabrik- und Handelsposten-Bauplätze hinzufügen
    // Diese Schleife muss nach der Zuweisung aller factoryPlotElements erfolgen
    initializeFactoryPlots(); // Diese Funktion wurde angepasst, um Event Listener hinzuzufügen

    // Initialisiere die gameUnit (CSS Variable)
    updateGameUnit();
    log(`Initial gameUnitPx: ${gameUnitPx}`);

    log('Factory plots event listeners added.');
    
    // Initialisiere Lager und Güteranzeigen
    updateStorage(CONFIG.Game.initialStorage);
    updateGoods(CONFIG.Goods.initialGoods);
    log('Storage and goods initialized.');
    
    // Initialisiere Planeten
    initializePlanets(); // Sollte Planeten spawnen und updateRenderedElementPositions aufrufen
    log('Planets initialized.');

    // Initialisiere Sammler
    for (let i = 0; i < CONFIG.Collectors.initialCount; i++) {
        addCollectorShip();
    }
    log(`Added ${CONFIG.Collectors.initialCount} initial collectors.`);

    // Sammler nach dem Planetenspawn zu Zielen schicken
    collectors.forEach(c => {
        if (c.state === STATE_IDLE_NO_PLANETS) {
            c.targetPlanet = getNextAvailablePlanet();
            if (c.targetPlanet) {
                c.state = STATE_RETURNING_TO_SOURCE;
                log(`Initial collector ${c.element.id || 'N/A'} assigned target planet ${c.targetPlanet.element.id || 'N/A'}.`);
            } else {
                log(`Initial collector ${c.element.id || 'N/A'} remains IDLE, no planets available yet.`);
            }
        }
    });

    checkButtonStates(); // Initialen Button-Zustand nach dem Start setzen
    log('Initial button states checked.');

    // Zoom-Funktionalität
    gameContainer.addEventListener('wheel', handleZoom);
    log('Zoom functionality enabled.');

    log('Starting game loop...');
    requestAnimationFrame(gameLoop); // Game Loop erst hier starten
}

// Robusterer Start-Check
// Überprüft, ob die kritischen DOM-Elemente gerendert wurden (d.h. offsetWidth > 0)
// Bevor die eigentliche Initialisierung ausgeführt wird.
function checkInitialLoad() {
    log("Running checkInitialLoad...");
    // --- NEU: Zuweisung der globalen DOM-Variablen hier ---
    gameContainer = document.getElementById('game-container');
    planetsContainer = document.getElementById('planets-container');
    miningBase = document.getElementById('mining-base');
    // --- Ende der NEUEN Zuweisung ---

    // Prüfen, ob die kritischen Elemente verfügbar und gerendert sind
    if (gameContainer && gameContainer.offsetWidth > 0 && gameContainer.offsetHeight > 0 &&
        miningBase && miningBase.offsetWidth > 0 && miningBase.offsetHeight > 0 &&
        planetsContainer && planetsContainer.offsetWidth > 0 && planetsContainer.offsetHeight > 0) {
        log(`Initial load check passed. Container: ${gameContainer.offsetWidth}x${gameContainer.offsetHeight}, Base: ${miningBase.offsetWidth}x${miningBase.offsetHeight}, PlanetsContainer: ${planetsContainer.offsetWidth}x${planetsContainer.offsetHeight}`);
        performInit();
    } else {
        log(`Initial load check failed. Retrying in 50ms. Current states:
            Container: ${gameContainer ? `${gameContainer.offsetWidth}x${gameContainer.offsetHeight}` : 'N/A'},
            Base: ${miningBase ? `${miningBase.offsetWidth}x${miningBase.offsetHeight}` : 'N/A'},
            PlanetsContainer: ${planetsContainer ? `${planetsContainer.offsetWidth}x${planetsContainer.offsetHeight}` : 'N/A'}`);
        setTimeout(checkInitialLoad, 50); // Erneut versuchen
    }
}


// Führt die Initialisierung aus, sobald der DOM vollständig geladen ist
// Verwende window.onload für robustere Initialisierung, da es wartet, bis alle Ressourcen geladen sind.
window.addEventListener('load', checkInitialLoad);

// gameUnit bei Fenstergröße anpassen, da vmin sich ändert
window.addEventListener('resize', updateGameUnit);