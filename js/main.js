/**
 * main.js — 游戏入口
 * ==================
 * 初始化所有系统，启动游戏主循环
 */

(function () {
    'use strict';

    const canvas = document.getElementById('game-canvas');
    if (!canvas) {
        alert('无法找到游戏画布！');
        return;
    }

    // 创建游戏实例
    const game = new Game(canvas);

    // 创建输入管理器
    const input = new InputManager(canvas, game);

    // 创建 UI 管理器
    const ui = new UIManager(game);

    // 初始化游戏
    game.init();

    // 暴露调试接口
    window.__game = game;
    window.__input = input;
    window.__ui = ui;

    // ── 主循环 ──
    function gameLoop(timestamp) {
        // 计算 delta time（秒）
        const dt = Math.min((timestamp - game.lastTime) / 1000, 0.1); // 上限 100ms 防止跳帧
        game.lastTime = timestamp;

        // 更新输入（键盘摄像机移动）
        input.update(dt);

        // 更新游戏逻辑
        game.update(dt);

        // 渲染
        game.render();

        // 更新 UI
        ui.update();

        requestAnimationFrame(gameLoop);
    }

    // 启动
    game.lastTime = performance.now();
    requestAnimationFrame(gameLoop);

    console.log('🚀 红色警戒2 网页版 已启动！');
    console.log('   💡 操作提示:');
    console.log('   - 左键选择  |  右键移动/攻击  |  滚轮缩放');
    console.log('   - 方向键移动视野  |  ESC取消选择  |  S键停止');
    console.log('   - 侧边栏建造建筑  |  选中工厂生产单位');
    console.log('   - 矿车自动采矿运回精炼厂');
    console.log('   - 游戏实例: window.__game');
})();
