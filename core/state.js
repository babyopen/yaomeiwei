/**
 * state.js — 全局状态管理
 * 职责：管理全局可变状态，提供 get/set 接口
 * 禁止：DOM 操作、业务逻辑
 */

const state = {
  // 历史数据（按期号降序，索引0=最新）
  historyData: [],

  // 分析期数限制
  analyzeLimit: 30,

  // 精选特码数量
  selectedNumCount: 5,

  // 历史记录展示条数
  showCount: 20,

  // 自动刷新定时器
  autoRefreshTimer: null,

  // 关键点调度器 - 上次重置日期（用于每天 0 点重置触发记录）
  lastResetDate: null
};

// 状态读取
function getState(key) {
  return state[key];
}

// 状态更新
function setState(key, value) {
  state[key] = value;
}

// 批量更新
function updateState(patch) {
  Object.assign(state, patch);
}