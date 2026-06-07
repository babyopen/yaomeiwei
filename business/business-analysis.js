/**
 * business-analysis.js — 全维度统计分析业务层
 * 职责：基于历史数据进行多维度统计计算（单双/大小/区间/头尾/波色/五行/生肖/家禽野兽/遗漏/连出）
 * 禁止：DOM 操作、视图渲染
 * 依赖：core/config.js, core/utils.js, business/business-special.js
 */

// ===================== 初始化统计对象 =====================

/**
 * 创建一个全 0 的统计容器
 */
function createEmptyStats() {
  const singleDouble = { 单: 0, 双: 0 };
  const bigSmall = { 大: 0, 小: 0 };
  const range = { '1-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0 };
  const head = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  const tail = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
  const color = { 红: 0, 蓝: 0, 绿: 0 };
  const wuxing = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
  const animal = { 家禽: 0, 野兽: 0 };
  const zodiac = {};
  zodiacAll.forEach(z => zodiac[z] = 0);
  const numCount = {};
  for (let i = 1; i <= DEFAULTS.maxNumber; i++) numCount[pad(i)] = 0;
  const lastAppear = {};
  for (let i = 1; i <= DEFAULTS.maxNumber; i++) lastAppear[i] = -1;

  return {
    singleDouble, bigSmall, range, head, tail, color, wuxing, animal,
    zodiac, numCount, lastAppear
  };
}

// ===================== 单条累加 =====================

/**
 * 将一条特码信息累加到统计容器
 */
function accumulate(s, stats) {
  s.odd ? stats.singleDouble.单++ : stats.singleDouble.双++;
  s.big ? stats.bigSmall.大++ : stats.bigSmall.小++;
  stats.range[s.range]++;
  stats.head[s.head]++;
  stats.tail[s.tail]++;
  if (s.wave === 'red') stats.color.红++;
  else if (s.wave === 'blue') stats.color.蓝++;
  else stats.color.绿++;
  stats.wuxing[s.wuxing]++;
  stats.animal[s.animal]++;
  if (zodiacAll.includes(s.zod)) stats.zodiac[s.zod]++;
  stats.numCount[pad(s.te)]++;
}

// ===================== 遗漏计算 =====================

/**
 * 计算 1-49 号每个号码的当前遗漏
 * 输入：list 数组（最新在索引 0）
 * 输出：数组 [miss1, miss2, ..., miss49]
 */
function calcMissList(list) {
  const total = list.length;
  const lastAppear = {};
  for (let i = 1; i <= DEFAULTS.maxNumber; i++) lastAppear[i] = -1;

  // 从最新到旧遍历，仅记录首次出现位置（最新位置）
  list.forEach((item, idx) => {
    const s = parseSpecialInfo(item);
    if (lastAppear[s.te] === -1) lastAppear[s.te] = idx;
  });

  const allMiss = [];
  for (let m = 1; m <= DEFAULTS.maxNumber; m++) {
    const p = lastAppear[m];
    allMiss.push(p === -1 ? total : p);
  }
  return allMiss;
}

/**
 * 统计遗漏汇总：当前最大遗漏、平均遗漏、历史最大遗漏、热/温/冷号数量
 */
function calcMissSummary(list) {
  const total = list.length;
  const allMiss = calcMissList(list);

  let sum = 0, max = 0;
  let hot = 0, warm = 0, cold = 0;

  allMiss.forEach(miss => {
    sum += miss;
    if (miss > max) max = miss;
    if (miss <= 3) hot++;
    else if (miss <= 9) warm++;
    else cold++;
  });

  return {
    curMaxMiss: Math.max(...allMiss),
    avgMiss: (sum / DEFAULTS.maxNumber).toFixed(1),
    maxMiss: max,
    hot, warm, cold
  };
}

// ===================== 连出计算 =====================

/**
 * 计算当前连出与最长连出
 * 形态：单双 + 大小 组合 (e.g. 'true_false' = 单+小)
 */
function calcStreak(list) {
  if (list.length < 2) return { curStreak: 1, maxStreak: 1 };

  // 形态字符串：odd_big
  const shapeOf = item => {
    const s = parseSpecialInfo(item);
    return `${s.odd}_${s.big}`;
  };

  // 当前连出：从最新到旧，遇到第一个不同形态停止
  let curStreak = 1;
  const firstShape = shapeOf(list[0]);
  for (let i = 1; i < list.length; i++) {
    if (shapeOf(list[i]) === firstShape) curStreak++;
    else break;
  }

  // 最长连出：滑动窗口
  let maxStreak = 1, current = 1, prevShape = shapeOf(list[0]);
  for (let i = 1; i < list.length; i++) {
    const sh = shapeOf(list[i]);
    if (sh === prevShape) {
      current++;
      if (current > maxStreak) maxStreak = current;
    } else {
      current = 1;
      prevShape = sh;
    }
  }

  return { curStreak, maxStreak };
}

// ===================== 热门排序辅助 =====================

/**
 * 通用排序：按值降序，取前 N 个，返回名 + 次数
 */
function topNEntries(obj, n = 1) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
}

// ===================== 主计算函数（业务核心）=====================

/**
 * 全维度分析主入口
 * @param {Array} historyData - 已清洗的历史数据
 * @param {number} limit - 分析期数（取最新 limit 期）
 * @returns {Object|null} 完整分析结果
 */
function calcFullAnalysis(historyData, limit) {
  if (!historyData || historyData.length === 0) return null;

  // slice(0, limit) 取最新 limit 期，索引 0 = 最新
  const list = historyData.slice(0, Math.min(limit, historyData.length));
  const total = list.length;
  if (total === 0) return null;

  // 1. 累加统计
  const stats = createEmptyStats();
  list.forEach(item => {
    const s = parseSpecialInfo(item);
    accumulate(s, stats);
    // 记录每个号码最新出现位置
    if (stats.lastAppear[s.te] === -1) stats.lastAppear[s.te] = list.indexOf(item);
  });

  // 2. 遗漏 + 连出
  const miss = calcMissSummary(list);
  const streak = calcStreak(list);

  // 3. 热门排序
  const hotSD = topNEntries(stats.singleDouble, 1)[0];      // [name, count]
  const hotBS = topNEntries(stats.bigSmall, 1)[0];
  const hotHead = topNEntries(stats.head, 1)[0];
  const hotTail = topNEntries(stats.tail, 1)[0];
  const hotColor = topNEntries(stats.color, 1)[0];
  const hotWx = topNEntries(stats.wuxing, 1)[0];
  const hotAni = topNEntries(stats.animal, 1)[0];
  const hotZod = topNEntries(stats.zodiac, 3).map(i => i[0]).join('、');
  const hotNum = topNEntries(stats.numCount, 5).map(i => i[0]).join(' ');

  return {
    total,
    singleDouble: stats.singleDouble,
    bigSmall: stats.bigSmall,
    range: stats.range,
    head: stats.head,
    tail: stats.tail,
    color: stats.color,
    wuxing: stats.wuxing,
    animal: stats.animal,
    zodiac: stats.zodiac,
    numCount: stats.numCount,
    miss,
    streak,
    hotSD,
    hotBS,
    hotHead,
    hotTail,
    hotColor,
    hotWx,
    hotAni,
    hotZod,
    hotNum
  };
}