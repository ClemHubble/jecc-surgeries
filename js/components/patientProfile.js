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
    };

    if (this.controls.height && this.controls.filterHeight) {
      this.controls.height.disabled = !this.controls.filterHeight.checked;
    }

    if (this.controls.weight && this.controls.filterWeight) {
      this.controls.weight.disabled = !this.controls.filterWeight.checked;
    }

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

    ["sex"].forEach((id) => {
      const dropdown = this.controls[id];
      if (dropdown) {
        dropdown.addEventListener("change", this.handleInputChange);
      }
    });

    ["filterHeight", "filterWeight"].forEach((id) => {
      const checkbox = this.controls[id];
      if (checkbox) {
        checkbox.addEventListener("change", () => {
          const controlName = id.replace("filter", "").toLowerCase();
          this.controls[controlName].disabled = !checkbox.checked;

          this.calculateBMI();
          this.handleInputChange();
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
  }

  handleInputChange() {
    this.updateProfile();
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
    title.textContent = "Summary Statistics";
    title.className = "results-section-title";
    statsSection.appendChild(title);

    const statsGrid = document.createElement("div");
    statsGrid.style.display = "grid";
    statsGrid.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(200px, 1fr))";
    statsGrid.style.gap = "15px";
    statsSection.appendChild(statsGrid);

    const stats = [
      {
        label: "Surgery Duration",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.opend - d.opstart),
          0,
          "min"
        ),
        icon: "⏱️",
      },
      {
        label: "ICU Days",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.icu_days),
          1,
          "days"
        ),
        icon: "🏥",
      },
      {
        label: "Estimated Blood Loss",
        value: Formatters.formatStat(
          d3.mean(profiles, (d) => d.intraop_ebl),
          0,
          "mL"
        ),
        icon: "🩸",
      },
      {
        label: "Mortality Rate",
        value: `${(d3.mean(profiles, (d) => d.death_inhosp) * 100).toFixed(
          1
        )}%`,
        icon: "📊",
      },
    ];

    stats.forEach((stat) => {
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
      value.style.fontFamily = "var(--font-mono)";
      value.style.marginBottom = "5px";
      statCard.appendChild(value);

      const label = document.createElement("div");
      label.textContent = stat.label;
      label.style.fontSize = "0.875rem";
      label.style.color = "var(--muted-foreground)";
      statCard.appendChild(label);
    });

    this.container.appendChild(statsSection);
  }

  createSurgeryVisualization(container, profiles) {
    const title = document.createElement("h3");
    title.textContent = "Top Surgeries";
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

    const margin = { top: 10, right: 80, bottom: 40, left: 160 };
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
      .style("font-size", "10px");

    svg
      .append("text")
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
      .each(function (d) {
        let shortName = d;
        if (d.length > 25) {
          shortName = d.substring(0, 23) + "...";
        }
        d3.select(this).text(shortName);
      })
      .style("text-anchor", "end")
      .attr("dx", "-0.5em")
      .append("title")
      .text((d) => d);

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
      .style("font-size", "9px")
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

    svg
      .selectAll("rect")
      .on("mouseover", function (event, d) {
        d3.select(this).attr("fill", "var(--destructive)").attr("opacity", 0.8);
      })
      .on("mouseout", function (event, d) {
        d3.select(this).attr("fill", surgeryBarColor).attr("opacity", 1);
      });
  }

  createApproachVisualization(container, profiles) {
    const title = document.createElement("h3");
    title.textContent = "Surgical Approaches";
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

    const width = 125;
    const height = 125;
    const radius = Math.min(width, height) / 2;

    const chartContainer = document.createElement("div");
    chartContainer.className = "approach-chart-container";
    container.appendChild(chartContainer);

    const svgContainer = document.createElement("div");
    svgContainer.className = "chart-wrapper";
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
      .attr("font-weight", "bold")
      .attr("fill", "var(--foreground)")
      .style("font-family", "var(--font-mono)")
      .text(`${total}`);

    const centerLabel = svg
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("font-size", "0.75rem")
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

    approaches.forEach((d) => {
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
      colorBox.style.backgroundColor = color(d.name);
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
      name.textContent = d.name;
      name.style.fontWeight = "500";
      label.appendChild(name);

      const percent = document.createElement("span");
      percent.textContent = `${d.percentage.toFixed(1)}%`;
      percent.style.fontWeight = "bold";
      percent.style.color = "var(--primary)";
      percent.style.fontFamily = "var(--font-mono)";
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

    const warningContent = document.createElement("div");
    warningContent.style.display = "flex";
    warningContent.style.alignItems = "center";
    warningContent.style.gap = "var(--space-3)";
    warningSection.appendChild(warningContent);

    const warningIcon = document.createElement("span");
    warningIcon.textContent = "⚠️";
    warningIcon.style.fontSize = "1rem";
    warningContent.appendChild(warningIcon);

    const warningText = document.createElement("span");
    warningText.innerHTML = `<strong>Limited Data:</strong> Results based on only ${profiles.length} profiles. May be less reliable.`;
    warningContent.appendChild(warningText);
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
}
