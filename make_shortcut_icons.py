# -*- coding: utf-8 -*-
"""Genera iconos PNG 96x96 para los shortcuts del manifest (balon y trofeo)."""
import math
from PIL import Image, ImageDraw

NAVY = (13, 31, 60, 255)
WHITE = (255, 255, 255, 255)
BLACK = (20, 20, 20, 255)
GOLD = (255, 184, 28, 255)
GOLD_D = (210, 150, 20, 255)
S = 96


def base():
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=20, fill=NAVY)
    return img, d


def reg_polygon(cx, cy, r, n, rot=-90):
    pts = []
    for i in range(n):
        a = math.radians(rot + i * 360 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# --- Balon (partidos) -------------------------------------------------------
img, d = base()
cx, cy, R = S / 2, S / 2, 32
d.ellipse([cx - R, cy - R, cx + R, cy + R], fill=WHITE, outline=BLACK, width=3)
# Pentagono central negro
d.polygon(reg_polygon(cx, cy, 12, 5), fill=BLACK)
# Parches en los vertices del pentagono central
for (px, py) in reg_polygon(cx, cy, 22, 5):
    d.polygon(reg_polygon(px, py, 5, 5, rot=90), fill=BLACK)
img.save("sc-partidos.png")
print("OK sc-partidos.png", img.size)

# --- Trofeo (ranking) -------------------------------------------------------
img, d = base()
# Copa
d.polygon([(34, 30), (62, 30), (58, 52), (38, 52)], fill=GOLD)      # cuerpo copa
d.ellipse([34, 24, 62, 36], fill=GOLD)                              # borde superior
# Asas
d.arc([24, 28, 40, 50], 90, 270, fill=GOLD_D, width=4)
d.arc([56, 28, 72, 50], 270, 90, fill=GOLD_D, width=4)
# Tallo y base
d.rectangle([46, 52, 50, 62], fill=GOLD_D)
d.polygon([(38, 70), (58, 70), (54, 62), (42, 62)], fill=GOLD)      # base trapecio
d.rectangle([34, 70, 62, 74], fill=GOLD_D)                          # plataforma
img.save("sc-ranking.png")
print("OK sc-ranking.png", img.size)
