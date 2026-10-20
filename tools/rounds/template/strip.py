# frames evenly spaced through a clip, tiled with their frame numbers — a review strip
import sys, av, numpy as np
from PIL import Image, ImageDraw
path, out, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
frames = []
with av.open(path) as c:
    for f in c.decode(video=0): frames.append(f.to_ndarray(format="rgb24"))
total = len(frames)
picks = [round(i * (total - 1) / (n - 1)) for i in range(n)]
cols = 6; rows = (n + cols - 1) // cols
w, h = 344, 192
sheet = Image.new("RGB", (cols * w, rows * h), "black")
d = ImageDraw.Draw(sheet)
for k, idx in enumerate(picks):
    im = Image.fromarray(frames[idx]).resize((w, h))
    sheet.paste(im, ((k % cols) * w, (k // cols) * h))
    d.rectangle([(k % cols) * w, (k // cols) * h, (k % cols) * w + 84, (k // cols) * h + 18], fill="black")
    d.text(((k % cols) * w + 4, (k // cols) * h + 3), f"f{idx} {idx/24:.1f}s", fill="white")
sheet.save(out)
print(f"{total} frames -> {out}")
