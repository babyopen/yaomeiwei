/**
 * views/view-analysis.js — 视图层：全维度分析
 * 职责：渲染全维度分析页面（热门卡片、各项统计、排行）
 * 禁止：业务计算（调 business-analysis 拿数据）
 * 依赖：core/utils.js, platform/web/dom.js, platform/web/render.js, business/business-analysis.js
 */

/**
 * 渲染全维度分析
 * @param {Array} historyData - 历史数据
 * @param {number} limit - 分析期数
 */
function renderFullAnalysis(historyData, limit) {
  const data = calcFullAnalysis(historyData, limit);
  if (!data) {
    setDisplay('hotWrap', 'none');
    setDisplay('emptyTip', 'block');
    return;
  }
  setDisplay('hotWrap', 'block');
  setDisplay('emptyTip', 'none');

  // 热门卡片
  setText('hotShape', `${data.hotSD[0]} / ${data.hotBS[0]}`);
  setText('hotZodiac', data.hotZod);
  setText('hotHeadTail', `${data.hotHead[0]}头 / ${data.hotTail[0]}尾`);
  setText('hotColorWx', `${data.hotColor[0]} / ${data.hotWx[0]}`);
  setText('hotMiss', `热:${data.miss.hot} 温:${data.miss.warm} 冷:${data.miss.cold} | 最大遗漏:${data.miss.maxMiss}期`);

  // 单双大小
  setText('odd', data.singleDouble.单);
  setText('even', data.singleDouble.双);
  setText('big', data.bigSmall.大);
  setText('small', data.bigSmall.小);

  // 区间
  setText('r1', data.range['1-9']);
  setText('r2', data.range['10-19']);
  setText('r3', data.range['20-29']);
  setText('r4', data.range['30-39']);
  setText('r5', data.range['40-49']);

  // 头数
  setText('h0', data.head[0]);
  setText('h1', data.head[1]);
  setText('h2', data.head[2]);
  setText('h3', data.head[3]);
  setText('h4', data.head[4]);

  // 波色
  setText('cRed', data.color.红);
  setText('cBlue', data.color.蓝);
  setText('cGreen', data.color.绿);

  // 五行
  setText('wJin', data.wuxing.金);
  setText('wMu', data.wuxing.木);
  setText('wShui', data.wuxing.水);
  setText('wHuo', data.wuxing.火);
  setText('wTu', data.wuxing.土);

  // 家禽野兽
  setText('aniHome', data.animal.家禽);
  setText('aniWild', data.animal.野兽);

  // 热门展示
  setText('hotShape2', getTopHotStr(Object.entries(data.singleDouble).concat(Object.entries(data.bigSmall))));
  setText('hotRange2', getTopHotStr(Object.entries(data.range)));
  setText('hotHead2', getTopHotStr(Object.entries(data.head)));
  setText('hotTail2', getTopHotStr(Object.entries(data.tail)));
  setText('hotColor2', getTopHotStr(Object.entries(data.color)));
  setText('hotWuxing2', getTopHotStr(Object.entries(data.wuxing)));
  setText('hotAnimal', getTopHotStr(Object.entries(data.animal)));
  setText('hotZodiac2', Object.entries(data.zodiac).sort((a, b) => b[1] - a[1]).slice(0, 5).map(i => `${i[0]}(${i[1]})`).join(' '));
  setText('hotNumber', data.hotNum);

  // 遗漏 + 连出
  setText('missCur', data.miss.curMaxMiss);
  setText('missAvg', data.miss.avgMiss);
  setText('missMax', data.miss.maxMiss);
  setText('missHot', data.miss.hot);
  setText('missWarm', data.miss.warm);
  setText('missCold', data.miss.cold);
  setText('hotColdTip', `热:${data.miss.hot} 温:${data.miss.warm} 冷:${data.miss.cold}`);
  setText('streakCur', data.streak.curStreak);
  setText('streakMax', data.streak.maxStreak);
  setText('streakTip', `当前:${data.streak.curStreak}期 最长:${data.streak.maxStreak}期`);

  // 尾数行
  let tailHtml = '';
  for (let t = 0; t <= 9; t++) {
    tailHtml += `<div class="analysis-item"><div class="label">尾${t}</div><div class="value">${data.tail[t]}</div></div>`;
  }
  setHTML('tailRow', tailHtml);

  // 排行
  setHTML('singleDoubleRank', buildRankHTML(data.singleDouble, data.total));
  setHTML('bigSmallRank', buildRankHTML(data.bigSmall, data.total));
  setHTML('rangeRank', buildRankHTML(data.range, data.total));
  setHTML('headRank', buildRankHTML(data.head, data.total));
  setHTML('tailRank', buildRankHTML(data.tail, data.total));
  setHTML('colorRank', buildRankHTML(data.color, data.total));
  setHTML('wuxingRank', buildRankHTML(data.wuxing, data.total));
  setHTML('animalRank', buildRankHTML(data.animal, data.total));
  setHTML('zodiacRank', buildRankHTML(data.zodiac, data.total));
}