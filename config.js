export const CONFIG = {
    // Globale Spieleinstellungen
    Game: {
        initialScore: 1000, // Für schnelleres Testen der Fabriken
        initialStorage: 0,
        initialMaxStorage: 100,
        gameUnitMinScale: 0.5, // Min-Skalierung der Game-Unit in Pixeln pro VMin (z.B. 0.5px pro 1vmin)
        gameUnitMaxScale: 5.0,  // Max-Skalierung der Game-Unit in Pixeln pro VMin
        zoomStep: 0.05, // 5% Zoom-Schritt
    },

    // Planeten-Einstellungen
    Planets: {
        initialCount: 3,
        spawnAreaTopRelative: 0.05, // Relative Y-Position von oben (5%)
        spawnAreaBottomRelative: 0.40, // Relative Y-Position von oben (40%)
        minResources: 100,
        maxResources: 500,
        sizePercent: 8, // Planetengröße in % der --game-unit (aus CSS)
        respawnDelayMs: 3000, // Zeit bis neue Planeten nach Abbau aller alten spawnen
    },

    // Sammler-Einstellungen
    Collectors: {
        initialCount: 1,
        maxDocks: 40, // Max 4 Sammler-Slots
        baseSpeed: 0.5, // Geschwindigkeit in % des Containers pro Frame
        baseYield: 1, // Basis-Ertrag pro Sammelzyklus
        miningDurationMs: 5000, // Basis-Dauer des Abbaus am Planeten
        sizePercent: 1.5, // Größe des Sammler-Punktes in % der --game-unit (aus CSS)
        dockOffsetYPercent: 1, // Y-Offset von der Oberkante des Raumschiffs für Docks in % der game-unit

        // Upgrade-Kosten und -Werte
        buyCost: 10,
        buyCostMultiplier: 1.5,

        speedUpgradeCost: 20,
        speedUpgradeCostMultiplier: 1.8,
        speedUpgradeIncrease: 0.1, // Erhöhung der Geschwindigkeit pro Upgrade

        yieldUpgradeCost: 10,
        yieldUpgradeCostMultiplier: 1.6,
        yieldUpgradeIncrease: 0.5, // Erhöhung des Ertrags pro Upgrade
    },

    // Lager-Einstellungen (Ressourcen)
    Storage: {
        upgradeCost: 50,
        upgradeCostMultiplier: 2,
        upgradeCapacityMultiplier: 1.5, // Faktor zur Erhöhung der Kapazität
    },

    // Güter-Einstellungen
    Goods: {
        initialGoods: 0,
        initialMaxGoods: 50, // Initiales Max-Lager für Güter
        upgradeCost: 75, // Kosten für Güterlager-Upgrade
        upgradeCostMultiplier: 2,
        upgradeCapacityMultiplier: 1.5, // Faktor zur Erhöhung der Kapazität
    },

    // Fabrik-Einstellungen
    Factories: {
        maxSlots: 8, // Max 8 Fabrik-Slots
        buildCost: 10, // Score-Kosten für eine Fabrik
        storageConsumption: 5, // Ressourcenverbrauch pro Produktion
        goodsYield: 5, // NEU: Güter-Ertrag pro Produktion
        baseDurationMs: 5000, // Basis-Produktionszeit in ms

        // Individuelle Upgrade-Kosten und -Werte pro Fabrik-Instanz (betreffen nun Güterertrag)
        initialYieldUpgradeCost: 10,
        yieldUpgradeCostMultiplier: 1.8,
        yieldUpgradeIncrease: 1, // Erhöhung des Güter-Ertrags pro Upgrade

        initialSpeedUpgradeCost: 20,
        speedUpgradeCostMultiplier: 2,
        speedUpgradeIncrease: 0.1, // Erhöhung des Geschwindigkeits-Multiplikators pro Upgrade
    },
};