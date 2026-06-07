/**
 * platform/web/dom.js — 平台层 DOM 操作封装
 * 职责：DOM 元素获取、文本/HTML/样式操作
 * 禁止：业务计算
 * 依赖：core/utils.js（$ 工具）
 */

/**
 * 设置元素文本
 */
function setText(id, text) {
  const el = $(id);
  if (el) el.innerText = text;
}

/**
 * 设置元素 HTML
 */
function setHTML(id, html) {
  const el = $(id);
  if (el) el.innerHTML = html;
}

/**
 * 设置元素样式 display
 */
function setDisplay(id, value) {
  const el = $(id);
  if (el) el.style.display = value;
}

/**
 * 切换 class
 */
function toggleClass(id, className, force) {
  const el = $(id);
  if (!el) return;
  if (force === true) el.classList.add(className);
  else if (force === false) el.classList.remove(className);
  else el.classList.toggle(className);
}

/**
 * 添加 class
 */
function addClass(id, className) {
  const el = $(id);
  if (el) el.classList.add(className);
}

/**
 * 移除 class
 */
function removeClass(id, className) {
  const el = $(id);
  if (el) el.classList.remove(className);
}

/**
 * 给一组元素批量加/去 class
 */
function setActiveClass(ids, activeId) {
  ids.forEach(id => {
    if (id === activeId) addClass(id, 'active');
    else removeClass(id, 'active');
  });
}

/**
 * 设置元素文本内容
 */
function setBtnText(id, text) {
  const el = $(id);
  if (el) el.textContent = text;
}