(function () {
  'use strict';

  var REGION_LIST = [
    '北京', '上海', '广州', '深圳', '广东（其他）', '江苏', '浙江', '安徽',
    '湖北', '湖南', '陕西', '四川', '重庆', '山东', '河南', '河北',
    '天津', '福建', '辽宁', '吉林', '黑龙江', '云南', '贵州', '广西',
    '甘肃', '新疆', '其他'
  ];
  var COMPETITION_LEVELS = ['国际级', '国家级', '省级', '校级', '其他'];
  var COMPETITION_AWARDS = ['特等奖', '一等奖', '二等奖', '三等奖', '优秀奖', '入围/参赛', '其他'];
  var RESEARCH_TYPES = ['大创项目', '科研项目', '学术论文', '专利', '学术会议', '其他'];

  var form = document.getElementById('profile-form');
  var competitionList = document.getElementById('competition-list');
  var researchList = document.getElementById('research-list');
  var regionChips = document.getElementById('region-chips');
  var submitBtn = document.getElementById('submit-btn');
  var formBanner = document.getElementById('form-banner');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function optionHtml(list, selected) {
    return list.map(function (v) {
      return '<option value="' + esc(v) + '"' + (v === selected ? ' selected' : '') + '>' + esc(v) + '</option>';
    }).join('');
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function renderRegionChips() {
    REGION_LIST.forEach(function (region) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'chip';
      chip.dataset.region = region;
      chip.textContent = region;
      chip.addEventListener('click', function () {
        chip.classList.toggle('active');
      });
      regionChips.appendChild(chip);
    });
  }

  function addCompetitionRow() {
    var row = document.createElement('div');
    row.className = 'dynamic-row comp-row';
    row.innerHTML =
      '<input type="text" class="c-name" placeholder="竞赛名称，如：全国大学生数学建模竞赛">' +
      '<select class="c-level">' + optionHtml(COMPETITION_LEVELS, '省级') + '</select>' +
      '<select class="c-award">' + optionHtml(COMPETITION_AWARDS, '二等奖') + '</select>' +
      '<button type="button" class="btn-remove" title="删除此条">×</button>';
    row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
    competitionList.appendChild(row);
  }

  function addResearchRow() {
    var row = document.createElement('div');
    row.className = 'dynamic-row research-row';
    row.innerHTML =
      '<select class="r-type">' + optionHtml(RESEARCH_TYPES, '大创项目') + '</select>' +
      '<textarea class="r-desc" rows="2" placeholder="简要描述，如：参与国家级大创项目，负责算法模块，结项优秀"></textarea>' +
      '<button type="button" class="btn-remove" title="删除此条">×</button>';
    row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
    researchList.appendChild(row);
  }

  function collectFormData() {
    var competitions = Array.prototype.slice.call(competitionList.querySelectorAll('.dynamic-row')).map(function (row) {
      return {
        name: row.querySelector('.c-name').value.trim(),
        level: row.querySelector('.c-level').value,
        award: row.querySelector('.c-award').value
      };
    }).filter(function (c) { return c.name; });

    var researches = Array.prototype.slice.call(researchList.querySelectorAll('.dynamic-row')).map(function (row) {
      return {
        type: row.querySelector('.r-type').value,
        description: row.querySelector('.r-desc').value.trim()
      };
    }).filter(function (r) { return r.description || (r.type && r.type !== '其他'); });

    var intendedRegions = Array.prototype.slice.call(regionChips.querySelectorAll('.chip.active')).map(function (chip) {
      return chip.dataset.region;
    });

    return {
      school: val('school'),
      major: val('major'),
      rank: val('rank'),
      totalStudents: val('totalStudents'),
      cet6: val('cet6'),
      competitions: competitions,
      researches: researches,
      intendedMajor: val('intendedMajor'),
      intendedRegions: intendedRegions
    };
  }

  function validateForm(d) {
    var errors = [];
    if (!d.school) errors.push(['school', '请填写本科院校']);
    if (!d.major) errors.push(['major', '请填写本科专业']);
    if (d.rank === '') {
      errors.push(['rank', '请填写专业排名位次']);
    } else if (!/^\d+$/.test(d.rank) || Number(d.rank) < 1) {
      errors.push(['rank', '排名位次需为不小于 1 的整数']);
    }
    if (d.totalStudents === '') {
      errors.push(['totalStudents', '请填写专业总人数']);
    } else if (!/^\d+$/.test(d.totalStudents) || Number(d.totalStudents) < 1) {
      errors.push(['totalStudents', '专业总人数需为不小于 1 的整数']);
    }
    if (/^\d+$/.test(d.rank) && /^\d+$/.test(d.totalStudents) && Number(d.totalStudents) < Number(d.rank)) {
      errors.push(['totalStudents', '专业总人数不能小于排名位次']);
    }
    if (d.cet6 !== '' && (Number(d.cet6) < 220 || Number(d.cet6) > 710)) {
      errors.push(['cet6', '英语六级成绩需在 220 - 710 分之间']);
    }
    if (!d.intendedMajor) errors.push(['intendedMajor', '请填写意向专业']);
    return errors;
  }

  function showError(field, message) {
    var p = form.querySelector('.field-error[data-error-for="' + field + '"]');
    if (p) {
      p.textContent = message;
      p.classList.add('show');
    }
    var input = document.getElementById(field);
    if (input) input.classList.add('input-error');
  }

  function clearErrors() {
    Array.prototype.slice.call(form.querySelectorAll('.field-error')).forEach(function (p) {
      p.textContent = '';
      p.classList.remove('show');
    });
    Array.prototype.slice.call(form.querySelectorAll('.input-error')).forEach(function (el) {
      el.classList.remove('input-error');
    });
    formBanner.classList.remove('show');
  }

  function showFormError(message) {
    formBanner.textContent = message;
    formBanner.classList.add('show');
  }

  function setLoading(on) {
    submitBtn.disabled = on;
    submitBtn.textContent = on ? '正在生成…' : '生成推荐方案';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearErrors();

    var data = collectFormData();
    var errors = validateForm(data);
    if (errors.length) {
      errors.forEach(function (item) { showError(item[0], item[1]); });
      formSectionScroll();
      return;
    }

    setLoading(true);
    fetch('/api/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        return res.json().then(function (body) { return { ok: res.ok, body: body }; });
      })
      .then(function (result) {
        if (!result.ok || !result.body.ok) {
          throw new Error(result.body.error || '请求失败，请稍后重试');
        }
        window.ResultView.render(result.body);
      })
      .catch(function (err) {
        showFormError(err.message || '网络异常，请稍后重试');
      })
      .finally(function () {
        setLoading(false);
      });
  });

  function formSectionScroll() {
    document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
  }

  document.getElementById('add-competition').addEventListener('click', addCompetitionRow);
  document.getElementById('add-research').addEventListener('click', addResearchRow);

  renderRegionChips();
  addCompetitionRow();
  addResearchRow();
})();