"""
Generador de iconografía oficial pixel-art de FORJA III.
Reemplaza todos los iconos antiguos (incluyendo los iconos morados de plantilla)
con el emblema original de FORJA III: Yunque de herrero + Numeral Romano III incandescente
en marco de hierro forjado y latón con remaches.
"""
from __future__ import annotations
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PUBLIC_DIR = ROOT / "public"


def hex_rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    h = hex_color.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), alpha)


def draw_rect(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, color: str, alpha: int = 255) -> None:
    if w <= 0 or h <= 0:
        return
    draw.rectangle([x, y, x + w - 1, y + h - 1], fill=hex_rgba(color, alpha))


def build_base_emblem_32(maskable_padding: bool = False) -> Image.Image:
    """
    Construye el emblema de FORJA III sobre una rejilla pixel-art de 32x32 (o 40x40 para maskable).
    """
    size = 40 if maskable_padding else 32
    offset = 4 if maskable_padding else 0

    img = Image.new("RGBA", (size, size), hex_rgba("#090e0c", 255 if maskable_padding else 0))
    draw = ImageDraw.Draw(img)

    if maskable_padding:
        # Textura sutil de taller en la zona de seguridad maskable
        draw_rect(draw, 0, 0, size, size, "#090e0c")
        draw_rect(draw, 2, 2, size - 4, size - 4, "#0d1512")
    else:
        # Silueta octogonal pixel-art con esquinas recortadas (transparente en 1px de esquina)
        draw_rect(draw, 1, 0, 30, 32, "#090e0c")
        draw_rect(draw, 0, 1, 32, 30, "#090e0c")

    ox, oy = offset, offset

    # Marco exterior de bronce/latón trabajado
    draw_rect(draw, ox + 1, oy + 1, 30, 30, "#78350f")
    draw_rect(draw, ox + 2, oy + 2, 28, 28, "#d97706")
    draw_rect(draw, ox + 2, oy + 2, 28, 1, "#fbbf24")  # Brillo superior de latón
    draw_rect(draw, ox + 3, oy + 3, 26, 26, "#111b17")
    draw_rect(draw, ox + 4, oy + 4, 24, 24, "#0c1411")

    # 4 Remaches industriales en las esquinas
    draw_rect(draw, ox + 4, oy + 4, 2, 2, "#fbbf24")
    draw_rect(draw, ox + 26, oy + 4, 2, 2, "#fbbf24")
    draw_rect(draw, ox + 4, oy + 26, 2, 2, "#d97706")
    draw_rect(draw, ox + 26, oy + 26, 2, 2, "#d97706")

    # Resplandor térmico de fragua detrás del numeral III
    draw_rect(draw, ox + 7, oy + 5, 18, 11, "#3b1106")
    draw_rect(draw, ox + 9, oy + 6, 14, 9, "#5c1908")

    # Travesaño superior e inferior del numeral romano III forjado
    draw_rect(draw, ox + 7, oy + 5, 18, 1, "#fde047")
    draw_rect(draw, ox + 7, oy + 6, 18, 1, "#f59e0b")
    draw_rect(draw, ox + 7, oy + 14, 18, 1, "#b45309")

    # Pilar I (Izquierdo)
    draw_rect(draw, ox + 8, oy + 7, 1, 7, "#ea580c")
    draw_rect(draw, ox + 9, oy + 7, 2, 7, "#fbbf24")

    # Pilar II (Central)
    draw_rect(draw, ox + 14, oy + 7, 1, 7, "#ea580c")
    draw_rect(draw, ox + 15, oy + 7, 2, 7, "#fef08a")
    draw_rect(draw, ox + 17, oy + 7, 1, 7, "#f59e0b")

    # Pilar III (Derecho)
    draw_rect(draw, ox + 21, oy + 7, 2, 7, "#fbbf24")
    draw_rect(draw, ox + 23, oy + 7, 1, 7, "#d97706")

    # Yunque pesado de herrero en acero templado (Base del emblema)
    # Cuerno izquierdo del yunque
    draw_rect(draw, ox + 5, oy + 17, 3, 2, "#94a3b8")
    draw_rect(draw, ox + 6, oy + 17, 2, 1, "#cbd5e1")
    # Mesa templada del yunque
    draw_rect(draw, ox + 8, oy + 16, 18, 1, "#e2e8f0")
    draw_rect(draw, ox + 8, oy + 17, 19, 2, "#94a3b8")
    draw_rect(draw, ox + 8, oy + 19, 18, 1, "#64748b")
    # Cintura del yunque con banda de cobre
    draw_rect(draw, ox + 11, oy + 20, 10, 3, "#475569")
    draw_rect(draw, ox + 12, oy + 21, 8, 1, "#f59e0b")
    # Base pesada del yunque
    draw_rect(draw, ox + 8, oy + 23, 16, 2, "#64748b")
    draw_rect(draw, ox + 7, oy + 25, 18, 2, "#334155")

    # Chispas de forja
    draw_rect(draw, ox + 5, oy + 11, 1, 1, "#fde047")
    draw_rect(draw, ox + 25, oy + 10, 1, 1, "#fb923c")

    return img


def main() -> None:
    PUBLIC_DIR.mkdir(parents=True, exist_ok=True)

    emblem32 = build_base_emblem_32(maskable_padding=False)
    maskable40 = build_base_emblem_32(maskable_padding=True)

    # 1. favicon-32x32.png
    emblem32.save(PUBLIC_DIR / "favicon-32x32.png", format="PNG", optimize=True)

    # 2. favicon.ico (16x16 y 32x32)
    emblem16 = emblem32.resize((16, 16), Image.Resampling.NEAREST)
    emblem32.save(PUBLIC_DIR / "favicon.ico", format="ICO", sizes=[(16, 16), (32, 32)], append_images=[emblem16])

    # 3. pwa-192.png (32 * 6 = 192 -> escalado pixel-art exacto)
    pwa192 = emblem32.resize((192, 192), Image.Resampling.NEAREST)
    pwa192.save(PUBLIC_DIR / "pwa-192.png", format="PNG", optimize=True)

    # 4. pwa-512.png (32 * 16 = 512 -> escalado pixel-art exacto)
    pwa512 = emblem32.resize((512, 512), Image.Resampling.NEAREST)
    pwa512.save(PUBLIC_DIR / "pwa-512.png", format="PNG", optimize=True)

    # 5. pwa-maskable-512.png (con margen de seguridad Android maskable)
    maskable512 = maskable40.resize((512, 512), Image.Resampling.NEAREST)
    maskable512.save(PUBLIC_DIR / "pwa-maskable-512.png", format="PNG", optimize=True)

    # 6. apple-touch-icon.png (180x180 sobre fondo sólido oscuro para iOS)
    apple_base = maskable40.resize((180, 180), Image.Resampling.NEAREST)
    apple_base.save(PUBLIC_DIR / "apple-touch-icon.png", format="PNG", optimize=True)

    print("Iconografía FORJA III generada correctamente en public/:")
    for fname in [
        "favicon.svg",
        "favicon-32x32.png",
        "favicon.ico",
        "apple-touch-icon.png",
        "pwa-192.png",
        "pwa-512.png",
        "pwa-maskable-512.png",
    ]:
        p = PUBLIC_DIR / fname
        print(f" - {fname:22s}: {p.stat().st_size:6d} bytes")


if __name__ == "__main__":
    main()
