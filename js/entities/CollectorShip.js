// js/entities/CollectorShip.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung

export const STATE_RETURNING_TO_SOURCE = 'returningToSource';
export const STATE_MINING = 'mining';
export const STATE_RETURNING_TO_BASE = 'returningToBase';
export const STATE_DELIVERING = 'delivering';
export const STATE_IDLE_NO_PLANETS = 'idleNoPlanets';

export class CollectorShip {
    /**
     * Erstellt eine Instanz eines Sammlerschiffs.
     * @param {string} id - Die eindeutige ID des Sammlers.
     * @param {HTMLElement} element - Das DOM-Element des Sammlers.
     * @param {HTMLElement} miningProgressBar - Das DOM-Element des Fortschrittsbalkens.
     * @param {HTMLElement} progressFill - Das DOM-Element der Füllung des Fortschrittsbalkens.
     * @param {number} x_percent - Die anfängliche X-Position des Sammlers in Prozent.
     * @param {number} y_percent - Die anfängliche Y-Position des Sammlers in Prozent.
     * @param {number} dockIndex - Der Index des Docks, an dem der Sammler andockt.
     * @param {number} initialYieldMultiplier - Der anfängliche Ertrags-Multiplikator.
     */
    constructor(id, element, miningProgressBar, progressFill, x_percent, y_percent, dockIndex, initialYieldMultiplier) {
        this.id = id;
        this.element = element;
        this.miningProgressBar = miningProgressBar;
        this.progressFill = progressFill;
        this.x_percent = x_percent;
        this.y_percent = y_percent;
        this.state = STATE_IDLE_NO_PLANETS; // Startzustand
        this.targetPlanet = null;
        this.deliveryAmount = Math.round(CONFIG.Collectors.baseYield * initialYieldMultiplier);
        this.dockIndex = dockIndex;
        this.miningStartTime = 0;
    }

    /**
     * Aktualisiert die Position des Sammlers.
     * @param {number} newX - Die neue X-Position in Prozent.
     * @param {number} newY - Die neue Y-Position in Prozent.
     */
    updatePosition(newX, newY) {
        this.x_percent = newX;
        this.y_percent = newY;
        this.element.style.left = `${this.x_percent}%`;
        this.element.style.top = `${this.y_percent}%`;
    }

    /**
     * Setzt das Zielplaneten für den Sammler.
     * @param {Planet|null} planet - Das Zielplanetenobjekt.
     */
    setTargetPlanet(planet) {
        this.targetPlanet = planet;
    }

    /**
     * Setzt den aktuellen Zustand des Sammlers.
     * @param {string} newState - Der neue Zustand (z.B. 'mining', 'returningToBase').
     */
    setState(newState) {
        this.state = newState;
    }

    /**
     * Startet den Mining-Vorgang und zeigt den Fortschrittsbalken an.
     */
    startMining() {
        this.miningStartTime = Date.now();
        this.miningProgressBar.style.display = 'block';
    }

    /**
     * Aktualisiert den Fortschritt des Minings.
     * @returns {number} Der aktuelle Fortschritt (0-1).
     */
    updateMiningProgress() {
        const elapsedTime = Date.now() - this.miningStartTime;
        const progress = Math.min(1, elapsedTime / CONFIG.Collectors.miningDurationMs);
        this.progressFill.style.width = `${progress * 100}%`;
        return progress;
    }

    /**
     * Verbirgt den Fortschrittsbalken.
     */
    hideProgressBar() {
        this.miningProgressBar.style.display = 'none';
    }

    /**
     * Setzt die Menge der zu liefernden Ressourcen basierend auf dem Ertrags-Multiplikator.
     * @param {number} yieldMultiplier - Der aktuelle Ertrags-Multiplikator.
     */
    setDeliveryAmount(yieldMultiplier) {
        this.deliveryAmount = Math.round(CONFIG.Collectors.baseYield * yieldMultiplier);
    }
}