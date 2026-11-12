# -*- coding: utf-8 -*-
"""生成 50 校 + 全国前 200 高校评分档次配置 docs/data/scoring/school_major_levels.json。

学校名单与档次来源：
- 基础名单：baoyan-crawler/raw_data/colleges_clean.json（保研网院校库 169 所，含官方标签）
- 手动补充：EXTRA_SCHOOLS（保研网库未收录但保研场景常见的高校，含中北大学等，
  标签依据 2022 年第二轮"双一流"建设高校名单及公认一本层次）
- 学校 level（A-E）：985 -> A，211 -> B，双一流 -> C，其余 -> D
- 该校专业档次（强/较强/普通）：学科评估 A+/A -> 强，A-/B+/B -> 较强，
  B- 及以下或未查到 -> 普通（保守默认，可在 JSON 中手动上调）
- 前 6 所为 baoyan_score 原版自带示例学校（demo 数据），保留供样例测试
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CRAWLER = ROOT / 'scripts' / 'baoyan-crawler'
sys.path.insert(0, str(CRAWLER))

from subject_eval import eval_grade  # noqa: E402

GRADE_TO_LEVEL = {'A+': '强', 'A': '强', 'A-': '较强', 'B+': '较强', 'B': '较强'}

MAJOR_TO_SUBJECTS = {
    '计算机科学与技术': ['计算机科学与技术'],
    '软件工程': ['软件工程'],
    '电子信息工程': ['电子科学与技术', '信息与通信工程'],
    '人工智能': ['控制科学与工程'],
    '统计学': ['统计学'],
    '机械工程': ['机械工程'],
    '经济学': ['应用经济学'],
    '汉语言文学': ['中国语言文学'],
    '通信工程': ['信息与通信工程'],
    '电子科学与技术': ['电子科学与技术'],
    '光电信息科学与工程': ['光学工程', '电子科学与技术'],
    '电气工程': ['电气工程'],
    '自动化': ['控制科学与工程'],
    '网络空间安全': ['网络空间安全'],
    '网络工程': ['计算机科学与技术', '软件工程'],
    '物联网工程': ['计算机科学与技术', '控制科学与工程'],
    '数据科学与大数据技术': ['计算机科学与技术', '统计学'],
    '机械设计制造及其自动化': ['机械工程'],
    '车辆工程': ['机械工程'],
    '材料科学与工程': ['材料科学与工程'],
    '土木工程': ['土木工程'],
    '建筑学': ['建筑学'],
    '化学工程与工艺': ['化学工程与技术'],
    '环境工程': ['环境科学与工程'],
    '能源与动力工程': ['动力工程及工程热物理'],
    '生物工程': ['生物工程', '生物学'],
    '生物医学工程': ['生物医学工程'],
    '数学与应用数学': ['数学'],
    '信息与计算科学': ['数学'],
    '物理学': ['物理学'],
    '化学': ['化学'],
    '生物技术': ['生物学'],
    '金融学': ['应用经济学'],
    '国际经济与贸易': ['应用经济学'],
    '会计学': ['工商管理'],
    '工商管理': ['工商管理'],
    '管理科学与工程': ['管理科学与工程'],
    '公共管理': ['公共管理'],
    '临床医学': ['临床医学'],
    '基础医学': ['基础医学'],
    '口腔医学': ['口腔医学'],
    '药学': ['药学'],
    '护理学': ['护理学'],
    '英语': ['外国语言文学'],
    '法学': ['法学'],
    '新闻传播学': ['新闻传播学'],
    '教育学': ['教育学'],
    '心理学': ['心理学'],
}

GRADE_ORDER = {'A+': 0, 'A': 1, 'A-': 2, 'B+': 3, 'B': 4, 'B-': 5, 'C+': 6, 'C': 7, 'C-': 8, 'D': 9}

EXTRA_SCHOOLS = {
    '山西大学': '双一流',
    '南京邮电大学': '双一流',
    '南京信息工程大学': '双一流',
    '南京林业大学': '双一流',
    '湘潭大学': '双一流',
    '河南大学': '双一流',
    '天津工业大学': '双一流',
    '宁波大学': '双一流',
    '上海海洋大学': '双一流',
    '成都理工大学': '双一流',
    '西南石油大学': '双一流',
    '广州医科大学': '双一流',
    '中北大学': '普通一本',
    '燕山大学': '普通一本',
    '江苏大学': '普通一本',
    '扬州大学': '普通一本',
    '南京工业大学': '普通一本',
    '浙江工业大学': '普通一本',
    '杭州电子科技大学': '普通一本',
    '浙江理工大学': '普通一本',
    '广东工业大学': '普通一本',
    '深圳大学': '普通一本',
    '上海理工大学': '普通一本',
    '上海师范大学': '普通一本',
    '天津理工大学': '普通一本',
    '河北大学': '普通一本',
    '长春理工大学': '普通一本',
    '哈尔滨理工大学': '普通一本',
    '沈阳工业大学': '普通一本',
    '福建师范大学': '普通一本',
    '山东科技大学': '普通一本',
    '青岛大学': '普通一本',
    '济南大学': '普通一本',
    '湖北大学': '普通一本',
    '武汉科技大学': '普通一本',
    '长沙理工大学': '普通一本',
    '重庆邮电大学': '普通一本',
    '西安建筑科技大学': '普通一本',
    '西安理工大学': '普通一本',
    '昆明理工大学': '普通一本',
    '兰州交通大学': '普通一本',
    '兰州理工大学': '普通一本',
}


def school_level(tags):
    t = tags or ''
    if '985' in t:
        return 'A'
    if '211' in t:
        return 'B'
    if '双一流' in t:
        return 'C'
    return 'D'


def tag_list(tags):
    return [t for t in ('985', '211', '双一流') if t in (tags or '')] or ['普通一本']


def major_levels(name):
    levels = {}
    for major, subjects in MAJOR_TO_SUBJECTS.items():
        best = None
        for subject in subjects:
            g = eval_grade(name, subject)
            if g and (best is None or GRADE_ORDER.get(g, 99) < GRADE_ORDER.get(best, 99)):
                best = g
        levels[major] = GRADE_TO_LEVEL.get(best, '普通')
    return levels


def main():
    raw = json.loads((CRAWLER / 'raw_data' / 'colleges_clean.json').read_text(encoding='utf-8'))
    merged = {}
    for c in raw['colleges']:
        name = (c.get('name') or '').strip()
        if name:
            merged[name] = (c.get('tags') or '').replace(' ', '')
    for name, tags in EXTRA_SCHOOLS.items():
        if name not in merged:
            merged[name] = tags

    schools = []
    for name in sorted(merged.keys()):
        tags = merged[name]
        schools.append({
            'name': name,
            'aliases': [],
            'tags': tag_list(tags),
            'level': school_level(tags),
            'majors': major_levels(name),
        })

    demo = json.loads((ROOT / 'scripts' / 'baoyan-score' / 'config' / 'school_major_levels.json').read_text(encoding='utf-8'))
    output = {
        'version': 'generated-2026-11-11-v2',
        'notice': '本配置由 scripts/gen-school-levels.py 生成：学校名单为保研网院校库 169 所 + 手动补充 42 所常见保研高校（约 200 所）；'
                  'level 按官方标签推导（985=A / 211=B / 双一流=C / 其余=D）；'
                  '专业档次按学科评估推导（A+/A=强，A-/B+/B=较强），未查到评估等级的专业按「普通」保守计分，'
                  '如与实际不符可直接在本文件中手动调整对应学校的 level 或 majors。前 6 所示例学校为演示数据。',
        'schools': demo['schools'] + schools,
    }

    out_path = ROOT / 'docs' / 'data' / 'scoring' / 'school_major_levels.json'
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

    by_level = {}
    for s in schools:
        by_level[s['level']] = by_level.get(s['level'], 0) + 1
    print('学校数:', len(schools), '| 档次分布:', by_level)
    print('含中北大学:', any(s['name'] == '中北大学' for s in schools))
    print('已写入:', out_path)


if __name__ == '__main__':
    main()