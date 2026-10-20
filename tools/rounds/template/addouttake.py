import json,re,sys
# usage: addouttake.py page.html "NG 1" <blob> <seed> "<why>"
page,label,blob,seed,why=sys.argv[1:6]
s=open(page,encoding='utf-8').read()
m=re.search(r'<script id="outtakes-data" type="application/json">(.*?)</script>',s); items=json.loads(m.group(1))
if label not in {o['label'] for o in items}: items.append({"label":label,"blob":blob,"seed":seed,"why":why})
b=json.dumps(items,separators=(",",":"),ensure_ascii=False); assert "</script>" not in b
open(page,'w',encoding='utf-8').write(s[:m.start(1)]+b+s[m.end(1):]); print([o['label'] for o in items])
