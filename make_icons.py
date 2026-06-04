# -*- coding: utf-8 -*-
"""Genera los iconos PWA componiendo las mascotas (fondo transparente)
sobre la imagen del estadio."""
import numpy as np
from PIL import Image, ImageDraw

FG = "uploads/pasted-1780580387402-0.png"   # mascotas (fondo blanco)
BG = "uploads/pasted-1780580622528-0.png"   # estadio
SIZES = [144, 192, 512]

# 1) Quitar fondo blanco -----------------------------------------------------
fg = Image.open(FG).convert("RGB")
w, h = fg.size
rgb = np.array(fg)

# (a) flood-fill desde las 4 esquinas -> fondo exterior conectado
SENT = (0, 254, 1)  # color centinela improbable
flood = fg.copy()
for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
    ImageDraw.floodfill(flood, corner, SENT, thresh=40)
flood_arr = np.array(flood)
bg_outer = np.all(flood_arr == SENT, axis=-1)

# (b) blanco PURO encerrado entre las mascotas (huecos no alcanzados por (a)).
#     El fondo del render es ~255 plano; el blanco del aguila/alce es sombreado
#     (<250), por eso un umbral alto lo respeta.
pure_white = rgb.min(axis=-1) >= 248
bg_mask = bg_outer | pure_white

alpha = np.where(bg_mask, 0, 255).astype("uint8")

# (c) Defringe: come el halo blanco del borde. Pixeles casi-blancos visibles
#     pegados a una zona transparente -> transparentes. 2 pasadas.
for _ in range(2):
    transp = alpha == 0
    neigh = np.zeros_like(transp)
    neigh[1:, :]  |= transp[:-1, :]   # vecino arriba
    neigh[:-1, :] |= transp[1:, :]    # abajo
    neigh[:, 1:]  |= transp[:, :-1]   # izquierda
    neigh[:, :-1] |= transp[:, 1:]    # derecha
    halo = (alpha == 255) & neigh & (rgb.min(axis=-1) >= 232)
    alpha[halo] = 0

fg_rgba = np.dstack([rgb, alpha])
mascots = Image.fromarray(fg_rgba, "RGBA")

# Recortar al bounding box del contenido
bbox = mascots.getbbox()
mascots = mascots.crop(bbox)

# 2) Fondo estadio -> cuadrado (center crop) ---------------------------------
bg = Image.open(BG).convert("RGB")
bw, bh = bg.size
side = min(bw, bh)
left = (bw - side) // 2
top = (bh - side) // 2
bg_sq = bg.crop((left, top, left + side, top + side))

# 3) Componer y exportar cada tamaño -----------------------------------------
SAFE = 0.80  # zona segura para iconos maskable
for s in SIZES:
    canvas = bg_sq.resize((s, s), Image.LANCZOS).convert("RGBA")
    # Oscurecer levemente el fondo para que resalten las mascotas
    overlay = Image.new("RGBA", (s, s), (10, 25, 50, 70))
    canvas = Image.alpha_composite(canvas, overlay)

    max_w = int(s * SAFE)
    max_h = int(s * SAFE)
    mw, mh = mascots.size
    scale = min(max_w / mw, max_h / mh)
    nw, nh = int(mw * scale), int(mh * scale)
    m = mascots.resize((nw, nh), Image.LANCZOS)
    px = (s - nw) // 2
    py = (s - nh) // 2
    canvas.alpha_composite(m, (px, py))
    out = f"icon-{s}.png"
    canvas.convert("RGBA").save(out)
    print("OK", out, canvas.size)

# Preview grande para inspección
prev = bg_sq.resize((512, 512), Image.LANCZOS).convert("RGBA")
prev = Image.alpha_composite(prev, Image.new("RGBA", (512, 512), (10, 25, 50, 70)))
scale = min(int(512 * SAFE) / mascots.size[0], int(512 * SAFE) / mascots.size[1])
m = mascots.resize((int(mascots.size[0] * scale), int(mascots.size[1] * scale)), Image.LANCZOS)
prev.alpha_composite(m, ((512 - m.size[0]) // 2, (512 - m.size[1]) // 2))
prev.save("_icon_preview.png")
print("preview _icon_preview.png")
