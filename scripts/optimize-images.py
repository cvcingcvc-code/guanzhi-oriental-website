from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "images" / "optimized"
OUTPUT.mkdir(parents=True, exist_ok=True)

IMAGES = {
    ROOT / "public" / "images" / "Gemini_Generated_Image_stds6ostds6ostds (1).png": "hero.webp",
    ROOT / "public" / "images" / "Gemini_Generated_Image_stds6ostds6ostds (4).png": "motif-library.webp",
    ROOT / "public" / "images" / "Gemini_Generated_Image_stds6ostds6ostds (5).png": "motif-tea-silk.webp",
    ROOT / "public" / "images" / "Gemini_Generated_Image_stds6ostds6ostds (6).png": "motif-kunqu.webp",
    ROOT / "public" / "images" / "Gemini_Generated_Image_stds6ostds6ostds (7).png": "jiangnan.webp",
    **{ROOT / "public" / "images" / "partners" / f"partner-{i:02}.png": f"partner-{i:02}.webp" for i in range(1, 7)},
}

for source, output_name in IMAGES.items():
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail((1440, 1440), Image.Resampling.LANCZOS)
        image.save(OUTPUT / output_name, "WEBP", quality=72, method=6)
        print(f"{output_name}: {(OUTPUT / output_name).stat().st_size} bytes")
