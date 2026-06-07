/**
 * business-zodiac.js — 生肖关联分析业务层
 * 职责：生肖尾数关联、跟随统计、冷热等级、精选特码闭环
 * 禁止：DOM 操作、视图渲染
 * 依赖：core/config.js, core/utils.js, business/business-special.js
 */

// ===================== 冷热等级 =====================

/**
 * 判断生肖冷热等级
 * @param {number} count - 出现次数
 * @param {number} miss - 当前遗漏
 * @param {number} total - 总期数
 * @returns {{cls: 'hot'|'cold'|'warm', text: '热'|'冷'|'温'}}
 */
function calcZodiacLevel(count, miss, total) {
  const avgCount = total / DEFAULTS.zodiacCount;
  if (count >= avgCount * ZODIAC_LEVEL_RULES.hotMultiplier && miss <= ZODIAC_LEVEL_RULES.hotMaxMiss) {
    return { cls: 'hot', text: '热' };
  }
  if (count <= avgCount * ZODIAC_LEVEL_RULES.coldMultiplier || miss >= ZODIAC_LEVEL_RULES.coldMinMiss) {
    return { cls: 'cold', text: '冷' };
  }
  return { cls: 'warm', text: '温' };
}

// ===================== 号码-生肖映射 =====================

/**
 * 从最新一期建立号码-生肖映射
 * 适配当年生肖表（每年 API 都会更新）
 * @returns {Map<number, string>} 号码 → 生肖
 */
function buildNumZodiacMap(historyData) {
  const map = new Map();
  if (!historyData || historyData.length === 0) return map;

  const latest = historyData[0];
  const codeArr = getVal(latest, 'openCode', '').split(',');

  // 优先用 _zodiacSimp（filter.js 处理过）
  let zodArr;
  if (Array.isArray(latest._zodiacSimp)) {
    zodArr = latest._zodiacSimp;
  } else {
    const raw = getVal(latest, 'zodiac', '').split(',');
    zodArr = raw.map(z => zodiacTradToSimp[z] || z);
  }

  codeArr.forEach((num, idx) => {
    const numVal = Number(num);
    if (numVal && zodArr[idx]) {
      map.set(numVal, zodArr[idx]);
    }
  });

  return map;
}

// ===================== 基础统计 =====================

/**
 * 生肖出现次数 + 平均遗漏
 */
function calcZodiacCountAndMiss(list) {
  const total = list.length;
  const zodCount = {};
  const lastAppear = {};
  zodiacAll.forEach(z => {
    zodCount[z] = 0;
    lastAppear[z] = -1;
  });

  list.forEach((item, idx) => {
    const s = parseSpecialInfo(item);
    if (zodiacAll.includes(s.zod)) {
      zodCount[s.zod]++;
      if (lastAppear[s.zod] === -1) lastAppear[s.zod] = idx;
    }
  });

  const zodMiss = {};
  const zodAvgMiss = {};
  zodiacAll.forEach(z => {
    zodMiss[z] = lastAppear[z] === -1 ? total : lastAppear[z];
    zodAvgMiss[z] = zodCount[z] > 0 ? (total / zodCount[z]).toFixed(1) : total;
  });

  return { zodCount, zodMiss, zodAvgMiss };
}

// ===================== 尾数 → 生肖 关联 =====================

/**
 * 构建尾数-生肖统计矩阵
 * @returns {Object} tailZodMap[tail] = {zod: count}
 */
function buildTailZodiacMap(list) {
  const tailZodMap = {};
  for (let t = 0; t <= 9; t++) tailZodMap[t] = {};

  list.forEach(item => {
    const s = parseSpecialInfo(item);
    if (zodiacAll.includes(s.zod)) {
      tailZodMap[s.tail][s.zod] = (tailZodMap[s.tail][s.zod] || 0) + 1;
    }
  });

  return tailZodMap;
}

// ===================== 上期→本期 跟随统计 =====================

/**
 * 上期生肖 → 本期生肖 跟随
 * 注意：list[0] = 最新，list[1] = 上一期（上期在 i-1）
 * @returns {Object} followMap[上期生肖][本期生肖] = 次数
 */
function buildFollowMap(list) {
  const followMap = {};
  for (let i = 1; i < list.length; i++) {
    const preZod = parseSpecialInfo(list[i - 1]).zod;
    const curZod = parseSpecialInfo(list[i]).zod;
    if (zodiacAll.includes(preZod) && zodiacAll.includes(curZod)) {
      if (!followMap[preZod]) followMap[preZod] = {};
      followMap[preZod][curZod] = (followMap[preZod][curZod] || 0) + 1;
    }
  }
  return followMap;
}

// ===================== 精选特码（闭环核心）=====================

/**
 * 闭环精选特码
 * 步骤：
 *  1. 核心生肖池 = TOP2 热门 + 1 个高遗漏反弹
 *  2. 热门尾数 TOP3
 *  3. 候选号码 = 核心生肖 + 热门尾数交集
 *  4. 按权重（count*10 + 10-miss）排序
 *  5. 兜底：不足用近期特码补充
 *  6. 升序 + 两位数格式化
 *
 * @param {Map} numZodiacMap - 号码-生肖映射
 * @param {Array} topZod - 热门生肖 [name, count]
 * @param {Array} zodMiss - 生肖遗漏 {zod: miss}
 * @param {Array} zodCount - 生肖次数 {zod: count}
 * @param {Array} topTail - 热门尾数 [{t, sum}]
 * @param {Array} list - 历史数据（用于兜底）
 * @param {number} targetCount - 目标数量
 * @returns {Array<string>} 两位数格式的特码数组（已升序）
 */
function calcFinalSpecialNums(numZodiacMap, topZod, zodMiss, zodCount, topTail, list, targetCount) {
  // 1. 核心生肖池：TOP2 热门 + 1 个高遗漏反弹
  const coreZodiacs = topZod.slice(0, 2).map(i => i[0]);
  const missZodiac = Object.entries(zodMiss)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(i => i[0]);
  if (missZodiac.length && !coreZodiacs.includes(missZodiac[0])) {
    coreZodiacs.push(missZodiac[0]);
  }

  // 2. 热门尾数 TOP3
  const hotTails = topTail.slice(0, 3).map(i => i.t);

  // 3. 候选号码：核心生肖 + 热门尾数交集
  const candidateNums = [];
  for (let num = 1; num <= DEFAULTS.maxNumber; num++) {
    const zod = numZodiacMap.get(num);
    const tail = num % 10;
    if (coreZodiacs.includes(zod) && hotTails.includes(tail)) {
      const miss = zodMiss[zod] || 0;
      const count = zodCount[zod] || 0;
      candidateNums.push({
        num,
        weight: count * 10 + (10 - miss)
      });
    }
  }

  // 4. 按权重排序，取目标数量
  candidateNums.sort((a, b) => b.weight - a.weight);
  let finalNums = candidateNums.slice(0, targetCount).map(i => i.num);

  // 5. 兜底：不足时用近期特码补充
  if (finalNums.length < targetCount) {
    const fillNums = [...new Set(list.map(item => parseSpecialInfo(item).te))]
      .filter(num => !finalNums.includes(num))
      .slice(0, targetCount - finalNums.length);
    finalNums.push(...fillNums);
  }

  // 6. 升序 + 两位数格式化
  finalNums.sort((a, b) => a - b);
  return finalNums.map(n => pad(n));
}

// ===================== 主计算函数（业务核心）=====================

/**
 * 生肖关联分析主入口
 * @param {Array} historyData - 已清洗的历史数据
 * @param {number} limit - 分析期数
 * @param {number} targetCount - 精选特码数量
 * @returns {Object|null} 完整生肖分析结果
 */
function calcZodiacAnalysis(historyData, limit, targetCount) {
  if (!historyData || historyData.length < 2) return null;

  const cnt = targetCount || DEFAULTS.selectedNumCount;
  const list = historyData.slice(0, Math.min(limit, historyData.length));
  const total = list.length;
  if (total === 0) return null;

  // 1. 基础统计
  const { zodCount, zodMiss, zodAvgMiss } = calcZodiacCountAndMiss(list);

  // 2. 尾数→生肖
  const tailZodMap = buildTailZodiacMap(list);

  // 3. 跟随
  const followMap = buildFollowMap(list);

  // 4. 热门排序
  const topZod = Object.entries(zodCount).sort((a, b) => b[1] - a[1]);
  const topTail = Array.from({ length: 10 }, (_, t) => ({
    t,
    sum: Object.values(tailZodMap[t]).reduce((a, b) => a + b, 0)
  })).sort((a, b) => b.sum - a.sum);

  // 5. 精选特码
  const numZodiacMap = buildNumZodiacMap(historyData);
  const finalNums = calcFinalSpecialNums(
    numZodiacMap, topZod, zodMiss, zodCount, topTail, list, cnt
  );

  return {
    list,
    total,
    avgExpect: total / DEFAULTS.zodiacCount,
    zodCount,
    zodMiss,
    zodAvgMiss,
    tailZodMap,
    followMap,
    topZod,
    topTail,
    finalNums
  };
}