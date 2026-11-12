# -*- coding: utf-8 -*-
import json, io

with io.open('raw_data/articles_search_raw.json', 'r', encoding='utf-8') as f:
    raw = f.read()

data = json.loads(raw)
if isinstance(data, str):
    data = json.loads(data)

print('colleges:', data.get('colleges'))
print('total_articles:', data.get('total_articles'))
print('errors:', data.get('errors'))

arts_map = data.get('data', {})
for nm in ['清华大学', '北京大学', '浙江大学']:
    lst = arts_map.get(nm, [])
    print('---', nm, len(lst), 'articles')
    for a in lst[:3]:
        print('   ', a.get('title'), '| enroll:', a.get('enroll_start'), '~', a.get('enroll_end'), '| tags:', a.get('tags'), '| major:', a.get('major'))

# 检查时间字段是否为空
empty_enroll = sum(1 for nm in arts_map for a in arts_map[nm] if not a.get('enroll_start'))
print('articles without enroll_start:', empty_enroll)

with io.open('raw_data/articles_search_clean.json', 'w', encoding='utf-8') as f:
    json.dump(arts_map, f, ensure_ascii=False, indent=1)
print('saved raw_data/articles_search_clean.json')