/**
 * filter.js — 数据过滤与清洗层
 * 职责：数据去重、排序、字段校验、简体转换
 * 禁止：DOM 操作、业务计算（业务归 business/）
 * 依赖：core/config.js, core/utils.js
 */

// ===================== 字段校验 =====================

/**
 * 检查单条历史数据是否合法
 * 必须有期号和7位开奖号码
 */
function isValidHistoryItem(item) {
  const expect = getVal(item, 'expect', '');
  const openCode = getVal(item, 'openCode', '');
  if (!expect || !openCode) return false;
  return openCode.split(',').length === 7;
}

// ===================== 过滤 =====================

/**
 * 过滤掉非法数据
 */
function filterValidItems(rawList) {
  return rawList.filter(isValidHistoryItem);
}

// ===================== 去重 =====================

/**
 * 按期号去重（同一期号仅保留1条）
 * 后期数据会覆盖前期数据
 */
function uniqueByExpect(list) {
  const map = new Map();
  list.forEach(item => {
    const expectNum = Number(getVal(item, 'expect', 0));
    if (expectNum && !isNaN(expectNum)) {
      map.set(expectNum, item);
    }
  });
  return map;
}

// ===================== 排序 =====================

/**
 * 按期号降序排列（期数越大越新，索引0=最新）
 */
function sortByExpectDesc(list) {
  return list.sort((a, b) => {
    const ea = Number(getVal(a, 'expect', 0));
    const eb = Number(getVal(b, 'expect', 0));
    return eb - ea;
  });
}

// ===================== 简体统一 =====================

/**
 * 转换 API 数据中的繁简生肖
 * 不会修改原数组，返回新数组
 */
function normalizeZodiacInItem(item) {
  const raw = getVal(item, 'zodiac', ',,,,,,,,,,,,');
  const zodArr = raw.split(',').map(z => zodiacTradToSimp[z] || z);
  return { ...item, _zodiacSimp: zodArr };
}

/**
 * 批量转换
 */
function normalizeZodiacInList(list) {
  return list.map(normalizeZodiacInItem);
}

// ===================== 整合（数据处理主入口）=====================

/**
 * 完整数据清洗流程：过滤 → 去重 → 排序 → 简体统一
 * @param {Array} rawList - API 原始数据
 * @returns {Array} 清洗后的数据（已降序）
 */
function processHistoryData(rawList) {
  if (!Array.isArray(rawList) || rawList.length === 0) return [];

  // 1. 过滤非法数据
  const valid = filterValidItems(rawList);

  // 2. 去重
  const uniqueMap = uniqueByExpect(valid);

  // 3. 排序（降序）
  const sorted = sortByExpectDesc(Array.from(uniqueMap.values()));

  // 4. 简体统一
  return normalizeZodiacInList(sorted);
}