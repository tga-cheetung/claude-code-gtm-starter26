import { defineConfig } from "@trigger.dev/sdk/v3";

// Replace `project` with your own Trigger.dev project ref. Find it in the
// Trigger.dev dashboard URL or by running `npx trigger.dev@latest whoami`.
// The value below is a placeholder — runs will fail until you update it.
export default defineConfig({
  project: "proj_REPLACE_WITH_YOUR_PROJECT_REF",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
});
