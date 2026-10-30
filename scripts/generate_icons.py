import os
import zlib
import struct
import math

def make_png(width, height, pixel_func):
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter byte (None)
        for x in range(width):
            r, g, b, a = pixel_func(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    # PNG signature
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    
    # IHDR: width(4), height(4), bit_depth(1), color_type(1), compression(1), filter(1), interlace(1)
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    png.extend(struct.pack('>I', len(ihdr_data)))
    png.extend(b'IHDR')
    png.extend(ihdr_data)
    png.extend(struct.pack('>I', ihdr_crc))
    
    # IDAT
    compressed = zlib.compress(bytes(raw_data), 9)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    png.extend(struct.pack('>I', len(compressed)))
    png.extend(b'IDAT')
    png.extend(compressed)
    png.extend(struct.pack('>I', idat_crc))
    
    # IEND
    iend_crc = zlib.crc32(b'IEND')
    png.extend(struct.pack('>I', 0))
    png.extend(b'IEND')
    png.extend(struct.pack('>I', iend_crc))
    
    return bytes(png)

def icon_pixel(x, y, w, h, maskable=False):
    # Normalized coords -1 to 1
    nx = (x / w) * 2.0 - 1.0
    ny = (y / h) * 2.0 - 1.0
    
    # Background dark charcoal gradient
    bg_r = int(10 + 15 * ((ny + 1) / 2))
    bg_g = int(14 + 12 * ((ny + 1) / 2))
    bg_b = int(24 + 20 * ((ny + 1) / 2))
    
    # Maskable has full bleed background, standard has rounded rect
    if not maskable:
        # Rounded corner calculation (radius ~ 25% of w)
        corner_r = 0.28
        dx = max(0.0, abs(nx) - (1.0 - corner_r))
        dy = max(0.0, abs(ny) - (1.0 - corner_r))
        dist = math.sqrt(dx*dx + dy*dy)
        if dist > corner_r:
            return (0, 0, 0, 0) # transparent outside rounded rect

    # Draw centered triangle (Play symbol)
    # Scale play symbol: center is (0.05, 0)
    scale = 0.55 if not maskable else 0.42
    px = (nx - 0.04) / scale
    py = ny / scale
    
    # Triangle vertices: (-0.6, -0.7), (-0.6, 0.7), (0.7, 0.0)
    # Point in triangle test using barycentric coordinates
    p0x, p0y = -0.5, -0.65
    p1x, p1y = -0.5, 0.65
    p2x, p2y = 0.65, 0.0
    
    area = 0.5 * (-p1y * p2x + p0y * (-p1x + p2x) + p0x * (p1y - p2y) + p1x * p2y)
    s = 1 / (2 * area) * (p0y * p2x - p0x * p2y + (p2y - p0y) * px + (p0x - p2x) * py)
    t = 1 / (2 * area) * (p0x * p1y - p0y * p1x + (p0y - p1y) * px + (p1x - p0x) * py)
    
    in_triangle = (s >= 0) and (t >= 0) and (1 - s - t >= 0)
    
    if in_triangle:
        # Vibrant electric blue to purple gradient
        grad = (ny + 1.0) / 2.0
        r = int(14 + grad * 125)  # 14 -> 139
        g = int(165 - grad * 73)  # 165 -> 92
        b = int(233 + grad * 13)  # 233 -> 246
        return (r, g, b, 255)
    
    # Glowing ring around edges
    rad = math.sqrt(nx*nx + ny*ny)
    if not maskable and 0.85 < rad < 0.92:
        return (14, 165, 233, 140)

    return (bg_r, bg_g, bg_b, 255)

os.makedirs('public/icons', exist_ok=True)

# 192x192
with open('public/icons/icon-192x192.png', 'wb') as f:
    f.write(make_png(192, 192, lambda x, y, w, h: icon_pixel(x, y, w, h, False)))

# 512x512
with open('public/icons/icon-512x512.png', 'wb') as f:
    f.write(make_png(512, 512, lambda x, y, w, h: icon_pixel(x, y, w, h, False)))

# Maskable 512x512
with open('public/icons/icon-maskable-512x512.png', 'wb') as f:
    f.write(make_png(512, 512, lambda x, y, w, h: icon_pixel(x, y, w, h, True)))

print("Successfully generated PWA icons.")
