/**
 * event.js — 事件层（唯一事件中心）
 * 职责：使用 data-action 统一事件委托
 * 禁止：任何渲染代码、业务计算
 * 依赖：core/state.js, platform/web/dom.js
 */

/**
 * 切换详情面板展开/收起
 */
function toggleDetail(id) {
  const el = $(id);
  if (!el) return;
  const btn = el.previousElementSibling.querySelector('.toggle-btn');
  const isOpen = el.style.display === 'block';
  el.style.display = isOpen ? 'none' : 'block';
  if (btn) btn.textContent = isOpen ? '展开详情' : '收起详情';
}

/**
 * 切换 Tab 面板
 */
function switchTab(tabId, panelId) {
  setActiveClass(['tabHistory', 'tabAnalysis', 'tabZodiac'], tabId);
  setActiveClass(['historyPanel', 'analysisPanel', 'zodiacAnalysisPanel'], panelId);
}

/**
 * 同步全维度分析参数
 */
function syncAnalyze() {
  const custom = $('customNum').value.trim();
  const selectVal = $('analyzeSelect').value;
  const limit = custom && !isNaN(custom) && custom > 0
    ? Number(custom)
    : selectVal === 'all' ? getState('historyData').length : Number(selectVal);

  setState('analyzeLimit', limit);
  $('zodiacAnalyzeSelect').value = selectVal;
  $('zodiacCustomNum').value = custom;

  // 通知 app 重新渲染
  window.dispatchEvent(new CustomEvent('app:rerender-analysis'));
}

/**
 * 同步生肖关联参数（期数 + 号码数量）
 */
function syncZodiacAnalyze() {
  // 期数
  const customPeriod = $('zodiacCustomNum').value.trim();
  const selectPeriodVal = $('zodiacAnalyzeSelect').value;
  const limit = customPeriod && !isNaN(customPeriod) && customPeriod > 0
    ? Number(customPeriod)
    : selectPeriodVal === 'all' ? getState('historyData').length : Number(selectPeriodVal);

  setState('analyzeLimit', limit);
  $('analyzeSelect').value = selectPeriodVal;
  $('customNum').value = customPeriod;

  // 数量
  const countVal = $('numCountSelect').value;
  const customCount = $('customNumCount').value.trim();
  let finalCount = 5;
  if (countVal === 'custom') {
    finalCount = customCount && !isNaN(customCount) && Number(customCount) >= 1 && Number(customCount) <= 49
      ? Number(customCount)
      : 5;
  } else {
    finalCount = Number(countVal);
  }
  setState('selectedNumCount', finalCount);

  // 通知 app 重新渲染
  window.dispatchEvent(new CustomEvent('app:rerender-zodiac'));
}

/**
 * 号码数量选择器变化（非自定义时实时生效）
 */
function onNumCountChange() {
  const isCustom = $('numCountSelect').value === 'custom';
  setDisplay('customNumCount', isCustom ? 'inline-block' : 'none');
  if (!isCustom) {
    setState('selectedNumCount', Number($('numCountSelect').value));
    window.dispatchEvent(new CustomEvent('app:rerender-zodiac'));
  }
}

/**
 * 自定义数量输入实时同步
 */
function onCustomCountInput() {
  const val = $('customNumCount').value.trim();
  if (val && !isNaN(val) && Number(val) >= 1 && Number(val) <= 49) {
    setState('selectedNumCount', Number(val));
    window.dispatchEvent(new CustomEvent('app:rerender-zodiac'));
  }
}

/**
 * 加载更多历史
 * 智能判断：
 *  - 本地还有更多 → 增量 +30
 *  - 本地用完 → 从 API 拉取上一年数据
 */
function onLoadMore() {
  const showCount = getState('showCount');
  const historyData = getState('historyData') || [];

  if (historyData.length > showCount) {
    // 本地还有 → 直接增加显示条数
    const newCount = showCount + 30;
    setState('showCount', newCount);
    window.dispatchEvent(new CustomEvent('app:rerender-history', { detail: { showCount: newCount } }));
  } else {
    // 本地用完 → 派发"加载更多年份"事件
    window.dispatchEvent(new CustomEvent('app:load-more-years'));
  }
}

/**
 * 切换到历史 Tab
 */
function onTabHistory() {
  switchTab('tabHistory', 'historyPanel');
}

/**
 * 切换到分析 Tab
 */
function onTabAnalysis() {
  switchTab('tabAnalysis', 'analysisPanel');
  window.dispatchEvent(new CustomEvent('app:rerender-analysis'));
}

/**
 * 切换到生肖 Tab
 */
function onTabZodiac() {
  switchTab('tabZodiac', 'zodiacAnalysisPanel');
  window.dispatchEvent(new CustomEvent('app:rerender-zodiac'));
}

/**
 * 刷新历史（强制刷新缓存）
 */
function onRefreshHistory() {
  window.dispatchEvent(new CustomEvent('app:refresh-history', { detail: { force: true } }));
}

/**
 * 事件委托主入口（统一监听 data-action）
 */
function bindEvents() {
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');

    switch (action) {
      case 'tab-history': onTabHistory(); break;
      case 'tab-analysis': onTabAnalysis(); break;
      case 'tab-zodiac': onTabZodiac(); break;
      case 'refresh-history': onRefreshHistory(); break;
      case 'sync-analyze': syncAnalyze(); break;
      case 'sync-zodiac': syncZodiacAnalyze(); break;
      case 'toggle-detail': toggleDetail(target.getAttribute('data-target')); break;
      case 'load-more': onLoadMore(); break;
    }
  });

  // 数字选择器
  $('numCountSelect').addEventListener('change', onNumCountChange);
  $('customNumCount').addEventListener('input', onCustomCountInput);
}