export interface LinearFit {
  slope: number;
  intercept: number;
  stdDev: number;
}

/** Ordinary least squares fit over (x, y) pairs, plus the residual standard deviation. */
export function linearRegression(xs: number[], ys: number[]): LinearFit {
  const n = xs.length;
  if (n === 0) return { slope: 0, intercept: 0, stdDev: 0 };
  if (n === 1) return { slope: 0, intercept: ys[0], stdDev: 0 };

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;

  let sumSqResiduals = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    sumSqResiduals += (ys[i] - predicted) ** 2;
  }
  const stdDev = Math.sqrt(sumSqResiduals / n);

  return { slope, intercept, stdDev };
}

/** Pearson correlation coefficient. Returns 0 when there is no variance to correlate. */
export function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
