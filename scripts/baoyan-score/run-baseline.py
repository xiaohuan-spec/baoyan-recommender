# -*- coding: utf-8 -*-
"""生成 Python 原版基准输出，供 parity-check.cjs 深度对比。

用法：python scripts/baoyan-score/run-baseline.py
输出：scripts/baoyan-score/results/parity/py_stuN.json
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PY_DIR = Path(__file__).resolve().parent
OUT = PY_DIR / 'results' / 'parity'
OUT.mkdir(parents=True, exist_ok=True)

for i in range(1, 7):
    inp = PY_DIR / 'stu_mes' / ('stu%d.json' % i)
    outp = OUT / ('py_stu%d.json' % i)
    result = subprocess.run(
        [sys.executable, str(PY_DIR / 'main.py'), '--input', str(inp),
         '--config-dir', str(ROOT / 'docs' / 'data' / 'scoring'), '--output', str(outp)],
        capture_output=True, text=True, encoding='utf-8', cwd=str(PY_DIR))
    print('stu%d exit=%d' % (i, result.returncode))
    if result.returncode not in (0, 3):
        print(result.stderr[:500])