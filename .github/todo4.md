# To do 

## Bugs

- Table: `4:60` is not a valid time — pace formatting should roll over seconds correctly
- Age grade values become unreliable/noisy at short distances (e.g. 5k) — review whather the Howard Grubb data file provides smoother contours

## Scatter plot

- Pareto front — highlight the activities that are Pareto-optimal (fastest for their distance, or best age-grade for their distance)
- It should be possible to turn the WMA contour lines on or off for each plot
- Age grade contour behaviour review — follow up on outstanding question about contour rendering
- Move WMA label into the tile

## Series plot

- Scaling for time delta view
- Variable text size on the placeholder text (when no runs are rostered)

## Map

- Show elapsed time as `h:mm:ss` rather than `total minutes:seconds` format for activities more than 1 hour

## Settings / display

- Add dark mode

## Cumulative pace plot

- A new style of plot that shows the cumulative distribution function for pace - pace is shown on the x-axis (from slow to fast) and the y -axis shows the cumulative percentage below this pace
- A similar variant but slightly different is to show a plot with pace on the y-axis and distanace on the x-axis that shows the fastest contiguous block of data of that distance. For example if the value at 1km is 4:00 min/km, this would indicate that the fastest kilometre in the run was run in 4:00 minutes

## Longitudinal plotting

- how have my best 5k (or 10k, etc) times paces over time. I think the logic here is filter all runs so only runs longer than the specified distance are included (and I'd allow a 300 m leeway for events being short), then I'd use a rolling filter of X months (maybe 6 by default) and finding the fastest paced run in that window. I'd plot the pace of the run on the y-axis and the date on the x-axis

## Long-term ideas

- Optimum pacing model — if you ran optimally, how would your pace have differed? DO NOT IMPLEMENT THIS YET

