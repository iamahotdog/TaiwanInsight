import json
import os

def csv_to_list(path):
    with open(path, 'r', encoding='utf-8-sig') as f:
        lines = f.readlines()
    
    headers = lines[0].strip().split(',')
    data = []
    for line in lines[1:]:
        if not line.strip() or '總計' in line:
            continue
        values = line.strip().split(',')
        row = {}
        for i, h in enumerate(headers):
            if i < len(values):
                val = values[i]
                try:
                    # Convert to number if possible
                    if '.' in val:
                        row[h] = float(val)
                    else:
                        row[h] = int(val)
                except:
                    row[h] = val
        data.append(row)
    return data

try:
    overview = csv_to_list('overview.csv')
    detailed = csv_to_list('detailed.csv')

    final_obj = {
        "overviewData": overview,
        "detailedData": detailed
    }

    with open('data.js', 'w', encoding='utf-8') as f:
        f.write('const TOURISM_DATA = ' + json.dumps(final_obj, ensure_ascii=False, indent=2) + ';')
    print("Success: data.js created.")
except Exception as e:
    print(f"Error: {e}")
