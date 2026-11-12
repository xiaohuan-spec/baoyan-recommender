# -*- coding: utf-8 -*-
import json, io

with io.open('raw_data/academies_raw.json', 'r', encoding='utf-8') as f:
    raw = f.read()

data = json.loads(raw)
if isinstance(data, str):
    data = json.loads(data)

print('fetched:', data.get('fetched'))
print('errors:', data.get('errors'))

target_names = {1:'清华大学',2:'北京大学',49:'浙江大学',34:'上海交通大学',35:'复旦大学',3:'南京大学',64:'中国科学技术大学',119:'中国科学院大学',78:'华中科技大学',60:'哈尔滨工业大学',77:'武汉大学',97:'西安交通大学',87:'中山大学',92:'四川大学',123:'国防科技大学',8:'北京航空航天大学',4:'东南大学',9:'北京理工大学',36:'同济大学',7:'中国人民大学',31:'南开大学',32:'天津大学',132:'北京协和医学院',73:'山东大学',70:'厦门大学',84:'中南大学',98:'西北工业大学',88:'华南理工大学',93:'电子科技大学',57:'吉林大学',14:'北京邮电大学',85:'湖南大学',37:'华东师范大学',54:'大连理工大学',104:'重庆大学',38:'上海财经大学',53:'东北大学',103:'西安电子科技大学',16:'北京科技大学',44:'南京理工大学',6:'南京航空航天大学',46:'苏州大学',15:'北京交通大学',41:'华东理工大学',121:'南方科技大学',117:'上海科技大学',135:'首都医科大学',19:'中央财经大学',69:'南京医科大学',185:'南方医科大学'}

for d in data['data'][:3]:
    print('---', target_names.get(d['id'], d['id']), 'academies:', d['count'])
    for a in d['academies'][:3]:
        print('   ', a['id'], a['name'], '| majors_count:', a.get('majors_count'), '| tuimian:', str(a.get('tuimian_info'))[:80])

with io.open('raw_data/academies_clean.json', 'w', encoding='utf-8') as f:
    json.dump({target_names.get(d['id'], str(d['id'])): d['academies'] for d in data['data']}, f, ensure_ascii=False, indent=1)
print('saved raw_data/academies_clean.json with', len(data['data']), 'colleges')