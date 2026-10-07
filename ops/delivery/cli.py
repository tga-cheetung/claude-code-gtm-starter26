#!/usr/bin/env python3
"""TGA delivery CLI — agents, terminal, Trigger.dev bundle entry."""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

WORKSPACE = Path(__file__).resolve().parents[2]
if str(WORKSPACE) not in sys.path:
    sys.path.insert(0, str(WORKSPACE))

from ops.delivery._lib.env import dry_run, load_env  # noqa: E402
from ops.delivery._lib.notify import notify_stage  # noqa: E402
from ops.delivery._lib.playbook import list_playbooks, load_playbook  # noqa: E402
from ops.delivery._lib.run_stage import run_stage  # noqa: E402
from ops.delivery._lib.state import DeliveryState  # noqa: E402


def _json(obj) -> None:
    print(json.dumps(obj, indent=2, sort_keys=True, default=str))


def cmd_playbook_list(_: argparse.Namespace) -> int:
    _json({"playbooks": list_playbooks()})
    return 0


def cmd_playbook_show(args: argparse.Namespace) -> int:
    _json(load_playbook(args.playbook))
    return 0


def cmd_engagement_start(args: argparse.Namespace) -> int:
    load_env()
    st = DeliveryState(args.client)
    ctx = json.loads(args.context) if args.context else {}
    if args.sow_signed:
        ctx.setdefault("sow_signed_at", "manual")
    eng = st.start_engagement(args.playbook, context=ctx)
    if args.sow_signed:
        st.set_external_gate("sow_signed", True)
    notify_stage(args.client, "engagement", "started", f"playbook `{args.playbook}`")
    _json({"engagement": eng, "status": st.status_summary()})
    return 0


def cmd_engagement_status(args: argparse.Namespace) -> int:
    load_env()
    st = DeliveryState(args.client)
    _json(st.status_summary())
    return 0


def cmd_gate_complete(args: argparse.Namespace) -> int:
    load_env()
    st = DeliveryState(args.client)
    st.set_external_gate(args.gate, True)
    _json(st.status_summary())
    return 0


def cmd_stage_run(args: argparse.Namespace) -> int:
    load_env()
    if args.dry_run:
        os.environ["DRY_RUN"] = "1"
    st = DeliveryState(args.client)
    summary = st.status_summary()
    if not summary.get("active"):
        raise SystemExit(f"No active engagement for {args.client}")
    if args.stage not in summary.get("ready", []) and not args.force:
        raise SystemExit(
            f"Stage {args.stage} not ready. Ready: {summary.get('ready')}. Use --force to override."
        )
    st.update_stage(args.stage, "running")
    try:
        extra = json.loads(args.extra) if args.extra else {}
        result = run_stage(args.stage, args.client, dry_run=args.dry_run, extra=extra)
        new_status = result.get("status", "complete")
        st.update_stage(
            args.stage,
            new_status,
            waiting_for=result.get("waiting_for"),
            result=result,
        )
        if new_status == "complete":
            notify_stage(args.client, args.stage, "complete", result.get("summary", ""))
        elif new_status == "waiting":
            notify_stage(
                args.client,
                args.stage,
                "waiting",
                result.get("waiting_for", ""),
            )
        _json({"result": result, "status": st.status_summary()})
        return 0
    except Exception as e:
        st.update_stage(args.stage, "failed", error=str(e))
        notify_stage(args.client, args.stage, "failed", str(e))
        raise


def cmd_stage_complete(args: argparse.Namespace) -> int:
    load_env()
    st = DeliveryState(args.client)
    st.update_stage(args.stage, "complete", result={"manual": True})
    _json(st.status_summary())
    return 0


def cmd_inbox_screen(args: argparse.Namespace) -> int:
    from ops.delivery._lib.inbox_provision.screen_domains import main as screen_main

    argv = ["--client", args.client]
    if args.candidates:
        argv += ["--candidates", args.candidates]
    if args.file:
        argv += ["--file", args.file]
    if args.out:
        argv += ["--out", args.out]
    if args.no_availability:
        argv += ["--no-availability"]
    if getattr(args, "no_pair_com_co", False):
        argv += ["--no-pair-com-co"]
    if getattr(args, "skip_dnsbl", False):
        argv += ["--skip-dnsbl"]
    if getattr(args, "format", None):
        argv += ["--format", args.format]
    return screen_main(argv)


def cmd_inbox_smartlead_tracking(args: argparse.Namespace) -> int:
    from ops.delivery._lib.inbox_provision.smartlead_tracking_domain import main as tracking_main

    argv = ["--client", args.client]
    if args.dry_run:
        argv += ["--dry-run"]
    if args.skip_dns:
        argv += ["--skip-dns"]
    if args.skip_smartlead:
        argv += ["--skip-smartlead"]
    if args.verify_dns:
        argv += ["--verify-dns"]
    if args.domain:
        argv += ["--domain", args.domain]
    if getattr(args, "estate", None):
        argv += ["--estate", args.estate]
    return tracking_main(argv)


def cmd_inbox_smartlead_sync(args: argparse.Namespace) -> int:
    from ops.delivery._lib.inbox_provision.smartlead_sync import main as sync_main

    argv = ["--client", args.client]
    if args.once:
        argv += ["--once"]
    if args.until_done:
        argv += ["--until-done"]
    if args.interval:
        argv += ["--interval", str(args.interval)]
    if args.max_minutes:
        argv += ["--max-minutes", str(args.max_minutes)]
    if args.dry_run:
        argv += ["--dry-run"]
    return sync_main(argv)


def cmd_inbox_rules(args: argparse.Namespace) -> int:
    from ops.delivery._lib.inbox_provision.domain_rules import load_rules

    _json(load_rules())
    return 0


def cmd_inbox_blocklist(args: argparse.Namespace) -> int:
    from ops.delivery._lib.inbox_provision.estate_blocklist import blocklist_report

    _json(blocklist_report(args.client))
    return 0


def cmd_inbox_preflight(args: argparse.Namespace) -> int:
    from ops.delivery.scripts.roe_preflight_check import check as roe_preflight_check

    result = roe_preflight_check(args.client)
    _json(result)
    return 0 if result["ready_for_provision"] else 1


def cmd_inbox_size(args: argparse.Namespace) -> int:
    from ops.delivery._lib.inbox_provision.send_estate_sizer import apply_to_intake, size_estate

    sizing = size_estate(args.monthly_sends, apply_stamp=not args.no_stamp)
    if args.client:
        path = apply_to_intake(args.client, sizing)
        sizing["intake_updated"] = str(path)
    _json(sizing)
    return 0


def cmd_trigger_start(args: argparse.Namespace) -> int:
    """Trigger durable orchestrator via Trigger.dev API (when configured)."""
    load_env()
    from ops.delivery._lib.env import env  # noqa: E402

    secret = env("TRIGGER_PROD_SECRET_KEY") or env("TRIGGER_SECRET_KEY")
    if not secret:
        raise RuntimeError("Missing TRIGGER_PROD_SECRET_KEY or TRIGGER_SECRET_KEY")
    import urllib.request

    playbook = load_playbook(args.playbook)
    task_id = (playbook.get("trigger") or {}).get("orchestrator_task") or "delivery-standard-engine"
    body = json.dumps(
        {
            "payload": {
                "client_slug": args.client,
                "playbook_id": args.playbook,
                "dry_run": bool(args.dry_run),
            }
        }
    ).encode()
    req = urllib.request.Request(
        f"https://api.trigger.dev/api/v1/tasks/{task_id}/trigger",
        data=body,
        headers={
            "Authorization": f"Bearer {secret}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    if args.dry_run:
        _json({"dry_run": True, "would_trigger": task_id, "client": args.client})
        return 0
    with urllib.request.urlopen(req, timeout=30) as resp:
        out = json.loads(resp.read().decode())
    _json(out)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="TGA delivery ops")
    sub = p.add_subparsers(dest="command", required=True)

    pl = sub.add_parser("playbook", help="List or show playbooks")
    pl_sub = pl.add_subparsers(dest="playbook_cmd", required=True)
    pl_list = pl_sub.add_parser("list")
    pl_list.set_defaults(func=cmd_playbook_list)
    pl_show = pl_sub.add_parser("show")
    pl_show.add_argument("playbook")
    pl_show.set_defaults(func=cmd_playbook_show)

    eng = sub.add_parser("engagement", help="Engagement lifecycle")
    eng_sub = eng.add_subparsers(dest="engagement_cmd", required=True)
    eng_start = eng_sub.add_parser("start")
    eng_start.add_argument("--client", required=True)
    eng_start.add_argument("--playbook", default="standard-engine")
    eng_start.add_argument("--context", help="JSON object")
    eng_start.add_argument("--sow-signed", action="store_true")
    eng_start.set_defaults(func=cmd_engagement_start)
    eng_status = eng_sub.add_parser("status")
    eng_status.add_argument("--client", required=True)
    eng_status.set_defaults(func=cmd_engagement_status)

    gate = sub.add_parser("gate", help="External gates")
    gate_sub = gate.add_subparsers(dest="gate_cmd", required=True)
    gate_done = gate_sub.add_parser("complete")
    gate_done.add_argument("--client", required=True)
    gate_done.add_argument("--gate", required=True)
    gate_done.set_defaults(func=cmd_gate_complete)

    st = sub.add_parser("stage", help="Run or complete a stage")
    st_sub = st.add_subparsers(dest="stage_cmd", required=True)
    st_run = st_sub.add_parser("run")
    st_run.add_argument("stage")
    st_run.add_argument("--client", required=True)
    st_run.add_argument("--dry-run", action="store_true")
    st_run.add_argument("--force", action="store_true")
    st_run.add_argument("--extra", help="JSON passed to runner")
    st_run.set_defaults(func=cmd_stage_run)
    st_done = st_sub.add_parser("complete")
    st_done.add_argument("stage")
    st_done.add_argument("--client", required=True)
    st_done.set_defaults(func=cmd_stage_complete)

    tr = sub.add_parser("trigger", help="Trigger.dev orchestrator")
    tr_sub = tr.add_subparsers(dest="trigger_cmd", required=True)
    tr_start = tr_sub.add_parser("start")
    tr_start.add_argument("--client", required=True)
    tr_start.add_argument("--playbook", default="standard-engine")
    tr_start.add_argument("--dry-run", action="store_true")
    tr_start.set_defaults(func=cmd_trigger_start)

    ib = sub.add_parser("inbox", help="Inbox provision helpers (domain screen, Smartlead sync)")
    ib_sub = ib.add_subparsers(dest="inbox_cmd", required=True)
    ib_rules = ib_sub.add_parser("rules", help="Print canonical domain shape rules")
    ib_rules.set_defaults(func=cmd_inbox_rules)
    ib_bl = ib_sub.add_parser("blocklist", help="Print estate blocklist for client")
    ib_bl.add_argument("--client", required=True)
    ib_bl.set_defaults(func=cmd_inbox_blocklist)
    ib_pf = ib_sub.add_parser(
        "preflight",
        help="ROE send-estate decisions — run at skill start before size/screen/provision",
    )
    ib_pf.add_argument("--client", required=True)
    ib_pf.set_defaults(func=cmd_inbox_preflight)
    ib_size = ib_sub.add_parser("size", help="Size send estate from ROE spreadsheet rules")
    ib_size.add_argument("--monthly-sends", type=int, required=True)
    ib_size.add_argument("--client", help="Write domain_count to delivery-intake.json")
    ib_size.add_argument("--no-stamp", action="store_true")
    ib_size.set_defaults(func=cmd_inbox_size)
    ib_screen = ib_sub.add_parser("screen", help="Screen candidate domains")
    ib_screen.add_argument("--client", required=True)
    ib_screen.add_argument("--candidates", help="JSON array of domains")
    ib_screen.add_argument("--file")
    ib_screen.add_argument("--out")
    ib_screen.add_argument("--no-availability", action="store_true")
    ib_screen.add_argument("--skip-dnsbl", action="store_true", help="Skip DNSBL lookups (dev only)")
    ib_screen.add_argument("--no-pair-com-co", action="store_true")
    ib_screen.add_argument(
        "--format",
        choices=("both", "markdown", "json"),
        default="both",
        help="CT markdown table, JSON, or both (default: both)",
    )
    ib_screen.set_defaults(func=cmd_inbox_screen)
    ib_sync = ib_sub.add_parser("smartlead-sync", help="Resumable Smartlead standby loader")
    ib_sync.add_argument("--client", required=True)
    ib_sync.add_argument("--once", action="store_true")
    ib_sync.add_argument("--until-done", action="store_true")
    ib_sync.add_argument("--interval", type=int, default=120)
    ib_sync.add_argument("--max-minutes", type=int, default=360)
    ib_sync.add_argument("--dry-run", action="store_true")
    ib_sync.set_defaults(func=cmd_inbox_smartlead_sync)
    ib_track = ib_sub.add_parser(
        "smartlead-tracking",
        help="InboxKit CNAME + Smartlead custom_tracking_url per sending domain",
    )
    ib_track.add_argument("--client", required=True)
    ib_track.add_argument("--dry-run", action="store_true")
    ib_track.add_argument("--skip-dns", action="store_true")
    ib_track.add_argument("--skip-smartlead", action="store_true")
    ib_track.add_argument("--verify-dns", action="store_true")
    ib_track.add_argument("--domain", help="Limit to one sending domain (pilot)")
    ib_track.add_argument(
        "--estate",
        choices=("roe", "hypertide"),
        default="roe",
        help="Hypertide backup domains (intake hypertide_tracking.domains, CNAME host smart)",
    )
    ib_track.set_defaults(func=cmd_inbox_smartlead_tracking)

    return p


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
