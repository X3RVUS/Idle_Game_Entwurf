// js/entities/Planet.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung

export class Planet {
    /**
     * Erstellt eine Instanz eines Planeten.
     * @param {string} id - Die eindeutige ID des Planeten.
     * @param {HTMLElement} element - Das DOM-Element des Planeten.
     * @param {number} resources - Die anfänglichen Ressourcen des Planeten.
     * @param {number} x_percent - Die X-Position des Planeten in Prozent.
     * @param {number} y_percent - Die Y-Position des Planeten in Prozent.
     * @param {HTMLElement} resourcesDisplay - Das DOM-Element zur Anzeige der Ressourcen.
     */
    constructor(id, element, resources, x_percent, y_percent, resourcesDisplay) {
        this.id = id;
        this.element = element;
        this.resources = resources;
        this.x_percent = x_percent;
        this.y_percent = y_percent;
        this.resourcesDisplay = resourcesDisplay;
        // Gerenderte Pixelpositionen und -radius, werden von UI.updateRenderedElementPositions aktualisiert
        this.renderedX = 0;
        this.renderedY = 0;
        this.renderedRadius = 0;
    }

    /**
     * Aktualisiert die Ressourcen des Planeten.
     * @param {number} amount - Der Betrag, um den die Ressourcen geändert werden sollen.
     */
    updateResources(amount) {
        this.resources = Math.max(0, this.resources + amount);
        this.resourcesDisplay.textContent = this.resources;
        log(`Planet ${this.id} resources updated to: ${this.resources}`);
    }
}