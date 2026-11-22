#!/usr/bin/env python3
"""書体サンプル（案5）を作る。
index.html から preview/sample.html（ブラウザ確認用）と preview/artifact-sample.html（claude.ai アーティファクト確認用）を生成する。
どちらもリポジトリには入れない。本体の index.html・style.css は変えない。"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
h = (ROOT / 'index.html').read_text(encoding='utf-8')

h = h.replace('<html lang="ja">', '<html lang="ja" class="type-v5">')
h = h.replace('family=Jost:', 'family=Dela+Gothic+One&family=Jost:')
h = h.replace('<link rel="stylesheet" href="style.css">',
              '<link rel="stylesheet" href="style.css">\n<link rel="stylesheet" href="type-v5.css">')
h = h.replace('<span>VOL.01 ／ 2026.11.13 更新</span>', '<span>2026年11月13日更新</span>')
h = h.replace('<h2 class="label">WISHLIST</h2>', '<h2 class="label"><span class="label__en">WISHLIST</span><small>ほしいもの</small></h2>')
h = h.replace('<legend class="label">ROLE ／ 役割</legend>', '<legend class="label"><span class="label__en">ROLE</span><small>役割</small></legend>')
h = h.replace('<legend class="label">MAKER ／ メーカー</legend>', '<legend class="label"><span class="label__en">MAKER</span><small>メーカー</small></legend>')
(ROOT / 'sample.html').write_text(h, encoding='utf-8')

head = re.search(r'<head>(.*?)</head>', h, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', h, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
head = head.replace('<title>メタル脳 — オパビのイヤホン帳</title>', '<title>書体サンプル</title>')
# アーティファクトは <html> を自前で付けるので、クラスはスクリプトで付ける
head += '\n<script>document.documentElement.classList.add("type-v5")</script>'
(ROOT / 'artifact-sample.html').write_text('<!-- 書体サンプル（build_sample.py が生成。公開には使わない） -->\n' + head.strip() + '\n' + body, encoding='utf-8')
print(ROOT / 'sample.html')
