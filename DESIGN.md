# ShipAudit: Signal Bench

## Critique and direction

Keep the no-signup URL-to-report flow, the stress test, the ranked advice, and the copyable coding prompt. Remove the purple haze, the dark-to-light jump, invented timer progress, passing checks presented as problems, and the long undifferentiated report column. The product should make three decisions easy: how did the site perform, what matters first, and what do I take to my editor?

Three concepts were considered:

| Concept | Mood | Product connection |
| --- | --- | --- |
| Flight Recorder | Graphite, amber, timestamped traces | Makes every audit feel like a recorded diagnostic session; especially suited to future deployment history. |
| **Signal Bench — selected** | Graphite, electric lime, crisp data, quiet surfaces | A working instrument for developers: measure the signal, locate the drag, take action. Bold enough to screenshot without ornamental dashboard noise. |
| Field Notes | Warm paper, ink, editorial annotations | Makes technical diagnosis approachable and readable; strongest for a prose-led product. |

Signal Bench uses one dark theme throughout. Consistency and a clear action hierarchy matter more than adding a second appearance mode at this stage. Lime means “take action”; mint, amber, and coral communicate measured status. Color always has a text label alongside it.

## System tokens

| Token | Value | Role |
| --- | --- | --- |
| Background | `#101311` | Page / instrument bed |
| Surface | `#181d19` | Cards / panels |
| Raised surface | `#202720` | Hover / selected surfaces |
| Divider | `#333d34` | Grouping, not essential control boundaries |
| Primary text | `#f1f3e9` | Headlines / numbers |
| Secondary text | `#a1afa3` | Explanation / labels |
| Action | `#d5f66b` | Primary actions / focus |
| Action text | `#19210a` | Text on lime |
| Good | `#82d6ad` | Passing measurements |
| Needs improvement | `#f4c477` | Intermediate measurements |
| Poor | `#ff9a8e` | Poor measurements / errors |
| Control boundary | `#667553` | URL control; focus adds lime outline |

Display: **Space Grotesk**, weight 600, tight tracking, scale 24 / 28 / 32 / 44 / 52 / 65px. UI: **Inter**, 12 / 13 / 14 / 15 / 16px, 1.6–1.85 line height for explanations. Data and labels: **JetBrains Mono**, 10 / 11 / 12 / 22 / 29 / 62px, tabular figures. Mobile reduces the hero to 44px and report gauge numbers to 42px. Small mono labels are supporting text, never the only explanation or an unlabeled icon action.

Spacing: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 64 / 84px. Main shell: 1280px maximum with 40px desktop gutters, 24px tablet, 18px phone. Radius: 4px labels, 7px controls, 10px detail cards, 14px major panels. Shadow: preview `0 20px 80px #0006`, floating controls `0 5px 25px #0005`; everyday data panels use borders rather than shadows.

Lucide outline icons are the shared vocabulary: image for LCP, pointer for INP, layers for CLS, scan for FCP, timer for TTFB. Code, image, and type icons label resource analyses. Guard uses comparison, bell, and shield icons. The existing pulse logo changes to lime.

### Motion

| Interaction | Timing / behavior |
| --- | --- |
| Score gauge | 850ms cubic ease-out number count and circular stroke reveal |
| Category scores | 500ms reveal, 60ms stagger |
| Finding rows | 300ms entrance, 25ms stagger capped at eight rows |
| Loading handoff | Server-confirmed completion, 250ms acknowledgement before report navigation |
| Hover / press | 160–180ms color/border, 1px press displacement; priority card rises 3px |
| Copy | Check icon and “Copied. Go ship it.” for 2.2s; live status announcement |
| Accordion | Native keyboard-operable details; 220ms content reveal and 200ms chevron turn |
| Loading instrument | Decorative 5s scan and 1.5s activity pulse; never presented as measured data |

The standard easing is `cubic-bezier(.22,1,.36,1)`. Reduced motion disables transitions, scanning, stagger, and smooth scrolling; the final score remains immediately readable.

## Screen specifications

### Landing

An asymmetric two-column workbench: clear promise on the left, an interactive report preview on the right. The URL control is the hero action: real label, lime focus ring, protocol completion on blur/submit, validation before dispatch, and examples that fill rather than silently submit. Cmd/Ctrl+K focuses and selects the input. No clipboard permission is required for the shortcut.

Copy: **Find the drag. Ship the fix.** Supporting copy describes the actual output, rather than a broad AI claim. The preview is explicitly labeled “example report” and opens `/report/demo`; every filter, accordion, copy button, and export works with illustrative data. Three recent audits are kept locally in the browser. Their report links follow the actual one-hour retention policy.

A three-part method strip explains measurement, framework-aware advice, and the coding prompt. One Guard panel appears after that explanation. It promises future capabilities and labels the product “coming soon.”

### Loading

A live session with the target URL, elapsed clock, activity console, and rotating short explanations. Stage changes follow server responses: request/page inspection → queued or running Lighthouse → result received and report processing → complete. Lighthouse queue and execution are combined because the current API cannot distinguish them. No percentages or timer-driven discoveries are invented.

The decorative waveform is an instrument motif, not captured page performance. Educational notes cover slower devices, LCP, unavailable INP, and overlapping point estimates. After 90 seconds the copy explains queues and page complexity. After five minutes, an actionable timeout replaces the wait. Going back stops polling; the remote runner may finish independently.

### Report

Desktop uses a wide data column and a 330px sticky action column. A sticky header provides home, findings navigation, report sharing, and a fresh re-audit entry point. The report identifies the URL, UTC timestamp, simulated lab context, and detected stack. Unknown detection says “Framework not detected.”

1. Score overview: measured score, one-line verdict, estimated potential and delta, four category scores, lab methodology. Browser-local comparison shows change from a previous visit/test and warns that lab runs vary.
2. Start here: up to three priority cards, with impact and estimated effort, then a readable diagnosis. Selecting a priority resets filters, opens its finding, scrolls there, and focuses the summary.
3. Vital signs: LCP / INP / CLS plus FCP / TTFB diagnostics. Every value has a status label and thresholds. Missing values have an em dash and a reason. INP is never inferred from a navigation-only test.
4. Fix queue: category, vital, and effort filters; impact or quick-fix sorting. Each expanded failure contains evidence, why it matters, returned resources, stack-aware advice, and its own copy prompt. Point estimates are marked directional and non-additive.
5. Passed and informational/manual checks: separate collapsed sections. No invented point rewards. Accessibility issues explicitly remain important even if their estimated score impact is small.
6. Resources: image waste, third-party blocking, and font observations with expandable source lists.
7. Markdown export, copied ticket text for GitHub/Linear, and share link. OG cards use the same palette and honest score state.
8. One contextual Guard panel, describing how to keep the gains after future deploys.

The primary AI prompt appears in the sticky action column, with a full readable version and an accessible copy action. On mobile, the prompt appears near the top and a fixed bottom copy action stays available. Filters wrap, category scores use two columns, priorities become full-width rows, and resources stack. The header keeps explicit accessible names when text is hidden.

### Errors and edge states

| State | Presentation / next action |
| --- | --- |
| Invalid URL | Inline explanation next to the preserved field; edit URL. |
| Timeout | Explain that the runner may be queued or the page slow; retry or try a lighter public page. |
| HTTP 403/429 | Explain access denied; try a public page or allow automated testing. Do not claim bot protection without evidence. |
| Failed document load / DNS | Check the page in a browser, then retry. |
| Runner/service unavailable | Preserve the URL and provide a retry path. |
| Expired session | Start a fresh run. |
| Expired/missing report | Dedicated 404 screen; reports last one hour, export to retain. |
| Failed measurement | Withhold the composite score and AI prompt; never present zero timing as “Good.” |
| Partial categories | Show returned metrics, list missing categories, withhold a complete composite score/prompt, and offer a fresh test. |
| Legacy report | Require a fresh audit because the old schema did not retain pass/fail evidence. |
| No failed checks | Clean-run state; retain manual/informational checks and the review prompt. |
| Filter matches nothing | Clearly say no matches and provide Reset filters. |
| Copy denied | Explain clipboard unavailability; the full prompt remains selectable. |
| Waitlist delivery failure | Signup is persisted in Redis before optional notification email. |
| Feedback failure | Show a retry message; never report successful delivery after an error. |

## Accessibility and small delights

Visible lime focus rings, skip-to-content, semantic buttons/labels/selects/details, 44px primary touch targets, announced copy/errors, reduced motion, and a native feedback dialog with focus trapping and Escape dismissal. Semantic text tokens must meet 4.5:1 against their displayed surfaces; controls that rely on borders use a stronger boundary than decorative dividers.

Implemented touches: Cmd/Ctrl+K URL focus, live elapsed time with useful notes, score count-up, “Copied. Go ship it.” feedback, and browser-local re-audit score comparison. Sharing has a consistent score card, with examples labeled as examples.

The lab/field distinction follows [Google's Web Vitals guidance](https://web.dev/articles/vitals). Runtime lifetime handling follows Next.js 16's bundled `after` documentation; configured function limits are within [Vercel's duration limits](https://vercel.com/docs/functions/configuring-functions/duration).

## Verification

Run lint and TypeScript checks, a production build, and `node --experimental-strip-types --test tests/report-data.test.mjs` on Node 22.12 or later. Data tests cover absent metrics, genuine zero CLS, pass/fail/info separation, current Lighthouse aliases and checklist detail objects, load failure, partial categories, legacy reports, and URL validation. Browser checks cover home, example report, filters, details, clipboard, native dialog, mobile overflow, loading/error UI, and reduced motion. Mocked browser responses exercise UI stages; a fresh deployed audit verifies the real runner/callback/Redis/Groq flow separately.

## Audit history without authentication

`/history` stores up to 50 measured report snapshots in IndexedDB on the user's browser. Completed audits from the home flow save automatically when the report opens; visitors can also save an online report explicitly. Each snapshot has a timestamped key, so repeated fresh tests of the same URL retain separate versions. The list supports URL search, reopening a full saved report, individual deletion, and clearing all snapshots with an explicit confirmation step. A single read/write transaction keeps retention correct when several tabs save simultaneously. Failed runs and the illustrative demo are excluded.

Saved reports remain readable after server expiry. Their page labels the data as a local snapshot and does not offer a misleading online sharing link for that historical version. Markdown export remains available. Saving a snapshot or viewing history does not require an account or a new backend service. Browser storage can be cleared, denied, or evicted; the UI explains this and retains export as the durable alternative. History is private to the current browser/origin and does not sync across devices. Preview and production origins have separate browser storage.

Current report data uses the Redis prefix `report:v2:` so the new nullable measurement schema cannot break the older production UI while the redesign is in preview. Protected previews use `AUDIT_CALLBACK_ORIGIN` to reach the existing public callback receiver in the same project; the processor's self-request uses Vercel's built-in automation header. Production continues to receive its own callbacks.
