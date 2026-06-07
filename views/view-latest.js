/**
 * views/view-latest.js — 视图层：最新开奖
 * 职责：渲染最新一期开奖球 + 倒计时
 * 禁止：业务计算（调 business-special 拿数据）
 * 依赖：core/utils.js, platform/web/dom.js, platform/web/render.js, business/business-special.js
 */

/**
 * 渲染最新一期开奖
 * @param {Object} item - 最新一期数据
 */
function renderLatest(item) {
  if (!item) return;

  const codeArr = getVal(item, 'openCode', '0,0,0,0,0,0,0').split(',');
  const waveArr = getVal(item, 'wave', 'red,red,red,red,red,red,red').split(',');
  const special = parseSpecialInfo(item);
  const zodArr = special.fullZodArr;

  let html = '';
  for (let i = 0; i < 6; i++) {
    html += buildBallHTML(codeArr[i], waveArr[i], zodArr[i]);
  }
  html += '<div class="ball-sep">+</div>' + buildBallHTML(codeArr[6], waveArr[6], zodArr[6]);

  setHTML('latestBalls', html);
  setText('curExpect', getVal(item, 'expect', '--'));
}

/**
 * 启动倒计时（每天 21:32:32 为开奖时间）
 */
function startCountdown() {
  setInterval(() => {
    const now = new Date();
    const target = new Date();
    target.setHours(21, 32, 32, 0);
    if (now > target) target.setDate(target.getDate() + 1);
    const diff = target - now;
    const h = pad(Math.floor(diff / 3600000));
    const m = pad(Math.floor((diff % 3600000) / 60000));
    const s = pad(Math.floor((diff % 60000) / 1000));
    setText('countdown', `${h}:${m}:${s}`);
  }, 1000);
}