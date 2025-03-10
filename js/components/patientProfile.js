class PatientProfile {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container element with ID '${containerId}' not found`);
      return;
    }

    this.controls = {
      age: document.getElementById("age"),
      ageValue: document.getElementById("age-value"),
      sex: document.getElementById("sex"),
      asa: document.getElementById("asa"),
      height: document.getElementById("height"),
      heightValue: document.getElementById("height-value"),
      weight: document.getElementById("weight"),
      weightValue: document.getElementById("weight-value"),
      bmiValue: document.getElementById("bmi-value"),
    };

    this.updateProfile = this.updateProfile.bind(this);
    this.calculateBMI = this.calculateBMI.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);

    this.setupEventListeners();
    this.calculateBMI();

    dataService.onDataLoaded(() => {
      this.updateProfile();
    });
  }

  setupEventListeners() {
    ["age", "height", "weight"].forEach((id) => {
      const slider = this.controls[id];
      const valueDisplay = this.controls[`${id}Value`];

      if (slider && valueDisplay) {
        slider.addEventListener("input", () => {
          valueDisplay.textContent = slider.value;
          if (id === "height" || id === "weight") {
            this.calculateBMI();
          }
          this.handleInputChange();
        });
      }
    });

    ["sex", "asa"].forEach((id) => {
      const dropdown = this.controls[id];
      if (dropdown) {
        dropdown.addEventListener("change", this.handleInputChange);
      }
    });
  }

  calculateBMI() {
    const height = parseInt(this.controls.height.value) / 100;
    const weight = parseInt(this.controls.weight.value);
    const bmi = weight / (height * height);
    this.controls.bmiValue.textContent = bmi.toFixed(1);
  }

  handleInputChange() {
    this.updateProfile();
  }

  updateProfile() {
    if (!dataService.isLoaded) return;

    const params = {
      age: parseInt(this.controls.age.value),
      sex: this.controls.sex.value,
      asa: parseInt(this.controls.asa.value),
      height: parseInt(this.controls.height.value),
      weight: parseInt(this.controls.weight.value),
    };

    const similarProfiles = dataService.getProfileData(params);

    this.container.innerHTML = "";

    if (similarProfiles.length === 0) {
      this.showNoDataMessage(0);
      return;
    } else if (similarProfiles.length < 10) {
      this.showNoDataMessage(similarProfiles.length);
      return;
    } else if (similarProfiles.length < 20) {
      this.createVisualizationsWithWarning(similarProfiles);
      return;
    }

    this.createVisualizations(similarProfiles);
  }

  showNoDataMessage(count) {
    this.container.innerHTML = "";
    
    const messageDiv = document.createElement("div");
    messageDiv.className = "no-data-msg";
    messageDiv.style.padding = "30px";
    messageDiv.style.textAlign = "center";
    messageDiv.style.borderRadius = "var(--radius)";
    messageDiv.style.backgroundColor = "var(--background)";
    messageDiv.style.border = "1px solid var(--border)";
    this.container.appendChild(messageDiv);

    const icon = document.createElement("div");
    icon.innerHTML = "⚠️";
    icon.style.fontSize = "36px";
    icon.style.marginBottom = "15px";
    messageDiv.appendChild(icon);
    
    const title = document.createElement("h3");
    title.textContent = "Insufficient Data";
    title.style.color = "var(--destructive)";
    title.style.marginBottom = "10px";
    title.style.fontSize = "1.2rem";
    title.style.fontWeight = "500";
    messageDiv.appendChild(title);

    const message = document.createElement("p");
    message.style.fontSize = "0.875rem";
    message.style.lineHeight = "1.5";
    message.style.color = "var(--foreground)";
    
    if (count === 0) {
      message.innerHTML = "No matching patient profiles found with your current criteria.<br>Please adjust your parameters to broaden your search.";
    } else {
      message.innerHTML = `Only <strong>${count}</strong> matching patient profiles found.<br>This is not enough data to make reliable predictions.<br>Please adjust your parameters to broaden your search.`;
    }
    messageDiv.appendChild(message);

    const suggestions = document.createElement("div");
    suggestions.style.marginTop = "20px";
    suggestions.style.fontSize = "0.875rem";
    suggestions.style.lineHeight = "1.4";
    suggestions.style.color = "var(--muted-foreground)";
    suggestions.style.padding = "15px";
    suggestions.style.backgroundColor = "var(--background)";
    suggestions.style.borderRadius = "var(--radius)";
    suggestions.style.border = "1px solid var(--border)";
    
    suggestions.innerHTML = `
      <strong>Suggestions:</strong>
      <ul style="text-align: left; margin-top: 8px; padding-left: 20px;">
        <li>Try a different age range</li>
        <li>Select a different ASA score</li>
        <li>Adjust height and weight parameters</li>
        <li>Try a different sex selection</li>
      </ul>
    `;
    messageDiv.appendChild(suggestions);
  }

  createVisualizations(profiles) {
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.gap = "20px";
    
    this.container.innerHTML = "";
    
    this.createSummaryStats(profiles);
    
    const mainRow = document.createElement("div");
    mainRow.style.display = "flex";
    mainRow.style.gap = "20px";
    mainRow.style.flexWrap = "wrap";
    this.container.appendChild(mainRow);
    
    const surgeriesDiv = document.createElement("div");
    surgeriesDiv.className = "visualization-card surgeries-container";
    surgeriesDiv.style.flex = "1";
    surgeriesDiv.style.minWidth = "300px";
    surgeriesDiv.style.backgroundColor = "var(--background)";
    surgeriesDiv.style.borderRadius = "var(--radius)";
    surgeriesDiv.style.border = "1px solid var(--border)";
    surgeriesDiv.style.padding = "15px";
    mainRow.appendChild(surgeriesDiv);
    this.createSurgeryVisualization(surgeriesDiv, profiles);
    
    const approachDiv = document.createElement("div");
    approachDiv.className = "visualization-card approach-container";
    approachDiv.style.flex = "1";
    approachDiv.style.minWidth = "300px";
    approachDiv.style.backgroundColor = "var(--background)";
    approachDiv.style.borderRadius = "var(--radius)";
    approachDiv.style.border = "1px solid var(--border)";
    approachDiv.style.padding = "15px";
    mainRow.appendChild(approachDiv);
    this.createApproachVisualization(approachDiv, profiles);
    
    this.addSampleSizeInfo(profiles.length);
  }
  
  createContainer(className) {
    const div = document.createElement("div");
    div.className = `visualization-card ${className}`;
    div.style.backgroundColor = "var(--background)";
    div.style.borderRadius = "var(--radius)";
    div.style.border = "1px solid var(--border)";
    div.style.padding = "15px";
    div.style.marginBottom = "15px";
    return div;
  }

  createSummaryStats(profiles) {
    const statsDiv = document.createElement("div");
    statsDiv.className = "visualization-card summary-stats";
    statsDiv.style.backgroundColor = "var(--background)";
    statsDiv.style.borderRadius = "var(--radius)";
    statsDiv.style.border = "1px solid var(--border)";
    statsDiv.style.padding = "15px";
    this.container.appendChild(statsDiv);
    
    const title = document.createElement("h3");
    title.textContent = "Expected Outcomes";
    title.style.margin = "0 0 15px 0";
    title.style.color = "var(--foreground)";
    title.style.fontSize = "1.2rem";
    title.style.fontWeight = "600";
    statsDiv.appendChild(title);
    
    const statsGrid = document.createElement("div");
    statsGrid.style.display = "grid";
    statsGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(150px, 1fr))";
    statsGrid.style.gap = "15px";
    statsDiv.appendChild(statsGrid);
    
    const stats = [
      {
        label: "Surgery Duration",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.opend - d.opstart),
          0,
          "min"
        ),
        icon: "⏱️"
      },
      {
        label: "ICU Days",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.icu_days),
          1,
          "days"
        ),
        icon: "🏥"
      },
      {
        label: "Estimated Blood Loss",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.intraop_ebl),
          0,
          "mL"
        ),
        icon: "🩸"
      },
      {
        label: "Mortality Rate",
        value: `${(d3.mean(profiles, (d) => d.death_inhosp) * 100).toFixed(1)}%`,
        icon: "📊"
      },
    ];
    
    stats.forEach(stat => {
      const statCard = document.createElement("div");
      statCard.style.backgroundColor = "var(--background)";
      statCard.style.padding = "12px";
      statCard.style.borderRadius = "var(--radius)";
      statCard.style.border = "1px solid var(--border)";
      statCard.style.textAlign = "center";
      statsGrid.appendChild(statCard);
      
      const icon = document.createElement("div");
      icon.textContent = stat.icon;
      icon.style.fontSize = "24px";
      icon.style.marginBottom = "8px";
      statCard.appendChild(icon);
      
      const value = document.createElement("div");
      value.textContent = stat.value;
      value.style.fontSize = "1.2rem";
      value.style.fontWeight = "bold";
      value.style.color = "var(--primary)";
      value.style.marginBottom = "5px";
      statCard.appendChild(value);
      
      const label = document.createElement("div");
      label.textContent = stat.label;
      label.style.fontSize = "0.875rem";
      label.style.color = "var(--muted-foreground)";
      statCard.appendChild(label);
    });
  }

  createSurgeryVisualization(container, profiles) {
    container.style.backgroundColor = "var(--background)";
    container.style.borderRadius = "var(--radius)";
    
    const title = document.createElement("h3");
    title.textContent = "Top Surgeries";
    title.style.margin = "0 0 15px 0";
    title.style.color = "var(--foreground)";
    title.style.fontSize = "1.2rem";
    container.appendChild(title);

    const topSurgeries = d3
      .rollups(
        profiles,
        (v) => v.length,
        (d) => d.opname || "Unknown"
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const margin = { top: 10, right: 80, bottom: 40, left: 160 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const maxValue = d3.max(topSurgeries, (d) => d[1]);
    const domainPadding = maxValue * 0.25;

    const x = d3
      .scaleLinear()
      .domain([0, maxValue + domainPadding])
      .nice()
      .range([0, width]);

    const y = d3
      .scaleBand()
      .domain(topSurgeries.map((d) => d[0]))
      .range([0, height])
      .padding(0.3);

    const xAxis = svg
      .append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5))
      .style("font-size", "10px");
    
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 30)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--muted-foreground)")
      .style("font-size", "11px")
      .text("Number of Patients");

    svg
      .append("g")
      .call(d3.axisLeft(y))
      .style("font-size", "12px")
      .selectAll("text")
      .each(function(d) {
        let shortName = d;
        if (d.length > 25) {
          shortName = d.substring(0, 23) + "...";
        }
        d3.select(this).text(shortName);
      })
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .append("title")
      .text(d => d);

    const totalPatients = d3.sum(topSurgeries, (d) => d[1]);

    const chartColors = [
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-3').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-2').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-1').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-4').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-5').trim()
    ];

    svg
      .selectAll("rect")
      .data(topSurgeries)
      .enter()
      .append("rect")
      .attr("y", (d) => y(d[0]))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => x(d[1]))
      .attr("fill", function(d, i) {
        return chartColors[i % chartColors.length];
      })
      .attr("rx", 4)
      .attr("ry", 4);

    svg
      .selectAll(".bar-label")
      .data(topSurgeries)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("y", d => y(d[0]) + y.bandwidth() / 2)
      .attr("x", d => {
        const barWidth = x(d[1]);
        const percentage = ((d[1] / totalPatients) * 100).toFixed(1);
        const labelText = `${d[1]} (${percentage}%)`;
        const textWidth = labelText.length * 6;
        
        if (barWidth > textWidth + 10) {
          return barWidth - 8;
        }
        return barWidth + 5;
      })
      .attr("text-anchor", d => {
        const barWidth = x(d[1]);
        const percentage = ((d[1] / totalPatients) * 100).toFixed(1);
        const labelText = `${d[1]} (${percentage}%)`;
        const textWidth = labelText.length * 6;
        
        if (barWidth > textWidth + 10) {
          return "end";
        }
        return "start";
      })
      .attr("dy", ".35em")
      .style("font-size", "11px")
      .style("fill", d => {
        const barWidth = x(d[1]);
        const percentage = ((d[1] / totalPatients) * 100).toFixed(1);
        const labelText = `${d[1]} (${percentage}%)`;
        const textWidth = labelText.length * 6;
        
        if (barWidth > textWidth + 10) {
          return "var(--primary-foreground)";
        }
        return "var(--foreground)";
      })
      .style("font-weight", "500")
      .text(d => {
        const percentage = ((d[1] / totalPatients) * 100).toFixed(1);
        return `${d[1]} (${percentage}%)`;
      });

    svg
      .selectAll("rect")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("fill", "var(--destructive)")
          .attr("opacity", 0.8);
      })
      .on("mouseout", function(event, d) {
        d3.select(this)
          .attr("fill", function(d, i) {
            const index = topSurgeries.findIndex(item => item[0] === d[0]);
            return chartColors[index % chartColors.length];
          })
          .attr("opacity", 1);
      });
  }

  createApproachVisualization(container, profiles) {
    container.style.backgroundColor = "var(--background)";
    container.style.borderRadius = "var(--radius)";
    
    const title = document.createElement("h3");
    title.textContent = "Surgical Approaches";
    title.style.margin = "0 0 15px 0";
    title.style.color = "var(--foreground)";
    title.style.fontSize = "1.2rem";
    title.style.fontWeight = "500";
    container.appendChild(title);

    const approaches = d3.rollups(
      profiles,
      (v) => v.length,
      (d) => d.approach || "Unknown"
    );

    const total = d3.sum(approaches, (d) => d[1]);

    const approachData = approaches
      .map((d) => ({
        approach: d[0],
        count: d[1],
        percentage: (d[1] / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    const width = 320;
    const height = 220;
    const radius = Math.min(width, height) / 2;
    
    const chartContainer = document.createElement("div");
    chartContainer.style.display = "flex";
    chartContainer.style.alignItems = "center";
    chartContainer.style.justifyContent = "space-between";
    container.appendChild(chartContainer);

    const svgContainer = document.createElement("div");
    svgContainer.style.flex = "1";
    svgContainer.style.minWidth = "220px";
    chartContainer.appendChild(svgContainer);

    const svg = d3
      .select(svgContainer)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const chartColors = [
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-3').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-2').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-1').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-4').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-accent-5').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-1').trim(),
      getComputedStyle(document.documentElement).getPropertyValue('--chart-color-2').trim()
    ];

    const color = d3
      .scaleOrdinal()
      .domain(approachData.map((d) => d.approach))
      .range(chartColors);

    const pie = d3.pie()
      .value(d => d.count)
      .sort(null);

    const arcGenerator = d3.arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8)
      .cornerRadius(3)
      .padAngle(0.02);

    const hoverArc = d3.arc()
      .innerRadius(radius * 0.45)
      .outerRadius(radius * 0.85)
      .cornerRadius(4)
      .padAngle(0.02);

    const arcs = svg
      .selectAll("path")
      .data(pie(approachData))
      .enter()
      .append("path")
      .attr("d", arcGenerator)
      .attr("fill", d => color(d.data.approach))
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 1)
      .style("transition", "all 0.2s ease")
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("d", hoverArc)
          .attr("stroke-width", 2);
        
        centerText
          .text(`${d.data.percentage.toFixed(1)}%`)
          .attr("fill", color(d.data.approach));
        
        centerLabel.text(d.data.approach);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("d", arcGenerator)
          .attr("stroke-width", 1);
        
        centerText.text(`${total}`);
        centerLabel.text("surgeries");
      });
      
    const centerText = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("font-size", "1.5rem")
      .attr("font-weight", "bold")
      .attr("fill", "var(--foreground)")
      .text(`${total}`);
    
    const centerLabel = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("font-size", "0.9rem")
      .attr("fill", "var(--muted-foreground)")
      .text("surgeries");

    const legendContainer = document.createElement("div");
    legendContainer.style.flex = "1";
    legendContainer.style.display = "flex";
    legendContainer.style.flexDirection = "column";
    legendContainer.style.gap = "8px";
    legendContainer.style.fontSize = "0.85rem";
    legendContainer.style.overflow = "auto";
    legendContainer.style.maxHeight = "180px";
    chartContainer.appendChild(legendContainer);

    approachData.forEach(d => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.style.padding = "4px";
      item.style.borderRadius = "var(--radius)";
      item.style.cursor = "pointer";
      legendContainer.appendChild(item);

      const colorBox = document.createElement("div");
      colorBox.style.width = "14px";
      colorBox.style.height = "14px";
      colorBox.style.backgroundColor = color(d.approach);
      colorBox.style.borderRadius = "3px";
      item.appendChild(colorBox);

      const label = document.createElement("div");
      label.style.flex = "1";
      label.style.display = "flex";
      label.style.justifyContent = "space-between";
      label.style.alignItems = "center";
      label.style.width = "100%";
      item.appendChild(label);

      const name = document.createElement("span");
      name.textContent = d.approach;
      name.style.fontWeight = "500";
      label.appendChild(name);

      const percent = document.createElement("span");
      percent.textContent = `${d.percentage.toFixed(1)}%`;
      percent.style.fontWeight = "bold";
      percent.style.color = "var(--primary)";
      label.appendChild(percent);

      item.addEventListener("mouseover", () => {
        svg.selectAll("path").each(function(pieData) {
          if (pieData.data.approach === d.approach) {
            d3.select(this)
              .attr("d", hoverArc)
              .attr("stroke-width", 2);
              
            centerText
              .text(`${d.percentage.toFixed(1)}%`)
              .attr("fill", color(d.approach));
            
            centerLabel.text(d.approach);
          }
        });
        
        item.style.backgroundColor = "var(--accent)";
      });

      item.addEventListener("mouseout", () => {
        svg.selectAll("path")
          .attr("d", arcGenerator)
          .attr("stroke-width", 1);
          
        centerText.text(`${total}`);
        centerLabel.text("surgeries");
        
        item.style.backgroundColor = "transparent";
      });
    });
  }

  createOutcomeStats(profiles) {
  }

  createApproachBreakdown(profiles) {
  }

  addSampleSizeInfo(count) {
    const infoDiv = document.createElement("div");
    infoDiv.className = "sample-info";
    infoDiv.style.textAlign = "center";
    infoDiv.style.color = "var(--muted-foreground)";
    infoDiv.style.fontSize = "0.75rem";
    infoDiv.style.marginTop = "10px";
    infoDiv.textContent = `Predictions based on ${count} similar patient profiles.`;
    this.container.appendChild(infoDiv);
  }

  createVisualizationsWithWarning(profiles) {
    this.container.innerHTML = "";
    
    const warningBanner = document.createElement("div");
    warningBanner.style.color = "var(--chart-color-accent-5)";
    warningBanner.style.padding = "12px 15px";
    warningBanner.style.borderRadius = "var(--radius)";
    warningBanner.style.marginBottom = "15px";
    warningBanner.style.border = "1px solid var(--chart-color-accent-5)";
    warningBanner.style.fontSize = "0.875rem";
    warningBanner.style.display = "flex";
    warningBanner.style.alignItems = "center";
    warningBanner.style.gap = "10px";
    
    const icon = document.createElement("span");
    icon.textContent = "⚠️";
    icon.style.fontSize = "1.2rem";
    warningBanner.appendChild(icon);
    
    const message = document.createElement("span");
    message.innerHTML = `<strong>Limited data available:</strong> Only ${profiles.length} matching profiles found. Results may be less reliable.`;
    warningBanner.appendChild(message);
    
    this.container.appendChild(warningBanner);
    
    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.gap = "20px";
    
    this.createSummaryStats(profiles);
    
    const mainRow = document.createElement("div");
    mainRow.style.display = "flex";
    mainRow.style.gap = "20px";
    mainRow.style.flexWrap = "wrap";
    this.container.appendChild(mainRow);
    
    const surgeriesDiv = document.createElement("div");
    surgeriesDiv.className = "visualization-card surgeries-container";
    surgeriesDiv.style.flex = "1";
    surgeriesDiv.style.minWidth = "300px";
    surgeriesDiv.style.backgroundColor = "var(--background)";
    surgeriesDiv.style.borderRadius = "var(--radius)";
    surgeriesDiv.style.border = "1px solid var(--border)";
    surgeriesDiv.style.padding = "15px";
    mainRow.appendChild(surgeriesDiv);
    this.createSurgeryVisualization(surgeriesDiv, profiles);
    
    const approachDiv = document.createElement("div");
    approachDiv.className = "visualization-card approach-container";
    approachDiv.style.flex = "1";
    approachDiv.style.minWidth = "300px";
    approachDiv.style.backgroundColor = "var(--background)";
    approachDiv.style.borderRadius = "var(--radius)";
    approachDiv.style.border = "1px solid var(--border)";
    approachDiv.style.padding = "15px";
    mainRow.appendChild(approachDiv);
    this.createApproachVisualization(approachDiv, profiles);
    
    this.addSampleSizeInfo(profiles.length);
  }
}
