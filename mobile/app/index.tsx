import { Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "600" }}>Field Collection</Text>
      <Text style={{ marginTop: 8 }}>Offline queue ready for submissions and sync.</Text>
    </View>
  );
}

