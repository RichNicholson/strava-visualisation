# Layouts
The layout is specified by a collection of tabs - it should be possible to save, load, modify, delete and rename layouts.
The current UI for adding and deleting tabs is a bit ugly - the delete button is a permanently on orange blob on the right hand side of the tab name. Maybe a nicer UI would be to show a delete icon on mouse over in the same way the preset filter delete works
It should be possible to rename tabs
When displaying a tab in Single mode, the Scatter/Tables/Series/Map/Trend selectors are shown in a different place (above the tile) than they are for the Double/Quad selectors (integrated with the tile). I would like this to be consistent with the Double/Quad approach 
When adding or deleting tabs the naming can sometimes go wrong - I have created a tab labelled Tab2 when another tab with this label already exists. I would like the tab name to default to the next lowest integer of all the existing tabs - so in my example, Tab3

# Scatter
When avg elapsed pace is shown, the filter for pace does not work - it includes all runs. This should work for both avg moving pace and avg elapsed pace.
It should be possible to toggle the Pareto highlighting on and off

# Series
The WMA checkboxes are a bit clunky - I prefer the WMA button approach used in the Scatter plot
Changing the series y-axis channel is a bit awkward - you need to click on the channel, then click on the channel again in the dialog that pops up. Then after changing the options in the dialog you need to click on the original channel button you clicked. Additionally, clicking the best split or Pace CDF buttons hides the rest of the data selection UI, which is confusing. I'm not quite sure what the right approach is, but it needs to retain all the existing functionality but aim to make it clearer to the user what the behaviour is and reduce the number of clicks required and remove non-obvious behaviour, like clicking on a specific button to close the dialog.
There is inconsistent capitalisation on "best split" and "Pace CDF" buttons

# Best split 
I don't think the best split calculation is working correctly - for every x value it should take the value (let's say it is x = 1k) and work out the fastest x value split and use this to calculate the pace

# Trend
The orange dots that are on the trend line should be bigger - at least the same size as the grey ones
The dots that are not on the line but define some of the points on it should also be marked orange

# Dark Mode
The pareto front indicators on dark mode do not work correctly