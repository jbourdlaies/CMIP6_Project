// Chart dimensions
const margin = {
    top: 30,
    right: 40,
    bottom: 65,
    left: 75
};

const width = 1000;
const height = 550;

const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

// Create SVG
const svg = d3.select("#chart")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

const chart = svg.append("g")
    .attr("transform",
        `translate(${margin.left},${margin.top})`
    );

// Tooltip
const tooltip = d3.select("#tooltip");

// Load CSV
d3.csv("data/cmip6_global_temperature_anomalies.csv",
    d => ({
        year: +d.year,
        experiment: d.experiment,
        anomaly: +d.anomaly
    })
).then(data => {

    // Separate experiments
    const piData = data.filter(
        d => d.experiment === "piControl"
    );

    const histData = data.filter(
        d => d.experiment === "historical"
    );

    // X-axis scale
    const x = d3.scaleLinear()
        .domain([950, 2014])
        .range([0, innerWidth]);

    // Y-axis scale
    const extent = d3.extent(data, d => d.anomaly);

    const padding = (extent[1] - extent[0]) * 0.12;

    const y = d3.scaleLinear()
        .domain([
            extent[0] - padding,
            extent[1] + padding
        ])
        .nice()
        .range([innerHeight, 0]);

    // Grid lines
    chart.append("g")
        .attr("class", "grid")
        .call(
            d3.axisLeft(y)
                .tickSize(-innerWidth)
                .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e5e7eb");

    chart.select(".grid .domain").remove();

    // X-axis
    chart.append("g")
        .attr("transform",
            `translate(0,${innerHeight})`
        )
        .call(
            d3.axisBottom(x)
                .ticks(10)
                .tickFormat(d3.format("d"))
        );

    // Y-axis
    chart.append("g")
        .call(d3.axisLeft(y));

    // Axis labels
    chart.append("text")
        .attr("class", "axis-label")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .text("Simulation Year");

    chart.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Global Temperature Anomaly (°C)");

    // Line generator
    const line = d3.line()
        .x(d => x(d.year))
        .y(d => y(d.anomaly));

    // Draw piControl
    const piLine = chart.append("path")
        .datum(piData)
        .attr("fill", "none")
        .attr("stroke", "#2878b5")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Draw historical
    const histLine = chart.append("path")
        .datum(histData)
        .attr("fill", "none")
        .attr("stroke", "#d94b45")
        .attr("stroke-width", 2.5)
        .attr("d", line);

    // Experiment visibility controls
    d3.select("#show-pi")
        .on("change", function() {
            piLine.style(
                "display",
                this.checked ? null : "none"
            );
        });

    d3.select("#show-hist")
        .on("change", function() {
            histLine.style(
                "display",
                this.checked ? null : "none"
            );
        });

    // Interactive hover indicator
    const focus = chart.append("circle")
        .attr("r", 5)
        .attr("fill", "black")
        .style("display", "none");

    const bisect = d3.bisector(d => d.year).left;

    // Transparent interaction area
    chart.append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight)
        .attr("fill", "transparent")
        .on("mousemove", function(event) {

            const [mouseX] = d3.pointer(event, this);

            const year = x.invert(mouseX);

            const visible = [];

            if (d3.select("#show-pi").property("checked")) {
                visible.push(piData);
            }

            if (d3.select("#show-hist").property("checked")) {
                visible.push(histData);
            }

            let nearest = null;
            let nearestDistance = Infinity;

            visible.forEach(series => {

                const index = bisect(series, year);

                const candidates = [
                    series[index - 1],
                    series[index]
                ].filter(Boolean);

                candidates.forEach(d => {

                    const distance = Math.abs(x(d.year) - mouseX);

                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearest = d;
                    }

                });

            });

            if (nearest) {

                focus
                    .style("display", null)
                    .attr("cx", x(nearest.year))
                    .attr("cy", y(nearest.anomaly));

                tooltip
                    .style("opacity", 1)
                    .html(`
                        <strong>${nearest.experiment}</strong><br>
                        Year: ${nearest.year}<br>
                        Temperature anomaly:
                        ${nearest.anomaly.toFixed(3)} °C
                    `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY - 30) + "px");

            }

        })
        .on("mouseleave", function() {

            focus.style("display", "none");

            tooltip.style("opacity", 0);

        });

});