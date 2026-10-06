import { extendTheme, useColorModeValue } from "@chakra-ui/react";

const fontStack =
  "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

const theme = extendTheme({
  config: { initialColorMode: "light", useSystemColorMode: false },
  fonts: { heading: fontStack, body: fontStack },
  colors: {
    brand: {
      50: "#eef1ff",
      100: "#e0e5ff",
      200: "#c6cdff",
      300: "#a3aaff",
      400: "#7f7dfb",
      500: "#6457f3",
      600: "#5540e6",
      700: "#4832cb",
      800: "#3b2ba4",
      900: "#332a82",
    },
  },
  shadows: {
    card: "0 1px 2px rgba(16, 18, 35, 0.04), 0 8px 24px rgba(16, 18, 35, 0.06)",
    outline: "0 0 0 3px rgba(100, 87, 243, 0.35)",
  },
  styles: {
    global: (props) => ({
      body: {
        bg: props.colorMode === "dark" ? "#0c0d12" : "#f2f3f7",
        color: props.colorMode === "dark" ? "#eceef5" : "#14151a",
      },
      "::selection": { background: "rgba(100, 87, 243, 0.25)" },
    }),
  },
  components: {
    Button: {
      baseStyle: { borderRadius: "xl", fontWeight: 600 },
      defaultProps: { colorScheme: "brand" },
      variants: {
        // Keep the brand colour solid in dark mode instead of Chakra's pale tint
        solid: (props) =>
          props.colorScheme === "brand"
            ? {
                bg: "brand.500",
                color: "white",
                _hover: { bg: "brand.600", _disabled: { bg: "brand.500" } },
                _active: { bg: "brand.700" },
              }
            : {},
      },
    },
    Input: { defaultProps: { focusBorderColor: "brand.400" } },
    Textarea: { defaultProps: { focusBorderColor: "brand.400" } },
    Modal: {
      baseStyle: (props) => ({
        dialog: {
          borderRadius: "2xl",
          bg: props.colorMode === "dark" ? "#15171f" : "white",
          mx: 4,
        },
        overlay: { bg: "blackAlpha.500", backdropFilter: "blur(4px)" },
      }),
    },
    Drawer: {
      baseStyle: (props) => ({
        dialog: { bg: props.colorMode === "dark" ? "#15171f" : "white" },
        overlay: { bg: "blackAlpha.500", backdropFilter: "blur(4px)" },
      }),
    },
    Menu: {
      baseStyle: (props) => ({
        list: {
          borderRadius: "xl",
          p: 1.5,
          boxShadow: "card",
          bg: props.colorMode === "dark" ? "#1c1f2a" : "white",
          borderColor: props.colorMode === "dark" ? "#262a38" : "#e8e9f0",
        },
        item: { borderRadius: "lg", fontSize: "sm", fontWeight: 500, py: 2 },
      }),
    },
    Tooltip: { baseStyle: { borderRadius: "md", fontSize: "xs", px: 2, py: 1 } },
  },
});

// Colour tokens for the app's own surfaces, in both colour modes
export const useUi = () => ({
  appBg: useColorModeValue("#f2f3f7", "#0c0d12"),
  surface: useColorModeValue("#ffffff", "#15171f"),
  surfaceAlt: useColorModeValue("#f4f5f9", "#1c1f2a"),
  hover: useColorModeValue("#f4f5fa", "#1b1e29"),
  active: useColorModeValue("#eef1ff", "rgba(100, 87, 243, 0.2)"),
  border: useColorModeValue("#e8e9f0", "#232735"),
  text: useColorModeValue("#14151a", "#eceef5"),
  muted: useColorModeValue("#646a7c", "#979db0"),
  subtle: useColorModeValue("#959bac", "#6b7186"),
  accent: useColorModeValue("brand.500", "brand.300"),
  bubbleIn: useColorModeValue("#eff0f5", "#222635"),
  chatBg: useColorModeValue("#fafafc", "#101219"),
});

export default theme;
