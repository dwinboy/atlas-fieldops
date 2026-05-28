from io import BytesIO
from zipfile import ZIP_DEFLATED, ZipFile

from app.services.file_imports import parse_uploaded_dataset


def test_parse_csv_upload_returns_columns_and_rows() -> None:
    file_format, columns, rows = parse_uploaded_dataset(
        "farmers.csv",
        b"Household ID,Farmer Name,Latitude\nHH-1,Amina,5.1\n",
    )

    assert file_format == "csv"
    assert columns == ["Household ID", "Farmer Name", "Latitude"]
    assert rows == [{"Household ID": "HH-1", "Farmer Name": "Amina", "Latitude": "5.1"}]


def test_parse_geojson_upload_flattens_features() -> None:
    payload = b'{"type":"FeatureCollection","features":[{"properties":{"Village":"Bali"},"geometry":{"type":"Point","coordinates":[10,5]}}]}'

    file_format, columns, rows = parse_uploaded_dataset("villages.geojson", payload)

    assert file_format == "geojson"
    assert "Village" in columns
    assert rows[0]["Village"] == "Bali"
    assert rows[0]["geometry"] == {"type": "Point", "coordinates": [10, 5]}


def test_parse_xlsx_upload_without_external_dependencies() -> None:
    workbook = BytesIO()
    with ZipFile(workbook, "w", ZIP_DEFLATED) as archive:
        archive.writestr(
            "xl/worksheets/sheet1.xml",
            """<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="inlineStr"><is><t>Household ID</t></is></c>
      <c r="B1" t="inlineStr"><is><t>Farmer Name</t></is></c>
    </row>
    <row r="2">
      <c r="A2" t="inlineStr"><is><t>HH-2</t></is></c>
      <c r="B2" t="inlineStr"><is><t>Grace</t></is></c>
    </row>
  </sheetData>
</worksheet>""",
        )

    file_format, columns, rows = parse_uploaded_dataset("farmers.xlsx", workbook.getvalue())

    assert file_format == "xlsx"
    assert columns == ["Household ID", "Farmer Name"]
    assert rows == [{"Household ID": "HH-2", "Farmer Name": "Grace"}]
