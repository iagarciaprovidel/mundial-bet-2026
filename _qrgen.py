# -*- coding: utf-8 -*-
# Generador QR minimo (byte mode) para incrustar como SVG. Sin dependencias.
# Soporta version 3, nivel M (29x29, 44 data + 26 EC codewords, 1 bloque).

# ---- GF(256) ----
EXP = [0]*512
LOG = [0]*256
x = 1
for i in range(255):
    EXP[i] = x
    LOG[x] = i
    x <<= 1
    if x & 0x100:
        x ^= 0x11d
for i in range(255, 512):
    EXP[i] = EXP[i-255]

def gmul(a, b):
    if a == 0 or b == 0:
        return 0
    return EXP[LOG[a] + LOG[b]]

def rs_generator(n):
    g = [1]
    for i in range(n):
        # multiply g by (x - alpha^i)  == (x + alpha^i) in GF2
        ng = [0]*(len(g)+1)
        for j in range(len(g)):
            ng[j] ^= g[j]
            ng[j+1] ^= gmul(g[j], EXP[i])
        g = ng
    return g

def rs_encode(data, n):
    gen = rs_generator(n)
    res = data + [0]*n
    for i in range(len(data)):
        coef = res[i]
        if coef != 0:
            for j in range(len(gen)):
                res[i+j] ^= gmul(gen[j], coef)
    return res[len(data):]

# ---- Validacion RS: el codeword (data+EC) debe ser divisible por el generador
#      (evalua a 0 en las raices alpha^0..alpha^(n-1)). Prueba independiente. ----
def _evalpoly(coeffs, xv):
    acc = 0
    for c in coeffs:
        acc = gmul(acc, xv) ^ c
    return acc
_data = [0x10,0x20,0x0c,0x56,0x61,0x80,0xec,0x11]
_ec = rs_encode(_data, 10)
assert all(_evalpoly(_data + _ec, EXP[i]) == 0 for i in range(10)), "RS FAIL"
print("RS OK (codeword valido: divisible por el generador)")

# ---- Encode datos (byte mode), version 3-M ----
URL = "https://mundialbet-club.web.app/app.html"
data_bytes = URL.encode('latin-1')
DATA_CODEWORDS = 44
EC_CODEWORDS = 26
SIZE = 29
VERSION = 3

bits = []
def put(val, length):
    for i in range(length-1, -1, -1):
        bits.append((val >> i) & 1)

put(0b0100, 4)             # mode: byte
put(len(data_bytes), 8)    # char count (8 bits para v1-9)
for b in data_bytes:
    put(b, 8)
# terminador
cap = DATA_CODEWORDS * 8
term = min(4, cap - len(bits))
put(0, term)
# pad a byte
while len(bits) % 8 != 0:
    bits.append(0)
# pad bytes
pads = [0xEC, 0x11]
pi = 0
while len(bits) < cap:
    put(pads[pi % 2], 8)
    pi += 1

data_cw = []
for i in range(0, len(bits), 8):
    v = 0
    for b in bits[i:i+8]:
        v = (v << 1) | b
    data_cw.append(v)
assert len(data_cw) == DATA_CODEWORDS

ec_cw = rs_encode(data_cw, EC_CODEWORDS)
all_cw = data_cw + ec_cw   # 1 bloque

# bitstream final + remainder bits (7 para v3)
final_bits = []
for cw in all_cw:
    for i in range(7, -1, -1):
        final_bits.append((cw >> i) & 1)
final_bits += [0]*7

# ---- Matriz ----
m = [[None]*SIZE for _ in range(SIZE)]
fn = [[False]*SIZE for _ in range(SIZE)]

def set_fn(r, c, val):
    m[r][c] = val
    fn[r][c] = True

def place_finder(r, c):
    for dr in range(-1, 8):
        for dc in range(-1, 8):
            rr, cc = r+dr, c+dc
            if 0 <= rr < SIZE and 0 <= cc < SIZE:
                if dr in (-1,7) or dc in (-1,7):
                    set_fn(rr, cc, 0)            # separador
                elif dr in (0,6) or dc in (0,6) or (2 <= dr <= 4 and 2 <= dc <= 4):
                    set_fn(rr, cc, 1)
                else:
                    set_fn(rr, cc, 0)

place_finder(0, 0)
place_finder(0, SIZE-7)
place_finder(SIZE-7, 0)

# timing
for i in range(8, SIZE-8):
    v = 1 if i % 2 == 0 else 0
    if not fn[6][i]:
        set_fn(6, i, v)
    if not fn[i][6]:
        set_fn(i, 6, v)

# alignment pattern (centro 22,22 para v3)
def place_align(r, c):
    for dr in range(-2, 3):
        for dc in range(-2, 3):
            rr, cc = r+dr, c+dc
            if dr in (-2,2) or dc in (-2,2) or (dr==0 and dc==0):
                set_fn(rr, cc, 1)
            else:
                set_fn(rr, cc, 0)
place_align(22, 22)

# dark module
set_fn(4*VERSION+9, 8, 1)   # (21,8)

# reservar zonas de formato
def reserve_format():
    for i in range(9):
        if not fn[8][i]:
            set_fn(8, i, 0)
        if not fn[i][8]:
            set_fn(i, 8, 0)
    for i in range(SIZE-8, SIZE):
        set_fn(8, i, 0)
    for i in range(SIZE-7, SIZE):
        set_fn(i, 8, 0)
reserve_format()

# ---- Colocar datos en zigzag ----
di = 0
col = SIZE-1
upward = True
while col > 0:
    if col == 6:
        col -= 1   # saltar columna de timing
    cols = [col, col-1]
    rng = range(SIZE-1, -1, -1) if upward else range(SIZE)
    for r in rng:
        for c in cols:
            if not fn[r][c]:
                bit = final_bits[di] if di < len(final_bits) else 0
                m[r][c] = bit
                di += 1
    upward = not upward
    col -= 2

# ---- Mascaras ----
def mask_cond(k, r, c):
    if k == 0: return (r+c) % 2 == 0
    if k == 1: return r % 2 == 0
    if k == 2: return c % 3 == 0
    if k == 3: return (r+c) % 3 == 0
    if k == 4: return (r//2 + c//3) % 2 == 0
    if k == 5: return (r*c) % 2 + (r*c) % 3 == 0
    if k == 6: return ((r*c) % 2 + (r*c) % 3) % 2 == 0
    if k == 7: return ((r+c) % 2 + (r*c) % 3) % 2 == 0

def fmt_bits(ec_level_bits, mask):
    data = (ec_level_bits << 3) | mask           # 5 bits
    v = data << 10
    g = 0b10100110111
    for i in range(14, 9, -1):
        if (v >> i) & 1:
            v ^= g << (i-10)
    v = ((data << 10) | v) ^ 0b101010000010010
    return v  # 15 bits

def apply_mask(k):
    mm = [row[:] for row in m]
    for r in range(SIZE):
        for c in range(SIZE):
            if not fn[r][c] and mask_cond(k, r, c):
                mm[r][c] ^= 1
    # formato (nivel M = 0b00). fb[i] = bit i (LSB). Ubicacion segun ISO/Nayuki.
    f = fmt_bits(0b00, k)
    fb = [(f >> i) & 1 for i in range(15)]
    # copia 1: alrededor del finder superior-izquierdo
    for i in range(6):
        mm[8][i] = fb[i]
    mm[8][7] = fb[6]
    mm[8][8] = fb[7]
    mm[7][8] = fb[8]
    for i in range(9, 15):
        mm[14 - i][8] = fb[i]
    # copia 2: vertical (bits 0..7) y horizontal (bits 8..14)
    for i in range(8):
        mm[SIZE - 1 - i][8] = fb[i]
    for i in range(8, 15):
        mm[8][SIZE - 15 + i] = fb[i]
    mm[SIZE - 8][8] = 1  # modulo siempre oscuro
    return mm

def penalty(mm):
    p = 0
    # regla 1: corridas
    for line in list(mm) + [list(col) for col in zip(*mm)]:
        run = 1
        for i in range(1, SIZE):
            if line[i] == line[i-1]:
                run += 1
            else:
                if run >= 5: p += 3 + (run-5)
                run = 1
        if run >= 5: p += 3 + (run-5)
    # regla 2: bloques 2x2
    for r in range(SIZE-1):
        for c in range(SIZE-1):
            if mm[r][c]==mm[r][c+1]==mm[r+1][c]==mm[r+1][c+1]:
                p += 3
    # regla 3: patron 1011101 + 4 claros
    pat1 = [1,0,1,1,1,0,1,0,0,0,0]
    pat2 = [0,0,0,0,1,0,1,1,1,0,1]
    for r in range(SIZE):
        for c in range(SIZE-10):
            seg = [mm[r][c+i] for i in range(11)]
            if seg==pat1 or seg==pat2: p += 40
    for c in range(SIZE):
        for r in range(SIZE-10):
            seg = [mm[r+i][c] for i in range(11)]
            if seg==pat1 or seg==pat2: p += 40
    # regla 4: balance
    dark = sum(sum(row) for row in mm)
    ratio = dark*100//(SIZE*SIZE)
    p += min(abs(ratio-50)//5, abs(ratio-50+ (5 - (abs(ratio-50)%5 if abs(ratio-50)%5 else 5)))//5)*10
    prev = (abs(ratio-50)//5)*10
    p += prev
    return p

best = None
best_mm = None
for k in range(8):
    mm = apply_mask(k)
    pen = penalty(mm)
    if best is None or pen < best:
        best = pen; best_mm = mm; best_k = k
print("Mascara elegida:", best_k, "penalidad:", best)

# ---- Verificacion de ida y vuelta: decodificar best_mm y reconstruir la URL ----
def selfdecode(mm, mask):
    # leer formato (copia 1) y confirmar nivel/mascara
    rb = [0]*15
    for i in range(6): rb[i] = mm[8][i]
    rb[6] = mm[8][7]; rb[7] = mm[8][8]; rb[8] = mm[7][8]
    for i in range(9, 15): rb[i] = mm[14-i][8]
    fval = 0
    for i in range(15): fval |= rb[i] << i
    fval ^= 0b101010000010010
    data5 = fval >> 10
    assert (data5 >> 3) == 0, "nivel EC leido != M"
    assert (data5 & 7) == mask, "mascara leida != elegida"
    # leer datos en zigzag, desenmascarando
    rbits = []
    col = SIZE-1; up = True
    while col > 0:
        if col == 6: col -= 1
        for r in (range(SIZE-1,-1,-1) if up else range(SIZE)):
            for c in (col, col-1):
                if not fn[r][c]:
                    b = mm[r][c] ^ (1 if mask_cond(mask, r, c) else 0)
                    rbits.append(b)
        up = not up; col -= 2
    cw = []
    for i in range(0, (DATA_CODEWORDS+EC_CODEWORDS)*8, 8):
        v = 0
        for b in rbits[i:i+8]: v = (v << 1) | b
        cw.append(v)
    dcw = cw[:DATA_CODEWORDS]
    # parsear: 4 bits modo + 8 bits count + bytes
    flat = []
    for v in dcw:
        for i in range(7,-1,-1): flat.append((v>>i)&1)
    def take(p, n):
        x = 0
        for i in range(n): x = (x<<1) | flat[p+i]
        return x
    mode = take(0,4); cnt = take(4,8)
    assert mode == 0b0100, "modo != byte"
    chars = bytes(take(12+8*i, 8) for i in range(cnt))
    return chars.decode('latin-1')

decoded = selfdecode(best_mm, best_k)
assert decoded == URL, "DECODE FAIL: " + repr(decoded)
print("Decode OK -> reconstruye exactamente:", decoded)

# ---- SVG ----
QUIET = 4
total = SIZE + QUIET*2
scale = 10
svg_parts = []
svg_parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total} {total}" width="{total*scale}" height="{total*scale}" shape-rendering="crispEdges">')
svg_parts.append(f'<rect width="{total}" height="{total}" fill="#ffffff"/>')
for r in range(SIZE):
    for c in range(SIZE):
        if best_mm[r][c]:
            svg_parts.append(f'<rect x="{c+QUIET}" y="{r+QUIET}" width="1" height="1" fill="#0b1f3a"/>')
svg_parts.append('</svg>')
svg = ''.join(svg_parts)

with open(r"d:/SII/_RTA/IA_RENTA/apuestas mundial 2026/_qr.svg", "w", encoding="utf-8") as f:
    f.write(svg)
print("SVG escrito. Modulos:", SIZE, "URL:", URL)
