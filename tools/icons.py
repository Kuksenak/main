# The app's icons, "marker doodle + pastel fill" (docs/icons.md), 64x64: each drawn here once,
# written as two SVGs — public/icons/ui/{name}.svg (the outline only, a thicker marker: the small
# ones) and public/icons/ui/filled/{name}.svg (coloured in: the big ones).
#   python tools/icons.py            (from main/)
#   python tools/icons.py doodle     (into ./doodle, with a preview page, doodle.html)
import os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'icons', 'ui')
os.makedirs(OUT, exist_ok=True)

BEIGE, TEAL, SAGE, CREAM, ROSE, YELLOW = '#E5E4DF', '#C5DAD8', '#CBD5BF', '#F2EAD7', '#E9D3CE', '#F3E7B8'
OFF = 'transform="translate(1.4 1.1)"'  # a pastel a little off its outline, as coloured in by hand


def fill(color, d, off=True):
    return f'<path fill="{color}" stroke="none" {OFF if off else ""} d="{d}"/>'


def detail(d):  # a fine detail: the big ones only (small, it'd blur into a blot)
    return f'<path class="detail" stroke-width="2" d="{d}"/>'


def thin(d):  # inner details: the same marker, thinner (~65%)
    return f'<path stroke-width="2" d="{d}"/>'


def line(d):
    return f'<path d="{d}"/>'


# a wobbly, not-quite-closed circle around (cx, cy), radius r
def ring(cx, cy, r):
    k = 0.56 * r
    return (f'M{cx + .3} {cy - r} C{cx + k + .4} {cy - r + .2} {cx + r + .2} {cy - k} {cx + r - .2} {cy + .4} '
            f'C{cx + r - .4} {cy + k + .3} {cx + k} {cy + r + .3} {cx - .2} {cy + r - .1} '
            f'C{cx - k - .3} {cy + r - .2} {cx - r - .2} {cy + k} {cx - r + .1} {cy - .3} '
            f'C{cx - r + .3} {cy - k - .4} {cx - k + .2} {cy - r - .6} {cx + 1.6} {cy - r + .3}')


ICONS = {
    # a house (beige), crooked: the roof off to one side and running over, the walls leaning, a
    # chimney; its door (sage)
    'home': fill(BEIGE, 'M16.4 29.6 31.6 16.8 47.6 28.2 48.8 50.6 15.4 51.4z')
        + line('M9.2 33.8C15.8 27.6 23.8 20.4 31.3 13.4 38.4 18.8 46.2 25.4 55.2 31')
        + line('M16.3 28.6C15.4 36.2 15 44.2 15.5 51.7 26.4 50.6 37.6 51.3 49.2 50.3 48.1 43.4 48.6 35.6 47.5 27.4')
        + line('M40.1 21.2C40.2 18.6 40.4 16.2 40.6 13.5 42.2 13.4 43.8 13.6 45.5 13.9 45.4 17.4 45.3 21 45.1 24.8')
        + fill(SAGE, 'M27.7 50.9 28.6 39.7 36.4 40.3 36.2 50.8z', off=False)
        + thin('M27.7 50.9C27.9 47 28.2 43.4 28.6 39.7 31.2 39.6 33.9 40 36.4 40.3 36.1 43.8 36.3 47.4 36.2 50.8'),
    # a calendar page (cream), a clock badge (teal) at its corner
    'calendar': fill(CREAM, 'M12.6 15.8 50.6 15.4 50.8 50.7 12.8 50.9z')
        + line('M12.5 15.8C24 15.2 38 15.3 50.6 15.5 50.3 27 50.4 39 50.8 50.7 38 50.3 25 50.6 12.8 50.9 12.9 39 12.6 27 12.5 15.8')
        + line('M10.8 24.6C24 24 38 24.3 52.4 24.2')
        + thin('M21.8 10.6 22.1 19.4M41.2 10.4 41.5 19.2')
        + detail('M19.5 32.5h4.5M29.5 32.4h4.5M19.6 40.6h4.4')
        + '<!--badge-->' + fill(TEAL, ring(46, 46, 10.5), off=False)
        + line(ring(46, 46, 10.5))
        + thin('M46.2 39.6 46 46.4 50.4 49'),
    # the sections: nine dots, as Google's apps button — dabbed with the marker: in rows, but each
    # a touch off, its own size, a little squashed
    'grid': ''.join(
        f'<path stroke="none" fill="#1a1a1a" '
        f'transform="translate({x + dx} {y + dy}) rotate({t}) scale(1 {q})" d="{ring(0, 0, r)}z"/>'
        for (x, y), (dx, dy, r, q, t) in zip(
            [(x, y) for y in (15.5, 32, 48.5) for x in (15.5, 32, 48.5)],
            [(.5, -.3, 4.7, .92, 20), (-.4, .4, 4.4, 1, 0), (.3, .2, 4.6, .94, -30),
             (-.5, .2, 4.5, .95, 40), (.2, -.5, 4.7, .93, -15), (.5, .4, 4.4, .98, 0),
             (.2, .5, 4.6, .94, 10), (-.4, -.2, 4.7, .92, -40), (.3, .4, 4.4, .96, 25)])),
    # a person, as a bust: the body (rose) a soft arch, a little lopsided; the head over it (beige),
    # its outline not quite closed
    'person': fill(ROSE, 'M14.6 52C14.4 43.6 20.6 36.8 31.6 36.6 42.6 36.6 49.6 43 49.8 51.6z')
        + line('M14.2 52.2C14 43.4 20.4 36.6 31.6 36.4 42.8 36.4 50 42.8 50.2 51.8')
        + line('M12.4 52.4C25 51.8 39 52 51.8 51.6')
        + fill(BEIGE, ring(32.4, 20.6, 9.6) + 'z')
        + line(ring(32.4, 20.6, 9.6)),
    # the library: three books on a shelf, the last one leaning on the others
    'library': fill(SAGE, 'M12.6 16.4 21 16.2 21.2 50.2 12.8 50.4z')
        + fill(CREAM, 'M22.6 11.8 31.4 11.6 31.6 50.2 22.8 50.4z')
        + fill(ROSE, 'M34.6 19.6 42.4 17.4 51.4 48.4 43.6 50.6z')
        + line('M12.8 50.4C12.6 39 12.7 27.6 12.6 16.4 15.4 16.2 18.2 16.3 21 16.2 21.1 27.6 21 39 21.2 50.2')
        + line('M22.8 50.4C22.6 37.6 22.7 24.6 22.6 11.8 25.6 11.6 28.4 11.8 31.4 11.6 31.5 24.6 31.4 37.6 31.6 50.2')
        + line('M43.6 50.6C40.6 40.4 37.6 30 34.6 19.6 37.2 18.8 39.8 18.1 42.4 17.4 45.4 27.8 48.4 38 51.4 48.4')
        + thin('M15 23.4 18.8 23.3M25.2 19.6 29.2 19.5M25.1 24 29.1 23.9')
        + line('M8.8 51.6C24 50.8 39.6 51 55.4 50.6'),
    # an update: two arrows chasing each other round (as a refresh), a gap between them, each
    # its own curve; a teal dab
    # in the middle
    'update': fill(TEAL, ring(32, 32, 10) + 'z')
        + line('M49.3 33.8A17.1 17.7 8 0 1 20.3 44.1M21.5 52.2 20.3 44.1 28.5 44.9')
        + line('M15.1 30.2A17.2 17.9 8 0 1 44.2 19.4M43.0 11.3 44.2 19.4 36.0 18.6'),
    # the language: a globe (teal), a meridian, the equator
    'globe': fill(TEAL, ring(32, 32, 20) + 'z')
        + line(ring(32, 32, 20))
        + thin('M31.6 12.4C25.6 18.6 23.2 25.4 23.4 32.2 23.6 39.2 26.4 45.6 32.2 51.6M32.6 12.4C38.4 18.4 40.8 25.2 40.6 32 40.4 39 37.6 45.6 31.8 51.6')
        + thin('M10.6 32.4C25 31.8 39 32 53.4 31.8'),
    # who may do what (Users): a padlock — its body (yellow) a little crooked, the shackle over it
    # not quite even, a keyhole
    'lock': fill(YELLOW, 'M14.6 29.6 49.4 29.2 49.8 53.4 14.8 53.8z')
        + line('M14.6 29.6C26 29.2 37.8 29.4 49.4 29.2 49.6 37.4 49.5 45.4 49.8 53.4 38 53.6 26.4 53.5 14.8 53.8 14.9 45.6 14.7 37.6 14.6 29.6')
        + line('M21.4 29.2C21 24.8 21.2 20.6 22.6 17.4 24.6 12.6 28.2 10.2 32.2 10.2 36.4 10.3 39.8 12.8 41.6 17.6 42.8 20.8 42.9 25 42.6 29.4')
        + thin('M32 38.6C33.6 38.6 34.6 39.6 34.5 41 34.4 42.2 33.6 42.9 32.6 43.2 32.7 45.2 32.6 46.8 32.4 48.6M32 38.6C30.4 38.7 29.4 39.8 29.6 41.2 29.7 42.3 30.5 43 31.4 43.2 31.3 45.1 31.4 46.8 31.6 48.6'),
    'check': line('M13.6 33.8C18.2 37.8 22.4 41.8 26.6 46.2 33.8 35.6 41.4 26.2 50.6 17.4'),
    'chevron-left': line('M39.2 14.4C33.2 20 27.4 26 21.4 32.2 27 38 32.8 43.8 38.8 49.6'),
    'chevron-right': line('M24.8 14.4C30.8 20 36.6 26 42.6 32.2 37 38 31.2 43.8 25.2 49.6'),
    'chevron-down': line('M14.4 24.8C20 30.8 26 36.6 32.2 42.6 38 37 43.8 31.2 49.6 25.2'),
    # log out: a door (beige), the arrow out of it
    'logout': fill(BEIGE, 'M14.2 12.4 34.2 12.6 34 52 14.5 52.3z')
        + line('M34.1 21.4C34.2 18.4 34.1 15.6 34.2 12.6 27 12.3 20.6 12.4 14.1 12.2 14.4 25 14.2 39 14.5 52.2 21 52 27.6 52.1 34.1 51.8 34 48.6 34.2 46 34 42.8')
        + line('M25 32.4C33 31.9 42 32.1 52.6 31.9M44.6 23.4C47.6 26.4 50.2 29.2 53.2 32 50.2 35 47.4 37.6 44.4 40.6'),
    # log out of all devices: another door (sage) behind the first
    'logout-all': fill(SAGE, 'M9.6 8.8 28.4 8.9 28.3 46.5 9.8 46.8z')
        + line('M9.6 46.8C9.7 35 9.5 22 9.8 8.8 16 8.6 22.4 8.9 28.6 8.7')
        + fill(BEIGE, 'M17.4 16.4 36.2 16.6 36 54.4 17.6 54.6z', off=False)
        + line('M36.1 24.6C36.2 21.8 36.1 19.4 36.2 16.6 29.6 16.3 23.6 16.4 17.4 16.2 17.6 29 17.5 41.6 17.7 54.5 23.8 54.3 30 54.4 36.1 54.1 36 51.2 36.2 48.6 36 45.6')
        + line('M27.6 35.6C35 35.2 43 35.4 52.8 35.2M45.2 27.2C48 30 50.6 32.6 53.4 35.3 50.6 38.1 47.8 40.6 45 43.4'),
}

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="#1a1a1a" '
        'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
        '<defs><filter id="marker" x="-10%" y="-10%" width="120%" height="120%">'
        '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4"/>'
        '<feDisplacementMap in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G"/>'
        '</filter></defs><g filter="url(#marker)">')

import re
INK = float(os.environ.get('INK', 3.4))
WOBBLE = float(os.environ.get('WOBBLE', 0))
os.makedirs(os.path.join(OUT, 'filled'), exist_ok=True)
for name, body in ICONS.items():
    # coloured in: for the big ones (the phones' sections)
    open(os.path.join(OUT, 'filled', f'{name}.svg'), 'w', encoding='utf-8').write(
        HEAD + body.replace('<!--badge-->', '') + '</g></svg>\n')
    # the outline only (the small ones): no pastel; a badge still hides what's under it (a mask)
    line_body = re.sub(r'<path fill="[^"]+" stroke="none"[^>]*/>', '', body)
    line_body = re.sub(r'<path class="detail"[^>]*/>', '', line_body)
    if '<!--badge-->' in line_body:
        under, badge = line_body.split('<!--badge-->')
        line_body = ('<mask id="cut"><rect width="64" height="64" fill="#fff"/>'
                     '<circle cx="46" cy="46" r="12.5" fill="#000"/></mask>'
                     f'<g mask="url(#cut)">{under}</g>{badge}')
    # (small: a thicker marker, ~1.5px at 22px, and less wobble — else it blurs to a hairline)
    small = (HEAD.replace('stroke-width="3"', f'stroke-width="{INK}"').replace('scale="2"', f'scale="{WOBBLE}"')
             .replace('numOctaves="2"', 'numOctaves="1"'))
    if not WOBBLE:  # (no wobble at all: no filter — the lines' own bends are the hand)
        small = re.sub(r'<defs>.*</defs><g filter="url\(#marker\)">', '<g>', small)
    open(os.path.join(OUT, f'{name}.svg'), 'w', encoding='utf-8').write(
        small + line_body.replace('stroke-width="2"', f'stroke-width="{INK * 0.7:.1f}"') + '</g></svg>\n')

if OUT == 'doodle':
    def row(bg):
        cells = ''.join(
            f'<div class="c"><img src="doodle/{n}.svg" width="26"><img src="doodle/{n}.svg" width="48">'
            f'<img src="doodle/filled/{n}.svg" width="48"><span>{n}</span></div>' for n in ICONS)
        return f'<div style="background:{bg};padding:8px">{cells}</div>'
    refs = ''.join(f'<img src="file:///C:/source/tmp/adnak/tmp/Screenshot 2026-10-24 {n}.png" height="90">'
                   for n in ['001203', '001223', '001251'])
    open('doodle.html', 'w', encoding='utf-8').write(
        '<html><body style="margin:8px;font:11px sans-serif;color:#555;background:#FAF9F5">'
        '<style>.c{display:inline-flex;align-items:flex-end;gap:8px;width:235px;margin:4px}</style>'
        + refs + row('#FAF9F5') + row('#CBD5BF')
        + '<div style="filter:invert(1) hue-rotate(180deg)">' + row('#FAF9F5') + '</div></body></html>')
