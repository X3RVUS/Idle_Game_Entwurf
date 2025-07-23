// --- DOM-Elemente ---
const gameContainer = document.getElementById('game-container');
const miningBase = document.getElementById('mining-base');
const storageArea = document.getElementById('storage-area');
let storageFill;

const scoreDisplay = document.getElementById('score-display');
const collectorCountDisplay = document.getElementById('collector-count-display');
const storageDisplay = document.getElementById('storage-display');

const buyCollectorButton = document.getElementById('buy-collector-button');
const upgradeCollectorSpeedButton = document.getElementById('upgrade-collector-speed-button');
const upgradeStorageButton = document.getElementById('upgrade-storage-button');
const upgradeCollectorYieldButton = document.getElementById('upgrade-collector-yield-button');

// --- Variablen ---
let score = 0;
let collectors = [];
let collectorBaseSpeed = 0.5; // Angepasste Geschwindigkeit für bessere Kontrolle mit %-Werten
let collectorBaseYield = 1;
let collectorYieldMultiplier = 1;
const MINING_DURATION = 5000;

let buyCollectorCost = 10;
let collectorSpeedUpgradeCost = 20;
let collectorYieldUpgradeCost = 10;

let currentStorage = 0;
let maxStorage = 100;
let storageUpgradeCost = 50;

let gameUnitPx = 1; // Die dynamisch berechnete "Spieleinheit" in Pixeln

let planets = [];
const INITIAL_PLANET_COUNT = 3;
const PLANET_SPAWN_AREA_TOP_REL = 0.05; // Relative Y-Position von oben (5%)
const PLANET_SPAWN_AREA_BOTTOM_REL = 0.40; // Relative Y-Position von oben (40%)
const PLANET_MIN_RESOURCES = 100;
const PLANET_MAX_RESOURCES = 500;
const PLANET_SIZE_PERCENT = 8; // Planetengröße in % der --game-unit (aus CSS)

const STATE_RETURNING_TO_SOURCE = 'returningToSource';
const STATE_MINING = 'mining';
const STATE_RETURNING_TO_BASE = 'returningToBase';
const STATE_DELIVERING = 'delivering';
const STATE_IDLE_NO_PLANETS = 'idleNoPlanets';

const DOCK_OFFSET_Y_PERCENT = 1; // Y-Offset von der Oberkante des Raumschiffs für Docks in % der game-unit
const COLLECTOR_SIZE_PERCENT = 1.5; // Größe des Sammler-Punktes in % der game-unit
const MAX_COLLECTOR_DOCKS = 5;

// --- Helper-Funktionen ---

// Berechnet und setzt die CSS-Variable --game-unit basierend auf der kleineren Dimension des Containers
function updateGameUnit() {
    const minDim = Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight);
    // Mindestgröße für Lesbarkeit, damit die Einheit nicht zu klein wird
    gameUnitPx = Math.max(1, minDim / 100); // 100, da 1vmin = 1% der kleineren Dimension
    document.documentElement.style.setProperty('--game-unit', `${gameUnitPx}px`);
}

// Konvertiert eine Prozentzahl (basierend auf der REFERENCE_WIDTH/HEIGHT) in eine Position in % des Containers
// Dies ist nicht mehr direkt notwendig, da wir direkt mit % arbeiten können
// Aber für die initiale Positionierung der Planeten und Sammler ist es gut, über eine Referenz zu arbeiten
// und dann in % umzurechnen.

function getMiningBaseCenter() {
    const rect = miningBase.getBoundingClientRect();
    const containerRect = gameContainer.getBoundingClientRect();
    // Umrechnung in relative Prozentwerte innerhalb des Containers
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
    if (storageFill) {
        storageFill.style.width = `${(currentStorage / maxStorage) * 100}%`;
    }
    checkButtonStates();
}

function checkButtonStates() {
    buyCollectorButton.disabled = score < buyCollectorCost;
    upgradeCollectorSpeedButton.disabled = score < collectorSpeedUpgradeCost;
    upgradeCollectorYieldButton.disabled = score < collectorYieldUpgradeCost;
    upgradeStorageButton.disabled = score < storageUpgradeCost;

    buyCollectorButton.textContent = `Neuer Sammler (Kosten: ${buyCollectorCost})`;
    upgradeCollectorSpeedButton.textContent = `Sammler Tempo (Kosten: ${collectorSpeedUpgradeCost})`;
    upgradeCollectorYieldButton.textContent = `Sammler Ertrag (Kosten: ${collectorYieldUpgradeCost})`;
    upgradeStorageButton.textContent = `Lager erweitern (Kosten: ${storageUpgradeCost})`;
}

function showPlusAmount(amount, x_percent, y_percent) {
    const pulse = document.createElement('div');
    pulse.classList.add('score-pulse');
    pulse.textContent = `+${amount}`;
    // Positionierung direkt in %
    pulse.style.left = `${x_percent}%`;
    pulse.style.top = `${y_percent}%`;
    gameContainer.appendChild(pulse);
    pulse.addEventListener('animationend', () => pulse.remove());
}

// --- Planeten ---
function spawnPlanet() {
    const el = document.createElement('div');
    el.classList.add('planet');

    // Positionierung der Planeten in Prozent des Containers
    // Sicherstellen, dass der Planet innerhalb des sichtbaren Bereichs bleibt
    const x_percent = Math.random() * (100 - PLANET_SIZE_PERCENT) + PLANET_SIZE_PERCENT / 2;
    // Y-Position basierend auf den RELATIVEN Bereichen
    const y_min_percent = PLANET_SPAWN_AREA_TOP_REL * 100;
    const y_max_percent = PLANET_SPAWN_AREA_BOTTOM_REL * 100;
    const y_percent = Math.random() * (y_max_percent - y_min_percent - PLANET_SIZE_PERCENT) + y_min_percent + PLANET_SIZE_PERCENT / 2;


    el.style.left = `${x_percent - PLANET_SIZE_PERCENT / 2}%`;
    el.style.top = `${y_percent - PLANET_SIZE_PERCENT / 2}%`;

    const resources = Math.floor(Math.random() * (PLANET_MAX_RESOURCES - PLANET_MIN_RESOURCES)) + PLANET_MIN_RESOURCES;
    const resDisplay = document.createElement('div');
    resDisplay.classList.add('planet-resources');
    resDisplay.textContent = resources;
    el.appendChild(resDisplay);

    gameContainer.appendChild(el);
    planets.push({
        element: el,
        resources,
        x_percent: x_percent, // Mitte des Planeten in %
        y_percent: y_percent,
        resourcesDisplay: resDisplay
    });
}

function initializePlanets() {
    for (let i = 0; i < INITIAL_PLANET_COUNT; i++) {
        spawnPlanet();
    }
}

function getNextAvailablePlanet() {
    return planets.find(p => p.resources > 0); // Findet den ersten Planeten mit Ressourcen
}

function removePlanet(planetToRemove) {
    planetToRemove.element.remove();
    planets = planets.filter(p => p !== planetToRemove);
    // Wenn alle Planeten abgebaut sind, neue spawnen
    if (planets.length === 0) {
        setTimeout(initializePlanets, 3000); // 3 Sekunden warten, dann neue Planeten spawnen
    }
}


// --- Sammler Logik ---
function addCollectorShip() {
    const collectorDotElement = document.createElement('div');
    collectorDotElement.classList.add('collector-dot');

    const progressBar = document.createElement('div');
    progressBar.classList.add('mining-progress-bar');
    const progressFill = document.createElement('div');
    progressFill.classList.add('mining-progress-fill');
    progressBar.appendChild(progressFill);
    collectorDotElement.appendChild(progressBar);

    gameContainer.appendChild(collectorDotElement);

    const baseRect = getMiningBaseTopLeft();

    // Dock-Position für den neuen Sammler in Prozent
    const dockPosX_percent = baseRect.x + (baseRect.width / MAX_COLLECTOR_DOCKS) * (collectors.length % MAX_COLLECTOR_DOCKS + 0.5);
    const dockPosY_percent = baseRect.y - DOCK_OFFSET_Y_PERCENT;


    const collector = {
        element: collectorDotElement,
        progressBar: progressBar,
        progressFill: progressFill,
        x_percent: dockPosX_percent, // Position in Prozent des Containers
        y_percent: dockPosY_percent,
        vx: 0,
        vy: 0,
        state: STATE_RETURNING_TO_SOURCE,
        targetPlanet: null,
        deliveryAmount: Math.round(collectorBaseYield * collectorYieldMultiplier),
        dockIndex: collectors.length % MAX_COLLECTOR_DOCKS,
        miningStartTime: 0
    };
    collectors.push(collector);

    collectorCountDisplay.textContent = `Sammler: ${collectors.length}`;
}

// --- Button-Funktionen ---
function buyCollector() {
    if (score >= buyCollectorCost) {
        updateScore(-buyCollectorCost);
        addCollectorShip();
        buyCollectorCost = Math.ceil(buyCollectorCost * 1.5);
        checkButtonStates();
    }
}

function upgradeCollectorSpeed() {
    if (score >= collectorSpeedUpgradeCost && collectorBaseSpeed < 10) {
        updateScore(-collectorSpeedUpgradeCost);
        collectorBaseSpeed += 0.1; // Kleinere Schritte, da die Bewegung in % ist
        collectorSpeedUpgradeCost = Math.ceil(collectorSpeedUpgradeCost * 1.8);
        checkButtonStates();
    }
}

function upgradeCollectorYield() {
    if (score >= collectorYieldUpgradeCost) {
        updateScore(-collectorYieldUpgradeCost);
        collectorYieldMultiplier = Math.round((collectorYieldMultiplier + 0.5) * 10) / 10;
        collectors.forEach(c => c.deliveryAmount = Math.round(collectorBaseYield * collectorYieldMultiplier));
        collectorYieldUpgradeCost = Math.ceil(collectorYieldUpgradeCost * 1.6);
        checkButtonStates();
    }
}

function upgradeStorage() {
    if (score >= storageUpgradeCost) {
        updateScore(-storageUpgradeCost);
        maxStorage = Math.round(maxStorage * 1.5);
        storageUpgradeCost = Math.ceil(storageUpgradeCost * 2);
        storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
        checkButtonStates();
    }
}

// --- Zoom-Funktionalität ---
function handleZoom(event) {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? (1 - 0.05) : (1 + 0.05); // 5% Zoom-Schritt
    // gameUnitPx direkt anpassen
    const newGameUnitPx = Math.max(0.5, Math.min(2.0, gameUnitPx / window.innerHeight * 100 * zoomFactor)); // Skaliert um Faktor
    // Sicherstellen, dass die gameUnitPx innerhalb vernünftiger Grenzen bleibt
    // Hier können wir einen Min/Max-Wert für die gameUnitPx direkt definieren
    const minGameUnit = Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight) / 150; // Z.B. min 1% von 1/1.5 der Containergröße
    const maxGameUnit = Math.min(gameContainer.offsetWidth, gameContainer.offsetHeight) / 50; // Z.B. max 1% von 2 der Containergröße
    gameUnitPx = Math.max(minGameUnit, Math.min(maxGameUnit, newGameUnitPx));

    updateGameUnit(); // Aktualisiert die CSS-Variable
}

// --- Haupt-Game-Loop ---
function gameLoop() {
    collectors.forEach(collector => {
        const currentSpeed = collectorBaseSpeed; // In Prozent pro Frame

        if (collector.state === STATE_RETURNING_TO_SOURCE) {
            if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                collector.targetPlanet = getNextAvailablePlanet();
                if (!collector.targetPlanet) {
                    collector.state = STATE_IDLE_NO_PLANETS;
                    collector.progressBar.style.display = 'none';
                    return;
                }
            }
            // Zielkoordinaten des Planeten in Prozent (Mitte des Planeten)
            const targetX = collector.targetPlanet.x_percent;
            const targetY = collector.targetPlanet.y_percent;

            const dx = targetX - collector.x_percent;
            const dy = targetY - collector.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Kollisionsprüfung: Wenn der Sammler nahe genug am Planeten ist
            // Hier nutzen wir die tatsächliche Rendergröße des Planeten und Sammlers in Pixeln
            // um eine genauere Kollision zu bestimmen.
            const planetRenderedRadius = collector.targetPlanet.element.offsetWidth / 2;
            const collectorRenderedRadius = collector.element.offsetWidth / 2;

            // Abstand in Pixeln
            const distancePx = Math.sqrt(
                Math.pow((targetX / 100 * gameContainer.offsetWidth) - (collector.x_percent / 100 * gameContainer.offsetWidth), 2) +
                Math.pow((targetY / 100 * gameContainer.offsetHeight) - (collector.y_percent / 100 * gameContainer.offsetHeight), 2)
            );

            if (distancePx < planetRenderedRadius + collectorRenderedRadius + (2 * gameUnitPx)) { // Kleiner Puffer in Pixel
                collector.state = STATE_MINING;
                collector.miningStartTime = Date.now();
                collector.progressBar.style.display = 'block';
            } else {
                collector.x_percent += (dx / distance) * currentSpeed;
                collector.y_percent += (dy / distance) * currentSpeed;
            }
            collector.progressBar.style.display = 'none';

        } else if (collector.state === STATE_MINING) {
            const elapsedTime = Date.now() - collector.miningStartTime;
            const progress = Math.min(1, elapsedTime / MINING_DURATION);

            collector.progressFill.style.width = `${progress * 100}%`;
            collector.progressBar.style.display = 'block';

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
                collector.progressBar.style.display = 'none';
            }
            // Sammler bleibt an Position am Planeten während des Minings
            if (collector.targetPlanet) {
                collector.x_percent = collector.targetPlanet.x_percent - (COLLECTOR_SIZE_PERCENT / 2);
                collector.y_percent = collector.targetPlanet.y_percent - (COLLECTOR_SIZE_PERCENT / 2);
            } else {
                collector.state = STATE_RETURNING_TO_BASE; // Falls Planet während des Minings verschwindet
            }

        } else if (collector.state === STATE_RETURNING_TO_BASE) {
            const baseRect = getMiningBaseTopLeft();

            const dockPosX_percent = baseRect.x + (baseRect.width / MAX_COLLECTOR_DOCKS) * (collector.dockIndex + 0.5);
            const dockPosY_percent = baseRect.y - DOCK_OFFSET_Y_PERCENT;

            const dx = dockPosX_percent - collector.x_percent;
            const dy = dockPosY_percent - collector.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Kollisionsprüfung in Pixeln
            const collectorRenderedRadius = collector.element.offsetWidth / 2;
            const distancePx = Math.sqrt(
                Math.pow((dockPosX_percent / 100 * gameContainer.offsetWidth) - (collector.x_percent / 100 * gameContainer.offsetWidth), 2) +
                Math.pow((dockPosY_percent / 100 * gameContainer.offsetHeight) - (collector.y_percent / 100 * gameContainer.offsetHeight), 2)
            );


            if (distancePx < collectorRenderedRadius + (2 * gameUnitPx)) { // Kleiner Puffer
                collector.state = STATE_DELIVERING;
                collector.x_percent = dockPosX_percent;
                collector.y_percent = dockPosY_percent;
            } else {
                collector.x_percent += (dx / distance) * currentSpeed * 1.5; // Schneller zurück zur Basis
                collector.y_percent += (dy / distance) * currentSpeed * 1.5;
            }
            collector.progressBar.style.display = 'none';

        } else if (collector.state === STATE_DELIVERING) {
            const amountToDeliver = collector.deliveryAmount;
            const baseCenter = getMiningBaseCenter(); // Position in %

            if (currentStorage + amountToDeliver <= maxStorage) {
                updateStorage(amountToDeliver);
                updateScore(amountToDeliver);
                // Position des Popups oberhalb der Basis (in %)
                showPlusAmount(amountToDeliver, baseCenter.x, baseCenter.y - (10 * gameUnitPx / gameContainer.offsetHeight * 100));
                
                collector.state = STATE_RETURNING_TO_SOURCE;
                collector.targetPlanet = null; // Zwingt Sammler, neuen Planeten zu suchen
            } else {
                // Lager voll, Sammler wartet am Dock
            }
            collector.progressBar.style.display = 'none';
        } else if (collector.state === STATE_IDLE_NO_PLANETS) {
            collector.progressBar.style.display = 'none';
        }

        // Aktualisiere die Position des Sammler-Elements in PROZENT für CSS
        collector.element.style.left = `${collector.x_percent - (COLLECTOR_SIZE_PERCENT / 2)}%`;
        collector.element.style.top = `${collector.y_percent - (COLLECTOR_SIZE_PERCENT / 2)}%`;
    });

    requestAnimationFrame(gameLoop);
}

// --- Initialisierung beim Laden der Seite ---
buyCollectorButton.addEventListener('click', buyCollector);
upgradeCollectorSpeedButton.addEventListener('click', upgradeCollectorSpeed);
upgradeCollectorYieldButton.addEventListener('click', upgradeCollectorYield);
upgradeStorageButton.addEventListener('click', upgradeStorage);

storageFill = document.createElement('div');
storageFill.id = 'storage-fill';
storageArea.appendChild(storageFill);


// Event Listener für Größenänderung des Fensters
window.addEventListener('resize', updateGameUnit);

window.onload = () => {
    updateGameUnit(); // Setze die initiale gameUnit
    initializePlanets();
    addCollectorShip(); // Erster Sammler
    updateStorage(0);
    checkButtonStates();

    gameContainer.addEventListener('wheel', handleZoom);

    requestAnimationFrame(gameLoop);
};