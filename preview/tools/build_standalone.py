#!/usr/bin/env python3
"""preview/ を1ファイルの HTML にまとめる（CSS・JS・データ・写真を埋め込み）。

使い方:  python3 preview/tools/build_standalone.py [出力先.html]
既定の出力先: preview/dist/metal-nou.html
"""
import base64
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dist' / 'metal-nou.html'


def read(p):
    return (ROOT / p).read_text(encoding='utf-8')


html = read('index.html')
css = read('style.css')
app = read('app.js')

# 写真を data URI の表にする
images = {}
for f in sorted((ROOT / 'img').glob('*.webp')):
    images['img/' + f.name] = 'data:image/webp;base64,' + base64.b64encode(f.read_bytes()).decode()
img_js = 'const IMG_DATA = ' + json.dumps(images) + ';\nconst IMG = p => IMG_DATA[p] || p;\n'

# app.js の画像パスを埋め込みデータに差し替える（srcset は1サイズなので外す）
app = re.sub(r'`(img/[^`]*?\.webp)`', r'IMG(`\1`)', app)
app = app.replace(' srcset="${srcset}"', '')
app = re.sub(r'src="(img/[^"]*?\.webp)"', r'src="${IMG(`\1`)}"', app)

html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
for name in ['data/models.js', 'data/wishlist.js']:
    html = html.replace(f'<script src="{name}"></script>', '<script>\n' + read(name) + '\n</script>')
html = html.replace('<script src="app.js"></script>', '<script>\n' + img_js + app + '\n</script>')

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding='utf-8')
print(f'{OUT}  {OUT.stat().st_size / 1024 / 1024:.1f} MB')
