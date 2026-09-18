export function onboardingPathForGoalPayload(
  payload: unknown,
): "/app" | null {
  if (typeof payload !== "object" || payload === null) return null;
  if (!("goal" in payload)) return null;
  return payload.goal == null ? null : "/app";
}
