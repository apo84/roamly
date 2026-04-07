/**
 * Mirrors `src/index.css` :root light theme (HSL tokens → React Native color strings).
 */
export const colors = {
  background: "hsl(30, 33%, 97%)",
  foreground: "hsl(220, 30%, 15%)",
  card: "hsl(0, 0%, 100%)",
  cardForeground: "hsl(220, 30%, 15%)",
  muted: "hsl(30, 15%, 93%)",
  mutedForeground: "hsl(220, 10%, 46%)",
  primary: "hsl(12, 76%, 61%)",
  primaryForeground: "hsl(0, 0%, 100%)",
  secondary: "hsl(30, 25%, 92%)",
  secondaryForeground: "hsl(220, 30%, 15%)",
  accent: "hsl(174, 60%, 40%)",
  accentForeground: "hsl(0, 0%, 100%)",
  border: "hsl(30, 15%, 88%)",
  input: "hsl(30, 15%, 88%)",
  ring: "hsl(12, 76%, 61%)",
  coral: "hsl(12, 76%, 61%)",
  coralLight: "hsl(12, 76%, 75%)",
  teal: "hsl(174, 60%, 40%)",
  tealLight: "hsl(174, 40%, 60%)",
  navy: "hsl(220, 30%, 15%)",
  cream: "hsl(30, 33%, 97%)",
  warmGray: "hsl(30, 10%, 60%)",
  gold: "hsl(38, 70%, 55%)",
  destructive: "hsl(0, 84%, 60%)",
} as const;

export const platformColors = {
  instagram: "#E4405F",
  tiktok: "#111827",
  youtube: "#FF0000",
} as const;
