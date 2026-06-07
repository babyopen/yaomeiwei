/**
 * app.js — 入口层
 * 职责：初始化应用、注册路由、启动定时器
 * 禁止：业务逻辑、DOM 操作（除启动外）
 * 依赖：core/state.js, data/data-query.js, views/*, event.js
 */

// ===================== 关键时间点（开奖后 3 次静默拉取）=====================
// 每天 21:32:32 开奖，分别在 21:33 / 21:35 / 21:40 静默拉取最新数据
const SILENT_FETCH_TIMES = [
  { h: 21, m: 33 },
  { h: 21, m: 35 },
  { h: 21, m: 40 }
];

/**
 * 是否处于开奖时间段（21:32 - 21:40）
 */
function isInDrawTime() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  return h === 21 && m >= 32 && m <= 40;
}

/**
 * 拉取并刷新全部视图（带 loading + 强制参数）
 * @param {boolean} forceRefresh - 强制刷新（跳过缓存）
 */
async function refreshHistory(forceRefresh = false) {
  $('historyList').innerHTML = '<div style="padding:20px;text-align:center;">加载中...</div>';
  try {
    const result = await queryHistoryData({ forceRefresh, year: YEAR });
    const sortedData = result.data;
    setState('historyData', sortedData);

    if (sortedData.length > 0) {
      renderLatest(sortedData[0]);
    }
    renderHistory(sortedData, getState('showCount'));
    renderFullAnalysis(sortedData, getState('analyzeLimit'));
    renderZodiacAnalysis(sortedData, getState('analyzeLimit'), getState('selectedNumCount'));
    renderLoadMoreBtn(sortedData, getState('showCount'));

    // DOM 重建后重新计算球号尺寸
    if (typeof refreshBallResize === 'function') {
      requestAnimationFrame(refreshBallResize);
    }

    // 缓存命中提示
    if (result.fromCache) {
      const status = getHistoryCacheStatus();
      const minutes = Math.floor(status.age / 60000);
      console.log(`[Cache] 命中本地缓存（${status.count}条，${minutes}分钟前）`);
    } else {
      console.log(`[Cache] 已从 API 拉取并写入缓存（${sortedData.length}条）`);
    }
  } catch (e) {
    $('historyList').innerHTML = '<div style="padding:20px;text-align:center;color:#d32f2f;">数据加载失败，请刷新重试</div>';
    showToast('数据加载失败：' + e.message, 'error');
  }
}

/**
 * 静默拉取（无 loading、不刷视图，仅在有新数据时更新）
 * @returns {Promise<boolean>} 是否有更新
 */
async function silentUpdate() {
  try {
    const result = await silentFetchUpdate();

    if (result.updated) {
      console.log(`[SilentUpdate] 发现 ${result.newCount} 条新数据，正在更新...`);

      // 重新加载 state + 视图（无 loading 闪烁）
      const status = getHistoryCacheStatus();
      const cached = readHistoryCache();
      if (cached) {
        setState('historyData', cached.data);
        if (cached.data.length > 0) {
          renderLatest(cached.data[0]);
        }
        renderHistory(cached.data, getState('showCount'));
        renderFullAnalysis(cached.data, getState('analyzeLimit'));
        renderZodiacAnalysis(cached.data, getState('analyzeLimit'), getState('selectedNumCount'));
        renderLoadMoreBtn(cached.data, getState('showCount'));
      }

      // 重新计算球号尺寸
      if (typeof refreshBallResize === 'function') {
        requestAnimationFrame(refreshBallResize);
      }

      showToast(`🎉 已更新 ${result.newCount} 条新数据（${status.count}期）`, 'success');
      return true;
    } else if (result.error) {
      // 拉取失败（静默）
      console.warn(`[SilentUpdate] ${result.error}，使用本地数据`);
    } else {
      console.log('[SilentUpdate] 暂无新数据');
    }
    return false;
  } catch (e) {
    console.error('[SilentUpdate] 异常：', e);
    return false;
  }
}

// ===================== 关键点定时器（每天 21:33/35/40）=====================

let silentFetchTriggered = {}; // { '21-33': true } 防重复触发

/**
 * 关键点定时器（每分钟检查一次）
 * - 在 SILENT_FETCH_TIMES 的整点触发 silentUpdate
 * - 同一天同一时间点只触发一次
 */
function startSilentFetchScheduler() {
  // 每天 0 点重置触发记录
  function resetTrigger() {
    const today = new Date().toDateString();
    if (getState('lastResetDate') !== today) {
      silentFetchTriggered = {};
      setState('lastResetDate', today);
    }
  }

  setInterval(() => {
    resetTrigger();
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const key = `${h}-${m}`;

    // 命中关键点 + 今天没触发过
    const isKeyTime = SILENT_FETCH_TIMES.some(t => t.h === h && t.m === m);
    if (isKeyTime && !silentFetchTriggered[key]) {
      silentFetchTriggered[key] = true;
      console.log(`[Scheduler] 命中关键点 ${h}:${m}，开始静默拉取`);
      silentUpdate();
    }
  }, 60 * 1000); // 每分钟检查一次
}

// ===================== 兼容旧版：开奖时段密集刷新（保留但弱化）=====================

/**
 * 启动开奖时段刷新（每 20 秒检查一次）
 * 仅用于开奖瞬间（21:32:32 前后）极短窗口，保证最新一期即时出现
 */
function startAutoRefresh() {
  if (getState('autoRefreshTimer')) clearInterval(getState('autoRefreshTimer'));
  const timer = setInterval(() => {
    if (isInDrawTime()) {
      silentUpdate();
    } else {
      clearInterval(timer);
      setState('autoRefreshTimer', null);
    }
  }, 20000);
  setState('autoRefreshTimer', timer);
}

/**
 * 检测是否进入开奖时段
 */
function checkDrawTimeLoop() {
  setInterval(() => {
    if (isInDrawTime() && !getState('autoRefreshTimer')) {
      startAutoRefresh();
    }
  }, 60000);
}

// ===================== 事件监听 =====================

/**
 * 监听自定义事件（event.js 派发）
 */
function bindAppEvents() {
  window.addEventListener('app:refresh-history', e => {
    const force = !!(e.detail && e.detail.force);
    refreshHistory(force);
  });
  window.addEventListener('app:rerender-analysis', () => {
    renderFullAnalysis(getState('historyData'), getState('analyzeLimit'));
  });
  window.addEventListener('app:rerender-zodiac', () => {
    renderZodiacAnalysis(
      getState('historyData'),
      getState('analyzeLimit'),
      getState('selectedNumCount')
    );
  });
  window.addEventListener('app:rerender-history', e => {
    const showCount = e.detail && e.detail.showCount ? e.detail.showCount : getState('showCount');
    renderHistory(getState('historyData'), showCount);
    renderLoadMoreBtn(getState('historyData'), showCount);
  });

  // 加载更多年份（本地用完时触发）
  window.addEventListener('app:load-more-years', loadMoreYears);
}

/**
 * 加载更多年份
 * 策略：
 *  1. 计算要拉取的年份（从本地最早期数推断）
 *  2. 调 fetchMoreHistoryData
 *  3. 合并到主缓存 + state
 *  4. 重新渲染历史 + 各项分析
 */
async function loadMoreYears() {
  setLoadMoreLoading(true);

  try {
    // 1. 计算目标年份 = 本地最早期数所在年份 - 1
    const historyData = getState('historyData') || [];
    let targetYear;

    if (historyData.length > 0) {
      const lastItem = historyData[historyData.length - 1];
      const lastExpect = String(getVal(lastItem, 'expect', ''));
      const lastYear = parseInt(lastExpect.slice(0, 4), 10);
      targetYear = isNaN(lastYear) ? (YEAR - 1) : (lastYear - 1);
    } else {
      targetYear = YEAR - 1;
    }

    if (targetYear < 2000) {
      showToast('已加载到最早年份（2000 年）', 'info');
      return;
    }

    // 2. 拉取
    console.log(`[LoadMore] 正在拉取 ${targetYear} 年数据...`);
    const result = await fetchMoreHistoryData(targetYear);

    if (result.count === 0) {
      showToast(`${targetYear} 年暂无数据`, 'info');
      return;
    }

    // 3. 合并到主缓存
    const merged = appendMoreToCache(result.data);

    // 4. 更新 state
    const updated = readHistoryCache();
    if (updated) {
      setState('historyData', updated.data);
    }

    // 5. 重新渲染历史（自动显示新加载的 +30 条）
    const newShowCount = getState('showCount') + 30;
    setState('showCount', newShowCount);
    renderHistory(updated.data, newShowCount);
    renderLoadMoreBtn(updated.data, newShowCount);

    // 6. 重新计算分析（数据量变了）
    renderFullAnalysis(updated.data, getState('analyzeLimit'));
    renderZodiacAnalysis(updated.data, getState('analyzeLimit'), getState('selectedNumCount'));

    // 7. 重新计算球号尺寸（新 DOM）
    if (typeof refreshBallResize === 'function') {
      requestAnimationFrame(refreshBallResize);
    }

    // 8. 提示
    const fromTxt = result.fromCache ? '（本地）' : '（API）';
    showToast(
      `📥 已加载 ${targetYear} 年 ${result.count} 期${fromTxt}，共 ${merged.total} 期`,
      'success'
    );
    console.log(`[LoadMore] 完成：新增 ${merged.added} 期，跨年 ${merged.years.join('/')}`);
  } catch (e) {
    console.error('[LoadMore] 失败：', e);
    showToast('加载更多失败：' + e.message, 'error');
  } finally {
    setLoadMoreLoading(false);
  }
}

// ===================== 初始化 =====================

/**
 * 初始化入口
 */
function initApp() {
  bindEvents();                  // event.js 事件委托
  bindAppEvents();               // 监听 app 自定义事件
  startCountdown();              // 倒计时
  refreshHistory();              // 首次加载（优先读缓存）
  startSilentFetchScheduler();   // 关键点定时器（21:33/35/40）
  checkDrawTimeLoop();           // 开奖时段自动刷新
  if (isInDrawTime()) startAutoRefresh();

  // 启动球号动态自适应监听
  if (typeof startBallResizeObserver === 'function') {
    // DOMContentLoaded 之后可能球还没渲染，延迟一帧确保 DOM 完整
    requestAnimationFrame(() => {
      startBallResizeObserver();
    });
  }
}

window.addEventListener('DOMContentLoaded', initApp);