import json,re,sys
page,label,blob=sys.argv[1:4]
s=open(page,encoding='utf-8').read()
m=re.search(r'<script id="cfgs" type="application/json">(.*?)</script>',s); cards=json.loads(m.group(1))
if label not in {c['label'] for c in cards}: cards.append({"label":label,"blob":blob,"seconds":31.4})
cards.sort(key=lambda c:int(c['label'].split()[-1])); b=json.dumps(cards,separators=(",",":")); assert "</script>" not in b
open(page,'w',encoding='utf-8').write(s[:m.start(1)]+b+s[m.end(1):]); print([c['label'] for c in cards])
