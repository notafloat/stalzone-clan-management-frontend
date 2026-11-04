// Local stand-in for a hosted scheduler: calls the tracker every 5 minutes while it runs.
// Needs the app running too. Start with: npm run tracker
const INTERVAL_MS = 5 * 60 * 1000;
const url = new URL("/api/cron/track", process.env.APP_URL);

async function run() {
  const time = new Date().toLocaleTimeString();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
    console.log(time, res.status, await res.text());
  } catch (error) {
    console.error(time, `Could not reach ${url}:`, error.message);
  }
}

await run();
setInterval(run, INTERVAL_MS);
