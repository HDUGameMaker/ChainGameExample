/**
 * input.js — 输入系统
 * ===================
 * 鼠标（左键选择/框选/建造、右键指令）、键盘（摄像机移动/快捷键）
 */

class InputManager {
    constructor(canvas, game) {
        this.canvas = canvas;
        this.game = game;

        // 鼠标状态
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseWorldX = 0;
        this.mouseWorldY = 0;
        this.isLeftDown = false;
        this.isRightDown = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragWorldStartX = 0;
        this.dragWorldStartY = 0;
        this.isDragging = false;
        this.dragThreshold = 4;
        this._shiftHeld = false;
        this._ctrlHeld = false;

        // 键盘状态
        this.keys = {};
        this.scrollSpeed = 500; // 像素/秒

        // 防止右键菜单
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        // 鼠标事件
        canvas.addEventListener('mousedown', this._onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this._onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this._onMouseUp.bind(this));
        canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

        // 键盘事件
        window.addEventListener('keydown', this._onKeyDown.bind(this));
        window.addEventListener('keyup', this._onKeyUp.bind(this));

        // 窗口大小
        window.addEventListener('resize', () => game.renderer.resize());
    }

    _updateWorldPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
        const world = this.game.camera.screenToWorld(
            this.mouseX, this.mouseY,
            this.canvas.width, this.canvas.height
        );
        this.mouseWorldX = world.x;
        this.mouseWorldY = world.y;
    }

    _onMouseDown(e) {
        this._updateWorldPos(e);
        this._shiftHeld = e.shiftKey;
        this._ctrlHeld = e.ctrlKey;

        if (e.button === 0) {
            // 左键
            this.isLeftDown = true;
            this.dragStartX = this.mouseWorldX;
            this.dragStartY = this.mouseWorldY;
            this.dragWorldStartX = this.mouseWorldX;
            this.dragWorldStartY = this.mouseWorldY;
            this.isDragging = false;
        } else if (e.button === 2) {
            // 右键
            this.isRightDown = true;
            this._handleRightClick();
        }
    }

    _onMouseMove(e) {
        const prevWorldX = this.mouseWorldX;
        const prevWorldY = this.mouseWorldY;
        this._updateWorldPos(e);

        // 拖动检测
        if (this.isLeftDown) {
            const dx = this.mouseWorldX - this.dragStartX;
            const dy = this.mouseWorldY - this.dragStartY;
            if (!this.isDragging && (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold)) {
                this.isDragging = true;
            }
            if (this.isDragging) {
                // 更新框选
                if (this.game.buildMode) {
                    // 建造模式下拖拽 = 移动摄像机（在 buildMode 存在但还没确认的情况下）
                } else {
                    this.game.selectionBox = {
                        startX: this.dragWorldStartX,
                        startY: this.dragWorldStartY,
                        endX: this.mouseWorldX,
                        endY: this.mouseWorldY,
                    };
                }
            }
        }

        // 建造模式：更新预览位置
        if (this.game.buildMode) {
            const grid = this.game.map.worldToGrid(this.mouseWorldX, this.mouseWorldY);
            this.game.buildMode.col = grid.col;
            this.game.buildMode.row = grid.row;
        }

        // 鼠标靠边滚动摄像机
        const edgeSize = 30;
        const cam = this.game.camera;
        if (this.mouseX < edgeSize) cam.x -= this.scrollSpeed * 0.016;
        if (this.mouseX > this.canvas.width - edgeSize) cam.x += this.scrollSpeed * 0.016;
        if (this.mouseY < edgeSize) cam.y -= this.scrollSpeed * 0.016;
        if (this.mouseY > this.canvas.height - edgeSize) cam.y += this.scrollSpeed * 0.016;
    }

    _onMouseUp(e) {
        if (e.button === 0) {
            this.isLeftDown = false;
            if (this.isDragging) {
                // 完成框选
                this._finishDragSelect();
                this.isDragging = false;
            } else {
                // 单击选择
                this._handleLeftClick();
            }
            this.game.selectionBox = null;
        } else if (e.button === 2) {
            this.isRightDown = false;
        }
    }

    _onWheel(e) {
        e.preventDefault();
        this._updateWorldPos(e);
        this.game.camera.zoomAt(
            this.mouseX, this.mouseY,
            this.canvas.width, this.canvas.height,
            e.deltaY > 0 ? -0.1 : 0.1
        );
    }

    _onKeyDown(e) {
        this.keys[e.key] = true;

        // ESC 取消建造
        if (e.key === 'Escape') {
            if (this.game.buildMode) {
                this.game.cancelBuild();
            }
            this.game.selectedEntities = [];
        }

        // S 停止（取消选中单位指令）
        if (e.key === 's' || e.key === 'S') {
            for (const ent of this.game.selectedEntities) {
                if (ent instanceof Unit) {
                    ent.commandMove(ent.x, ent.y);
                }
            }
        }

        // 数字键快捷选择
        if (e.key >= '1' && e.key <= '9') {
            // 预留
        }
    }

    _onKeyUp(e) {
        this.keys[e.key] = false;
    }

    _handleLeftClick() {
        // 建造模式下 = 确认放置
        if (this.game.buildMode) {
            this.game.confirmBuild();
            return;
        }

        // 检查是否点击了实体
        const entity = this.game.entityAt(this.mouseWorldX, this.mouseWorldY);
        if (entity) {
            if (this._shiftHeld) {
                // Shift+点击 = 追加选择
                if (entity.isPlayer) {
                    const idx = this.game.selectedEntities.indexOf(entity);
                    if (idx >= 0) {
                        this.game.selectedEntities.splice(idx, 1);
                    } else {
                        this.game.selectedEntities.push(entity);
                    }
                }
            } else {
                // 点击己方 = 选择，点击敌方 = 可以查看
                if (entity.isPlayer) {
                    this.game.selectedEntities = [entity];
                } else {
                    // 点击敌方实体也可以选中查看
                    this.game.selectedEntities = [entity];
                }
            }
        } else {
            // 点击空地 = 取消选择
            this.game.selectedEntities = [];
        }
    }

    _handleRightClick() {
        // 建造模式下右键 = 取消建造
        if (this.game.buildMode) {
            this.game.cancelBuild();
            return;
        }

        // 没有选中实体 = 无操作
        if (this.game.selectedEntities.length === 0) return;

        const hasPlayerUnit = this.game.selectedEntities.some(
            e => e instanceof Unit && e.isPlayer
        );

        if (!hasPlayerUnit) return;

        // 检查是否点击了敌方实体
        const clickedEntity = this.game.entityAt(this.mouseWorldX, this.mouseWorldY);
        if (clickedEntity && !clickedEntity.isPlayer) {
            // 攻击指令
            for (const ent of this.game.selectedEntities) {
                if (ent instanceof Unit && ent.isPlayer && ent.cfg.damage > 0) {
                    ent.commandAttack(clickedEntity);
                }
            }
        } else {
            // 移动指令
            for (const ent of this.game.selectedEntities) {
                if (ent instanceof Unit && ent.isPlayer) {
                    ent.commandMove(this.mouseWorldX, this.mouseWorldY);
                }
            }
        }
    }

    _finishDragSelect() {
        if (!this.game.selectionBox) return;
        const sb = this.game.selectionBox;
        const selected = this.game.entitiesInRect(sb.startX, sb.startY, sb.endX, sb.endY);

        // 只选择玩家自己的单位
        const playerUnits = selected.filter(e => e.isPlayer);
        if (playerUnits.length > 0) {
            this.game.selectedEntities = playerUnits;
        }
    }

    /** 键盘摄像机移动（每帧调用） */
    update(dt) {
        const cam = this.game.camera;
        const speed = this.scrollSpeed;
        if (this.keys['ArrowLeft'])  cam.x -= speed * dt;
        if (this.keys['ArrowRight']) cam.x += speed * dt;
        if (this.keys['ArrowUp'])    cam.y -= speed * dt;
        if (this.keys['ArrowDown'])  cam.y += speed * dt;
    }
}
