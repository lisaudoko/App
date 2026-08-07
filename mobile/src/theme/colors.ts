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
  background: '#F5F5F0',
  surface: '#FFFFFF',
  surfaceAlt: '#FFFFFF',
  navBar: '#1A1A18',
  navText: '#FFFFFF',
  border: '#D3D1C7',
  text: '#1A1A18',
  // Spec's original textMuted/textFaint (#888780 / #ADAB9F) measured under
  // 3.6:1 and 2.3:1 against white cards — well below the 4.5:1 (body) / 3:1
  // (large/placeholder) WCAG AA floors, which read as washed-out. Darkened
  // while staying in the same warm-gray family.
  textMuted: '#6E6D67',
  textFaint: '#8E8C86',
  accent: '#1D9E75',
  accentText: '#FFFFFF',
  success: '#085041',
  successBg: '#E1F5EE',
  warning: '#BA7517',
  warningBg: '#FAEEDA',
  danger: '#A32D2D',
  dangerBg: '#FCEBEB',
  overlay: 'rgba(0,0,0,0.4)',
  statusColors: {
    onTrack: { bg: '#E1F5EE', text: '#085041' },
    borderline: { bg: '#FAEEDA', text: '#633806' },
    alert: { bg: '#FCEBEB', text: '#501313' },
    noLog: { bg: '#F1EFE8', text: '#444441' },
  },
};

export const darkColors: ThemeColors = {
  background: '#111110',
  surface: '#2C2C2A',
  surfaceAlt: '#2C2C2A',
  navBar: '#2C2C2A',
  navText: '#FFFFFF',
  border: '#3A3A38',
  text: '#D3D1C7',
  // Spec's original textMuted/textFaint (#5F5E5A / #4A4946) measured under
  // 2.2:1 and 1.6:1 against the dark card surface — well below the 4.5:1
  // (body) / 3:1 (large/placeholder) WCAG AA floors, which read as washed-out.
  // Lightened while staying in the same warm-gray family.
  textMuted: '#9B9A95',
  textFaint: '#757470',
  accent: '#0F6E56',
  accentText: '#FFFFFF',
  success: '#9FE1CB',
  successBg: '#04342C',
  warning: '#EF9F27',
  warningBg: '#412402',
  danger: '#F09595',
  dangerBg: '#501313',
  overlay: 'rgba(0,0,0,0.6)',
  statusColors: {
    onTrack: { bg: '#04342C', text: '#9FE1CB' },
    borderline: { bg: '#412402', text: '#EF9F27' },
    alert: { bg: '#501313', text: '#F09595' },
    noLog: { bg: '#3A3A38', text: '#9B9A95' },
  },
};

/**
 * Workout block-type category colors (Prompt 5/6). Fixed semantic category
 * colors, not light/dark-adaptive UI chrome — they stay constant across
 * themes so a block type is visually identifiable either way.
 */
export interface BlockColorPair {
  bg: string;
  text: string;
}

export const blockColors = {
  warmUp: { bg: '#E6F1FB', text: '#0C447C' },
  olympic: { bg: '#1A1A18', text: '#FFFFFF' },
  weights: { bg: '#2C2C2A', text: '#D3D1C7' },
  plyo: { bg: '#FAEEDA', text: '#633806' },
  technical: { bg: '#EEEDFE', text: '#3C3489' },
  throws: { bg: '#E1F5EE', text: '#085041' },
  sprints: { bg: '#FCEBEB', text: '#501313' },
  core: { bg: '#E1F5EE', text: '#085041' },
  medBall: { bg: '#F1EFE8', text: '#444441' },
  coolDown: { bg: '#F1EFE8', text: '#888780' },
} as const satisfies Record<string, BlockColorPair>;
