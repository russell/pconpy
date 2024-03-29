
// IE support for indexof
if (!Array.prototype.indexOf) {
   Array.prototype.indexOf = function(item) {
      var i = this.length;
      while (i--) {
         if (this[i] === item) return i;
      }
      return -1;
   };
}


toggleColor = function(selector, color) {
    return function() {
        if ($(this).data("disabled") == true){
            $(this).data("disabled", false);
            fill = color;
        } else {
            $(this).data("disabled", true);
            fill = "black";
        }
        $(this).toggleClass("active");
        d3.selectAll(selector).transition().duration(500).delay(0).style("fill", fill);
    };
};

contactMap = function (){
    var margin = {top: 10, right: 0, bottom: 80, left: 80},
        width = 720,
        height = 720;

    var legend = {"H": "A-helix", "B": "Isolated B-bridge",
                  "E": "B-strand", "G": "3/10-helix",
                  "I": "Pi-helix", "T": "Turn",
                  "S": "Bend", "C": "Coil"};

    var x = d3.scale.ordinal().rangeBands([0, width]),
        c = d3.scale.category10().domain(Object.keys(legend));

    var svg = d3.select("#graph").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var sidebar = d3.select("#legend");
    btn = sidebar.append("button")
        .attr("class", "btn btn-block disabled")
        .attr("type", "button")
        .text("No Bond")
        .append("svg")
        .attr("width", 14)
        .attr("height", 14)
        .append("svg:rect")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", "1")
        .attr("x", 1)
        .attr("y", 1)
        .attr("width", 12)
        .attr("height", 12);

    btn = sidebar.append("button")
        .attr("class", "btn btn-block disabled")
        .attr("type", "button")
        .text("Hydrogen Bond")
        .append("svg")
        .attr("width", 14)
        .attr("height", 14)
        .append("svg:circle")
        .attr("fill", "none")
        .attr("stroke", "black")
        .attr("stroke-width", "1")
        .attr("cx", 7)
        .attr("cy", 7)
        .attr("r", 6);

    sidebar.append("hr");

    for (var key in legend) {
        btn = sidebar.append("button")
            .attr("class", "btn btn-block active")
            .attr("type", "button")
            .attr("value", key)
            .text(legend[key])
            .on("click", toggleColor(".structure-" + key, c(key)))
            .append("svg")
            .attr("width", 14)
            .attr("height", 14)
            .append("svg:rect")
            .attr("fill", c(key))
            .attr("width", 14)
            .attr("height", 14);
    }

    svg.append("rect")
        .attr("class", "background")
        .attr("width", width)
        .attr("height", height);

    return function (structure, threshold) {
        var z = d3.scale.pow().domain([0, threshold]).range([0, 1]).clamp(true);

        d3.json("/structure/" + structure + ".json?threshold=" + threshold, 
                function(data) {
                    var matrix = [],
                        nodes = data.nodes.reverse(),
                        n = nodes.length;

                    // Compute index per node.
                    nodes.forEach(function(node, i) {
                        node.index = i;
                        node.count = 0;
                        matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
                    });

                    data.links.forEach(function(link) {
                        matrix[n - link.source - 1][link.target].z += link.value;
                        matrix[n - link.target - 1][link.target].z += link.value;
                        matrix[n - link.target - 1][link.source].t = link.sse;
                        matrix[n - link.source - 1][link.target].t = link.sse;
                        matrix[n - link.target - 1][link.source].h = link.hbond;
                        matrix[n - link.source - 1][link.target].h = link.hbond;
                        nodes[link.source].count += link.value;
                        nodes[link.target].count += link.value;
                    });

                    x.domain(d3.range(n));

                    svg.selectAll(".row").remove();
                    var row = svg.selectAll(".row")
                            .data(matrix);

                    row.enter().append("g")
                        .attr("class", function(d, i) { return "row residue-" + nodes[i].name; })
                        .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
                        .on("mouseover", mouseover)
                        .on("mouseout", mouseout)
                        .each(function (d, i) {
                            d3.select(this).append("text")
                                .attr("x", -6)
                                .attr("y", x.rangeBand() / 2)
                                .attr("dy", ".32em")
                                .attr("text-anchor", "end")
                                .text(function(d) { return nodes[i].name; });

                            bondless = d3.select(this).selectAll(".residue")
                                .data(d.filter(function(d) { return ! d.h && d.z; }));

                            bondless.enter().append("rect")
                                .attr("x", function(d) { return x(d.x); })
                                .attr("width", x.rangeBand())
                                .attr("height", x.rangeBand())
                                .attr("class", function(d, i) { return "residue structure-" + d.t; })
                                .style("fill-opacity", function(d) { return z(d.z); })
                                .style("fill", function(d) { return d.t ? c(d.t) : null; })
                                .on("mouseover", mouseover_contact)
                                .on("mouseout", mouseout_contact);

                            bond = d3.select(this).selectAll(".hbond")
                                .data(d.filter(function(d) { return d.h && d.z; }));

                            bond.enter().append("circle")
                                .attr("cx", function(d) { return x(d.x) + x.rangeBand()/2; })
                                .attr("cy", function(d) { return x.rangeBand()/2; })
                                .attr("r", x.rangeBand()/2)
                                .attr("class", function(d, i) { return "hbond structure-" + d.t; })
                                .style("fill-opacity", function(d) { return z(d.z); })
                                .style("fill", function(d) { return d.t ? c(d.t) : null; })
                                .on("mouseover", mouseover_contact)
                                .on("mouseout", mouseout_contact);
                        });
                    // row.append("line")
                    //     .attr("x2", width);

                    // remove old elements
                    row.exit().remove();

                    svg.selectAll(".column").remove();
                    var column = svg.selectAll(".column")
                            .data(matrix);

                    column.enter().append("g")
                        .attr("class", "column")
                        .attr("transform", 
                              function(d, i) { 
                                  return "translate(" + x(i) + ", " + (height + 30) + ")rotate(-90)"; 
                              })
                        .on("mouseover", mouseover)
                        .on("mouseout", mouseout)
                        .each(function (d, i) {
                            d3.select(this).append("text")
                                .attr("x", 6)
                                .attr("y", x.rangeBand() / 2)
                                .attr("dy", ".32em")
                                .attr("text-anchor", "start")
                                .text(function(d) { return nodes[n - i - 1].name; });
                        });

                    // column.append("line")
                    //     .attr("x1", -width);

                    column.exit().remove();

                    function mouseover(p) {
                        console.log(this);
                        d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
                        d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
                    }

                    function mouseout() {
                        d3.selectAll("text").classed("active", false);
                    }

                    function mouseover_contact(p) {
                    }

                    function mouseout_contact() {
                    }

                });}; 
}();
