// parameters
const file_name = "2020_mileage.csv"; // name of data csv
const annual_mileage_goal = 1200; // how many miles I want(ed) to run in this(past) year
const label_freq = 20; // lower number = more labels. For example, 2 = show every other day. 10 = show every other 10 days.

// dimensions
var height = window.innerHeight * .9;
var width = window.innerWidth * .9;
var margin = {top: 50, right: 50, bottom: 50, left: 50};

var width = width - margin.left - margin.right;
var height = height - margin.top - margin.bottom;

d3.csv(file_name, function(data) {
    
    var parseDate = d3.timeParse("%Y-%m-%d");

    var total_miles = 0;

    data.forEach(function(d, i){
        // parse strings into date object or numbers
        d.date = parseDate(d.date);
        d.miles = +d.miles;
        
        // compute how many miles have been run cumulatively, save to each row
        total_miles = total_miles + d.miles;
        d.mileage = total_miles;

        // calc pace column. This is how many miles I should have run to be "on track"
        d.pace = (annual_mileage_goal / 365) * (i+1)
    })

    var svg = d3.select('body').append("svg")
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
    var x = d3.scaleTime().range([0, width]).domain(d3.extent(data, function(d) { return d.date; }));
    var y = d3.scaleLinear().range([height, 0]).domain([0,d3.max([maxMileage, maxPace])]);

    // add axes
    var xAxis = d3.axisBottom(x).tickFormat(d3.timeFormat("%b-%d"));

    svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")")
            .call(xAxis);

    //  Add the Y Axis
    svg.append("g").call(d3.axisLeft(y));

    // compute line function
    var mileageLine = d3.line()
        .x(function(d) { return x(d.date); })
        .y(function(d) { return y(d.mileage);  })
        .curve(d3.curveMonotoneX);

    // draw straight line from first pace and date to final pace and date
    svg.append('line')
        .attr("class", "pace_line")
        .attr("x1", x(data[0].date))
        .attr("y1", y(data[0].pace))
        .attr("x2", x(data[data.length-1].date))
        .attr("y2", y(data[data.length-1].pace));

    // draw mileage line
    svg.append("path")
        .data([data]) 
        .attr("class", "mileage_line")  
        .attr("d", mileageLine); 

    // draw dots
    // svg.selectAll(".dot")
    //     .data(data)
    //     .enter()
    //     .append("circle") // Uses the enter().append() method
    //     .attr("class", "dot") // Assign a class for styling
    //     .attr("cx", function(d) { return x(d.date) })
    //     .attr("cy", function(d) { return y(d.mileage) })
    //     .attr("r", 5);  

    // draw labels
    svg.selectAll(".text")
        .data(data)
        .enter()
        .append("text") // Uses the enter().append() method
        .attr("class", "label") // Assign a class for styling
        .attr("x", function(d, i) { return x(d.date) })
        .attr("y", function(d) { return y(d.mileage) })
        .attr("dx", "-5")
        .attr("dy", "-10")
        .text(function(d, i) {
            if (i > 0){
                if (i % label_freq == 0){
                    return d.mileage.toFixed(0);    
                } 
                else{ return "" }
            }
            else{
                return d.mileage.toFixed(0);
            }
        });

    // chart title
    // svg.append('text')                                     
    //       .attr('x', 10)              
    //       .attr('y', -5)             
    //       .text('2021 Total Mileage'); 

});