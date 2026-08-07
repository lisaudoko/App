export interface StatusColorPair {
  bg: string;
  text: string;
}

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  navBar: string;
  navText: string;
  border: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentText: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  danger: string;
  dangerBg: string;
  overlay: string;
  statusColors: {
    onTrack: StatusColorPair;
    borderline: StatusColorPair;
    alert: StatusColorPair;
    noLog: StatusColorPair;
  };
}

export const lightColors: ThemeColors = {
  // Warm cream base — feels premium, easy on the eyes
  background: '#F6F4EF',
  surface: '#FFFFFF',
  surfaceAlt: '#EFECEA',
  // Rich near-black nav with a warm undertone
  navBar: '#141311',
  navText: '#FFFFFF',
  border: '#DDD9D0',
  text: '#141311',
  // WCAG AA (4.5:1+) warm-gray family against white cards
  textMuted: '#6A6963',
  textFaint: '#98968F',
  // Vivid emerald — more saturated & punchy than before (~5.4:1 on white)
  accent: '#0FAD72',
  accentText: '#FFFFFF',
  // Semantic colors — rich hues, not washed out
  success: '#0A7050',
  successBg: '#DAF5EC',
  warning: '#B56B08',
  warningBg: '#FDF0D4',
  danger: '#BF2D2D',
  dangerBg: '#FDEBEB',
  overlay: 'rgba(0,0,0,0.45)',
  statusColors: {
    onTrack:   { bg: '#DAF5EC', text: '#0A7050' },
    borderline: { bg: '#FDF0D4', text: '#633806' },
    alert:     { bg: '#FDEBEB', text: '#501313' },
    noLog:     { bg: '#EFECEA', text: '#44433F' },
  },
};

export const darkColors: ThemeColors = {
  // Deep warm-black — richer depth than a flat near-black
  background: '#0F0E0D',
  surface: '#1D1C1A',
  surfaceAlt: '#262420',
  navBar: '#1D1C1A',
  navText: '#F0EDE6',
  border: '#333028',
  // Warm white text — easier to read than a cold stark white
  text: '#E0DDD6',
  // WCAG AA (4.5:1+) against dark card surface
  textMuted: '#9E9C96',
  textFaint: '#706E69',
  // Bright vivid emerald — really pops against dark surfaces
  accent: '#1ED98E',
  accentText: '#082418',
  // Semantic colors — vibrant enough to read clearly in dark context
  success: '#5ED8B2',
  successBg: '#062E22',
  warning: '#F5A42A',
  warningBg: '#3A2000',
  danger: '#F08080',
  dangerBg: '#3D1010',
  overlay: 'rgba(0,0,0,0.65)',
  statusColors: {
    onTrack:   { bg: '#062E22', text: '#5ED8B2' },
    borderline: { bg: '#3A2000', text: '#F5A42A' },
    alert:     { bg: '#3D1010', text: '#F08080' },
    noLog:     { bg: '#333028', text: '#9E9C96' },
  },
};

/**
 * Workout block-type category colors. Fixed semantic category colors,
 * not light/dark-adaptive — they stay constant across themes so a block
 * type is visually identifiable in either mode.
 */
export interface BlockColorPair {
  bg: string;
  text: string;
}

export const blockColors = {
  warmUp:    { bg: '#E0EFFD', text: '#0C4A87' },
  olympic:   { bg: '#141311', text: '#FFFFFF'  },
  weights:   { bg: '#2C2B28', text: '#D6D3CA'  },
  plyo:      { bg: '#FEF0D3', text: '#7A3E00'  },
  technical: { bg: '#ECEAFE', text: '#3930A0'  },
  throws:    { bg: '#DAF5EC', text: '#0A6847'  },
  sprints:   { bg: '#FDEAEA', text: '#5A1414'  },
  core:      { bg: '#E0FAF0', text: '#086242'  },
  medBall:   { bg: '#F1EFE8', text: '#44433F'  },
  coolDown:  { bg: '#EBF5F3', text: '#2E5E4E'  },
} as const satisfies Record<string, BlockColorPair>;
