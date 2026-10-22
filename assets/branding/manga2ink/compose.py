"""Compose the badge and compact mark from the two reviewed native SVG sources."""
from pathlib import Path
import copy
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
ET.register_namespace('inkscape', 'http://www.inkscape.org/namespaces/inkscape')


def tag(name):
    return f'{{{NS}}}{name}'


def compose():
    character = ET.parse(ROOT / 'character.svg').getroot()
    wordmark = ET.parse(ROOT / 'wordmark.svg').getroot()
    for kind in ('logo', 'icon'):
        root = ET.Element(tag('svg'), {
            'viewBox': '0 0 1055 1055', 'width': '1055', 'height': '1055',
            'role': 'img', 'aria-labelledby': 'title description',
        })
        ET.SubElement(root, tag('title'), id='title').text = f'Manga2Ink {kind}'
        ET.SubElement(root, tag('desc'), id='description').text = (
            'Adapted from JPmarquesbraga artwork, with a reconstructed crown and '
            'a reference-aligned native vector character. The original high '
            'collar is retained. No embedded bitmap or external font is used. '
            + ('Grenze Black lettering is converted to editable paths.' if kind == 'logo'
               else 'Text-free compact mark for app icons and favicons.')
        )
        defs = ET.SubElement(root, tag('defs'))
        for source in (character, wordmark) if kind == 'logo' else (character,):
            for definition in source.findall(tag('defs')):
                for item in definition:
                    defs.append(copy.deepcopy(item))
        ET.SubElement(root, tag('rect'), {
            'id': 'badge', 'width': '1055', 'height': '1055',
            'rx': '235', 'fill': '#0b1d30',
        })
        clip = ET.SubElement(defs, tag('clipPath'), id=f'{kind}-crop')
        if kind == 'logo':
            ET.SubElement(clip, tag('rect'), x='0', y='55', width='1055', height='641')
        else:
            ET.SubElement(clip, tag('rect'), width='1055', height='1055', rx='235')
        frame = ET.SubElement(root, tag('g'), {'clip-path': f'url(#{kind}-crop)'})
        art = ET.SubElement(frame, tag('g'), {'id': 'character-art'})
        if kind == 'icon':
            # Crop the bust at the badge base; keep the full crown visible.
            art.set('transform', 'translate(-222 80.6) scale(1.4)')
        for layer in character:
            if layer.tag == tag('g'):
                art.append(copy.deepcopy(layer))
        if kind == 'logo':
            root.append(copy.deepcopy(next(n for n in wordmark if n.get('id') == 'wordmark')))
        ET.indent(root, space='  ')
        (ROOT / f'{kind}.svg').write_bytes(
            ET.tostring(root, encoding='utf-8', xml_declaration=True) + b'\n'
        )


if __name__ == '__main__':
    compose()
