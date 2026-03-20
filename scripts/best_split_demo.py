"""
Best split curve demo.

Simulates a 3 km run with the pace profile:
  km 0–1 :  4 min/km
  km 1–2 : 12 min/km
  km 2–3 :  4 min/km

Implements the same algorithm as lib/analysis/bestSplit.ts to produce a
best-split curve (fastest average pace over every possible window distance),
then plots it together with the instantaneous pace profile.
"""

import math
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker
import numpy as np

# ---------------------------------------------------------------------------
# 1. Build the synthetic GPS stream (distance in metres, time in seconds)
# ---------------------------------------------------------------------------

STEP = 10  # metres between stream samples

SEGMENTS = [
    (1_000, 4 * 60),   # 1 km at 4 min/km → 240 s/km
    (1_000, 12 * 60),  # 1 km at 12 min/km → 720 s/km
    (1_000, 4 * 60),   # 1 km at 4 min/km → 240 s/km
]

distances = [0.0]
times = [0.0]

for seg_len, pace_s_per_km in SEGMENTS:
    pace_s_per_m = pace_s_per_km / 1_000
    n_steps = seg_len // STEP
    for _ in range(n_steps):
        distances.append(distances[-1] + STEP)
        times.append(times[-1] + STEP * pace_s_per_m)

distances = np.array(distances, dtype=float)
times = np.array(times, dtype=float)


# ---------------------------------------------------------------------------
# 2. Best split curve — faithful port of computeBestSplitCurve in TypeScript
# ---------------------------------------------------------------------------

def compute_best_split_curve(distance, time):
    """
    For each window size w (sampled at stream resolution, capped to 500 sizes),
    find the minimum average pace (s/km) over any contiguous block of w metres.
    Returns (window_distances, best_paces) both in metres / s per km.
    """
    n = len(distance)
    if n < 2 or distance[-1] - distance[0] < 1:
        return [], []

    total_dist = distance[-1] - distance[0]

    # Sample window sizes at stream resolution, capped to 500 samples
    step = max(1, math.floor(n / 500))
    window_sizes = []
    for i in range(step, n, step):
        w = distance[i] - distance[0]
        if 1 <= w <= total_dist:
            window_sizes.append(w)
    if not window_sizes or window_sizes[-1] != total_dist:
        window_sizes.append(total_dist)

    result_dist = []
    result_pace = []  # s/km

    for w in window_sizes:
        best_time = math.inf
        left = 0
        for right in range(1, n):
            # Advance left while the window still covers more than w
            while left < right - 1 and distance[right] - distance[left + 1] >= w:
                left += 1
            window_dist = distance[right] - distance[left]
            if window_dist < w:
                continue
            # Interpolate to exact window size
            window_time = time[right] - time[left]
            ratio = w / window_dist
            exact_time = window_time * ratio
            if exact_time < best_time:
                best_time = exact_time

        if math.isfinite(best_time) and best_time > 0:
            result_dist.append(w)
            result_pace.append((best_time / w) * 1_000)  # s/km

    return np.array(result_dist), np.array(result_pace)


window_dist, best_pace = compute_best_split_curve(distances, times)


# ---------------------------------------------------------------------------
# 3. Helpers
# ---------------------------------------------------------------------------

def fmt_pace(seconds_per_km):
    """Format a pace value (s/km) as 'M:SS'."""
    m = int(seconds_per_km // 60)
    s = int(round(seconds_per_km % 60))
    if s == 60:
        m += 1
        s = 0
    return f"{m}:{s:02d}"

def pace_formatter(val, _pos):
    return fmt_pace(val)


# ---------------------------------------------------------------------------
# 4. Plot
# ---------------------------------------------------------------------------

fig, (ax_pace, ax_best) = plt.subplots(
    2, 1,
    figsize=(9, 7),
    sharex=True,
    gridspec_kw={"height_ratios": [1, 2]},
)
fig.suptitle("Best Split Curve — synthetic 3 km run", fontsize=14, fontweight="bold")

# --- Top panel: instantaneous pace profile ---
seg_d = [0]
seg_p = []
for seg_len, pace in SEGMENTS:
    seg_p.extend([pace, pace])
    seg_d.extend([seg_d[-1], seg_d[-1] + seg_len])

ax_pace.step(
    np.array(seg_d) / 1_000,   # convert to km for x-axis
    [seg_p[0]] + seg_p,        # staircase
    where="post",
    color="#4c78a8",
    linewidth=2,
)
ax_pace.fill_between(
    np.array(seg_d) / 1_000,
    [seg_p[0]] + seg_p,
    step="post",
    alpha=0.15,
    color="#4c78a8",
)
ax_pace.set_ylabel("Pace", fontsize=11)
ax_pace.yaxis.set_major_formatter(ticker.FuncFormatter(pace_formatter))
ax_pace.yaxis.set_major_locator(ticker.MultipleLocator(120))  # every 2 min
ax_pace.set_ylim(0, 800)
ax_pace.invert_yaxis()   # faster (lower s/km) at the top
ax_pace.set_title("Instantaneous pace", fontsize=10, pad=4)
ax_pace.grid(axis="y", linestyle="--", alpha=0.4)

# --- Bottom panel: best split curve ---
ax_best.plot(
    window_dist / 1_000,
    best_pace,
    color="#e45756",
    linewidth=2.5,
    label="Best-split curve",
)

# Annotate the three canonical distances
for km, label in [(1, "1 km"), (2, "2 km"), (3, "3 km")]:
    idx = np.searchsorted(window_dist, km * 1_000, side="left")
    idx = min(idx, len(window_dist) - 1)
    x = window_dist[idx] / 1_000
    y = best_pace[idx]
    ax_best.scatter([x], [y], color="#e45756", zorder=5, s=60)
    ax_best.annotate(
        f"{label}\n{fmt_pace(y)} /km",
        xy=(x, y),
        xytext=(x + 0.05, y - 10),
        fontsize=8.5,
        ha="left",
        va="top",
        color="#333333",
    )

ax_best.set_xlabel("Window distance (km)", fontsize=11)
ax_best.set_ylabel("Best pace", fontsize=11)
ax_best.yaxis.set_major_formatter(ticker.FuncFormatter(pace_formatter))
ax_best.yaxis.set_major_locator(ticker.MultipleLocator(60))  # every 1 min
ax_best.set_xlim(0, 3.1)
ax_best.invert_yaxis()   # faster (lower s/km) at the top
ax_best.set_title("Best split curve (fastest average pace over each window size)", fontsize=10, pad=4)
ax_best.grid(axis="both", linestyle="--", alpha=0.4)
ax_best.legend(fontsize=9)

plt.tight_layout()
plt.savefig("scripts/best_split_demo.png", dpi=150, bbox_inches="tight")
print("Saved scripts/best_split_demo.png")
plt.show()


# ---------------------------------------------------------------------------
# 5. Print a summary table
# ---------------------------------------------------------------------------
print("\nBest split summary:")
print(f"  {'Window':>8}  {'Best pace':>10}")
print(f"  {'-'*8}  {'-'*10}")
for km in [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]:
    idx = np.searchsorted(window_dist, km * 1_000, side="left")
    idx = min(idx, len(window_dist) - 1)
    print(f"  {km:>6.1f} km  {fmt_pace(best_pace[idx]):>8} /km")
