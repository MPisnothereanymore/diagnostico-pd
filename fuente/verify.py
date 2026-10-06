import re

html_path = 'Radar FRPD Araucanía.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

print('HTML length:', len(html))

selectors = [
    'ipt-card', 'ipt-btn-map', 'ipt-btn-map-plad', 'ipt-btn-map-grd',
    'ipt-btn-map-pladet', 'ipt-btn-map-paccc', 'ipt-btn-map-adi', 'ipt-btn-map-descont', 'ipt-btn-map-frpd',
    'ipt-csv', 'ipt-f-ter', 'ipt-f-frpd', 'ipt-f-est', 'ipt-f-plad', 'ipt-f-grd',
    'ipt-f-pladet', 'ipt-f-paccc', 'ipt-f-adi', 'ipt-f-descont', 'ipt-f-threat', 'ipt-f-reg',
    'ipt-q', 'ipt-clear', 'ipt-tbl-wrap'
]

for s in selectors:
    assert f'id="{s}"' in html, f'Missing ID: {s}'

print('All 24 element IDs verified in generated HTML!')

# Check that all 32 communes are in IPT_DATA
matches = re.findall(r'\{ c:\s*(\d+),\s*com:\s*\'([^\']+)\'', html)
print(f'Found {len(matches)} communes in IPT_DATA')
assert len(matches) == 32, f'Expected 32 communes, found {len(matches)}'

# Check required fields
required_fields = [
    'pladetEst', 'pladetLbl', 'pacccEst', 'pacccLbl',
    'adi', 'adiNom', 'descont', 'descontDet',
    'frpdNivel', 'frpdVal', 'frpdCol', 'frpdCls', 'frpdFund'
]
for rf in required_fields:
    count = html.count(f'{rf}:')
    print(f'Field {rf}: {count} occurrences')
    assert count >= 32, f'Field {rf} missing in some communes (found {count})'

print('All 32 communes have all required fields for the 9 instruments and FRPD!')
