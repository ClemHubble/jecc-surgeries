const width = 500, height = 500, radius = Math.min(width, height) / 2;

const svg = d3.select("#main-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

const color = d3.scaleOrdinal(["#4daf4a", "#e41a1c"]);

const arc = d3.arc().innerRadius(0).outerRadius(radius);
const pie = d3.pie().value(d => d.value);

const legend = d3.select("#main-chart").append("div").attr("class", "legend");

legend.append("div").html(`<span style="background-color:#4daf4a;"></span> <strong style="color:#4daf4a;">No Moratlity</strong>`);
legend.append("div").html(`<span style="background-color:#e41a1c;"></span> <strong style="color:#e41a1c;">Morality</strong>`);


d3.csv("vitaldb_cases.csv").then(data => {
    data.forEach(d => {
        d.age = +d.age;
        d.death_inhosp = +d.death_inhosp;
    });

    function getAgeGroup(age) {
        return Math.floor(age / 10) * 10;
    }

    function updateChart(selectedAgeGroup) {
        const filteredData = data.filter(d => getAgeGroup(d.age) === selectedAgeGroup);
        const deathCounts = d3.rollups(filteredData, v => v.length, d => d.death_inhosp);
        const chartData = [
            { label: "Survived", value: deathCounts.find(d => d[0] === 0)?.[1] || 0 },
            { label: "Died", value: deathCounts.find(d => d[0] === 1)?.[1] || 0 }
        ];

        const arcs = svg.selectAll(".arc").data(pie(chartData));

        arcs.enter()
            .append("path")
            .attr("class", "arc")
            .merge(arcs)
            .transition().duration(500)
            .attr("d", arc)
            .attr("fill", d => color(d.data.label));

        arcs.exit().remove();
    }

    const ageGroups = d3.range(0, 100, 10);
    d3.select("#slider-container").append("input")
        .attr("type", "range")
        .attr("min", 0)
        .attr("max", 90)
        .attr("step", 10)
        .attr("value", 0)
        .on("input", function () {
            const selectedAge = +this.value;
            d3.select("#age-display").text(`Age Group: ${selectedAge}-${selectedAge + 9}`);
            updateChart(selectedAge);
        });

    d3.select("#slider-container").append("div").attr("id", "age-display").text("Age Group: 0-9");

    updateChart(0); 
});
