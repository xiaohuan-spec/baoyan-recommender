# -*- coding: utf-8 -*-
import json, io

with io.open('raw_data/articles_v2.json', 'r', encoding='utf-8') as f:
    raw = f.read()

data = json.loads(raw)
if isinstance(data, str):
    data = json.loads(data)

print('colleges:', data.get('colleges'))
print('total_articles:', data.get('total_articles'))
print('errors:', data.get('errors'))

arts_map = data.get('data', {})
no_article = [nm for nm, lst in arts_map.items() if not lst]
print('colleges without articles:', no_article)

for nm in ['清华大学', '北京大学', '中山大学']:
    lst = arts_map.get(nm, [])
    print('---', nm, len(lst), 'articles')
    for a in lst[:5]:
        print('   ', a.get('title')[:40], '| tags:', a.get('tags'), '| rule:', a.get('rule'), '| signup:', a.get('sign_up_start'), '~', a.get('sign_up_end'))

# 提取含专业信息的文章
with_time = sum(1 for nm in arts_map for a in arts_map[nm] if a.get('sign_up_start'))
print('articles with sign_up time:', with_time)
with_major = sum(1 for nm in arts_map for a in arts_map[nm] if a.get('major') and a.get('major') != '全部专业')
print('articles with specific major:', with_major)

with io.open('raw_data/articles_final.json', 'w', encoding='utf-8') as f:
    json.dump(arts_map, f, ensure_ascii=False, indent=1)
print('saved raw_data/articles_final.json')