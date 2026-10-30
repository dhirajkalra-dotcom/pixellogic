import openpyxl, json, sys

wb = openpyxl.load_workbook('d:/pixellogic/power report/led test report-2025.xlsx', data_only=True)
ws = wb['LED SCREEN ']

def clean_num(v):
    if v is None: return None
    if isinstance(v, str):
        v = v.strip()
        try: return round(float(v), 4)
        except: return None
    if isinstance(v, (int, float)): return round(float(v), 4)
    return None

products = []
current_brand = None
current_model = None

for row in ws.iter_rows(min_row=2, max_row=ws.max_row, values_only=True):
    raw = row[:8]
    brand_raw = raw[0]
    model_raw = raw[1]
    brightness_raw = raw[2]

    if brand_raw and isinstance(brand_raw, str) and brand_raw.strip() and brand_raw.strip() != 'BRAND':
        current_brand = brand_raw.strip()
    if model_raw and isinstance(model_raw, str) and model_raw.strip():
        current_model = model_raw.strip()

    brightness = clean_num(brightness_raw)
    if brightness in (1.0, 0.5) and current_brand and current_model and current_model != 'MODEL':
        products.append({
            'brand': current_brand,
            'model': current_model,
            'brightness': brightness,
            'red': clean_num(raw[3]),
            'green': clean_num(raw[4]),
            'blue': clean_num(raw[5]),
            'white': clean_num(raw[6]),
            'standby': clean_num(raw[7]),
        })

grouped = {}
order = []
for p in products:
    key = p['brand'] + '||' + p['model']
    if key not in grouped:
        grouped[key] = {'brand': p['brand'], 'model': p['model'], 'full': None, 'half': None}
        order.append(key)
    if p['brightness'] == 1.0:
        grouped[key]['full'] = {'r': p['red'], 'g': p['green'], 'b': p['blue'], 'w': p['white'], 's': p['standby']}
    else:
        grouped[key]['half'] = {'r': p['red'], 'g': p['green'], 'b': p['blue'], 'w': p['white'], 's': p['standby']}

result = [grouped[k] for k in order if grouped[k]['full'] or grouped[k]['half']]
print(f'Total models: {len(result)}', file=sys.stderr)
print(json.dumps(result, separators=(',', ':')))
