/**
 * platform/web/ball-resize.js — 球号动态自适应
 * 职责：根据容器实际宽度，实时计算球号/生肖/分隔符的尺寸，写入 CSS 变量
 * 禁止：业务计算、视图渲染
 *
 * 工作原理：
 *   - 监听 .latest-card .ball-group 与 .history-item .ball-group 的尺寸变化
 *   - 用 ResizeObserver（高性能、自动节流）
 *   - 写入 CSS 变量：--ball-size / --ball-font / --ball-sep-size / ...
 *   - 7 球 1 行强制完整显示，球号会"动态缩小"自动填充
 */

// 球参数配置（按容器类型分组）
const BALL_CONFIG = {
  latest: {
    // 最新开奖：大球
    minSize: 22,         // 最小尺寸
    maxSize: 44,         // 最大尺寸
    ratio: 0.105,        // 球尺寸 / 容器宽度的比例
    gapRatio: 0.005,     // 间距比例
    fontRatio: 0.42,     // 字号 / 球尺寸
    zodFontRatio: 0.32,  // 生肖字号 / 球尺寸
    sepRatio: 0.55,      // 分隔符 / 球尺寸
    sepMtRatio: 0.32     // 分隔符上间距 / 球尺寸
  },
  history: {
    // 历史记录：稍小
    minSize: 18,
    maxSize: 38,
    ratio: 0.095,
    gapRatio: 0.005,
    fontRatio: 0.42,
    zodFontRatio: 0.32,
    sepRatio: 0.55,
    sepMtRatio: 0.32
  }
};

/**
 * 计算球的最佳尺寸
 * @param {HTMLElement} container
 * @param {Object} cfg
 * @returns {Object} 尺寸参数
 */
function calcBallSize(container, cfg) {
  // 容器可用宽度（减去 padding）
  const rect = container.getBoundingClientRect();
  const containerWidth = rect.width;
  if (containerWidth <= 0) return null;

  // 7 球 + 6 间隔 + 1 分隔符
  // 球数 = 7，分隔符数 = 1（不占整段），总间隙 = 7 段
  const SEGMENT_COUNT = 7;  // 7 个 ball-item
  const gap = containerWidth * cfg.gapRatio;

  // 反推：每个 ball-item 宽度 = (容器宽 - 总间隙) / 7
  const segmentWidth = (containerWidth - gap * (SEGMENT_COUNT + 1)) / SEGMENT_COUNT;

  // 球的实际尺寸 = 段宽（球占满整段）
  let size = segmentWidth;

  // 限制在 [minSize, maxSize]
  size = Math.max(cfg.minSize, Math.min(cfg.maxSize, size));

  // 派生尺寸
  const fontSize = size * cfg.fontRatio;
  const zodFontSize = size * cfg.zodFontRatio;
  const sepSize = size * cfg.sepRatio;
  const sepMt = size * cfg.sepMtRatio;

  return {
    size: Math.floor(size),
    font: Math.floor(fontSize),
    zodFont: Math.floor(zodFontSize),
    sepSize: Math.floor(sepSize),
    sepMt: Math.floor(sepMt)
  };
}

/**
 * 应用尺寸到元素
 * @param {HTMLElement} el
 * @param {Object} dims
 * @param {string} prefix - CSS 变量前缀
 */
function applyDims(el, dims, prefix) {
  if (!dims) return;
  el.style.setProperty(`--${prefix}-ball-size`, `${dims.size}px`);
  el.style.setProperty(`--${prefix}-ball-font`, `${dims.font}px`);
  el.style.setProperty(`--${prefix}-ball-zod-font`, `${dims.zodFont}px`);
  el.style.setProperty(`--${prefix}-ball-sep-size`, `${dims.sepSize}px`);
  el.style.setProperty(`--${prefix}-ball-sep-mt`, `${dims.sepMt}px`);
}

/**
 * 计算并应用最新开奖球尺寸
 */
function resizeLatest() {
  const group = document.querySelector('.latest-card .ball-group');
  if (!group) return;
  const dims = calcBallSize(group, BALL_CONFIG.latest);
  applyDims(group, dims, 'ball');
}

/**
 * 计算并应用所有历史记录球尺寸
 */
function resizeHistoryAll() {
  const groups = document.querySelectorAll('.history-item .ball-group');
  groups.forEach(group => {
    // 优先使用该 ball-item 父容器的宽度（避免每个球尺寸略有差异）
    const parent = group.closest('.history-item') || group.parentElement;
    if (parent) {
      const dims = calcBallSize(group, BALL_CONFIG.history);
      applyDims(group, dims, 'h-ball');
    }
  });
}

/**
 * 单次完整调整
 */
function resizeAll() {
  resizeLatest();
  resizeHistoryAll();
}

// ===================== ResizeObserver（核心：实时跟随）=====================

let observer = null;

/**
 * 启动 ResizeObserver
 * 监听：
 *   1. 整个 body（屏幕旋转、窗口缩放）
 *   2. 任何 .latest-card .ball-group
 *   3. 任何 .history-item
 */
function startBallResizeObserver() {
  // 首次立即计算
  resizeAll();

  // 监听所有相关容器
  observer = new ResizeObserver(entries => {
    // 节流：合并同一帧的多次触发
    requestAnimationFrame(() => {
      resizeAll();
    });
  });

  // 观察 latest + history
  const latestGroup = document.querySelector('.latest-card .ball-group');
  if (latestGroup) observer.observe(latestGroup);

  const historyItems = document.querySelectorAll('.history-item');
  historyItems.forEach(item => observer.observe(item));

  // 兜底：观察 body（处理窗口整体变化）
  if (document.body) observer.observe(document.body);
}

/**
 * 重新初始化（DOM 重建后调用，例如"加载更多"后）
 */
function refreshBallResize() {
  // 关闭旧 observer
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  // 重新启动
  startBallResizeObserver();
}

/**
 * 暴露给视图层调用
 */
window.refreshBallResize = refreshBallResize;