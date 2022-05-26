# mileage-analysis

Data comes from Strava (https://support.strava.com/hc/en-us/articles/216918437-Exporting-your-Data-and-Bulk-Export#Bulk). Strava will send you a link to download your data, which we are primarily interested in the 'activities.csv' file.

## Notebook

strava_mileage_analysis.ipynb -- reads activities.csv as provided by Strava. Cleans the data; inputs dates without runs; conducts basic analysis of mileage over years, months, weeks, etc; creates some basic charts.

# mileage-growth-prototype

A mockup using my 2020 mileage to prototype a cumulative mileage lineplot. This folder contains the files necessary for creating an interactive D3.js chart comparing how one's annual cumulative mile vs a dashed line showing pace towards a specified annual goal. For example, periods in which the orange cumulative mileage line is above the dashed line indicates the runner is 'ahead of pace' towards meeting their annual mileage goal; periods in which the cumulative mileage line is below the dashed line means the runner is behind their goal pace. 

# mileage-goal

The code behind https://cultureplot.com/mileage-goal/