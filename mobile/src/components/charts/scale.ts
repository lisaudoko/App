export function makeLinearScale(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;
  return (value: number) => {
    if (span === 0) return (r0 + r1) / 2;
    const t = (value - d0) / span;
    return r0 + t * (r1 - r0);
  };
}

export function niceDomain(values: number[], padPct = 0.08): [number, number] {
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [min - 1, max + 1];
  const pad = (max - min) * padPct;
  return [min - pad, max + pad];
}
