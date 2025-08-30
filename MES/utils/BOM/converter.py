import pandas as pd
import os
import glob
import re

print("Starting BOM conversion process (Version 2)...")

# --- ★★★ การตั้งค่าใหม่ ★★★ ---
# ให้สคริปต์หาตำแหน่ง Desktop ของคุณโดยอัตโนมัติ
# ไฟล์ Output จะถูกบันทึกไว้ที่นี่
output_directory = os.path.join(os.path.expanduser('~'), 'Desktop')
print(f"Output files will be saved to: {output_directory}")

# --- การตั้งค่าคอลัมน์ (เหมือนเดิม) ---
PART_NAME_COLUMN = 'PART NAME (Geelong )'
QUANTITY_COLUMN = " Q'TY"

# --- ที่เก็บข้อมูล (เหมือนเดิม) ---
all_items = {}
all_boms = []

# ค้นหาไฟล์ .xlsx ทั้งหมดในโฟลเดอร์ปัจจุบัน
excel_files = glob.glob('*.xlsx')
print(f"Found {len(excel_files)} Excel files to process.")

for filename in excel_files:
    print(f"Processing file: {filename}...")
    try:
        xls = pd.ExcelFile(filename)
        for sheet_name in xls.sheet_names:
            if not sheet_name.lower().startswith(('tc', 'cpi', 'capa')):
                continue
            
            print(f"  - Reading sheet: {sheet_name}")
            df = pd.read_excel(xls, sheet_name=sheet_name, skiprows=2, dtype=str)
            
            sap_columns = [col for col in df.columns if 'Unnamed' in str(col)]
            if not sap_columns:
                print(f"    - Warning: No SAP columns (Unnamed:) found in sheet {sheet_name}. Skipping.")
                continue

            # ใช้ infer_objects(copy=False) เพื่อรองรับเวอร์ชันใหม่ของ pandas
            df[sap_columns] = df[sap_columns].ffill().infer_objects(copy=False)

            for index, row in df.iterrows():
                sap_codes = [code for code in row[sap_columns].dropna().unique()]
                part_name = row.get(PART_NAME_COLUMN)
                quantity = row.get(QUANTITY_COLUMN, 1)

                if not sap_codes or pd.isna(part_name):
                    continue
                
                current_sap = sap_codes[-1]
                
                if current_sap not in all_items:
                    part_no_match = re.match(r'^([A-Z0-9-]+)', str(part_name))
                    part_no = part_no_match.group(1) if part_no_match else current_sap
                    
                    all_items[current_sap] = {
                        'sap_no': current_sap,
                        'part_no': part_no,
                        'part_description': part_name,
                        'planned_output': 0,
                        'is_active': 1
                    }

                if len(sap_codes) > 1:
                    parent_sap = sap_codes[-2]
                    all_boms.append({
                        'FG_SAP_NO': parent_sap,
                        'COMPONENT_SAP_NO': current_sap,
                        'QUANTITY_REQUIRED': quantity,
                        'LINE': 'DEFAULT',
                        'MODEL': 'DEFAULT'
                    })
    except Exception as e:
        print(f"  - Could not process file {filename}. Error: {e}")

# --- สร้างไฟล์ Output ---
if all_items:
    item_master_df = pd.DataFrame(list(all_items.values()))
    output_path = os.path.join(output_directory, 'ItemMaster_Output.csv')
    item_master_df.to_csv(output_path, index=False)
    print(f"\nSuccessfully created '{output_path}' with {len(item_master_df)} unique items.")

if all_boms:
    bom_df = pd.DataFrame(all_boms)
    bom_df = bom_df[bom_df['FG_SAP_NO'] != bom_df['COMPONENT_SAP_NO']]
    output_path = os.path.join(output_directory, 'BOM_Output.csv')
    bom_df.to_csv(output_path, index=False)
    print(f"Successfully created '{output_path}' with {len(bom_df)} BOM entries.")

print("\nConversion process finished!")