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
    var detail = (score && score.detail) || {};
    var items = Object.keys(DIM_LABELS).map(function (key) {
      var v = breakdown[key];
      return breakdownItemHtml(DIM_LABELS[key], v === null || v === undefined ? '待定' : v + ' 分');
    }).join('');

    if (total === null || total === undefined) {
      var tag = detail.status === 'error'
        ? '评分配置加载失败'
        : (detail.pending_reasons && detail.pending_reasons.length ? '部分信息待确认' : '评分待定');
      return '<div class="score-panel">' +
        '<div class="score-total-row"><span class="score-total">--</span><span class="score-unit">分</span>' +
        '<span class="score-placeholder-tag">' + esc(tag) + '</span></div>' +
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

  function pendingHtml(score) {
    var detail = (score && score.detail) || {};
    var reasons = detail.pending_reasons || [];
    if (!reasons.length) return '';
    return '<div class="notice">' +
      '<strong>以下信息待确认，补全后才能得出总分：</strong><br>' +
      reasons.map(esc).join('<br>') + '</div>';
  }

  function noticesHtml(score) {
    var detail = (score && score.detail) || {};
    var notices = detail.notices || [];
    if (!notices.length) return '';
    return '<div class="notice notice-muted">' + notices.map(esc).join('<br>') + '</div>';
  }

  function schoolCardHtml(s) {
    var prob = (s.probability === null || s.probability === undefined)
      ? '<span class="prob muted">概率待评估</span>'
      : '<span class="prob">预估录取 ' + esc(s.probability) + '%</span>';
    var majorText = '推荐专业：' + esc(s.major || '—') +
      (s.difficulty !== null && s.difficulty !== undefined ? '（难度 ' + esc(s.difficulty) + '）' : '');
    var nameHtml = esc(s.name) + (s.isHome ? '<span class="tag-home">本校</span>' : '');
    var region = s.region || (s.isHome ? '本校' : '地区未标注');
    return '<div class="school-card' + (s.isHome ? ' home-card' : '') + '">' +
      '<div class="s-name"><span>' + nameHtml + '</span>' + prob + '</div>' +
      '<span class="s-region">' + esc(region) + '</span>' +
      '<div class="s-major">' + majorText + '</div>' +
      (s.remark ? '<div class="s-remark">' + esc(s.remark) + '</div>' : '') +
      '</div>';
  }

  function bucketsHtml(recommendations, meta, score) {
    var dataReady = meta && meta.dataReady;
    var scorePending = score && (score.total === null || score.total === undefined);
    var cards = BUCKETS.map(function (bucket) {
      var list = (recommendations && recommendations[bucket.key]) || [];
      var emptyTip;
      if (!dataReady) {
        emptyTip = '待学校数据库填充';
      } else if (scorePending) {
        emptyTip = '评分信息待确认，补全后生成推荐';
      } else {
        emptyTip = '该层次暂无匹配学校，可尝试放宽意向专业或地区';
      }
      var body = list.length ? list.map(schoolCardHtml).join('') : '<div class="empty-tip">' + emptyTip + '</div>';
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
    var parts = [headHtml(), scoreHtml(data.score), pendingHtml(data.score)];
    if (meta.message) {
      parts.push('<div class="notice">' + esc(meta.message) + '</div>');
    }
    parts.push(bucketsHtml(data.recommendations, meta, data.score));
    parts.push(noticesHtml(data.score));
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