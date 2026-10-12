"""
FORJA · pipeline de sprites pixel art.

Convierte las hojas generadas (fondo magenta plano, arte ampliado y con
artefactos JPEG) en sprites PNG de baja resolución auténtica y transparentes:

  1. Elimina el fondo magenta (chroma key con tolerancia).
  2. Separa cada objeto por componentes conectados / celdas de la rejilla.
  3. Detecta el tamaño real del «píxel» del arte y reduce la imagen
     promediando solo píxeles opacos (sin halos magenta).
  4. Cuantiza a una paleta limitada para recuperar colores planos.

Uso:  python scripts/art/process_sprites.py <dir_origen>
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "src" / "assets" / "forja"


def magenta_mask(rgb: np.ndarray) -> np.ndarray:
    r, g, b = rgb[..., 0].astype(int), rgb[..., 1].astype(int), rgb[..., 2].astype(int)
    # Magenta: R y B altos, G bajo. Tolerante a compresión JPEG.
    return (r > 150) & (b > 150) & (g < 120) & (np.abs(r - b) < 90)


def estimate_pixel_size(rgb: np.ndarray, opaque: np.ndarray) -> int:
    gray = rgb.mean(axis=2)
    best, best_score = 8, -1.0
    dx = np.abs(np.diff(gray, axis=1)) * opaque[:, 1:]
    dy = np.abs(np.diff(gray, axis=0)) * opaque[1:, :]
    sx, sy = dx.sum(axis=0), dy.sum(axis=1)
    # Rango acotado: evita detectar armónicos (p. ej. 15 cuando el real es 10).
    for p in range(6, 13):
        score = 0.0
        for sig in (sx, sy):
            phases = [sig[ph::p].mean() for ph in range(p)]
            score += (max(phases) - np.mean(phases)) / (np.mean(phases) + 1e-6)
        if score > best_score:
            best, best_score = p, score
    return best


def downsample(rgb: np.ndarray, opaque: np.ndarray, p: int) -> Image.Image:
    h, w = opaque.shape
    gray = rgb.mean(axis=2)
    # Fase de la rejilla: posición con mayor energía de bordes.
    dx = np.abs(np.diff(gray, axis=1)).sum(axis=0)
    dy = np.abs(np.diff(gray, axis=0)).sum(axis=1)
    phx = int(np.argmax([dx[ph::p].sum() for ph in range(p)])) + 1
    phy = int(np.argmax([dy[ph::p].sum() for ph in range(p)])) + 1
    phx %= p
    phy %= p
    nw, nh = (w - phx) // p, (h - phy) // p
    out = np.zeros((nh, nw, 4), dtype=np.uint8)
    for j in range(nh):
        for i in range(nw):
            y0, x0 = phy + j * p, phx + i * p
            # Núcleo central del bloque: evita los bordes contaminados.
            m = max(1, p // 4)
            block_m = opaque[y0 + m : y0 + p - m, x0 + m : x0 + p - m]
            block = rgb[y0 + m : y0 + p - m, x0 + m : x0 + p - m]
            if block_m.mean() < 0.5:
                continue
            px = block[block_m]
            out[j, i, :3] = np.median(px, axis=0)
            out[j, i, 3] = 255
    return Image.fromarray(out, "RGBA")


def quantize(img: Image.Image, colors: int = 40) -> Image.Image:
    alpha = img.getchannel("A")
    q = img.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT).convert("RGB")
    q.putalpha(alpha)
    return q


def remove_specks(img: Image.Image, max_size: int) -> Image.Image:
    """Elimina grupos de píxeles opacos aislados de tamaño ≤ max_size."""
    a = np.asarray(img).copy()
    alpha = a[..., 3] > 0
    seen = np.zeros_like(alpha)
    h, w = alpha.shape
    for y in range(h):
        for x in range(w):
            if not alpha[y, x] or seen[y, x]:
                continue
            stack, comp = [(y, x)], []
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                comp.append((cy, cx))
                for ny, nx in ((cy + 1, cx), (cy - 1, cx), (cy, cx + 1), (cy, cx - 1)):
                    if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            if len(comp) <= max_size:
                for cy, cx in comp:
                    a[cy, cx, 3] = 0
    return Image.fromarray(a, "RGBA")


def trim(img: Image.Image, pad: int = 1) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    cropped = img.crop((l, t, r, b))
    canvas = Image.new("RGBA", (cropped.width + pad * 2, cropped.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(cropped, (pad, pad))
    return canvas


def process_cell(rgb: np.ndarray, name: str, colors: int = 40, force_p: int | None = None) -> None:
    opaque = ~magenta_mask(rgb)
    # Limpieza: elimina motas aisladas de ruido JPEG.
    p = force_p or estimate_pixel_size(rgb, opaque)
    speck = 0 if name == "chain_broken" else 3  # las chispas son intencionadas
    sprite = trim(remove_specks(quantize(downsample(rgb, opaque, p), colors), speck))
    OUT.joinpath("sprites").mkdir(parents=True, exist_ok=True)
    sprite.save(OUT / "sprites" / f"{name}.png", optimize=True)
    print(f"{name:14s} pixel={p:2d} -> {sprite.width}x{sprite.height}")


def grid_cells(img: Image.Image, cols: int, rows: int):
    arr = np.asarray(img.convert("RGB"))
    h, w = arr.shape[:2]
    for r in range(rows):
        for c in range(cols):
            yield r, c, arr[r * h // rows : (r + 1) * h // rows, c * w // cols : (c + 1) * w // cols]


def main(src: Path) -> None:
    sheets = {
        "forja_sprite_sheet_1": (3, 3, ["moto", "jerrycan", "tools", "coins", "parcel", "gauge", "strongbox", "cog", "ledger"]),
        "forja_sprite_sheet_two": (3, 3, ["helmet", "chain", "iou", "calendar", "flag", "blueprint", "lever", "conveyor", "sack"]),
        "forja_empty_states": (2, 2, ["empty_crate", "empty_bench", "chain_broken", "ledger_check"]),
    }
    for prefix, (cols, rows, names) in sheets.items():
        matches = sorted(src.glob(f"{prefix}*.jpg"))
        if not matches:
            print("falta", prefix)
            continue
        img = Image.open(matches[-1])
        for r, c, cell in grid_cells(img, cols, rows):
            process_cell(cell, names[r * cols + c])

    moto = sorted(src.glob("forja_moto_large*.jpg"))
    if moto:
        process_cell(np.asarray(Image.open(moto[-1]).convert("RGB")), "moto_large", colors=48, force_p=8)

    hero = sorted(src.glob("forja_workshop_hero*.jpg"))
    if hero:
        img = Image.open(hero[-1]).convert("RGB")
        arr = np.asarray(img).astype(int)
        # Recorta las bandas negras superior/inferior (letterbox) del render.
        rows = arr.mean(axis=(1, 2))
        top = next(i for i, v in enumerate(rows) if v > 22)
        bottom = len(rows) - next(i for i, v in enumerate(rows[::-1]) if v > 22)
        img = img.crop((0, top, img.width, bottom))
        OUT.mkdir(parents=True, exist_ok=True)
        img.save(OUT / "workshop_hero.webp", quality=92, method=6)
        print(f"hero -> {img.width}x{img.height}")


if __name__ == "__main__":
    main(Path(sys.argv[1]))
