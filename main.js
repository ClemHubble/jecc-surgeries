const width = 500, height = 500, radius = Math.min(width, height) / 2;

let currentAgeIndex = 0;

let svg = d3.select("#main-chart")
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
        d.gluc = +d.preop_gluc;
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
        
        // for anesthesia type, mortality, and operation type
        function pieChart(categoryCounts) {
            svg.html("");
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

        function updateBarChart(age) {
            svg.html("");
            legendContainer.html("");
            console.log(age);
            let age_groups = data.map(d => getAgeGroup(d.age));
            const counts = d3.rollup(age_groups, v => v.length, d => d);
            const age_counts = Array.from(counts, ([category, value]) => ({ category, value }));

            // sort in ascending age order
            age_counts.sort((a, b) => a.category - b.category);
            console.log(age_counts)

            let margin_bar = { top: -200, right: 50, bottom: 250, left: -100 };
            let margin_width = 300;
            let margin_height = 300;

            // Create scales
            const x = d3.scaleBand()
                        .domain(age_counts.map(d => d.category))
                        .range([margin_bar.left, margin_width - margin_bar.right])
                        .padding(0.2);

            const y = d3.scaleLinear()
                        .domain([0, d3.max(age_counts, d => d.value)])
                        .nice()
                        .range([margin_height - margin_bar.bottom, margin_bar.top]);

            // Append axes
            svg.append("g")
                .attr("transform", `translate(0,${margin_height - margin_bar.bottom})`)
                .call(d3.axisBottom(x));

            svg.append("g")
                .attr("transform", `translate(${margin_bar.left},0)`)
                .call(d3.axisLeft(y));

            // Draw bars
            svg.selectAll("rect")
                .data(age_counts)
                .enter().append("rect")
                .attr("x", d => x(d.category))
                .attr("y", d => y(d.value))
                .attr("height", d => y(0) - y(d.value))
                .attr("width", x.bandwidth())
                .attr("fill", d => d.category === age ? "red" : "steelblue");

            // Add labels
            svg.selectAll("text.label")
                .data(age_counts)
                .enter().append("text")
                .attr("class", "label")
                .attr("x", d => x(d.category) + x.bandwidth() / 2)
                .attr("y", d => y(d.value) - 5)
                .attr("text-anchor", "middle")
                .text(d => d.value);
        }

        function scatterPlot(age, metric) {
            let margin_bar = { top: -200, right: 150, bottom: 200, left: -200 };
            let width = 400;
            let height = 350;
            
            svg.html("");
            legendContainer.html("");
            let filtered_data;
            if (metric == 'preop_gluc') {
                console.log(data.length);
                filtered_data = data.filter(d => d.gluc !== 0);
                console.log(filtered_data.length);
            }
            
        
            const xScale = d3.scaleLinear()
                .domain([0, 105])
                .range([margin_bar.left, width - margin_bar.right]);
        
            const yScale = d3.scaleLinear()
                .domain(d3.extent(filtered_data, d => d.gluc))
                .range([height - margin_bar.bottom, margin_bar.top]);
        
            // Create axes
            const xAxis = d3.axisBottom(xScale).ticks(9);
            const yAxis = d3.axisLeft(yScale).ticks(9);
        
            svg.append("g")
                .attr("transform", `translate(0, ${height - margin_bar.bottom})`)
                .call(xAxis);
        
            svg.append("g")
                .attr("transform", `translate(${margin_bar.left}, 0)`)
                .call(yAxis);
        
            // X-axis label
            svg.append("text")
                .attr("x", 0)
                .attr("y", 200)
                .style("font-size", "14px")
                .text("Age");
        
            // Y-axis label
            svg.append("text")
                .attr("transform", "rotate(-90)")
                .attr("x", 0)
                .attr("y", -240)
                .style("font-size", "14px")
                .text("Preoperative Glucose");
        
            // Add circles for data points
            svg.selectAll("circle")
                .data(filtered_data)
                .enter()
                .append("circle")
                .attr("cx", d => xScale(d.age))
                .attr("cy", d => yScale(d.gluc)) 
                .attr("r", 3)
                .attr("fill", "steelblue");
        }
        

        if (selectedMetric === "optype" | selectedMetric === "ane_type" | selectedMetric === 'mortality') {
            pieChart(categoryCounts);
        }
        else if (selectedMetric === "count") {
            updateBarChart(selectedAgeGroup);
        }
        else {
            scatterPlot(0, 'preop_gluc');
        }
    }

    
    d3.select("#controls").append("select")
        .attr("id", "metric-selector")
        .selectAll("option")
        .data(["mortality", "optype", "ane_type", "count", "preop_gluc"])  
        .enter()
        .append("option")
        .attr("value", d => d)
        .text(d => d === "mortality" ? "Mortality" : d === "optype" ? "Operation Type" : 
            d === "ane_type" ? "Anesthesia Type" : d === "count" ? "Count" : "Preoperation Glucose");
    

    d3.select("#metric-selector").on("change", function () {
        //const selectedAge = 0;
        updateChart(0, this.value);
        d3.select(".age-label").text("Age Group: 0-9");
    });

    function updateAgeGroup(newIndex) {
        currentAgeIndex = Math.max(0, Math.min(newIndex, 9)); // Keep within bounds
        const selectedAge = currentAgeIndex * 10;
        const selectedMetric = d3.select("#metric-selector").node().value;
    
        d3.select(".age-label").text(`Age Group: ${selectedAge}-${selectedAge + 9}`);
        updateChart(selectedAge, selectedMetric);
    }
    
    // Attach event listeners to the buttons
    document.querySelector(".back-button").addEventListener("click", function () {
        updateAgeGroup(currentAgeIndex - 1); // Go back one age group
    });
    
    document.querySelector(".forward-button").addEventListener("click", function () {
        updateAgeGroup(currentAgeIndex + 1); // Go forward one age group
    });
    
    // Add age display text initially
    d3.select(".age-label").text("Age Group: 0-9");
    
    // Initialize chart
    updateChart(0, "mortality");
});
