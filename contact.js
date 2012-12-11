contactMap = function (){
    var margin = {top: 80, right: 0, bottom: 10, left: 80},
        width = 720,
        height = 720;

    var legend = {"H": "A-helix", "B": "Isolated B-bridge",
                  "E": "B-strand", "G": "3/10-helix",
                  "I": "Pi-helix", "T": "Turn",
                  "S": "Bend", "C": "Coil"};

    var x = d3.scale.ordinal().rangeBands([0, width]),
        z = d3.scale.linear().domain([0, 14]).range([0, 1]).clamp(true),
        c = d3.scale.category10().domain(Object.keys(legend));

    var svg = d3.select("body").append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .style("margin-left", -margin.left + "px")
            .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var legendSvg = d3.select("body").append("svg")
            .attr("width", 200)
            .attr("height", 500);

    var y = 0;
    for (var key in legend) {
        if (legend.hasOwnProperty(key)) {
            legendSvg.append("svg:rect")
                .attr("fill", c(key) )
                .attr("x", 0)
                .attr("y", y + 0)
                .attr("width", 20)
                .attr("height", 20);

            legendSvg.append("svg:text")
                .attr("x", 30)
                .attr("y", y + 15)
                .text(legend[key]);
            y += 21;
        }
    }

    d3.json("cmap.json", function(miserables) {
        var matrix = [],
            nodes = miserables.nodes,
            n = nodes.length;

        // Compute index per node.
        nodes.forEach(function(node, i) {
            node.index = i;
            node.count = 0;
            matrix[i] = d3.range(n).map(function(j) { return {x: j, y: i, z: 0}; });
        });

        miserables.links.forEach(function(link) {
            matrix[link.source][link.target].z += link.value;
            matrix[link.target][link.source].z += link.value;
            matrix[link.source][link.source].z += link.value;
            matrix[link.target][link.target].z += link.value;
            matrix[link.target][link.source].t = link.sse;
            matrix[link.source][link.target].t = link.sse;
            matrix[link.target][link.source].h = link.hbond;
            matrix[link.source][link.target].h = link.hbond;
            nodes[link.source].count += link.value;
            nodes[link.target].count += link.value;
        });

        x.domain(d3.range(n));

        svg.append("rect")
            .attr("class", "background")
            .attr("width", width)
            .attr("height", height);

        var row = svg.selectAll(".row")
                .data(matrix)
                .enter().append("g")
                .attr("class", "row")
                .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
                .each(row);

        row.append("line")
            .attr("x2", width);

        row.append("text")
            .attr("x", -6)
            .attr("y", x.rangeBand() / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "end")
            .text(function(d, i) { return nodes[i].name; });

        var column = svg.selectAll(".column")
                .data(matrix)
                .enter().append("g")
                .attr("class", "column")
                .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });

        column.append("line")
            .attr("x1", -width);

        column.append("text")
            .attr("x", 6)
            .attr("y", x.rangeBand() / 2)
            .attr("dy", ".32em")
            .attr("text-anchor", "start")
            .text(function(d, i) { return nodes[i].name; });

        function row(row) {
            var cell = d3.select(this).selectAll(".cell")
                    .data(row.filter(function(d) { return d.z; }))
                    .enter().append("rect")
                    .attr("class", "cell")
                    .attr("x", function(d) { return x(d.x); })
                    .attr("width", x.rangeBand())
                    .attr("height", x.rangeBand())
                    .style("fill-opacity", function(d) { return z(d.z); })
                    .style("fill", function(d) { return d.t ? c(d.t) : null; })
                    .on("mouseover", mouseover)
                    .on("mouseout", mouseout);
        }

        function mouseover(p) {
            d3.selectAll(".row text").classed("active", function(d, i) { return i == p.y; });
            d3.selectAll(".column text").classed("active", function(d, i) { return i == p.x; });
            // d3.selectAll(".row").classed("active", function(d, i) { return i == p.y; });
            // d3.selectAll(".column").classed("active", function(d, i) { return i == p.x; });
        }

        function mouseout() {
            d3.selectAll("text").classed("active", false);
        }

        d3.select("#order").on("change", function() {
            clearTimeout(timeout);
            order(this.value);
        });

        function order(value) {
            x.domain(orders[value]);

            var t = svg.transition().duration(2500);

            t.selectAll(".row")
                .delay(function(d, i) { return x(i) * 4; })
                .attr("transform", function(d, i) { return "translate(0," + x(i) + ")"; })
                .selectAll(".cell")
                .delay(function(d) { return x(d.x) * 4; })
                .attr("x", function(d) { return x(d.x); });

            t.selectAll(".column")
                .delay(function(d, i) { return x(i) * 4; })
                .attr("transform", function(d, i) { return "translate(" + x(i) + ")rotate(-90)"; });
        }

    });

};
