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
      height: document.getElementById("height"),
      heightValue: document.getElementById("height-value"),
      weight: document.getElementById("weight"),
      weightValue: document.getElementById("weight-value"),
      bmiValue: document.getElementById("bmi-value"),
      filterHeight: document.getElementById("filter-height"),
      filterWeight: document.getElementById("filter-weight"),
      ageDistribution: document.getElementById("age-distribution"),
      heightDistribution: document.getElementById("height-distribution"),
      weightDistribution: document.getElementById("weight-distribution"),
    };

    this.sliderContainers = {
      height: this.controls.height.closest(".slider-container"),
      weight: this.controls.weight.closest(".slider-container"),
    };

    if (this.controls.height && this.controls.filterHeight) {
      this.controls.height.disabled = !this.controls.filterHeight.checked;
      if (this.sliderContainers.height) {
        this.sliderContainers.height.classList.toggle(
          "disabled",
          !this.controls.filterHeight.checked
        );
      }
    }

    if (this.controls.weight && this.controls.filterWeight) {
      this.controls.weight.disabled = !this.controls.filterWeight.checked;
      if (this.sliderContainers.weight) {
        this.sliderContainers.weight.classList.toggle(
          "disabled",
          !this.controls.filterWeight.checked
        );
      }
    }

    this.updateProfile = this.updateProfile.bind(this);
    this.calculateBMI = this.calculateBMI.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.updateSliderToMeans = this.updateSliderToMeans.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.setupEventListeners();
    this.calculateBMI();

    window.addEventListener("resize", this.handleResize);
    
    this.setupVisibilityObserver();

    dataService.onDataLoaded(() => {
      this.updateSliderToMeans();
      this.updateProfile();
      this.createInteractiveDistributionCurves();
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

          if (this.distributionUpdateTimeout) {
            clearTimeout(this.distributionUpdateTimeout);
          }

          this.distributionUpdateTimeout = setTimeout(() => {
            this.createInteractiveDistributionCurves();
          }, 100);

          this.handleInputChange();
        });
      }
    });

    ["sex"].forEach((id) => {
      const dropdown = this.controls[id];
      if (dropdown) {
        dropdown.addEventListener("change", () => {
          this.handleInputChange();
          this.createInteractiveDistributionCurves();
        });
      }
    });

    ["filterHeight", "filterWeight"].forEach((id) => {
      const checkbox = this.controls[id];
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          const controlName = id.replace("filter", "").toLowerCase();
          this.controls[controlName].disabled = !checkbox.checked;

          if (this.sliderContainers[controlName]) {
            this.sliderContainers[controlName].classList.toggle(
              "disabled",
              !checkbox.checked
            );
          }

          this.calculateBMI();
          this.handleInputChange();

          this.createInteractiveDistributionCurves();
        });
      }
    });
  }

  calculateBMI() {
    if (
      !this.controls.filterHeight.checked ||
      !this.controls.filterWeight.checked
    ) {
      this.controls.bmiValue.textContent = "N/A";
      return;
    }

    const height = parseInt(this.controls.height.value) / 100;
    const weight = parseInt(this.controls.weight.value);
    const bmi = weight / (height * height);
    this.controls.bmiValue.textContent = bmi.toFixed(1);

    const bmiValue = bmi.toFixed(1);
    this.controls.bmiValue.textContent = bmiValue;
  }

  handleInputChange() {
    this.updateProfile();
    this.createInteractiveDistributionCurves();
  }

  updateProfile() {
    if (!dataService.isLoaded) return;

    const params = {
      age: parseInt(this.controls.age.value),
      sex: this.controls.sex.value,
      asa: "any",
      height: this.controls.filterHeight.checked
        ? parseInt(this.controls.height.value)
        : null,
      weight: this.controls.filterWeight.checked
        ? parseInt(this.controls.weight.value)
        : null,
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
    this.container.appendChild(messageDiv);

    const icon = document.createElement("div");
    icon.innerHTML = "⚠️";
    icon.className = "warning-icon";
    messageDiv.appendChild(icon);

    const title = document.createElement("h3");
    title.textContent = "Insufficient Data";
    title.className = "warning-title";
    messageDiv.appendChild(title);

    const message = document.createElement("p");

    if (count === 0) {
      message.innerHTML =
        "No matching patient profiles found with your current criteria.<br>Please adjust your parameters to broaden your search.";
    } else {
      message.innerHTML = `Only <strong>${count}</strong> matching patient profiles found.<br>This is not enough data to make reliable predictions.<br>Please adjust your parameters to broaden your search.`;
    }
    messageDiv.appendChild(message);

    const heightFilterActive = this.controls.filterHeight.checked;
    const weightFilterActive = this.controls.filterWeight.checked;

    const suggestions = document.createElement("div");
    suggestions.className = "suggestions-box";

    let suggestionHTML = `
      <strong>Suggestions:</strong>
      <ul class="suggestions-list">
        <li>Try a different age range</li>
    `;

    if (heightFilterActive && weightFilterActive) {
      suggestionHTML += `
        <li>Uncheck one or both physical parameter filters</li>
      `;
    } else if (heightFilterActive || weightFilterActive) {
      suggestionHTML += `
        <li>Uncheck all physical parameter filters</li>
      `;
    } else {
      suggestionHTML += `
        <li>Adjust physical parameter filters</li>
      `;
    }

    suggestionHTML += `
        <li>Try a different sex selection</li>
      </ul>
    `;

    suggestions.innerHTML = suggestionHTML;
    messageDiv.appendChild(suggestions);
  }

  createVisualizations(profiles) {
    this.container.className = "profile-visualization-container";
    this.container.innerHTML = "";

    this.addSampleSizeInfo(profiles.length);
    this.createSummaryStats(profiles);

    const surgeriesSection = this.createContainer();
    this.container.appendChild(surgeriesSection);
    this.createSurgeryVisualization(surgeriesSection, profiles);

    const approachSection = this.createContainer();
    this.container.appendChild(approachSection);
    this.createApproachVisualization(approachSection, profiles);
  }

  createContainer(className) {
    const container = document.createElement("div");
    container.className = className || "results-section";
    return container;
  }

  createSummaryStats(profiles) {
    const statsSection = this.createContainer();

    const title = document.createElement("h3");
    title.textContent = "Summary statistics";
    title.className = "results-section-title";
    statsSection.appendChild(title);

    const statsGrid = document.createElement("div");
    statsGrid.className = "compact-stats-grid";
    statsSection.appendChild(statsGrid);

    const stats = [
      {
        label: "Surgery duration",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.opend - d.opstart),
          0,
          "min"
        ),
        icon: "⏱️",
      },
      {
        label: "ICU days",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.icu_days),
          1,
          "days"
        ),
        icon: "🏥",
      },
      {
        label: "Estimated blood loss",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.intraop_ebl),
          0,
          "mL"
        ),
        icon: "🩸",
      },
      {
        label: "Mortality rate",
        value: `${(d3.mean(profiles, (d) => d.death_inhosp) * 100).toFixed(
          1
        )}%`,
        icon: "⚠️",
      },
    ];

    stats.forEach((stat) => {
      const statCard = document.createElement("div");
      statCard.className = "compact-stat-card";
      statsGrid.appendChild(statCard);

      const contentWrapper = document.createElement("div");
      contentWrapper.className = "stat-content";
      statCard.appendChild(contentWrapper);

      const iconAndLabel = document.createElement("div");
      iconAndLabel.className = "stat-header";
      contentWrapper.appendChild(iconAndLabel);

      const icon = document.createElement("span");
      icon.textContent = stat.icon;
      icon.className = "stat-icon";
      iconAndLabel.appendChild(icon);

      const label = document.createElement("span");
      label.textContent = stat.label;
      label.className = "stat-label";
      iconAndLabel.appendChild(label);

      const value = document.createElement("div");
      value.textContent = stat.value;
      value.className = "stat-value";
      contentWrapper.appendChild(value);
    });

    this.container.appendChild(statsSection);
  }

  createSurgeryVisualization(container, profiles) {
    const title = document.createElement("h3");
    title.textContent = "Top 5 surgeries";
    title.className = "results-section-title";
    container.appendChild(title);

    const topSurgeries = d3
      .rollups(
        profiles,
        (v) => v.length,
        (d) => d.opname || "Unknown"
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const margin = { top: 10, right: 10, bottom: 40, left: 160 };
    const width = 400 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const chartWrapper = document.createElement("div");
    chartWrapper.className = "chart-wrapper";
    container.appendChild(chartWrapper);

    const svg = d3
      .select(chartWrapper)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .attr(
        "viewBox",
        `0 0 ${width + margin.left + margin.right} ${
          height + margin.top + margin.bottom
        }`
      )
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
      .style("font-size", "10px")
      .style("font-family", "var(--font-sans)");

    svg
      .append("text")
      .attr("x", width / 2)
      .attr("y", height + 30)
      .attr("text-anchor", "middle")
      .attr("fill", "var(--muted-foreground)")
      .style("font-size", "11px")
      .style("font-family", "var(--font-sans)")
      .text("Number of patients");

    const yAxis = svg
      .append("g")
      .call(d3.axisLeft(y))
      .style("font-size", "12px")
      .style("font-family", "var(--font-sans)");
      
    yAxis.selectAll(".tick text")
      .each(function (d) {
        let shortName = d;
        if (d.length > 25) {
          shortName = d.substring(0, 23) + "...";
        }
        
        d3.select(this)
          .text(shortName)
          .style("text-anchor", "end")
          .attr("dx", "-0.5em")
          .style("cursor", "pointer")
          .style("fill", "var(--primary)")
          .style("text-decoration", "underline")
          .on("click", function() {
            const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(d)}+surgery`;
            window.open(searchUrl, '_blank');
          });
          
        d3.select(this).append("title")
          .text(d);
      });

    const totalPatients = d3.sum(topSurgeries, (d) => d[1]);

    const surgeryBarColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary")
      .trim();

    svg
      .selectAll("rect")
      .data(topSurgeries)
      .enter()
      .append("rect")
      .attr("y", (d) => y(d[0]))
      .attr("height", y.bandwidth())
      .attr("x", 0)
      .attr("width", (d) => x(d[1]))
      .attr("fill", surgeryBarColor)
      .attr("rx", 4)
      .attr("ry", 4);

    svg
      .selectAll(".bar-label")
      .data(topSurgeries)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("y", (d) => y(d[0]) + y.bandwidth() / 2)
      .attr("x", (d) => {
        const barWidth = x(d[1]);
        const percentage = ((d[1] / totalPatients) * 100).toFixed(1);
        const labelText = `${d[1]} (${percentage}%)`;
        const textWidth = labelText.length * 6;

        if (barWidth > textWidth + 10) {
          return barWidth - 8;
        }
        return barWidth + 5;
      })
      .attr("text-anchor", (d) => {
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
      .style("font-size", "10px")
      .style("font-family", "var(--font-mono)")
      .style("fill", (d) => {
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
      .text((d) => {
        const percentage = ((d[1] / totalPatients) * 100).toFixed(1);
        return `${d[1]} (${percentage}%)`;
      });
  }

  createApproachVisualization(container, profiles) {
    const title = document.createElement("h3");
    title.textContent = "Surgical approaches";
    title.className = "results-section-title";
    container.appendChild(title);

    const approaches = d3
      .rollups(
        profiles,
        (v) => v.length,
        (d) => d.approach || "Unknown"
      )
      .map((d) => ({
        name: d[0],
        value: d[1],
        percentage: (d[1] / profiles.length) * 100,
      }))
      .sort((a, b) => b.value - a.value);

    const total = profiles.length;

    const chartContainer = document.createElement("div");
    chartContainer.className = "approach-chart-container";
    container.appendChild(chartContainer);

    const pieContainer = document.createElement("div");
    pieContainer.className = "pie-chart-container";
    pieContainer.style.flex = "0 0 auto";
    chartContainer.appendChild(pieContainer);

    const width = 150;
    const height = 150;
    const radius = Math.min(width, height) / 2;

    const svgContainer = document.createElement("div");
    svgContainer.className = "chart-wrapper";
    pieContainer.appendChild(svgContainer);

    const svg = d3
      .select(svgContainer)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("max-width", "100%")
      .style("height", "auto")
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const chartColors = [
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-accent-3")
        .trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-accent-2")
        .trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-accent-1")
        .trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-accent-4")
        .trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-accent-5")
        .trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-1")
        .trim(),
      getComputedStyle(document.documentElement)
        .getPropertyValue("--chart-color-2")
        .trim(),
    ];

    const color = d3
      .scaleOrdinal()
      .domain(approaches.map((d) => d.name))
      .range(chartColors);

    const pie = d3
      .pie()
      .value((d) => d.value)
      .sort(null);

    const arcGenerator = d3
      .arc()
      .innerRadius(radius * 0.5)
      .outerRadius(radius * 0.8)
      .cornerRadius(3)
      .padAngle(0.02);

    const hoverArc = d3
      .arc()
      .innerRadius(radius * 0.45)
      .outerRadius(radius * 0.85)
      .cornerRadius(4)
      .padAngle(0.02);

    const arcs = svg
      .selectAll("path")
      .data(pie(approaches))
      .enter()
      .append("path")
      .attr("d", arcGenerator)
      .attr("fill", (d) => color(d.data.name))
      .attr("stroke", "var(--background)")
      .attr("stroke-width", 1)
      .style("transition", "all 0.2s ease")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("d", hoverArc).attr("stroke-width", 2);

        centerText
          .text(`${d.data.percentage.toFixed(1)}%`)
          .attr("fill", color(d.data.name));

        centerLabel.text(d.data.name);
      })
      .on("mouseout", function () {
        d3.select(this).attr("d", arcGenerator).attr("stroke-width", 1);

        centerText.text(`${total}`);
        centerLabel.text("surgeries");
      });

    const centerText = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("font-size", "1rem")
      .attr("font-weight", "500")
      .attr("fill", "var(--foreground)")
      .style("font-family", "var(--font-mono)")
      .text(`${total}`);

    const centerLabel = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("font-size", "0.75rem")
      .attr("fill", "var(--muted-foreground)")
      .style("font-family", "var(--font-sans)")
      .text("surgeries");

    const legendContainer = document.createElement("div");
    legendContainer.className = "approach-legend-container";
    legendContainer.style.flex = "1";
    legendContainer.style.display = "flex";
    legendContainer.style.flexDirection = "column";
    legendContainer.style.gap = "6px";
    legendContainer.style.fontSize = "0.85rem";
    legendContainer.style.fontFamily = "var(--font-sans)";
    legendContainer.style.overflow = "auto";
    legendContainer.style.maxHeight = "150px";
    legendContainer.style.marginLeft = "16px";
    legendContainer.style.alignSelf = "center";
    chartContainer.appendChild(legendContainer);

    approaches.forEach((d) => {
      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.style.padding = "3px 5px";
      item.style.borderRadius = "var(--radius)";
      item.style.cursor = "pointer";
      item.style.fontSize = "0.8rem";
      item.style.transition = "background-color 0.15s ease";
      legendContainer.appendChild(item);

      const colorBox = document.createElement("div");
      colorBox.style.width = "12px";
      colorBox.style.height = "12px";
      colorBox.style.backgroundColor = color(d.name);
      colorBox.style.borderRadius = "2px";
      colorBox.style.flexShrink = "0";
      item.appendChild(colorBox);

      const label = document.createElement("div");
      label.style.flex = "1";
      label.style.display = "flex";
      label.style.justifyContent = "space-between";
      label.style.alignItems = "center";
      label.style.width = "100%";
      label.style.gap = "8px";
      item.appendChild(label);

      const name = document.createElement("span");
      name.textContent = d.name;
      name.style.fontWeight = "500";
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      label.appendChild(name);

      const percent = document.createElement("span");
      percent.textContent = `${d.percentage.toFixed(1)}%`;
      percent.style.fontWeight = "500";
      percent.style.color = "var(--primary)";
      percent.style.fontFamily = "var(--font-mono)";
      percent.style.whiteSpace = "nowrap";
      percent.style.flexShrink = "0";
      label.appendChild(percent);

      item.addEventListener("mouseover", () => {
        svg.selectAll("path").each(function (pieData) {
          if (pieData.data.name === d.name) {
            d3.select(this).attr("d", hoverArc).attr("stroke-width", 2);

            centerText
              .text(`${d.percentage.toFixed(1)}%`)
              .attr("fill", color(d.name));

            centerLabel.text(d.name);
          }
        });

        item.style.backgroundColor = "var(--accent)";
      });

      item.addEventListener("mouseout", () => {
        svg.selectAll("path").attr("d", arcGenerator).attr("stroke-width", 1);

        centerText.text(`${total}`);
        centerLabel.text("surgeries");

        item.style.backgroundColor = "transparent";
      });
    });
  }

  addSampleSizeInfo(count) {
    const sampleInfoDiv = document.createElement("div");
    sampleInfoDiv.className = "sample-info";

    const totalPatients = dataService.getData().length;
    const percentage = ((count / totalPatients) * 100).toFixed(1);

    const sampleText = document.createElement("p");
    sampleText.className = "sample-text";
    sampleText.innerHTML = `Analysis based on <strong style="font-family: var(--font-mono);">${count}</strong> similar patient profiles <span style="color: var(--muted-foreground);">(<span style="font-family: var(--font-mono);">${percentage}%</span> of total)</span>`;

    sampleInfoDiv.appendChild(sampleText);
    this.container.appendChild(sampleInfoDiv);
  }

  createVisualizationsWithWarning(profiles) {
    this.container.className = "profile-visualization-container";
    this.container.innerHTML = "";

    const warningSection = document.createElement("div");
    warningSection.className = "warning-message";

    const warningText = document.createElement("span");
    warningText.innerHTML = `⚠️ Results based on limited data. May be less reliable.`;
    warningSection.appendChild(warningText);

    this.container.appendChild(warningSection);
    this.addSampleSizeInfo(profiles.length);
    this.createSummaryStats(profiles);

    const surgeriesSection = this.createContainer();
    this.container.appendChild(surgeriesSection);
    this.createSurgeryVisualization(surgeriesSection, profiles);

    const approachSection = this.createContainer();
    this.container.appendChild(approachSection);
    this.createApproachVisualization(approachSection, profiles);
  }

  createInteractiveDistributionCurves() {
    const fullData = dataService.getData();
    if (!fullData || fullData.length === 0) return;
    
    const currentAge = parseInt(this.controls.age.value);
    const currentSex = this.controls.sex.value;
    const currentHeight = parseInt(this.controls.height.value);
    const currentWeight = parseInt(this.controls.weight.value);
    
    let filteredBySex = [...fullData];
    if (currentSex !== 'all') {
      filteredBySex = filteredBySex.filter(d => d.sex === currentSex);
    }
    
    const ageHistogram = this.getFilteredData(filteredBySex, { excludeParam: 'age' });
    const heightHistogram = this.getFilteredData(filteredBySex, { excludeParam: 'height' });
    const weightHistogram = this.getFilteredData(filteredBySex, { excludeParam: 'weight' });
    
    const ageData = this.getFilteredData(fullData, { 
      excludeParam: 'age',
      sex: currentSex, 
      height: this.controls.filterHeight.checked ? currentHeight : null, 
      weight: this.controls.filterWeight.checked ? currentWeight : null 
    });
    
    const heightData = this.getFilteredData(fullData, { 
      excludeParam: 'height',
      age: currentAge, 
      sex: currentSex, 
      weight: this.controls.filterWeight.checked ? currentWeight : null 
    });
    
    const weightData = this.getFilteredData(fullData, { 
      excludeParam: 'weight',
      age: currentAge, 
      sex: currentSex, 
      height: this.controls.filterHeight.checked ? currentHeight : null 
    });
    
    const ageCount = ageHistogram.length;
    const heightCount = heightHistogram.length;
    const weightCount = weightHistogram.length;
    const maxCount = Math.max(ageCount, heightCount, weightCount);
    
    const MIN_HEIGHT_SCALE = 0.35;
    
    const ageScale = Math.max(MIN_HEIGHT_SCALE, ageCount/maxCount);
    const heightScale = Math.max(MIN_HEIGHT_SCALE, heightCount/maxCount);
    const weightScale = Math.max(MIN_HEIGHT_SCALE, weightCount/maxCount);
    
    const useFilteredData = 
      (currentSex !== 'all') || 
      (this.controls.filterHeight.checked) ||
      (this.controls.filterWeight.checked);
    
    this.createDistributionCurve("age", ageData, 0, 100, useFilteredData, ageScale);
    this.createDistributionCurve("height", heightData, 100, 220, useFilteredData, heightScale);
    this.createDistributionCurve("weight", weightData, 0, 200, useFilteredData, weightScale);
  }

  getFilteredData(data, filters) {
    let filteredData = [...data];
    
    if (filters.sex && filters.sex !== 'all') {
      filteredData = filteredData.filter(d => d.sex === filters.sex);
    }
    
    if (filters.age !== undefined && filters.excludeParam !== 'age') {
      const ageRange = 10;
      filteredData = filteredData.filter(d => 
        d.age >= filters.age - ageRange && 
        d.age <= filters.age + ageRange
      );
    }
    
    if (filters.height !== null && filters.height !== undefined && filters.excludeParam !== 'height') {
      const heightRange = 10;
      filteredData = filteredData.filter(d => 
        d.height >= filters.height - heightRange && 
        d.height <= filters.height + heightRange
      );
    }
    
    if (filters.weight !== null && filters.weight !== undefined && filters.excludeParam !== 'weight') {
      const weightRange = 10;
      filteredData = filteredData.filter(d => 
        d.weight >= filters.weight - weightRange && 
        d.weight <= filters.weight + weightRange
      );
    }
    
    filteredData.isEmptyResult = filteredData.length < 10;
    
    return filteredData;
  }

  createDistributionCurve(attribute, data, min, max, isFiltered = false, heightScale = 1.0) {
    const container = this.controls[`${attribute}Distribution`];
    if (!container) return;

    const MIN_HEIGHT_SCALE = 0.35;
    heightScale = Math.max(MIN_HEIGHT_SCALE, heightScale);

    d3.select(container).selectAll("*").remove();

    if (container.clientWidth <= 0) {
      requestAnimationFrame(() => {
        if (container.clientWidth > 0) {
          this.createDistributionCurve(attribute, data, min, max, isFiltered, heightScale);
        } else {
          setTimeout(() => {
            this.createDistributionCurve(attribute, data, min, max, isFiltered, heightScale);
          }, 100);
        }
      });
      return;
    }
    
    container.classList.toggle('filtered-distribution', isFiltered && !data.isEmptyResult);
    
    container.classList.toggle('empty-distribution', data.isEmptyResult);

    if ((attribute === 'height' && !this.controls.filterHeight.checked) ||
        (attribute === 'weight' && !this.controls.filterWeight.checked)) {
    }

    const values = data.map(d => d[attribute]).filter(d => d >= min && d <= max);
    
    const margin = { top: 5, right: 0, bottom: 0, left: 0 };
    const width = container.clientWidth;
    const height = container.clientHeight - margin.top - margin.bottom;

    const svg = d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", height + margin.top + margin.bottom)
      .style("display", "block")
      .append("g")
      .attr("transform", `translate(0,${margin.top})`);
    
    if (data.isEmptyResult) {
      svg.append("line")
        .attr("class", "empty-distribution-line")
        .attr("x1", 0)
        .attr("y1", height / 2)
        .attr("x2", width)
        .attr("y2", height / 2);
      
      return;
    }
    
    try {
      const histogram = d3.histogram()
        .domain([min, max])
        .thresholds(20)
        (values);
        
      const effectiveHeight = height * heightScale;
      
      const x = d3.scaleLinear()
        .domain([min, max])
        .range([0, width]);

      const y = d3.scaleLinear()
        .domain([0, d3.max(histogram, d => d.length) || 1])
        .nice()
        .range([height, height - effectiveHeight]);

      svg.append("defs")
        .append("clipPath")
        .attr("id", `clip-${attribute}`)
        .append("rect")
        .attr("width", width)
        .attr("height", height);

      const chartGroup = svg.append("g")
        .attr("clip-path", `url(#clip-${attribute})`);
        
      const line = d3.line()
        .curve(d3.curveBasis)
        .x(d => x(d.x0 + (d.x1 - d.x0) / 2))
        .y(d => y(d.length));

      const area = d3.area()
        .curve(d3.curveBasis)
        .x(d => x(d.x0 + (d.x1 - d.x0) / 2))
        .y0(height)
        .y1(d => y(d.length));

      chartGroup.append("path")
        .datum(histogram)
        .attr("class", "distribution-curve")
        .attr("d", area);

      chartGroup.append("path")
        .datum(histogram)
        .attr("class", "distribution-curve-line")
        .attr("d", line);
        
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      chartGroup.append("line")
        .attr("class", "mean-line")
        .attr("x1", x(mean))
        .attr("y1", height - effectiveHeight)
        .attr("x2", x(mean))
        .attr("y2", height)
        .attr("stroke", "var(--muted-foreground)")
        .attr("stroke-width", "1")
        .attr("stroke-dasharray", "2,2")
        .attr("opacity", "0.5");
    } catch (error) {
      console.error(`Error creating distribution curve for ${attribute}:`, error);
    }
  }

  createDistributionCurves() {
    const data = dataService.getData();
    
    this.createDistributionCurve("age", data, 0, 100, false, 1.0);
    this.createDistributionCurve("height", data, 100, 220, false, 1.0);
    this.createDistributionCurve("weight", data, 0, 200, false, 1.0);
  }

  updateSliderToMeans() {
    const data = dataService.getData();
    if (!data || data.length === 0) return;

    const calculateMean = (attribute) => {
      const values = data
        .map((d) => d[attribute])
        .filter((v) => !isNaN(v) && v > 0);
      return values.length
        ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length)
        : 0;
    };

    const meanAge = calculateMean("age");
    if (meanAge && this.controls.age) {
      this.controls.age.value = meanAge;
      this.controls.ageValue.textContent = meanAge;
    }

    const meanHeight = calculateMean("height");
    if (meanHeight && this.controls.height) {
      this.controls.height.value = meanHeight;
      this.controls.heightValue.textContent = meanHeight;
    }

    const meanWeight = calculateMean("weight");
    if (meanWeight && this.controls.weight) {
      this.controls.weight.value = meanWeight;
      this.controls.weightValue.textContent = meanWeight;
    }

    this.calculateBMI();
  }

  handleResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    this.resizeTimeout = setTimeout(() => {
      this.createInteractiveDistributionCurves();
    }, 250);
  }

  setupVisibilityObserver() {
    const vizProfile = document.getElementById("viz-profile");
    if (!vizProfile) return;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isVisible = vizProfile.classList.contains("active");
          if (isVisible) {
            setTimeout(() => {
              this.createInteractiveDistributionCurves();
            }, 50);
          }
        }
      });
    });
    
    observer.observe(vizProfile, { attributes: true });
  }
}
