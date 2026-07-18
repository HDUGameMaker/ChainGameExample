# ☭ 红色警戒2 网页版 (RA2 Web)

> 接龙开发示例项目 — 纯 HTML/CSS/JavaScript，零依赖，浏览器直接运行。

![tech](https://img.shields.io/badge/tech-Vanilla_JS_+_Canvas-yellow)
![deps](https://img.shields.io/badge/dependencies-0-green)

## 🚀 快速开始

**方法一（最简单）**：直接双击 `index.html` 用浏览器打开。

**方法二（推荐）**：用本地服务器运行（后续加载图片资源时必需）：

```bash
# 任选其一
python -m http.server 8000        # Python
npx http-server -p 8000           # Node.js
# 或用 VS Code 的 Live Server 插件右键 index.html → Open with Live Server
```

然后访问 http://localhost:8000

## 🎮 玩法

- 你（蓝方）在地图左侧，敌人（红方）在右侧
- 建造顺序：**发电厂 → 矿石精炼厂（赠送矿车）→ 战车工厂 → 生产坦克**
- 矿车自动采矿赚钱，坦克右键攻击敌人
- 电力不足时建造/生产速度降至 30%

| 操作 | 效果 |
|------|------|
| 左键点击 | 选中单位/建筑 |
| 左键拖拽 | 框选单位 |
| Shift+左键 | 追加/移除选择 |
| 右键空地 | 移动 |
| 右键敌方 | 攻击 |
| 侧边栏按钮 | 建造建筑 / 生产单位 |
| 建造预览时左键 | 放置建筑（右键取消） |
| 滚轮 | 缩放 |
| 方向键 / 鼠标靠边 | 移动视野 |
| S | 停止 |
| ESC | 取消选择/建造 |

## 📁 项目结构与分工

```
littleHtml/
├── index.html          # 入口页面（很少需要改动）
├── css/style.css       # 🎨 美术：UI主题色在 :root 变量中
├── js/
│   ├── config.js       # 📋 策划：所有数值都在这里！
│   ├── map.js          # 地图/矿石系统
│   ├── entities.js     # 建筑/单位类与AI行为
│   ├── engine.js       # 主循环/摄像机/渲染器/游戏状态
│   ├── input.js        # 鼠标键盘输入
│   ├── ui.js           # 侧边栏/顶栏UI
│   └── main.js         # 入口（初始化+主循环启动）
├── assets/sprites/     # 🎨 美术：精灵图放这里（待接入）
└── DESIGN.md           # 设计文档
```

### 各角色如何参与

- **📋 策划**：只改 `js/config.js`。价格、血量、攻击力、建造时间、科技树前置（`BUILD_PREREQS`）全在里面，改数字保存刷新浏览器即可看到效果。
- **🎨 美术**：
  - 改配色：`js/config.js` 的 `COLORS` + `css/style.css` 的 `:root` 变量
  - 加精灵图：把 PNG 放进 `assets/sprites/`，然后在 `engine.js` 的 `_drawBuilding`/`_drawUnit` 中替换几何绘制为 `ctx.drawImage()`（可以找程序员配合）
- **🧑‍💻 程序员**：
  - 新单位/建筑：先在 `config.js` 加条目，再看 `entities.js` 是否需要新行为
  - 新系统（寻路、迷雾、AI）：新建独立 js 文件，在 `index.html` 中按依赖顺序引入
  - 调试：浏览器控制台输入 `__game` 可直接访问游戏实例（如 `__game.credits = 99999`）

## 🔀 Git 协作约定

1. **不要直接提交到 main**，每人开自己的分支：`feat/寻路`、`art/坦克贴图`、`balance/坦克数值`
2. 提交信息格式：`[类型] 简述`，如 `[策划] 上调坦克价格至800`
3. `config.js` 是最常被多人修改的文件——每人只改自己负责的条目，几乎不会冲突
4. 图片等二进制文件用**新增文件**而非覆盖，避免二进制冲突
5. 合并前先在本地打开 `index.html` 确认游戏能跑

## 🛠️ 环境要求

| 角色 | 必需 | 可选 |
|------|------|------|
| 所有人 | 现代浏览器 (Chrome/Edge/Firefox) | — |
| 程序/策划 | 文本编辑器 (VS Code 推荐) | Live Server 插件 |
| 参与协作 | Git | GitHub Desktop |

**没有构建步骤、没有 npm install、没有编译** —— 改完刷新浏览器就能看到结果。

## 🗺️ 待认领的接龙任务（示例）

- [ ] 单位寻路（目前是直线移动，会穿过建筑）
- [ ] 战争迷雾
- [ ] 敌方 AI（自动造兵、进攻）
- [ ] 小地图
- [ ] 精灵图美术替换几何图形
- [ ] 音效
- [ ] 更多单位（步兵、防空、基地车）
- [ ] 胜负判定画面
- [ ] 存档/读档 (localStorage)
