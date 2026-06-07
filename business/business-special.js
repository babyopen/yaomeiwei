/**
 * business-special.js — 特码信息解析业务层
 * 职责：解析单条开奖数据，提取第7位特码的完整信息
 * 禁止：DOM 操作、视图渲染
 * 依赖：core/config.js, core/utils.js
 */

// ===================== 五行计算 =====================

/**
 * 根据特码数字获取五行属性
 * 规则：尾数 0/5=金、1/6=木、2/7=水、3/8=火、4/9=土
 */
function calcWuxing(num) {
  const m = num % 10;
  return WUXING_MAP[m];
}

// ===================== 生肖分类 =====================

/**
 * 判断生肖属于家禽还是野兽
 */
function getAnimalType(zod) {
  return homeZodiac.includes(zod) ? '家禽' : '野兽';
}

// ===================== 区间划分 =====================

/**
 * 根据特码数字返回所在区间
 */
function calcRange(num) {
  if (num <= 9) return '1-9';
  if (num <= 19) return '10-19';
  if (num <= 29) return '20-29';
  if (num <= 39) return '30-39';
  return '40-49';
}

// ===================== 单条特码解析（核心）=====================

/**
 * 解析单条开奖数据，提取第7位特码完整信息
 * @param {Object} item - API 返回的原始条目
 * @returns {Object} 特码信息对象
 *   {
 *     te: 数字特码,
 *     tail: 尾数,
 *     head: 头数,
 *     wave: 波色,
 *     zod: 生肖（简体）,
 *     odd: 是否单,
 *     big: 是否大(>=25),
 *     animal: '家禽'|'野兽',
 *     wuxing: 五行,
 *     range: 区间,
 *     fullZodArr: 完整生肖数组（7位，简体）
 *   }
 */
function parseSpecialInfo(item) {
  const codeArr = getVal(item, 'openCode', '0,0,0,0,0,0,0').split(',');
  const waveArr = getVal(item, 'wave', 'red,red,red,red,red,red,red').split(',');

  // 兼容 data/filter.js 处理过的 _zodiacSimp，否则现场转换
  let zodArr;
  if (Array.isArray(item._zodiacSimp)) {
    zodArr = item._zodiacSimp;
  } else {
    const zodArrRaw = getVal(item, 'zodiac', ',,,,,,,,,,,,').split(',');
    zodArr = zodArrRaw.map(z => zodiacTradToSimp[z] || z);
  }

  const te = Math.max(0, Number(codeArr[6]));

  return {
    te,
    tail: te % 10,
    head: Math.floor(te / 10),
    wave: waveArr[6],
    zod: zodArr[6] || '-',
    odd: te % 2 === 1,
    big: te >= 25,
    animal: getAnimalType(zodArr[6]),
    wuxing: calcWuxing(te),
    range: calcRange(te),
    fullZodArr: zodArr
  };
}

// ===================== 批量解析 =====================

/**
 * 批量解析历史数据，提取所有特码信息
 * @param {Array} historyData - 历史数据数组（已清洗）
 * @returns {Array<{item, special}>} 原始数据 + 特码信息
 */
function parseSpecialList(historyData) {
  if (!Array.isArray(historyData) || historyData.length === 0) return [];
  return historyData.map(item => ({
    item,
    special: parseSpecialInfo(item)
  }));
}

// ===================== 取最新一条 =====================

/**
 * 获取最新一期特码信息
 */
function getLatestSpecial(historyData) {
  if (!historyData || historyData.length === 0) return null;
  return parseSpecialInfo(historyData[0]);
}