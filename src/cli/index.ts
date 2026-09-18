import { createServer } from "node:http";
import { athleteDisplayName, fetchStravaAthlete } from "@/lib/strava";
import {
  ensureFreshCredentials,
  loginWithLoopback,
  openSystemBrowser,
} from "./auth";
import { loadForecast } from "./forecast";
import { formatForecast, formatPlan } from "./print";
import {
  clearCredentials,
  clearGoal,
  readCredentials,
  writeCredentials,
} from "./store";

const USAGE =
  "Usage: npm run truepace -- <login|logout|whoami|forecast|plan> [--all|--reset-goal]";

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "login") {
    const credentials = await loginWithLoopback({
      openBrowser: openSystemBrowser,
      fetchImpl: fetch,
      listen: async (onTicket) =>
        new Promise((resolve, reject) => {
          const server = createServer((request, response) => {
            const url = new URL(
              request.url ?? "/",
              "http://127.0.0.1",
            );
            const ticket = url.searchParams.get("ticket");
            if (url.pathname !== "/callback" || !ticket) {
              response.writeHead(400, { "Content-Type": "text/plain" });
              response.end("Invalid callback.");
              return;
            }
            response.writeHead(200, { "Content-Type": "text/plain" });
            response.end("TruePace login complete. You may close this window.");
            onTicket(ticket);
          });
          server.once("error", reject);
          server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (!address || typeof address === "string") {
              server.close();
              reject(new Error("Could not start loopback listener"));
              return;
            }
            resolve({
              port: address.port,
              close: () => server.close(),
            });
          });
        }),
    });
    const name =
      athleteDisplayName({
        id: credentials.athlete.id,
        firstname: credentials.athlete.firstname ?? undefined,
        lastname: credentials.athlete.lastname ?? undefined,
      }) ?? "Strava athlete";
    console.log(`Authorized as ${name} (${credentials.athlete.id})`);
    return;
  }

  if (cmd === "logout") {
    clearCredentials();
    if (rest.includes("--all")) clearGoal();
    console.log("Logged out.");
    return;
  }

  if (cmd === "whoami") {
    if (!readCredentials()) {
      console.error("Run npm run truepace -- login");
      process.exitCode = 1;
      return;
    }
    let credentials = await ensureFreshCredentials();
    let name = athleteDisplayName({
      id: credentials.athlete.id,
      firstname: credentials.athlete.firstname ?? undefined,
      lastname: credentials.athlete.lastname ?? undefined,
    });
    if (!name) {
      const athlete = await fetchStravaAthlete(credentials.access_token);
      credentials = { ...credentials, athlete };
      writeCredentials(credentials);
      name = athleteDisplayName(athlete);
    }
    console.log(`${name ?? "Strava athlete"} (${credentials.athlete.id})`);
    return;
  }

  if (cmd === "forecast" || cmd === "plan") {
    if (!readCredentials()) {
      console.error("Run npm run truepace -- login");
      process.exitCode = 1;
      return;
    }
    const result = await loadForecast({
      resetGoal: rest.includes("--reset-goal"),
    });
    console.log(cmd === "forecast" ? formatForecast(result) : formatPlan(result));
    return;
  }

  console.error(USAGE);
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
