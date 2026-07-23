export type NormalizedActivity = {
  id: string;
  name: string | null;
  startDate: Date;
  distanceM: number;
  movingTimeSec: number;
  avgHr: number | null;
  sufferScore: number | null;
  isRace: boolean;
  workoutType: number | null;
};

export interface ActivitySource {
  listActivities(accessToken: string, since: Date): Promise<NormalizedActivity[]>;
}
