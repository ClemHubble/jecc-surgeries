const width = 500, height = 500, radius = Math.min(width, height) / 2;

const svg = d3.select("#main-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

const color = d3.scaleOrdinal(d3.schemeCategory10); 

const arc = d3.arc().innerRadius(0).outerRadius(radius);
const pie = d3.pie().value(d => d.value);

const legendContainer = d3.select("#main-chart").append("div").attr("class", "legend");

d3.csv("vitaldb_cases.csv").then(data => {
    data.forEach(d => {
        d.age = +d.age;
        d.death_inhosp = +d.death_inhosp;
    });

    function getAgeGroup(age) {
        return Math.floor(age / 10) * 10;
    }

    function updateChart(selectedAgeGroup, selectedMetric) {
        const filteredData = data.filter(d => getAgeGroup(d.age) === selectedAgeGroup);
        let categoryCounts;
    
        if (selectedMetric === "mortality") {
            categoryCounts = d3.rollups(filteredData, v => v.length, d => d.death_inhosp);
            categoryCounts = [
                { label: "No Mortality", value: categoryCounts.find(d => d[0] === 0)?.[1] || 0, color: "#4daf4a" },
                { label: "Mortality", value: categoryCounts.find(d => d[0] === 1)?.[1] || 0, color: "#e41a1c" }
            ];
        } else if (selectedMetric === "optype") {
            categoryCounts = d3.rollups(filteredData, v => v.length, d => d.optype)
                .map(d => ({ label: d[0], value: d[1], color: color(d[0]) }));
        } else if (selectedMetric === "ane_type") {
            categoryCounts = d3.rollups(filteredData, v => v.length, d => d.ane_type)
                .map(d => ({ label: d[0], value: d[1], color: color(d[0]) }));
        }
    
        const arcs = svg.selectAll(".arc").data(pie(categoryCounts));
    
        arcs.enter()
            .append("path")
            .attr("class", "arc")
            .merge(arcs)
            .transition().duration(500)
            .attr("d", arc)
            .attr("fill", d => d.data.color);
    
        arcs.exit().remove();
    
        legendContainer.html("");
        categoryCounts.forEach(d => {
            const legendItem = legendContainer.append("div")
                .style("display", "flex")
                .style("align-items", "center")
                .style("margin", "5px 0");
    
            legendItem.append("div")
                .style("width", "20px")
                .style("height", "20px")
                .style("border-radius", "5px")
                .style("background-color", d.color)
                .style("margin-right", "10px");
    
            legendItem.append("span")
                .style("color", d.color) 
                .style("font-weight", "bold")
                .text(d.label);
        });
    }
    
    d3.select("#controls").append("select")
        .attr("id", "metric-selector")
        .selectAll("option")
        .data(["mortality", "optype", "ane_type"])  
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d === "mortality" ? "Mortality" : d === "optype" ? "Operation Type" : "Anesthesia Type");
    
    d3.select("#slider-container").append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 90)
        .attr("step", 10)
        .attr("value", 0)
        .on("input", function () {
            const selectedAge = +this.value;
            const selectedMetric = d3.select("#metric-selector").node().value;
            d3.select("#age-display").text(`Age Group: ${selectedAge}-${selectedAge + 9}`);
            updateChart(selectedAge, selectedMetric);
        });
    
    d3.select("#slider-container").append("div").attr("id", "age-display").text("Age Group: 0-9");
    
    d3.select("#metric-selector").on("change", function () {
        const selectedAge = +d3.select("#slider-container input").node().value;
        updateChart(selectedAge, this.value);
    });
    
    updateChart(0, "mortality"); 
});
