# -*- coding: utf-8 -*-
"""Genera todos los mipmaps de Android (legacy + adaptativos) desde
   los iconos 1024 de Capacitor, escribiendo en el proyecto android."""
import os
from PIL import Image, ImageDraw

ASSETS = r"D:\SII\_RTA\IA_RENTA\mundialbet-apk\assets"
RES = r"D:\SII\_RTA\IA_RENTA\mundialbet-apk\android\app\src\main\res"

icon_only = Image.open(os.path.join(ASSETS, "icon-only.png")).convert("RGBA")
fg = Image.open(os.path.join(ASSETS, "icon-foreground.png")).convert("RGBA")
bg = Image.open(os.path.join(ASSETS, "icon-background.png")).convert("RGBA")

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
ADAPT = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

def rounded(img):
    """máscara circular para ic_launcher_round."""
    s = img.size[0]
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, s, s], fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out

for dpi, sz in LEGACY.items():
    d = os.path.join(RES, f"mipmap-{dpi}")
    sq = icon_only.resize((sz, sz), Image.LANCZOS)
    sq.save(os.path.join(d, "ic_launcher.png"))
    rounded(sq).save(os.path.join(d, "ic_launcher_round.png"))

for dpi, sz in ADAPT.items():
    d = os.path.join(RES, f"mipmap-{dpi}")
    fg.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, "ic_launcher_foreground.png"))
    bg.resize((sz, sz), Image.LANCZOS).save(os.path.join(d, "ic_launcher_background.png"))

# XML adaptativo -> usar nuestros PNG mipmap
xml = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
    '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
    '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
    '</adaptive-icon>\n'
)
for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(os.path.join(RES, "mipmap-anydpi-v26", name), "w", encoding="utf-8") as f:
        f.write(xml)

print("OK mipmaps Android generados y XML adaptativo actualizado")
