---
description: Read visitor reports from my Google Sheet and act on them
---

Review the reports visitors submitted (abuse, wrong dates, event suggestions) and act on them.

1. Read my "Alarm-clock Reports" Google Sheet (ID `19BOsDyCdKS-3F9LaNTybmnzokQiDbzyFU9iy3cBOSy0`) using the Google Drive tools if they are connected to this session. If they are not connected, tell me and ask me to paste the recent rows instead.
2. Skip HEALTH CHECK rows. For each real report, triage:
   - "Wrong or outdated date": verify the claim against official sources with web search. If the reporter is right, fix the data (events.json etc.), rebuild, and note the correction.
   - "Event suggestion": assess whether it is a big public event per /suggest-event criteria. If yes, propose it to me (name, date pattern, category) and add it only after I approve. If clearly too small, note why.
   - abuse reasons (hate, harassment, etc.): show me the reported URL and details and WAIT for my decision before any blocklist change. Never auto-block.
3. If any data changed, run `npm run build`, commit, push the branch, fast-forward `main` and push to deploy.
4. Finish with a one-line status per report: fixed / proposed / needs-my-decision / dismissed (and why).
