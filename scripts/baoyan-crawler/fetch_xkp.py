# -*- coding: utf-8 -*-
"""从 xuekepinggu.cn 的 Supabase 后端批量拉取 50 所院校的第四/五轮学科评估数据"""
import json, io, time, urllib.request, urllib.parse

KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbGlpY2hzaG91aW15aXFranRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NTI2NzIsImV4cCI6MjA2NTAyODY3Mn0.3H5gIR9_C4IaUdUM920ICpwOOJAnTKr18f4wsAYwiyI'
REST = 'https://clliichshouimyiqkjte.supabase.co/rest/v1'
HEADERS = {'apikey': KEY, 'Authorization': 'Bearer ' + KEY, 'Accept': 'application/json'}

NAMES = ['清华大学','北京大学','浙江大学','上海交通大学','复旦大学','南京大学','中国科学技术大学','中国科学院大学','华中科技大学','哈尔滨工业大学','武汉大学','西安交通大学','中山大学','四川大学','国防科技大学','北京航空航天大学','东南大学','北京理工大学','同济大学','中国人民大学','南开大学','天津大学','北京协和医学院','山东大学','厦门大学','中南大学','西北工业大学','华南理工大学','电子科技大学','吉林大学','北京邮电大学','湖南大学','华东师范大学','大连理工大学','重庆大学','上海财经大学','东北大学','西安电子科技大学','北京科技大学','南京理工大学','南京航空航天大学','苏州大学','北京交通大学','华东理工大学','南方科技大学','上海科技大学','首都医科大学','中央财经大学','南京医科大学','南方医科大学']

# 常见别名（站点数据库可能的命名差异）
ALIASES = {
    '国防科技大学': ['国防科技大学', '中国人民解放军国防科技大学'],
}

def get(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read().decode('utf-8'))
        except Exception as e:
            if i == retries - 1:
                raise
            time.sleep(1.5 * (i + 1))

out, not_found, errors = {}, [], []
for nm in NAMES:
    cands = ALIASES.get(nm, [nm])
    sid = None
    db_name = None
    try:
        for c in cands:
            q = REST + '/university_basic_info?name=eq.' + urllib.parse.quote(c) + '&select=school_id,name&limit=1'
            rows = get(q)
            if rows:
                sid, db_name = rows[0]['school_id'], rows[0]['name']
                break
        if sid is None:
            not_found.append(nm)
            continue
        q4 = REST + '/xuekepinggu?school_id=eq.' + urllib.parse.quote(str(sid)) + '&select=subject_code,subject_name,category_name,eval_result'
        v4 = get(q4)
        q5 = REST + '/xuekepinggu_v5?school_id=eq.' + urllib.parse.quote(str(sid)) + '&select=subject_code,subject_name,category_name,eval_result'
        try:
            v5 = get(q5)
        except Exception:
            v5 = []
        out[nm] = {'school_id': sid, 'db_name': db_name, 'v4': v4, 'v5': v5}
        print('[OK] %s (id=%s) v4=%d v5=%d' % (nm, sid, len(v4), len(v5)))
    except Exception as e:
        errors.append({'name': nm, 'err': str(e)[:100]})
        print('[ERR] %s: %s' % (nm, str(e)[:100]))

result = {'total': len(out), 'not_found': not_found, 'errors': errors, 'data': out}
with io.open('raw_data/xuekepinggu_results.json', 'w', encoding='utf-8') as f:
    json.dump(result, f, ensure_ascii=False)
print('---')
print('total:', len(out), '/', len(NAMES))
print('not_found:', not_found)
print('errors:', [e['name'] for e in errors])