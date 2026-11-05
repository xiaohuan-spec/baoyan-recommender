(function () {
  'use strict';

  var resultSection = document.getElementById('result-section');

  var DIM_LABELS = {
    school: '院校背景',
    ranking: '专业排名',
    english: '英语能力',
    competition: '竞赛加分',
    research: '科研加分'
  };

  var BUCKETS = [
    { key: 'reach', cls: 'reach', title: '冲', desc: '挑战层次' },
    { key: 'stable', cls: 'stable', title: '稳', desc: '匹配层次' },
    { key: 'safety', cls: 'safety', title: '保', desc: '保底层次' }
  ];

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function headHtml() {
    return '<div class="result-head">' +
      '<h2 class="section-title">推荐结果</h2>' +
      '<button type="button" class="btn-light" id="refill-btn">重新填写信息</button>' +
      '</div>';
  }

  function breakdownItemHtml(label, value) {
    return '<div class="breakdown-item">' +
      '<div class="b-label">' + esc(label) + '</div>' +
      '<div class="b-value">' + esc(value) + '</div>' +
      '</div>';
  }

  function scoreHtml(score) {
    var total = score ? score.total : null;
    var breakdown = (score && score.breakdown) || {};
    var items = Object.keys(DIM_LABELS).map(function (key) {
      var v = breakdown[key];
      return breakdownItemHtml(DIM_LABELS[key], v === null || v === undefined ? '待定' : v + ' 分');
    }).join('');

    if (total === null || total === undefined) {
      return '<div class="score-panel">' +
        '<div class="score-total-row"><span class="score-total">--</span><span class="score-unit">分</span>' +
        '<span class="score-placeholder-tag">评分算法待实现</span></div>' +
        '<div class="score-bar"><div class="score-bar-fill" style="width:0%"></div></div>' +
        '<div class="breakdown">' + items + '</div>' +
        '</div>';
    }

    var pct = Math.max(0, Math.min(100, Number(total) || 0));
    return '<div class="score-panel">' +
      '<div class="score-total-row"><span class="score-total">' + esc(total) + '</span><span class="score-unit">分</span></div>' +
      '<div class="score-bar"><div class="score-bar-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="breakdown">' + items + '</div>' +
      '</div>';
  }

  function schoolCardHtml(s) {
    var prob = (s.probability === null || s.probability === undefined)
      ? '<span class="prob muted">概率待评估</span>'
      : '<span class="prob">预估录取 ' + esc(s.probability) + '%</span>';
    return '<div class="school-card">' +
      '<div class="s-name"><span>' + esc(s.name) + '</span>' + prob + '</div>' +
      '<span class="s-region">' + esc(s.region || '地区未标注') + '</span>' +
      '<div class="s-major">推荐专业：' + esc(s.major || '—') + '</div>' +
      (s.remark ? '<div class="s-remark">' + esc(s.remark) + '</div>' : '') +
      '</div>';
  }

  function bucketsHtml(recommendations, meta) {
    var dataReady = meta && meta.dataReady;
    var cards = BUCKETS.map(function (bucket) {
      var list = (recommendations && recommendations[bucket.key]) || [];
      var body = list.length
        ? list.map(schoolCardHtml).join('')
        : '<div class="empty-tip">' + (dataReady ? '该层次暂无推荐学校' : '待数据库与匹配算法实现') + '</div>';
      return '<div class="bucket ' + bucket.cls + '">' +
        '<div class="bucket-head"><span>' + bucket.title + '<small>' + bucket.desc + '</small></span>' +
        '<span class="bucket-count">' + list.length + ' 所</span></div>' +
        '<div class="bucket-body">' + body + '</div>' +
        '</div>';
    }).join('');
    return '<div class="bucket-grid">' + cards + '</div>';
  }

  function buildHtml(data) {
    var meta = data.meta || {};
    var parts = [headHtml(), scoreHtml(data.score)];
    if (!meta.dataReady && meta.message) {
      parts.push('<div class="notice">' + esc(meta.message) + '</div>');
    }
    parts.push(bucketsHtml(data.recommendations, meta));
    return parts.join('');
  }

  function render(data) {
    resultSection.innerHTML = buildHtml(data);
    resultSection.classList.remove('hidden');
    var refillBtn = document.getElementById('refill-btn');
    if (refillBtn) {
      refillBtn.addEventListener('click', function () {
        document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
      });
    }
    resultSection.scrollIntoView({ behavior: 'smooth' });
  }

  window.ResultView = { render: render };
})();