"""Build uncropped WebP photos for the People dialog, including alumni."""
import hashlib
import json

from PIL import Image, ImageOps
from generate_people_images import PROJECT_ROOT, PEOPLE_PATH, OUTPUT_DIR, output_url, to_rgb


def main():
    people = json.loads(PEOPLE_PATH.read_text(encoding="utf-8"))
    sources = dict.fromkeys(
        member.get("photo") or member.get("image")
        for group in people["groups"] for member in group["members"]
    )
    manifest = {}
    original_total = optimized_total = 0
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for url in sources:
        if not url:
            continue
        source = PROJECT_ROOT / url.lstrip("/")
        digest = hashlib.sha256(source.read_bytes()).hexdigest()[:10]
        target = OUTPUT_DIR / f"{source.stem}-{digest}-full-1600-v1.webp"
        with Image.open(source) as opened:
            photo = to_rgb(ImageOps.exif_transpose(opened))
            photo.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
            photo.save(target, "WEBP", quality=82, method=6)
        manifest[url] = output_url(target)
        original_total += source.stat().st_size
        optimized_total += target.stat().st_size
        print(f"{source.name}: {source.stat().st_size} -> {target.stat().st_size} bytes")
    (PROJECT_ROOT / "content/people-photos.json").write_text(
        json.dumps({"photos": manifest}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(manifest)} photos: {original_total} -> {optimized_total} bytes")


if __name__ == "__main__":
    main()
