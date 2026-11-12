# -*- coding: utf-8 -*-
"""校验 xuekepinggu 数据：格式检查 + 与 subject_eval.py 原表对比"""
import json, io, sys
sys.path.insert(0, '.')
from subject_eval import CS, EE, ICT, SE, CTRL, ECON, CLIN, BASIC_MED, eval_grade

with io.open('raw_data/xuekepinggu_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)['data']

# 1. v5 eval_result 格式检查
print('=== 第五轮 eval_result 格式样本 ===')
for nm in ['清华大学', '浙江大学']:
    d = data[nm]
    for row in d['v5'][:5]:
        print(nm, row['subject_name'], '->', repr(row['eval_result']))

# 2. 与原表对比（第四轮）：抽查 8 个学科
my_tables = {'计算机科学与技术': CS, '电子科学与技术': EE, '信息与通信工程': ICT, '软件工程': SE,
             '控制科学与工程': CTRL, '应用经济学': ECON, '临床医学': CLIN, '基础医学': BASIC_MED}

print()
print('=== 第四轮数据一致性抽查（我的表 vs 站点）===')
mismatch, agree, only_site = 0, 0, 0
for subj, table in my_tables.items():
    for grade, colleges in table.items():
        for c in colleges:
            if c not in data:
                continue
            site = {r['subject_name']: r['eval_result'] for r in data[c]['v4']}
            if subj in site:
                if site[subj] == grade:
                    agree += 1
                else:
                    mismatch += 1
                    print('[不一致] %s %s: 我的=%s 站点=%s' % (c, subj, grade, site[subj]))
            else:
                only_site += 1
print('一致:', agree, '| 不一致:', mismatch, '| 站点缺此学科:', only_site)

# 3. 站点能补全的原缺口数量
print()
print('=== 站点可补全的学校级缺口统计 ===')
with io.open('raw_data/eval_gaps.json', 'r', encoding='utf-8') as f:
    gaps = json.load(f)['school_gaps']
fillable, unfillable = 0, 0
for school, subjects in gaps.items():
    if school not in data:
        unfillable += len(subjects)
        continue
    site = {r['subject_name']: r['eval_result'] for r in data[school]['v4']}
    for s in subjects:
        if s in site:
            fillable += 1
        else:
            unfillable += 1
            print('[站点也无] %s %s' % (school, s))
print('可补全:', fillable, '| 不可补全（保留未查到）:', unfillable)