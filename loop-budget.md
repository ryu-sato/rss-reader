# Loop Budget — YOUR_PROJECT

> Primary loop: **Daily Triage** (scaffolded by loop-init)

## Daily limits

| Loop | Max runs/day | Max tokens/day | Max sub-agent spawns/run |
|------|--------------|----------------|--------------------------|
| Daily Triage | 2 | 100k | 0 (L1) / 2 (L2) |

## On budget exceed

1. Pause schedulers (`scheduler_delete` or disable automations)
2. Append event to `loop-run-log.md`
3. Notify human (Slack / issue / STATE.md High Priority)

## Kill switch

- Command or issue label: `loop-pause-all`
- Resume only after human clears the flag in STATE.md

## Estimate spend

```bash
npx @cobusgreyling/loop-cost --pattern daily-triage
```

## Alerts This Period

- 2026-07-26: Daily Triage ran twice in one day (report + human-directed fix), combined ~135k tokens estimate — over the 100k/day cap. Cause: human explicitly asked for fixes mid-session, outside the normal report-only cadence. Next scheduled run (2026-07-27T00:07) should stay report-only unless spend resets and budget is confirmed clear.
