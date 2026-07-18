/**
 * ui.js — UI 管理器
 * ================
 * 顶部栏（资源 + 电力）、侧边栏（建造/生产面板）、选中信息
 *
 * ⚠️ 注意：侧边栏使用 HTML 缓存 + mousedown 委托。
 * 因为 UI 每帧刷新，如果用 click 事件，按钮会在 mousedown 和 mouseup
 * 之间被 innerHTML 重建销毁，导致 click 永远不触发。
 */

class UIManager {
    constructor(game) {
        this.game = game;

        // DOM 元素引用
        this.topBar = document.getElementById('top-bar');
        this.creditsEl = document.getElementById('credits');
        this.powerEl = document.getElementById('power');
        this.sidebar = document.getElementById('sidebar');
        this.sidebarTitle = document.getElementById('sidebar-title');
        this.sidebarContent = document.getElementById('sidebar-content');

        // HTML 缓存：内容不变时不重写 DOM（避免按钮被反复销毁重建）
        this._lastTitle = '';
        this._lastHTML = '';

        // 绑定事件
        this._bindSidebarEvents();
    }

    _bindSidebarEvents() {
        // 用 mousedown 而不是 click：按下瞬间即响应，
        // 即使下一帧 DOM 被重建也不影响
        this.sidebarContent.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 只响应左键
            const btn = e.target.closest('button');
            if (!btn || btn.disabled) return;
            e.preventDefault();

            const action = btn.dataset.action;
            const typeId = btn.dataset.typeId;

            if (action === 'build') {
                this.game.startBuildMode(typeId);
            } else if (action === 'produce') {
                this.game.produceUnit(typeId);
            } else if (action === 'cancelBuild') {
                this.game.cancelBuild();
            } else if (action === 'selectAll') {
                const type = btn.dataset.unitType;
                const all = this.game.units.filter(
                    u => u.isPlayer && u.typeId === type && u.hp > 0
                );
                if (all.length > 0) {
                    this.game.selectedEntities = all;
                }
            }
        });
    }

    /** 只有内容变化时才更新 DOM */
    _setSidebar(title, html) {
        if (title !== this._lastTitle) {
            this.sidebarTitle.textContent = title;
            this._lastTitle = title;
        }
        if (html !== this._lastHTML) {
            this.sidebarContent.innerHTML = html;
            this._lastHTML = html;
        }
    }

    update() {
        this._updateTopBar();
        this._updateSidebar();
    }

    // ── 顶部栏 ──
    _updateTopBar() {
        // 金钱
        this.creditsEl.textContent = '$' + this.game.credits;
        this.creditsEl.style.color = this.game.credits < 300 ? '#ff6666' : '#ffdd44';

        // 电力
        const provided = this.game.powerProvided;
        const consumed = this.game.powerConsumed;
        this.powerEl.textContent = `⚡ ${consumed} / ${provided}`;
        this.powerEl.style.color = this.game.powerState === 'low' ? '#ff6666' : '#88ff88';
    }

    // ── 侧边栏 ──
    _updateSidebar() {
        const sel = this.game.selectedEntities;
        const buildMode = this.game.buildMode;

        // 建造模式
        if (buildMode) {
            this._renderBuildModeUI();
            return;
        }

        // 单选建筑
        if (sel.length === 1 && sel[0] instanceof Building && sel[0].isPlayer) {
            this._renderBuildingUI(sel[0]);
            return;
        }

        // 选中己方单位
        if (sel.length >= 1 && sel.every(e => e.isPlayer && e instanceof Unit)) {
            this._renderUnitUI(sel);
            return;
        }

        // 选中敌方
        if (sel.length === 1 && !sel[0].isPlayer) {
            this._renderEnemyInfo(sel[0]);
            return;
        }

        // 默认：建造面板
        this._renderBuildPanel();
    }

    _renderBuildModeUI() {
        const cfg = BUILDINGS[this.game.buildMode.typeId];
        const valid = this.game.map.isBuildable(
            this.game.buildMode.col, this.game.buildMode.row, cfg.size[0], cfg.size[1]
        );
        this._setSidebar('🏗️ 建造中', `
            <div class="info-block">
                <div class="info-name">${cfg.name}</div>
                <div class="info-desc">${cfg.desc}</div>
                <div class="info-stat">💰 $${cfg.cost}</div>
                <div class="info-stat">⏱️ ${(cfg.buildTime / 1000).toFixed(1)}s</div>
                <div class="info-stat">❤️ ${cfg.maxHp} HP</div>
                <div class="info-stat" style="color:${valid ? '#8f8' : '#f88'}">
                    ${valid ? '✅ 可放置 - 点击地图放置' : '❌ 无法放置 - 位置被占用'}
                </div>
                <button class="btn btn-cancel" data-action="cancelBuild">✕ 取消建造 (右键)</button>
            </div>`);
    }

    _renderBuildingUI(building) {
        const cfg = building.cfg;
        const producible = building.getProducibleUnits();

        let prodHTML = '';
        if (building.currentProduction) {
            const p = building.currentProduction;
            const ucfg = UNITS[p.typeId];
            // 进度取整到 5%，避免每帧刷新 DOM 导致按钮点不了
            const pct = Math.floor((p.progress / p.total) * 20) * 5;
            prodHTML = `
                <div class="production-bar-container">
                    <div class="production-label">🔧 ${ucfg.name} ${pct}%</div>
                    <div class="production-bar">
                        <div class="production-fill" style="width:${pct}%"></div>
                    </div>
                </div>`;
            if (building.productionQueue.length > 1) {
                prodHTML += `<div class="info-stat">📋 队列: ${building.productionQueue.length} 个</div>`;
            }
        }

        let queueHTML = '';
        if (producible.length > 0 && building.isComplete) {
            queueHTML = '<div class="section-title">📋 可生产单位</div>';
            for (const unitCfg of producible) {
                const canProd = this.game.canProduce(unitCfg.id);
                const disabled = !canProd ? 'disabled' : '';
                queueHTML += `
                    <button class="btn btn-produce" data-action="produce" data-type-id="${unitCfg.id}" ${disabled}>
                        <span>${unitCfg.name}</span>
                        <span class="cost">$${unitCfg.cost}</span>
                        ${!canProd ? '<span class="no-money">资金不足</span>' : ''}
                    </button>`;
            }
        }

        const hpPct = Math.floor((building.hp / building.maxHp) * 100);
        // 建造进度取整到 5%
        const buildPct = building.isBuilding ? Math.floor(building.buildProgress * 20) * 5 : 100;

        this._setSidebar('🏢 ' + cfg.name, `
            <div class="info-block">
                <div class="info-name">${cfg.name} ${building.isBuilding ? '(建造中)' : ''}</div>
                <div class="info-desc">${cfg.desc}</div>
                <div class="info-stat">❤️ ${building.hp} / ${building.maxHp} (${hpPct}%)</div>
                ${building.isBuilding ? `<div class="info-stat">🔨 ${buildPct}%</div>` : ''}
                ${building.isComplete && cfg.powerConsumed > 0 ? `<div class="info-stat">⚡ 消耗 ${cfg.powerConsumed}</div>` : ''}
                ${building.isComplete && cfg.powerProvided > 0 ? `<div class="info-stat">⚡ 产出 ${cfg.powerProvided}</div>` : ''}
                <div class="hp-bar-container">
                    <div class="hp-bar" style="width:${hpPct}%"></div>
                </div>
                ${prodHTML}
                ${queueHTML}
            </div>`);
    }

    _renderUnitUI(selectedUnits) {
        if (selectedUnits.length === 1) {
            // 单选单位
            const unit = selectedUnits[0];
            const cfg = unit.cfg;
            const hpPct = Math.floor((unit.hp / unit.maxHp) * 100);

            let extraHTML = '';
            if (unit.isHarvester) {
                extraHTML = `
                    <div class="info-stat">⛏️ 状态: ${this._miningStateLabel(unit.miningState)}</div>
                    <div class="info-stat">💎 载货: ${unit.cargo} / ${cfg.cargoCapacity}</div>
                    <div class="info-stat">🏠 精炼厂: ${unit.homeRefinery ? '已绑定' : '搜索中'}</div>`;
            } else if (unit.cfg.damage > 0) {
                extraHTML = `
                    <div class="info-stat">💥 伤害: ${cfg.damage}</div>
                    <div class="info-stat">🎯 射程: ${cfg.attackRange} 格</div>
                    ${cfg.autoAttackRange ? `<div class="info-stat">👁️ 自动索敌: ${cfg.autoAttackRange} 格</div>` : ''}
                    ${unit.attackTarget ? '<div class="info-stat">⚔️ 攻击中...</div>' : ''}`;
            }

            this._setSidebar('🎖️ ' + cfg.name, `
                <div class="info-block">
                    <div class="info-name">${cfg.name}</div>
                    <div class="info-desc">${cfg.desc}</div>
                    <div class="info-stat">❤️ ${unit.hp} / ${unit.maxHp} (${hpPct}%)</div>
                    <div class="hp-bar-container">
                        <div class="hp-bar" style="width:${hpPct}%"></div>
                    </div>
                    <div class="info-stat">🏃 速度: ${cfg.speed}</div>
                    ${extraHTML}
                    <div class="info-help">右键空地移动 · 右键敌人攻击</div>
                    <button class="btn btn-action" data-action="selectAll" data-unit-type="${unit.typeId}">
                        📢 选择所有${cfg.name}
                    </button>
                </div>`);
        } else {
            // 多选
            const unitCounts = {};
            for (const u of selectedUnits) {
                unitCounts[u.cfg.name] = (unitCounts[u.cfg.name] || 0) + 1;
            }
            const summary = Object.entries(unitCounts)
                .map(([name, count]) => `${count}x ${name}`)
                .join('<br>');

            this._setSidebar(`🎖️ 已选 ${selectedUnits.length} 个单位`, `
                <div class="info-block">
                    <div class="info-name">已选单位</div>
                    <div class="info-stat" style="line-height:1.8">${summary}</div>
                    <div class="info-help">右键空地移动 · 右键敌人攻击</div>
                    <div class="info-help">按 S 键停止</div>
                </div>`);
        }
    }

    _renderEnemyInfo(entity) {
        let name, hp, maxHp, extra;
        if (entity instanceof Building) {
            name = entity.cfg.name;
            hp = entity.hp;
            maxHp = entity.maxHp;
            extra = `🏢 ${entity.cfg.desc}`;
        } else {
            name = entity.cfg.name;
            hp = entity.hp;
            maxHp = entity.maxHp;
            extra = `🎖️ ${entity.cfg.desc}`;
        }
        const hpPct = Math.floor((hp / maxHp) * 100);

        this._setSidebar('🔴 敌方 - ' + name, `
            <div class="info-block enemy-info">
                <div class="info-name" style="color:#f66">⚠️ ${name}</div>
                <div class="info-stat">${extra}</div>
                <div class="info-stat">❤️ ${hp} / ${maxHp} (${hpPct}%)</div>
                <div class="hp-bar-container">
                    <div class="hp-bar enemy" style="width:${hpPct}%"></div>
                </div>
                <div class="info-help">选择己方单位后右键攻击</div>
            </div>`);
    }

    _renderBuildPanel() {
        let html = '';

        // 如果有建筑正在施工，显示提示
        if (this.game.isAnyBuilding) {
            const underConstruction = this.game.buildings.find(
                b => b.owner === 'player' && b.isBuilding
            );
            const name = underConstruction ? underConstruction.cfg.name : '建筑';
            const pct = underConstruction ? Math.floor(underConstruction.buildProgress * 20) * 5 : 0;
            html += `<div class="info-stat" style="color:#ffaa00;margin-bottom:10px;">
                🔨 ${name} 施工中 ${pct}% — 请等待完成</div>`;
        }

        html += '<div class="section-title">选择建筑建造</div>';
        for (const typeId of BUILD_ORDER) {
            const cfg = BUILDINGS[typeId];
            if (!cfg.buildable) continue;
            const canBuild = this.game.canBuild(typeId);
            const disabled = !canBuild ? 'disabled' : '';
            const prereqs = BUILD_PREREQS[typeId] || [];
            const missingPrereq = prereqs.filter(p => this.game.countBuildings(p) === 0);

            let reasonHTML = '';
            if (!canBuild) {
                if (this.game.isAnyBuilding) {
                    reasonHTML = '<span class="build-prereq">等待当前建筑施工完成</span>';
                } else if (missingPrereq.length > 0) {
                    reasonHTML = `<span class="build-prereq">需要: ${missingPrereq.map(p => BUILDINGS[p].name).join(', ')}</span>`;
                } else {
                    reasonHTML = '<span class="no-money">资金不足</span>';
                }
            }

            html += `
                <button class="btn btn-build" data-action="build" data-type-id="${typeId}" ${disabled}>
                    <span class="build-symbol">${cfg.symbol}</span>
                    <span class="build-name">${cfg.name}</span>
                    <span class="build-cost">$${cfg.cost}</span>
                    ${reasonHTML}
                </button>`;
        }

        // 未选中任何建筑时的默认信息
        html += `
            <div class="info-help" style="margin-top:12px;">
                💡 提示：<br>
                · 左键点击己方建筑/单位选中<br>
                · 左键拖拽框选多个单位<br>
                · 右键移动/攻击<br>
                · 方向键移动视野<br>
                · 滚轮缩放<br>
                · ESC 取消选择<br>
                · 建筑必须造在基地附近
            </div>`;

        this._setSidebar('🏗️ 建筑建造', html);
    }

    _miningStateLabel(state) {
        const labels = {
            idle: '💤 空闲',
            finding: '🔍 寻找矿石',
            movingToOre: '🚛 前往矿石',
            harvesting: '⛏️ 采集中',
            returning: '🏠 返回精炼厂',
            unloading: '💰 卸货中',
        };
        return labels[state] || state;
    }
}
