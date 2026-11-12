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

  var ENGLISH_SPECS = {
    CET4: { min: 0, max: 710, step: 1, hint: '0 - 710' },
    CET6: { min: 0, max: 710, step: 1, hint: '0 - 710' },
    IELTS: { min: 0, max: 9, step: 0.5, hint: '0 - 9，0.5 分步长' },
    TOEFL: { min: 0, max: 120, step: 1, hint: '0 - 120 总分制' }
  };

  var RESEARCH_STATUS_ROLES = {
    '期刊论文': { statuses: ['已发表', '已录用', '投稿中'], roles: ['第一作者', '共同第一作者', '其他作者'] },
    '会议论文': { statuses: ['已发表', '已录用', '投稿中'], roles: ['第一作者', '共同第一作者', '其他作者'] },
    '发明专利': { statuses: ['已授权', '申请中'], roles: ['第一发明人', '其他发明人'] },
    '科研项目': { statuses: ['已结题', '进行中'], roles: ['负责人', '参与者'] },
    '软件著作权': { statuses: ['已登记', '申请中'], roles: ['主要完成人', '其他完成人'] }
  };
  var RESEARCH_FIELDS = ['机器学习', '软件系统', '信号处理', '统计建模', '机械设计', '经济研究', '文学研究'];

  var form = document.getElementById('profile-form');
  var englishList = document.getElementById('english-list');
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

  function addEnglishRow() {
    var row = document.createElement('div');
    row.className = 'dynamic-row english-row';
    row.innerHTML =
      '<select class="e-type">' + optionHtml(Object.keys(ENGLISH_SPECS), 'CET6') + '</select>' +
      '<input type="number" class="e-score" placeholder="分数">' +
      '<button type="button" class="btn-remove" title="删除此条">×</button>';
    var typeSelect = row.querySelector('.e-type');
    var scoreInput = row.querySelector('.e-score');
    function syncRange() {
      var spec = ENGLISH_SPECS[typeSelect.value];
      scoreInput.min = spec.min;
      scoreInput.max = spec.max;
      scoreInput.step = spec.step;
      scoreInput.placeholder = spec.hint;
    }
    typeSelect.addEventListener('change', syncRange);
    row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
    syncRange();
    englishList.appendChild(row);
  }

  function addCompetitionRow() {
    var row = document.createElement('div');
    row.className = 'dynamic-row comp-row';
    row.innerHTML =
      '<input type="text" class="c-name" placeholder="竞赛名称，如：全国大学生数学建模竞赛">' +
      '<input type="number" class="c-year" min="1900" max="2100" value="' + new Date().getFullYear() + '" title="获奖年份">' +
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
      '<select class="r-type">' + optionHtml(Object.keys(RESEARCH_STATUS_ROLES), '科研项目') + '</select>' +
      '<input type="text" class="r-title" placeholder="成果标题，如：基于深度学习的XX研究">' +
      '<select class="r-status"></select>' +
      '<select class="r-role"></select>' +
      '<input type="text" class="r-field" list="research-field-list" placeholder="研究方向，如：机器学习">' +
      '<button type="button" class="btn-remove" title="删除此条">×</button>';
    var typeSelect = row.querySelector('.r-type');
    var statusSelect = row.querySelector('.r-status');
    var roleSelect = row.querySelector('.r-role');
    function syncOptions() {
      var conf = RESEARCH_STATUS_ROLES[typeSelect.value];
      statusSelect.innerHTML = optionHtml(conf.statuses, conf.statuses[0]);
      roleSelect.innerHTML = optionHtml(conf.roles, conf.roles[0]);
    }
    typeSelect.addEventListener('change', syncOptions);
    row.querySelector('.btn-remove').addEventListener('click', function () { row.remove(); });
    syncOptions();
    researchList.appendChild(row);
  }

  function collectFormData() {
    var english = Array.prototype.slice.call(englishList.querySelectorAll('.dynamic-row')).map(function (row) {
      return {
        type: row.querySelector('.e-type').value,
        score: row.querySelector('.e-score').value.trim()
      };
    }).filter(function (e) { return e.score !== ''; });

    var competitions = Array.prototype.slice.call(competitionList.querySelectorAll('.dynamic-row')).map(function (row) {
      return {
        name: row.querySelector('.c-name').value.trim(),
        year: row.querySelector('.c-year').value.trim(),
        level: row.querySelector('.c-level').value,
        award: row.querySelector('.c-award').value
      };
    }).filter(function (c) { return c.name; });

    var researches = Array.prototype.slice.call(researchList.querySelectorAll('.dynamic-row')).map(function (row) {
      return {
        type: row.querySelector('.r-type').value,
        title: row.querySelector('.r-title').value.trim(),
        status: row.querySelector('.r-status').value,
        role: row.querySelector('.r-role').value,
        field: row.querySelector('.r-field').value.trim()
      };
    }).filter(function (r) { return r.title || r.field; });

    var intendedRegions = Array.prototype.slice.call(regionChips.querySelectorAll('.chip.active')).map(function (chip) {
      return chip.dataset.region;
    });

    return {
      school: val('school'),
      major: val('major'),
      rank: val('rank'),
      totalStudents: val('totalStudents'),
      english: english,
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
    d.english.forEach(function (e) {
      var spec = ENGLISH_SPECS[e.type];
      var score = Number(e.score);
      if (!spec || !isFinite(score) || score < spec.min || score > spec.max) {
        errors.push(['english', (e.type || '英语') + ' 成绩需在 ' + (spec ? spec.hint : '有效范围') + ' 之间']);
      } else if (Math.abs(score / spec.step - Math.round(score / spec.step)) > 1e-9) {
        errors.push(['english', e.type + ' 成绩需按 ' + spec.step + ' 分递增']);
      }
    });
    d.competitions.forEach(function (c) {
      if (c.year !== '' && (!/^\d+$/.test(c.year) || Number(c.year) < 1900 || Number(c.year) > 2100)) {
        errors.push(['competitions', '竞赛年份需为 1900 - 2100 的整数']);
      }
    });
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
    Promise.resolve()
      .then(function () {
        var profile = LocalCore.normalizeProfile(data);
        var check = LocalCore.validateProfile(profile);
        if (!check.ok) {
          throw new Error(check.message);
        }
        return Promise.all([
          LocalScoring.calculateScore(profile),
          LocalScoring.getMajorRelations(),
          LocalDatabase.getSchools()
        ]).then(function (results) {
          var score = results[0];
          var majorRelations = results[1];
          var schools = results[2];
          var recommendations = LocalMatching.matchSchools(score, schools, profile, majorRelations);
          return {
            ok: true,
            profile: profile,
            score: score,
            recommendations: recommendations,
            meta: {
              dataReady: LocalDatabase.isDataReady(),
              schoolCount: schools.length,
              message: recommendations.note || (LocalDatabase.isDataReady() ? '' : '学校数据库尚未填充')
            }
          };
        });
      })
      .then(function (result) {
        window.ResultView.render(result);
      })
      .catch(function (err) {
        showFormError(err.message || '生成失败，请稍后重试');
      })
      .finally(function () {
        setLoading(false);
      });
  });

  function formSectionScroll() {
    document.getElementById('form-section').scrollIntoView({ behavior: 'smooth' });
  }

  var datalist = document.createElement('datalist');
  datalist.id = 'research-field-list';
  datalist.innerHTML = RESEARCH_FIELDS.map(function (f) { return '<option value="' + esc(f) + '">'; }).join('');
  document.body.appendChild(datalist);

  document.getElementById('add-english').addEventListener('click', addEnglishRow);
  document.getElementById('add-competition').addEventListener('click', addCompetitionRow);
  document.getElementById('add-research').addEventListener('click', addResearchRow);

  renderRegionChips();
  addEnglishRow();
  addCompetitionRow();
  addResearchRow();
})();