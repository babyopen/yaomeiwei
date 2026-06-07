/**
 * platform/web/toast.js — Toast 轻提示组件
 * 职责：通用提示
 * 禁止：业务逻辑
 */

/**
 * 显示一条提示（3 秒自动消失）
 * @param {string} msg - 提示内容
 * @param {string} type - 'info' | 'error' | 'success'
 */
function showToast(msg, type = 'info') {
  // 移除已存在
  const exist = document.querySelector('.app-toast');
  if (exist) exist.remove();

  const toast = document.createElement('div');
  toast.className = `app-toast app-toast-${type}`;
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 9999;
    max-width: 80%;
    text-align: center;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}