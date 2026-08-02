# Throwers R Us App — Analytics, Data Visualization & Projections Module
**NexGen Optimize | July 24, 2026**

---

## Why This Matters Commercially

A spreadsheet can hold data. A table can display it. But a coach paying $49/month needs to see things a spreadsheet can never show:

- Is my athlete trending toward a peak at the right time?
- Which athletes are improving and which are stalling — at a glance?
- If this training block continues, where will this athlete be at nationals?

Charts, graphs, and projections are the features that make coaches feel like they have a professional system. They are a core reason someone pays for a subscription instead of staying on Excel. This module should be treated as a priority feature, not an add-on.

---

## Section 1: Coach Web Dashboard — Visual Displays

### 1.1 Squad Performance Chart
**Type:** Horizontal bar chart
**Where:** Squad Overview page
**What it shows:** Every athlete's current season best vs. their baseline, sorted by improvement % or absolute gain. At a glance the coach sees who is growing and who is stalling.

- Each bar = one athlete
- Two bars per athlete: baseline mark (grey) and season best (team color)
- Hover to see exact numbers
- Filter by team/group, gender, event

---

### 1.2 Individual Athlete Performance Timeline
**Type:** Line chart
**Where:** Individual Athlete Report page
**What it shows:** Throw distance week by week across the full season. The coach sees the trend: is this athlete on a steady climb, plateauing, or dropping heading into competition?

- X axis: Week 1 through current week
- Y axis: Distance in metres
- Dots for training results, different shape/color for meet/competition results
- Season phase bands shown behind the line (e.g., GPP phase shaded light grey, Competition phase shaded light blue)
- Dotted vertical line marking "current week"

---

### 1.3 Strength Progression Chart
**Type:** Multi-line chart
**Where:** Individual Athlete Report page (below throw chart)
**What it shows:** Key lift maxes over time — Squat, Bench, Clean shown as separate colored lines on the same chart.

- X axis: Date (or month)
- Y axis: Weight in lbs
- Lines plotted from test week to test week (not weekly — only updated when maxes are re-tested)
- Shows the relationship between strength gains and throw improvements

---

### 1.4 Training Load Chart
**Type:** Combination bar + line chart
**Where:** Individual Athlete Report and Squad Overview
**What it shows:** Planned vs. actual training load by week. Bars show volume (sets × reps), line shows RPE trend. A coach can immediately see if an athlete is under-recovering (high RPE, not dropping when it should).

- Left Y axis: Volume load
- Right Y axis: RPE (1–10)
- Threshold line at RPE 8 (coach-configurable) — anything above is highlighted red

---

### 1.5 Squad RPE Heatmap
**Type:** Grid / heatmap
**Where:** Coach Dashboard home page
**What it shows:** A grid where rows are athletes and columns are the last 8 weeks. Each cell is colored by that athlete's RPE that week — green (low), yellow (moderate), red (high). The coach sees fatigue patterns across the whole squad without reading a single number.

- Red cells = athlete may be overtraining or underprepared
- Missing cells = athlete did not log that week (shows accountability gap)
- Clicking any cell opens that athlete's weekly entry

---

### 1.6 Meet Performance Tracker
**Type:** Scatter plot
**Where:** Individual Athlete Report and Squad Overview
**What it shows:** Competition results (meet marks only) plotted across the season. Distinguishes training results from competition results to show how athletes perform under race/competition conditions vs. in practice.

- Training marks: small grey dots
- Competition marks: larger colored dots with meet name on hover
- Trend line drawn through competition marks only

---

### 1.7 Group Comparison Chart
**Type:** Box plot or grouped bar chart
**Where:** Coach Dashboard
**What it shows:** Performance distribution within each group (HS Juniors vs. HS Seniors vs. Club). Shows median performance, spread, and outliers per group. Helps the coach see if one group is underperforming relative to others.

---

## Section 2: Athlete Mobile App — Visual Displays

Athlete views should be simple and motivating — not data-heavy. One or two charts maximum per screen.

### 2.1 My Progress Chart
**Type:** Simple line chart
**Where:** Athlete home screen
**What it shows:** The athlete's throw distance over the current season. Simple, clean, personal. A dotted line shows their season best. The chart answers the question athletes ask themselves: "Am I getting better?"

- Only shows their own data
- Annotations for personal bests ("New PB 🎉")
- Season phase label visible at bottom (e.g., "You are in: SPP Phase")

---

### 2.2 My Strength Snapshot
**Type:** Gauge / progress bars
**Where:** Athlete profile screen
**What it shows:** Current 1RM for each key lift shown as a progress bar toward a coach-set target (if the coach has configured targets). Athletes see how close they are to their strength goals.

- Bar fills left to right: current max / target max
- Color: grey (below 70%), yellow (70–89%), green (90%+)

---

### 2.3 Weekly Effort Summary
**Type:** Simple stat cards
**Where:** Post-login home screen
**What it shows:** After the athlete logs their week, they see three numbers — their best throw this week, change from last week (+ or -), and their season best. Visual and instant.

---

## Section 3: Projections

Projections use the athlete's logged data to forecast where they are headed. This is the most powerful commercial feature — no spreadsheet can do this automatically.

---

### 3.1 Season Trajectory Projection
**Type:** Extended line chart with forecast zone
**Where:** Individual Athlete Report (Coach view and Athlete view)
**How it works:** The system calculates the athlete's average rate of improvement per week based on their last 4–8 weeks of data and extends it as a dotted projection line to the end of the season. A shaded band shows the high and low range.

- Solid line = actual results (past)
- Dotted line = projected trajectory (future)
- Shaded band = margin of error (based on variance in recent results)
- Vertical markers show key meet dates ahead
- At each meet marker, the projection shows: "Projected mark at this meet: 16.2m – 16.8m"

This tells the coach: *if training continues at the current rate, here is where this athlete will be at nationals.*

---

### 3.2 Peak Timing Indicator
**Type:** Visual timeline / indicator
**Where:** Individual Athlete Report and Squad Overview
**How it works:** The system tracks the athlete's RPE trend, training volume, and performance curve. Based on periodization phase and current data, it estimates when the athlete is likely to hit their peak performance window.

- Green zone: athlete is tracking to peak at the right time (competition phase)
- Yellow zone: athlete may peak early or late relative to key meets
- Red zone: athlete's data suggests they are under-fatigue (too fresh) or over-fatigued heading into competition

This gives the coach a warning signal before it's too late to adjust.

---

### 3.3 Strength-to-Performance Correlation
**Type:** Scatter plot with regression line
**Where:** Individual Athlete Report (Coach view only)
**How it works:** The system plots the athlete's squat/clean/bench maxes against their throw marks over the season and draws a correlation line. This shows whether strength gains are translating to throw improvements for that specific athlete.

- If the dots trend together upward: strength training is working for this athlete
- If strength is going up but throws are flat: technique may be the limiter
- Coach can see this quickly without running the analysis manually

---

### 3.4 Squad Readiness Dashboard
**Type:** Color-coded table with trend arrows
**Where:** Coach Dashboard home page
**How it works:** A one-screen summary of every athlete's readiness state heading into the next week. Each athlete gets a readiness score based on their last RPE, recent training load trend, and time since last competition. Color coded green / yellow / red.

- Green: athlete is fresh and progressing, train as planned
- Yellow: monitor — athlete may need load adjustment
- Red: consider reducing load this week

This is the "morning brief" for the coach — open the app, see the squad, know what to do.

---

### 3.5 Projected PB at Key Meet
**Type:** Stat card with projection
**Where:** Meet Schedule page, per athlete
**How it works:** For any upcoming meet on the schedule, the coach can see a projected mark for each athlete based on current trajectory. Clicking an athlete shows the confidence range (e.g., "Projected: 15.8m – 16.4m | Current season best: 15.6m").

This helps coaches know which athletes to prioritize for entry, which meets make sense for each athlete, and how to set expectations with parents and athletes.

---

## Section 4: Technical Implementation

### Libraries
**Web dashboard (React/Next.js):**
- **Recharts** — React-native chart library, clean and highly configurable. Handles line charts, bar charts, scatter plots.
- **D3.js** — For the heatmap and more complex custom visualizations.

**Mobile app (React Native/Expo):**
- **Victory Native** — React Native compatible chart library that mirrors Recharts API. Handles line charts, bar charts, gauges.

### Projection Math
Projections use linear regression over recent data points (configurable window — default last 6 weeks). The system calculates:

- Slope (rate of improvement per week)
- Variance (consistency of improvement)
- Projected value at any future date = current + (slope × weeks remaining)
- Confidence band = ± 1 standard deviation from the trend line

This is standard statistics and can be implemented in ~50 lines of JavaScript using a simple regression library (e.g., `simple-statistics` npm package).

---

## Section 5: Tier Availability

Not all visualization features need to be available on all tiers. This creates upgrade incentive.

| Feature | Free / Solo | Club Plan | Institution Plan |
|---|---|---|---|
| Individual athlete line chart | Yes | Yes | Yes |
| My Progress chart (mobile) | Yes | Yes | Yes |
| Squad RPE heatmap | No | Yes | Yes |
| Season trajectory projection | No | Yes | Yes |
| Peak timing indicator | No | Yes | Yes |
| Strength-to-performance correlation | No | No | Yes |
| Squad readiness dashboard | No | Yes | Yes |
| Projected PB at key meet | No | Yes | Yes |
| Data export (CSV/PDF) | No | Yes | Yes |

Free tier coaches see charts for individual athletes only. Squad-level analytics and projections are Club+ features. This gives coaches on the free tier a taste of the visual experience while making the paid tiers clearly more powerful.

---

## Section 6: Commercial Framing

When marketing the app to other coaches, the analytics layer is the headline:

**"Stop guessing. See where your athletes are heading."**

- See every athlete's trajectory toward the championship
- Know who is peaking at the right time before it's too late to adjust
- Prove your programme's results with data — season best gains, squad improvement %

A coach who can show parents, school administrators, or federation officials a dashboard showing measurable athlete improvement over a season has a powerful tool for their own credibility. That is a reason to pay monthly.

---

*Module prepared by NexGen Optimize | July 24, 2026*
*Internal document — not for client distribution*
