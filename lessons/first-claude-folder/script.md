# How Claude Code Actually Works — Video Script

**Target runtime:** 8:30
**Word count:** ~1,250
**Pacing:** ~150 wpm, natural breaths, slight pause on em-dashes

---

## SLIDE 1 — TITLE [0:00 – 0:45]

Hey — Chee Tung here. Founder of The GTM Architects.

Most people install Claude Code, type a prompt, get something that's kinda useful but not great. They blame the model. That's not the problem.

The actual problem is Claude Code doesn't work the way ChatGPT works. It reads your codebase. It follows instructions you write into files. If you don't write those files, you're using maybe twenty percent of what this thing can do.

In the next eight minutes, I'll walk you through how it actually works under the hood — the mental model, the file structure, and what happens when you type a single prompt. By the end you'll know exactly what to set up first.

Let's get into it.

`[advance to slide 2]`

---

## SLIDE 2 — MENTAL MODEL [0:45 – 1:35]

The first thing to wrap your head around: Claude Code is two systems working together.

One is deterministic. Files, commands, hooks. Same input, same output, every time. You write it once, it fires the same way forever.

The other is probabilistic. That's Claude itself — the model. Same input, different output. The model reasons fresh every turn.

The deterministic side is your control surface. The probabilistic side is your worker.

Most people only touch the worker. They prompt, they steer, they retry. They never set up the control surface — and they wonder why it feels inconsistent.

The way I think about it: CLAUDE.md is your SDR's onboarding doc. Same every morning. The actual conversation is the call — different every time. The system works when both are dialed in.

`[advance to slide 3]`

---

## SLIDE 3 — FILE TYPES [1:35 – 2:20]

Open any production dot-claude folder and you'll see three file types over and over.

Markdown — dot-md — is where the instructions live. CLAUDE.md, your skills, your rules, your memory. All plain markdown. No syntax to learn.

JSON — dot-json — is where the settings live. Permissions, hooks. Strict syntax — one missing comma breaks it.

And TypeScript or Python — for when you need actual code that runs. Trigger.dev tasks, scripts. Claude doesn't read these as instructions; it executes them.

That's it. Markdown for instruction. JSON for config. Code for execution. If you can write a doc, you can build most of this.

`[advance to slide 4]`

---

## SLIDE 4 — A PROMPT'S JOURNEY [2:20 – 3:40]

Here's the part most people miss. When you type a prompt into Claude Code, it doesn't read everything in your folder. It reaches for specific files at specific moments.

Five stages.

**Stage one — TYPE.** You give Claude a task. Plain text. *"Draft three cold emails for this prospect."*

**Stage two — BRIEF.** Before doing anything, Claude reads its standing brief. CLAUDE.md and memory. Loaded automatically. Every single prompt. Like the briefing your SDR re-reads every morning.

**Stage three — DECODE.** Claude figures out what you mean. If you typed a slash — like slash gtm-snapshot — it loads that workflow. Otherwise it interprets your prompt directly.

**Stage four — WORK.** Claude does the task. As it touches files, it pulls in the relevant rulebooks and source-of-truth docs. Editing a cold email? It pulls in your tone-of-voice rules automatically.

**Stage five — ACT.** Things actually run. Before any command fires, the harness checks what's allowed. And anything Claude learned worth remembering, it writes down for next time.

Hold that five-stage map in your head. The rest of this lesson is just walking through each stage and looking at the file behind it.

`[advance to slide 5]`

---

## SLIDE 5 — CLAUDE.md [3:40 – 4:25]

Stage two. The brief. CLAUDE.md is the file that loads on every single prompt.

Here's the trap everyone falls into. They treat CLAUDE.md like a strategy doc and dump eight thousand words in there. Their full ICP. Their tone of voice. Their offer ladder. All of it.

Don't do that. Every conversation pays that token cost — and it makes Claude slower and *less* specific, not more.

Treat CLAUDE.md like a homepage. Each line is a pointer. The source-of-truth lives in deeper docs that only load when the work demands it.

Mine's under two hundred lines. Yours should be too.

`[advance to slide 6]`

---

## SLIDE 6 — MEMORY [4:25 – 5:10]

Same pattern, different file.

Memory is where you teach Claude things you want it to remember across sessions. *"I don't like emojis in cold emails."* *"HubSpot is the source of truth, not spreadsheets."* *"We're in a launch freeze through May fifteenth."*

But MEMORY.md also loads into every prompt. So the same trap applies.

Don't write memories as paragraphs. Write them as one-line index entries — a pointer to a file that holds the full context. Each line is the headline. The body only loads when it's relevant.

`[advance to slide 7]`

---

## SLIDE 7 — SKILLS [5:10 – 6:00]

Stage three and four — decode and work. This is where skills come in.

A skill is a saved workflow. You trigger it with slash skill-name. Inside the SKILL.md file, there are instructions for how Claude should run that workflow.

The thing nobody explains clearly — skills can nest and reference.

Watch what happens when I run slash cold-email. The skill says: first, load my tone of voice and offer briefing — that's source of truth. Then load the rules around banned phrases. Then before drafting, call slash gtm-snapshot to pull fresh context on the prospect.

One skill. Multiple layers. Each layer narrow and reusable on its own.

That's the architecture. Keep each skill focused. Let it pull in what it needs.

`[advance to slide 8]`

---

## SLIDE 8 — SLASH + SUBAGENTS [6:00 – 6:35]

Two more powers worth knowing while we're in stage three.

Slash commands. A markdown file in dot-claude slash commands. Triggered by slash name. Use these for repeatable runs you want one-keystroke access to.

Subagents. A focused worker with its own tools and posture. You delegate orchestration jobs to them — campaign runs, code reviews — when you don't want Claude drifting mid-task.

And slash loops — Claude runs a prompt on an interval. Great for monitoring pipelines while you focus on something else. We go deep on those next lesson.

`[advance to slide 9]`

---

## SLIDE 9 — settings.json [6:35 – 7:10]

Stage five. Act. This is settings.json.

Two jobs. Permissions tell the harness which commands can run without prompting you for approval. Useful for things you trust — like reading from your own Notion API.

Hooks are shell commands that fire automatically on events. Every time you submit a prompt. Every time Claude finishes a task. You can hook into all of it.

The harness runs both — Claude doesn't. So this is your fully deterministic control layer.

`[advance to slide 10]`

---

## SLIDE 10 — GITHUB BASICS [7:10 – 7:45]

Last thing — for the folks who haven't shipped code before.

Your dot-claude folder lives between machines via GitHub. Three commands cover ninety percent of what you need.

Git pull — get the latest. Run it before you start working.

Git commit — save a snapshot with a message. Stays on your laptop.

Git push — send it up. Now your laptop, your server, your teammate all see the same dot-claude folder.

One rule. Never commit your dot-env file. Always commit your dot-claude folder.

`[advance to slide 11]`

---

## SLIDE 11 — OUTRO + CTA [7:45 – 8:30]

That's the lesson.

Three things to do this week. One — write your CLAUDE.md. Index, not dump. Under two hundred lines.

Two — add one skill. Pick the workflow you do most. Save it as a SKILL dot md file.

Three — commit and push. Get your dot-claude folder into version control.

Bring it to the next call. We'll review it live.

If something landed — drop a thought in the Slack channel. I read every message. And if this video specifically helped, hit me up with a DM. I want to know what landed, what didn't, and what you want me to go deeper on next.

Next lesson — skills, slash commands, and loops in depth. See you there.

`[end]`
