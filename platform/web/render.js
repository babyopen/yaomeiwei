/**
 * platform/web/render.js — 平台层通用渲染工具
 * 职责：通用 HTML 片段生成（无业务数据）
 * 禁止：业务计算
 */

/**
 * 生成单个球 HTML
 */
function buildBallHTML(num, color, zodiac, size = 38, fs = 17) {
  return `
    <div class="ball-item" style="min-width:${size}px;">
      <div class="ball ${color}" style="width:${size}px;height:${size}px;font-size:${fs}px;">${num}</div>
      <div class="ball-zodiac">${zodiac}</div>
    </div>`;
}

/**
 * 排行表 HTML
 */
function buildRankHTML(dataObj, total) {
  if (total === 0) return '';
  const sorted = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
  let html = `
    <div class="rank-header">
      <div class="rank-no">名次</div>
      <div class="rank-name">分类</div>
      <div class="rank-count">次数</div>
      <div class="rank-rate">占比</div>
      <div class="rank-miss">遗漏</div>
    </div>`;
  sorted.forEach(([name, count], idx) => {
    const rate = ((count / total) * 100).toFixed(0) + '%';
    const miss = count > 0 ? Math.floor((total - count) / count) : total;
    html += `
      <div class="rank-row">
        <div class="rank-no">${idx + 1}</div>
        <div class="rank-name">${name}</div>
        <div class="rank-count">${count}</div>
        <div class="rank-rate">${rate}</div>
        <div class="rank-miss">${miss}</div>
      </div>`;
  });
  return html;
}

/**
 * 通用热门值获取（取前 N，按值降序拼接）
 */
function getTopHotStr(arr, limit = 2) {
  return arr.sort((a, b) => b[1] - a[1]).slice(0, limit).map(i => i[0]).join(' / ');
}