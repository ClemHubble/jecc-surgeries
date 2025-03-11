class DimensionsExplorer {
  constructor(containerId) {
    this.chartContainer = document.getElementById(containerId);
    if (!this.chartContainer) {
      console.error(`Container element with ID '${containerId}' not found`);
      return;
    }

    this.tooltipId = "dimensions-explorer-tooltip";
    
    const existingTooltip = document.getElementById(this.tooltipId);
    if (existingTooltip) {
      existingTooltip.remove();
    }
    
    this.tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip")
      .attr("id", this.tooltipId)
      .style("opacity", 0)
      .style("position", "fixed")
      .style("background", "rgba(255, 255, 255, 0.95)")
      .style("border-radius", "6px")
      .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.15)")
      .style("padding", "12px")
      .style("font-size", "14px")
      .style("line-height", "1.4")
      .style("pointer-events", "none")
      .style("max-width", "280px")
      .style("z-index", "1000")
      .style("border", "1px solid rgba(0, 0, 0, 0.1)");

    this.elements = {
      xAxis: document.getElementById("x-axis"),
      yAxis: document.getElementById("y-axis"),
      colorBy: document.getElementById("color-by"),
      sizeBy: document.getElementById("size-by"),
      ageMin: document.getElementById("age-min"),
      ageMax: document.getElementById("age-max"),
      ageRangeMin: document.getElementById("age-range-min"),
      ageRangeMax: document.getElementById("age-range-max"),
      agePresetButtons: document.querySelectorAll(".preset-btn"),
      activePreset: null,
      legend: document.getElementById("dimension-legend"),
      stats: {
        count: document.getElementById("selected-count"),
        age: document.getElementById("selected-age"),
        duration: document.getElementById("selected-duration"),
        mortality: document.getElementById("selected-mortality"),
      },
    };

    this.surgeryControls = {
      surgerySearch: document.getElementById("dimensions-surgery-search"),
      surgerySelect: document.getElementById("dimensions-surgery-select"),
      comboboxDisplay: document.getElementById("dimensions-surgery-combobox-display"),
      comboboxValue: document.querySelector("#dimensions-surgery-combobox-display .combobox-value"),
      comboboxDropdown: document.getElementById("dimensions-surgery-combobox-dropdown"),
      comboboxSearch: document.getElementById("dimensions-surgery-combobox-search"),
      comboboxOptions: document.getElementById("dimensions-surgery-combobox-options"),
      comboboxContainer: document.getElementById("dimensions-surgery-combobox-container"),
    };

    this.surgeryComboboxState = {
      isOpen: false,
      selectedIndex: -1,
      options: [],
      filteredOptions: [],
    };
    
    this.selectedSurgery = null;

    this.chart = {
      svg: null,
      width: 0,
      height: 0,
      margin: { top: 20, right: 30, bottom: 50, left: 60 },
      xScale: null,
      yScale: null,
      colorScale: null,
      radiusScale: null,
      pointsGroup: null,
    };

    this.initializeChart();

    this.updateChart = this.updateChart.bind(this);
    this.handleFiltersChange = this.handleFiltersChange.bind(this);

    this.setupEventListeners();

    dataService.onDataLoaded(() => {
      this.populateSurgeryOptions();
      this.updateChart();
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeChart();
      this.updateChart();
      this.hideAllTooltips();
    });
    this.resizeObserver.observe(this.chartContainer);
  }

  initializeChart() {
    this.chart.width = this.chartContainer.clientWidth;
    this.chart.height = 500;

    this.chart.svg = d3
      .select(this.chartContainer)
      .append("svg")
      .attr("width", this.chart.width)
      .attr("height", this.chart.height)
      .append("g")
      .attr(
        "transform",
        `translate(${this.chart.margin.left},${this.chart.margin.top})`
      );

    this.chart.svg
      .append("rect")
      .attr(
        "width",
        this.chart.width - this.chart.margin.left - this.chart.margin.right
      )
      .attr(
        "height",
        this.chart.height - this.chart.margin.top - this.chart.margin.bottom
      )
      .attr("fill", "var(--background)")
      .attr("rx", 5);

    this.chart.svg
      .append("g")
      .attr("class", "x-axis")
      .attr(
        "transform",
        `translate(0,${
          this.chart.height - this.chart.margin.top - this.chart.margin.bottom
        })`
      );

    this.chart.svg.append("g").attr("class", "y-axis");

    this.chart.svg
      .append("text")
      .attr("class", "x-label")
      .attr("fill", "var(--muted-foreground)")
      .attr("text-anchor", "middle")
      .attr(
        "x",
        (this.chart.width - this.chart.margin.left - this.chart.margin.right) /
          2
      )
      .attr(
        "y",
        this.chart.height -
          this.chart.margin.top -
          this.chart.margin.bottom +
          40
      )
      .style("font-size", "12px");

    this.chart.svg
      .append("text")
      .attr("class", "y-label")
      .attr("fill", "var(--muted-foreground)")
      .attr("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .attr(
        "x",
        -(
          this.chart.height -
          this.chart.margin.top -
          this.chart.margin.bottom
        ) / 2
      )
      .attr("y", -40)
      .style("font-size", "12px");

    this.chart.svg
      .append("defs")
      .append("clipPath")
      .attr("id", "chart-area")
      .append("rect")
      .attr(
        "width",
        this.chart.width - this.chart.margin.left - this.chart.margin.right
      )
      .attr(
        "height",
        this.chart.height - this.chart.margin.top - this.chart.margin.bottom
      );

    this.chart.pointsGroup = this.chart.svg
      .append("g")
      .attr("class", "points-group")
      .attr("clip-path", "url(#chart-area)");
  }

  populateSurgeryOptions() {
    if (!dataService.isLoaded || !this.surgeryControls.surgerySelect) return;

    try {
      const surgeryCounts = d3.rollup(
        dataService.data.filter((d) => d.opname && d.opname.trim() !== ""),
        (v) => v.length,
        (d) => d.opname
      );

      const surgeries = Array.from(surgeryCounts, ([name, count]) => ({
        name,
        count,
      })).sort((a, b) => b.count - a.count);

      this.surgeryComboboxState.options = surgeries;
      this.surgeryComboboxState.filteredOptions = surgeries;

      this.surgeryControls.surgerySelect.innerHTML = "";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "All surgeries";
      this.surgeryControls.surgerySelect.appendChild(defaultOption);

      surgeries.forEach((surgery) => {
        const option = document.createElement("option");
        option.value = surgery.name;
        option.textContent = `${surgery.name} (${surgery.count} cases)`;
        this.surgeryControls.surgerySelect.appendChild(option);
      });

      this.populateComboboxDropdown();
    } catch (error) {
      console.error("Error populating surgery options:", error);
    }
  }

  populateComboboxDropdown(filterText = "") {
    if (!this.surgeryControls.comboboxOptions) return;

    this.surgeryControls.comboboxOptions.innerHTML = "";

    const searchText = filterText.toLowerCase().trim();
    this.surgeryComboboxState.filteredOptions = this.surgeryComboboxState.options.filter(
      (surgery) => surgery.name.toLowerCase().includes(searchText)
    );

    if (this.surgeryComboboxState.filteredOptions.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "combobox-no-results";
      noResults.textContent = "No surgeries found";
      this.surgeryControls.comboboxOptions.appendChild(noResults);
      return;
    }

    this.surgeryComboboxState.filteredOptions.forEach((surgery, index) => {
      const option = document.createElement("div");
      option.className = "combobox-option";
      option.dataset.value = surgery.name;
      option.dataset.index = index;
      option.textContent = `${surgery.name} (${surgery.count} cases)`;

      if (surgery.name === this.selectedSurgery) {
        option.classList.add("selected");
        this.surgeryComboboxState.selectedIndex = index;
      }

      option.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectComboboxOption(surgery.name, index);
      });

      this.surgeryControls.comboboxOptions.appendChild(option);
    });

    if (this.surgeryComboboxState.selectedIndex >= 0) {
      setTimeout(() => {
        const selectedOption = this.surgeryControls.comboboxOptions.querySelector(
          ".combobox-option.selected"
        );
        if (selectedOption) {
          selectedOption.scrollIntoView({ block: "nearest" });
        }
      }, 0);
    }
  }

  toggleCombobox() {
    if (this.surgeryComboboxState.isOpen) {
      this.closeCombobox();
    } else {
      this.openCombobox();
    }
  }

  openCombobox() {
    if (!this.surgeryControls.comboboxDropdown) return;

    this.surgeryComboboxState.isOpen = true;

    this.surgeryControls.comboboxDropdown.classList.add("show");

    if (this.surgeryControls.comboboxSearch) {
      this.surgeryControls.comboboxSearch.value = "";

      this.populateComboboxDropdown("");

      setTimeout(() => {
        this.surgeryControls.comboboxSearch.focus();
      }, 10);
    }
  }

  closeCombobox() {
    if (!this.surgeryControls.comboboxDropdown) return;

    this.surgeryComboboxState.isOpen = false;

    this.surgeryControls.comboboxDropdown.classList.remove("show");
  }

  handleSurgerySelection() {
    const select = this.surgeryControls.surgerySelect;
    this.selectedSurgery = select ? select.value : null;

    if (this.selectedSurgery && this.surgeryControls.comboboxValue) {
      this.surgeryControls.comboboxValue.textContent = this.selectedSurgery;
      this.surgeryControls.comboboxValue.classList.remove("placeholder");
    } else {
      this.surgeryControls.comboboxValue.textContent = "All surgeries";
      this.surgeryControls.comboboxValue.classList.add("placeholder");
    }

    this.updateChart();
  }

  handleComboboxInput(value) {
    if (this.surgeryControls.surgerySearch) {
      this.surgeryControls.surgerySearch.value = value;
    }

    this.populateComboboxDropdown(value);
  }

  handleComboboxKeydown(e) {
    const { filteredOptions, selectedIndex } = this.surgeryComboboxState;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (selectedIndex < filteredOptions.length - 1) {
          this.highlightComboboxOption(selectedIndex + 1);
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (selectedIndex > 0) {
          this.highlightComboboxOption(selectedIndex - 1);
        }
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0) {
          const option = this.surgeryComboboxState.filteredOptions[selectedIndex];
          if (option) {
            this.selectComboboxOption(option.name, selectedIndex);
          }
        }
        break;

      case "Escape":
        e.preventDefault();
        this.closeCombobox();
        break;

      case "Tab":
        this.closeCombobox();
        break;
    }
  }

  highlightComboboxOption(index) {
    if (!this.surgeryControls.comboboxOptions) return;

    const options = this.surgeryControls.comboboxOptions.querySelectorAll(".combobox-option");
    options.forEach((option) => option.classList.remove("highlighted"));

    if (index >= 0 && index < options.length) {
      options[index].classList.add("highlighted");
      this.surgeryComboboxState.selectedIndex = index;
      options[index].scrollIntoView({ block: "nearest" });
    }
  }

  selectComboboxOption(value, index) {
    if (this.surgeryControls.comboboxValue) {
      if (value) {
        this.surgeryControls.comboboxValue.textContent = value;
        this.surgeryControls.comboboxValue.classList.remove("placeholder");
      } else {
        this.surgeryControls.comboboxValue.textContent = "All surgeries";
        this.surgeryControls.comboboxValue.classList.add("placeholder");
      }
    }

    if (this.surgeryControls.surgerySelect) {
      this.surgeryControls.surgerySelect.value = value || "";
    }

    this.closeCombobox();

    this.selectedSurgery = value || null;
    this.updateChart();

    this.surgeryComboboxState.selectedIndex = index;
  }

  setupEventListeners() {
    const dimensionSelectors = [
      this.elements.xAxis,
      this.elements.yAxis,
      this.elements.colorBy,
      this.elements.sizeBy,
    ];

    dimensionSelectors.forEach((selector) => {
      if (selector) {
        selector.addEventListener("change", this.updateChart);
      }
    });

    if (
      this.elements.ageMin &&
      this.elements.ageMax &&
      this.elements.ageRangeMin &&
      this.elements.ageRangeMax
    ) {
      this.elements.ageMin.addEventListener("input", () => {
        const minValue = parseInt(this.elements.ageMin.value);
        const maxValue = parseInt(this.elements.ageMax.value);

        this.elements.ageRangeMin.value = minValue;

        if (minValue > maxValue) {
          this.elements.ageMax.value = minValue;
          this.elements.ageRangeMax.value = minValue;
        }

        this.clearActivePreset();
        this.handleFiltersChange();
      });

      this.elements.ageMax.addEventListener("input", () => {
        const minValue = parseInt(this.elements.ageMin.value);
        const maxValue = parseInt(this.elements.ageMax.value);

        this.elements.ageRangeMax.value = maxValue;

        if (maxValue < minValue) {
          this.elements.ageMin.value = maxValue;
          this.elements.ageRangeMin.value = maxValue;
        }

        this.clearActivePreset();
        this.handleFiltersChange();
      });

      this.elements.ageRangeMin.addEventListener("input", () => {
        const minValue = parseInt(this.elements.ageRangeMin.value);
        const maxValue = parseInt(this.elements.ageRangeMax.value);

        this.elements.ageMin.value = minValue;

        if (minValue > maxValue) {
          this.elements.ageMax.value = minValue;
          this.elements.ageRangeMax.value = minValue;
        }

        this.clearActivePreset();
        this.handleFiltersChange();
      });

      this.elements.ageRangeMax.addEventListener("input", () => {
        const minValue = parseInt(this.elements.ageRangeMin.value);
        const maxValue = parseInt(this.elements.ageRangeMax.value);

        this.elements.ageMax.value = maxValue;

        if (maxValue < minValue) {
          this.elements.ageMin.value = maxValue;
          this.elements.ageRangeMin.value = maxValue;
        }

        this.clearActivePreset();
        this.handleFiltersChange();
      });
    }

    if (
      this.elements.agePresetButtons &&
      this.elements.agePresetButtons.length > 0
    ) {
      this.elements.agePresetButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const min = parseInt(btn.dataset.min);
          const max = parseInt(btn.dataset.max);

          if (btn.classList.contains("active")) {
            this.clearActivePreset();
            this.setAgeRange(0, 100);
          } else {
            this.clearActivePreset();

            btn.classList.add("active");
            this.elements.activePreset = btn;

            this.setAgeRange(min, max);
          }

          this.handleFiltersChange();
        });
      });
    }

    if (this.surgeryControls.surgerySelect) {
      this.surgeryControls.surgerySelect.addEventListener(
        "change",
        this.handleSurgerySelection.bind(this)
      );
    }

    if (this.surgeryControls.comboboxDisplay) {
      this.surgeryControls.comboboxDisplay.addEventListener(
        "click",
        this.toggleCombobox.bind(this)
      );
    }

    if (this.surgeryControls.comboboxSearch) {
      this.surgeryControls.comboboxSearch.addEventListener("input", (e) => {
        this.handleComboboxInput(e.target.value);
      });

      this.surgeryControls.comboboxSearch.addEventListener(
        "keydown",
        this.handleComboboxKeydown.bind(this)
      );
    }

    document.addEventListener("click", (e) => {
      if (
        this.surgeryControls.comboboxContainer &&
        !this.surgeryControls.comboboxContainer.contains(e.target) &&
        this.surgeryComboboxState.isOpen
      ) {
        this.closeCombobox();
      }
    });
  }

  clearActivePreset() {
    if (
      this.elements.agePresetButtons &&
      this.elements.agePresetButtons.length > 0
    ) {
      this.elements.agePresetButtons.forEach((btn) => {
        btn.classList.remove("active");
      });
      this.elements.activePreset = null;
    }
  }

  setAgeRange(min, max) {
    if (
      this.elements.ageMin &&
      this.elements.ageMax &&
      this.elements.ageRangeMin &&
      this.elements.ageRangeMax
    ) {
      this.elements.ageMin.value = min;
      this.elements.ageMax.value = max;
      this.elements.ageRangeMin.value = min;
      this.elements.ageRangeMax.value = max;
    }
  }

  handleFiltersChange() {
    this.updateChart();
  }

  getFilterSettings() {
    return {
      ageMin: parseInt(this.elements.ageMin.value),
      ageMax: parseInt(this.elements.ageMax.value),
      selectedSurgery: this.selectedSurgery,
    };
  }

  resizeChart() {
    this.chart.width = this.chartContainer.clientWidth;
    this.chart.height = 500;

    d3.select(this.chartContainer)
      .select("svg")
      .attr("width", this.chart.width)
      .attr("height", 500);

    this.chart.svg
      .select("rect")
      .attr(
        "width",
        this.chart.width - this.chart.margin.left - this.chart.margin.right
      )
      .attr(
        "height",
        this.chart.height - this.chart.margin.top - this.chart.margin.bottom
      );

    this.chart.svg
      .select(".x-axis")
      .attr(
        "transform",
        `translate(0,${
          this.chart.height - this.chart.margin.top - this.chart.margin.bottom
        })`
      );

    this.chart.svg
      .select(".x-label")
      .attr("fill", "var(--muted-foreground)")
      .attr(
        "x",
        (this.chart.width - this.chart.margin.left - this.chart.margin.right) /
          2
      )
      .attr(
        "y",
        this.chart.height -
          this.chart.margin.top -
          this.chart.margin.bottom +
          40
      );
      
    this.chart.svg
      .select(".y-label")
      .attr("fill", "var(--muted-foreground)")
      .attr(
        "x",
        -(
          this.chart.height -
          this.chart.margin.top -
          this.chart.margin.bottom
        ) / 2
      );

    this.chart.svg
      .select("clipPath rect")
      .attr(
        "width",
        this.chart.width - this.chart.margin.left - this.chart.margin.right
      )
      .attr(
        "height",
        this.chart.height - this.chart.margin.top - this.chart.margin.bottom
      );
  }

  updateChart() {
    if (!dataService.isLoaded) return;

    this.chart.svg.selectAll(".no-data-text").remove();

    const xAxis = this.elements.xAxis.value;
    const yAxis = this.elements.yAxis.value;
    const colorBy = this.elements.colorBy.value;
    const sizeBy = this.elements.sizeBy.value;

    const filters = this.getFilterSettings();
    const filteredData = dataService.getDimensionsData(filters);

    if (filteredData.length === 0) {
      this.showNoDataMessage();
      return;
    }

    this.updateStats(filteredData);

    const xRange = DataProcessor.getDataRange(filteredData, xAxis);
    const yRange = DataProcessor.getDataRange(filteredData, yAxis);
    const sizeRange = DataProcessor.getDataRange(filteredData, sizeBy);

    this.chart.xScale = this.createScale(
      xRange,
      [0, this.chart.width - this.chart.margin.left - this.chart.margin.right],
      xAxis
    );

    this.chart.yScale = this.createScale(
      yRange,
      [this.chart.height - this.chart.margin.top - this.chart.margin.bottom, 0],
      yAxis
    );

    if (sizeBy === "none") {
      this.chart.radiusScale = () => 5;
    } else {
      this.chart.radiusScale = d3
        .scaleSqrt()
        .domain([sizeRange.min, sizeRange.max])
        .range([3, 15])
        .nice();
    }

    this.chart.colorScale = this.createColorScale(filteredData, colorBy);

    const xAxisGenerator = d3.axisBottom(this.chart.xScale);
    const yAxisGenerator = d3.axisLeft(this.chart.yScale);

    this.formatAxis(xAxisGenerator, xAxis);
    this.formatAxis(yAxisGenerator, yAxis);

    this.chart.svg
      .select(".x-axis")
      .transition()
      .duration(500)
      .call(xAxisGenerator);

    this.chart.svg
      .select(".y-axis")
      .transition()
      .duration(500)
      .call(yAxisGenerator);

    this.chart.svg.select(".x-label").text(Formatters.getDimensionLabel(xAxis));

    this.chart.svg.select(".y-label").text(Formatters.getDimensionLabel(yAxis));

    this.chart.pointsGroup.selectAll("*").remove();

    this.chart.pointsGroup
      .selectAll(".data-point")
      .data(filteredData)
      .enter()
      .append("circle")
      .attr("class", "data-point")
      .attr("cx", (d) =>
        this.chart.xScale(DataProcessor.getDimensionValue(d, xAxis))
      )
      .attr("cy", (d) =>
        this.chart.yScale(DataProcessor.getDimensionValue(d, yAxis))
      )
      .attr("r", (d) =>
        sizeBy === "none"
          ? 5
          : this.chart.radiusScale(DataProcessor.getDimensionValue(d, sizeBy))
      )
      .attr("fill", (d) =>
        colorBy === "none"
          ? "#3498db"
          : this.chart.colorScale(DataProcessor.getDimensionValue(d, colorBy))
      )
      .attr("opacity", 0.7)
      .attr("stroke", (d) => (d.death_inhosp ? "black" : "none"))
      .attr("stroke-width", (d) => (d.death_inhosp ? 2 : 0))
      .on("mouseover", (event, d) => {
        d3.select(event.currentTarget)
          .attr("opacity", 1)
          .attr("stroke", "#333")
          .attr("stroke-width", 1);

        this.showTooltip(event, d, xAxis, yAxis, colorBy, sizeBy);
      })
      .on("mousemove", (event) => {
        this.moveTooltip(event);
      })
      .on("mouseout", (event, d) => {
        d3.select(event.currentTarget)
          .attr("opacity", 0.7)
          .attr("stroke", d.death_inhosp ? "black" : "none")
          .attr("stroke-width", d.death_inhosp ? 2 : 0);

        this.hideTooltip();
      });

    this.updateLegend(colorBy, filteredData);
  }

  createScale(range, outputRange, dimension) {
    if (range.type === "categorical") {
      return d3
        .scaleBand()
        .domain(range.categories)
        .range(outputRange)
        .padding(0.1);
    } else {
      return d3
        .scaleLinear()
        .domain([range.min, range.max])
        .range(outputRange)
        .nice();
    }
  }

  createColorScale(data, dimension) {
    if (dimension === "none") {
      return () => "#3498db";
    }

    const range = DataProcessor.getDataRange(data, dimension);

    if (range.type === "categorical") {
      return d3
        .scaleOrdinal()
        .domain(range.categories)
        .range(d3.schemeCategory10);
    } else if (dimension === "asa") {
      return d3
        .scaleOrdinal()
        .domain([1, 2, 3, 4, 5])
        .range(["#3498db", "#2ecc71", "#f39c12", "#e74c3c", "#9b59b6"]);
    } else {
      return d3
        .scaleSequential(d3.interpolateBlues)
        .domain([range.min, range.max]);
    }
  }

  formatAxis(axisGenerator, dimension) {
    if (["department", "approach"].includes(dimension)) {
      axisGenerator.tickFormat((d) => {
        return d.length > 12 ? d.substring(0, 10) + "..." : d;
      });
    } else if (["duration"].includes(dimension)) {
      axisGenerator.tickFormat((d) => {
        if (d >= 120) return Math.round(d / 60) + "h";
        return d + "m";
      });
    } else if (["ebl"].includes(dimension)) {
      axisGenerator.tickFormat((d) => {
        return d >= 1000 ? (d / 1000).toFixed(1) + "K" : d;
      });
    }
  }

  showTooltip(event, d, xAxis, yAxis, colorBy, sizeBy) {
    const tooltip = this.tooltip;

    tooltip.style("display", "block");
    tooltip.transition().duration(200).style("opacity", 0.9);
    
    const isMortality = d.death_inhosp;
    const outcomeColor = isMortality ? "#e74c3c" : "#2ecc71";
    
    let tooltipContent = `
      <div style="margin-bottom: 10px;">
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px; color: #333; border-bottom: 1px solid #eee; padding-bottom: 6px;">
          ${d.opname || "Unknown Surgery"}
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; margin-bottom: 10px;">
        <div><span style="font-weight: 500; color: #555;">Age:</span> ${d.age} years</div>
        <div><span style="font-weight: 500; color: #555;">ASA:</span> ${d.asa}</div>
        <div><span style="font-weight: 500; color: #555;">Department:</span> ${d.department}</div>
        <div><span style="font-weight: 500; color: #555;">Approach:</span> ${d.approach || "Unknown"}</div>
      </div>
      
      <div style="border-top: 1px solid #eee; border-bottom: 1px solid #eee; padding: 8px 0; margin-bottom: 8px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div><span style="font-weight: 500; color: #555;">Blood Loss:</span> ${Formatters.formatValue(DataProcessor.getDimensionValue(d, "ebl"), "ebl")}</div>
          <div><span style="font-weight: 500; color: #555;">ICU Days:</span> ${Formatters.formatValue(DataProcessor.getDimensionValue(d, "icu"), "icu")}</div>
        </div>
      </div>
      
      <div style="margin-bottom: 10px;">
        <div><span style="font-weight: 500; color: #555;">${Formatters.getDimensionLabel(xAxis)}:</span> ${Formatters.formatValue(DataProcessor.getDimensionValue(d, xAxis), xAxis)}</div>
        <div><span style="font-weight: 500; color: #555;">${Formatters.getDimensionLabel(yAxis)}:</span> ${Formatters.formatValue(DataProcessor.getDimensionValue(d, yAxis), yAxis)}</div>
      </div>
      
      <div style="font-weight: 600; padding: 4px 8px; border-radius: 4px; display: inline-block; background-color: ${outcomeColor}; color: white;">
        ${isMortality ? "Mortality" : "Survived"}
      </div>`;

    tooltip.html(tooltipContent);

    this.positionTooltip(event);
  }

  moveTooltip(event) {
    this.positionTooltip(event);
  }

  positionTooltip(event) {
    const tooltip = this.tooltip;
    const tooltipNode = tooltip.node();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    let left = event.clientX + 15;
    let top = event.clientY;

    if (left + tooltipWidth > viewportWidth - 20) {
      left = event.clientX - tooltipWidth - 15;
    }

    if (top + tooltipHeight > viewportHeight - 20) {
      top = event.clientY - tooltipHeight;
    }

    if (left < 10) {
      left = 10;
    }

    if (top < 10) {
      top = 10;
    }

    tooltip
      .style("left", `${Math.round(left)}px`)
      .style("top", `${Math.round(top)}px`);
  }

  hideTooltip() {
    this.tooltip
      .transition()
      .duration(500)
      .style("opacity", 0)
      .on("end", () => {
        this.tooltip.style("display", "none");
      });
  }

  hideAllTooltips() {
    this.tooltip
      .style("opacity", 0)
      .style("display", "none");
  }

  updateLegend(dimension, data) {
    const legendContainer = d3.select(this.elements.legend);
    legendContainer.html("");

    const colorSection = legendContainer
      .append("div")
      .attr("class", "legend-section");

    if (dimension === "none") {
      colorSection
        .append("div")
        .attr("class", "legend-title")
        .text("Color: None (Default)");

      const legendItems = colorSection
        .append("div")
        .attr("class", "legend-items");

      const item = legendItems.append("div").attr("class", "legend-item");

      item
        .append("div")
        .attr("class", "legend-color")
        .style("background-color", "#3498db");

      item.append("div").attr("class", "legend-label").text("All points");
    } else {
      const range = DataProcessor.getDataRange(data, dimension);

      colorSection
        .append("div")
        .attr("class", "legend-title")
        .text(`Color: ${Formatters.getDimensionLabel(dimension)}`);

      const legendItems = colorSection
        .append("div")
        .attr("class", "legend-items");

      if (range.type === "categorical") {
        const uniqueValues = range.categories.sort();

        uniqueValues.forEach((value) => {
          const item = legendItems.append("div").attr("class", "legend-item");

          item
            .append("div")
            .attr("class", "legend-color")
            .style("background-color", this.chart.colorScale(value));

          item.append("div").attr("class", "legend-label").text(value);
        });
      } else if (dimension === "asa") {
        const asaValues = [1, 2, 3, 4, 5];
        const asaLabels = [
          "1 – Normal healthy",
          "2 – Mild disease",
          "3 – Severe disease",
          "4 – Life-threatening",
          "5 – Moribund",
        ];

        asaValues.forEach((value, i) => {
          const item = legendItems.append("div").attr("class", "legend-item");

          item
            .append("div")
            .attr("class", "legend-color")
            .style("background-color", this.chart.colorScale(value));

          item.append("div").attr("class", "legend-label").text(asaLabels[i]);
        });
      } else {
        const min = range.min;
        const max = range.max;

        let numBuckets = 5;
        if (max - min <= 10) numBuckets = 4;

        const gradientContainer = colorSection
          .append("div")
          .style("width", "100%")
          .style("margin-top", "var(--space-3)")
          .style("margin-bottom", "var(--space-4)")
          .style("display", "flex")
          .style("flex-direction", "column")
          .style("align-items", "center")
          .style("justify-content", "center");

        const gradient = gradientContainer
          .append("div")
          .attr("class", "legend-gradient");

        const stepWidth = 100 / numBuckets;

        for (let i = 0; i < numBuckets; i++) {
          const value = min + (i / (numBuckets - 1)) * (max - min);
          gradient
            .append("div")
            .attr("class", "gradient-step")
            .style("background-color", this.chart.colorScale(value))
            .style("width", `${stepWidth}%`)
            .style("left", `${i * stepWidth}%`);
        }

        const gradientLabels = gradientContainer
          .append("div")
          .attr("class", "gradient-labels");

        gradientLabels
          .append("div")
          .attr("class", "gradient-label")
          .style("left", "0")
          .text(Formatters.formatValue(min, dimension));

        gradientLabels
          .append("div")
          .attr("class", "gradient-label")
          .style("left", "100%")
          .text(Formatters.formatValue(max, dimension));

        if (numBuckets >= 5) {
          gradientLabels
            .append("div")
            .attr("class", "gradient-label")
            .style("left", "25%")
            .text(Formatters.formatValue(min + (max - min) * 0.25, dimension));

          gradientLabels
            .append("div")
            .attr("class", "gradient-label")
            .style("left", "50%")
            .text(Formatters.formatValue(min + (max - min) * 0.5, dimension));

          gradientLabels
            .append("div")
            .attr("class", "gradient-label")
            .style("left", "75%")
            .text(Formatters.formatValue(min + (max - min) * 0.75, dimension));
        } else if (numBuckets >= 3) {
          gradientLabels
            .append("div")
            .attr("class", "gradient-label")
            .style("left", "50%")
            .text(Formatters.formatValue(min + (max - min) * 0.5, dimension));
        }
      }
    }
  }

  showNoDataMessage() {
    this.chart.pointsGroup.selectAll("*").remove();
    this.chart.svg.selectAll(".no-data-text").remove();

    const noDataMessage = this.chart.svg
      .append("text")
      .attr("class", "no-data-text")
      .attr("text-anchor", "middle")
      .attr(
        "x",
        (this.chart.width - this.chart.margin.left - this.chart.margin.right) /
          2
      )
      .attr(
        "y",
        (this.chart.height - this.chart.margin.top - this.chart.margin.bottom) /
          2
      )
      .text("No data available for the current filter settings");
  }

  updateStats(data) {
    const stats = DataProcessor.calculateStats(data);

    this.elements.stats.count.textContent = stats.count.toLocaleString();
    this.elements.stats.age.textContent = stats.avgAge.toFixed(1);
    this.elements.stats.duration.textContent = Formatters.formatValue(
      stats.avgDuration,
      "duration"
    );
    this.elements.stats.mortality.textContent =
      stats.mortalityRate.toFixed(1) + "%";
  }
}
