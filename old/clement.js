d3.csv('vitaldb_cases.csv').then(function(data) {
    const margin = {top: 20, right: 30, bottom: 50, left: 50};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;
    
    const svg = d3.select("#main-chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
        data.forEach(d => {
        d.opend = +d.opend; 
        d.opstart = +d.opstart;
        d.icu_days = +d.icu_days;
        d.age = +d.age;
        d.asa = +d.asa;
        d.intraop_ebl = +d.intraop_ebl;
        d.death_inhosp = +d.death_inhosp;
    });

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.opend - d.opstart)])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.icu_days)])
        .range([height, 0]);
        
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .append("text")
        .attr("x", width/2)
        .attr("y", 40)
        .attr("fill", "black")
        .text("Surgery Duration (hours)");
        
    svg.append("g")
        .call(d3.axisLeft(y))
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height/2)
        .attr("fill", "black")
        .text("ICU Stay (days)");
        
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
        
    svg.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.opend - d.opstart))
        .attr("cy", d => y(d.icu_days))
        .attr("r", 5)
        .style("fill", d => d.death_inhosp === 1 ? "orange" : "steelblue")
        .style("opacity", 0.7)
        .on("mouseover", function(event, d) {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                Patient ID: ${d.subjectid}<br/>
                Age: ${d.age}<br/>
                Department: ${d.department}<br/>
                Surgery: ${d.opname}<br/>
                ASA Score: ${d.asa}<br/>
                Surgery Duration: ${((d.opend - d.opstart)/3600).toFixed(2)} hrs<br/>
                ICU Stay: ${d.icu_days} days<br/>
                Blood Loss: ${d.intraop_ebl} mL
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
        
    d3.select("#department-filter").on("change", updateFilters);
    d3.select("#asa-filter").on("change", updateFilters);
    d3.select("#surgery-type-filter").on("change", updateFilters);
    d3.select("#reset-filters").on("click", resetFilters);
    
    function updateFilters() {
        const departmentFilter = d3.select("#department-filter").property("value");
        const asaFilter = d3.select("#asa-filter").property("value");
        const typeFilter = d3.select("#surgery-type-filter").property("value");
        
        svg.selectAll("circle")
            .style("opacity", d => {
                if (departmentFilter !== "all" && d.department !== departmentFilter) return 0.1;
                if (asaFilter !== "all" && d.asa !== +asaFilter) return 0.1;
                if (typeFilter !== "all" && d.optype !== typeFilter) return 0.1;
                return 0.7;
            });
        
        updateSummary(departmentFilter, asaFilter, typeFilter);
    }
    
    function resetFilters() {
        d3.select("#department-filter").property("value", "all");
        d3.select("#asa-filter").property("value", "all");
        d3.select("#surgery-type-filter").property("value", "all");
        
        svg.selectAll("circle")
            .style("opacity", 0.7);
        
        updateSummary("all", "all", "all");
    }
    
    function updateSummary(dept, asa, type) {
        let filteredData = data;
        if (dept !== "all") filteredData = filteredData.filter(d => d.department === dept);
        if (asa !== "all") filteredData = filteredData.filter(d => d.asa === +asa);
        if (type !== "all") filteredData = filteredData.filter(d => d.optype === type);
        
        const totalPatients = filteredData.length;
        const avgSurgeryTime = d3.mean(filteredData, d => (d.opend - d.opstart)/3600);
        const avgICUStay = d3.mean(filteredData, d => d.icu_days);
        const mortalityRate = d3.mean(filteredData, d => d.death_inhosp) * 100;
        
        d3.select("#summary-stats").html(`
            <p>Patients: ${totalPatients}</p>
            <p>Avg Surgery Time: ${avgSurgeryTime ? avgSurgeryTime.toFixed(2) : "N/A"} hrs</p>
            <p>Avg ICU Stay: ${avgICUStay ? avgICUStay.toFixed(2) : "N/A"} days</p>
            <p>Mortality Rate: ${mortalityRate ? mortalityRate.toFixed(2) : "N/A"}%</p>
        `);
    }
    
    updateSummary("all", "all", "all");
});