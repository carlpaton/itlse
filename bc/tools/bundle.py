"""Inline style.css and js/*.js into one self-contained page (dist/brick-kingdom.html)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join((root / s).read_text() for s in scripts)
body = re.search(r'<body>(.*?)<script', html, re.S).group(1).strip()
out = f'''<title>Brick Kingdom</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap">
<style>
{css}
</style>
{body}
<script>
{js}
</script>
'''
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'brick-kingdom.html').write_text(out)
print('wrote', len(out), 'bytes')
