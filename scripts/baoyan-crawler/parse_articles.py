# -*- coding: utf-8 -*-
import json, io, re

with io.open('raw_data/articles_raw.json', 'r', encoding='utf-8') as f:
    raw = f.read()

data = json.loads(raw)
if isinstance(data, str):
    data = json.loads(data)

print('total:', data.get('total'), '| fetched:', data.get('fetched'))
arts = data.get('articles', [])
if arts:
    a = arts[0]
    print('fields:', sorted(a.keys()))
    print('sample title:', a.get('title'))
    print('sample college:', a.get('college'), '| academy:', a.get('academy'))
    print('sub_category:', a.get('sub_category'), '| tags:', a.get('tags'))
    print('enroll:', a.get('enroll_start'), '~', a.get('enroll_end'))
    print('activity:', a.get('activity_start'), '~', a.get('activity_end'))

# 从标题提取学校名【XXX】
def extract_college(t):
    m = re.match(r'【(.+?)】', t or '')
    return m.group(1) if m else None

from collections import Counter
cnt = Counter()
for a in arts:
    c = a.get('college') or extract_college(a.get('title'))
    if c:
        cnt[c] += 1

targets = ['清华大学','北京大学','浙江大学','上海交通大学','复旦大学','南京大学','中国科学技术大学','中国科学院大学','华中科技大学','哈尔滨工业大学','武汉大学','西安交通大学','中山大学','四川大学','国防科技大学','北京航空航天大学','东南大学','北京理工大学','同济大学','中国人民大学','南开大学','天津大学','北京协和医学院','山东大学','厦门大学','中南大学','西北工业大学','华南理工大学','电子科技大学','吉林大学','北京邮电大学','湖南大学','华东师范大学','大连理工大学','重庆大学','上海财经大学','东北大学','西安电子科技大学','北京科技大学','南京理工大学','南京航空航天大学','苏州大学','北京交通大学','华东理工大学','南方科技大学','上海科技大学','首都医科大学','中央财经大学','南京医科大学','南方医科大学']

hit = {t: cnt.get(t, 0) for t in targets if cnt.get(t, 0) > 0}
print('target colleges with articles:', len(hit), '/', len(targets))
print(dict(sorted(hit.items(), key=lambda x: -x[1])))

with io.open('raw_data/articles_clean.json', 'w', encoding='utf-8') as f:
    json.dump(arts, f, ensure_ascii=False, indent=1)
print('saved', len(arts), 'articles')