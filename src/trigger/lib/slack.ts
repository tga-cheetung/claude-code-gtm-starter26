// ─────────────────────────────────────────────────────────────────────────────
// Slack wrapper — signature verification for incoming slash commands,
// chat.postMessage for outgoing notifications.
// ─────────────────────────────────────────────────────────────────────────────

import { WebClient } from "@slack/web-api";
import crypto from "node:crypto";

let client: WebClient | null = null;
const slack = () => (client ??= new WebClient(process.env.SLACK_BOT_TOKEN));

export async function postSlackMessage(channel: string, text: string): Promise<void> {
  await slack().chat.postMessage({ channel, text });
}

/**
 * Verifies a Slack request signature per:
 * https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * Returns true if the signature is valid AND the timestamp is within 5 minutes
 * (replay-attack protection).
 */
export function verifySlackSignature(
  rawBody: string,
  timestamp: string,
  signature: string,
): boolean {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;

  const ts = parseInt(timestamp, 10);
  if (Number.isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 300) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const computed = "v0=" + crypto
    .createHmac("sha256", secret)
    .update(base)
    .digest("hex");

  if (computed.length !== signature.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

/** Parses a Slack slash command body (application/x-www-form-urlencoded). */
export function parseSlashCommand(rawBody: string): {
  command: string;
  text: string;
  channelId: string;
  userId: string;
  responseUrl: string;
} {
  const params = new URLSearchParams(rawBody);
  return {
    command:     params.get("command") ?? "",
    text:        params.get("text") ?? "",
    channelId:   params.get("channel_id") ?? "",
    userId:      params.get("user_id") ?? "",
    responseUrl: params.get("response_url") ?? "",
  };
}
