import { Image, type ImageStyle, type StyleProp } from "react-native";

const atlasLogo = require("../../../assets/atlas-fieldops-logo.png");

export interface LogoProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export function Logo({ size = 32, style }: LogoProps) {
  return (
    <Image
      accessibilityLabel="Atlas FieldOps logo"
      resizeMode="contain"
      source={atlasLogo}
      style={[{ height: size, width: size }, style]}
    />
  );
}
