/**
 * views/view-zodiac.js — 视图层：生肖关联
 * 职责：渲染生肖关联页面
 * 禁止：业务计算
 * 依赖：core/utils.js, platform/web/dom.js, business/business-zodiac.js
 */

/**
 * 渲染生肖关联
 * @param {Array} historyData
 * @param {number} limit
 * @param {number} targetCount
 */
function renderZodiacAnalysis(historyData, limit, targetCount) {
  const data = calcZodiacAnalysis(historyData, limit, targetCount);
  if (!data) {
    setDisplay('zodiacEmptyTip', 'block');
    setDisplay('zodiacContent', 'none');
    return;
  }
  setDisplay('zodiacEmptyTip', 'none');
  setDisplay('zodiacContent', 'block');

  // 共振组合
  setText('combo1', `1. 首选：尾${data.topTail[0]?.t ?? '-'} + ${data.topZod[0]?.[0] ?? '-'}（出现${data.topZod[0]?.[1] ?? 0}次）`);
  setText('combo2', `2. 次选：尾${data.topTail[1]?.t ?? '-'} + ${data.topZod[1]?.[0] ?? '-'}（出现${data.topZod[1]?.[1] ?? 0}次）`);
  setText('combo3', `3. 备选：尾${data.topTail[2]?.t ?? '-'} + ${data.topZod[2]?.[0] ?? '-'}（出现${data.topZod[2]?.[1] ?? 0}次）`);

  // 尾数→生肖 网格
  let tailHtml = '';
  for (let t = 0; t <= 9; t++) {
    const arr = Object.entries(data.tailZodMap[t]).sort((a, b) => b[1] - a[1]);
    const topZ = arr.length ? arr[0][0] : '-';
    const cnt = arr.length ? arr[0][1] : 0;
    const level = calcZodiacLevel(cnt, data.zodMiss[topZ] || 0, data.total);
    tailHtml += `<div class="data-item-z ${level.cls}">尾${t}<br>${topZ}<br>${cnt}次</div>`;
  }
  setHTML('tailZodiacGrid', tailHtml);

  // 跟随表
  let followHtml = `<tr><th>上期生肖</th><th>首选(次数)</th><th>次选(次数)</th><th>排除生肖</th></tr>`;
  const followKeys = Object.keys(data.followMap).slice(0, 4);
  followKeys.forEach(k => {
    const arr = Object.entries(data.followMap[k]).sort((a, b) => b[1] - a[1]);
    const first = arr[0] ? `${arr[0][0]}(${arr[0][1]})` : '-';
    const second = arr[1] ? `${arr[1][0]}(${arr[1][1]})` : '-';
    const exclude = zodiacAll.filter(z => !arr.some(x => x[0] === z)).slice(0, 2).join('、');
    followHtml += `<tr><td>${k}</td><td>${first}</td><td>${second}</td><td>${exclude || '-'}</td></tr>`;
  });
  setHTML('zodiacFollowTable', followHtml);

  // 12 生肖统计
  let zodHtml = '';
  zodiacAll.forEach(z => {
    const cnt = data.zodCount[z];
    const miss = data.zodMiss[z];
    const rate = ((cnt / data.total) * 100).toFixed(0) + '%';
    const level = calcZodiacLevel(cnt, miss, data.total);
    zodHtml += `<div class="data-item-z ${level.cls}">${z}<br>${cnt}次/${rate}<br>遗${miss}</div>`;
  });
  setHTML('zodiacTotalGrid', zodHtml);

  // 高遗漏生肖
  const missSort = Object.entries(data.zodMiss).sort((a, b) => b[1] - a[1]).slice(0, 3);
  let missHtml = '';
  missSort.forEach(([z, m]) => {
    const avgMiss = data.zodAvgMiss[z];
    const tag = m > avgMiss ? '超平均' : '';
    missHtml += `<div class="data-item-z cold">${z}<br>遗${m}期<br>${tag}</div>`;
  });
  setHTML('zodiacMissGrid', missHtml);

  // 精选特码
  setText('zodiacFinalNum', `✅ 精选特码：${data.finalNums.join(' ') || '无'}`);
}