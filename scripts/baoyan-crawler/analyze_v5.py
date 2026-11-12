# -*- coding: utf-8 -*-
"""统计 v5 对缺口的额外补全能力 + 专业级学科映射可补全性"""
import json, io, re

with io.open('raw_data/xuekepinggu_results.json', 'r', encoding='utf-8') as f:
    data = json.load(f)['data']
with io.open('raw_data/eval_gaps.json', 'r', encoding='utf-8') as f:
    gaps = json.load(f)

# 1. 学校级缺口：v4 补不到但 v5 能补的
v4_only, v5_extra, none = 0, 0, 0
v5_extra_list = []
for school, subjects in gaps['school_gaps'].items():
    if school not in data:
        none += len(subjects)
        continue
    s4 = {r['subject_name'] for r in data[school]['v4']}
    s5 = {r['subject_name'] for r in data[school]['v5']}
    for s in subjects:
        if s in s4:
            v4_only += 1
        elif s in s5:
            v5_extra += 1
            v5_extra_list.append('%s %s' % (school, s))
        else:
            none += 1
print('学校级缺口: v4可补=%d, v5额外可补=%d, 均无=%d' % (v4_only, v5_extra, none))
print('v5 额外补全明细（前30）:', v5_extra_list[:30])

# 2. 站点全部学科名清单（跨校聚合）
all_subjects = set()
for nm in data:
    for r in data[nm]['v4'] + data[nm]['v5']:
        all_subjects.add(r['subject_name'])
print()
print('站点学科名总数:', len(all_subjects))
print(sorted(all_subjects))

# 3. 专业级缺口涉及的学科名（清洗后）能否匹配站点学科名
def clean_major(m):
    return re.sub(r'（.*?）|\(.*?\)', '', m).strip()

from collections import Counter
cnt = Counter()
for school, lst in gaps['major_gaps'].items():
    for m in lst:
        cnt[m] += 1

hit, miss = 0, []
for m in cnt:
    cm = clean_major(m)
    if cm in all_subjects:
        hit += cnt[m]
    else:
        miss.append(m)
print()
print('专业级（按出现次数）: 可精确匹配学科名=%d, 无法匹配=%d' % (hit, sum(cnt[m] for m in miss)))
print('无法匹配的专业名:', miss)