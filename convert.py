import csv
import json
import os
import traceback

def parse_csv(file_path):
    print(f"Parsing {file_path}...")
    data = []
    try:
        if not os.path.exists(file_path):
             print(f"File not found: {file_path}")
             return []
             
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Remove empty keys or null values
                clean_row = {k: v for k, v in row.items() if k is not None}
                if not clean_row.get('年別') or '總計' in clean_row.get('年別'):
                    continue
                
                # Convert numbers if possible
                for key in clean_row:
                    if key not in ['年別', '月份']:
                        try:
                            clean_row[key] = int(str(clean_row[key]).replace(',', ''))
                        except:
                            pass
                    else:
                        try:
                            clean_row[key] = int(clean_row[key])
                        except:
                            pass
                            
                data.append(clean_row)
        print(f"Loaded {len(data)} rows from {file_path}")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        traceback.print_exc()
    return data

overview_data = parse_csv('overview.csv')
detailed_data = parse_csv('detailed.csv')

if not overview_data or not detailed_data:
    print("Critical error: One or more datasets are empty!")
    exit(1)

out_data = {
    'overviewData': overview_data,
    'detailedData': detailed_data
}

output_file = 'data.js'
try:
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('const TOURISM_DATA = ' + json.dumps(out_data, ensure_ascii=False, indent=2) + ';')
    print(f"Successfully generated {output_file}")
except Exception as e:
    print(f"Error writing {output_file}: {e}")
    traceback.print_exc()
    exit(1)
