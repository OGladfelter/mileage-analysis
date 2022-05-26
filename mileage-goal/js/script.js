// parameters
const file_name = "data/2021_mileage.csv"; // name of data csv
const annual_mileage_goal = 1400; // how many miles I want(ed) to run in this(past) year

// set the dimensions and margins of the graph on mobile
if (screen.width < 600){
    // dimensions
    var height = window.innerHeight * .9;
    var width = window.innerWidth * .95;
    var margin = {top: 50, right: 25, bottom: 50, left: 30};
    var width = width - margin.left - margin.right;
    var height = height - margin.top - margin.bottom;

    var numTicks = 3;
}
else{ // on larger device
    // dimensions
    var height = window.innerHeight * .9;
    var width = window.innerWidth * .9;
    var margin = {top: 50, right: 50, bottom: 50, left: 50};
    var width = width - margin.left - margin.right;
    var height = height - margin.top - margin.bottom;

    var numTicks = 8;
}


d3.csv(file_name, function(data) {
    
    // control how many labels are shown: lower number = more labels. Ex: 2 = label every other day, 10 = every other 10 days
    // we want to show every other (# of weeks / 2) 
    var label_freq = Math.floor(data.length / 14) + 1;

    // never label every point on mobile
    if (screen.width < 600 & label_freq == 1){
        label_freq = 2;
    }

    var parseDate = d3.timeParse("%Y-%m-%d");

    var total_miles = 0;

    data.forEach(function(d, i){
        
        // miles into int
        d.miles = +d.miles;

        // parse strings into date object or numbers
        d.date = parseDate(d.date);

        // for given date, calc what day it is in the year. 1st day? 50th day? etc.
        var start = new Date(d.date.getFullYear(), 0, 0);
        var diff = d.date - start;
        var oneDay = 1000 * 60 * 60 * 24;
        day_of_year = Math.floor(diff / oneDay);
        d.day_of_year = day_of_year;

        // compute how many miles have been run cumulatively, save to each row
        total_miles = total_miles + d.miles;
        d.mileage = total_miles;

        // calc pace column. This is how many miles I should have run to be "on track"
        d.pace = (annual_mileage_goal / 365) * day_of_year;
    });

    svg = d3.select('#viz').append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // get max values of mileage and pace columns.
    // if I'm ahead of pace, my mileage will exceed pace. And vice versa. 
    // regardless, the higher value should cap the y-axis
    const maxMileage = d3.max(data, d => d.mileage);
    const maxPace = d3.max(data, d => d.pace);

    // set the ranges
    x = d3.scaleTime().range([0, width]).domain(d3.extent(data, function(d) { return d.date; }));
    y = d3.scaleLinear().range([height, 0]).domain([0,d3.max([maxMileage, maxPace])]);

    // add axes
    var xAxis = d3.axisBottom(x).ticks(numTicks).tickFormat(d3.timeFormat("%b %d"));

    svg.append("g")
            .attr("class", "axis")
            .attr("id", "x_axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

    //  Add the Y Axis
    yAxis = svg.append("g").attr("class", "axis").attr("id", "y_axis").call(d3.axisLeft(y));

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 0 - margin.left)
      .attr("x",0 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .style("fill", "#222")
      .attr("class", "yAxisLabel")
      .text("Cumulative Mileage"); 

    // compute line function
    mileageLine = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.mileage);  })
        .curve(d3.curveMonotoneX);

    // draw mileage line
    svg.append("path")
        .data([data]) 
        .attr("class", "mileage_line")  
        .attr("d", mileageLine); 

    // draw straight line from first pace and date to final pace and date
    svg.append('line')
        .attr("class", "pace_line")
        .attr("id", "pace_line")
        .attr("x1", x(data[0].date))
        .attr("y1", y(data[0].pace))
        .attr("x2", x(data[data.length-1].date))
        .attr("y2", y(data[data.length-1].pace));

    // draw dots
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle") 
        .attr("class", "dot") 
        .attr("cx", function(d) {return x(d.date)})
        .attr("cy", function(d) {return y(d.mileage)})
        .style("r", function(d){if (d.miles >= 20){return 20} else{return d.miles}})
        .on("mouseover", pointMouseover)
        .on("mouseout", pointMouseout);  

    // draw labels
    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text") // Uses the enter().append() method
        .attr("class", "label") // Assign a class for styling
        .attr("x", function(d) { return x(d.date) })
        .attr("y", function(d) { return y(d.mileage) })
        .attr("dy", "-20")
        .text(function(d, i) {
            if (i > 0){
                // label every other (label_freq) days
                if (i % label_freq == 0){
                    return d.mileage.toFixed(0);    
                } 
                else{ return "" }
            }
            else{
                // no label needed for Jan 1st, when I didn't run
                return "";
            }
        })
        .call(getTextBox);
    
    // draw rectangle on top of text label; called on every text label;
    function getTextBox(selection) {

        d3.selectAll("#labelBackground").remove();

        // for each element in the selection...
        selection.each(function() { 
            
            var bbox = this.getBBox(); // get the bounding box

            svg.append("rect")
            .attr("id", "labelBackground")
            .attr("x", bbox.x)
            .attr("y", bbox.y)
            .attr("width", bbox.width)
            .attr("height", Math.max(0, bbox.height - 5)) // returns a slightly shorter-than text box (or 0 if there isn't a label)
            .style("fill", "whitesmoke");
        });

        // rect is drawn on top of label. Pull label above rect.
        selection.raise();

        // annotations node too
        d3.select(".annotation").raise();
    };

    // adding intersection lines
    svg.append("line")
        .attr("class","hoverLineHorizontal")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", y(0))
        .attr("y2", y(0))
        .style("visibility","hidden");
    svg.append("line")
        .attr("class","hoverLineVerical")
        .attr("x1", x(0))
        .attr("x2", x(0))
        .attr("y1", y(0))
        .attr("y2", y(0))
        .attr("visibility","hidden");

    ///////////////////////// code for annotations box ///////////////////////////////////////////////////////

    // annotations box can be dragged
    function dragged(event, d) {d3.select(this).attr("transform", "translate(" + (d3.event.x) + "," + (d3.event.y) + ")");}

    // measure diff between actual mileage and pace mileage
    var paceEval = Math.abs(data[data.length-1].mileage - data[data.length-1].pace);
    var aheadBehind = (data[data.length-1].mileage > data[data.length-1].pace) ? "ahead of" : "behind";

    // measure how many miles I'm on pace to run by year's end
    // # of miles so far / # of days so far * 365
    var onTrackFor = data[data.length-1].mileage / data.length * 365;
  
    // create annotations node
    annotations = svg
        .append("g")
        .attr("class", "annotation")
        .call(d3.drag().on("drag", dragged));
    
    // add rectangle
    annotations.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        // we will determine width and height programatically after adding text
       
    // "ZZ miles this year" text
    annotations.append("text")
        .attr("id", "milesThisYearText")
        .attr("x", 10)
        .attr("y", 10)
        .style("dominant-baseline", "hanging")
        .html(d3.format(",")(data[data.length-1].mileage.toFixed(0)) + ' miles this year');
    
    // "YY miles ahead/behind pace" text
    annotations.append("text")
        .attr("id", "paceEvalText")
        .attr("x", 10)
        .attr("y", 32)
        .style("dominant-baseline", "hanging")
        .html(paceEval.toFixed(0) + " miles " + aheadBehind + " goal pace");
    
    // "On pace to run Y,YYY miles" text
    annotations.append("text")
        .attr("id", "onPaceForText")
        .attr("x", 10)
        .attr("y", 54)
        .style("dominant-baseline", "hanging")
        .html("On track to run " + d3.format(",")(onTrackFor.toFixed()) + " miles this year");

    // use bounding boxes on first and last text lines to determine rectangle dimensions
    var bbox1 = document.getElementById("milesThisYearText").getBBox();
    var bbox2 = document.getElementById("onPaceForText").getBBox();

    var annotationsWidth = bbox2.width + 25;
    var annotationsHeight = bbox2.y + bbox2.height - bbox1.y + 15;

    annotations.select("rect").attr("width", annotationsWidth).attr("height", annotationsHeight);

    // move annotations box to bottom right corner of graph (with some breathing room)
    annotations.attr("transform", "translate(" + (x(data[data.length-1].date) - annotationsWidth - 50) + "," + (y(0) - annotationsHeight - 50) + ")");

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //////////////////////////// slider to change mileage goal /////////////////////////////////////////////////////////

    if (screen.width > 600){
        // figure out where slider div is on page so we can move it to (0,0) 
        var sliderDivBBox = document.getElementById("sliderDiv").getBoundingClientRect();
        var sliderDiv_x_offset = sliderDivBBox.left + window.scrollX;
        var sliderDiv_y_offset = sliderDivBBox.top + window.scrollY;

        // get positions for top of y_axis (closest point to top left of graph)
        var yAxisBBox = document.getElementById("y_axis").getBoundingClientRect();
        var yAxisLeftPoint = yAxisBBox.left + window.scrollX;
        var yAxisTopPoint = yAxisBBox.top + window.scrollY;

        // move slider div from bottom of page to top left of graph (with 5% height and weight margins for breathing room)
        // first by translating to 0,0 position on page, then to bottom right of y-axis top point
        document.getElementById("sliderDiv").style.transform = "translate(" + (-sliderDiv_x_offset + yAxisLeftPoint + (width * .05)) + "px," + (-sliderDiv_y_offset + yAxisTopPoint + (height * .05)) + "px)";
    }

    var slider = document.getElementById("slider");
    slider.value = annual_mileage_goal; // sets slider value to match parameter set at top of this file
    var sliderLabel = document.getElementById("sliderLabel");
    sliderLabel.innerHTML = d3.format(",")(slider.value);

    const min = slider.min
    const max = slider.max
    const value = slider.value

    // everything up to cursor is orange, and gray on other side
    slider.style.background = `linear-gradient(to right, #ffab00, #ffab00 ${(value-min)/(max-min)*100}%, #c6c6c6 ${(value-min)/(max-min)*100}%, #c6c6c6 100%)`

    // slider change function
    slider.oninput = function(){

        // everything up to cursor is orange, and gray on other side
        this.style.background = `linear-gradient(to right, #ffab00, #ffab00 ${(this.value-this.min)/(this.max-this.min)*100}%, #c6c6c6 ${(this.value-this.min)/(this.max-this.min)*100}%, #c6c6c6 100%)`

        // update title
        //document.getElementById("title").innerHTML = "The Path To " + d3.format(",")(slider.value) + " Miles In 2021";

        // update slider label
        sliderLabel.innerHTML = d3.format(",")(slider.value);

        // update line 
        updateGoal(slider.value);
    };

    function updateGoal(newGoal){

        // recompute and overwrite pace column
        data.forEach(function(d, i){
            d.pace = (newGoal / 365) * (d.day_of_year);
        });

        var newGoalPaceToday = data[data.length-1].pace;

        // update y axis
        y.domain([0,d3.max([data[data.length-1].mileage, newGoalPaceToday])]);
        yAxis.call(d3.axisLeft(y));

        // move pace line
        document.getElementById("pace_line").y2.baseVal.value = y(newGoalPaceToday);

        // update mileage line
        mileageLine.y(function(d) { return y(d.mileage); });
        d3.select(".mileage_line").transition().attr("d", mileageLine); 

        // move labels to stay with line
        svg.selectAll(".label").attr("y", function(d) { return y(d.mileage) }).call(getTextBox);

        // move dots to stay with line
        svg.selectAll(".dot").transition().attr("cy", function(d) {return y(d.mileage)});

        // update pace eval text
        paceEval = Math.abs(data[data.length-1].mileage - newGoalPaceToday);
        aheadBehind = (data[data.length-1].mileage > newGoalPaceToday) ? "ahead of" : "behind";
        d3.select("#paceEvalText").text(paceEval.toFixed(0) + " miles " + aheadBehind + " goal pace");
    }
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////

    //////////////////// tool tip and mouse over code ///////////////////////////////////////////////////////////

    // use this in the tooltip
    dateToString = d3.timeFormat("%b %d")

    // add tooltip
    tooltip = d3.select("#viz")
      .append("div")
      .style('visibility', 'hidden')
      .attr('class', 'tooltip')
      .style("pointer-events", "none");

    function pointMouseover(d){

        // info for tooltip
        var paceEval = Math.abs(d.mileage - d.pace).toFixed(0);
        var aheadBehind = (d.mileage > d.pace) ? " ahead of" : " behind";

        // move tooltip
        tooltip
            .style("visibility", "visible")
            .html("<b>" + dateToString(d.date) + "</b>: " + d.miles.toFixed(0) + " Miles<br>Year to Date: " + d.mileage.toFixed(0) + "<br>" + paceEval +  aheadBehind + " pace")
            .transition().duration(250)
            .style("left", function(){

                // if mouse is on left 80% of screen, show tooltip to right of cursor
                if (d3.event.pageX / window.innerWidth < .8){
                    return d3.event.pageX + 10 + "px"  
                }
                else{ // show tooltip to left of cursor
                    return d3.event.pageX - document.querySelector('.tooltip').offsetWidth - 10 + "px" 
                }
            }) 
            .style("top", d3.event.pageY + 10 + "px"); 

        // update intersection lines
        d3.select(".hoverLineHorizontal")
        .attr("x1", x(d3.select(this).datum().date))
        .attr("x2", x(d3.select(this).datum().date))
        .attr("y1", y(0))
        .attr("y2", y(d3.select(this).datum().mileage))
        .style("visibility","visible");

        d3.select(".hoverLineVerical")
        .attr("x1", 0)
        .attr("x2", x(d3.select(this).datum().date))
        .attr("y1", y(d3.select(this).datum().mileage))
        .attr("y2", y(d3.select(this).datum().mileage))
        .style("visibility","visible");
    }

    function pointMouseout(){
    
        // hide tooltip
        tooltip.style("visibility", "hidden");

        // hide intersection lines
        d3.select(".hoverLineHorizontal").style("visibility","hidden");
        d3.select(".hoverLineVerical").style("visibility","hidden");
    }
    

    //////////////////////////////////////////////////////////////////////////////////////////////////////////

    //////////////// fun and random design things (pulsing circles, etc) ///////////////

    // call on page load
    function pulse() {
        d3.selectAll("circle").transition()
            .duration(2000)
            .style("opacity", "1")
            .attr("stroke-width", 2)
            .attr("r", 20)
            .transition()
            .duration(2000)
            .style("opacity", "0")
            .attr('stroke-width', 1)
            .attr("r", 10);
    }

    // call when user clicks 'YY miles this year' text
    function pulseOnMaxMileage() {
        var circle = d3.selectAll("circle").filter(function(d) { return d.date == data[data.length-1].date })
            .transition()
            .duration(2000)
            .style("opacity", "1")
            .attr("stroke-width", 2)
            .attr("r", 20)
            .transition()
            .duration(2000)
            .style("opacity", "0")
            .attr('stroke-width', 1)
            .attr("r", 5);
    }

    //////////////////////////////////////////////////////////////////////////////////////////////////////////////////

});

