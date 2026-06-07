/**
 * utils.js — 核心工具层
 * 只放：纯工具函数（深拷贝、防抖、节流、格式化等）
 * 禁止：DOM 操作、业务逻辑
 */

// DOM 快捷获取
const $ = id => document.getElementById(id);

// 数字补零（两位数）
const pad = n => String(n).padStart(2, '0');

// 安全取值（路径穿透）
const getVal = (obj, path, def = '') => {
  return path.split('.').reduce((o, k) => (o || {})[k], obj) ?? def;
};

// 深拷贝
const deepClone = obj => JSON.parse(JSON.stringify(obj));

// 防抖
const debounce = (fn, delay = 300) => {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

// 节流
const throttle = (fn, delay = 300) => {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
};