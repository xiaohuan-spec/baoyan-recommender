# -*- coding: utf-8 -*-
"""保研院校资料库生成器：读取采集数据 -> 打分 -> 生成 txt + JSON"""
import json, io, os, re
from subject_eval import eval_grade, region_bonus, base_score, GRADE_BONUS, supp_lookup_major_detail, supp_round, base_eval_grade

OUT_DIR = 'baoyan_db'
os.makedirs(OUT_DIR, exist_ok=True)

def loadj(path):
    with io.open(path, 'r', encoding='utf-8') as f:
        d = json.load(f)
    return json.loads(d) if isinstance(d, str) else d

colleges_full = loadj('raw_data/colleges_full.json')['data']
academies = loadj('raw_data/academies_clean.json')
articles = loadj('raw_data/articles_final.json')

provinces = loadj('raw_data/colleges_clean.json')['provinces']
prov_map = {int(k): v for k, v in provinces.items()} if isinstance(provinces, dict) else {p['id']: p['name'] for p in provinces}

# UI 列表页采集的招生人数（保研信息网院校列表展示值）
enroll_map = {
    '清华大学': 3703, '北京大学': 3605, '浙江大学': 6175, '上海交通大学': 4814, '复旦大学': 4525,
    '南京大学': 3120, '中国科学技术大学': 3229, '中国科学院大学': 5600, '华中科技大学': 3738,
    '哈尔滨工业大学': 2682, '武汉大学': 3125, '西安交通大学': 3250, '中山大学': 2600, '四川大学': 3056,
    '国防科技大学': 0, '北京航空航天大学': 3187, '东南大学': 3112, '北京理工大学': 0, '同济大学': 2766,
    '中国人民大学': 1990, '北京师范大学': 2038, '南开大学': 0, '天津大学': 2674, '北京协和医学院': 955,
    '山东大学': 3304, '厦门大学': 2402, '中南大学': 2683, '西北工业大学': 2451, '华南理工大学': 2791,
    '电子科技大学': 2620, '吉林大学': 2527, '北京邮电大学': 1537, '湖南大学': 0, '华东师范大学': 2025,
    '大连理工大学': 0, '重庆大学': 0, '上海财经大学': 0, '东北大学': 0, '西安电子科技大学': 0,
    '北京科技大学': 0, '南京理工大学': 0, '南京航空航天大学': 0, '苏州大学': 0, '北京交通大学': 0,
    '华东理工大学': 0, '南方科技大学': 0, '上海科技大学': 702, '首都医科大学': 0, '中央财经大学': 0,
    '南京医科大学': 0, '南方医科大学': 0,
}

DIRECTIONS = {
    '计算机': ['计算机', '软件', '网安', '网络安全', '网络空间', '大数据', '数据科学', '交叉信息'],
    '电子信息': ['电子', '通信', '集成电路', '微电子', '光电', '信息工程', '信息技术'],
    '人工智能': ['人工智能', '智能科学', '智能', '自动化', '控制', '机器人'],
    '金融': ['金融', '经济', '财政', '税务', '会计', '保险', '统计'],
    '医学': ['医学', '临床', '药学', '公共卫生', '护理', '口腔', '医院', '基础医学', '生命科学'],
}

SUBJ_MAP = [
    (['人工智能', '智能科学与技术'], '计算机科学与技术'),
    (['计算机', '软件', '网络空间安全', '网络安全', '大数据', '数据科学', '交叉信息'], '计算机科学与技术'),
    (['软件工程'], '软件工程'),
    (['集成电路', '微电子', '电子科学与技术', '电子科学', '电子信息科学与技术'], '电子科学与技术'),
    (['信息与通信', '通信与信息', '通信工程', '通信', '电子信息', '光电信息'], '信息与通信工程'),
    (['自动化', '控制科学与工程', '控制工程', '机器人'], '控制科学与工程'),
    (['金融', '金融学', '金融工程', '应用经济学', '经济学', '国际商务', '税务', '保险', '财政'], '应用经济学'),
    (['临床医学', '临床'], '临床医学'),
    (['基础医学'], '基础医学'),
]

def classify_direction(academy, major):
    for src in (major or ''), (academy or ''):
        for d, kws in DIRECTIONS.items():
            for kw in kws:
                if kw in src:
                    return d
    return None

def subject_of(major):
    m = major or ''
    for kws, subj in SUBJ_MAP:
        for kw in kws:
            if kw in m:
                return subj
    return None

def fmt_time(s, e):
    if s or e:
        return (s or '?').split(' ')[0] + ' ~ ' + (e or '?').split(' ')[0]
    return None

summary = []
log_lines = []

for c in colleges_full:
    name = c['name']
    region = prov_map.get(c['province_id'], '?')
    tags = (c.get('tags') or '').replace(' ', '')
    bs, level = base_score(tags)
    rb = region_bonus(region)
    ranks = (c.get('ranks') or '').split(',')
    rank_names = ['保研网综合', '软科综合', 'QS世界', 'US世界', '校友会', '人气值']
    rank_str = ' / '.join('%s:%s名' % (rank_names[i], ranks[i]) for i in range(min(len(ranks), 6)) if ranks[i].strip())

    ac_list = academies.get(name, [])
    ac_names = [a.get('name', '').replace('\t', '').strip() for a in ac_list]

    # 从文章中提取相关方向的专业目录
    art_list = articles.get(name, [])
    major_entries = {}
    for a in art_list:
        acad = (a.get('academy') or '').replace('\t', '').strip()
        major = (a.get('major') or '').strip()
        if not major or major == '全部专业':
            continue
        direction = classify_direction(acad, major)
        if not direction:
            continue
        for mj in re.split(r'[,，、;；]', major):
            mj = mj.strip()
            if not mj:
                continue
            key = (acad, mj)
            if key not in major_entries:
                major_entries[key] = {
                    'academy': acad, 'major': mj, 'direction': direction,
                    'sign_up': fmt_time(a.get('sign_up_start'), a.get('sign_up_end')),
                    'activity': fmt_time(a.get('start_time'), a.get('end_time')),
                    'tags': (a.get('tags') or '').strip(),
                    'rule': (a.get('rule') or '').strip(),
                    'year': a.get('year'),
                }
            else:
                t = fmt_time(a.get('sign_up_start'), a.get('sign_up_end'))
                if t and not major_entries[key]['sign_up']:
                    major_entries[key]['sign_up'] = t

    # 若文章无专业条目，则从学院设置推断
    if not major_entries:
        for ac in ac_names:
            d = classify_direction(ac, '')
            if d:
                major_entries[(ac, d + '类')] = {
                    'academy': ac, 'major': d + '类相关专业', 'direction': d,
                    'sign_up': None, 'activity': None, 'tags': '', 'rule': '', 'year': None,
                    'inferred': True,
                }

    # 按专业名聚合（同名专业合并学院信息，保留最新报名时间）
    agg = {}
    for e in major_entries.values():
        key = e['major']
        if key not in agg:
            agg[key] = dict(e)
            agg[key]['academies'] = [e['academy']] if e['academy'] else []
        else:
            if e['academy'] and e['academy'] not in agg[key]['academies']:
                agg[key]['academies'].append(e['academy'])
            if e.get('sign_up') and not agg[key].get('sign_up'):
                agg[key]['sign_up'] = e['sign_up']
            if e.get('tags') and not agg[key].get('tags'):
                agg[key]['tags'] = e['tags']
            if e.get('rule') and not agg[key].get('rule'):
                agg[key]['rule'] = e['rule']

    # 每方向最多保留 6 个专业（优先：有报名时间 > 有标签）
    by_dir = {}
    for e in agg.values():
        by_dir.setdefault(e['direction'], []).append(e)
    selected = []
    for d in DIRECTIONS:
        lst = by_dir.get(d, [])
        lst.sort(key=lambda x: (0 if x.get('sign_up') else 1, 0 if x.get('tags') else 1))
        for e in lst[:6]:
            e['academy'] = '、'.join(e['academies'][:3])
            if len(e['academies']) > 3:
                e['academy'] += '等'
            selected.append(e)

    # 构造专业列表（按方向排序）
    entries = sorted(selected, key=lambda e: list(DIRECTIONS.keys()).index(e['direction']))

    majors_json = []
    for e in entries:
        subj = subject_of(e['major']) or subject_of(e['academy'])
        grade = eval_grade(name, subj) if subj else None
        src = 'base'
        rnd = None
        if not grade:
            d = supp_lookup_major_detail(name, e['major'])
            if d:
                grade, rnd = d
                src = 'site'
        bonus = GRADE_BONUS.get(grade, 0) if grade else 0
        diff = bs + bonus + rb
        remarks = []
        if e.get('sign_up'):
            remarks.append('报名时间%s' % e['sign_up'])
        if e.get('tags'):
            remarks.append(e['tags'])
        if e.get('rule'):
            remarks.append(e['rule'])
        if not grade:
            remarks.append('学科评估等级【信息未查到】')
        elif src == 'site':
            remarks.append('学科评估等级%s（xuekepinggu.cn第%d轮数据补全）' % (grade, rnd or 4))
        if e.get('inferred'):
            remarks.append('专业目录基于学院设置推断，明细需登录本站查看')
        majors_json.append({
            'name': e['major'],
            'difficulty': diff,
            'remark': '；'.join(remarks) if remarks else None,
            '_academy': e['academy'],
            '_direction': e['direction'],
            '_grade': grade,
            '_src': src,
            '_round': rnd,
            '_breakdown': '基础%d+学科%s+%d+地域%s+%d' % (bs, (grade or '未知'), bonus, region, rb),
        })

    # 夏令营最新通知（含"夏令营"标签的文章，取最近3条）
    camp = [a for a in art_list if '夏令营' in (a.get('tags') or '') or '夏令营' in (a.get('title') or '')]
    camp.sort(key=lambda a: (a.get('sign_up_start') or ''), reverse=True)
    camp_notes = []
    for a in camp[:3]:
        t = fmt_time(a.get('sign_up_start'), a.get('sign_up_end'))
        camp_notes.append('%s：%s' % ((a.get('academy') or a.get('title', ''))[:30], t or '时间未公布'))

    # ===== 生成 txt =====
    L = []
    L.append('=' * 78)
    L.append('保研院校资料库 —— %s' % name)
    L.append('=' * 78)
    L.append('数据来源：保研信息网（http://pc.baoyanwang.com.cn/）')
    L.append('说明：未登录状态采集；标注【信息未查到】的字段为站点未公开或需登录数据')
    L.append('')
    L.append('一、学校基础信息')
    L.append('-' * 78)
    L.append('校名：%s' % name)
    if c.get('en_name'):
        L.append('英文名：%s' % c['en_name'])
    L.append('所在省份/地区：%s' % region)
    L.append('官方标签：%s' % (c.get('tags') or '【信息未查到】'))
    if rank_str:
        L.append('排名：%s' % rank_str)
    eq = enroll_map.get(name)
    L.append('招生人数（站点收录）：%s' % (eq if eq else '未收录【信息未查到】'))
    if c.get('phone'):
        L.append('招生电话：%s' % c['phone'])
    L.append('学院设置数：%d个' % len(ac_names))
    if c.get('info'):
        L.append('学校概括：%s' % c['info'][:300])
    L.append('')
    L.append('二、学校层次')
    L.append('-' * 78)
    levels = []
    if '985' in tags: levels.append('985')
    if '211' in tags: levels.append('211')
    if '双一流' in tags: levels.append('双一流')
    if not levels: levels.append('普通一本')
    L.append('层次：%s' % ' / '.join(levels))
    L.append('基础分：%d（985=75 / 211=65 / 双一流=60 / 普通一本=50）' % bs)
    L.append('地域加分：%d（%s）' % (rb, region))
    L.append('')
    L.append('三、目标学科实力（学科评估等级）')
    L.append('-' * 78)
    L.append('说明：目标站点未公开展示学科评估等级（需登录），以下依据教育部')
    L.append('第四轮学科评估公开结果（2017年学位中心公布，权威公开数据）')
    L.append('缺失项已通过学科评估网（https://xuekepinggu.cn/）四/五轮数据补全，')
    L.append('补全项标注来源；原有等级保持不变；仍无数据的保留【信息未查到】')
    subj_shown = set()
    for mj in majors_json:
        if mj['_direction'] in subj_shown:
            continue
        subj_shown.add(mj['_direction'])
    for subj in ['计算机科学与技术', '软件工程', '电子科学与技术', '信息与通信工程', '控制科学与工程', '应用经济学', '临床医学', '基础医学']:
        g = eval_grade(name, subj)
        if not g:
            L.append('%s：【信息未查到】' % subj)
        else:
            from_base = base_eval_grade(name, subj)
            if from_base:
                L.append('%s：%s' % (subj, g))
            else:
                rnd = supp_round(name, subj)
                if rnd == 5:
                    L.append('%s：%s（第五轮档位，xuekepinggu.cn补全）' % (subj, g))
                else:
                    L.append('%s：%s（xuekepinggu.cn第四轮数据补全）' % (subj, g))
    L.append('')
    L.append('四、接收推免的专业目录（基于站内招生通知/学院设置整理）')
    L.append('-' * 78)
    if majors_json:
        for i, mj in enumerate(majors_json, 1):
            L.append('%d. %s（%s）［%s方向］' % (i, mj['name'], mj['_academy'] or '学院未标注', mj['_direction']))
    else:
        L.append('【信息未查到】（站内未收录该校推免专业目录）')
    L.append('注：完整分专业推免目录（含名额、导师）需登录本站"推免招生"栏目查看')
    L.append('')
    L.append('五、各专业难度分数（difficulty = 基础分 + 学科评估加分 + 地域加分）')
    L.append('-' * 78)
    L.append('专业名称 | 难度分 | 构成 | 备注')
    for mj in majors_json:
        remark = mj['remark'] or ''
        L.append('%s | %d | %s | %s' % (mj['name'], mj['difficulty'], mj['_breakdown'], remark))
    L.append('学科评估加分标准：A+=12 / A=9 / A-=7 / B+=4 / B=2 / B-=1 / C类及以下不加分')
    L.append('')
    L.append('六、备注（夏令营 / 优营政策 / 报考门槛）')
    L.append('-' * 78)
    if camp_notes:
        L.append('夏令营最新通知（站内采集）：')
        for cn in camp_notes:
            L.append('  - %s' % cn)
    else:
        L.append('夏令营开启时间：站内近期未收录该校夏令营通知【信息未查到】')
    L.append('优营政策：需登录查看各院通知详情【信息未查到】')
    L.append('特殊报考门槛：需登录查看各院通知详情【信息未查到】')
    L.append('（本站"推免招生""导师招生""招生数据"等栏目内容均需登录后查看）')

    with io.open(os.path.join(OUT_DIR, name + '.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L))

    # ===== 生成 JSON =====
    jobj = {
        'name': name,
        'region': region,
        'majors': [
            {
                'name': mj['name'],
                'difficulty': mj['difficulty'],
                **({'remark': mj['remark']} if mj['remark'] else {}),
            } for mj in majors_json
        ],
    }
    with io.open(os.path.join(OUT_DIR, name + '.json'), 'w', encoding='utf-8') as f:
        json.dump(jobj, f, ensure_ascii=False, indent=2)

    summary.append({
        'name': name, 'region': region, 'level': ' / '.join(levels),
        'majors': len(majors_json),
        'avg_difficulty': round(sum(m['difficulty'] for m in majors_json) / len(majors_json), 1) if majors_json else 0,
        'max_difficulty': max((m['difficulty'] for m in majors_json), default=0),
        'articles': len(art_list),
        'camps': len(camp),
    })
    log_lines.append('[OK] %s（%s，%s）：%d个专业，%d篇站内通知' % (name, region, levels[0], len(majors_json), len(art_list)))

# 汇总清单
with io.open(os.path.join(OUT_DIR, '汇总清单.txt'), 'w', encoding='utf-8') as f:
    f.write('保研院校资料库汇总清单\n')
    f.write('=' * 78 + '\n')
    f.write('目标站点：http://pc.baoyanwang.com.cn/（保研信息网）\n')
    f.write('采集范围：50所国内知名院校，覆盖计算机/电子信息/人工智能/金融/医学方向\n')
    f.write('难度公式：difficulty = 基础分(985=75/211=65/双一流=60) + 学科评估加分(A+=12/A=9/A-=7/B+=4/B=2) + 地域加分(京沪+5/粤苏浙+4/鄂陕川津闽+3/其他+1~2)\n\n')
    f.write('%-4s %-14s %-6s %-22s %-10s %-8s %-8s\n' % ('序号', '学校名称', '省份', '层次', '专业数', '平均难度', '最高难度'))
    f.write('-' * 78 + '\n')
    for i, s in enumerate(summary, 1):
        f.write('%-4d %-14s %-6s %-22s %-10d %-10.1f %-8d\n' % (i, s['name'], s['region'], s['level'], s['majors'], s['avg_difficulty'], s['max_difficulty']))
    f.write('\n详细字段见各校【学校名称.txt】与同名JSON文件。\n')

# 采集日志
with io.open(os.path.join(OUT_DIR, '采集日志.txt'), 'w', encoding='utf-8') as f:
    f.write('保研院校资料库采集日志\n')
    f.write('=' * 78 + '\n')
    f.write('采集方式：Playwright 渲染 pc.baoyanwang.com.cn（Vue SPA），站点数据接口经浏览器上下文签名调用\n')
    f.write('采集结果：成功 %d / 50 所院校\n\n' % len(summary))
    for l in log_lines:
        f.write(l + '\n')
    f.write('\n限制说明：\n')
    f.write('- "推免招生/导师招生/招生数据/保研天眼"栏目及学院详情页需登录，未采集（专业目录基于公开招生通知与学院设置整理）\n')
    f.write('- 学科评估等级：目标站点未公开，采用教育部第四轮学科评估公开数据（权威来源）\n')
    f.write('- 2026-11-06 补全：经学科评估网（https://xuekepinggu.cn/）查询50校四/五轮学科评估数据，\n')
    f.write('  仅用于补全标记【信息未查到】的学科评估等级（47校查到数据；国科大/南科大/上科大未参评，\n')
    f.write('  保留原标记）；原有等级一律保持不变；补全项在txt/json中标注来源与轮次\n')
    f.write('- 优营政策、特殊报考门槛：需登录查看通知详情，标注【信息未查到】\n')
    f.write('- 站内未收录夏令营通知的学校，夏令营时间标注【信息未查到】\n')

print('生成完成：%d 所院校' % len(summary))
print('txt/json 输出目录：%s/' % OUT_DIR)
for s in summary[:10]:
    print('  %s（%s）：%d个专业，平均难度%.1f' % (s['name'], s['region'], s['majors'], s['avg_difficulty']))