# -*- coding: utf-8 -*-
"""扫描 baoyan_db/*.txt，统计各校标记【信息未查到】的学科评估缺口"""
import io, os, re, json

gaps = {}
major_gaps = {}

for fn in sorted(os.listdir('baoyan_db')):
    if not fn.endswith('.txt') or fn in ('汇总清单.txt', '采集日志.txt'):
        continue
    name = fn[:-4]
    with io.open(os.path.join('baoyan_db', fn), 'r', encoding='utf-8') as f:
        text = f.read()
    m = re.search(r'三、目标学科实力（学科评估等级）\n-+\n(.*?)\n\n', text, re.S)
    if m:
        section = m.group(1)
        missing = re.findall(r'^(.+?)：【信息未查到】$', section, re.M)
        if missing:
            gaps[name] = missing

    jf = os.path.join('baoyan_db', name + '.json')
    if os.path.exists(jf):
        with io.open(jf, 'r', encoding='utf-8') as f:
            j = json.load(f)
        lst = [x['name'] for x in j.get('majors', []) if '学科评估等级【信息未查到】' in (x.get('remark') or '')]
        if lst:
            major_gaps[name] = lst

total = sum(len(v) for v in gaps.values())
print('=== 学校级学科缺口（txt 第三节）===')
print('涉及学校数:', len(gaps), '/ 50，缺口学科条目总数:', total)
for k, v in gaps.items():
    print('%s: %s' % (k, ', '.join(v)))

print()
print('=== 专业级缺口（json remark 含未查到）===')
print('涉及学校数:', len(major_gaps))
# 汇总出现缺失的专业名（跨校）
from collections import Counter
cnt = Counter()
for v in major_gaps.values():
    for x in v:
        cnt[x] += 1
print('高频缺失专业 TOP30:', cnt.most_common(30))

with io.open('raw_data/eval_gaps.json', 'w', encoding='utf-8') as f:
    json.dump({'school_gaps': gaps, 'major_gaps': major_gaps}, f, ensure_ascii=False, indent=1)
print('saved raw_data/eval_gaps.json')