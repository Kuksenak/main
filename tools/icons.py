# The app's icons, "marker doodle + pastel fill" (docs/icons.md), 64x64: each drawn here once,
# written as two SVGs — public/icons/{name}.svg (the outline only, a thicker marker: the small
# ones) and public/icons/filled/{name}.svg (coloured in: the big ones).
#   python tools/icons.py            (from main/)
#   python tools/icons.py doodle     (into ./doodle, with a preview page, doodle.html)
import os, sys

OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), '..', 'public', 'icons')
os.makedirs(OUT, exist_ok=True)

# The marker's ink: a soft dark gray (as the app's icons in rows, --icon on the page), not black
MARKER = '#72716d'
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
    # (drawn 1.5 up and left of where it was: its clock made it sit low and right of the middle)
    'calendar': fill(CREAM, 'M11.2 14.2 49.2 13.8 49.4 49.1 11.4 49.3z')
        + line('M11.1 14.2C22.6 13.6 36.6 13.7 49.2 13.9 48.9 25.4 49 37.4 49.4 49.1 36.6 48.7 23.6 49 11.4 49.3 11.5 37.4 11.2 25.4 11.1 14.2')
        + line('M9.4 23C22.6 22.4 36.6 22.7 51 22.6')
        + thin('M20.4 9 20.7 17.8M39.8 8.8 40.1 17.6')
        + detail('M18.1 30.9h4.5M28.1 30.8h4.5M18.2 39h4.4')
        + '<!--badge-->' + fill(TEAL, ring(44.6, 44.4, 10.5), off=False)
        + line(ring(44.6, 44.4, 10.5))
        + thin('M44.8 38 44.6 44.8 49 47.4'),
    # the sections: nine dots, as Google's apps button — dabbed with the marker: in rows, but each
    # a touch off, its own size, a little squashed
    'grid': ''.join(
        f'<path stroke="none" fill="{MARKER}" '
        f'transform="translate({x + dx} {y + dy}) rotate({t}) scale(1 {q})" d="{ring(0, 0, r)}z"/>'
        for (x, y), (dx, dy, r, q, t) in zip(
            [(x, y) for y in (15.5, 32, 48.5) for x in (15.5, 32, 48.5)],
            [(.5, -.3, 4.7, .92, 20), (-.4, .4, 4.4, 1, 0), (.3, .2, 4.6, .94, -30),
             (-.5, .2, 4.5, .95, 40), (.2, -.5, 4.7, .93, -15), (.5, .4, 4.4, .98, 0),
             (.2, .5, 4.6, .94, 10), (-.4, -.2, 4.7, .92, -40), (.3, .4, 4.4, .96, 25)])),
    # a block's grip (drag it to move the block): six dots, two columns — dabbed as the grid's
    'grip': ''.join(
        f'<path stroke="none" fill="{MARKER}" '
        f'transform="translate({x + dx} {y + dy}) rotate({t}) scale(1 {q})" d="{ring(0, 0, r)}z"/>'
        for (x, y), (dx, dy, r, q, t) in zip(
            [(x, y) for y in (15.5, 32, 48.5) for x in (24, 40)],
            [(.4, -.3, 4.6, .93, 20), (-.3, .4, 4.4, 1, 0), (.3, .2, 4.6, .95, -30),
             (-.4, .2, 4.5, .94, 40), (.2, .5, 4.6, .94, 10), (-.3, -.2, 4.5, .93, -40)])),
    # more (a page's menu, ⋯): three small dots in a row, close together (as Notion's) — dabbed as
    # the grip's
    'dots': ''.join(
        f'<path stroke="none" fill="{MARKER}" '
        f'transform="translate({x + dx} 32.2) rotate({t}) scale(1 {q})" d="{ring(0, 0, r)}z"/>'
        for x, (dx, r, q, t) in zip((20, 32, 44), [(.2, 3.3, .93, 20), (-.1, 3.2, 1, 0), (.1, 3.3, .95, -30)])),
    # a link (copy a page's link): two chain links, slanted, hooked into each other — lines only
    'link': line('M27.1 34.5a12.2 12.2 0 0 0 18.5 1.3l7.4 -7.4a12.2 12.2 0 0 0 -17.3 -17.3l-4.2 4.2M36.9 29.6a12.2 12.2 0 0 0 -18.5 -1.3l-7.4 7.4a12.2 12.2 0 0 0 17.3 17.3l4.2 -4.2'),
    # preview (see it as others do): an eye — its almond, the iris (teal) in it
    'eye': fill(TEAL, ring(32.2, 32.4, 8.4) + 'z')
           + line('M7.8 32.6C14.6 21.8 22.8 16.2 32.2 16.4 41.6 16.2 49.6 21.8 56.4 32 49.8 42.6 41.4 48 32 48 22.4 48.2 14.4 42.8 7.8 32.6z')
           + line(ring(32.2, 32.4, 8.2)),
    # open elsewhere (a page's preview, in a new tab): a window, an arrow out of its corner — lines only
    'popout': line('M33.4 15.6 15.8 15.8C13.2 15.8 11.6 17.4 11.6 20L11.8 48.2C11.8 50.8 13.4 52.4 16 52.4L44.2 52.2C46.8 52.2 48.4 50.6 48.4 48L48.2 30.6')
              + line('M30.2 33.8C37.4 26.6 44.6 19.4 51.8 12.2M39.4 12 52 11.8 52.2 24.4'),
    # duplicate: two sheets, one over the other — the back one's lines, the front one (beige) whole
    'duplicate': fill(BEIGE, 'M23.4 22.6 50.2 22.4 50.4 52.6 23.6 52.8z')
                 + line('M17.8 41.2 15.6 41.2C13.2 41.2 11.6 39.6 11.6 37.2L11.8 15.4C11.8 13 13.4 11.4 15.8 11.4L37.4 11.6C39.8 11.6 41.4 13.2 41.4 15.6L41.4 17.6')
                 + line('M27.4 22.6 46.2 22.4C48.6 22.4 50.2 24 50.2 26.4L50.4 48.6C50.4 51 48.8 52.6 46.4 52.6L27.6 52.8C25.2 52.8 23.6 51.2 23.6 48.8L23.4 26.6C23.4 24.2 25 22.6 27.4 22.6z'),
    # a favorite (a page bookmarked): a bookmark ribbon (rose), its tail cut in
    'bookmark': fill(ROSE, 'M17.6 11.8 46.4 11.6 46.6 53.4 32.2 42.8 17.8 53.6z')
                + line('M21.4 11.6 42.6 11.4C45 11.4 46.4 12.8 46.4 15.2L46.6 53.4 32.2 42.8 17.8 53.6 17.6 15.4C17.6 13 19 11.6 21.4 11.6z'),
    # the AI: a sparkle (yellow) — a four-pointed star, its sides curving in, a small one by it
    'sparkle': fill(YELLOW, 'M28.4 10.6C30 21 33.6 25.6 45.8 28.4 33.8 31.2 30.2 35.8 28.6 47.4 26.8 35.8 23.2 31.2 11.4 28.6 23.4 25.8 26.8 21.2 28.4 10.6z')
        + line('M28.4 10.6C30 21 33.6 25.6 45.8 28.4 33.8 31.2 30.2 35.8 28.6 47.4 26.8 35.8 23.2 31.2 11.4 28.6 23.4 25.8 26.8 21.2 28.6 11.2')
        + line('M46.6 40.2C47.2 44.2 48.6 45.8 52.8 46.6 48.6 47.6 47.2 49.2 46.6 53.6 45.8 49.2 44.4 47.6 40.4 46.6 44.4 45.8 45.8 44.2 46.6 40.4'),
    # Google, drawn as our icons are (beside its own mark, to judge): a G — a round body
    # (teal) its ring open at the top right, the bar in to the middle
    'google-doodle': fill(TEAL, ring(32, 32, 18) + 'z')
        + line('M45 19.6C41.6 16.2 37 14 32 14 22 14 14 22.2 14 32.2 14 42 22 50.2 32.2 50 41.4 49.8 49 43 50 33.6 50.1 32.6 50 31.8 49.8 31 44 31.2 38.4 31.4 33 31.6'),
    # Apple, as ours: an apple (rose), two round sides, a short stem, a leaf (sage) off to the right
    'apple-doodle': fill(ROSE, 'M32 23C26.4 18.6 14.6 19.2 14.4 33.2 14.4 44.6 22.2 53.8 28 53 30 52.6 34.2 52.6 36.2 53 42 53.8 49.8 44.6 49.8 33.6 49.6 21 38 18.6 32 23z')
        + fill(SAGE, 'M34.4 16.4C36 10.8 40.6 8.6 45.4 9.2 44.4 14.4 39.6 17.2 34.4 16.4z', off=False)
        + line('M32 23C26.4 18.6 14.6 19.2 14.4 33.2 14.4 44.6 22.2 53.8 28 53 30 52.6 34.2 52.6 36.2 53 42 53.8 49.8 44.6 49.8 33.6 49.6 21 38 18.6 32.4 22.8')
        + line('M32 22.6C31.8 19.4 32.6 16.6 34.4 14.2')
        + thin('M34.4 16.4C36 10.8 40.6 8.6 45.4 9.2 44.4 14.4 39.6 17.2 34.6 16.4'),
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
    # new: a plus, its strokes a little off
    'plus': line('M32.4 13.2C32.2 25.6 32.3 38.4 31.8 50.8M13.4 32.2C25.6 31.8 38.4 32.1 50.6 31.6'),
    # a page: a sheet (cream), its corner folded, two lines of text
    'page': fill(CREAM, 'M15.6 9.8 39.6 9.6 49.4 19.6 49.6 54.2 15.8 54.4z')
        + line('M39.6 9.6C31.6 9.8 23.6 9.7 15.6 9.8 15.4 24.6 15.6 39.6 15.8 54.4 27 54.2 38.4 54.4 49.6 54.2 49.5 42.6 49.6 31.2 49.4 19.6 46.2 16.2 42.8 12.8 39.6 9.6')
        + thin('M39.6 9.8C39.4 13.2 39.5 16.6 39.6 19.8 42.8 19.7 46.2 19.8 49.2 19.6M22.4 30.4C28.6 30.2 34.8 30.3 41.2 30.2M22.4 38.6C26.6 38.4 30.8 38.5 35 38.4'),
    # delete: a bin (rose), its lid a little askew, two lines down it
    'trash': fill(ROSE, 'M18.2 20.6 46 20.4 43.4 54.2 20.8 54.4z')
        + line('M18.2 20.6C19 31.8 19.8 43 20.8 54.4 28.4 54.2 35.8 54.4 43.4 54.2 44.2 43 45.2 31.6 46 20.4')
        + line('M12.6 20.4C25.6 19.8 38.6 19.6 51.6 19.2M25.6 19.6C25.8 16.8 26.4 13.6 28.6 12.8 31 12.2 33.4 12.4 35.6 12.6 37.8 13.4 38.4 16.2 38.6 19.2')
        + thin('M28.4 28.6 29 46.2M35.8 28.4 35.2 46'),
    # search: a loupe — a big round glass (teal), not quite closed, a glint in it (the big one only);
    # the handle short and firm, out at the bottom right
    'search': fill(TEAL, ring(27, 27, 15.4) + 'z')
        + line(ring(27, 27, 15.4))
        + line('M38.4 38.6C42.4 42.4 46.2 46.4 50.6 50.8')
        + detail('M18.6 24.6C19.6 20.6 22.6 18 26.4 17.4'),
    # filter (what's on the page): a funnel (yellow), wide at the top, its spout a little crooked
    'filter': fill(YELLOW, 'M12.4 14.2 51.6 13.6 36.2 32.4 36.4 50.8 27.8 54.4 27.6 32.6z')
        + line('M12.4 14.2C25.6 13.8 38.6 14 51.6 13.6 46 20 40.6 26.2 36.2 32.4 36.4 38.6 36.2 44.6 36.4 50.8 33.6 52 30.6 53.2 27.8 54.4 27.6 47 27.8 39.6 27.6 32.6 22.6 26.4 17.4 20.4 12.6 14.6'),
    # enter (↵): down, then back to the left, its head
    'enter': line('M47.4 15.2C47.6 22 47.4 28.6 47.2 34.4 47.1 37.2 45.6 38.6 42.8 38.6 34 38.6 25.4 38.4 16.8 38.6')
        + line('M25.4 29.6C22.4 32.6 19.8 35.4 16.6 38.6 19.6 41.6 22.4 44.6 25.6 47.6'),
    # up / down (the search window's keys): a line, its head, a little off
    'arrow-up': line('M32.2 51.2C32 39 32.1 26.8 31.9 14.2')
        + line('M19.4 26.6C23.6 22.4 27.6 18.2 31.9 13.8 36.2 18 40.4 22.2 44.8 26.6'),
    'arrow-down': line('M31.8 12.8C32 25 31.9 37.2 32.1 49.8')
        + line('M19.2 37.4C23.4 41.6 27.6 45.8 32.1 50.2 36.4 46 40.6 41.8 44.6 37.4'),
    # close: a cross, its strokes a little off
    'close': line('M17.2 17C22.4 22.2 27.4 27.4 32.2 32.2 37.2 37.2 42 42 46.8 46.8M46.6 17.4C41.4 22.6 36.4 27.6 31.8 32.4 27 37.2 22.2 42 17.4 46.6'),
    'check': line('M13.6 33.8C18.2 37.8 22.4 41.8 26.6 46.2 33.8 35.6 41.4 26.2 50.6 17.4'),
    'chevron-left': line('M39.2 14.4C33.2 20 27.4 26 21.4 32.2 27 38 32.8 43.8 38.8 49.6'),
    'chevron-right': line('M24.8 14.4C30.8 20 36.6 26 42.6 32.2 37 38 31.2 43.8 25.2 49.6'),
    'chevron-down': line('M14.4 24.8C20 30.8 26 36.6 32.2 42.6 38 37 43.8 31.2 49.6 25.2'),
    # log out: a door, the arrow out of it — lines only, no pastel (in the text's color: as Claude's)
    'logout': line('M34.1 21.4C34.2 18.4 34.1 15.6 34.2 12.6 27 12.3 20.6 12.4 14.1 12.2 14.4 25 14.2 39 14.5 52.2 21 52 27.6 52.1 34.1 51.8 34 48.6 34.2 46 34 42.8')
        + line('M25 32.4C33 31.9 42 32.1 52.6 31.9M44.6 23.4C47.6 26.4 50.2 29.2 53.2 32 50.2 35 47.4 37.6 44.4 40.6'),
    # log out of all devices: another door behind the first — lines only
    'logout-all': line('M9.6 46.8C9.7 35 9.5 22 9.8 8.8 16 8.6 22.4 8.9 28.6 8.7')
        + line('M36.1 24.6C36.2 21.8 36.1 19.4 36.2 16.6 29.6 16.3 23.6 16.4 17.4 16.2 17.6 29 17.5 41.6 17.7 54.5 23.8 54.3 30 54.4 36.1 54.1 36 51.2 36.2 48.6 36 45.6')
        + line('M27.6 35.6C35 35.2 43 35.4 52.8 35.2M45.2 27.2C48 30 50.6 32.6 53.4 35.3 50.6 38.1 47.8 40.6 45 43.4'),
}

HEAD = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="' + MARKER + '" '
        'stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'
        '<defs><filter id="marker" x="-10%" y="-10%" width="120%" height="120%">'
        '<feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="2" seed="4"/>'
        '<feDisplacementMap in="SourceGraphic" scale="2" xChannelSelector="R" yChannelSelector="G"/>'
        '</filter></defs><g filter="url(#marker)">')

import re
INK = float(os.environ.get('INK', 3.4))
WOBBLE = float(os.environ.get('WOBBLE', 0))
os.makedirs(os.path.join(OUT, 'filled'), exist_ok=True)
DATA = {}  # name -> (outline, filled, colored fills, colored lines): also into the app's code (icon-data.ts)
# Small and coloured in (menus, rows): the pastel, a thinner marker, no wobble, no fine details
SMALL_INK = float(os.environ.get('SMALL_INK', 2.6))
for name, body in ICONS.items():
    # coloured in: for the big ones (the phones' sections)
    filled = HEAD + body.replace('<!--badge-->', '') + '</g></svg>\n'
    open(os.path.join(OUT, 'filled', f'{name}.svg'), 'w', encoding='utf-8').write(filled)
    # the outline only (the small ones): no pastel; a badge still hides what's under it (a mask)
    line_body = re.sub(r'<path fill="[^"]+" stroke="none"[^>]*/>', '', body)
    line_body = re.sub(r'<path class="detail"[^>]*/>', '', line_body)
    if '<!--badge-->' in line_body:
        under, badge = line_body.split('<!--badge-->')
        line_body = ('<mask id="cut"><rect width="64" height="64" fill="#fff"/>'
                     '<circle cx="44.6" cy="44.4" r="12.5" fill="#000"/></mask>'
                     f'<g mask="url(#cut)">{under}</g>{badge}')
    # (small: a thicker marker, ~1.5px at 22px, and less wobble — else it blurs to a hairline)
    small = (HEAD.replace('stroke-width="3"', f'stroke-width="{INK}"').replace('scale="2"', f'scale="{WOBBLE}"')
             .replace('numOctaves="2"', 'numOctaves="1"'))
    if not WOBBLE:  # (no wobble at all: no filter — the lines' own bends are the hand)
        small = re.sub(r'<defs>.*</defs><g filter="url\(#marker\)">', '<g>', small)
    outline = small + line_body.replace('stroke-width="2"', f'stroke-width="{INK * 0.7:.1f}"') + '</g></svg>\n'
    open(os.path.join(OUT, f'{name}.svg'), 'w', encoding='utf-8').write(outline)
    # (two layers: the pastel alone — a picture; the lines alone — a mask, so they take the text's
    # color: gray, red on a Log out)
    plain = re.sub(r'<defs>.*</defs><g filter="url\(#marker\)">', '<g>', HEAD.replace('stroke-width="3"', f'stroke-width="{SMALL_INK}"'))
    colored_body = re.sub(r'<path class="detail"[^>]*/>', '', body.replace('<!--badge-->', ''))
    fills = ''.join(re.findall(r'<path fill="[^"]+" stroke="none"[^>]*/>', colored_body))
    lines = re.sub(r'<path fill="[^"]+" stroke="none"[^>]*/>', '', colored_body).replace('stroke-width="2"', f'stroke-width="{SMALL_INK * 0.7:.1f}"')
    DATA[name] = (outline, filled, plain + fills + '</g></svg>\n', plain + lines + '</g></svg>\n')

# The icons in the app's own code as data: URLs — on phones a file each was a request each, the
# icons showing late (one by one) on a slow network
if len(sys.argv) <= 1:
    from urllib.parse import quote

    def data_url(svg):
        return 'data:image/svg+xml,' + quote(svg.strip().replace('"', "'"), safe="'=/: ,.-()")

    lines = ['// Generated by tools/icons.py (python tools/icons.py) — not edited by hand.',
             "// The icons as data: URLs (in the app's code: no request each): the outline, coloured in, small: its pastel, its lines.",
             'export const ICON_DATA: Record<string, readonly [outline: string, filled: string, fills: string, lines: string]> = {']
    for name, (outline, filled, fills, strokes) in DATA.items():
        lines.append(f"  '{name}': [\"{data_url(outline)}\", \"{data_url(filled)}\", \"{data_url(fills)}\", \"{data_url(strokes)}\"],")
    lines.append('};')
    open(os.path.join(os.path.dirname(__file__), '..', 'src', 'app', 'core', 'ui', 'icon', 'icon-data.ts'), 'w',
         encoding='utf-8', newline='\n').write('\n'.join(lines) + '\n')

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
