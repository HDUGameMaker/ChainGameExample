/**
 * entities.js — 游戏实体类
 * ========================
 * Building、Unit、及其行为逻辑
 */

// ── 建筑 ──
class Building {
    constructor(typeId, col, row, owner) {
        const cfg = BUILDINGS[typeId];
        this.typeId = typeId;
        this.cfg = cfg;
        this.col = col;
        this.row = row;
        this.x = col * TILE_SIZE;
        this.y = row * TILE_SIZE;
        this.w = cfg.size[0];
        this.h = cfg.size[1];
        this.owner = owner;
        this.hp = cfg.maxHp;
        this.maxHp = cfg.maxHp;
        this.buildProgress = cfg.buildTime > 0 ? 0 : 1;  // 0~1, 1=完成
        this.isBuilding = cfg.buildTime > 0;  // 是否正在建造中
        this.productionQueue = [];   // [{typeId, progress, total}]
        this.productionTimer = 0;
        this.attackCooldown = 0;
    }

    get isComplete() { return this.buildProgress >= 1; }
    get isPlayer() { return this.owner === 'player'; }
    get isEnemy() { return this.owner === 'enemy'; }

    /** 开始生产单位 */
    queueUnit(typeId) {
        const unitCfg = UNITS[typeId];
        if (!unitCfg) return false;
        this.productionQueue.push({
            typeId,
            progress: 0,
            total: unitCfg.buildTime,
        });
        return true;
    }

    /** 当前正在生产的类型（null 表示空闲） */
    get currentProduction() {
        return this.productionQueue.length > 0 ? this.productionQueue[0] : null;
    }

    update(dt, game) {
        // 建造进度（dt 是秒，buildTime 是毫秒）
        if (this.isBuilding && this.buildProgress < 1) {
            const speed = game.powerState === 'low' ? ECONOMY.lowPowerSpeed : 1;
            this.buildProgress += ((dt * 1000) / this.cfg.buildTime) * speed;
            if (this.buildProgress >= 1) {
                this.buildProgress = 1;
                this.isBuilding = false;
                // 精炼厂建造完成后赠送矿车
                if (this.typeId === 'ore_refinery' && this.owner === 'player') {
                    game.spawnUnit('harvester', this, this.owner);
                }
            }
        }

        // 建造完成后才能生产单位
        if (!this.isComplete) return;

        // 生产队列
        if (this.productionQueue.length > 0) {
            const item = this.productionQueue[0];
            const speed = game.powerState === 'low' ? ECONOMY.lowPowerSpeed : 1;
            item.progress += dt * speed * 1000; // dt 是秒，转为毫秒
            if (item.progress >= item.total) {
                // 生产完成，尝试生成单位
                const spawned = game.spawnUnit(item.typeId, this, this.owner);
                if (spawned) {
                    this.productionQueue.shift();
                }
                // 如果 spawn 失败（被堵住），暂停进度等待
            }
        }
    }

    /** 该建筑可以生产的单位类型列表 */
    getProducibleUnits() {
        return Object.values(UNITS).filter(u => u.builtAt === this.typeId);
    }

    /** 获取中心点世界坐标 */
    getCenter() {
        return {
            x: this.x + (this.w * TILE_SIZE) / 2,
            y: this.y + (this.h * TILE_SIZE) / 2,
        };
    }

    /** 获取地图边缘可生成单位的位置 */
    getSpawnPoint(game) {
        // 尝试建筑周围的格子
        const offsets = [
            [this.w, 0], [this.w, 1], [this.w, -1],
            [-1, 0], [-1, 1], [-1, -1],
            [0, -1], [1, -1], [this.w - 1, -1],
            [0, this.h], [1, this.h], [this.w - 1, this.h],
        ];
        for (const [dc, dr] of offsets) {
            const sc = this.col + Math.floor(dc);
            const sr = this.row + Math.floor(dr);
            if (game.map.isInBounds(sc, sr) &&
                !game.map.tiles[sr][sc].building &&
                !game.isUnitAt(sc * TILE_SIZE + TILE_SIZE / 2, sr * TILE_SIZE + TILE_SIZE / 2)) {
                return {
                    x: sc * TILE_SIZE + TILE_SIZE / 2,
                    y: sr * TILE_SIZE + TILE_SIZE / 2,
                };
            }
        }
        // 如果周围都满了，尝试更远
        for (let dist = 2; dist <= 5; dist++) {
            for (let dc = -dist; dc <= this.w + dist; dc++) {
                for (let dr = -dist; dr <= this.h + dist; dr++) {
                    const sc = this.col + dc;
                    const sr = this.row + dr;
                    if (game.map.isInBounds(sc, sr) &&
                        !game.map.tiles[sr][sc].building) {
                        return {
                            x: sc * TILE_SIZE + TILE_SIZE / 2,
                            y: sr * TILE_SIZE + TILE_SIZE / 2,
                        };
                    }
                }
            }
        }
        return null;
    }
}

// ── 单位 ──
class Unit {
    constructor(typeId, x, y, owner) {
        const cfg = UNITS[typeId];
        this.typeId = typeId;
        this.cfg = cfg;
        this.x = x;
        this.y = y;
        this.owner = owner;
        this.hp = cfg.maxHp;
        this.maxHp = cfg.maxHp;

        // 移动
        this.targetX = null;
        this.targetY = null;
        this.attackTarget = null; // Unit | Building | null
        this.attackCooldown = 0;

        // 采矿状态机 (harvester)
        this.miningState = 'idle';    // idle | finding | movingToOre | harvesting | returning | unloading
        this.targetOre = null;        // OreField
        this.homeRefinery = null;     // Building (ore_refinery)
        this.cargo = 0;
        this.harvestTimer = 0;
        this.unloadTimer = 0;

        // 用于平滑渲染
        this.facingAngle = 0;
        this.turretAngle = 0;       // 炮塔朝向（坦克攻击时指向目标）

        this._findHomeRefinery(); // 如果可以用全局查找，这里先不做
    }

    get isPlayer() { return this.owner === 'player'; }
    get isEnemy() { return this.owner === 'enemy'; }
    get isHarvester() { return this.typeId === 'harvester'; }
    get isTank() { return this.typeId === 'tank'; }

    get speed() { return this.cfg.speed; }
    get size() { return this.cfg.size; }
    get attackRange() { return this.cfg.attackRange; }

    /** 查找该单位的"家"精炼厂（矿车专用） */
    _findHomeRefinery(game) {
        if (!this.isHarvester) return;
        if (!game) return;
        let best = null;
        let bestDist = Infinity;
        for (const b of game.buildings) {
            if (b.typeId === 'ore_refinery' && b.owner === this.owner && b.isComplete) {
                const cx = b.getCenter();
                const dx = this.x - cx.x;
                const dy = this.y - cx.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = b;
                }
            }
        }
        this.homeRefinery = best;
    }

    /** 指令：移动到指定位置 */
    commandMove(wx, wy) {
        this.targetX = wx;
        this.targetY = wy;
        this.attackTarget = null;
        if (this.isHarvester) {
            this.miningState = 'idle';
            this.targetOre = null;
        }
    }

    /** 指令：攻击目标 */
    commandAttack(target) {
        this.attackTarget = target;
        this.targetX = null;
        this.targetY = null;
        if (this.isHarvester) {
            this.miningState = 'idle';
            this.targetOre = null;
        }
    }

    /** 指令：开始采矿（矿车专用） */
    commandHarvest() {
        if (!this.isHarvester) return;
        this.miningState = 'finding';
        this.attackTarget = null;
        this.targetX = null;
        this.targetY = null;
    }

    update(dt, game) {
        // 攻击冷却
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt * 1000;
        }

        if (this.isHarvester) {
            this._updateHarvester(dt, game);
        } else {
            this._updateCombatUnit(dt, game);
        }

        // 通用移动执行
        if (this.targetX !== null && this.targetY !== null) {
            this._moveToward(this.targetX, this.targetY, dt);
        }
    }

    _updateCombatUnit(dt, game) {
        // 如果有攻击目标
        if (this.attackTarget && this.attackTarget.hp > 0) {
            const tx = this.attackTarget.x !== undefined ? this.attackTarget.x : this.attackTarget.col * TILE_SIZE;
            const ty = this.attackTarget.y !== undefined ? this.attackTarget.y : this.attackTarget.row * TILE_SIZE;
            const targetW = this.attackTarget.w ? this.attackTarget.w * TILE_SIZE : TILE_SIZE;
            const targetH = this.attackTarget.h ? this.attackTarget.h * TILE_SIZE : TILE_SIZE;

            const targetCX = tx + targetW / 2;
            const targetCY = ty + targetH / 2;
            const dx = this.x - targetCX;
            const dy = this.y - targetCY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // 炮塔始终对准目标
            this.turretAngle = Math.atan2(-dy, -dx);

            const weaponRangePx = this.attackRange * TILE_SIZE;
            if (dist <= weaponRangePx) {
                // 在射程内，攻击
                this.targetX = null;
                this.targetY = null;
                if (this.attackCooldown <= 0) {
                    this._doAttack(this.attackTarget);
                    this.attackCooldown = this.cfg.attackCooldown;
                }
            } else {
                // 移动到射程内
                const approachDist = dist - weaponRangePx + TILE_SIZE * 0.5;
                const ratio = approachDist / dist;
                this.targetX = this.x - dx * ratio;
                this.targetY = this.y - dy * ratio;
            }
        }

        // 自动索敌：移动中也扫描附近敌人（发现即切换为攻击）
        if (!this.attackTarget && this.cfg.damage > 0) {
            const nearest = game.findNearestEnemy(this, this.attackRange * TILE_SIZE * 1.5);
            if (nearest) {
                this.attackTarget = nearest;
                this.targetX = null;
                this.targetY = null;
            }
        }
    }

    _updateHarvester(dt, game) {
        this._findHomeRefinery(game);

        switch (this.miningState) {
            case 'finding':
                const ore = game.map.findNearestOre(this.x, this.y);
                if (ore) {
                    this.targetOre = ore;
                    this.miningState = 'movingToOre';
                    this.targetX = ore.col * TILE_SIZE + TILE_SIZE / 2;
                    this.targetY = ore.row * TILE_SIZE + TILE_SIZE / 2;
                } else {
                    this.miningState = 'idle';
                }
                break;

            case 'movingToOre':
                if (!this.targetOre || this.targetOre.amount <= 0) {
                    this.miningState = 'finding';
                    break;
                }
                // 到达矿石旁
                const dxo = this.x - (this.targetOre.col * TILE_SIZE + TILE_SIZE / 2);
                const dyo = this.y - (this.targetOre.row * TILE_SIZE + TILE_SIZE / 2);
                if (Math.sqrt(dxo * dxo + dyo * dyo) < TILE_SIZE * 0.8) {
                    this.targetX = null;
                    this.targetY = null;
                    this.miningState = 'harvesting';
                    this.harvestTimer = 0;
                }
                break;

            case 'harvesting':
                if (!this.targetOre || this.targetOre.amount <= 0) {
                    this.miningState = 'finding';
                    break;
                }
                this.harvestTimer += dt * 1000;
                if (this.harvestTimer >= this.cfg.harvestTime) {
                    // 采集完成
                    const taken = game.map.harvestOre(
                        this.targetOre.col, this.targetOre.row, this.cfg.cargoCapacity
                    );
                    this.cargo = taken;
                    this.targetOre = null;
                    this.miningState = 'returning';
                    this.targetX = null;
                    this.targetY = null;
                    // 找最近精炼厂
                    if (this.homeRefinery) {
                        const c = this.homeRefinery.getCenter();
                        this.targetX = c.x;
                        this.targetY = c.y;
                    }
                }
                break;

            case 'returning':
                if (!this.homeRefinery || !this.homeRefinery.isComplete) {
                    this._findHomeRefinery(game);
                    if (this.homeRefinery) {
                        const c = this.homeRefinery.getCenter();
                        this.targetX = c.x;
                        this.targetY = c.y;
                    }
                    break;
                }
                // 到达精炼厂
                const ctr = this.homeRefinery.getCenter();
                const dxr = this.x - ctr.x;
                const dyr = this.y - ctr.y;
                if (Math.sqrt(dxr * dxr + dyr * dyr) < TILE_SIZE * 1.5) {
                    this.targetX = null;
                    this.targetY = null;
                    this.miningState = 'unloading';
                    this.unloadTimer = 0;
                }
                break;

            case 'unloading':
                this.unloadTimer += dt * 1000;
                if (this.unloadTimer >= 500) {
                    // 卸货完成，给钱
                    game.credits += this.cargo;
                    this.cargo = 0;
                    this.miningState = 'finding';
                }
                break;

            case 'idle':
            default:
                // 空闲矿车自动找矿
                this.miningState = 'finding';
                break;
        }
    }

    _moveToward(tx, ty, dt) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 3) {
            this.x = tx;
            this.y = ty;
            this.targetX = null;
            this.targetY = null;
            return;
        }
        const moveAmount = this.speed * dt;
        const ratio = Math.min(moveAmount / dist, 1);
        const nx = this.x + dx * ratio;
        const ny = this.y + dy * ratio;

        // 简单碰撞：检查目标位置是否可通行
        // (这里简化处理，不检查碰撞以避免单位卡死)

        this.x = nx;
        this.y = ny;
        this.facingAngle = Math.atan2(dy, dx);
    }

    _doAttack(target) {
        if (!target || target.hp <= 0) return;
        target.hp -= this.cfg.damage;
        if (target.hp <= 0) {
            target.hp = 0;
            // 死亡处理由 Game 负责
        }
    }

    /** 获取包围盒(世界坐标) */
    getBounds() {
        return {
            x: this.x - (this.size[0] * TILE_SIZE) / 2,
            y: this.y - (this.size[1] * TILE_SIZE) / 2,
            w: this.size[0] * TILE_SIZE,
            h: this.size[1] * TILE_SIZE,
        };
    }

    /** 点是否在单位内 */
    containsPoint(wx, wy) {
        const b = this.getBounds();
        return wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h;
    }
}
