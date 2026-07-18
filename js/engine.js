/**
 * engine.js — 游戏引擎核心
 * ========================
 * Camera、Renderer、Game（主循环 + 状态管理）
 */

// ── 摄像机 ──
class Camera {
    constructor() {
        this.x = 0;       // 世界坐标（左上角）
        this.y = 0;
        this.zoom = 1.0;
        this.minZoom = 0.4;
        this.maxZoom = 2.0;
    }

    /** 屏幕坐标 → 世界坐标 */
    screenToWorld(sx, sy, canvasW, canvasH) {
        return {
            x: sx / this.zoom + this.x,
            y: sy / this.zoom + this.y,
        };
    }

    /** 世界坐标 → 屏幕坐标 */
    worldToScreen(wx, wy) {
        return {
            x: (wx - this.x) * this.zoom,
            y: (wy - this.y) * this.zoom,
        };
    }

    /** 居中到指定世界坐标 */
    centerOn(wx, wy, canvasW, canvasH) {
        this.x = wx - canvasW / (2 * this.zoom);
        this.y = wy - canvasH / (2 * this.zoom);
    }

    /** 调整缩放 */
    zoomAt(sx, sy, canvasW, canvasH, delta) {
        const worldBefore = this.screenToWorld(sx, sy, canvasW, canvasH);
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom * (1 + delta)));
        const worldAfter = this.screenToWorld(sx, sy, canvasW, canvasH);
        this.x += worldAfter.x - worldBefore.x;
        this.y += worldAfter.y - worldBefore.y;
    }

    /** 限制在地图边界内 */
    clamp(mapPixelW, mapPixelH, canvasW, canvasH) {
        const viewW = canvasW / this.zoom;
        const viewH = canvasH / this.zoom;
        this.x = Math.max(0, Math.min(mapPixelW - viewW, this.x));
        this.y = Math.max(0, Math.min(mapPixelH - viewH, this.y));
    }
}

// ── 渲染器 ──
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    clear() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    /** 渲染整个游戏画面 */
    render(game) {
        const ctx = this.ctx;
        const cam = game.camera;
        const map = game.map;

        this.clear();

        ctx.save();
        ctx.translate(-cam.x * cam.zoom, -cam.y * cam.zoom);
        ctx.scale(cam.zoom, cam.zoom);

        // 1. 绘制地形
        this._drawTerrain(ctx, map, cam);

        // 2. 绘制矿石
        this._drawOre(ctx, map);

        // 3. 绘制网格（仅开发调适用）
        // this._drawGrid(ctx, map);

        // 4. 绘制建筑
        for (const building of game.buildings) {
            this._drawBuilding(ctx, building, game);
        }

        // 5. 绘制单位
        for (const unit of game.units) {
            this._drawUnit(ctx, unit, game);
        }

        // 6. 绘制建造预览
        if (game.buildMode) {
            this._drawBuildPreview(ctx, game);
        }

        // 7. 绘制选择框
        if (game.selectionBox) {
            this._drawSelectionBox(ctx, game);
        }

        // 8. 绘制指令标记（移动/攻击目标点）
        for (const ent of game.selectedEntities) {
            if (ent.targetX !== null && ent.targetY !== null) {
                this._drawCommandMarker(ctx, ent);
            }
            if (ent.attackTarget) {
                this._drawAttackLine(ctx, ent);
            }
        }

        ctx.restore();
    }

    _drawTerrain(ctx, map, cam) {
        // 可见范围
        const startCol = Math.max(0, Math.floor(cam.x / TILE_SIZE) - 1);
        const startRow = Math.max(0, Math.floor(cam.y / TILE_SIZE) - 1);
        const endCol = Math.min(MAP_COLS, Math.ceil((cam.x + this.canvas.width / cam.zoom) / TILE_SIZE) + 1);
        const endRow = Math.min(MAP_ROWS, Math.ceil((cam.y + this.canvas.height / cam.zoom) / TILE_SIZE) + 1);

        for (let r = startRow; r < endRow; r++) {
            for (let c = startCol; c < endCol; c++) {
                const x = c * TILE_SIZE;
                const y = r * TILE_SIZE;
                const tile = map.tiles[r][c];

                // 草地颜色变化
                let color = COLORS.terrain;
                if (tile.shade === -1) color = COLORS.terrainVar1;
                else if (tile.shade === 1) color = COLORS.terrainVar2;

                ctx.fillStyle = color;
                ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

                // 网格线
                ctx.strokeStyle = COLORS.grid;
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, TILE_SIZE, TILE_SIZE);
            }
        }
    }

    _drawOre(ctx, map) {
        for (const ore of map.oreFields) {
            if (ore.amount <= 0) continue;
            const x = ore.col * TILE_SIZE;
            const y = ore.row * TILE_SIZE;
            const alpha = 0.3 + 0.5 * (ore.amount / ore.maxAmount);

            // 金色矿石圆块
            ctx.fillStyle = `rgba(232,184,0,${alpha})`;
            ctx.beginPath();
            const cx = x + TILE_SIZE / 2;
            const cy = y + TILE_SIZE / 2;
            const r = TILE_SIZE * 0.35 * (0.5 + 0.5 * ore.amount / ore.maxAmount);
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // 边框
            ctx.strokeStyle = `rgba(160,128,0,${alpha * 0.6})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }
    }

    _drawGrid(ctx, map) {
        ctx.strokeStyle = COLORS.grid;
        ctx.lineWidth = 1;
        for (let r = 0; r <= MAP_ROWS; r++) {
            ctx.beginPath();
            ctx.moveTo(0, r * TILE_SIZE);
            ctx.lineTo(MAP_COLS * TILE_SIZE, r * TILE_SIZE);
            ctx.stroke();
        }
        for (let c = 0; c <= MAP_COLS; c++) {
            ctx.beginPath();
            ctx.moveTo(c * TILE_SIZE, 0);
            ctx.lineTo(c * TILE_SIZE, MAP_ROWS * TILE_SIZE);
            ctx.stroke();
        }
    }

    _drawBuilding(ctx, b, game) {
        const x = b.x;
        const y = b.y;
        const w = b.w * TILE_SIZE;
        const h = b.h * TILE_SIZE;
        const isPlayer = b.isPlayer;
        const cfg = b.cfg;

        // 主体
        const color = isPlayer ? cfg.color : COLORS.enemy;
        const colorDark = isPlayer ? cfg.colorDark : COLORS.enemyDark;

        ctx.fillStyle = b.isComplete ? color : '#888';
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

        // 边框
        ctx.strokeStyle = colorDark;
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);

        // 建造中 - 半透明覆盖
        if (b.isBuilding) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

            // 建造进度条
            const barH = 8;
            const barY = y + h / 2 - barH / 2;
            ctx.fillStyle = '#333';
            ctx.fillRect(x + 10, barY, w - 20, barH);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(x + 10, barY, (w - 20) * b.buildProgress, barH);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 10, barY, w - 20, barH);
        }

        // 符号
        if (cfg.symbol && b.isComplete) {
            ctx.fillStyle = '#fff';
            ctx.font = `${Math.min(w, h) * 0.4}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillText(cfg.symbol, x + w / 2, y + h / 2 + Math.min(w, h) * 0.13);
        }

        // 血条
        if (b.hp < b.maxHp && b.isComplete) {
            this._drawHPBar(ctx, x, y - 10, w, b.hp, b.maxHp);
        }

        // 选中高亮
        if (game.selectedEntities.includes(b)) {
            ctx.strokeStyle = COLORS.selection;
            ctx.lineWidth = 3;
            ctx.setLineDash([6, 3]);
            ctx.strokeRect(x, y, w, h);
            ctx.setLineDash([]);
        }

        // 生产进度条（在建筑下方）
        const prod = b.currentProduction;
        if (prod) {
            const py = y + h + 4;
            ctx.fillStyle = '#222';
            ctx.fillRect(x + 4, py, w - 8, 6);
            ctx.fillStyle = '#ffaa00';
            ctx.fillRect(x + 4, py, (w - 8) * (prod.progress / prod.total), 6);
            ctx.strokeStyle = '#555';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 4, py, w - 8, 6);

            // 生产名称
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(UNITS[prod.typeId].name, x + w / 2, py + 14);
        }
    }

    _drawUnit(ctx, unit, game) {
        const cfg = unit.cfg;
        const s = unit.size;
        const w = s[0] * TILE_SIZE;
        const h = s[1] * TILE_SIZE;
        const x = unit.x - w / 2;
        const y = unit.y - h / 2;
        const isPlayer = unit.isPlayer;

        ctx.save();
        ctx.translate(unit.x, unit.y);

        const color = isPlayer ? cfg.color : COLORS.enemy;
        if (unit.isTank) {
            // 车身：跟随移动方向
            ctx.save();
            ctx.rotate(unit.facingAngle);
            ctx.fillStyle = color;
            ctx.fillRect(-w * 0.45, -h * 0.35, w * 0.9, h * 0.7);
            ctx.restore();

            // 炮塔 + 炮管：独立朝向攻击目标
            ctx.save();
            ctx.rotate(unit.turretAngle);
            ctx.fillStyle = isPlayer ? cfg.colorDark : COLORS.enemyDark;
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(w, h) * 0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = isPlayer ? cfg.colorDark : COLORS.enemyDark;
            ctx.lineWidth = Math.min(w, h) * 0.15;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(w * 0.5, 0);
            ctx.stroke();
            ctx.restore();
        } else if (unit.isHarvester) {
            // 矿车：大矩形 + 铲斗
            ctx.fillRect(-w * 0.4, -h * 0.4, w * 0.8, h * 0.8);
            ctx.fillStyle = cfg.colorDark;
            ctx.fillRect(w * 0.2, -h * 0.25, w * 0.2, h * 0.5);
            // 货箱指示
            if (unit.cargo > 0) {
                ctx.fillStyle = COLORS.ore;
                ctx.fillRect(-w * 0.35, -h * 0.35, w * 0.35, h * 0.3);
            }
        } else {
            // 默认圆形
            ctx.beginPath();
            ctx.arc(0, 0, Math.min(w, h) * 0.4, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();

        // 血条
        if (unit.hp < unit.maxHp) {
            this._drawHPBar(ctx, x, y - 8, w, unit.hp, unit.maxHp);
        }

        // 选中高亮
        if (game.selectedEntities.includes(unit)) {
            ctx.strokeStyle = COLORS.selection;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 2]);
            ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
            ctx.setLineDash([]);

            // 选中圆环
            ctx.strokeStyle = COLORS.selection;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(unit.x, unit.y, Math.max(w, h) * 0.6, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    _drawHPBar(ctx, x, y, w, hp, maxHp) {
        const barH = 5;
        const ratio = hp / maxHp;
        ctx.fillStyle = COLORS.hpBarBg;
        ctx.fillRect(x, y, w, barH);
        const hpColor = ratio > 0.5 ? COLORS.hpBar : ratio > 0.25 ? '#ffaa00' : '#ff3333';
        ctx.fillStyle = hpColor;
        ctx.fillRect(x, y, w * ratio, barH);
    }

    _drawBuildPreview(ctx, game) {
        const cfg = BUILDINGS[game.buildMode.typeId];
        const col = game.buildMode.col;
        const row = game.buildMode.row;
        const w = cfg.size[0];
        const h = cfg.size[1];
        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;
        const pw = w * TILE_SIZE;
        const ph = h * TILE_SIZE;

        const posValid = game.map.isBuildable(col, row, w, h);
        const rangeValid = game.isInBuildRange(col, row, w, h);
        const valid = posValid && rangeValid;
        ctx.fillStyle = valid ? COLORS.buildOk : COLORS.buildBad;
        ctx.fillRect(x, y, pw, ph);

        ctx.strokeStyle = valid ? '#0f0' : '#f00';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 4]);
        ctx.strokeRect(x, y, pw, ph);
        ctx.setLineDash([]);

        // 名称 + 提示
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        let label = cfg.name + ' $' + cfg.cost;
        if (!rangeValid) label += ' — 超出建造范围';
        ctx.fillText(label, x + pw / 2, y - 10);
    }

    _drawSelectionBox(ctx, game) {
        const sb = game.selectionBox;
        const x = Math.min(sb.startX, sb.endX);
        const y = Math.min(sb.startY, sb.endY);
        const w = Math.abs(sb.endX - sb.startX);
        const h = Math.abs(sb.endY - sb.startY);

        ctx.strokeStyle = COLORS.selection;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);

        ctx.fillStyle = COLORS.selectionFill;
        ctx.fillRect(x, y, w, h);
    }

    _drawCommandMarker(ctx, unit) {
        if (!unit.targetX && !unit.targetY) return;
        const tx = unit.targetX || unit.x;
        const ty = unit.targetY || unit.y;

        // 移动标记：绿色 X
        ctx.strokeStyle = COLORS.moveCmd;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // 目标点十字
        const s = 8;
        ctx.strokeStyle = COLORS.moveCmd;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - s, ty - s);
        ctx.lineTo(tx + s, ty + s);
        ctx.moveTo(tx + s, ty - s);
        ctx.lineTo(tx - s, ty + s);
        ctx.stroke();
    }

    _drawAttackLine(ctx, unit) {
        if (!unit.attackTarget) return;
        let tx, ty;
        if (unit.attackTarget.x !== undefined) {
            tx = unit.attackTarget.x;
            ty = unit.attackTarget.y;
        } else {
            tx = unit.attackTarget.col * TILE_SIZE + unit.attackTarget.w * TILE_SIZE / 2;
            ty = unit.attackTarget.row * TILE_SIZE + unit.attackTarget.h * TILE_SIZE / 2;
        }

        ctx.strokeStyle = COLORS.attackCmd;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);

        // 攻击十字
        const s = 10;
        ctx.strokeStyle = COLORS.attackCmd;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(tx - s, ty - s);
        ctx.lineTo(tx + s, ty + s);
        ctx.moveTo(tx + s, ty - s);
        ctx.lineTo(tx - s, ty + s);
        ctx.stroke();
    }
}

// ── 游戏主类 ──
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.renderer = new Renderer(canvas);
        this.camera = new Camera();
        this.map = new GameMap();
        this.buildings = [];
        this.units = [];
        this.selectedEntities = [];
        this.credits = ECONOMY.startingCredits;
        this.powerProvided = 0;
        this.powerConsumed = 0;
        this.powerState = 'normal';   // 'normal' | 'low'
        this.buildMode = null;        // { typeId, col, row }
        this.selectionBox = null;     // { startX, startY, endX, endY }
        this.lastTime = performance.now();
        this.gameTime = 0;
        this.unitIdCounter = 0;

        // 敌方 AI
        this.aiTimer = 0;
        this.aiProdCooldown = 8;   // 每 8 秒尝试生产一辆坦克
        this.aiCredits = 3000;     // AI 独立资金（开局只够电厂）
        this.aiIncomeRate = 200;   // AI 每秒收入
        this.aiBuildPhase = 'power_plant'; // 'power_plant' | 'war_factory' | 'producing'
    }

    init() {
        this.renderer.resize();

        // 放置玩家建造场（地图左中部）
        this._placeBuilding('construction_yard', 6, 14, 'player');

        // 敌方仅放置建造场，由 AI 自行发展
        this._placeBuilding('construction_yard', 38, 14, 'enemy');

        // 摄像机居中玩家基地
        const cy = this.buildings.find(b => b.typeId === 'construction_yard' && b.isPlayer);
        if (cy) {
            const c = cy.getCenter();
            this.camera.centerOn(c.x, c.y, this.canvas.width, this.canvas.height);
        }

        // 创建初始矿车
        const refinery = this.buildings.find(b => b.typeId === 'ore_refinery' && b.isPlayer);
        if (refinery) {
            // 玩家还没有精炼厂，先不创建矿车
        }
    }

    _placeBuilding(typeId, col, row, owner, complete = false) {
        const cfg = BUILDINGS[typeId];
        const b = new Building(typeId, col, row, owner);
        if (complete) {
            b.buildProgress = 1;
            b.isBuilding = false;
        }
        this.buildings.push(b);
        this.map.occupyTiles(col, row, cfg.size[0], cfg.size[1], b);
        return b;
    }

    /** 开始建造（进入放置模式） */
    startBuildMode(typeId) {
        const cfg = BUILDINGS[typeId];
        if (this.credits < cfg.cost) return false;

        // 单线程建造：已有建筑在施工中则不允许新建
        const anyBuilding = this.buildings.some(
            b => b.owner === 'player' && b.isBuilding
        );
        if (anyBuilding) return false;

        // 检查前置条件
        const prereqs = BUILD_PREREQS[typeId] || [];
        for (const prereq of prereqs) {
            const has = this.buildings.some(
                b => b.typeId === prereq && b.owner === 'player' && b.isComplete
            );
            if (!has) return false;
        }

        this.buildMode = { typeId, col: 0, row: 0 };
        this.selectedEntities = [];
        return true;
    }

    /** 检查建造位置是否在已有己方建筑的建造范围内 */
    isInBuildRange(col, row, w, h, owner = 'player') {
        for (const b of this.buildings) {
            if (b.owner !== owner || !b.isComplete) continue;
            // 计算建筑边缘之间的最短距离
            const bx1 = b.col;
            const by1 = b.row;
            const bx2 = b.col + b.w;
            const by2 = b.row + b.h;
            const nx1 = col;
            const ny1 = row;
            const nx2 = col + w;
            const ny2 = row + h;

            // 矩形间的最短距离
            const dx = Math.max(0, Math.max(bx1 - nx2, nx1 - bx2));
            const dy = Math.max(0, Math.max(by1 - ny2, ny1 - by2));
            const tileDist = Math.max(dx, dy); // 切比雪夫距离（RA风格）

            if (tileDist <= BUILD_RANGE) return true;
        }
        return false;
    }

    /** 确认放置建筑 */
    confirmBuild() {
        if (!this.buildMode) return;
        const { typeId, col, row } = this.buildMode;
        const cfg = BUILDINGS[typeId];

        if (!this.map.isBuildable(col, row, cfg.size[0], cfg.size[1])) return;
        if (!this.isInBuildRange(col, row, cfg.size[0], cfg.size[1])) return;
        if (this.credits < cfg.cost) return;

        this.credits -= cfg.cost;
        this._placeBuilding(typeId, col, row, 'player');
        this.buildMode = null;
    }

    /** 取消建造 */
    cancelBuild() {
        this.buildMode = null;
    }

    /** 生成单位 */
    spawnUnit(typeId, producer, owner) {
        const spawnPt = producer.getSpawnPoint(this);
        if (!spawnPt) return null;

        const unit = new Unit(typeId, spawnPt.x, spawnPt.y, owner);
        unit._findHomeRefinery(this);
        if (unit.isHarvester) {
            unit.miningState = 'finding';
        }
        this.units.push(unit);
        return unit;
    }

    /** 查找最近的敌人 */
    findNearestEnemy(unit, maxRange) {
        let best = null;
        let bestDist = maxRange || Infinity;

        // 搜索敌方单位
        for (const other of this.units) {
            if (other.owner === unit.owner || other.hp <= 0) continue;
            const dx = unit.x - other.x;
            const dy = unit.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = other;
            }
        }

        // 搜索敌方建筑
        for (const b of this.buildings) {
            if (b.owner === unit.owner || b.hp <= 0) continue;
            const bc = b.getCenter();
            const dx = unit.x - bc.x;
            const dy = unit.y - bc.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < bestDist) {
                bestDist = dist;
                best = b;
            }
        }

        return best;
    }

    /** 查找点击位置的实体 */
    entityAt(wx, wy) {
        // 优先选择单位（在上层）
        for (let i = this.units.length - 1; i >= 0; i--) {
            if (this.units[i].hp <= 0) continue;
            if (this.units[i].containsPoint(wx, wy)) {
                return this.units[i];
            }
        }
        // 再检查建筑
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            if (b.hp <= 0) continue;
            const bx = b.col * TILE_SIZE;
            const by = b.row * TILE_SIZE;
            const bw = b.w * TILE_SIZE;
            const bh = b.h * TILE_SIZE;
            if (wx >= bx && wx <= bx + bw && wy >= by && wy <= by + bh) {
                return b;
            }
        }
        return null;
    }

    /** 框选范围内的己方单位 */
    entitiesInRect(x1, y1, x2, y2) {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        const result = [];
        for (const unit of this.units) {
            if (!unit.isPlayer || unit.hp <= 0) continue;
            const b = unit.getBounds();
            if (b.x + b.w >= rx && b.x <= rx + rw &&
                b.y + b.h >= ry && b.y <= ry + rh) {
                result.push(unit);
            }
        }
        // 如果框选范围内没有单位，检查建筑
        if (result.length === 0) {
            for (const b of this.buildings) {
                if (!b.isPlayer || b.hp <= 0) continue;
                const bx = b.col * TILE_SIZE;
                const by = b.row * TILE_SIZE;
                const bw = b.w * TILE_SIZE;
                const bh = b.h * TILE_SIZE;
                if (bx + bw >= rx && bx <= rx + rw &&
                    by + bh >= ry && by <= ry + rh) {
                    result.push(b);
                }
            }
        }
        return result;
    }

    /** 检查某位置是否有单位（用于碰撞） */
    isUnitAt(wx, wy, threshold = TILE_SIZE) {
        for (const unit of this.units) {
            if (unit.hp <= 0) continue;
            const dx = unit.x - wx;
            const dy = unit.y - wy;
            if (Math.sqrt(dx * dx + dy * dy) < threshold) return true;
        }
        return false;
    }

    recalculatePower() {
        this.powerProvided = 0;
        this.powerConsumed = 0;
        for (const b of this.buildings) {
            if (b.owner !== 'player' || !b.isComplete) continue;
            this.powerProvided += b.cfg.powerProvided;
            this.powerConsumed += b.cfg.powerConsumed;
        }
        this.powerState = this.powerProvided >= this.powerConsumed ? 'normal' : 'low';
    }

    update(dt) {
        this.gameTime += dt;

        // 更新建筑
        for (const b of this.buildings) {
            if (b.hp <= 0) continue;
            b.update(dt, this);
        }

        // 更新单位
        for (const unit of this.units) {
            if (unit.hp <= 0) continue;
            unit.update(dt, this);
        }

        // 清理死亡实体
        this._cleanupDead();

        // 敌方 AI
        this._updateAI(dt);

        // 电力
        this.recalculatePower();

        // 摄像机限制
        this.camera.clamp(
            MAP_COLS * TILE_SIZE, MAP_ROWS * TILE_SIZE,
            this.canvas.width, this.canvas.height
        );

        // 更新建造预览位置
        if (this.buildMode && this.buildMode.col !== undefined) {
            // col/row 由 input 实时更新
        }
    }

    _cleanupDead() {
        // 移除死亡建筑
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            if (b.hp <= 0) {
                this.map.freeTiles(b.col, b.row, b.w, b.h);
                this.selectedEntities = this.selectedEntities.filter(e => e !== b);
                this.buildings.splice(i, 1);
            }
        }
        // 移除死亡单位
        for (let i = this.units.length - 1; i >= 0; i--) {
            const u = this.units[i];
            if (u.hp <= 0) {
                // 清除引用
                this.selectedEntities = this.selectedEntities.filter(e => e !== u);
                // 如果该单位是其他单位的攻击目标
                for (const other of this.units) {
                    if (other.attackTarget === u) other.attackTarget = null;
                }
                this.units.splice(i, 1);
            }
        }
    }

    /** 敌方 AI：自主建造 + 持续生产坦克 + 定期进攻 */
    _updateAI(dt) {
        // AI 持续收入
        this.aiCredits += this.aiIncomeRate * dt;

        const enemyCY = this.buildings.find(
            b => b.typeId === 'construction_yard' && b.owner === 'enemy' && b.isComplete && b.hp > 0
        );
        if (!enemyCY) return;

        // ── 建造阶段：从零开始发展（完整建造动画）──
        if (this.aiBuildPhase === 'power_plant') {
            const existing = this.buildings.find(
                b => b.typeId === 'power_plant' && b.owner === 'enemy'
            );
            if (existing && existing.isComplete) {
                // 电厂已完成 → 下一阶段
                this.aiBuildPhase = 'war_factory';
            } else if (!existing) {
                // 还没造电厂 → 尝试放置
                const cfg = BUILDINGS['power_plant'];
                if (this.aiCredits >= cfg.cost) {
                    const loc = this._findAIBuildSpot(enemyCY, cfg.size[0], cfg.size[1]);
                    if (loc) {
                        this.aiCredits -= cfg.cost;
                        this._placeBuilding('power_plant', loc.col, loc.row, 'enemy');
                        // 不设 buildProgress=1，让它经历建造过程
                    }
                }
            }
            // else: existing && isBuilding → 等待施工完成
        } else if (this.aiBuildPhase === 'war_factory') {
            const existing = this.buildings.find(
                b => b.typeId === 'war_factory' && b.owner === 'enemy'
            );
            if (existing && existing.isComplete) {
                // 重工已完成 → 开始产坦克
                this.aiBuildPhase = 'producing';
            } else if (!existing) {
                const cfg = BUILDINGS['war_factory'];
                if (this.aiCredits >= cfg.cost) {
                    const loc = this._findAIBuildSpot(enemyCY, cfg.size[0], cfg.size[1]);
                    if (loc) {
                        this.aiCredits -= cfg.cost;
                        this._placeBuilding('war_factory', loc.col, loc.row, 'enemy');
                    }
                }
            }
        }

        // ── 生产阶段：战车工厂造好后开始产坦克 ──
        const enemyWF = this.buildings.find(
            b => b.typeId === 'war_factory' && b.owner === 'enemy' && b.isComplete && b.hp > 0
        );
        if (enemyWF) {
            this.aiTimer += dt;
            if (this.aiTimer >= this.aiProdCooldown) {
                this.aiTimer = 0;
                if (enemyWF.productionQueue.length < 3) {
                    const tankCfg = UNITS['tank'];
                    if (this.aiCredits >= tankCfg.cost) {
                        this.aiCredits -= tankCfg.cost;
                        enemyWF.queueUnit('tank');
                    }
                }
            }
        }

        // ── 进攻指令：空闲坦克向玩家基地推进 ──
        const playerCY = this.buildings.find(
            b => b.typeId === 'construction_yard' && b.owner === 'player' && b.hp > 0
        );
        if (playerCY) {
            const target = playerCY.getCenter();
            for (const unit of this.units) {
                if (unit.owner !== 'enemy' || unit.hp <= 0) continue;
                if (unit.typeId !== 'tank') continue;
                if (!unit.attackTarget && unit.targetX === null) {
                    const spreadX = (Math.random() - 0.5) * TILE_SIZE * 10;
                    const spreadY = (Math.random() - 0.5) * TILE_SIZE * 10;
                    unit.commandMove(target.x + spreadX, target.y + spreadY);
                }
            }
        }
    }

    /** 在目标建筑周围螺旋搜索空地（供 AI 建造用） */
    _findAIBuildSpot(baseBuilding, w, h) {
        for (let dist = 2; dist <= 10; dist++) {
            for (let dc = -dist; dc <= dist; dc++) {
                for (let dr = -dist; dr <= dist; dr++) {
                    const col = baseBuilding.col + dc;
                    const row = baseBuilding.row + dr;
                    if (this.map.isBuildable(col, row, w, h) &&
                        this.isInBuildRange(col, row, w, h, 'enemy')) {
                        return { col, row };
                    }
                }
            }
        }
        return null;
    }

    render() {
        this.renderer.render(this);
    }

    /** 获取玩家拥有的某类型建筑数量 */
    countBuildings(typeId, owner = 'player') {
        return this.buildings.filter(
            b => b.typeId === typeId && b.owner === owner && b.isComplete
        ).length;
    }

    /** 是否可以建造某类型 */
    canBuild(typeId) {
        const cfg = BUILDINGS[typeId];
        if (this.credits < cfg.cost) return false;
        // 单线程：已有建筑在施工
        if (this.buildings.some(b => b.owner === 'player' && b.isBuilding)) return false;
        const prereqs = BUILD_PREREQS[typeId] || [];
        for (const prereq of prereqs) {
            if (this.countBuildings(prereq) === 0) return false;
        }
        return true;
    }

    /** 当前是否有建筑正在施工（供 UI 显示） */
    get isAnyBuilding() {
        return this.buildings.some(b => b.owner === 'player' && b.isBuilding);
    }

    /** 是否可以生产某单位 */
    canProduce(typeId) {
        const cfg = UNITS[typeId];
        return this.credits >= cfg.cost;
    }

    /** 生产单位（从选中的建筑） */
    produceUnit(typeId) {
        const cfg = UNITS[typeId];
        if (this.credits < cfg.cost) return false;

        // 找选中的可生产该单位的建筑
        for (const ent of this.selectedEntities) {
            if (ent instanceof Building && ent.isPlayer && ent.isComplete) {
                if (ent.getProducibleUnits().some(u => u.id === typeId)) {
                    this.credits -= cfg.cost;
                    return ent.queueUnit(typeId);
                }
            }
        }
        return false;
    }
}
