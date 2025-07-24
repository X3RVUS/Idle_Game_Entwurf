// js/managers/CollectorManager.js
import { CONFIG } from '../config.js'; // Pfadanpassung
import { log } from '../utils/Utils.js'; // Pfadanpassung
import { CollectorShip, STATE_DELIVERING, STATE_IDLE_NO_PLANETS, STATE_MINING, STATE_RETURNING_TO_BASE, STATE_RETURNING_TO_SOURCE } from '../entities/CollectorShip.js'; // Pfadanpassung

const DOCK_OFFSET_Y_PERCENT = 1;
const COLLECTOR_SIZE_PERCENT = 1.5;

class CollectorManager {
    constructor() {
        this.collectors = [];
        this.collectorBaseSpeed = CONFIG.Collectors.baseSpeed;
        this.collectorYieldMultiplier = 1;
        // Kosten direkt aus der CONFIG, werden dort bei Upgrades aktualisiert
        // this.buyCollectorCost = CONFIG.Collectors.buyCost; // Nicht mehr nötig als Instanzvariable hier
        // this.collectorSpeedUpgradeCost = CONFIG.Collectors.speedUpgradeCost;
        // this.collectorYieldUpgradeCost = CONFIG.Collectors.yieldUpgradeCost;

        this.gameContainer = null;
        this.gameManager = null; // Referenz zum GameManager
        this.ui = null; // Referenz zur UI
        this.planetManager = null; // Referenz zum PlanetManager

        log('CollectorManager initialized.');
    }

    /**
     * Initialisiert den CollectorManager.
     * @param {HTMLElement} gameContainer - Der Haupt-Spiel-Container.
     * @param {GameManager} gameManager - Instanz des GameManager.
     * @param {UI} ui - Instanz der UI.
     * @param {PlanetManager} planetManager - Instanz des PlanetManager.
     */
    init(gameContainer, gameManager, ui, planetManager) {
        this.gameContainer = gameContainer;
        this.gameManager = gameManager;
        this.ui = ui;
        this.planetManager = planetManager;
        this.gameManager.setCollectorManager(this); // Sich selbst beim GameManager registrieren
    }

    /**
     * Fügt ein neues Sammlerschiff dem Spiel hinzu.
     */
    addCollectorShip() {
        if (this.collectors.length >= CONFIG.Collectors.maxDocks) {
            log("Maximum number of collectors reached.");
            return;
        }

        const collectorDotElement = document.createElement('div');
        collectorDotElement.classList.add('collector-dot');
        collectorDotElement.id = `collector-${this.collectors.length}`;

        const miningProgressBar = document.createElement('div');
        miningProgressBar.classList.add('mining-progress-bar');
        const progressFill = document.createElement('div');
        progressFill.classList.add('mining-progress-fill');
        miningProgressBar.appendChild(progressFill);
        collectorDotElement.appendChild(miningProgressBar);

        this.gameContainer.appendChild(collectorDotElement);

        const baseTopLeft = this.ui.getMiningBaseTopLeft();

        const dockSpacingPercent = (baseTopLeft.width / CONFIG.Collectors.maxDocks);
        const dockPosX_percent = baseTopLeft.x + (dockSpacingPercent * (this.collectors.length % CONFIG.Collectors.maxDocks)) + (dockSpacingPercent / 2) - (COLLECTOR_SIZE_PERCENT / 2);
        const dockPosY_percent = baseTopLeft.y - DOCK_OFFSET_Y_PERCENT;

        const newCollector = new CollectorShip(
            collectorDotElement.id,
            collectorDotElement,
            miningProgressBar,
            progressFill,
            dockPosX_percent,
            dockPosY_percent,
            this.collectors.length % CONFIG.Collectors.maxDocks,
            this.collectorYieldMultiplier
        );
        this.collectors.push(newCollector);

        this.ui.elements.collectorCountDisplay.textContent = `Sammler: ${this.collectors.length}`;
        log(`Added collector ${newCollector.id} at %: ${newCollector.x_percent.toFixed(2)}, ${newCollector.y_percent.toFixed(2)}. State: ${newCollector.state}`);
        this.gameManager.checkButtonStates(); // Buttons aktualisieren
    }

    /**
     * Kauft ein neues Sammlerschiff.
     */
    buyCollector() {
        if (this.gameManager.getScore() >= CONFIG.Collectors.buyCost && this.collectors.length < CONFIG.Collectors.maxDocks) {
            this.gameManager.updateScore(-CONFIG.Collectors.buyCost);
            this.addCollectorShip();
            // Automatische Zuweisung nach Kauf
            const newCollector = this.collectors[this.collectors.length - 1];
            newCollector.setTargetPlanet(this.planetManager.getNextAvailablePlanet());
            if (newCollector.targetPlanet) {
                newCollector.setState(STATE_RETURNING_TO_SOURCE);
                log(`New collector ${newCollector.id} assigned target planet, state: RETURNING_TO_SOURCE.`);
            } else {
                newCollector.setState(STATE_IDLE_NO_PLANETS);
                log(`New collector ${newCollector.id} remains IDLE, no planets available yet.`);
            }
        } else {
            log("Cannot buy collector: not enough score or max docks reached.");
        }
    }

    /**
     * Upgraded die Geschwindigkeit aller Sammler.
     */
    upgradeCollectorSpeed() {
        if (this.gameManager.getScore() >= CONFIG.Collectors.speedUpgradeCost) {
            this.gameManager.updateScore(-CONFIG.Collectors.speedUpgradeCost);
            this.collectorBaseSpeed += CONFIG.Collectors.speedUpgradeIncrease;
            CONFIG.Collectors.speedUpgradeCost = Math.ceil(CONFIG.Collectors.speedUpgradeCost * CONFIG.Collectors.speedUpgradeCostMultiplier); // Konfiguration wird aktualisiert!
            this.gameManager.checkButtonStates();
            log(`Collector speed upgraded. New base speed: ${this.collectorBaseSpeed}`);
        } else {
            log("Cannot upgrade speed: Not enough score.");
        }
    }

    /**
     * Upgraded den Ertrag aller Sammler.
     */
    upgradeCollectorYield() {
        if (this.gameManager.getScore() >= CONFIG.Collectors.yieldUpgradeCost) {
            this.gameManager.updateScore(-CONFIG.Collectors.yieldUpgradeCost);
            this.collectorYieldMultiplier = Math.round((this.collectorYieldMultiplier + CONFIG.Collectors.yieldUpgradeIncrease) * 10) / 10;
            CONFIG.Collectors.yieldUpgradeCost = Math.ceil(CONFIG.Collectors.yieldUpgradeCost * CONFIG.Collectors.yieldUpgradeCostMultiplier); // Konfiguration wird aktualisiert!

            // Aktualisiere den deliveryAmount für alle bestehenden Sammler
            this.collectors.forEach(c => c.setDeliveryAmount(this.collectorYieldMultiplier));

            this.gameManager.checkButtonStates();
            log(`Collector yield upgraded. New yield multiplier: ${this.collectorYieldMultiplier}`);
        } else {
            log("Cannot upgrade yield: Not enough score.");
        }
    }

    /**
     * Weist Sammlern, die untätig sind oder kein gültiges Ziel haben, neue Ziele zu.
     * Dies wird vom PlanetManager aufgerufen, wenn neue Planeten spawnen.
     */
    reassignIdleCollectors() {
        this.collectors.forEach(c => {
            if (c.state === STATE_IDLE_NO_PLANETS || c.targetPlanet === null || c.targetPlanet.resources <= 0) {
                c.setTargetPlanet(this.planetManager.getNextAvailablePlanet());
                if (c.targetPlanet) {
                    c.setState(STATE_RETURNING_TO_SOURCE);
                    log(`Collector ${c.id} switched from IDLE to RETURNING_TO_SOURCE.`);
                }
            }
        });
    }

    /**
     * Aktualisiert den Zustand und die Position aller Sammlerschiffe.
     * @param {number} deltaTime - Die vergangene Zeit seit dem letzten Frame in Millisekunden.
     */
    updateCollectors(deltaTime) {
        this.collectors.forEach(collector => {
            const currentSpeed = this.collectorBaseSpeed;

            collector.hideProgressBar(); // Verstecke den Ladebalken standardmäßig

            switch (collector.state) {
                case STATE_RETURNING_TO_SOURCE:
                    if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                        collector.setTargetPlanet(this.planetManager.getNextAvailablePlanet());
                        if (!collector.targetPlanet) {
                            collector.setState(STATE_IDLE_NO_PLANETS);
                            return; // Sammler hat nichts zu tun
                        }
                    }
                    const targetX = collector.targetPlanet.x_percent;
                    const targetY = collector.targetPlanet.y_percent;

                    const dxToPlanet = targetX - collector.x_percent;
                    const dyToPlanet = targetY - collector.y_percent;
                    const distanceToPlanet = Math.sqrt(dxToPlanet * dxToPlanet + dyToPlanet * dyToPlanet);

                    const planetRenderedRadius = collector.targetPlanet.renderedRadius;
                    const collectorRenderedRadius = collector.element.offsetWidth / 2;
                    const currentCollectorRenderedX = collector.x_percent / 100 * this.ui.elements.gameContainer.offsetWidth;
                    const currentCollectorRenderedY = collector.y_percent / 100 * this.ui.elements.gameContainer.offsetHeight;
                    const targetPlanetRenderedX = collector.targetPlanet.renderedX;
                    const targetPlanetRenderedY = collector.targetPlanet.renderedY;

                    const distancePxToPlanet = Math.sqrt(
                        Math.pow(targetPlanetRenderedX - currentCollectorRenderedX, 2) +
                        Math.pow(targetPlanetRenderedY - currentCollectorRenderedY, 2)
                    );

                    if (distancePxToPlanet < planetRenderedRadius + collectorRenderedRadius + (2 * this.ui.gameUnitPx)) {
                        collector.setState(STATE_MINING);
                        collector.startMining();
                        log(`Collector ${collector.id} reached planet ${collector.targetPlanet.id}, starting mining.`);
                    } else {
                        collector.updatePosition(
                            collector.x_percent + (dxToPlanet / distanceToPlanet) * currentSpeed * 1.2 * (deltaTime / 16.66),
                            collector.y_percent + (dyToPlanet / distanceToPlanet) * currentSpeed * 1.2 * (deltaTime / 16.66)
                        );
                    }
                    break;

                case STATE_MINING:
                    collector.miningProgressBar.style.display = 'block';
                    const progress = collector.updateMiningProgress();

                    if (progress >= 1) {
                        if (collector.targetPlanet) {
                            log(`Collector ${collector.id} finished mining planet ${collector.targetPlanet.id}. Resources left: ${collector.targetPlanet.resources - collector.deliveryAmount}`);
                            collector.targetPlanet.updateResources(-collector.deliveryAmount); // Planet Ressourcen aktualisieren
                            if (collector.targetPlanet.resources <= 0) {
                                log(`Planet ${collector.targetPlanet.id} depleted!`);
                                this.planetManager.removePlanet(collector.targetPlanet);
                                collector.setTargetPlanet(null);
                            }
                        }
                        collector.setState(STATE_RETURNING_TO_BASE);
                    }
                    // Während des Minings bleibt der Sammler an der Planetenposition
                    if (collector.targetPlanet) {
                        collector.updatePosition(collector.targetPlanet.x_percent, collector.targetPlanet.y_percent);
                    } else {
                        collector.setState(STATE_RETURNING_TO_BASE); // Falls Planet plötzlich weg ist
                    }
                    break;

                case STATE_RETURNING_TO_BASE:
                    const baseTopLeft = this.ui.getMiningBaseTopLeft();
                    const dockSpacingPercent = (baseTopLeft.width / CONFIG.Collectors.maxDocks);
                    const specificDockPosX_percent = baseTopLeft.x + (dockSpacingPercent * (collector.dockIndex % CONFIG.Collectors.maxDocks)) + (dockSpacingPercent / 2) - (COLLECTOR_SIZE_PERCENT / 2);
                    const specificDockPosY_percent = baseTopLeft.y - DOCK_OFFSET_Y_PERCENT;

                    const dxToBase = specificDockPosX_percent - collector.x_percent;
                    const dyToBase = specificDockPosY_percent - collector.y_percent;
                    const distanceToBase = Math.sqrt(dxToBase * dxToBase + dyToBase * dyToBase);

                    const collectorRenderedRadiusToBase = collector.element.offsetWidth / 2;
                    const currentCollectorRenderedXToBase = collector.x_percent / 100 * this.ui.elements.gameContainer.offsetWidth;
                    const currentCollectorRenderedYToBase = collector.y_percent / 100 * this.ui.elements.gameContainer.offsetHeight;
                    const targetDockRenderedX = specificDockPosX_percent / 100 * this.ui.elements.gameContainer.offsetWidth;
                    const targetDockRenderedY = specificDockPosY_percent / 100 * this.ui.elements.gameContainer.offsetHeight;

                    const distancePxToBase = Math.sqrt(
                        Math.pow(targetDockRenderedX - currentCollectorRenderedXToBase, 2) +
                        Math.pow(targetDockRenderedY - currentCollectorRenderedYToBase, 2)
                    );

                    if (distancePxToBase < collectorRenderedRadiusToBase + (2 * this.ui.gameUnitPx)) {
                        collector.setState(STATE_DELIVERING);
                        collector.updatePosition(specificDockPosX_percent, specificDockPosY_percent); // Fixe Position am Dock
                        log(`Collector ${collector.id} reached base, starting delivery.`);
                    } else {
                        collector.updatePosition(
                            collector.x_percent + (dxToBase / distanceToBase) * currentSpeed * 1.5 * (deltaTime / 16.66),
                            collector.y_percent + (dyToBase / distanceToBase) * currentSpeed * 1.5 * (deltaTime / 16.66)
                        );
                    }
                    break;

                case STATE_DELIVERING:
                    const amountToDeliver = collector.deliveryAmount;
                    const baseCenter = this.ui.getMiningBaseCenter();

                    if (this.gameManager.getCurrentStorage() + amountToDeliver <= this.gameManager.getMaxStorage()) {
                        this.gameManager.updateStorage(amountToDeliver);
                        this.gameManager.updateScore(amountToDeliver); // Score wird auch vom gesammelten Erz erhöht
                        this.ui.showPlusAmount(amountToDeliver, baseCenter.x, baseCenter.y - (10 * this.ui.gameUnitPx / this.ui.elements.gameContainer.offsetHeight * 100));

                        collector.setState(STATE_RETURNING_TO_SOURCE);
                        collector.setTargetPlanet(null); // Zwingt Sammler, neuen Planeten zu suchen
                        log(`Collector ${collector.id} delivered ${amountToDeliver}.`);
                    } else {
                        // Lager voll, Sammler wartet am Dock
                        log(`Collector ${collector.id} waiting at base, storage full.`);
                        collector.setTargetPlanet(null);
                        collector.setState(STATE_IDLE_NO_PLANETS);
                    }
                    break;

                case STATE_IDLE_NO_PLANETS:
                    collector.hideProgressBar();
                    // Versuche, einen neuen Planeten zu finden
                    if (!collector.targetPlanet || collector.targetPlanet.resources <= 0) {
                        collector.setTargetPlanet(this.planetManager.getNextAvailablePlanet());
                    }
                    if (collector.targetPlanet) {
                        collector.setState(STATE_RETURNING_TO_SOURCE);
                        log(`Collector ${collector.id} found new planet from idle, state: RETURNING_TO_SOURCE.`);
                    }
                    break;
            }
        });
    }

    // Getter für Kosten und Zähler, die vom GameManager benötigt werden
    getBuyCollectorCost() { return CONFIG.Collectors.buyCost; }
    getSpeedUpgradeCost() { return CONFIG.Collectors.speedUpgradeCost; }
    getYieldUpgradeCost() { return CONFIG.Collectors.yieldUpgradeCost; }
    getCollectorCount() { return this.collectors.length; }
}

const collectorManager = new CollectorManager();
export default collectorManager;