// --- DOM-Elemente abrufen ---
const gameContainer = document.getElementById('game-container');
const miningBase = document.getElementById('mining-base');
const planet = document.getElementById('planet');

const scoreDisplay = document.getElementById('score-display');
const laserCountDisplay = document.getElementById('laser-count-display');
const laserYieldDisplay = document.getElementById('laser-yield-display');
const laserSpeedDisplay = document.getElementById('laser-speed-display');

const buyLaserButton = document.getElementById('buy-laser-button');
const buyLaserMultiplierButton = document.getElementById('buy-laser-multiplier-button'); // Korrigiert: = document.getElementById statt = document = document.getElementById
const upgradeLaserSpeedButton = document.getElementById('upgrade-laser-speed-button');

// --- Spielzustandsvariablen ---
let score = 100;

// Laser-Variablen
let lasers = []; // Enthält die Objekte für die Slots
let activeLasers = 0; // Zählt die tatsächlich freigeschalteten Laser
let laserYieldMultiplier = 1.0; // Startet bei x1.0
let laserBaseFireInterval = 1000; // 1000ms = 1 Sekunde Basisschussintervall
const laserBaseYield = 1; // Grundertrag pro Schuss pro Laser

let buyLaserCost = 50; // Kosten für das Freischalten eines neuen Lasers
let laserMultiplierCost = 10; // Kosten für den ersten Multiplikator
let laserSpeedUpgradeCost = 20; // Kosten für das erste Geschwindigkeits-Upgrade

const MAX_LASER_SLOTS = 5; // Maximale Anzahl der Laser-Slots

// Feste Maße des game-containers (aus CSS übernommen)
const GAME_CONTAINER_WIDTH = 400;
const GAME_CONTAINER_HEIGHT = 700;

// Positionen und Dimensionen der Hauptelemente (relativ zum game-container)
// Werden in updateElementPositions() aktualisiert
let miningBaseX_rel, miningBaseY_rel, miningBaseWidth, miningBaseHeight;
let planetX_rel, planetY_rel, planetWidth, planetHeight;

// Zoom-Variablen - nur einmal deklarieren
let zoomLevel = 1.0;
const ZOOM_SPEED = 0.05;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;

// --- Hilfsfunktionen ---

// Aktualisiert die Positionen und Größen der Hauptelemente
function updateElementPositions() {
    // Holen der gerenderten Größen der Basis und des Planeten (in Pixeln)
    miningBaseWidth = miningBase.offsetWidth;
    miningBaseHeight = miningBase.offsetHeight;
    planetWidth = planet.offsetWidth;
    planetHeight = planet.offsetHeight;

    // `offsetLeft`/`offsetTop` sind korrekt, da sie relativ zum Positioned Parent (game-container) sind
    miningBaseX_rel = miningBase.offsetLeft + miningBaseWidth / 2;
    miningBaseY_rel = miningBase.offsetTop + miningBaseHeight / 2;

    planetX_rel = planet.offsetLeft + planetWidth / 2;
    planetY_rel = planet.offsetTop + planetHeight / 2;
}

// Aktualisiert den Score und die Anzeige
function updateScore(amount) {
    score = Math.round(score + amount); // Score immer runden
    scoreDisplay.textContent = `Score: ${score}`;
    checkButtonStates(); // Überprüft Button-Zustände nach Score-Änderung
}

// Überprüft und aktualisiert den Zustand (aktiv/inaktiv) und Text der Buttons
function checkButtonStates() {
    // Laser freischalten Button
    buyLaserButton.disabled = (score < buyLaserCost || activeLasers >= MAX_LASER_SLOTS);
    buyLaserButton.textContent = `Laser freischalten (Kosten: ${buyLaserCost})`;
    if (activeLasers >= MAX_LASER_SLOTS) {
        buyLaserButton.textContent = `Max Laser (${MAX_LASER_SLOTS})`;
    }

    // Laser Multiplikator Button
    buyLaserMultiplierButton.disabled = (score < laserMultiplierCost);
    // Anzeige des Ertrags auf eine Dezimalstelle gerundet
    laserYieldDisplay.textContent = `Ertrag: x${(Math.round(laserYieldMultiplier * 10) / 10).toFixed(1)}`;
    buyLaserMultiplierButton.textContent = `Laser Multi (Kosten: ${laserMultiplierCost})`;

    // Schussrate erhöhen Button
    const isMaxSpeedReached = laserBaseFireInterval <= 50; // Limit bei 0.05 Sekunden
    upgradeLaserSpeedButton.disabled = (score < laserSpeedUpgradeCost || isMaxSpeedReached);
    // Anzeige der Schussrate auf zwei Dezimalstellen
    laserSpeedDisplay.textContent = `Rate: ${ (laserBaseFireInterval / 1000).toFixed(2) }s`;
    upgradeLaserSpeedButton.textContent = `Laser Speed (Kosten: ${laserSpeedUpgradeCost})`;
    if (isMaxSpeedReached) {
        upgradeLaserSpeedButton.textContent = `Max. Rate`;
    }
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

// --- Laser Logik ---

// Berechnet die korrekte Position eines Lasers auf der Basis
function calculateLaserPosition(slotIndex) {
    // Die Maße des Dreiecks, wie im CSS definiert
    const turretHalfWidth = 15; // border-left/right ist 15px, also Gesamtbreite 30px
    const turretHeight = 25; // border-bottom ist 25px
    const padding = 20; // Abstand vom Rand des Raumschiffs an der Oberseite

    const baseTopEdgeY = miningBase.offsetTop;
    const baseLeftEdgeX = miningBase.offsetLeft;
    const baseWidth = miningBase.offsetWidth;

    // Berechne die verfügbare Breite für die Platzierung der Laser
    const usableWidth = baseWidth - (2 * padding);
    let spacing = 0;
    if (MAX_LASER_SLOTS > 1) {
        // Abstand zwischen den *Anfangspunkten* der Dreiecke (für die Gleichverteilung)
        spacing = (usableWidth - (MAX_LASER_SLOTS * (turretHalfWidth * 2))) / (MAX_LASER_SLOTS - 1);
    }
    
    // X-Position: Startet am linken Rand der Basis + Padding, dann für jeden Laser den Offset hinzufügen
    // Die Position ist die linke Seite des Turret-Elements.
    let posX = baseLeftEdgeX + padding + (slotIndex * (turretHalfWidth * 2 + spacing)) - 150;

    // Y-Position: Die obere Kante des Rechtecks minus die Höhe des Dreiecks.
    // So sitzt die Basis des Dreiecks (welches nach oben zeigt) direkt auf der oberen Kante des Rechtecks.
    let posY = baseTopEdgeY - 80;

    // Wenn nur 1 Laser Slot, zentriere ihn oben auf der Basis
    if (MAX_LASER_SLOTS === 1) {
        posX = baseLeftEdgeX + (baseWidth / 2) - turretHalfWidth;
    }

    return { x: posX, y: posY };
}

// Initialisiert alle Laser-Slots zu Beginn des Spiels als inaktiv
function initializeLaserSlots() {
    updateElementPositions(); // Sicherstellen, dass die Basis-Größen aktuell sind!

    for (let i = 0; i < MAX_LASER_SLOTS; i++) {
        const laserTurretElement = document.createElement('div');
        laserTurretElement.classList.add('laser-turret');

        const laserBeamElement = document.createElement('div');
        laserBeamElement.classList.add('laser-beam');

        gameContainer.appendChild(laserTurretElement);
        gameContainer.appendChild(laserBeamElement);

        const pos = calculateLaserPosition(i);
        laserTurretElement.style.left = `${pos.x}px`;
        laserTurretElement.style.top = `${pos.y}px`;

        const laser = {
            element: laserTurretElement,
            beamElement: laserBeamElement,
            x: pos.x, // Speichern der X-Position des Turrets (relativ zum gameContainer)
            y: pos.y, // Speichern der Y-Position des Turrets (relativ zum gameContainer)
            lastFireTime: Date.now() + (i * 500), // Staffelung der Anfangsfeuerzeit
            isActive: false // Initial inaktiv
        };
        lasers.push(laser);
    }
    laserCountDisplay.textContent = `Laser: ${activeLasers}/${MAX_LASER_SLOTS}`;
}

// Aktiviert den nächsten verfügbaren Laser-Slot
function activateNextLaser() {
    if (activeLasers < MAX_LASER_SLOTS) {
        const laserToActivate = lasers[activeLasers];
        laserToActivate.isActive = true;
        laserToActivate.element.classList.add('active'); // Fügt CSS-Klasse für aktiven Zustand hinzu
        activeLasers++;
        laserCountDisplay.textContent = `Laser: ${activeLasers}/${MAX_LASER_SLOTS}`;
    }
}

// --- Button-Funktionen ---

// Kauft und schaltet einen neuen Laser frei
function buyLaser() {
    if (score >= buyLaserCost && activeLasers < MAX_LASER_SLOTS) {
        updateScore(-buyLaserCost);
        activateNextLaser();
        buyLaserCost = Math.ceil(buyLaserCost * 1.5); // Kostenanstieg
        checkButtonStates();
    }
}

// Erhöht den Multiplikator für den Laser-Ertrag
function buyLaserMultiplier() {
    if (score >= laserMultiplierCost) {
        updateScore(-laserMultiplierCost);
        laserYieldMultiplier = Math.round((laserYieldMultiplier + 1) * 10) / 10; // Erhöht um 0.2, rundet auf 1 Dezimalstelle
        laserMultiplierCost = Math.ceil(laserMultiplierCost * 1.5); // Kostenanstieg
        checkButtonStates();
    }
}

// Erhöht die Schussgeschwindigkeit der Laser
function upgradeLaserSpeed() {
    if (score >= laserSpeedUpgradeCost && laserBaseFireInterval > 50) { // Limit bei 0.05 Sekunden
        updateScore(-laserSpeedUpgradeCost);
        laserBaseFireInterval = Math.max(50, laserBaseFireInterval * 0.9); // Reduziert das Intervall um 10%
        laserSpeedUpgradeCost = Math.ceil(laserSpeedUpgradeCost * 1.2); // Kostenanstieg
        checkButtonStates();
    }
}

// --- Zoom-Funktionalität ---
function handleZoom(event) {
    event.preventDefault(); // Verhindert das Scrollen der Seite

    const zoomFactor = event.deltaY > 0 ? (1 - ZOOM_SPEED) : (1 + ZOOM_SPEED); // Mausrad hoch = rein, runter = raus
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel * zoomFactor)); // Zoom-Level innerhalb der Grenzen halten

    gameContainer.style.transform = `scale(${zoomLevel})`; // Skaliert den gesamten Spiel-Container

    // Da der gameContainer skaliert wird, bleiben die relativen Positionen der Kindelemente innerhalb
    // des Containers korrekt. Nur die `offsetLeft`/`offsetTop` etc. Werte der Kindelemente selbst
    // (die durch CSS-Layout berechnet werden) müssen eventuell neu gelesen werden, um genaue Startpunkte
    // für Laserstrahlen und Popups zu erhalten.
    updateElementPositions();
}

// --- Haupt-Game-Loop ---
function gameLoop() {
    // `updateElementPositions` wird hier aufgerufen, um aktuelle Positionen/Größen der Elemente
    // (innerhalb des nicht-skalierten `gameContainer`s) zu erhalten.
    // Dies ist wichtig für die korrekte Berechnung der Laserstrahlen und Popups.
    updateElementPositions();

    const currentTime = Date.now();
    lasers.forEach(laser => {
        // Nur aktive Laser feuern, wenn das Intervall erreicht ist
        if (laser.isActive && (currentTime - laser.lastFireTime >= laserBaseFireInterval)) {
            const firedYield = Math.round(laserBaseYield * laserYieldMultiplier); // Berechnet und rundet den Ertrag
            updateScore(firedYield); // Aktualisiert den Score

            // Zeigt das "+X" Popup über dem Planeten an
            showPlusAmount(firedYield, planetX_rel, planetY_rel - (planetHeight / 2) - 30);

            // Laserstrahl visualisieren
            // Startpunkt des Strahls ist die Spitze des Dreiecks-Lasers
            const turretCenterX_in_container = laser.x + 15; // Mitte der Dreiecksbasis (15px ist Hälfte von 30px Breite)
            const turretTipY_in_container = laser.y; // Oberste Spitze des Dreiecks

            // Zielpunkt des Strahls ist die Mitte des Planeten
            const dx = planetX_rel - turretCenterX_in_container;
            const dy = planetY_rel - turretTipY_in_container;
            const distance = Math.sqrt(dx * dx + dy * dy); // Länge des Strahls
            const angle = Math.atan2(dy, dx); // Winkel des Strahls

            laser.beamElement.style.left = `${turretCenterX_in_container}px`;
            laser.beamElement.style.top = `${turretTipY_in_container}px`;
            laser.beamElement.style.width = `${distance}px`;
            laser.beamElement.style.transform = `rotate(${angle}rad)`; // Dreht den Strahl
            laser.beamElement.style.display = 'block'; // Macht den Strahl sichtbar

            // Versteckt den Strahl nach kurzer Zeit
            setTimeout(() => {
                laser.beamElement.style.display = 'none';
            }, 100);

            laser.lastFireTime = currentTime; // Setzt den Zeitpunkt des letzten Feuerns zurück
        }
    });

    requestAnimationFrame(gameLoop); // Fordert den nächsten Frame an
}

// --- Initialisierung beim Laden der Seite ---
buyLaserButton.addEventListener('click', buyLaser);
buyLaserMultiplierButton.addEventListener('click', buyLaserMultiplier);
upgradeLaserSpeedButton.addEventListener('click', upgradeLaserSpeed);

// Event Listener für Größenänderung des Fensters (relevant, falls gameContainer responsive wäre)
// Hier aktualisiert es die Elementpositionen, da sich die offset-Werte nach einem Zoom ändern könnten
// und wir diese frischen Werte für die Strahl-Berechnung benötigen.
window.addEventListener('resize', () => {
    updateElementPositions();
    // Laser-Elemente müssen nicht explizit neu positioniert werden,
    // da ihre `left`/`top` bereits relativ zum gameContainer gesetzt sind
    // und der gameContainer selbst skaliert wird.
});

// Initialisiert die Laser-Slots und platziert sie visuell
updateElementPositions(); // Wichtig, um erste Positionen zu bekommen
initializeLaserSlots();

// Aktiviert den ersten Laser beim Spielstart
activateNextLaser();

// Aktualisiert den Zustand aller Buttons basierend auf dem Start-Score
checkButtonStates();

// Event Listener für Mausrad zum Zoomen
gameContainer.addEventListener('wheel', handleZoom);

// Startet den Game Loop
requestAnimationFrame(gameLoop);