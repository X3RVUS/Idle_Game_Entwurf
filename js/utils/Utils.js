// js/utils/Utils.js
import { CONFIG } from '../config.js'; // Pfadanpassung

/**
 * Debug-Logging Funktion.
 * @param {string} message - Die Log-Nachricht.
 * @param {...any} args - Zusätzliche Argumente, die geloggt werden sollen.
 */
export function log(message, ...args) {
    if (typeof CONFIG !== 'undefined' && CONFIG.Game && CONFIG.Game.debugMode) {
        const now = new Date();
        const timestamp = now.toLocaleTimeString('de-DE', { hour12: false }) + '.' + String(now.getMilliseconds()).padStart(3, '0');
        console.log(`[${timestamp}] ${message}`, ...args);
    } else if (typeof CONFIG === 'undefined') {
        console.log(`[PRE-CONFIG LOG] ${message}`, ...args);
    }
}

/**
 * Robusterer Start-Check.
 * Überprüft, ob die kritischen DOM-Elemente gerendert wurden (d.h. offsetWidth > 0)
 * Bevor die eigentliche Initialisierung ausgeführt wird.
 * @param {HTMLElement} gameContainer - Das Haupt-Spiel-Container-Element.
 * @param {HTMLElement} planetsContainer - Das Planeten-Container-Element.
 * @param {HTMLElement} miningBase - Das Mining-Basis-Element.
 * @param {function} callback - Die Funktion, die nach erfolgreichem Laden aufgerufen werden soll.
 */
export function checkInitialLoad(gameContainer, planetsContainer, miningBase, callback) {
    log("Running checkInitialLoad...");

    if (gameContainer && gameContainer.offsetWidth > 0 && gameContainer.offsetHeight > 0 &&
        miningBase && miningBase.offsetWidth > 0 && miningBase.offsetHeight > 0 &&
        planetsContainer && planetsContainer.offsetWidth > 0 && planetsContainer.offsetHeight > 0) {
        log(`Initial load check passed. Container: ${gameContainer.offsetWidth}x${gameContainer.offsetHeight}, Base: ${miningBase.offsetWidth}x${miningBase.offsetHeight}, PlanetsContainer: ${planetsContainer.offsetWidth}x${planetsContainer.offsetHeight}`);
        callback();
    } else {
        log(`Initial load check failed. Retrying in 50ms. Current states:
            Container: ${gameContainer ? `${gameContainer.offsetWidth}x${gameContainer.offsetHeight}` : 'N/A'},
            Base: ${miningBase ? `${miningBase.offsetWidth}x${miningBase.offsetHeight}` : 'N/A'},
            PlanetsContainer: ${planetsContainer ? `${planetsContainer.offsetWidth}x${planetsContainer.offsetHeight}` : 'N/A'}`);
        setTimeout(() => checkInitialLoad(gameContainer, planetsContainer, miningBase, callback), 50); // Erneut versuchen
    }
}