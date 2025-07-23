// --- Konfiguration importieren ---
import { CONFIG } from './config.js';

// --- DOM-Elemente ---
const gameContainer = document.getElementById('game-container');
const planetsContainer = document.getElementById('planets-container'); // Für Planeten-Elemente
const miningBase = document.getElementById('mining-base');
const storageArea = document.getElementById('storage-area');
let storageFill = null; // Initialisiere mit null, um sicherzustellen, dass es explizit zugewiesen wird

const scoreDisplay = document.getElementById('score-display');
const collectorCountDisplay = document.getElementById('collector-count-display');
const storageDisplay = document.getElementById('storage-display');

const buyCollectorButton = document.getElementById('buy-collector-button');
const upgradeCollectorSpeedButton = document.getElementById('upgrade-collector-speed-button');
const upgradeStorageButton = document.getElementById('upgrade-storage-button');
const upgradeCollectorYieldButton = document.getElementById('upgrade-collector-yield-button');

// Fabrik-bezogene DOM-Elemente
const factoryPlotElements = [];
for (let i = 0; i < CONFIG.Factories.maxSlots; i++) {
    factoryPlotElements.push(document.getElementById(`factory-plot-${i}`));
}

const buildMenu = document.getElementById('build-menu');
const buildFactoryButton = document.getElementById('build-factory-button');
const closeBuildMenuButton = document.getElementById('close-build-menu-button');

const factoryUpgradeMenu = document.getElementById('factory-upgrade-menu');
const upgradeFactoryYieldButton = document.getElementById('upgrade-factory-yield-button');
const upgradeFactorySpeedButton = document.getElementById('upgrade-factory-speed-button');
// KORREKTUR: Syntaxfehler behoben
const closeFactoryUpgradeMenuButton = document.getElementById('close-factory-upgrade-menu-button'); 
const factoryUpgradeStatusDisplay = document.getElementById('factory-upgrade-status');


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

let gameUnitPx = 1;

let planets = [];

const STATE_RETURNING_TO_SOURCE = 'returningToSource';
const STATE_MINING = 'mining';
const STATE_RETURNING_TO_BASE = 'returningToBase';
const STATE_DELIVERING = 'delivering';
const STATE_IDLE_NO_PLANETS = 'idleNoPlanets';


// Fabrik-Variablen
let factories = [];
let currentSelectedFactory = null;
let currentFactorySlotIndex = -1;


// --- Helper-Funktionen ---

function updateGameUnit() {
    const minDim = Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight);
    const newGameUnitPx = minDim / 100;
    gameUnitPx = Math.max(
        minDim * CONFIG.Game.gameUnitMinScale / 100,
        Math.min(minDim * CONFIG.Game.gameUnitMaxScale / 100, newGameUnitPx)
    );
    document.documentElement.style.setProperty('--game-unit', `${gameUnitPx}px`);
}

function getMiningBaseCenter() {
    const rect = miningBase.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const x = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const y = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;
    return { x, y };
}

function getMiningBaseTopLeft() {
    const rect = miningBase.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    const x = (rect.left - containerRect.left) / containerRect.width * 100;
    const y = (rect.top - containerRect.top) / containerRect.height * 100;
    const width = rect.width / containerRect.width * 100;
    const height = rect.height / containerRect.height * 100;
    return { x, y, width, height };
}

// --- Spiel Logik ---
function updateScore(amount) {
    score = Math.round(score + amount);
    scoreDisplay.textContent = `Score: ${score}`;
    checkButtonStates();
}

function updateStorage(amount) {
    currentStorage = Math.min(maxStorage, currentStorage + amount);
    storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
    // Sicherstellen, dass storageFill existiert, bevor style.width geändert wird
    if (storageFill) {
        storageFill.style.width = `${(currentStorage / maxStorage) * 100}%`;
    }
    // Wichtig: Nach Lager-Update prüfen, ob Fabriken wieder produzieren können
    checkFactoryProduction();
    checkButtonStates();
}

function checkButtonStates() {
    buyCollectorButton.disabled = score < buyCollectorCost || collectors.length >= CONFIG.Collectors.maxDocks;
    upgradeCollectorSpeedButton.disabled = score < collectorSpeedUpgradeCost;
    upgradeCollectorYieldButton.disabled = score < collectorYieldUpgradeCost;
    upgradeStorageButton.disabled = score < storageUpgradeCost;

    buyCollectorButton.textContent = `Neuer Sammler (Kosten: ${buyCollectorCost})`;
    upgradeCollectorSpeedButton.textContent = `Sammler Tempo (Kosten: ${collectorSpeedUpgradeCost})`;
    upgradeCollectorYieldButton.textContent = `Sammler Ertrag (Kosten: ${collectorYieldUpgradeCost})`;
    upgradeStorageButton.textContent = `Lager erweitern (Kosten: ${storageUpgradeCost})`;

    if (buildFactoryButton && currentFactorySlotIndex !== -1) {
        const hasFactoryInSlot = factories.some(f => f.slotIndex === currentFactorySlotIndex);
        buildFactoryButton.disabled = score < CONFIG.Factories.buildCost || hasFactoryInSlot;
        buildFactoryButton.textContent = `Fabrik bauen (Kosten: ${CONFIG.Factories.buildCost} Score)`;
    }

    if (currentSelectedFactory) {
        upgradeFactoryYieldButton.disabled = score < currentSelectedFactory.yieldUpgradeCost;
        upgradeFactorySpeedButton.disabled = score < currentSelectedFactory.speedUpgradeCost;
        upgradeFactoryYieldButton.textContent = `Ertrag upgraden (Kosten: ${currentSelectedFactory.yieldUpgradeCost} Score)`;
        upgradeFactorySpeedButton.textContent = `Tempo upgraden (Kosten: ${currentSelectedFactory.speedUpgradeCost} Score)`;
    }
}

function showPlusAmount(amount, x_percent, y_percent) {
    const pulse = document.createElement('div');
    pulse.classList.add('score-pulse');
    pulse.textContent = `+${amount}`;
    pulse.style.left = `${x_percent}%`;
    pulse.style.top = `${y_percent}%`;
    gameContainer.appendChild(pulse);
    pulse.addEventListener('animationend', () => pulse.remove());
}

// --- Planeten ---
function spawnPlanet() {
    const el = document.createElement('div');
    el.classList.add('planet');

    const x_percent = Math.random() * (100 - CONFIG.Planets.sizePercent) + CONFIG.Planets.sizePercent / 2;
    const y_min_percent = CONFIG.Planets.spawnAreaTopRelative * 100;
    const y_max_percent = CONFIG.Planets.spawnAreaBottomRelative * 100;
    const y_percent = Math.random() * (y_max_percent - y_min_percent - CONFIG.Planets.sizePercent) + y_min_percent + CONFIG.Planets.sizePercent / 2;


    el.style.left = `${x_percent - CONFIG.Planets.sizePercent / 2}%`;
    el.style.top = `${y_percent - CONFIG.Planets.sizePercent / 2}%`;

    const resources = Math.floor(Math.random() * (CONFIG.Planets.maxResources - CONFIG.Planets.minResources)) + CONFIG.Planets.minResources;
    const resDisplay = document.createElement('div');
    resDisplay.classList.add('planet-resources');
    resDisplay.textContent = resources;
    el.appendChild(resDisplay);

    planetsContainer.appendChild(el);
    planets.push({
        element: el,
        resources,
        x_percent: x_percent,
        y_percent: y_percent,
        resourcesDisplay: resDisplay
    });
}

function initializePlanets() {
    for (let i = 0; i < CONFIG.Planets.initialCount; i++) {
        spawnPlanet();
    }
}

function getNextAvailablePlanet() {
    return planets.find(p => p.resources > 0);
}

function removePlanet(planetToRemove) {
    planetToRemove.element.remove();
    planets = planets.filter(p => p !== planetToRemove);
    if (planets.length === 0) {
        setTimeout(initializePlanets, CONFIG.Planets.respawnDelayMs);
    }
}


// --- Sammler Logik ---
function addCollectorShip() {
    if (collectors.length >= CONFIG.Collectors.maxDocks) {
        console.warn("Maximale Anzahl an Sammlern erreicht.");
        return;
    }

    const collectorDotElement = document.createElement('div');
    collectorDotElement.classList.add('collector-dot');

    const miningProgressBar = document.createElement('div');
    miningProgressBar.classList.add('mining-progress-bar');
    const miningProgressFill = document.createElement('div');
    miningProgressFill.classList.add('mining-progress-fill');
    miningProgressBar.appendChild(miningProgressFill);
    collectorDotElement.appendChild(miningProgressBar);

    gameContainer.appendChild(collectorDotElement);

    const baseCenter = getMiningBaseCenter();

    const collector = {
        element: collectorDotElement,
        miningProgressBar: miningProgressBar,
        miningProgressFill: miningProgressFill,
        x_percent: baseCenter.x,
        y_percent: baseCenter.y,
        vx: 0,
        vy: 0,
        state: STATE_IDLE_NO_PLANETS,
        targetPlanet: null,
        deliveryAmount: Math.round(collectorBaseYield * collectorYieldMultiplier),
        dockIndex: collectors.length,
        miningStartTime: 0,
        travelStartTime: 0,
        travelDistance: 0
    };
    collectors.push(collector);

    collectorCountDisplay.textContent = `Sammler: ${collectors.length}`;
}

// --- Fabrik Logik ---

function initializeFactoryPlots() {
    factoryPlotElements.forEach((plot, index) => {
        plot.addEventListener('click', () => showBuildMenu(index));
    });
}

function showBuildMenu(slotIndex) {
    currentFactorySlotIndex = slotIndex;
    buildMenu.classList.remove('hidden');
    checkButtonStates();
}

function hideBuildMenu() {
    buildMenu.classList.add('hidden');
    currentFactorySlotIndex = -1;
}

function buildFactory() {
    if (currentFactorySlotIndex === -1) return;

    const targetPlot = factoryPlotElements[currentFactorySlotIndex];
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
            yield: CONFIG.Factories.baseYield,
            yieldMultiplier: 1,
            speedMultiplier: 1,
            duration: CONFIG.Factories.baseDurationMs,
            yieldUpgradeCost: CONFIG.Factories.initialYieldUpgradeCost,
            speedUpgradeCost: CONFIG.Factories.initialSpeedUpgradeCost,
            productionInterval: null, // Wird erst gesetzt, wenn Produktion läuft
            productionProgressFill: progressFill,
            productionStartTime: 0 // Wird erst gesetzt, wenn Produktion tatsächlich startet
        };
        factories.push(newFactory);

        factoryElement.addEventListener('click', () => showFactoryUpgradeMenu(newFactory));

        // Fabrik soll sofort produktiv gehen, wenn Ressourcen da sind
        startFactoryProduction(newFactory);
        checkButtonStates();
    } else {
        console.log("Kann Fabrik nicht bauen: Nicht genug Score oder Slot belegt.");
    }
}

function startFactoryProduction(factory) {
    // Wenn bereits ein Intervall läuft, stoppe es, um es neu zu setzen
    if (factory.productionInterval) {
        clearInterval(factory.productionInterval);
        factory.productionInterval = null; // Zurücksetzen, um erneuten Start zu ermöglichen
    }

    // Nur starten, wenn genügend Ressourcen vorhanden sind
    if (currentStorage >= CONFIG.Factories.storageConsumption) {
        factory.productionStartTime = Date.now(); // Startzeit setzen/aktualisieren
        const currentProductionDuration = factory.duration / factory.speedMultiplier;

        factory.productionInterval = setInterval(() => {
            if (currentStorage >= CONFIG.Factories.storageConsumption) {
                updateStorage(-CONFIG.Factories.storageConsumption);
                const generatedScore = Math.round(factory.yield * factory.yieldMultiplier);
                updateScore(generatedScore);
                const factoryRect = factory.element.getBoundingClientRect();
                const containerRect = gameContainer.getBoundingClientRect();
                showPlusAmount(generatedScore,
                    ((factoryRect.left + factoryRect.width / 2) - containerRect.left) / containerRect.width * 100,
                    ((factoryRect.top - (5 * gameUnitPx)) - containerRect.top) / containerRect.height * 100
                );
                factory.productionStartTime = Date.now(); // Fortschrittsbalken resetten
            } else {
                // Wenn Lager während der Produktion leer wird, Produktion pausieren
                clearInterval(factory.productionInterval);
                factory.productionInterval = null; // Intervall löschen
                factory.productionProgressFill.style.width = '0%'; // Balken leeren
                console.log(`Fabrik im Slot ${factory.slotIndex}: Lager leer, Produktion pausiert.`);
            }
        }, currentProductionDuration);
        console.log(`Fabrikproduktion für Slot ${factory.slotIndex} gestartet für ${currentProductionDuration}ms.`);
    } else {
        // Wenn nicht genügend Ressourcen da sind, Balken leeren und sicherstellen, dass kein Intervall läuft
        factory.productionProgressFill.style.width = '0%';
        console.log(`Fabrik im Slot ${factory.slotIndex}: Nicht genügend Ressourcen zum Starten der Produktion.`);
    }
}


// Funktion, die im Game-Loop und bei Storage-Updates aufgerufen wird
function checkFactoryProduction() {
    factories.forEach(factory => {
        // Nur wenn die Fabrik NICHT bereits produziert
        if (!factory.productionInterval && currentStorage >= CONFIG.Factories.storageConsumption) {
            startFactoryProduction(factory); // Versuche, Produktion wieder aufzunehmen
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
        const yieldText = `Ertrag: ${currentSelectedFactory.yield * currentSelectedFactory.yieldMultiplier} Score`;
        const speedText = `Tempo: ${Math.round(currentSelectedFactory.duration / currentSelectedFactory.speedMultiplier / 1000 * 10) / 10}s`;
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
        startFactoryProduction(currentSelectedFactory); // Produktion neu starten mit neuem Tempo
        updateFactoryUpgradeMenuDisplay();
        checkButtonStates();
    }
}


// --- Button-Funktionen ---
function buyCollector() {
    if (score >= buyCollectorCost) {
        updateScore(-buyCollectorCost);
        addCollectorShip();
        buyCollectorCost = Math.ceil(buyCollectorCost * CONFIG.Collectors.buyCostMultiplier);
        checkButtonStates();
    }
}

function upgradeCollectorSpeed() {
    if (score >= collectorSpeedUpgradeCost) {
        updateScore(-collectorSpeedUpgradeCost);
        collectorBaseSpeed += CONFIG.Collectors.speedUpgradeIncrease;
        collectorSpeedUpgradeCost = Math.ceil(collectorSpeedUpgradeCost * CONFIG.Collectors.speedUpgradeCostMultiplier);
        checkButtonStates();
    }
}

function upgradeCollectorYield() {
    if (score >= collectorYieldUpgradeCost) {
        updateScore(-collectorYieldUpgradeCost);
        collectorYieldMultiplier = Math.round((collectorYieldMultiplier + CONFIG.Collectors.yieldUpgradeIncrease) * 10) / 10;
        collectors.forEach(c => c.deliveryAmount = Math.round(collectorBaseYield * collectorYieldMultiplier));
        collectorYieldUpgradeCost = Math.ceil(collectorYieldUpgradeCost * CONFIG.Collectors.yieldUpgradeCostMultiplier);
        checkButtonStates();
    }
}

function upgradeStorage() {
    if (score >= storageUpgradeCost) {
        updateScore(-storageUpgradeCost);
        maxStorage = Math.round(maxStorage * CONFIG.Storage.upgradeCapacityMultiplier);
        storageUpgradeCost = Math.ceil(storageUpgradeCost * CONFIG.Storage.upgradeCostMultiplier);
        storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
    }
    // Nach Lager-Update checkFactoryProduction aufrufen, da sich Ressourcen geändert haben könnten
    checkFactoryProduction();
    checkButtonStates();
}

// --- Zoom-Funktionalität ---
function handleZoom(event) {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? (1 - CONFIG.Game.zoomStep) : (1 + CONFIG.Game.zoomStep);

    gameUnitPx = Math.max(
        Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight) * CONFIG.Game.gameUnitMinScale / 100,
        Math.min(
            Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight) * CONFIG.Game.gameUnitMaxScale / 100,
            gameUnitPx * zoomFactor
        )
    );

    updateGameUnit();
}

// --- Haupt-Game-Loop ---
function gameLoop() {
    collectors.forEach(collector => {
        const currentSpeed = collectorBaseSpeed;

        // Standardmäßig alle Balken ausblenden, außer sie werden explizit gesetzt
        collector.miningProgressBar.style.display = 'none';

        if (collector.state === STATE_RETURNING_TO_SOURCE) {
            // Keine Ladebalkenanzeige während der Reise
            if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                collector.targetPlanet = getNextAvailablePlanet();
                if (!collector.targetPlanet) {
                    collector.state = STATE_IDLE_NO_PLANETS;
                    return;
                }
            }
            const targetX = collector.targetPlanet.x_percent;
            const targetY = collector.targetPlanet.y_percent;

            const dx = targetX - collector.x_percent;
            const dy = targetY - collector.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const planetRenderedRadius = collector.targetPlanet.element.offsetWidth / 2;
            const collectorRenderedRadius = collector.element.offsetWidth / 2;

            const distancePx = Math.sqrt(
                Math.pow((targetX / 100 * gameContainer.offsetWidth) - (collector.x_percent / 100 * gameContainer.offsetWidth), 2) +
                Math.pow((targetY / 100 * gameContainer.offsetHeight) - (collector.y_percent / 100 * gameContainer.offsetHeight), 2)
            );

            if (distancePx < planetRenderedRadius + collectorRenderedRadius + (2 * gameUnitPx)) {
                collector.state = STATE_MINING;
                collector.miningStartTime = Date.now();
                collector.miningProgressBar.style.display = 'block'; // Jetzt anzeigen!
            } else {
                collector.x_percent += (dx / distance) * currentSpeed;
                collector.y_percent += (dy / distance) * currentSpeed;
            }

        } else if (collector.state === STATE_MINING) {
            collector.miningProgressBar.style.display = 'block'; // Mining-Balken anzeigen

            const elapsedTime = Date.now() - collector.miningStartTime;
            const progress = Math.min(1, elapsedTime / CONFIG.Collectors.miningDurationMs);

            collector.miningProgressFill.style.width = `${progress * 100}%`;

            if (progress >= 1) {
                if (collector.targetPlanet) {
                    collector.targetPlanet.resources -= collector.deliveryAmount;
                    collector.targetPlanet.resourcesDisplay.textContent = Math.max(0, collector.targetPlanet.resources);
                    if (collector.targetPlanet.resources <= 0) {
                        removePlanet(collector.targetPlanet);
                        collector.targetPlanet = null;
                    }
                }
                collector.state = STATE_RETURNING_TO_BASE;
                collector.miningProgressBar.style.display = 'none'; // Mining-Balken ausblenden
            }
            if (collector.targetPlanet) {
                collector.x_percent = collector.targetPlanet.x_percent - (CONFIG.Collectors.sizePercent / 2);
                collector.y_percent = collector.targetPlanet.y_percent - (CONFIG.Collectors.sizePercent / 2);
            } else {
                collector.state = STATE_RETURNING_TO_BASE;
            }

        } else if (collector.state === STATE_RETURNING_TO_BASE) {
            // Keine Ladebalkenanzeige während der Rückreise
            const baseCenter = getMiningBaseCenter();
            const dockPosX_percent = baseCenter.x;
            const dockPosY_percent = baseCenter.y;

            const dx = dockPosX_percent - collector.x_percent;
            const dy = dockPosY_percent - collector.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const collectorRenderedRadius = collector.element.offsetWidth / 2;
            const distancePx = Math.sqrt(
                Math.pow((dockPosX_percent / 100 * gameContainer.offsetWidth) - (collector.x_percent / 100 * gameContainer.offsetWidth), 2) +
                Math.pow((dockPosY_percent / 100 * gameContainer.offsetHeight) - (collector.y_percent / 100 * gameContainer.offsetHeight), 2)
            );

            if (distancePx < collectorRenderedRadius + (2 * gameUnitPx)) {
                collector.state = STATE_DELIVERING;
                collector.x_percent = dockPosX_percent;
                collector.y_percent = dockPosY_percent;
            } else {
                collector.x_percent += (dx / distance) * currentSpeed * 1.5;
                collector.y_percent += (dy / distance) * currentSpeed * 1.5;
            }

        } else if (collector.state === STATE_DELIVERING) {
            // Keine Ladebalkenanzeige während der Lieferung
            const amountToDeliver = collector.deliveryAmount;
            const baseCenter = getMiningBaseCenter();

            if (currentStorage + amountToDeliver <= maxStorage) {
                updateStorage(amountToDeliver);
                updateScore(amountToDeliver);
                showPlusAmount(amountToDeliver, baseCenter.x, baseCenter.y - (10 * gameUnitPx / gameContainer.offsetHeight * 100));

                collector.state = STATE_RETURNING_TO_SOURCE;
                collector.targetPlanet = null;
            } else {
                // Lager voll, Sammler wartet am Dock
            }
        } else if (collector.state === STATE_IDLE_NO_PLANETS) {
            // Keine Ladebalkenanzeige im Idle-Zustand
            if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                collector.targetPlanet = getNextAvailablePlanet();
                if (collector.targetPlanet) {
                    collector.state = STATE_RETURNING_TO_SOURCE;
                }
            }
        }

        collector.element.style.left = `${collector.x_percent - (CONFIG.Collectors.sizePercent / 2)}%`;
        collector.element.style.top = `${collector.y_percent - (CONFIG.Collectors.sizePercent / 2)}%`;
    });

    factories.forEach(factory => {
        // Nur Balken aktualisieren, wenn die Fabrik aktiv produziert (productionInterval gesetzt ist)
        if (factory.productionInterval && factory.productionProgressFill) {
            const elapsedTime = Date.now() - factory.productionStartTime;
            const currentProductionDuration = factory.duration / factory.speedMultiplier;
            const progress = Math.min(1, elapsedTime / currentProductionDuration);
            factory.productionProgressFill.style.width = `${progress * 100}%`;
        } else if (factory.productionProgressFill) {
            // Wenn keine Produktion läuft, Balken auf 0% setzen
            factory.productionProgressFill.style.width = '0%';
        }
    });


    requestAnimationFrame(gameLoop);
}

// --- Initialisierung beim Laden der Seite ---
buyCollectorButton.addEventListener('click', buyCollector);
upgradeCollectorSpeedButton.addEventListener('click', upgradeCollectorSpeed);
upgradeCollectorYieldButton.addEventListener('click', upgradeCollectorYield);
upgradeStorageButton.addEventListener('click', upgradeStorage);

buildFactoryButton.addEventListener('click', buildFactory);
closeBuildMenuButton.addEventListener('click', hideBuildMenu);
closeFactoryUpgradeMenuButton.addEventListener('click', hideFactoryUpgradeMenu);
upgradeFactoryYieldButton.addEventListener('click', upgradeFactoryYield);
upgradeFactorySpeedButton.addEventListener('click', upgradeFactorySpeed);


window.addEventListener('resize', updateGameUnit);

window.onload = () => {
    updateGameUnit(); // Setzt die initiale gameUnit

    // Statt ein neues Element zu erstellen, das vorhandene im HTML nehmen
    if (storageArea) {
        storageFill = document.getElementById('storage-fill');
    } else {
        console.error("Element mit ID 'storage-area' nicht gefunden bei Initialisierung.");
    }

    initializePlanets();
    for (let i = 0; i < CONFIG.Collectors.initialCount; i++) {
        addCollectorShip();
    }

    // Wichtig: updateStorage MUSS NACHDEM storageFill an den DOM angehängt wurde aufgerufen werden.
    updateStorage(CONFIG.Game.initialStorage);

    initializeFactoryPlots();
    checkButtonStates();

    gameContainer.addEventListener('wheel', handleZoom);

    requestAnimationFrame(gameLoop);
};
