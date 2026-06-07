/**
 * data-query.js — 数据查询层（增量缓存版）
 * 职责：拉取 API 数据 + 本地增量缓存（100期上限）+ 静默更新
 * 禁止：DOM 操作、数据清洗（清洗归 filter.js）
 * 依赖：core/config.js, core/storage.js
 */

// ===================== 缓存配置 =====================
const CACHE_KEY_HISTORY = 'history_v2';          // 历史数据缓存 KEY（升级版本号避免旧缓存干扰）
const CACHE_VERSION = '2.0';                    // 数据版本号
const MAX_LOCAL_PERIODS = 100;                  // 本地最多保存 100 期
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 缓存最大存活期 7 天（兜底强制刷新）

/**
 * 拉取历史数据（原始）
 * @param {number} year
 * @returns {Promise<Array>}
 */
async function fetchHistoryData(year) {
  const targetYear = year || YEAR;
  const url = API.history + targetYear;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.data || [];
}

/**
 * 裁剪数据到最大期数
 * @param {Array} data
 * @param {number} max
 */
function trimToMaxPeriods(data, max = MAX_LOCAL_PERIODS) {
  return data.slice(0, max);
}

// ===================== 缓存读写 =====================

/**
 * 读取本地缓存
 * @returns {{data: Array, savedAt: number, version: string}|null}
 */
function readHistoryCache() {
  const cache = storageGet(CACHE_KEY_HISTORY);
  if (!cache) return null;
  if (cache.version !== CACHE_VERSION) return null;
  if (!Array.isArray(cache.data)) return null;
  return cache;
}

/**
 * 写入本地缓存（自动裁剪到 100 期）
 * @param {Array} data
 * @param {boolean} appendMode - 追加模式：保留本地历史 + 合并新数据
 */
function writeHistoryCache(data, appendMode = false) {
  if (!Array.isArray(data) || data.length === 0) return;

  let finalData = data;

  if (appendMode) {
    const cached = readHistoryCache();
    if (cached) {
      // 合并：本地 + 新数据，按期号去重
      finalData = mergeByExpect(cached.data, data);
    }
  }

  // 裁剪到 100 期（最新在前）
  finalData = trimToMaxPeriods(finalData, MAX_LOCAL_PERIODS);

  storageSet(CACHE_KEY_HISTORY, {
    version: CACHE_VERSION,
    savedAt: Date.now(),
    data: finalData
  });
}

/**
 * 按期号去重合并（新数据优先，覆盖旧数据）
 * @param {Array} oldList
 * @param {Array} newList
 */
function mergeByExpect(oldList, newList) {
  const map = new Map();
  oldList.forEach(item => {
    const expect = Number(getVal(item, 'expect', 0));
    if (expect) map.set(expect, item);
  });
  newList.forEach(item => {
    const expect = Number(getVal(item, 'expect', 0));
    if (expect) map.set(expect, item);
  });

  // 转数组 + 排序（最新在前）
  return Array.from(map.values()).sort((a, b) => {
    return Number(getVal(b, 'expect', 0)) - Number(getVal(a, 'expect', 0));
  });
}

/**
 * 清除历史缓存
 */
function clearHistoryCache() {
  storageRemove(CACHE_KEY_HISTORY);
}

/**
 * 获取缓存状态
 * @returns {{hit: boolean, count: number, age: number, savedAt: number, latestExpect: string|null}}
 */
function getHistoryCacheStatus() {
  const cache = readHistoryCache();
  if (!cache) {
    return { hit: false, count: 0, age: 0, savedAt: 0, latestExpect: null };
  }
  return {
    hit: true,
    count: cache.data.length,
    age: Date.now() - (cache.savedAt || 0),
    savedAt: cache.savedAt,
    latestExpect: getVal(cache.data[0], 'expect', null)
  };
}

// ===================== 静默拉取（核心）=====================

/**
 * 静默拉取（带网络失败兜底）
 * 策略：
 *   1. 永远不阻塞用户操作
 *   2. 失败时静默吞掉（保持本地数据可用）
 *   3. 拉取到新数据 → 合并 + 裁剪 → 写入缓存 → 派发事件
 *   4. 没新数据 → 不动
 *   5. 缓存超过 7 天 → 强制刷新
 *
 * @returns {Promise<{updated: boolean, newCount: number, fromCache: boolean, error?: string}>}
 */
async function silentFetchUpdate() {
  const status = getHistoryCacheStatus();
  const now = Date.now();

  // 兜底：缓存超过 7 天 → 强制刷新（即便有缓存也重拉）
  const forceRefresh = !status.hit || (status.age > CACHE_MAX_AGE_MS);

  try {
    const raw = await fetchHistoryData(YEAR);
    const processed = processHistoryData(raw);

    if (processed.length === 0) {
      return { updated: false, newCount: 0, fromCache: false, error: '空数据' };
    }

    // 与本地对比：是否有新期数？
    const oldLatest = status.latestExpect ? Number(status.latestExpect) : 0;
    const newLatest = Number(getVal(processed[0], 'expect', 0));

    if (!forceRefresh && newLatest <= oldLatest) {
      // 没有新数据
      return {
        updated: false,
        newCount: 0,
        fromCache: true,
        latestExpect: processed[0]
      };
    }

    // 有新数据 → 写入缓存（合并模式）
    writeHistoryCache(processed, true);

    return {
      updated: true,
      newCount: newLatest - oldLatest,
      fromCache: false,
      latestExpect: processed[0]
    };
  } catch (e) {
    // 静默失败：保持本地数据不变
    console.warn('[SilentFetch] 拉取失败，使用本地数据：', e.message);
    return {
      updated: false,
      newCount: 0,
      fromCache: status.hit,
      error: e.message
    };
  }
}

// ===================== 主入口 =====================

/**
 * 查询历史数据（首次加载用）
 * 策略：
 *   1. 优先读本地缓存
 *   2. 缓存缺失或过期 → 拉取 API → 写入缓存
 *   3. forceRefresh=true → 跳过缓存，直接拉取
 *
 * @param {Object} options
 * @param {boolean} options.forceRefresh
 * @returns {Promise<{data: Array, fromCache: boolean, savedAt: number}>}
 */
async function queryHistoryData(options) {
  const opts = options || {};
  const forceRefresh = !!opts.forceRefresh;

  // 1. 优先读缓存
  if (!forceRefresh) {
    const cached = readHistoryCache();
    if (cached && cached.data.length > 0) {
      return {
        data: cached.data,
        fromCache: true,
        savedAt: cached.savedAt
      };
    }
  }

  // 2. 拉取 API
  const raw = await fetchHistoryData(opts.year);
  const processed = processHistoryData(raw);

  // 3. 写入缓存（不追加，因为是首次或强制刷新）
  if (processed.length > 0) {
    writeHistoryCache(processed, false);
  }

  return {
    data: processed,
    fromCache: false,
    savedAt: Date.now()
  };
}

// ===================== 跨年补全（"加载更多"用）=====================

/**
 * 跨年拉取历史数据
 * 用于"加载更多"：当本地 100 期全部展示完后，拉取上一年数据补全
 *
 * @param {number} year - 要拉取的年份（默认 = 当前年 - 1）
 * @returns {Promise<{data: Array, year: number, count: number}>}
 */
async function fetchMoreHistoryData(year) {
  const targetYear = year || (YEAR - 1);

  // 优先尝试从缓存读"已加载年份"标记
  const moreKey = `more_${targetYear}`;
  const cachedMore = storageGet(moreKey);
  if (cachedMore && cachedMore.version === CACHE_VERSION) {
    return {
      data: cachedMore.data,
      year: targetYear,
      count: cachedMore.data.length,
      fromCache: true
    };
  }

  // 拉取 API
  const raw = await fetchHistoryData(targetYear);
  const processed = processHistoryData(raw);

  // 写入"已加载年份"缓存（独立 key，不污染主缓存）
  if (processed.length > 0) {
    storageSet(moreKey, {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      year: targetYear,
      data: processed
    });
  }

  return {
    data: processed,
    year: targetYear,
    count: processed.length,
    fromCache: false
  };
}

/**
 * 合并更多历史数据到主缓存（追加模式）
 * 用于"加载更多"按钮：跨年拉取后并入主数据流
 *
 * @param {Array} newData - 新拉取的跨年数据
 * @returns {{total: number, added: number, years: number[]}}
 */
function appendMoreToCache(newData) {
  const cached = readHistoryCache();
  const existingData = cached ? cached.data : [];

  // 合并：本地 + 新数据
  const merged = mergeByExpect(existingData, newData);

  // 找出合并前年份集合（用于统计新增了多少）
  const oldYears = new Set(existingData.map(i => getVal(i, 'expect', '').slice(0, 4)));
  const newYears = new Set(merged.map(i => getVal(i, 'expect', '').slice(0, 4)));
  newYears.forEach(y => oldYears.add(y));

  // 写入主缓存（不再裁剪上限，因为已分析需要更多期数）
  storageSet(CACHE_KEY_HISTORY, {
    version: CACHE_VERSION,
    savedAt: Date.now(),
    data: merged,
    expandedAt: Date.now()  // 标记：已扩展数据
  });

  return {
    total: merged.length,
    added: merged.length - existingData.length,
    years: Array.from(oldYears).filter(Boolean).sort()
  };
}