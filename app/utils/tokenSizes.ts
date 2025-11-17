import { TokenSize } from "../types";

export interface TokenSizeMetadata {
  label: string;
  units: number;
  description: string;
  snapStep: number;
  snapPhase: number;
}

export const DEFAULT_TOKEN_SIZE: TokenSize = "medium";

export const TOKEN_SIZE_ORDER: TokenSize[] = [
  "tiny",
  "small",
  "medium",
  "large",
  "huge",
  "gargantuan",
];

export const TOKEN_SIZE_METADATA: Record<TokenSize, TokenSizeMetadata> = {
  tiny: {
    label: "Tiny",
    units: 0.5,
    description: "½ square (snaps to 4x4 grid within a single square)",
    snapStep: 0.5,
    snapPhase: 0.25,
  },
  small: {
    label: "Small",
    units: 1,
    description: "Single-square creature",
    snapStep: 1,
    snapPhase: 0.5,
  },
  medium: {
    label: "Medium",
    units: 1,
    description: "Single-square creature",
    snapStep: 1,
    snapPhase: 0.5,
  },
  large: {
    label: "Large",
    units: 2,
    description: "2x2 squares",
    snapStep: 1,
    snapPhase: 0,
  },
  huge: {
    label: "Huge",
    units: 3,
    description: "3x3 squares",
    snapStep: 1,
    snapPhase: 0.5,
  },
  gargantuan: {
    label: "Gargantuan",
    units: 4,
    description: "4x4 squares",
    snapStep: 1,
    snapPhase: 0,
  },
};

export const getTokenSizeUnits = (size?: TokenSize): number => {
  const key = size ?? DEFAULT_TOKEN_SIZE;
  return TOKEN_SIZE_METADATA[key].units;
};

export const getTokenSnapConfig = (
  size?: TokenSize
): { step: number; phase: number } => {
  const key = size ?? DEFAULT_TOKEN_SIZE;
  const { snapStep, snapPhase } = TOKEN_SIZE_METADATA[key];
  return { step: snapStep, phase: snapPhase };
};

export const isTinySize = (size?: TokenSize): boolean => {
  return (size ?? DEFAULT_TOKEN_SIZE) === "tiny";
};

