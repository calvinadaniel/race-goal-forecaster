import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistance, formatDuration, formatPace, type Units } from "@/lib/units";

export type RecentActivity = {
  id: string;
  name: string | null;
  date: string;
  distanceM: number;
  movingTimeSec: number;
  isRace: boolean;
};

export function RecentActivitiesList({
  activities,
  units,
}: {
  activities: RecentActivity[];
  units: Units;
}) {
  return (
    <div className="space-y-0 px-0 py-0">
      {activities.map((e, i) => (
        <div key={e.id}>
          {i > 0 ? <Separator /> : null}
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/60">
            <div>
              <p className="m-0 font-semibold">{e.name || "Run"}</p>
              <p className="mono muted m-0 text-sm">{e.date}</p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
              <span className="mono text-sm">{formatDistance(e.distanceM, units)}</span>
              <span className="muted text-sm">·</span>
              <span className="mono text-sm">{formatDuration(e.movingTimeSec)}</span>
              <span className="muted text-sm">·</span>
              <span className="mono text-sm">
                {formatPace(e.distanceM, e.movingTimeSec, units)}
              </span>
              {e.isRace ? <Badge className="rounded-full">Race</Badge> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
