/*
 * 评分算法核心（浏览器 / Node 双端同构，单份实现）
 *
 * 移植自用户自研 Python 评分工程 scripts/baoyan-score/（baoyan_score.zip）：
 *   score_academic.py / score_english.py / score_competition.py /
 *   score_research.py / calculate_total.py —— 计分规则与输出结构保持一致，
 *   规则数据全部来自 docs/data/scoring/ 下三份 JSON 配置（单一数据源）。
 *
 * 本模块不读写文件、不打印：配置由调用方注入。
 *   - 前端：docs/js/scoring.js（fetch 配置后调用本模块）
 *   - 后端：src/services/scoring.js（fs 读同一配置目录后调用本模块）
 *
 * 暴露接口：
 *   buildStudent(profile)                              demo1 表单数据 -> 算法输入
 *   calculateTotal(student, rules, schoolCfg, majorCfg) 算法主体，输出与 Python 版同构
 *   adaptResult(algoResult)                            算法输出 -> demo1 展示契约 { total, breakdown, detail }
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.ScoringCore = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ============ demo1 表单 -> 算法输入的适配层 ============ */

  var COMPETITION_LEVEL_MAP = {
    '国际级': '国家级', '国家级': '国家级', '省级': '省级', '校级': '校级'
  };
  var COMPETITION_PRIZE_MAP = {
    '特等奖': '一等奖', '一等奖': '一等奖', '二等奖': '二等奖', '三等奖': '三等奖'
  };
  var RESEARCH_TYPE_MAP = {
    '期刊论文': '期刊论文', '会议论文': '会议论文', '发明专利': '发明专利',
    '科研项目': '科研项目', '软件著作权': '软件著作权',
    '学术论文': '期刊论文', '专利': '发明专利', '学术会议': '会议论文', '大创项目': '科研项目'
  };

  function currentYear() {
    return new Date().getFullYear();
  }

  function buildStudent(profile) {
    profile = profile || {};

    var english = [];
    if (Array.isArray(profile.english)) {
      profile.english.forEach(function (e) {
        if (!e || !e.type) return;
        english.push({ type: String(e.type).trim().toUpperCase(), score: Number(e.score) });
      });
    } else if (profile.cet6 !== null && profile.cet6 !== undefined && profile.cet6 !== '') {
      english.push({ type: 'CET6', score: Number(profile.cet6) });
    }

    var competitions = (profile.competitions || []).map(function (c) {
      var level = COMPETITION_LEVEL_MAP[c && c.level] || null;
      var prize = COMPETITION_PRIZE_MAP[c && c.award] || null;
      var year = c && c.year ? Math.round(Number(c.year)) : currentYear();
      return {
        event: String((c && c.name) || '').trim(),
        year: year,
        level: level,
        prize: prize,
        raw_level: String((c && c.level) || '').trim(),
        raw_prize: String((c && c.award) || '').trim(),
        unmapped: !level || !prize
      };
    }).filter(function (c) { return c.event; });

    var research = (profile.researches || []).map(function (r, i) {
      var type = RESEARCH_TYPE_MAP[r && r.type] || null;
      return {
        id: 'research-' + (i + 1),
        title: String((r && r.title) || (r && r.description) || '').trim(),
        type: type,
        raw_type: String((r && r.type) || '').trim(),
        status: String((r && r.status) || '').trim(),
        role: String((r && r.role) || '').trim(),
        field: String((r && r.field) || '').trim(),
        unmapped: !type
      };
    }).filter(function (r) { return r.title || r.raw_type || r.field; });

    return {
      name: String(profile.name || ''),
      school_name: String(profile.school || '').trim(),
      undergraduate_major: String(profile.major || '').trim(),
      target_major: String(profile.intendedMajor || profile.major || '').trim(),
      ranking: {
        position: Math.round(Number(profile.rank)),
        total: Math.round(Number(profile.totalStudents))
      },
      english: english,
      competitions: competitions,
      research: research
    };
  }

  /* ============ 以下为 Python 算法的同构移植 ============ */

  function roundScores(value, key) {
    key = key || '';
    if (Array.isArray(value)) {
      return value.map(function (item) { return roundScores(item); });
    }
    if (value && typeof value === 'object') {
      var out = {};
      for (var name in value) {
        if (!Object.prototype.hasOwnProperty.call(value, name)) continue;
        out[name] = roundScores(value[name], name);
      }
      return out;
    }
    if (typeof value === 'number' && (key === 'score' || key.slice(-5) === '_score')) {
      return Math.round(value * 100) / 100;
    }
    return value;
  }

  function interpolate(points, value) {
    if (value <= points[0][0]) return points[0][1];
    for (var i = 1; i < points.length; i++) {
      var lx = points[i - 1][0], ly = points[i - 1][1];
      var rx = points[i][0], ry = points[i][1];
      if (value <= rx) {
        return ly + (value - lx) / (rx - lx) * (ry - ly);
      }
    }
    return points[points.length - 1][1];
  }

  function canonicalMajor(name, majorConfig) {
    for (var standard in majorConfig.majors) {
      if (!Object.prototype.hasOwnProperty.call(majorConfig.majors, standard)) continue;
      var info = majorConfig.majors[standard];
      if (name === standard || (info.aliases || []).indexOf(name) >= 0) return standard;
    }
    return null;
  }

  function percentileText(ratio) {
    return '前 ' + (ratio * 100).toFixed(2) + '%';
  }

  function scoreAcademic(student, rules, schoolConfig, majorConfig) {
    var schoolName = student.school_name;
    var majorName = canonicalMajor(student.undergraduate_major, majorConfig);
    var school = null;
    for (var i = 0; i < schoolConfig.schools.length; i++) {
      var item = schoolConfig.schools[i];
      if (schoolName === item.name || (item.aliases || []).indexOf(schoolName) >= 0) {
        school = item;
        break;
      }
    }
    var rank = student.ranking;
    var ratio = rank.position / rank.total;
    var pending = [];
    if (school === null) {
      pending.push('学校未配置：' + schoolName + '；请补充 school_major_levels.json');
    } else if (majorName === null || !(majorName in school.majors)) {
      pending.push('该校的本科专业未配置：' + student.undergraduate_major);
    }

    if (pending.length) {
      return {
        education: { status: 'pending', score: null, max_score: rules.max_scores.education, reasons: pending },
        ranking: { status: 'pending', score: null, max_score: rules.max_scores.ranking, ratio: ratio,
                   percentile_text: percentileText(ratio), reasons: pending }
      };
    }

    var schoolLevel = school.level;
    var majorLevel = school.majors[majorName];
    var schoolPoints = rules.academic.school_points[schoolLevel];
    var majorPoints = rules.academic.major_points[majorLevel];
    var curveName = schoolLevel + ':' + majorLevel;
    var curve = rules.academic.rank_curves[curveName];
    return {
      education: {
        status: 'ok', score: schoolPoints + majorPoints,
        max_score: rules.max_scores.education,
        school_name: school.name, school_tags: school.tags,
        undergraduate_major: majorName, school_level: schoolLevel, major_level: majorLevel,
        school_points: schoolPoints, major_points: majorPoints,
        reasons: ['学校 ' + schoolLevel + ' 档 ' + schoolPoints + ' 分 + 本科专业 ' + majorLevel + ' 档 ' + majorPoints + ' 分']
      },
      ranking: {
        status: 'ok', score: interpolate(curve, ratio), max_score: rules.max_scores.ranking,
        position: rank.position, total: rank.total, ratio: ratio,
        percentile_text: percentileText(ratio), curve: curveName,
        reasons: ['排名比例 = ' + rank.position + ' / ' + rank.total + '；使用 ' + curveName + ' 曲线，节点之间线性插值']
      }
    };
  }

  function scoreEnglish(exams, rules) {
    var details = [];
    var skipped = [];
    for (var i = 0; i < exams.length; i++) {
      var exam = exams[i];
      var config = rules.english[exam.type];
      if (!config) {
        skipped.push('忽略无法识别的考试类型：' + exam.type);
        continue;
      }
      var points = 0;
      for (var j = 0; j < config.bands.length; j++) {
        if (exam.score >= config.bands[j][0]) points = config.bands[j][1];
      }
      details.push({ type: exam.type, original_score: exam.score, score: points });
    }
    var selected = null;
    for (var k = 0; k < details.length; k++) {
      if (selected === null || details[k].score > selected.score) selected = details[k];
    }
    var reasons = [];
    if (details.length) {
      reasons.push('所有考试分别按分数档位换算，取最高分；不累计');
    } else {
      reasons.push('明确填写无英语成绩，计 0 分');
    }
    if (skipped.length) reasons = skipped.concat(reasons);
    return {
      status: 'ok', score: selected ? selected.score : 0,
      max_score: rules.max_scores.english, selected: selected, items: details,
      reasons: reasons
    };
  }

  function scoreCompetition(awards, rules) {
    var details = [];
    var winners = {};
    for (var i = 0; i < awards.length; i++) {
      var award = awards[i];
      if (award.unmapped) {
        details.push({
          event: award.event, year: award.year,
          level: award.raw_level, prize: award.raw_prize,
          base_score: 0, counted: false, score: 0,
          reason: '该竞赛级别或奖项不在计分表内（当前支持：国家级/省级/校级 × 一/二/三等奖），不计分'
        });
        continue;
      }
      var points = rules.competition[award.level][award.prize];
      var key = award.event.toLowerCase() + '|' + award.year;
      details.push({
        event: award.event, year: award.year, level: award.level, prize: award.prize,
        base_score: points, counted: false, score: 0
      });
      if (!(key in winners) || points > details[winners[key]].base_score) {
        winners[key] = i;
      }
    }
    for (var key2 in winners) {
      if (!Object.prototype.hasOwnProperty.call(winners, key2)) continue;
      var idx = winners[key2];
      details[idx].counted = true;
      details[idx].score = details[idx].base_score;
    }
    for (var m = 0; m < details.length; m++) {
      if (details[m].reason) continue;
      details[m].reason = details[m].counted
        ? '本赛事本年度最高奖项，纳入计分'
        : '同一赛事同一年重复奖项，不重复计分';
    }
    var raw = 0;
    for (var n = 0; n < details.length; n++) raw += details[n].score;
    var cap = rules.max_scores.competition;
    return { status: 'ok', score: Math.min(raw, cap), max_score: cap,
             raw_score: raw, capped: raw > cap, items: details,
             reasons: ['按赛事名称与年度去重后累计，最多 ' + cap + ' 分'] };
  }

  function matchResearch(field, target, majorConfig, rules) {
    var targetName = canonicalMajor(target, majorConfig);
    var fieldInfo = null;
    for (var name in majorConfig.research_fields) {
      if (!Object.prototype.hasOwnProperty.call(majorConfig.research_fields, name)) continue;
      var info = majorConfig.research_fields[name];
      if (field === name || (info.aliases || []).indexOf(field) >= 0) {
        fieldInfo = info;
        break;
      }
    }
    if (targetName === null || fieldInfo === null) return { label: null, factor: null };
    var direct = fieldInfo.majors;
    var label;
    if (direct.indexOf(targetName) >= 0) {
      label = 'direct';
    } else {
      var related = majorConfig.majors[targetName].related || [];
      var overlap = false;
      for (var i = 0; i < related.length; i++) {
        if (direct.indexOf(related[i]) >= 0) { overlap = true; break; }
      }
      label = overlap ? 'related' : 'unrelated';
    }
    return { label: label, factor: rules.research.match_factors[label] };
  }

  function scoreResearch(student, rules, majorConfig) {
    var target = student.target_major || student.undergraduate_major;
    var details = [], pending = [], seen = {};
    for (var i = 0; i < student.research.length; i++) {
      var item = student.research[i];
      if (item.id in seen) {
        details.push({ id: item.id, title: item.title, type: item.raw_type, status: item.status,
                       role: item.role, field: item.field,
                       score: 0, counted: false, reason: '相同成果 ID 已计入，忽略重复记录' });
        continue;
      }
      seen[item.id] = true;
      if (item.unmapped) {
        details.push({ id: item.id, title: item.title, type: item.raw_type, status: item.status,
                       role: item.role, field: item.field,
                       score: 0, counted: false,
                       reason: '该成果类型不在计分表内（支持：期刊论文/会议论文/发明专利/科研项目/软件著作权），不计分' });
        continue;
      }
      var config = rules.research.types[item.type];
      var base = config.base_score;
      var statusFactor = config.status_factors[item.status];
      var contribution = config.role_factors[item.role];
      var detail = { id: item.id, title: item.title, type: item.type, status: item.status,
                     role: item.role, field: item.field,
                     base_score: base, status_factor: statusFactor,
                     contribution_factor: contribution, counted: true };
      if (statusFactor === undefined || contribution === undefined) {
        detail.score = 0;
        detail.match_level = null;
        detail.match_factor = null;
        detail.reason = '成果状态或个人角色未配置，无法计分；请检查填写内容';
        details.push(detail);
        continue;
      }
      if (statusFactor === 0) {
        detail.score = 0;
        detail.match_level = null;
        detail.match_factor = null;
        detail.reason = '当前成果状态不计分';
      } else {
        var match = matchResearch(item.field, target, majorConfig, rules);
        detail.match_level = match.label;
        detail.match_factor = match.factor;
        if (match.factor === null) {
          var reason = '成果 ' + item.id + ' 的研究方向或目标专业未配置，请补充 major_relations.json';
          pending.push(reason);
          detail.score = null;
          detail.reason = reason;
        } else {
          var s = base * statusFactor * contribution * match.factor;
          detail.score = s;
          detail.reason = base + ' × ' + statusFactor + ' × ' + contribution + ' × ' + match.factor + ' = ' + s.toFixed(2);
        }
      }
      details.push(detail);
    }
    var raw = 0;
    for (var j = 0; j < details.length; j++) {
      if (details[j].score !== null && details[j].score !== undefined) raw += details[j].score;
    }
    var cap = rules.max_scores.research;
    var hasPending = pending.length > 0;
    return {
      status: hasPending ? 'pending' : 'ok',
      score: hasPending ? null : Math.min(raw, cap),
      max_score: cap, target_major_used: target,
      raw_score: hasPending ? null : raw, known_items_score: raw,
      capped: hasPending ? null : raw > cap, items: details,
      reasons: hasPending ? pending : ['按成果 ID 去重后累计，最多 ' + cap + ' 分']
    };
  }

  function calculateTotal(student, rules, schoolConfig, majorConfig) {
    var scores = scoreAcademic(student, rules, schoolConfig, majorConfig);
    scores.english = scoreEnglish(student.english, rules);
    scores.competition = scoreCompetition(student.competitions, rules);
    scores.research = scoreResearch(student, rules, majorConfig);

    var pending = [];
    var known = 0;
    var dims = ['education', 'ranking', 'english', 'competition', 'research'];
    for (var i = 0; i < dims.length; i++) {
      var result = scores[dims[i]];
      if (result.status === 'pending') {
        for (var j = 0; j < result.reasons.length; j++) pending.push(result.reasons[j]);
      }
      if (result.score !== null && result.score !== undefined) known += result.score;
    }
    var uniquePending = [];
    for (var k = 0; k < pending.length; k++) {
      if (uniquePending.indexOf(pending[k]) < 0) uniquePending.push(pending[k]);
    }
    var maxTotal = 0;
    for (var dim in rules.max_scores) {
      if (!Object.prototype.hasOwnProperty.call(rules.max_scores, dim)) continue;
      maxTotal += rules.max_scores[dim];
    }
    return roundScores({
      status: uniquePending.length ? 'pending' : 'ok',
      student_name: student.name || '',
      rule_version: rules.version, school_data_version: schoolConfig.version,
      major_data_version: majorConfig.version,
      total_score: uniquePending.length ? null : known, max_score: maxTotal,
      known_dimensions_score: known, scores: scores,
      pending_reasons: uniquePending,
      notices: [rules.notice, schoolConfig.notice, majorConfig.notice,
                '本结果用于综合评价，不是录取概率；不判断推免资格或目标项目的硬性申请门槛。']
    });
  }

  /* ============ 算法输出 -> demo1 展示契约 ============ */

  function adaptResult(algo) {
    var s = algo.scores || {};
    return {
      total: algo.total_score,
      breakdown: {
        school: s.education ? s.education.score : null,
        ranking: s.ranking ? s.ranking.score : null,
        english: s.english ? s.english.score : null,
        competition: s.competition ? s.competition.score : null,
        research: s.research ? s.research.score : null
      },
      placeholder: false,
      detail: algo
    };
  }

  return {
    buildStudent: buildStudent,
    calculateTotal: calculateTotal,
    adaptResult: adaptResult
  };
});