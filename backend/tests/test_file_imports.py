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


def test_parse_kml_upload_flattens_placemarks() -> None:
    kml = (
        b'<?xml version="1.0" encoding="UTF-8"?>'
        b'<kml xmlns="http://www.opengis.net/kml/2.2"><Document>'
        b"<Placemark><name>Bali farm</name>"
        b'<ExtendedData><Data name="Owner"><value>Amina</value></Data></ExtendedData>'
        b"<Point><coordinates>10.5,5.2,0</coordinates></Point></Placemark>"
        b"<Placemark><name>North plot</name>"
        b"<Polygon><outerBoundaryIs><LinearRing>"
        b"<coordinates>0,0 0,1 1,1 1,0 0,0</coordinates>"
        b"</LinearRing></outerBoundaryIs></Polygon></Placemark>"
        b"</Document></kml>"
    )

    file_format, columns, rows = parse_uploaded_dataset("plots.kml", kml)

    assert file_format == "kml"
    assert "name" in columns and "Owner" in columns
    assert rows[0]["name"] == "Bali farm" and rows[0]["Owner"] == "Amina"
    assert rows[0]["geometry"] == {"type": "Point", "coordinates": [10.5, 5.2]}
    assert rows[1]["geometry"]["type"] == "Polygon"


def test_parse_shapefile_zip_upload() -> None:
    import io as _io
    import shapefile

    shp, shx, dbf = _io.BytesIO(), _io.BytesIO(), _io.BytesIO()
    writer = shapefile.Writer(shp=shp, shx=shx, dbf=dbf, shapeType=shapefile.POINT)
    writer.field("name", "C", size=40)
    writer.point(10.5, 5.2)
    writer.record("Bali farm")
    writer.close()

    bundle = _io.BytesIO()
    with ZipFile(bundle, "w", ZIP_DEFLATED) as archive:
        archive.writestr("plots.shp", shp.getvalue())
        archive.writestr("plots.shx", shx.getvalue())
        archive.writestr("plots.dbf", dbf.getvalue())

    file_format, columns, rows = parse_uploaded_dataset("plots.zip", bundle.getvalue())

    assert file_format == "zip"
    assert "name" in columns
    assert rows[0]["name"] == "Bali farm"
    assert rows[0]["geometry"]["type"] == "Point"


def test_import_routes_geometry_to_polygon_and_gps_questions() -> None:
    from app.schemas.collection import FormSchema
    from app.services.collection import _form_import_issues_for_row, _imported_geometry

    schema = FormSchema.model_validate(
        {
            "sections": [
                {
                    "id": "s1",
                    "title": "Boundary",
                    "fields": [
                        {"id": "q_boundary", "variable_name": "boundary", "type": "polygon", "label": "Farm boundary"},
                        {"id": "q_loc", "variable_name": "location", "type": "gps", "label": "Location"},
                    ],
                }
            ]
        }
    )

    polygon_row = {"name": "Plot A", "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [0, 1], [1, 1], [0, 0]]]}}
    responses, _ = _form_import_issues_for_row(
        row_number=1, row=polygon_row, schema=schema, geometry=_imported_geometry(polygon_row)
    )
    assert responses["boundary"] == polygon_row["geometry"]

    point_row = {"geometry": {"type": "Point", "coordinates": [10.0, 5.0]}}
    responses2, _ = _form_import_issues_for_row(
        row_number=1, row=point_row, schema=schema, geometry=_imported_geometry(point_row)
    )
    assert responses2["location"] == {"latitude": 5.0, "longitude": 10.0}
