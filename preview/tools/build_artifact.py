#!/usr/bin/env python3
"""claude.ai アーティファクトで確認するための preview/artifact.html を作る（リポジトリには入れない）。
アーティファクト側が <head> を自動で付けるため、index.html の head の中身と body の中身だけを並べる。
公開（GitHub Pages）に使うのは index.html のほう。"""
import pathlib, re
ROOT = pathlib.Path(__file__).resolve().parent.parent
h = (ROOT / 'index.html').read_text(encoding='utf-8')
head = re.search(r'<head>(.*?)</head>', h, re.S).group(1)
body = re.search(r'<body>(.*?)</body>', h, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\s*|<meta name="viewport"[^>]*>\s*', '', head)
head = head.replace('<title>メタル脳 — オパビのイヤホン帳</title>', '<title>メタル脳</title>')
(ROOT / 'artifact.html').write_text('<!-- アーティファクト確認用（build_artifact.py が index.html から生成。公開には使わない） -->\n' + head.strip() + '\n' + body, encoding='utf-8')
print(ROOT / 'artifact.html')
