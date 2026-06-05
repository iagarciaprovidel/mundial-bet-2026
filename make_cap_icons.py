# -*- coding: utf-8 -*-
"""Genera iconos para Capacitor (@capacitor/assets) en ../mundialbet-apk/assets:
   icon-foreground.png (mascotas transparentes), icon-background.png (estadio),
   icon-only.png (compuesto) y splash.png."""
import os
import numpy as np
from PIL import Image, ImageDraw

FG = "uploads/pasted-1780580387402-0.png"
BG = "uploads/pasted-1780580622528-0.png"
OUT = r"D:\SII\_RTA\IA_RENTA\mundialbet-apk\assets"
os.makedirs(OUT, exist_ok=True)
S = 1024

# --- Mascotas con fondo transparente (mismo metodo que make_icons) ---
fg = Image.open(FG).convert("RGB")
w, h = fg.size
rgb = np.array(fg)
SENT = (0, 254, 1)
flood = fg.copy()
for c in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    ImageDraw.floodfill(flood, c, SENT, thresh=40)
bg_outer = np.all(np.array(flood) == SENT, axis=-1)
pure_white = rgb.min(axis=-1) >= 248
alpha = np.where(bg_outer | pure_white, 0, 255).astype("uint8")
for _ in range(2):
    transp = alpha == 0
    neigh = np.zeros_like(transp)
    neigh[1:, :] |= transp[:-1, :]; neigh[:-1, :] |= transp[1:, :]
    neigh[:, 1:] |= transp[:, :-1]; neigh[:, :-1] |= transp[:, 1:]
    alpha[(alpha == 255) & neigh & (rgb.min(axis=-1) >= 232)] = 0
mascots = Image.fromarray(np.dstack([rgb, alpha]), "RGBA").crop(
    Image.fromarray(np.dstack([rgb, alpha]), "RGBA").getbbox())

# --- Fondo estadio cuadrado ---
bg = Image.open(BG).convert("RGB")
bw, bh = bg.size; side = min(bw, bh)
bg_sq = bg.crop(((bw - side) // 2, (bh - side) // 2, (bw - side) // 2 + side, (bh - side) // 2 + side))

def make_bg(size):
    canvas = bg_sq.resize((size, size), Image.LANCZOS).convert("RGBA")
    overlay = Image.new("RGBA", (size, size), (10, 25, 50, 90))
    return Image.alpha_composite(canvas, overlay)

# icon-background: estadio
make_bg(S).convert("RGB").save(os.path.join(OUT, "icon-background.png"))

# icon-foreground: mascotas en zona segura (~58% para iconos adaptativos)
fgc = Image.new("RGBA", (S, S), (0, 0, 0, 0))
scale = min(S * 0.58 / mascots.size[0], S * 0.58 / mascots.size[1])
m = mascots.resize((int(mascots.size[0] * scale), int(mascots.size[1] * scale)), Image.LANCZOS)
fgc.alpha_composite(m, ((S - m.size[0]) // 2, (S - m.size[1]) // 2))
fgc.save(os.path.join(OUT, "icon-foreground.png"))

# icon-only: compuesto (legacy)
comp = make_bg(S)
scale2 = min(S * 0.80 / mascots.size[0], S * 0.80 / mascots.size[1])
m2 = mascots.resize((int(mascots.size[0] * scale2), int(mascots.size[1] * scale2)), Image.LANCZOS)
comp.alpha_composite(m2, ((S - m2.size[0]) // 2, (S - m2.size[1]) // 2))
comp.convert("RGBA").save(os.path.join(OUT, "icon-only.png"))

# splash 2732x2732: estadio + mascotas centradas
SP = 2732
sp = make_bg(SP)
scale3 = min(SP * 0.42 / mascots.size[0], SP * 0.42 / mascots.size[1])
m3 = mascots.resize((int(mascots.size[0] * scale3), int(mascots.size[1] * scale3)), Image.LANCZOS)
sp.alpha_composite(m3, ((SP - m3.size[0]) // 2, (SP - m3.size[1]) // 2))
sp.convert("RGB").save(os.path.join(OUT, "splash.png"))

print("OK iconos en", OUT)
for f in os.listdir(OUT):
    print(" ", f, Image.open(os.path.join(OUT, f)).size)
