// listen for file upload...
//document.getElementById('fileinput').addEventListener('change', readUploadedFile);
document.getElementById('dataEditor').addEventListener('change', readDataEditor);

// make sure data editor resembles the current dataset
updateDataEditor();

function readUploadedFile(evt) {
    var f = evt.target.files[0]; 
    if (f) {
      var r = new FileReader();
      r.onload = function(e) { 

        var contents = e.target.result;
        var data = d3.csvParse(contents);
        console.log(data);

        
     }
      r.readAsText(f);
      
    } else { 
      alert("Failed to load file");
    }
}

function readDataEditor(){

    var user_data = d3.csvParse(document.getElementById('dataEditor').value);

    var parseDate = d3.timeParse("%Y-%m-%d");
    var validData = true;

    user_data.forEach(function(d, i){
        if (isNaN(d.miles)){ // will be true if d.miles is not a valid number
            document.querySelector(".dataEditorError").style.display = "block"; // show warning message
            validData = false; 
        }
    });

    if (validData){
        // hide warning message
        document.querySelector(".dataEditorError").style.display = "none";

        updateGraph(user_data)};
}

function updateDataEditor(){


    d3.csv("data/2022_mileage.csv", function(data){

        string = "date,miles";

        for (row=0; row<data.length; row++){

            string = string + "\n" + data[row].date + "," + Math.round(data[row].miles);
        }

        document.getElementById("dataEditor").value = string;
    });

}

function resetDataButton(){
    updateDataEditor();
    readDataEditor();
}

function updateGraph(data){

    if (screen.width < 600){ // mobile
        var numTicks = 3;
    }
    else{ // on larger device
        var numTicks = 8;
    }

    var label_freq = Math.floor(data.length / 14) + 1;
    // never label every point on mobile
    if (screen.width < 600 & label_freq == 1){
        label_freq = 2;
    }
    
    var parseDate = d3.timeParse("%Y-%m-%d");
    var total_miles = 0;

    data.forEach(function(d, i){
        // parse strings into date object or numbers
        d.date = parseDate(d.date);
        d.miles = +d.miles;

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
        d.pace = (document.getElementById("slider").value / 365) * day_of_year;
    });

    // update ranges
    y.domain([0,d3.max([data[data.length-1].mileage, data[data.length-1].pace])]);
    x.domain(d3.extent(data, function(d) { return d.date; }));

    // add axes
    var xAxis = d3.axisBottom(x).ticks(numTicks).tickFormat(d3.timeFormat("%b %d"));
    d3.select("#x_axis").call(xAxis);
    d3.select("#y_axis").call(d3.axisLeft(y));
    
    // compute line function
    mileageLine.y(function(d) { return y(d.mileage); });
    d3.select(".mileage_line").data([data]).transition().attr("d", mileageLine);

    // move pace line
    document.getElementById("pace_line").y2.baseVal.value = y(data[data.length-1].pace);

    svg.selectAll(".dot").remove();
    svg.selectAll(".label").remove();

    // for dot hover interactivity
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

    // draw dots
    svg.selectAll(".dot")
        .data(data)
        .enter()
        .append("circle") 
        .attr("class", "dot") 
        .attr("cx", function(d) {return x(d.date)})
        .attr("cy", function(d) {return y(d.mileage)})
        .style("r", function(d) {return r(d.miles)})
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

    function getTextBox(selection) {

        d3.selectAll("#labelBackground").remove();

        selection.each(function() { 
            
            bbox = this.getBBox(); 

            svg.append("rect")
            .attr("id", "labelBackground")
            .attr("x", bbox.x)
            .attr("y", bbox.y)
            .attr("width", bbox.width)
            .attr("height", Math.max(0, bbox.height - 5)) // returns a slightly shorter-than text box (or 0 if there isn't a label)
            .style("fill", "whitesmoke");
        });

        selection.raise();

        // annotations node too
        d3.select(".annotation").raise();
    };

    ///////////////////////// code for text annotations ///////////////////////////////////////////////////////

    // measure diff between actual mileage and pace mileage
    var paceEval = Math.abs(data[data.length-1].mileage - data[data.length-1].pace);
    var aheadBehind = (data[data.length-1].mileage > data[data.length-1].pace) ? "ahead of" : "behind";

    // measure how many miles I'm on pace to run by year's end
    // # of miles so far / # of days so far * 365
    var onTrackFor = data[data.length-1].mileage / data.length * 365;

    // "ZZ miles this year"
    d3.select("#milesThisYearText").text(d3.format(",")(data[data.length-1].mileage.toFixed(0)) + ' miles this year'); 

    // "YY miles ahead/behind pace"
    d3.select("#paceEvalText").text(paceEval.toFixed(0) + " miles " + aheadBehind + " goal pace"); 

    // "On pace to run Y,YYY miles"
    d3.select("#onPaceForText").text("On track to run " + d3.format(",")(onTrackFor.toFixed()) + " miles this year");

    ///////////////////////////////////////////////////////////////////////////////////////////////////

    // update slider function
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
            d.pace = (newGoal / 365) * d.day_of_year;
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
        svg.selectAll(".dot").transition().attr("cy", function(d) {return y(d.mileage)})

        // update pace eval text
        paceEval = Math.abs(data[data.length-1].mileage - newGoalPaceToday);
        aheadBehind = (data[data.length-1].mileage > newGoalPaceToday) ? "ahead of" : "behind";
        d3.select("#paceEvalText").text(paceEval.toFixed(0) + " miles " + aheadBehind + " goal pace");
    }
}