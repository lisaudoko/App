export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
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
}

export const lightColors: ThemeColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  surfaceAlt: '#f9f9f9',
  border: '#e8e8e8',
  text: '#111111',
  textMuted: '#888888',
  textFaint: '#aaaaaa',
  accent: '#111111',
  accentText: '#ffffff',
  success: '#166534',
  successBg: '#dcfce7',
  warning: '#854d0e',
  warningBg: '#fef9c3',
  danger: '#991b1b',
  dangerBg: '#fee2e2',
  overlay: 'rgba(0,0,0,0.4)',
};

export const darkColors: ThemeColors = {
  background: '#0b0b0c',
  surface: '#18181a',
  surfaceAlt: '#1f1f22',
  border: '#2b2b2e',
  text: '#f5f5f5',
  textMuted: '#9a9a9e',
  textFaint: '#6b6b6f',
  accent: '#f5f5f5',
  accentText: '#111111',
  success: '#4ade80',
  successBg: '#14321f',
  warning: '#facc15',
  warningBg: '#3a2f0c',
  danger: '#f87171',
  dangerBg: '#3a1414',
  overlay: 'rgba(0,0,0,0.6)',
};
