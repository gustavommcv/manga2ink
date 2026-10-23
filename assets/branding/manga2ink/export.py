"""Export reviewed vector masters without changing the app's active assets.

Requires Python with Pillow, Node and the repository's Playwright dependency.
Use --browser-executable to select an installed Chromium-based browser instead
of Playwright's bundled Chromium. This is a manual artwork tool, not a build step.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'exports'
SIZES = (16, 20, 24, 32, 40, 48, 64, 128, 256)


def validate_svg(path):
    root = ET.parse(path).getroot()
    ids = [node.get('id') for node in root.iter() if node.get('id')]
    assert len(ids) == len(set(ids)), f'Duplicate IDs in {path.name}'
    for node in root.iter():
        assert node.tag.split('}')[-1] not in {'image', 'text', 'script', 'foreignObject'}
        for attribute, value in node.attrib.items():
            if attribute.split('}')[-1] == 'href':
                assert value.startswith('#'), f'External reference in {path.name}'
            if 'url(' in value:
                assert value.startswith('url(#') and value.endswith(')'), value
                assert value[5:-1] in ids, f'Unresolved reference: {value}'
    return len(list(root.iter()))


def resize(image, size):
    return image.resize(size, Image.Resampling.LANCZOS)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--browser-executable')
    args = parser.parse_args()
    from compose import compose
    compose()
    OUT.mkdir(exist_ok=True)
    masters = {'logo': (4096, 4096), 'icon': (4096, 4096),
               'character': (4096, round(4096 * 730 / 862)), 'wordmark': (4096, 1280)}
    for name in masters:
        validate_svg(ROOT / f'{name}.svg')
    with tempfile.TemporaryDirectory(prefix='manga2ink-art-') as temporary:
        temp = Path(temporary)
        jobs = [{'source': str(ROOT / f'{name}.svg'), 'destination': str(temp / f'{name}.png'),
                 'width': size[0], 'height': size[1]} for name, size in masters.items()]
        subprocess.run(['node', str(ROOT / 'render.mjs')],
                       input=json.dumps({'jobs': jobs, 'executablePath': args.browser_executable}),
                       text=True, check=True)
        images = {name: Image.open(temp / f'{name}.png').convert('RGBA') for name in masters}
        for name in ('logo', 'character', 'wordmark'):
            images[name].save(OUT / f'{name}-4096.png', optimize=True)
        icon = images['icon']
        resize(icon, (1024, 1024)).save(OUT / 'manga2ink.png', optimize=True)
        resize(icon, (256, 256)).save(OUT / 'manga2ink.ico', sizes=[(s, s) for s in SIZES])
        # Keep the established macOS mark-to-canvas ratio of 1055 / 1254.
        mac = Image.new('RGBA', (1024, 1024))
        mark_size = round(1024 * 1055 / 1254)
        mac.alpha_composite(resize(icon, (mark_size, mark_size)),
                            ((1024-mark_size)//2, (1024-mark_size)//2))
        mac.save(OUT / 'manga2ink.icns')
        for size in (48, 192):
            resize(icon, (size, size)).save(OUT / f'mark-{size}.webp', lossless=True, method=6)
        resize(icon, (128, 128)).save(OUT / 'header.webp', lossless=True, method=6)
        resize(icon, (64, 64)).save(OUT / 'favicon.ico', sizes=[(s, s) for s in (16, 32, 48, 64)])
        social = Image.new('RGBA', (1200, 630), '#0b1d30')
        social.alpha_composite(resize(images['logo'], (590, 590)), (305, 20))
        social.convert('RGB').save(OUT / 'social-preview.png', optimize=True)

    # Decode all outputs, and keep dimensions and hashes alongside the exports.
    manifest = {}
    for path in sorted([*ROOT.glob('*.svg'), *OUT.glob('*.png'), *OUT.glob('*.webp'), *OUT.glob('*.ico'), *OUT.glob('*.icns')]):
        entry = {'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        if path.suffix == '.svg':
            entry['elements'] = validate_svg(path)
        else:
            with Image.open(path) as image:
                image.load()
                entry['dimensions'] = list(image.size)
                if path.suffix == '.ico':
                    sizes = sorted(image.ico.sizes())
                    entry['representations'] = [list(size) for size in sizes]
                    expected = SIZES if path.stem == 'manga2ink' else (16, 32, 48, 64)
                    assert sizes == [(s, s) for s in expected]
                    for size in sizes:
                        image.ico.getimage(size).load()
                if path.suffix == '.icns':
                    sizes = image.info['sizes']
                    entry['representations'] = [list(size) for size in sizes]
                    for size in sizes:
                        image.size = size
                        image.load()
        manifest[path.relative_to(ROOT).as_posix()] = entry
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(f'Exported and decoded {len(manifest)} assets in {OUT}')


if __name__ == '__main__':
    main()
