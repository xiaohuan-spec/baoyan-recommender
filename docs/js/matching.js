/*
 * 匹配模块（前后端单份同构）—— 稳冲保分档算法
 *
 * 把用户评分算法的得分（score.total，0-100）与学校数据库各专业的
 * difficulty（录取难度系数，0-100，来自 baoyan-crawler 采集数据）对比：
 *   gap = score.total - difficulty
 *   gap > 5            -> safety（保，得分明显高于难度）
 *   -5 <= gap <= 5     -> stable（稳，与难度基本持平）
 *   -15 <= gap < -5    -> reach（冲，难度高于得分但值得尝试；差距超过 15 分不推荐）
 *
 * 概率用 sigmoid 把分差映射为 1-99 的百分比（gap=0 为 50%），
 * 仅为基于分差的粗略估计，不是真实录取概率。
 *
 * 意向专业匹配（可选传入 majorRelations 配置时启用扩展）：
 *   - 直接匹配：意向专业规范化到标准专业后，用标准名 + 其别名匹配（tier 0）
 *   - 关联匹配：标准专业的相关专业及其别名也纳入候选（tier 1，同分差时排在直接匹配之后）
 *   例：意向「信息与通信工程」-> 通信工程 -> 直接命中同名专业，关联命中「电子信息」等专硕
 *   全部不匹配时回退为全部专业并给出 note 提示。
 *
 * 输入：
 *   - score:          scoring.calculateScore 的返回值（total 为 null 表示评分待确认）
 *   - schools:        database.getSchools 的返回值（docs/data/schools.json 全量）
 *   - profile:        规范化后的用户信息（intendedMajor / intendedRegions）
 *   - majorRelations: 可选，docs/data/scoring/major_relations.json（专业关系配置）
 *
 * 输出：
 *   {
 *     reach: [...], stable: [...], safety: [...],
 *     note: '提示信息（无则为空字符串）'
 *   }
 * 每条：{ name, region, major, probability, remark, difficulty, gap }
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.LocalMatching = api;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var STABLE_BAND = 5;
  var REACH_LIMIT = 15;
  var MAX_PER_BUCKET = 2;
  var SIGMOID_K = 0.18;

  var REGION_ALIASES = {
    '广州': '广东', '深圳': '广东', '广东（其他）': '广东'
  };

  function normalizeRegion(region) {
    return REGION_ALIASES[region] || region;
  }

  function splitKeywords(text) {
    return String(text || '').split(/[/,，;；、\s]+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function expandKeywords(text, majorRelations) {
    var base = splitKeywords(text);
    var direct = base.slice();
    var related = [];
    if (!majorRelations || !majorRelations.majors) return { direct: direct, related: related };
    base.forEach(function (k) {
      for (var std in majorRelations.majors) {
        if (!Object.prototype.hasOwnProperty.call(majorRelations.majors, std)) continue;
        var info = majorRelations.majors[std];
        var isDirect = k === std || (info.aliases || []).indexOf(k) >= 0 ||
          std.indexOf(k) >= 0 || k.indexOf(std) >= 0;
        if (!isDirect) continue;
        [std].concat(info.aliases || []).forEach(function (n) {
          if (direct.indexOf(n) < 0) direct.push(n);
        });
        (info.related || []).forEach(function (r) {
          if (related.indexOf(r) < 0) related.push(r);
          var ri = majorRelations.majors[r];
          if (ri) {
            (ri.aliases || []).forEach(function (a) {
              if (related.indexOf(a) < 0) related.push(a);
            });
          }
        });
      }
    });
    return { direct: direct, related: related };
  }

  function matchTier(majorName, kw) {
    var i;
    for (i = 0; i < kw.direct.length; i++) {
      if (majorName.indexOf(kw.direct[i]) >= 0 || kw.direct[i].indexOf(majorName) >= 0) return 0;
    }
    for (i = 0; i < kw.related.length; i++) {
      if (majorName.indexOf(kw.related[i]) >= 0 || kw.related[i].indexOf(majorName) >= 0) return 1;
    }
    return -1;
  }

  function estimateProbability(gap) {
    var p = 100 / (1 + Math.exp(-SIGMOID_K * gap));
    return Math.max(1, Math.min(99, Math.round(p)));
  }

  function compareByKey(a, b) {
    if (a.matchTier !== b.matchTier) return a.matchTier - b.matchTier;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    if (a.major !== b.major) return a.major < b.major ? -1 : 1;
    return 0;
  }

  function sortBucket(list, direction) {
    return list.slice().sort(function (a, b) {
      if (a.gap !== b.gap) return (a.gap - b.gap) * direction;
      return compareByKey(a, b);
    }).slice(0, MAX_PER_BUCKET);
  }

  function collect(schools, regions, total) {
    var list = [];
    (schools || []).forEach(function (school) {
      if (regions.length && regions.indexOf(normalizeRegion(school.region)) < 0) return;
      (school.majors || []).forEach(function (m) {
        list.push({
          name: school.name,
          region: school.region,
          major: m.name,
          probability: null,
          remark: m.remark || '',
          difficulty: m.difficulty,
          matchTier: 0,
          gap: Math.round((total - m.difficulty) * 100) / 100
        });
      });
    });
    return list;
  }

  function matchSchools(score, schools, profile, majorRelations) {
    profile = profile || {};
    var empty = { reach: [], stable: [], safety: [], note: '' };
    var total = score && typeof score.total === 'number' ? score.total : null;
    if (total === null) {
      empty.note = '评分信息待确认，补全后才能生成稳冲保推荐';
      return empty;
    }

    var regions = (profile.intendedRegions || []).map(normalizeRegion);
    var kw = expandKeywords(profile.intendedMajor, majorRelations);
    var hasIntent = kw.direct.length > 0;

    var candidates = [];
    var majorFiltered = 0;
    (schools || []).forEach(function (school) {
      if (regions.length && regions.indexOf(normalizeRegion(school.region)) < 0) return;
      (school.majors || []).forEach(function (m) {
        var tier = hasIntent ? matchTier(m.name, kw) : 0;
        if (tier < 0) return;
        majorFiltered++;
        candidates.push({
          name: school.name,
          region: school.region,
          major: m.name,
          probability: null,
          remark: m.remark || '',
          difficulty: m.difficulty,
          matchTier: tier,
          gap: Math.round((total - m.difficulty) * 100) / 100
        });
      });
    });

    var note = '';
    if (hasIntent && majorFiltered === 0) {
      candidates = collect(schools, regions, total);
      note = '意向专业「' + profile.intendedMajor + '」未匹配到数据库专业，已展示全部专业，可尝试更换关键词';
    }

    var reach = [], stable = [], safety = [];
    candidates.forEach(function (c) {
      c.probability = estimateProbability(c.gap);
      if (c.gap > STABLE_BAND) {
        safety.push(c);
      } else if (c.gap >= -STABLE_BAND) {
        stable.push(c);
      } else if (c.gap >= -REACH_LIMIT) {
        reach.push(c);
      }
    });

    return {
      reach: sortBucket(reach, -1),
      stable: sortBucket(stable, -1),
      safety: sortBucket(safety, 1),
      note: note
    };
  }

  return { matchSchools: matchSchools };
});