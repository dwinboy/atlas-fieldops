import { StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

type GPSMapPreviewProps = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
};

function buildMapHtml({ latitude, longitude, accuracy }: GPSMapPreviewProps): string {
  const accuracyCircle =
    accuracy != null
      ? `L.circle([${latitude}, ${longitude}], { radius: ${accuracy}, color: "#12332b", weight: 1, fillColor: "#12332b", fillOpacity: 0.1 }).addTo(map);`
      : "";

  return `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      var map = L.map("map", { zoomControl: false, attributionControl: false }).setView([${latitude}, ${longitude}], 16);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.marker([${latitude}, ${longitude}]).addTo(map);
      ${accuracyCircle}
    </script>
  </body>
</html>`;
}

export function GPSMapPreview({ latitude, longitude, accuracy }: GPSMapPreviewProps) {
  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        scrollEnabled={false}
        source={{ html: buildMapHtml({ accuracy, latitude, longitude }) }}
        style={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: "#dbe7e2",
    borderRadius: 12,
    borderWidth: 1,
    height: 200,
    marginTop: 4,
    overflow: "hidden",
  },
  webview: {
    flex: 1,
  },
});
