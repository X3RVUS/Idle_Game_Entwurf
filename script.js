// --- DOM-Elemente abrufen ---
const gameContainer = document.getElementById('game-container');
const miningBase = document.getElementById('mining-base');
const planet = document.getElementById('planet');
const storageArea = document.getElementById('storage-area');
let storageFill; // Das Div, das die Füllung anzeigt

const scoreDisplay = document.getElementById('score-display');
const collectorCountDisplay = document.getElementById('collector-count-display');
const storageDisplay = document.getElementById('storage-display');

const buyCollectorButton = document.getElementById('buy-collector-button');
const upgradeCollectorSpeedButton = document.getElementById('upgrade-collector-speed-button');
const upgradeStorageButton = document.getElementById('upgrade-storage-button');
const upgradeCollectorYieldButton = document.getElementById('upgrade-collector-yield-button');

// --- Spielzustandsvariablen ---
let score = 0;

// Sammler-Variablen
let collectors = [];
let collectorBaseSpeed = 3; // Geschwindigkeit der Sammler-Punkte
let collectorBaseYield = 1; // Materialien pro Lieferung
let collectorYieldMultiplier = 1; // Multiplikator für Sammlerertrag
const MINING_DURATION = 5000; // 5 Sekunden Mining-Dauer

let buyCollectorCost = 10;
let collectorSpeedUpgradeCost = 20;
let collectorYieldUpgradeCost = 10;

// Lager-Variablen
let currentStorage = 0;
let maxStorage = 100;
let storageUpgradeCost = 50;

// Feste Maße des game-containers (aus CSS übernommen)
const GAME_CONTAINER_WIDTH = 400;
const GAME_CONTAINER_HEIGHT = 700;

// Positionen und Dimensionen der Hauptelemente (relativ zum game-container)
let miningBaseX_rel, miningBaseY_rel, miningBaseWidth, miningBaseHeight;
let planetX_rel, planetY_rel, planetWidth, planetHeight;

// Zoom-Variablen
let zoomLevel = 1.0;
const ZOOM_SPEED = 0.05;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

// Sammler-Zustände (EXPLORING wurde entfernt)
const STATE_RETURNING_TO_SOURCE = 'returningToSource'; // Fliegt zur Quelle (Planet)
const STATE_MINING = 'mining'; // Wartet und sammelt am Planeten
const STATE_RETURNING_TO_BASE = 'returningToBase'; // Fliegt zur Basis (Raumschiff-Dock)
const STATE_DELIVERING = 'delivering'; // Ist am Dock und lagert ab

// --- Hilfsfunktionen ---

function updateElementPositions() {
    miningBaseWidth = miningBase.offsetWidth;
    miningBaseHeight = miningBase.offsetHeight;
    planetWidth = planet.offsetWidth;
    planetHeight = planet.offsetHeight;

    const gameContainerRect = gameContainer.getBoundingClientRect();

    miningBaseX_rel = (miningBase.getBoundingClientRect().left - gameContainerRect.left) + miningBaseWidth / 2;
    miningBaseY_rel = (miningBase.getBoundingClientRect().top - gameContainerRect.top) + miningBaseHeight / 2;

    planetX_rel = (planet.getBoundingClientRect().left - gameContainerRect.left) + planetWidth / 2;
    planetY_rel = (planet.getBoundingClientRect().top - gameContainerRect.top) + planetHeight / 2;
}

function updateScore(amount) {
    score = Math.round(score + amount);
    scoreDisplay.textContent = `Score: ${score}`;
    checkButtonStates();
}

function updateStorage(amount) {
    currentStorage = Math.min(maxStorage, currentStorage + amount); // Nicht über Max gehen
    storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
    if (storageFill) { // Sicherstellen, dass storageFill existiert
        storageFill.style.width = `${(currentStorage / maxStorage) * 100}%`;
    }
    checkButtonStates();
}

function checkButtonStates() {
    buyCollectorButton.disabled = (score < buyCollectorCost);
    buyCollectorButton.textContent = `Neuer Sammler (Kosten: ${buyCollectorCost})`;

    upgradeCollectorSpeedButton.disabled = (score < collectorSpeedUpgradeCost);
    upgradeCollectorSpeedButton.textContent = `Sammler Tempo (Kosten: ${collectorSpeedUpgradeCost})`;

    upgradeCollectorYieldButton.disabled = (score < collectorYieldUpgradeCost);
    upgradeCollectorYieldButton.textContent = `Sammler Ertrag (Kosten: ${collectorYieldUpgradeCost})`;

    upgradeStorageButton.disabled = (score < storageUpgradeCost);
    upgradeStorageButton.textContent = `Lager erweitern (Kosten: ${storageUpgradeCost})`;
}

// Zeigt ein kurzes "+X" Pop-up an der angegebenen Position
function showPlusAmount(amount, x, y) {
    const pulse = document.createElement('div');
    pulse.classList.add('score-pulse');
    pulse.textContent = `+${amount}`;

    pulse.style.left = `${x}px`;
    pulse.style.top = `${y}px`;

    gameContainer.appendChild(pulse);

    pulse.addEventListener('animationend', () => {
        pulse.remove();
    });
}

// --- Sammler Logik ---
const DOCK_OFFSET_Y = 10; // Y-Offset von der Oberkante des Raumschiffs für Docks
const COLLECTOR_SIZE = 15; // Größe des Sammler-Punktes (aus CSS)
const MAX_COLLECTOR_DOCKS = 5; // Max Docks für Sammler (entspricht MAX_LASER_SLOTS von früher)

// Funktion zum Hinzufügen eines Sammler-Schiffs
function addCollectorShip() {
    const collectorDotElement = document.createElement('div');
    collectorDotElement.classList.add('collector-dot');

    // Ladebalken für diesen Sammler erstellen
    const progressBar = document.createElement('div');
    progressBar.classList.add('mining-progress-bar');
    const progressFill = document.createElement('div');
    progressFill.classList.add('mining-progress-fill');
    progressBar.appendChild(progressFill);
    collectorDotElement.appendChild(progressBar);

    gameContainer.appendChild(collectorDotElement);

    // Dock-Position für den neuen Sammler berechnen
    // Dies entspricht der Position, an der er starten und abliefern wird
    const dockPosX = miningBase.offsetLeft + (miningBase.offsetWidth / MAX_COLLECTOR_DOCKS) * (collectors.length % MAX_COLLECTOR_DOCKS + 0.5) - (COLLECTOR_SIZE / 2);
    const dockPosY = miningBase.offsetTop - DOCK_OFFSET_Y;

    const collector = {
        element: collectorDotElement,
        progressBar: progressBar,
        progressFill: progressFill,
        x: dockPosX, // Start direkt am Dock
        y: dockPosY,
        vx: 0,
        vy: 0,
        state: STATE_RETURNING_TO_SOURCE, // NEU: Start direkt zum Planeten fliegend
        targetX: 0,
        targetY: 0,
        deliveryAmount: Math.round(collectorBaseYield * collectorYieldMultiplier),
        dockIndex: collectors.length % MAX_COLLECTOR_DOCKS,
        miningStartTime: 0
    };
    collectors.push(collector);

    collectorCountDisplay.textContent = `Sammler: ${collectors.length}`;
}

// --- Button-Funktionen für Sammler ---
function buyCollector() {
    if (score >= buyCollectorCost) {
        updateScore(-buyCollectorCost);
        addCollectorShip();
        buyCollectorCost = Math.ceil(buyCollectorCost * 1.5);
        checkButtonStates();
    }
}

function upgradeCollectorSpeed() {
    if (score >= collectorSpeedUpgradeCost && collectorBaseSpeed < 10) { // Limit für Geschwindigkeit
        updateScore(-collectorSpeedUpgradeCost);
        collectorBaseSpeed += 0.5; // Erhöht Geschwindigkeit
        collectorSpeedUpgradeCost = Math.ceil(collectorSpeedUpgradeCost * 1.8); // Kostenanstieg
        checkButtonStates();
    }
}

function upgradeCollectorYield() {
    if (score >= collectorYieldUpgradeCost) {
        updateScore(-collectorYieldUpgradeCost);
        collectorYieldMultiplier = Math.round((collectorYieldMultiplier + 0.5) * 10) / 10; // Ertrag +0.5
        collectors.forEach(c => c.deliveryAmount = Math.round(collectorBaseYield * collectorYieldMultiplier));
        collectorYieldUpgradeCost = Math.ceil(collectorYieldUpgradeCost * 1.6);
        checkButtonStates();
    }
}

function upgradeStorage() {
    if (score >= storageUpgradeCost) {
        updateScore(-storageUpgradeCost);
        maxStorage = Math.round(maxStorage * 1.5); // Lager um 50% erhöhen
        storageUpgradeCost = Math.ceil(storageUpgradeCost * 2); // Kostenanstieg
        storageDisplay.textContent = `Lager: ${currentStorage} / ${maxStorage}`;
        checkButtonStates();
    }
}


// --- Zoom-Funktionalität ---
function handleZoom(event) {
    event.preventDefault();

    const zoomFactor = event.deltaY > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED);
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * zoomFactor));

    gameContainer.style.transform = `scale(${zoomLevel})`;

    updateElementPositions();
}

// --- Haupt-Game-Loop ---
function gameLoop() {
    updateElementPositions();

    collectors.forEach(collector => {
        const currentSpeed = collectorBaseSpeed;
        const collectorSize = collector.element.offsetWidth;

        // Zustandsspezifische Logik
        if (collector.state === STATE_RETURNING_TO_SOURCE) {
            // Fliegt zum Planeten (Ressourcenquelle)
            const targetX = planetX_rel - (collectorSize / 2); // Mitte des Planeten minus halbe Sammlergröße
            const targetY = planetY_rel - (collectorSize / 2);

            const dx = targetX - collector.x;
            const dy = targetY - collector.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5) { // Planeten-Nähe erreicht
                collector.state = STATE_MINING; // Beginnt mit dem Mining
                collector.miningStartTime = Date.now(); // Startzeit für Ladebalken
                collector.progressBar.style.display = 'block'; // Ladebalken anzeigen
            } else {
                collector.x += (dx / distance) * currentSpeed * 1.2;
                collector.y += (dy / distance) * currentSpeed * 1.2;
            }
            collector.progressBar.style.display = 'none'; // Ladebalken verstecken während des Flugs

        } else if (collector.state === STATE_MINING) { // Mining-Zustand
            const elapsedTime = Date.now() - collector.miningStartTime;
            const progress = Math.min(1, elapsedTime / MINING_DURATION); // Fortschritt von 0 bis 1

            collector.progressFill.style.width = `${progress * 100}%`; // Ladebalken aktualisieren
            collector.progressBar.style.display = 'block'; // Ladebalken anzeigen

            if (progress >= 1) {
                collector.state = STATE_RETURNING_TO_BASE; // Mining abgeschlossen, fliegt zur Basis
                collector.progressBar.style.display = 'none'; // Ladebalken verstecken
            }
            // Sammler bleibt an Position (x,y) während des Mining
            collector.x = planetX_rel - (collectorSize / 2); // Position am Planeten halten
            collector.y = planetY_rel - (collectorSize / 2);

        } else if (collector.state === STATE_RETURNING_TO_BASE) {
            // Fliegt zurück zu seinem spezifischen Dock am Raumschiff
            const dockPosX = miningBase.offsetLeft + (miningBase.offsetWidth / MAX_COLLECTOR_DOCKS) * (collector.dockIndex + 0.5) - (COLLECTOR_SIZE / 2);
            const dockPosY = miningBase.offsetTop - DOCK_OFFSET_Y;

            const dx = dockPosX - collector.x;
            const dy = dockPosY - collector.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 5) { // Dock erreicht
                collector.state = STATE_DELIVERING;
                collector.x = dockPosX; // An Dock-Position fixieren
                collector.y = dockPosY;
            } else {
                collector.x += (dx / distance) * currentSpeed * 1.5;
                collector.y += (dy / distance) * currentSpeed * 1.5;
            }
            collector.progressBar.style.display = 'none'; // Ladebalken verstecken

        } else if (collector.state === STATE_DELIVERING) {
            // Materialien ablegen und Lager aktualisieren
            const amountToDeliver = collector.deliveryAmount;
            if (currentStorage + amountToDeliver <= maxStorage) {
                updateStorage(amountToDeliver);
                updateScore(amountToDeliver); // Score wird direkt beim Einlagern erhöht
                showPlusAmount(amountToDeliver, miningBaseX_rel, miningBaseY_rel - miningBaseHeight / 2 - 20); // Über der Basis anzeigen
                
                // Nach Lieferung: direkt wieder zum Planeten fliegen (kein EXPLORING mehr)
                collector.state = STATE_RETURNING_TO_SOURCE;
            } else {
                // Lager voll, Sammler wartet am Dock
                // Bleibt in diesem Zustand, bis Platz im Lager ist
            }
            collector.progressBar.style.display = 'none'; // Ladebalken verstecken
        }

        // Aktualisiere die Position des Sammler-Elements
        collector.element.style.left = `${collector.x}px`;
        collector.element.style.top = `${collector.y}px`;
    });

    requestAnimationFrame(gameLoop);
}

// --- Initialisierung beim Laden der Seite ---
buyCollectorButton.addEventListener('click', buyCollector);
upgradeCollectorSpeedButton.addEventListener('click', upgradeCollectorSpeed);
upgradeCollectorYieldButton.addEventListener('click', upgradeCollectorYield);
upgradeStorageButton.addEventListener('click', upgradeStorage);

// Initialisiert die Lagerfläche visuell
storageFill = document.createElement('div');
storageFill.id = 'storage-fill';
storageArea.appendChild(storageFill);

// Event Listener für Größenänderung des Fensters (relevant, falls gameContainer responsive wäre)
window.addEventListener('resize', () => {
    updateElementPositions();
});

updateElementPositions(); // Einmal am Anfang aufrufen

// Füge einen ersten Sammler hinzu, um das Spiel zu starten
addCollectorShip();

// Initialer Zustand des Lagers
updateStorage(0); // Setzt Anzeige auf 0 / Max

// Aktualisiert den Zustand aller Buttons
checkButtonStates();

// Event Listener für Mausrad zum Zoomen
gameContainer.addEventListener('wheel', handleZoom);

// Startet den Game Loop
requestAnimationFrame(gameLoop);