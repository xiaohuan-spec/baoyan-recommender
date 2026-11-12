# -*- coding: utf-8 -*-
import json, io, sys

with io.open('raw_data/colleges_all.json', 'r', encoding='utf-8') as f:
    raw = f.read()

data = json.loads(raw)
if isinstance(data, str):
    data = json.loads(data)

print('total:', data.get('total'))
print('colleges:', len(data['colleges']))
print('provinces:', len(data['provinces']))

prov_map = {p['id']: p['name'] for p in data['provinces']}
for c in data['colleges'][:5]:
    print(c['id'], c['name'], prov_map.get(c['province_id']), '|', c['tags'])

targets = ['清华大学','北京大学','浙江大学','上海交通大学','复旦大学','南京大学','中国科学技术大学','中国科学院大学','华中科技大学','哈尔滨工业大学','武汉大学','西安交通大学','中山大学','四川大学','国防科技大学','北京航空航天大学','东南大学','北京理工大学','同济大学','中国人民大学','北京师范大学','南开大学','天津大学','北京协和医学院','山东大学','厦门大学','中南大学','西北工业大学','华南理工大学','电子科技大学','吉林大学','北京邮电大学','湖南大学','华东师范大学','大连理工大学','重庆大学','中国农业大学','上海财经大学','东北大学','西安电子科技大学','兰州大学','北京科技大学','南京理工大学','南京航空航天大学','苏州大学','北京交通大学','华东理工大学','南方科技大学','华中农业大学','上海科技大学','首都医科大学','中央民族大学','郑州大学','中央财经大学','华中师范大学','上海大学','南京医科大学','哈尔滨工程大学','西南大学','南方医科大学','暨南大学','中国政法大学','南京农业大学','对外经济贸易大学','西湖大学','中国石油大学（北京）','东北师范大学','武汉理工大学','西南交通大学','中国矿业大学（徐州）','香港中文大学（深圳）','南京师范大学','中国地质大学（武汉）','江南大学','河海大学']

names = {c['name'] for c in data['colleges']}
missing = [t for t in targets if t not in names]
print('targets:', len(targets), 'missing:', len(missing))
print('missing list:', missing)

clean = {
    'total': data.get('total'),
    'provinces': prov_map,
    'colleges': data['colleges']
}
with io.open('raw_data/colleges_clean.json', 'w', encoding='utf-8') as f:
    json.dump(clean, f, ensure_ascii=False, indent=1)
print('saved raw_data/colleges_clean.json')