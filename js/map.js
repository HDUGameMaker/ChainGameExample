/**
 * map.js — 地图系统
 * ================
 * 管理地形网格、矿石分布、建筑占用
 */

class GameMap {
    constructor() {
        // tiles[row][col] = { type:'grass'|'water', ore:OreField|null, building:Building|null }
        this.tiles = [];
        this.oreFields = [];   // 所有矿石格引用
        this._generate();
    }

    /** 生成平坦草地 + 随机矿石 */
    _generate() {
        for (let r = 0; r < MAP_ROWS; r++) {
            this.tiles[r] = [];
            for (let c = 0; c < MAP_COLS; c++) {
                // 给草地加一点颜色变化
                const variant = (r * 7 + c * 13) % 5;
                let type = 'grass';
                let shade = 0;
                if (variant === 0) shade = -1;
                if (variant === 1) shade = 1;
                this.tiles[r][c] = { type, shade, ore: null, building: null };
            }
        }
        this._placeOreClusters();
    }

    _placeOreClusters() {
        const margin = 4;  // 地图边缘留空
        for (let i = 0; i < ORE.clusters; i++) {
            // 随机簇中心
            const cx = margin + Math.floor(Math.random() * (MAP_COLS - margin * 2));
            const cy = margin + Math.floor(Math.random() * (MAP_ROWS - margin * 2));
            const size = 3 + Math.floor(Math.random() * (ORE.clusterSize - 2));

            for (let j = 0; j < size; j++) {
                // 在中心周围散布
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 4;
                const c = Math.floor(cx + Math.cos(angle) * dist);
                const r = Math.floor(cy + Math.sin(angle) * dist);
                if (this.isInBounds(c, r) && !this.tiles[r][c].ore) {
                    const amount = ORE.minOre + Math.floor(Math.random() * (ORE.maxOre - ORE.minOre));
                    const oreField = new OreField(c, r, amount);
                    this.tiles[r][c].ore = oreField;
                    this.oreFields.push(oreField);
                }
            }
        }
    }

    isInBounds(col, row) {
        return col >= 0 && col < MAP_COLS && row >= 0 && row < MAP_ROWS;
    }

    /** 检查矩形区域是否可建造 */
    isBuildable(col, row, w, h) {
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (!this.isInBounds(c, r)) return false;
                const t = this.tiles[r][c];
                if (t.type !== 'grass') return false;
                if (t.building !== null) return false;
            }
        }
        return true;
    }

    /** 占用瓦片 */
    occupyTiles(col, row, w, h, building) {
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (this.isInBounds(c, r)) {
                    this.tiles[r][c].building = building;
                }
            }
        }
    }

    /** 释放瓦片 */
    freeTiles(col, row, w, h) {
        for (let r = row; r < row + h; r++) {
            for (let c = col; c < col + w; c++) {
                if (this.isInBounds(c, r)) {
                    this.tiles[r][c].building = null;
                }
            }
        }
    }

    /** 取走矿石，返回实际采集量 */
    harvestOre(col, row, amount) {
        if (!this.isInBounds(col, row)) return 0;
        const ore = this.tiles[row][col].ore;
        if (!ore || ore.amount <= 0) return 0;
        const taken = Math.min(amount, ore.amount);
        ore.amount -= taken;
        if (ore.amount <= 0) {
            this.tiles[row][col].ore = null;
            // 从列表中移除
            const idx = this.oreFields.indexOf(ore);
            if (idx >= 0) this.oreFields.splice(idx, 1);
        }
        return taken;
    }

    /** 查找指定坐标周围最近的矿石格 */
    findNearestOre(worldX, worldY, maxDist = 20) {
        const col = Math.floor(worldX / TILE_SIZE);
        const row = Math.floor(worldY / TILE_SIZE);
        let best = null;
        let bestDist = Infinity;
        for (const ore of this.oreFields) {
            if (ore.amount <= 0) continue;
            const dc = ore.col - col;
            const dr = ore.row - row;
            const dist = Math.sqrt(dc * dc + dr * dr);
            if (dist < maxDist && dist < bestDist) {
                bestDist = dist;
                best = ore;
            }
        }
        return best;
    }

    /** 世界坐标转网格坐标 */
    worldToGrid(wx, wy) {
        return {
            col: Math.floor(wx / TILE_SIZE),
            row: Math.floor(wy / TILE_SIZE),
        };
    }

    /** 查找某阵营某类型的最近建筑 */
    findNearestBuildingOfType(worldX, worldY, buildingTypeId, owner) {
        // 由 entities 层处理
        return null; // 占位，实际在 Game 类中实现
    }
}

/** 矿石格 */
class OreField {
    constructor(col, row, amount) {
        this.col = col;
        this.row = row;
        this.amount = amount;
        this.maxAmount = amount;
    }
}
