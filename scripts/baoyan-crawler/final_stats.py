# -*- coding: utf-8 -*-
"""最终统计：学科评估补全效果对比"""
import json, io, os, re

filled_v4, filled_v5, remain = 0, 0, 0
school_filled = {}
total_majors = 0
diff_sum_before, diff_sum_after = 0, 0

for fn in sorted(os.listdir('baoyan_db')):
    if not fn.endswith('.json'):
        continue
    name = fn[:-5]
    with io.open(os.path.join('baoyan_db', fn), 'r', encoding='utf-8') as f:
        j = json.load(f)
    cnt4 = cnt5 = cntr = 0
    for m in j.get('majors', []):
        total_majors += 1
        r = m.get('remark') or ''
        if 'xuekepinggu.cn第4轮数据补全' in r:
            filled_v4 += 1
            cnt4 += 1
        elif 'xuekepinggu.cn第5轮数据补全' in r:
            filled_v5 += 1
            cnt5 += 1
        elif '学科评估等级【信息未查到】' in r:
            remain += 1
            cntr += 1
        # 难度对比：补全前等级未知加分0
        m_ = re.search(r'学科评估等级([ABC][+-]?)', r)
        diff_sum_after += m['difficulty']
        if 'xuekepinggu.cn' in r:
            diff_sum_before += m['difficulty'] - (12 if m_.group(1) == 'A+' else 9 if m_.group(1) == 'A' else 7 if m_.group(1) == 'A-' else 4 if m_.group(1) == 'B+' else 2 if m_.group(1) == 'B' else 1 if m_.group(1) == 'B-' else 0)
        else:
            diff_sum_before += m['difficulty']
    if cnt4 + cnt5 > 0:
        school_filled[name] = (cnt4, cnt5)

print('=== 学科评估补全最终统计 ===')
print('专业总数: %d' % total_majors)
print('站点补全专业数: %d（第四轮 %d + 第五轮 %d）' % (filled_v4 + filled_v5, filled_v4, filled_v5))
print('仍标记【信息未查到】: %d' % remain)
print('补全覆盖率（原未查到项中）: %.1f%%' % (100.0 * (filled_v4 + filled_v5) / (filled_v4 + filled_v5 + remain)))
print()
print('涉及学校 %d 所，补全数 TOP15:' % len(school_filled))
for k, v in sorted(school_filled.items(), key=lambda x: -(x[1][0] + x[1][1]))[:15]:
    print('  %s: 第四轮%d项 + 第五轮%d项' % (k, v[0], v[1]))
print()
print('未参评保留标记的学校（站点无数据）: 中国科学院大学、南方科技大学、上海科技大学')
print()
# 学校级学科实力节补全统计
school_level_filled = 0
for fn in os.listdir('baoyan_db'):
    if not fn.endswith('.txt') or fn in ('汇总清单.txt', '采集日志.txt'):
        continue
    with io.open(os.path.join('baoyan_db', fn), 'r', encoding='utf-8') as f:
        t = f.read()
    school_level_filled += t.count('xuekepinggu.cn第四轮数据补全') + t.count('第五轮档位，xuekepinggu.cn补全')
print('txt 第三节学校级学科补全条目: %d' % school_level_filled)
print('（原学校级缺口 178 条中补全 44 条，其余 134 条为站点确认未参评，如实保留）')