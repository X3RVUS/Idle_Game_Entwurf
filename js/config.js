export const CONFIG = {
    // Globale Spieleinstellungen
    Game: {
        initialScore: 1000,
        initialStorage: 0,
        initialMaxStorage: 100,
        gameUnitMinScale: 0.5,
        gameUnitMaxScale: 5.0,
        zoomStep: 0.05,
        debugMode: true, // NEU: Auf 'true' setzen, um Logging zu aktivieren
    },

    // Logische Referenz-Dimensionen für Umrechnungen in JS
    Reference: {
        width: 400,
        height: 700,
    },

    // Planeten-Einstellungen
    Planets: {
        initialCount: 3,
        spawnAreaTopRelative: 0.05,
        spawnAreaBottomRelative: 0.40,
        minResources: 100,
        maxResources: 5000000,
        sizePercent: 8,
        respawnDelayMs: 3000,
    },

    // Sammler-Einstellungen
    Collectors: {
        initialCount: 1,
        maxDocks: 40,
        baseSpeed: 0.5,
        baseYield: 1,
        miningDurationMs: 5000,
        sizePercent: 1.5,
        dockOffsetYPercent: 1,

        buyCost: 10,
        buyCostMultiplier: 1.5,

        speedUpgradeCost: 20,
        speedUpgradeCostMultiplier: 1.8,
        speedUpgradeIncrease: 0.1,

        yieldUpgradeCost: 10,
        yieldUpgradeCostMultiplier: 1.6,
        yieldUpgradeIncrease: 0.5,
    },

    // Lager-Einstellungen (Ressourcen)
    Storage: {
        upgradeCost: 50,
        upgradeCostMultiplier: 2,
        upgradeCapacityMultiplier: 1.5,
    },

    // Güter-Einstellungen
    Goods: {
        initialGoods: 0,
        initialMaxGoods: 50,
        upgradeCost: 75,
        upgradeCostMultiplier: 2,
        upgradeCapacityMultiplier: 1.5,
    },

    // Fabrik-Einstellungen
    Factories: {
        maxSlots: 7,
        buildCost: 10,
        storageConsumption: 5,
        goodsYield: 5,
        baseDurationMs: 5000,

        initialYieldUpgradeCost: 10,
        yieldUpgradeCostMultiplier: 1.8,
        yieldUpgradeIncrease: 1,

        initialSpeedUpgradeCost: 20,
        speedUpgradeCostMultiplier: 2,
        speedUpgradeIncrease: 0.1,
    },

    // Handelsposten-Einstellungen
    TradePost: {
        slotIndex: 7,
        buildCost: 50,
        goodsConsumption: 1,
        baseValuePerGood: 10,
        traderSpawnIntervalMs: 10000,
        traderSpeed: 0.8,
        traderSizePercent: 2,

        initialPriceUpgradeCost: 20,
        priceUpgradeCostMultiplier: 1.8,
        priceUpgradeIncrease: 1,

        initialSpeedUpgradeCost: 30,
        speedUpgradeCostMultiplier: 1.5,
        speedUpgradeIncrease: 0.2,
    },
};