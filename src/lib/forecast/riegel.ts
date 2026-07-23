/** Riegel race-time equivalency: T2 = T1 * (D2/D1)^1.06 */
export function riegelEquivalentTime(
  timeSec: number,
  fromDistanceM: number,
  toDistanceM: number,
  exponent = 1.06,
): number {
  if (fromDistanceM <= 0 || toDistanceM <= 0 || timeSec <= 0) {
    throw new Error("Invalid Riegel inputs");
  }
  return timeSec * Math.pow(toDistanceM / fromDistanceM, exponent);
}

export function paceSecPerMeter(timeSec: number, distanceM: number): number {
  return timeSec / distanceM;
}
