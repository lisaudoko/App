import type { TextStyle } from 'react-native';

/**
 * Prompt 6 typography scale. System default font (San Francisco / Roboto) —
 * no custom font file needed.
 *
 * Note: sizes here are the spec's base values. The app-wide font sizes were
 * separately scaled up ~24% in response to explicit "make it bigger" user
 * feedback (see git history) — that adjustment is applied ad hoc across
 * screens' inline styles, not reflected in these base tokens. New code
 * should use these tokens directly; reconciling the two is a follow-up.
 */
export const typography = {
  h1: { fontSize: 22, fontWeight: '500' } satisfies TextStyle,
  h2: { fontSize: 18, fontWeight: '500' } satisfies TextStyle,
  h3: { fontSize: 16, fontWeight: '500' } satisfies TextStyle,
  body: { fontSize: 14, fontWeight: '400', lineHeight: 20 } satisfies TextStyle,
  caption: { fontSize: 11, fontWeight: '400' } satisfies TextStyle,
  label: { fontSize: 10, fontWeight: '500', letterSpacing: 0.6, textTransform: 'uppercase' } satisfies TextStyle,
  pill: { fontSize: 11, fontWeight: '500' } satisfies TextStyle,
  stat: { fontSize: 22, fontWeight: '500' } satisfies TextStyle,
} as const;
