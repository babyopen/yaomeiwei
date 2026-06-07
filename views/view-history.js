/**
 * views/view-history.js — 视图层：历史记录
 * 职责：渲染历史开奖列表
 * 禁止：业务计算
 * 依赖：core/utils.js, platform/web/dom.js, platform/web/render.js, business/business-special.js
 */

/**
 * 渲染历史记录列表
 * @param {Array} historyData - 完整历史数据
 * @param {number} showCount - 显示条数
 */
function renderHistory(historyData, showCount) {
  const list = historyData.slice(0, showCount);
  if (!list.length) {
    setHTML('historyList', '<div style="padding:20px;text-align:center;">暂无历史数据</div>');
    return;
  }

  const html = list.map(item => {
    const codeArr = getVal(item, 'openCode', '0,0,0,0,0,0,0').split(',');
    const waveArr = getVal(item, 'wave', 'red,red,red,red,red,red,red').split(',');
    const special = parseSpecialInfo(item);
    const zodArr = special.fullZodArr;

    let balls = '';
    for (let i = 0; i < 6; i++) {
      balls += buildBallHTML(codeArr[i], waveArr[i], zodArr[i], 32, 15);
    }
    balls += '<div class="ball-sep">+</div>' + buildBallHTML(codeArr[6], waveArr[6], zodArr[6], 32, 15);

    return `
      <div class="history-item">
        <div class="history-expect">第${getVal(item, 'expect', '')}期</div>
        <div class="ball-group">${balls}</div>
      </div>`;
  }).join('');

  setHTML('historyList', html);
}

/**
 * 控制"加载更多"按钮显隐 + 文案
 * @param {Array} historyData
 * @param {number} showCount
 */
function renderLoadMoreBtn(historyData, showCount) {
  const btn = $('loadMore');
  if (!btn) return;

  if (historyData.length > showCount) {
    // 本地还有更多 → 直接显示
    btn.textContent = '点击加载更多';
    setDisplay('loadMore', 'block');
  } else {
    // 本地已全部展示 → 提示去拉取更多年份
    btn.textContent = '📥 本地已展示完，点击加载上一年数据';
    setDisplay('loadMore', 'block');
  }
}

/**
 * 加载更多按钮的 loading 文案
 */
function setLoadMoreLoading(loading) {
  const btn = $('loadMore');
  if (!btn) return;
  if (loading) {
    btn.textContent = '加载中...';
    btn.style.opacity = '0.6';
  } else {
    btn.style.opacity = '1';
  }
}