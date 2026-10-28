#!/usr/bin/env python3
"""Push QA test cases (gen-testcase JSON contract) to the Qikify QA Master Google Sheet.

Reads the same JSON shape as generate_xlsx.py:
{
  "sheetName": "[TIB] Broken Access Control",   # = Google Sheet tab name
  "appPrefix": "TIB",                            # UPPERCASE app prefix
  "testCases": [ { "Test Case ID": "...", ... }, ... ]
}

Behaviour:
  * If the tab does NOT exist -> create it, apply full format (title row, header row,
    alternating data fills, Status/Priority dropdowns + colors, borders, frozen rows,
    tab color per app prefix, column widths).
  * If the tab ALREADY exists -> append the new cases (never overwrites old rows).
    Test Case IDs always restart from TC-<PREFIX>-001, incrementing by 1.

Usage:
  python3 push_to_sheets.py \
    --spreadsheet-id <SPREADSHEET_ID> \
    --data-json outputs/testcases/testcases_TIB-5264.json \
    --credentials gcp-credentials.json

Requires: gspread>=6, google-auth  (pip install gspread google-auth)
sheetName / appPrefix are read from the JSON itself - no --sheet-name / --app flags needed.
"""
import argparse
import json
import sys

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError as exc:  # pragma: no cover
    sys.exit(
        "Thieu dependency: %s\n"
        "Cai bang: python3 -m pip install --user --break-system-packages gspread google-auth"
        % exc
    )

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

COLUMNS = [
    "Test Case ID",
    "Module",
    "Test Scenario",
    "Priority",
    "Preconditions",
    "Steps",
    "Data",
    "Expected Result",
    "Status",
    "Actual Result",
    "Notes",
]

# Column widths in pixels (roughly matches the auto-fit look of generate_xlsx.py)
COL_WIDTHS = {
    "Test Case ID": 115,
    "Module": 210,
    "Test Scenario": 280,
    "Priority": 85,
    "Preconditions": 230,
    "Steps": 320,
    "Data": 90,
    "Expected Result": 320,
    "Status": 95,
    "Actual Result": 160,
    "Notes": 210,
}

# ---- Colors (same hex values as generate_xlsx.py) --------------------------
TITLE_FILL = "1F4E79"
HEADER_FILL = "BDD7EE"
DATA_FILL_A = "FFFFFF"
DATA_FILL_B = "DEEAF1"
PRIORITY_FILL = "FCE4D6"
BORDER_GRAY = "D9D9D9"

STATUS_FILLS = {
    "Pending": "F7ECE6",
    "Pass": "D4EDBC",
    "Fail": "FFCFC9",
    "Blocked": "FFE5A0",
    "N/A": "E6E6E6",
}

# App prefix -> tab color (from the gen-testcase prefix table; TIB added for teeinblue)
TAB_COLORS = {
    "TEPO": "4472C4",
    "QSC": "70AD47",
    "QCC": "000000",
    "DUOS": "ED7D31",
    "XAP": "C7387A",
    "TIB": "6A4C9C",  # teeinblue (not in the Qikify table) - purple
}
DEFAULT_TAB_COLOR = "6A4C9C"


def hex_to_rgb(hex_color: str) -> dict:
    hex_color = hex_color.lstrip("#")
    return {
        "red": int(hex_color[0:2], 16) / 255.0,
        "green": int(hex_color[2:4], 16) / 255.0,
        "blue": int(hex_color[4:6], 16) / 255.0,
    }


def border_obj():
    color = hex_to_rgb(BORDER_GRAY)
    side = {"style": "SOLID", "color": color}
    return {"top": side, "bottom": side, "left": side, "right": side}


def cell_format(bg_hex, *, bold=False, font_size=10, font_color="000000",
                h_align=None, v_align="TOP", wrap=True, border=True):
    fmt = {
        "backgroundColor": hex_to_rgb(bg_hex),
        "textFormat": {
            "bold": bold,
            "fontSize": font_size,
            "fontFamily": "Arial",
            "foregroundColor": hex_to_rgb(font_color),
        },
        "verticalAlignment": v_align,
        "wrapStrategy": "WRAP" if wrap else "OVERFLOW_CELL",
    }
    if h_align:
        fmt["horizontalAlignment"] = h_align
    if border:
        fmt["borders"] = border_obj()
    return fmt


FIELDS_MASK = (
    "userEnteredFormat(backgroundColor,textFormat,borders,"
    "wrapStrategy,verticalAlignment,horizontalAlignment)"
)


def col_index(name: str) -> int:
    return COLUMNS.index(name)  # 0-based


def load_data(path: str):
    with open(path, "r", encoding="utf-8") as fh:
        data = json.load(fh)
    for field in ("sheetName", "appPrefix", "testCases"):
        if field not in data:
            sys.exit(
                "Thieu truong: JSON can co: sheetName, appPrefix, testCases "
                "(dang object boc ngoai, khong phai mang phang)."
            )
    if not isinstance(data["testCases"], list) or not data["testCases"]:
        sys.exit("testCases rong hoac khong phai mang.")
    return data["sheetName"], data["appPrefix"].upper(), data["testCases"]


def rows_from_cases(test_cases: list) -> list:
    rows = []
    for tc in test_cases:
        rows.append([str(tc.get(col, "") or "") for col in COLUMNS])
    return rows


def build_data_row_requests(sheet_id: int, start_row0: int, rows: list,
                            parity_offset: int) -> list:
    """Formatting requests for data rows. start_row0 is 0-based sheet row of the
    first data row being written. parity_offset keeps the white/blue alternation
    continuous when appending (0-based index of the first row among all data rows)."""
    requests = []
    status_col0 = col_index("Status")
    priority_col0 = col_index("Priority")
    n_cols = len(COLUMNS)

    for i, row in enumerate(rows):
        abs_row0 = start_row0 + i
        base_hex = DATA_FILL_A if (parity_offset + i) % 2 == 0 else DATA_FILL_B
        # whole-row base format
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": abs_row0,
                    "endRowIndex": abs_row0 + 1,
                    "startColumnIndex": 0,
                    "endColumnIndex": n_cols,
                },
                "cell": {"userEnteredFormat": cell_format(base_hex)},
                "fields": FIELDS_MASK,
            }
        })
        # Priority cell override
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": abs_row0,
                    "endRowIndex": abs_row0 + 1,
                    "startColumnIndex": priority_col0,
                    "endColumnIndex": priority_col0 + 1,
                },
                "cell": {"userEnteredFormat": cell_format(PRIORITY_FILL, h_align="CENTER")},
                "fields": FIELDS_MASK,
            }
        })
        # Status cell override (color by value)
        status_val = (row[status_col0] or "Pending").strip() or "Pending"
        status_hex = STATUS_FILLS.get(status_val, STATUS_FILLS["Pending"])
        requests.append({
            "repeatCell": {
                "range": {
                    "sheetId": sheet_id,
                    "startRowIndex": abs_row0,
                    "endRowIndex": abs_row0 + 1,
                    "startColumnIndex": status_col0,
                    "endColumnIndex": status_col0 + 1,
                },
                "cell": {"userEnteredFormat": cell_format(status_hex, h_align="CENTER")},
                "fields": FIELDS_MASK,
            }
        })
    return requests


def dropdown_request(sheet_id, col_name, values, start_row0, end_row0):
    col0 = col_index(col_name)
    return {
        "setDataValidation": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": start_row0,
                "endRowIndex": end_row0,
                "startColumnIndex": col0,
                "endColumnIndex": col0 + 1,
            },
            "rule": {
                "condition": {
                    "type": "ONE_OF_LIST",
                    "values": [{"userEnteredValue": v} for v in values],
                },
                "showCustomUi": True,
                "strict": False,
            },
        }
    }


def build_new_tab_requests(sheet_id, sheet_name, prefix, rows):
    n_cols = len(COLUMNS)
    requests = []

    # Tab color + freeze first 2 rows
    tab_hex = TAB_COLORS.get(prefix, DEFAULT_TAB_COLOR)
    requests.append({
        "updateSheetProperties": {
            "properties": {
                "sheetId": sheet_id,
                "tabColor": hex_to_rgb(tab_hex),
                "gridProperties": {"frozenRowCount": 2},
            },
            "fields": "tabColor,gridProperties.frozenRowCount",
        }
    })

    # Merge title row A1:<last>1
    requests.append({
        "mergeCells": {
            "range": {
                "sheetId": sheet_id,
                "startRowIndex": 0, "endRowIndex": 1,
                "startColumnIndex": 0, "endColumnIndex": n_cols,
            },
            "mergeType": "MERGE_ALL",
        }
    })
    # Title row format
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": 1,
                      "startColumnIndex": 0, "endColumnIndex": n_cols},
            "cell": {"userEnteredFormat": cell_format(
                TITLE_FILL, bold=True, font_size=12, font_color="FFFFFF",
                h_align="CENTER", v_align="MIDDLE", wrap=False, border=False)},
            "fields": FIELDS_MASK,
        }
    })
    # Header row format
    requests.append({
        "repeatCell": {
            "range": {"sheetId": sheet_id, "startRowIndex": 1, "endRowIndex": 2,
                      "startColumnIndex": 0, "endColumnIndex": n_cols},
            "cell": {"userEnteredFormat": cell_format(
                HEADER_FILL, bold=True, font_size=11, h_align="CENTER",
                v_align="MIDDLE")},
            "fields": FIELDS_MASK,
        }
    })

    # Column widths
    for name, width in COL_WIDTHS.items():
        c0 = col_index(name)
        requests.append({
            "updateDimensionProperties": {
                "range": {"sheetId": sheet_id, "dimension": "COLUMNS",
                          "startIndex": c0, "endIndex": c0 + 1},
                "properties": {"pixelSize": width},
                "fields": "pixelSize",
            }
        })

    # Data rows format (data starts at sheet row index 2 -> row 3)
    requests += build_data_row_requests(sheet_id, start_row0=2, rows=rows, parity_offset=0)

    # Dropdowns over the data range
    end_row0 = 2 + len(rows)
    requests.append(dropdown_request(sheet_id, "Status",
                                     ["Pending", "Pass", "Fail", "Blocked", "N/A"], 2, end_row0))
    requests.append(dropdown_request(sheet_id, "Priority",
                                     ["Critical", "High", "Medium", "Low"], 2, end_row0))
    return requests


def a1_range(start_row1: int, n_rows: int, n_cols: int) -> str:
    from gspread.utils import rowcol_to_a1
    top_left = rowcol_to_a1(start_row1, 1)
    bottom_right = rowcol_to_a1(start_row1 + n_rows - 1, n_cols)
    return f"{top_left}:{bottom_right}"


def main():
    ap = argparse.ArgumentParser(description="Push gen-testcase JSON to the QA Master Google Sheet.")
    ap.add_argument("--spreadsheet-id", required=True)
    ap.add_argument("--data-json", required=True)
    ap.add_argument("--credentials", required=True, help="Service Account JSON path")
    args = ap.parse_args()

    sheet_name, prefix, test_cases = load_data(args.data_json)

    creds = Credentials.from_service_account_file(args.credentials, scopes=SCOPES)
    gc = gspread.authorize(creds)
    ss = gc.open_by_key(args.spreadsheet_id)

    n_cols = len(COLUMNS)
    existing = None
    for ws in ss.worksheets():
        if ws.title == sheet_name:
            existing = ws
            break

    if existing is None:
        # ---- Create new tab -------------------------------------------------
        n_rows = len(test_cases) + 2  # title + header + data
        ws = ss.add_worksheet(title=sheet_name, rows=max(n_rows + 5, 20), cols=n_cols)
        rows = rows_from_cases(test_cases)

        # Write values: title, header, data
        values = [[sheet_name] + [""] * (n_cols - 1), list(COLUMNS)] + rows
        ws.update(values=values, range_name=a1_range(1, len(values), n_cols),
                  value_input_option="RAW")

        ss.batch_update({"requests": build_new_tab_requests(ws.id, sheet_name, prefix, rows)})
        print(f"Da tao tab moi '{sheet_name}' voi {len(rows)} test case.")
        first_id, last_id = rows[0][0], rows[-1][0]
    else:
        # ---- Append to existing tab, continue numbering ---------------------
        ws = existing
        # Test Case ID always restarts from 001, incrementing by 1.
        renumbered = []
        for i, tc in enumerate(test_cases):
            tc = dict(tc)
            tc["Test Case ID"] = f"TC-{prefix}-{i + 1:03d}"
            renumbered.append(tc)
        rows = rows_from_cases(renumbered)

        existing_count = len(ws.col_values(1))  # last used row (1-based count)
        start_row1 = existing_count + 1
        # ensure enough rows
        needed = start_row1 + len(rows) - 1
        if needed > ws.row_count:
            ws.add_rows(needed - ws.row_count)

        ws.update(values=rows, range_name=a1_range(start_row1, len(rows), n_cols),
                  value_input_option="RAW")

        start_row0 = start_row1 - 1
        parity_offset = start_row0 - 2  # data began at sheet row index 2
        requests = build_data_row_requests(ws.id, start_row0=start_row0, rows=rows,
                                            parity_offset=parity_offset)
        end_row0 = start_row0 + len(rows)
        requests.append(dropdown_request(ws.id, "Status",
                                         ["Pending", "Pass", "Fail", "Blocked", "N/A"],
                                         start_row0, end_row0))
        requests.append(dropdown_request(ws.id, "Priority",
                                         ["Critical", "High", "Medium", "Low"],
                                         start_row0, end_row0))
        ss.batch_update({"requests": requests})
        print(f"Da append {len(rows)} test case vao tab '{sheet_name}' "
              f"(danh so lai tu TC-{prefix}-001).")
        first_id, last_id = rows[0][0], rows[-1][0]

    print(f"IDs: {first_id} -> {last_id}")
    print(f"Link: https://docs.google.com/spreadsheets/d/{args.spreadsheet_id}/edit#gid={ws.id}")


if __name__ == "__main__":
    main()
