/**
 * storage.js — 本地存储读写
 * 职责：封装 localStorage 读写操作
 * 禁止：DOM 操作、业务逻辑
 */

const STORAGE_PREFIX = 'analysis_';

// 读取
function storageGet(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// 写入
function storageSet(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    // 存储已满或不可用
  }
}

// 删除
function storageRemove(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    // ignore
  }
}

// 清空所有本应用数据
function storageClear() {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith(STORAGE_PREFIX)) localStorage.removeItem(k);
    });
  } catch (e) {
    // ignore
  }
}