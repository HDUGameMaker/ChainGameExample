/**
 * config.js — 游戏配置表
 * ============================
 * 🎨 美术：精灵尺寸在 BUILDINGS/UNITS 中定义
 * 📋 策划：修改 cost, hp, damage, buildTime 等数值即可调整平衡性
 * 🧑‍💻 程序员：新增单位/建筑只需按照现有格式添加条目
 */

// ── 地图 ──
const TILE_SIZE  = 64;
const MAP_COLS   = 50;
const MAP_ROWS   = 35;

// ── 配色 ──
const COLORS = {
    player:       '#3a7bd5',
    playerDark:   '#1d4f8f',
    playerLight:  '#6ea8fe',
    enemy:        '#d54040',
    enemyDark:    '#8b1e1e',
    enemyLight:   '#f06060',
    ore:          '#e8b800',
    oreDark:      '#a08000',
    terrain:      '#5a9e4b',
    terrainVar1:  '#4f8e42',
    terrainVar2:  '#65a855',
    grid:         'rgba(0,0,0,0.06)',
    selection:    '#00ff88',
    selectionFill:'rgba(0,255,136,0.15)',
    hpBar:        '#00cc00',
    hpBarBg:      '#333',
    buildOk:      'rgba(0,255,100,0.35)',
    buildBad:     'rgba(255,60,60,0.40)',
    moveCmd:      '#00ff88',
    attackCmd:    '#ff4444',
};

// ── 建筑定义 ──
const BUILDINGS = {
    construction_yard: {
        id:       'construction_yard',
        name:     '建造场',
        desc:     '核心建筑，允许建造其他建筑',
        cost:     0,
        powerProvided: 0,
        powerConsumed: 0,
        hp:       1200,
        maxHp:    1200,
        buildTime:0,
        size:     [3, 3],
        color:    '#8899aa',
        colorDark:'#667788',
        symbol:   '⬡',
        buildable:false,
        provides: ['construction_yard'],
    },
    power_plant: {
        id:       'power_plant',
        name:     '发电厂',
        desc:     '提供 +100 电力',
        cost:     300,
        powerProvided: 100,
        powerConsumed: 0,
        hp:       400,
        maxHp:    400,
        buildTime:5000,
        size:     [2, 2],
        color:    '#e8c840',
        colorDark:'#c0a020',
        symbol:   '⚡',
        buildable:true,
        provides: [],
    },
    ore_refinery: {
        id:       'ore_refinery',
        name:     '矿石精炼厂',
        desc:     '矿车卸货，生产矿车',
        cost:     2000,
        powerProvided: 0,
        powerConsumed: 30,
        hp:       700,
        maxHp:    700,
        buildTime:10000,
        size:     [3, 3],
        color:    '#d4894a',
        colorDark:'#b06830',
        symbol:   '⛽',
        buildable:true,
        provides: ['harvester'],
    },
    war_factory: {
        id:       'war_factory',
        name:     '战车工厂',
        desc:     '生产装甲单位',
        cost:     2000,
        powerProvided: 0,
        powerConsumed: 50,
        hp:       900,
        maxHp:    900,
        buildTime:12000,
        size:     [3, 3],
        color:    '#666677',
        colorDark:'#444455',
        symbol:   '⬟',
        buildable:true,
        provides: ['tank'],
    },
};

// ── 单位定义 ──
const UNITS = {
    harvester: {
        id:          'harvester',
        name:        '矿车',
        desc:        '自动采集矿石运回精炼厂',
        cost:        1400,
        hp:          400,
        maxHp:       400,
        speed:       140,       // 像素/秒
        size:        [1.5, 1.5],
        damage:      0,
        attackRange: 0,
        attackCooldown: 0,
        buildTime:   8000,
        builtAt:     'ore_refinery',
        color:       '#e0a020',
        colorDark:   '#b07810',
        cargoCapacity: 500,     // 每次采矿获得金钱
        harvestTime:  4000,     // 采矿耗时(ms)
        sightRange:   8,        // 视野(格)
    },
    tank: {
        id:          'tank',
        name:        '犀牛坦克',
        desc:        '主战坦克，右键攻击敌人',
        cost:        700,
        hp:          250,
        maxHp:       250,
        speed:       160,
        size:        [1, 1],
        damage:      35,
        attackRange: 6,
        attackCooldown: 1200,
        buildTime:   5000,
        builtAt:     'war_factory',
        color:       '#5588cc',
        colorDark:   '#335577',
        sightRange:  7,
    },
};

// ── 矿石 ──
const ORE = {
    clusters:     10,      // 矿石簇数量
    clusterSize:  10,      // 每簇最大格数
    maxOre:       800,     // 每格最大矿石量
    minOre:       300,     // 每格最小矿石量
};

// ── 经济 ──
const ECONOMY = {
    startingCredits: 10000,
    lowPowerSpeed:   0.3,  // 电力不足时生产速度倍率
};

// ── 建造范围：建筑必须放在已有建筑周围多少格以内 ──
const BUILD_RANGE = 10;   // 此范围内必须有已完成的己方建筑

// ── 建造条件：建造某建筑需要先拥有哪些建筑 ──
const BUILD_PREREQS = {
    power_plant:      ['construction_yard'],
    ore_refinery:     ['construction_yard'],
    war_factory:      ['construction_yard', 'ore_refinery'],
};

// 可建造列表（侧边栏显示顺序）
const BUILD_ORDER = ['power_plant', 'ore_refinery', 'war_factory'];
