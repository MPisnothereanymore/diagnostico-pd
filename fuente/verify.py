import re

html_path = 'Radar FRPD Araucanía.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

print('HTML length:', len(html))

selectors = [
    'tr-pick', 'tprof', 'tr-mapc', 'map', 'layers', 'if-card', 'tr-com', 'hb-scope', 'hab',
    'ipt-card', 'ipt-sum', 'ipt-scope', 'ipt-csv', 'ipt-tbl-wrap'
]

for s in selectors:
    assert f'id="{s}"' in html, f'Missing ID: {s}'

print(f'All {len(selectors)} element IDs verified in generated HTML!')

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
