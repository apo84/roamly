export { colors, platformColors } from "./colors";
export { fonts, radius } from "./fonts";

export const shadows = {
  card: {
    shadowColor: "hsl(220, 30%, 15%)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
