/**
 * Push the Session 5 /engage workflow to the user's n8n cloud instance.
 *
 * Behavior:
 *   - First run (no N8N_WORKFLOW_ID): POST /workflows → creates, prints ID + webhook URL.
 *   - Subsequent runs: PUT /workflows/{id} → updates in place.
 *   - Always: POST /workflows/{id}/activate → ensures workflow is live.
 *
 * Honors the n8n API peculiarities documented in ~/tool-docs/cheatsheets/n8n.md:
 *   - PUT (not PATCH) for updates.
 *   - Body is filtered to {name, nodes, connections, settings} — extra fields 400.
 *   - Activate requires Content-Type header + empty {} body.
 *   - The httpBearerAuth credential must be pre-created in n8n UI and shared
 *     with the project where this workflow lives.
 *
 * Usage:
 *   npx tsx scripts/push-n8n-workflow.ts
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const apiUrl       = process.env.N8N_API_URL;
const apiKey       = process.env.N8N_API_KEY;
const credentialId = process.env.N8N_TRIGGER_CREDENTIAL_ID;
const workflowId   = process.env.N8N_WORKFLOW_ID;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    console.error(`✗ Missing ${name} in .env`);
    process.exit(1);
  }
  return value;
}

const baseUrl = requireEnv("N8N_API_URL", apiUrl);
const key     = requireEnv("N8N_API_KEY", apiKey);
if (!credentialId) {
  console.error(
    "✗ Missing N8N_TRIGGER_CREDENTIAL_ID — create an httpBearerAuth credential in the n8n UI first.\n" +
      "   Settings → Credentials → New → HTTP Bearer Auth\n" +
      "   Name: 'Trigger.dev Secret Key'\n" +
      "   Bearer Token: <your TRIGGER_SECRET_KEY value>\n" +
      "   Then share it with your n8n project (Sharing tab) and put the credential ID in .env.",
  );
  process.exit(1);
}

const headers = {
  "X-N8N-API-KEY": key,
  "Content-Type":  "application/json",
};

const workflowJsonPath = path.join(process.cwd(), "n8n", "session5-engage.json");
const rawJson = fs.readFileSync(workflowJsonPath, "utf8")
  .replace(/__N8N_TRIGGER_CREDENTIAL_ID__/g, credentialId);

interface WorkflowNode {
  parameters?: { path?: string };
  webhookId?: string;
  type: string;
  name: string;
}

interface Workflow {
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

const workflow: Workflow = JSON.parse(rawJson);

const body = {
  name:        workflow.name,
  nodes:       workflow.nodes,
  connections: workflow.connections,
  settings:    workflow.settings ?? { executionOrder: "v1" },
};

async function deploy() {
  let id: string;
  let action: "created" | "updated";

  if (workflowId) {
    const r = await fetch(`${baseUrl}/workflows/${workflowId}`, {
      method: "PUT",
      headers,
      body:   JSON.stringify(body),
    });
    if (!r.ok) {
      console.error(`✗ PUT /workflows/${workflowId} failed: ${r.status} ${await r.text()}`);
      process.exit(1);
    }
    id = workflowId;
    action = "updated";
  } else {
    const r = await fetch(`${baseUrl}/workflows`, {
      method: "POST",
      headers,
      body:   JSON.stringify(body),
    });
    if (!r.ok) {
      console.error(`✗ POST /workflows failed: ${r.status} ${await r.text()}`);
      process.exit(1);
    }
    const created = (await r.json()) as { id: string };
    id = created.id;
    action = "created";
  }

  // Activate (idempotent)
  const aRes = await fetch(`${baseUrl}/workflows/${id}/activate`, {
    method: "POST",
    headers,
    body:   "{}",
  });
  const activated = aRes.ok;

  // Resolve webhook URL: base = N8N_API_URL minus /api/v1
  const webhookBase = baseUrl.replace(/\/api\/v1\/?$/, "");
  const webhookNode = workflow.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
  const webhookPath = webhookNode?.parameters?.path ?? webhookNode?.webhookId ?? "";
  const webhookUrl  = `${webhookBase}/webhook/${webhookPath}`;

  console.log(`\n✅ Workflow ${action}:  id = ${id}`);
  console.log(`${activated ? "✅" : "⚠ "} Activate:  ${activated ? "live" : `non-200 (${aRes.status})`}`);
  console.log(`\n📌 Slack /engage Request URL:\n   ${webhookUrl}\n`);
  if (action === "created") {
    console.log(`💡 Tip: set N8N_WORKFLOW_ID=${id} in .env so future runs update in place.`);
  }
}

deploy().catch((err) => {
  console.error("✗ Unhandled error:", err);
  process.exit(1);
});
