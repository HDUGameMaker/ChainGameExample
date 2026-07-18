# 🎮 红色警戒2 网页版 — 接龙开发示例项目

## 技术选型

| 维度 | 选择 | 理由 |
|------|------|------|
| **语言** | HTML5 + CSS3 + Vanilla JavaScript (ES6+) | 零依赖、零构建工具，浏览器即运行 |
| **渲染** | Canvas 2D API | 2D RTS 的最佳选择，性能足够，简单直观 |
| **架构** | 单页应用 (SPA)，面向对象的模块化 JS | 每个文件一个职责，新人容易定位 |
| **图形** | 纯代码绘制的几何图形 + 颜色块 | 先让游戏跑起来，后续美术可直接替换为精灵图 |

## 项目文件结构

```
littleHtml/
├── index.html          # 入口页面，Canvas画布 + UI面板DOM
├── css/
│   └── style.css       # 侧边栏、顶栏、按钮样式
├── js/
│   ├── config.js       # 🎨 策划配置表：建筑/单位的属性、价格、科技树
│   ├── engine.js       # 🔧 游戏引擎核心：主循环、渲染器、摄像机
│   ├── map.js          # 🗺️ 地图系统：网格、矿石分布
│   ├── entities.js     # 🧱 实体类：建筑、单位、矿石字段
│   ├── input.js        # 🖱️ 输入系统：框选、右键指令、点击建造
│   ├── ui.js           # 🖼️ UI管理器：侧边栏建造面板、资源显示、小地图
│   └── main.js         # 🚀 入口：初始化所有系统，启动游戏
├── assets/
│   └── sprites/        # 🎨 美术精灵图目录（后续替换用）
└── README.md           # 📖 项目文档 + 参与指南
```

## 各类角色如何参与开发

### 🧑‍💻 程序员
- 修改 `js/` 目录下的任意文件即可
- **config.js** 是数据驱动的核心，新增单位/建筑只需加一条配置
- 使用 VS Code + Live Server 插件即可实时预览

### 🎨 美术
- 只需关注 `assets/sprites/` 目录
- 按照 `config.js` 中定义的尺寸放入 PNG 图片
- 修改 `css/style.css` 中的颜色变量改变 UI 主题
- **不需要安装任何开发工具**，只需要图片编辑软件

### 📋 策划
- **只需编辑 `js/config.js`** 一个文件！
- 修改建筑价格、单位属性、生产时间等数值
- 调整科技树依赖关系
- 不需要懂编程，照猫画虎改数字即可

```javascript
// 策划友好的配置示例（config.js）
const BUILDINGS = {
    power_plant: {
        name: '发电厂',
        cost: 300,        // ← 改这里调价格
        power: 100,       // ← 改这里调电力
        hp: 400,
        buildTime: 5000,  // ← 建造时间(毫秒)
        size: [2, 2],     // ← 占地面积(格)
    },
    // ...
};
```

## Git 适配性

| 特性 | 评分 | 说明 |
|------|------|------|
| **文本文件占比** | ⭐⭐⭐⭐⭐ | 100% 代码是文本文件，diff 清晰 |
| **二进制冲突** | ⭐⭐⭐⭐⭐ | 精灵图用独立文件名，不会冲突 |
| **策划数值合并** | ⭐⭐⭐⭐⭐ | config.js 各行独立，几乎不会冲突 |
| **并行开发** | ⭐⭐⭐⭐☆ | 程序员写 js/，美术放 assets/，策划改 config.js |

**结论：极其适合 Git 协作**，不存在 Unity 那种场景文件冲突的痛点。

## 生产环境需求

| 需求 | 说明 |
|------|------|
| **浏览器** | 任意现代浏览器（Chrome / Edge / Firefox） |
| **文本编辑器** | VS Code（推荐） / Notepad++ / 甚至记事本 |
| **本地服务器** | 任选其一：VS Code Live Server 插件 / `python -m http.server` / Node.js http-server |
| **Git（可选）** | 参与代码协作才需要安装 Git + GitHub Desktop |
| **Node.js（可选）** | 只有想加构建工具链时才需要 |

**最低配置：一个浏览器 + 一个文本编辑器**，真正零门槛。

## MVP 功能清单

1. ✅ 绿色平坦地图 + 网格系统 + 摄像机滚动
2. ✅ **基地（建造场）**：展开的 MCV，所有建筑的起点
3. ✅ **发电厂**：提供电力，电力不足时建造/生产减速
4. ✅ **矿石精炼厂**：矿车卸货点，提供收入
5. ✅ **战车工厂**：生产坦克
6. ✅ **矿车**：AI 自动采矿→运回精炼厂→循环
7. ✅ **坦克**：可选中，右键移动/攻击
8. ✅ **矿石**：散落在地图上，可被采集
9. ✅ 左键选择/框选，右键下达指令
10. ✅ 简易战斗系统（HP + 攻击力）

## 操作说明

| 操作 | 效果 |
|------|------|
| 左键点击己方单位/建筑 | 选中 |
| 左键拖拽 | 框选单位 |
| 右键点击空地 | 选中单位移动 |
| 右键点击敌方 | 选中单位攻击 |
| 点击侧边栏建筑图标 | 进入建造预览模式 |
| 建造预览时左键点击地图 | 放置建筑 |
| 建造预览时右键 | 取消建造 |
| 滚轮 | 缩放视野 |
| 方向键 / 鼠标靠边 | 移动摄像机 |
| 选中建筑后点击生产图标 | 生产单位 |

---

## 代码架构详解

### 文件依赖关系

```
config.js  ←── 所有文件的"数据字典"
   ↓
map.js     ←── 地形、矿石、占地查询
entities.js ←── 建筑/单位/矿石类 + 采矿状态机 + 战斗逻辑
engine.js  ←── Camera(视口) + Renderer(Canvas绘图) + Game(主循环/状态/AI)
   ↓
input.js   ←── 鼠标框选/右键指令/键盘摄像机
ui.js      ←── 侧边栏建造面板/生产面板/顶部资源栏
   ↓
main.js    ←── 入口：new Game() → new InputManager() → new UIManager() → requestAnimationFrame
```

### 数据流：一帧的生命周期

```
requestAnimationFrame(timestamp)
  → dt = (timestamp - lastTime) / 1000    // 帧间隔(秒)
  → input.update(dt)                      // 键盘移动摄像机
  → game.update(dt)                       // 核心逻辑
      → building.update(dt, game) ×N      //   建造进度 / 单位生产队列
      → unit.update(dt, game) ×N          //   移动 / 采矿状态机 / 战斗 / 自动索敌
      → _cleanupDead()                    //   移除 hp≤0 的实体
      → _updateAI(dt)                     //   敌方：定时生产坦克 + 进攻指令
      → recalculatePower()                //   电力：低电力时建造/生产速度×0.3
      → camera.clamp()                    //   摄像机不超出地图边界
  → renderer.render(game)                 // Canvas 绘制（地形→矿石→建筑→单位→UI标记）
  → ui.update()                           // DOM 更新（顶部栏金钱/电力、侧边栏面板）
```

### 核心类说明

#### `Camera`（engine.js）
- `screenToWorld(sx, sy)` — 鼠标屏幕坐标 → 游戏世界坐标
- `worldToScreen(wx, wy)` — 反向映射（绘制用）
- `zoomAt(sx, sy, delta)` — 以鼠标位置为中心缩放
- `clamp()` — 限制视口不超出地图

#### `Renderer`（engine.js）
- `_drawTerrain()` — 只绘制可见区域的瓦片（视口裁剪优化）
- `_drawBuilding()` — 区分建造中（灰色+进度条）和已完成（彩色+符号）
- `_drawUnit()` — 坦克：车身 `facingAngle` + 炮塔 `turretAngle` 双旋转；矿车：铲斗+货箱指示
- `_drawBuildPreview()` — 绿色=可放置，红色=占位/超范围
- `_drawCommandMarker()` — 移动=绿色X，攻击=红色X+虚线

#### `Game`（engine.js）
- `startBuildMode(typeId)` — 检查资金+前置建筑+**单线程**（`isAnyBuilding`）
- `confirmBuild()` — 检查占用+**建造范围**（`isInBuildRange`，切比雪夫距离≤`BUILD_RANGE`）
- `produceUnit(typeId)` — 从选中建筑的生产队列中扣钱排队
- `findNearestEnemy(unit, maxRange)` — 搜索敌方单位+建筑
- `_updateAI(dt)` — 敌方 AI：独立经济（`aiCredits` + 每秒 `aiIncomeRate`）→ 战车工厂每 8 秒排队一辆坦克 → 空闲坦克向玩家基地进攻

#### `Building`（entities.js）
- `buildProgress` 0→1：建造动画（`isBuilding=true` 期间不允许开新建筑）
- `productionQueue[]`：单位生产队列（先入先出，完成时 `spawnUnit`）
- `update()` 中的特殊逻辑：精炼厂建造完成时自动 `spawnUnit('harvester')`

#### `Unit`（entities.js）
- 采矿状态机（仅矿车）：`idle → finding → movingToOre → harvesting → returning → unloading → finding → ...`
- 战斗逻辑：有攻击目标→移动到射程内→射击（冷却）；无目标→自动索敌（扫描 `attackRange * 1.5` 范围内的敌人）
- `turretAngle`：每次 `_updateCombatUnit` 计算 `atan2(-dy, -dx)` 使炮塔指向目标

#### `InputManager`（input.js）
- 左键单击 → `entityAt()` 选单位/建筑；Shift+单击 = 追加选择
- 左键拖拽 → 框选（`entitiesInRect`，只选己方）
- 右键 → 点击敌方=攻击指令，点击空地=移动指令
- 建造模式：左键地图=确认放置，右键/ESC=取消
- `mousedown` 代替 `click`（因为 UI 每帧用 `innerHTML` 重建 DOM，`click` 要求 mousedown+ mouseup 在同一元素上）

#### `UIManager`（ui.js）
- HTML 字符串缓存（`_lastHTML`）：内容不变时跳过 DOM 写入，避免按钮闪烁
- 进度百分比取整到 5%：减少无意义的 DOM 更新频率
- `_renderBuildPanel()`：按钮变灰时显示原因（资金不足 / 等待施工完成 / 需要前置建筑）

### 关键数值（`config.js`，策划专改）

| 常量 | 默认值 | 作用 |
|------|--------|------|
| `TILE_SIZE` | 64 | 每格像素 |
| `MAP_COLS/ROWS` | 50×35 | 地图尺寸 |
| `ECONOMY.startingCredits` | 10000 | 玩家初始资金 |
| `ECONOMY.lowPowerSpeed` | 0.3 | 电力不足时效率 |
| `BUILD_RANGE` | 10 | 建造范围（格） |
| `BUILDINGS.*.cost/buildTime/hp` | — | 建筑属性 |
| `UNITS.*.cost/speed/damage/attackRange` | — | 单位属性 |
| `BUILD_PREREQS` | — | 科技树前置依赖 |

### 敌方 AI 设计

```
_updateAI(dt) 每帧调用：
  1. aiCredits += aiIncomeRate × dt          // 敌方持续收入
  2. 每 aiProdCooldown(8s) 检查一次：
     if 战车工厂存在 && 完整 && 队列<3 && aiCredits≥坦克价格:
       扣钱 → 排队生产一辆坦克
  3. 所有空闲的敌方坦克(commandMove) → 向玩家基地进攻（随机散布 ±5 格）
  4. 敌方坦克移动途中自动索敌（entities.js），发现玩家目标立即切换为攻击模式
```

AI 资金与玩家独立，确保敌方即使没有矿车也能持续生产。

