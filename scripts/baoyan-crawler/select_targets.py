# -*- coding: utf-8 -*-
import json, io

with io.open('raw_data/colleges_clean.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

targets = ['清华大学','北京大学','浙江大学','上海交通大学','复旦大学','南京大学','中国科学技术大学','中国科学院大学','华中科技大学','哈尔滨工业大学','武汉大学','西安交通大学','中山大学','四川大学','国防科技大学','北京航空航天大学','东南大学','北京理工大学','同济大学','中国人民大学','南开大学','天津大学','北京协和医学院','山东大学','厦门大学','中南大学','西北工业大学','华南理工大学','电子科技大学','吉林大学','北京邮电大学','湖南大学','华东师范大学','大连理工大学','重庆大学','上海财经大学','东北大学','西安电子科技大学','北京科技大学','南京理工大学','南京航空航天大学','苏州大学','北京交通大学','华东理工大学','南方科技大学','上海科技大学','首都医科大学','中央财经大学','南京医科大学','南方医科大学']

colleges = {c['name']: c for c in data['colleges']}
ids = []
for t in targets:
    c = colleges.get(t)
    if c:
        ids.append({'id': c['id'], 'name': c['name']})
    else:
        print('MISSING:', t)

print('selected:', len(ids))
with io.open('raw_data/target_ids.json', 'w', encoding='utf-8') as f:
    json.dump(ids, f, ensure_ascii=False)
print(json.dumps(ids, ensure_ascii=False))