// js/managers/PlanetManager.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung
import { Planet } from '../entities/Planet.js'; // Pfadanpassung

class PlanetManager {
    constructor() {
        this.planets = [];
        this.planetsContainer = null;
        this.gameManager = null; // Referenz zum GameManager
        this.ui = null; // Referenz zur UI

        log('PlanetManager initialized.');
    }

    /**
     * Initialisiert den PlanetManager.
     * @param {HTMLElement} planetsContainer - Das DOM-Element, das die Planeten enthält.
     * @param {GameManager} gameManager - Instanz des GameManager.
     * @param {UI} ui - Instanz der UI.
     */
    init(planetsContainer, gameManager, ui) {
        this.planetsContainer = planetsContainer;
        this.gameManager = gameManager;
        this.ui = ui;
        this.gameManager.setPlanetManager(this); // Sich selbst beim GameManager registrieren
    }

    /**
     * Prüft, ob eine Planetenposition mit UI-Elementen kollidiert.
     * @param {number} x_percent - X-Position des Planetenmittelpunkts in Prozent.
     * @param {number} y_percent - Y-Position des Planetenmittelpunkts in Prozent.
     * @param {number} sizePercent - Größe des Planeten in Prozent.
     * @returns {boolean} True, wenn eine Überschneidung mit der UI vorliegt.
     */
    isOverlappingUI(x_percent, y_percent, sizePercent) {
        if (!this.ui || !this.ui.elements) return false;

        const half = sizePercent / 2;
        const planetRect = {
            left: x_percent - half,
            right: x_percent + half,
            top: y_percent - half,
            bottom: y_percent + half,
        };

        const elementsToCheck = [
            this.ui.elements.scoreDisplay,
            this.ui.elements.collectorCountDisplay,
            this.ui.elements.storageDisplay,
            this.ui.elements.storageArea,
            this.ui.elements.goodsDisplay,
            this.ui.elements.goodsArea,
        ];

        return elementsToCheck.some(el => {
            if (!el) return false;
            const { x, y, width, height } = this.ui.getElementTopLeftInPercent(el);
            const rect = { left: x, right: x + width, top: y, bottom: y + height };
            return !(planetRect.right < rect.left ||
                     planetRect.left > rect.right ||
                     planetRect.bottom < rect.top ||
                     planetRect.top > rect.bottom);
        });
    }

    /**
     * Erstellt einen neuen Planeten und fügt ihn dem Spiel hinzu.
     * @returns {Planet} Das neu erstellte Planetenobjekt.
     */
    spawnPlanet() {
        const el = document.createElement('div');
        el.classList.add('planet');
        el.id = `planet-${this.planets.length}`;

        const planetSizePercent = CONFIG.Planets.sizePercent;

        const y_min_percent = CONFIG.Planets.spawnAreaTopRelative * 100;
        const y_max_percent = CONFIG.Planets.spawnAreaBottomRelative * 100;

        let x_percent;
        let y_percent;
        let attempts = 0;
        const maxAttempts = 50;

        do {
            x_percent = Math.random() * (100 - planetSizePercent) + (planetSizePercent / 2);
            y_percent = Math.random() * (y_max_percent - y_min_percent - planetSizePercent) +
                y_min_percent + (planetSizePercent / 2);
            attempts++;
        } while (this.isOverlappingUI(x_percent, y_percent, planetSizePercent) && attempts < maxAttempts);

        if (attempts >= maxAttempts) {
            log(`[WARNING] spawnPlanet: Could not find non-overlapping position after ${attempts} attempts.`);
        }

        el.style.left = `${x_percent - (planetSizePercent / 2)}%`;
        el.style.top = `${y_percent - (planetSizePercent / 2)}%`;

        const resources = Math.floor(Math.random() * (CONFIG.Planets.maxResources - CONFIG.Planets.minResources)) + CONFIG.Planets.minResources;
        const resDisplay = document.createElement('div');
        resDisplay.classList.add('planet-resources');
        resDisplay.textContent = resources;
        el.appendChild(resDisplay);

        this.planetsContainer.appendChild(el);
        const newPlanet = new Planet(el.id, el, resources, x_percent, y_percent, resDisplay);
        this.planets.push(newPlanet);
        log(`Spawned planet ${newPlanet.id} at %: ${x_percent.toFixed(2)}, ${y_percent.toFixed(2)} with ${resources} resources.`);
        return newPlanet;
    }

    /**
     * Initialisiert die anfängliche Anzahl von Planeten.
     */
    initializePlanets() {
        log('Attempting to initialize planets...');
        this.planets.forEach(p => p.element.remove());
        this.planets = [];
        for (let i = 0; i < CONFIG.Planets.initialCount; i++) {
            this.spawnPlanet();
        }
        log(`Initialized ${this.planets.length} planets.`);
        this.ui.updateRenderedElementPositions(this.planets, this.ui.elements.miningBase);
    }

    /**
     * Gibt den nächsten verfügbaren Planeten mit Ressourcen zurück.
     * @returns {Planet|null} Der nächste Planet oder null, wenn keiner verfügbar ist.
     */
    getNextAvailablePlanet() {
        return this.planets.find(p => p.resources > 0);
    }

    /**
     * Entfernt einen Planeten aus dem Spiel.
     * @param {Planet} planetToRemove - Das Planetenobjekt, das entfernt werden soll.
     */
    removePlanet(planetToRemove) {
        log(`Removing planet with ${planetToRemove.resources} resources.`);
        planetToRemove.element.remove();
        this.planets = this.planets.filter(p => p !== planetToRemove);
        if (this.planets.length === 0) {
            log("All planets removed. Spawning new ones soon...");
            setTimeout(() => {
                this.initializePlanets();
                // Informiere den CollectorManager, dass neue Planeten verfügbar sind
                if (this.gameManager.collectorManager) {
                    this.gameManager.collectorManager.reassignIdleCollectors();
                }
            }, CONFIG.Planets.respawnDelayMs);
        }
    }

    /**
     * Gibt alle Planeten zurück.
     * @returns {Array<Planet>} Eine Liste aller Planeten.
     */
    getPlanets() {
        return this.planets;
    }
}

const planetManager = new PlanetManager();
export default planetManager;