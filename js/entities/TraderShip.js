// js/entities/TraderShip.js
import { log } from '../utils/Utils.js'; // Pfadanpassung

export class TraderShip {
    /**
     * Erstellt eine Instanz eines Handelsschiffs.
     * @param {HTMLElement} element - Das DOM-Element des Händlerschiffs.
     * @param {number} initialXPercent - Die anfängliche X-Position in Prozent.
     * @param {number} initialYPercent - Die anfängliche Y-Position in Prozent.
     * @param {number} targetXPercent - Die Ziel-X-Position in Prozent.
     * @param {number} targetYPercent - Die Ziel-Y-Position in Prozent.
     * @param {number} goodsToSell - Die Menge der zu verkaufenden Güter.
     * @param {number} speed - Die Bewegungsgeschwindigkeit des Händlers.
     */
    constructor(element, initialXPercent, initialYPercent, targetXPercent, targetYPercent, goodsToSell, speed) {
        this.element = element;
        this.x_percent = initialXPercent;
        this.y_percent = initialYPercent;
        this.state = 'approaching'; // 'approaching', 'selling', 'departing'
        this.targetX_percent = targetXPercent;
        this.targetY_percent = targetYPercent;
        this.goodsToSell = goodsToSell;
        this.speed = speed;
        log(`TraderShip created at ${initialXPercent.toFixed(2)}%, ${initialYPercent.toFixed(2)}% with ${goodsToSell} goods.`);
    }

    /**
     * Aktualisiert die Position des Handelsschiffs im DOM.
     */
    updateDOMPosition() {
        this.element.style.left = `${this.x_percent}%`;
        this.element.style.top = `${this.y_percent}%`;
    }

    /**
     * Aktualisiert den Zustand und die Position des Handelsschiffs.
     * @param {number} deltaTime - Die vergangene Zeit seit dem letzten Frame in Millisekunden.
     * @param {UI} ui - Instanz der UI.
     * @returns {boolean} True, wenn der Händler entfernt werden sollte, sonst false.
     */
    update(deltaTime, ui) {
        const traderRenderedSize = this.element.offsetWidth;
        const gameContainerWidth = ui.elements.gameContainer.offsetWidth;

        if (this.state === 'approaching') {
            const dx = this.targetX_percent - this.x_percent;
            const dy = this.targetY_percent - this.y_percent;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Kollision in % (basierend auf der gerenderten Größe des Händlers)
            if (distance < (traderRenderedSize / gameContainerWidth * 100) * 1.5) {
                this.state = 'selling';
                // Die eigentliche Verkaufslogik (updateGoods, updateScore, showPlusAmount)
                // sollte außerhalb des TraderShip passieren, z.B. im TradeManager,
                // da sie globalen Spielzustand ändert.
                log(`TraderShip ${this.element.id || 'N/A'} reached trade post.`);
                return false; // Bleibt, bis Verkauf abgeschlossen und Status auf 'departing' gesetzt wird
            } else {
                this.x_percent += (dx / distance) * this.speed * (deltaTime / 16.66);
                this.y_percent += (dy / distance) * this.speed * (deltaTime / 16.66);
            }
        } else if (this.state === 'departing') {
            // Händler fliegt nach links aus dem Bildschirm
            this.targetX_percent = -10; // Ziel außerhalb des Bildschirms
            const dx = this.targetX_percent - this.x_percent;
            const dy = 0; // Bleibt auf gleicher Y-Achse
            const distance = Math.sqrt(dx * dx + dy * dy); // Vereinfachte Distanz

            if (this.x_percent < -5) { // Wenn der Händler den Bildschirm verlassen hat
                log(`TraderShip ${this.element.id || 'N/A'} departed.`);
                this.element.remove();
                return true; // Sollte entfernt werden
            } else {
                this.x_percent += (dx / distance) * this.speed * (deltaTime / 16.66);
            }
        }
        this.updateDOMPosition();
        return false;
    }

    /**
     * Setzt den Zustand des Händlers auf "Verkauft" und bereitet ihn auf die Abreise vor.
     * @param {number} soldGoods - Die tatsächlich verkauften Güter.
     * @param {number} gainedScore - Der erzielte Score.
     * @param {number} targetX - X-Position des Handelspostens in Prozent.
     * @param {number} targetY - Y-Position des Handelspostens in Prozent.
     * @param {UI} ui - Instanz der UI.
     */
    completeSell(soldGoods, gainedScore, targetX, targetY, ui) {
        this.state = 'departing';
        this.targetX_percent = -10; // Setze ein Ziel außerhalb des Bildschirms für die Abreise
        // Die Logik für showPlusAmount ist hier in der Entity für Visuals.
        ui.showPlusAmount(gainedScore, targetX, targetY - (3 * ui.gameUnitPx / ui.elements.gameContainer.offsetHeight * 100), 'score');
        log(`TraderShip completed sell: ${soldGoods} goods for ${gainedScore} score.`);
    }
}