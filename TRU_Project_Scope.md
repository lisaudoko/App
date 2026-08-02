# Throwers R Us Performance System — Project Scope & Requirements
**Version 1.3 | July 24, 2026**
**Prepared by NexGen Optimize**

---

## 1. What This App Actually Does

Most coaching apps are glorified spreadsheets. This is not one of them.

The Throwers R Us Performance System is a coaching intelligence platform. It does not just store data — it works on the data continuously, surfaces insights automatically, and delivers decisions to the coach and athletes without anyone having to run a formula or build a chart.

Here is what that looks like in practice.

---

### The Coach Opens the App on Monday Morning

Before practice, the coach checks the mobile app. In under 30 seconds they see:

- Which athletes submitted their weekly results and which did not (no chasing, no texting)
- A squad readiness heatmap — green, yellow, or red for every athlete based on RPE trend and training load from the past 4 weeks
- Any athlete whose throws are dropping while their RPE is rising (possible overtraining — act now before it becomes an injury)
- Who hit a new personal best last week
- Where each athlete is projected to be at the next competition based on their current trajectory

None of this is calculated by the coach. The app calculates it the moment each athlete submits their results and keeps it updated.

---

### An Athlete Opens the App on Lift Day

The athlete's phone shows their individualized workout for the day — exact exercises, exact weights per set, exact rep targets — calculated automatically from their 1RM maxes and the current mesocycle week. The coach did not send a file. The athlete did not look anything up. The prescription is already there. The athlete works through it, checks off sets as they complete them, and the coach can see in real time which athletes are in the gym and progressing through their session.

After training, the athlete logs their weekly throw distance. The app immediately recalculates their season trajectory line, updates their projection for the next meet, and if they've hit a new season best, they get a notification on their phone.

---

### The Coach Sits Down Before a Major Meet

The coach opens the web dashboard and pulls up the Squad Projection view. For every athlete entered in the meet, they see a projected performance range based on the last 8 weeks of data — not a guess, a regression model built on actual results. They see which athletes are tracking to peak right now and which may have peaked a week too early or a week too late. They see the strength-to-performance correlation for each athlete — whether their lift gains are translating to throw improvement or whether there's a gap that signals a technique issue.

This is the kind of preparation that used to take an experienced coach hours of analysis. The app delivers it in one view.

---

## 2. Why This Cannot Be Done in a Spreadsheet

| Capability | Excel | This App |
|---|---|---|
| Athlete logs results from their phone at the track | No | Yes — real-time, from anywhere |
| Workout delivered automatically to each athlete's phone | No | Yes — calculated and pushed each week |
| Coach sees squad status without opening any file | No | Yes — live dashboard, any device |
| Performance trajectory projected to every meet date | Manual rebuild every week | Automatic — updates with every entry |
| Load management and fatigue flagging | No | Yes — RPE × volume + wellness, automatic alerts |
| Strength-to-performance correlation visible per athlete | No | Yes — scatter plot, auto-generated |
| Peak timing indicator before competition | No | Yes — green/yellow/red per athlete |
| Athlete receives PB notification instantly | No | Yes — push notification on submission |
| Coach manages 30 athletes from a phone at a meet | No | Yes — mobile coach + competition day mode |
| Qualifying standards tracked automatically per athlete | No | Yes — gap, trajectory, and deadline projection |
| Coach asks a question in plain English, gets an answer | No | Yes — AI assistant reads live squad data |
| Anomalies and risk patterns surfaced automatically | No | Yes — AI detection, no manual review needed |
| Multi-season athlete development history | No | Yes — year-over-year progression per athlete |
| Any coach in the world can set up their own programme | No | Yes — fully configurable platform |

---

## 3. The Intelligence Layer

These are the analytical engines that run behind every screen in the app.

---

### 3.1 Performance Trajectory Model
**What it does:** Builds a rolling linear regression on each athlete's weekly throw data. Projects performance forward to every meet date on the schedule. Updates automatically after every weekly entry.

**What the coach sees:** A line chart with the athlete's actual results as solid dots, a dotted projection line extending to the end of the season, and a shaded confidence band (high/low range). At each upcoming meet marker, the projected performance range is displayed: "Projected at Boys & Girls Champs: 16.1m – 16.7m."

**Why it matters:** The coach knows well in advance whether an athlete is on track for their season goal — not after the meet, not the week before, but throughout the season. Programme adjustments can be made while there is still time.

---

### 3.2 Training Load and Fatigue Model
**What it does:** Calculates a weekly load score for each athlete (volume × RPE). Tracks the acute load (last week) against the chronic load (rolling 4-week average). Flags athletes whose acute:chronic ratio is outside a healthy range — either overreaching (injury risk) or underloading (undertraining).

**What the coach sees:** A squad-wide heatmap — one row per athlete, one column per week, color-coded green to red. A red cell means that athlete had a dangerously high load that week. Missing cells mean the athlete did not log — an accountability gap.

**Why it matters:** Overuse injuries in throws events are career-threatening. This model gives the coach an early warning before the athlete breaks down. A spreadsheet cannot generate this view automatically.

---

### 3.3 Peak Timing Indicator
**What it does:** Combines periodization phase, current performance trend, and RPE pattern to estimate whether each athlete is tracking to peak at the right competition. Compares the athlete's current form trajectory against the planned competition phase.

**What the coach sees:** A traffic light indicator per athlete — green (on track), yellow (may peak early or late), red (needs programme adjustment now). Displayed on the squad overview dashboard and on each individual athlete report.

**Why it matters:** Peaking at the right time is the difference between a season best at nationals and leaving performance in training. Coaches currently rely entirely on experience and feel for this. The app gives them a data signal to confirm or challenge their read.

---

### 3.4 Strength-to-Performance Correlation Engine
**What it does:** For each athlete, plots their key lift maxes (squat, clean, bench) against their throw marks over the season on a scatter chart. Calculates the correlation coefficient. Flags when strength is increasing but throw performance is not following.

**What the coach sees:** A scatter plot per athlete with a regression line. A correlation summary: strong positive correlation (strength gains translating), weak correlation (strength and throws diverging — possible technique issue).

**Why it matters:** The coach can diagnose in seconds whether an athlete's flatline in throws is a strength problem (lift the numbers) or a technique problem (return to technical work). This distinction changes the entire prescription for that athlete.

---

### 3.5 1RM Prescription Engine
**What it does:** Calculates every athlete's individualized workout — exact weight in lbs per set per exercise — based on their current 1RM maxes, the mesocycle week's intensity percentage, and the set pyramid structure. Recalculates automatically when maxes are updated after test week.

**What the coach sees:** One-tap generation of the full 4-week mesocycle workout card for any athlete. Export to PDF for printing. Push to athlete's mobile view for gym day access.

**Why it matters:** Coaches with 30 athletes cannot manually calculate set-by-set prescriptions for every training block. This engine does in seconds what would otherwise take hours — and it's exact, not estimated.

---

### 3.6 Meet Performance Projector
**What it does:** For each athlete entered in an upcoming meet, calculates a projected performance range based on their regression trajectory, historical meet vs. training ratio (some athletes perform better or worse in competition than in training), and current form.

**What the coach sees:** On the meet schedule page, each athlete's entry shows their projected meet performance range. On the individual athlete report, a marker on the projection chart shows the predicted range at each meet date.

**Why it matters:** Entry decisions, heat strategy, athlete expectation-setting with parents — all of these benefit from a data-informed projection, not just a coach's gut read.

---

### 3.7 AI Coach Assistant
**What it does:** The coach types or speaks a plain-English question about their squad. The AI reads the relevant athlete data in real time and responds in plain English — like having a data analyst available at any moment.

**Example queries the coach can ask:**
- *"Which of my athletes are at risk heading into Boys & Girls Champs?"*
- *"Marcus's throws haven't improved in 6 weeks. What does the data show?"*
- *"Who should I consider pulling back on volume this week?"*
- *"Which athletes are on track to hit their qualifying standards?"*

**What happens under the hood:** The question triggers an API call to an LLM (Claude) with the relevant programme data passed as context. No custom ML model to train — the AI reads actual numbers and responds in plain language.

**Why it matters:** This is the feature that separates a coaching intelligence platform from a tracking app. A coach managing 30 athletes cannot review every athlete's data every week. The AI assistant surfaces what matters without the coach having to dig for it.

---

### 3.8 Anomaly Detection Engine
**What it does:** Continuously scans athlete data for patterns that fall outside that athlete's normal range — patterns too subtle for manual review but significant enough to require coaching attention.

**Flags it generates:**
- Strength rising but throws flat for 4+ weeks → possible technique regression
- RPE trending low while performance also drops → possible disengagement
- Athlete logging streak broken after 3+ consistent weeks → churn/attendance risk
- Rapid performance jump followed by sharp RPE spike → overreach risk
- Consistent underperformance on test weeks vs. training marks → competition anxiety signal

**What the coach sees:** A notification and a flag on the athlete's profile: *"Something looks off with Kezia — her squat is up 10kg but her best throw this month is 30cm below her season peak."*

**Why it matters:** Pattern detection at scale. A coach cannot hold 30 athletes' trends in their head simultaneously. The anomaly engine does it continuously and only surfaces what needs attention.

---

### 3.9 Qualifying Standards Tracker
**What it does:** Coach enters the published qualifying standards for target competitions (Boys & Girls Champs, Carifta Games, World Junior Athletics Championships). For each athlete, the app calculates: current season best vs. standard, gap remaining, and whether the athlete's current trajectory reaches the standard by the qualifying deadline.

**What the coach sees:** A qualification dashboard showing every athlete in a colour-coded grid — green (on track), yellow (borderline, needs intervention), red (not currently tracking to qualify). Each athlete card shows their projected mark at the qualifying deadline and the gap to the standard.

**Why it matters:** The most important question in Jamaican track and field all season long is "who will qualify?" Every coach is currently answering this manually by checking spreadsheets against published standards. This feature answers it automatically and updates after every weekly result entry.

---

## 4. What Coaches and Athletes Experience

### Coach — Mobile App
Single download. Logs in as Coach. Sees:
- Squad overview: all athletes, current status, readiness indicators
- Who has logged this week (and who hasn't)
- RPE + wellness heatmap across the squad for the past 8 weeks
- Qualification dashboard — every athlete's status against their target standards
- Anomaly alerts — athletes flagged by the detection engine
- AI Assistant — type any question about the squad, get an answer from live data
- Individual athlete tap-through: full report, trajectory chart, correlation view, injury log
- Competition Day Mode — simplified meet view with competing athletes, events, and real-time result entry
- Coach Broadcast — send a one-way announcement to all athletes (push notification + in-app)
- Session Notes — attach text notes to any training session or athlete record
- Push notification when an athlete logs, when a PB is set, when a load or anomaly alert triggers

### Coach — Web Dashboard
Full-screen planning environment on laptop:
- Complete programme configuration (events, lifts, mesocycle settings, season calendar)
- 1RM Max Master — enter and update all athlete lift maxes
- Workout generator — generate and export individualized workout cards per athlete
- Deep analytics — all chart types, full projection views, correlation analysis, year-over-year comparison
- Qualifying standards configuration — enter target competition standards, view squad qualification status
- Season calendar — 52-week periodization with phase labels, meet schedule, and goal markers
- AI Assistant — same natural language interface available on web with full squad context
- Squad overview with sortable, filterable performance data

### Athlete — Mobile App (same app download, different route after login)
- Today's workout — exact exercises, weights, sets, reps, calculated automatically
- Check off sets as completed during training
- Weekly result logger — type naturally ("threw 14.3m, RPE 7") or use structured form
- Weekly wellness check-in — 3 quick sliders: sleep, soreness, energy (15 seconds)
- My progress chart — personal throw trajectory line, season best marker, season goal target line
- Qualification tracker — my current mark vs. my qualifying standard, projected mark at deadline
- PB notification and qualifying standard notification when marks are hit
- My profile — update personal info, view baseline vs. current, multi-season history

---

## 5. Configuration — Built for Any Coach, Any Discipline

The platform is not locked to throws. Every component is configurable per programme:

- **Events** — Coach defines their own event list (Shot Put, 100m, Long Jump, or any discipline)
- **Result type** — Distance (metres), time (seconds), height (metres) — set per event
- **Lift library** — Coach selects which exercises to track and prescribe
- **Mesocycle structure** — Coach sets intensity %, rep schemes, number of weeks per block
- **Season phases** — Coach names and dates their own periodization phases
- **Groups/teams** — Coach defines their own group structure
- **Custom metrics** — Coach adds any additional tracking fields specific to their programme

This means the platform can serve throws coaches, sprints coaches, jumps coaches, and eventually distance coaches — each running their own isolated programme with their own configuration.

---

## 6. Platform Architecture

### 6.1 Products
| Product | Platform | Who Uses It | Distribution |
|---|---|---|---|
| Mobile App | iOS + Android | Coach AND Athletes — one download | 1 listing: Google Play + Apple App Store |
| Web Dashboard | Browser | Coach — full planning on laptop | No install — browser only |

**One mobile app, two routes.** Same download for coach and athlete. Login determines the experience. Coach sees the coaching interface. Athlete sees the personal training interface. Neither can access the other's screens.

### 6.2 Backend
- **Mobile:** React Native (Expo) — single codebase for iOS, Android, Coach route, Athlete route
- **Web:** Next.js — coach planning dashboard
- **Database:** PostgreSQL via Supabase — cloud-hosted, scales to any number of programmes
- **Authentication:** Supabase Auth — email/password, role-based access (Coach / Athlete)
- **Notifications:** Expo Push Notifications
- **PDF Export:** react-pdf — workout card generation
- **Charts:** Recharts (web), Victory Native (mobile)
- **Projections:** simple-statistics (linear regression, confidence intervals)

### 6.3 Connectivity
Online-first. Gym WiFi and athlete data access confirmed. Offline mode is Phase 2.

### 6.4 Data
Text and numerical only. No video or images. Storage footprint is manageable at any scale.

### 6.5 Multi-Tenant
Every coaching programme is isolated. Athlete data from one programme is never visible to another. Each programme has its own configuration, its own data, and its own coach accounts. This is the commercial foundation.

---

## 7. Data Entry — Fully Self-Service

No pre-loading required. Coach Vassell — and every future coach — sets up their programme entirely within the app:

- Coach adds athletes through the in-app form
- Athletes sign up using a programme join code, complete their own profile on first login
- Coach enters 1RM maxes after test week directly in the Max Master screen
- Season dates, meet schedule, and periodization phases are configured in the app
- Everything updates live — no file management, no formula maintenance

---

## 8. Out of Scope — Phase 1

Phase 1 focuses on the core logging and prescription engine. The following are excluded from Phase 1 and targeted for later phases:

- Video or technique analysis (Phase 2+)
- GPS or wearable device integration (Phase 2+)
- Two-way in-app messaging/chat between coach and athlete (coach broadcast is Phase 2; full chat is not planned)
- Payment processing and subscription billing (Phase 2 commercial rollout)
- Offline mode (Phase 2)
- Distance/endurance-specific metrics — mileage, pace, heart rate zones (Phase 2)
- AI personalized training recommendations (Phase 4 — requires accumulated data to be meaningful)
- Multi-season history (Phase 4)
- Multi-language support (post-launch)

---

## 9. Commercial Potential

Every coach who currently manages athlete data in a spreadsheet is a potential customer. The platform is built from day one to support unlimited coaching programmes — each self-contained, each configurable, each paying a monthly subscription at the Club or Institution tier.

Coach Vassell's programme is Programme 001. Every coach he introduces is the next one. The platform scales without NexGen doing any additional custom work per coach.

---

*Document Version 1.3 — NexGen Optimize | July 24, 2026*
*Contact: lisaudoko@outlook.com | nexgenoptimize.com*
