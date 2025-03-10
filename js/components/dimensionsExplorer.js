class DimensionsExplorer {
  constructor(containerId) {
    this.chartContainer = document.getElementById(containerId);
    if (!this.chartContainer) {
      console.error(`Container element with ID '${containerId}' not found`);
      return;
    }

    if (!document.querySelector(".tooltip")) {
      d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);
    }

    this.elements = {
      xAxis: document.getElementById("x-axis"),
      yAxis: document.getElementById("y-axis"),
      colorBy: document.getElementById("color-by"),
      sizeBy: document.getElementById("size-by"),
      ageMin: document.getElementById("age-min"),
      ageMax: document.getElementById("age-max"),
      ageRangeMin: document.getElementById("age-range-min"),
      ageRangeMax: document.getElementById("age-range-max"),
      legend: document.getElementById("dimension-legend"),
      stats: {
        count: document.getElementById("selected-count"),
        age: document.getElementById("selected-age"),
        duration: document.getElementById("selected-duration"),
        mortality: document.getElementById("selected-mortality"),
      },
    };

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
      this.updateChart();
    });

    this.resizeObserver = new ResizeObserver(() => {
      this.resizeChart();
      this.updateChart();
    });
    this.resizeObserver.observe(this.chartContainer);
  }

  initializeChart() {
    this.chart.width = this.chartContainer.clientWidth;
    this.chart.height = this.chartContainer.clientHeight || 500;

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

        this.handleFiltersChange();
      });
    }
  }

  handleFiltersChange() {
    this.updateChart();
  }

  getFilterSettings() {
    return {
      ageMin: parseInt(this.elements.ageMin.value),
      ageMax: parseInt(this.elements.ageMax.value),
    };
  }

  resizeChart() {
    this.chart.width = this.chartContainer.clientWidth;
    this.chart.height = this.chartContainer.clientHeight || 500;

    d3.select(this.chartContainer)
      .select("svg")
      .attr("width", this.chart.width)
      .attr("height", this.chart.height);

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
    const tooltip = d3.select("body .tooltip");
    const tooltipNode = tooltip.node();

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const chartRect = this.chartContainer.getBoundingClientRect();

    tooltip.transition().duration(200).style("opacity", 0.9);

    let tooltipContent = `
            <div style="font-weight: bold; margin-bottom: 5px;">${
              d.opname || "Unknown Surgery"
            }</div>
            <div><strong>Age:</strong> ${d.age} years</div>
            <div><strong>Department:</strong> ${d.department}</div>
            <div><strong>Approach:</strong> ${d.approach || "Unknown"}</div>
            <div><strong>ASA Score:</strong> ${d.asa}</div>
            <div><strong>${Formatters.getDimensionLabel(
              xAxis
            )}:</strong> ${Formatters.formatValue(
      DataProcessor.getDimensionValue(d, xAxis),
      xAxis
    )}</div>
            <div><strong>${Formatters.getDimensionLabel(
              yAxis
            )}:</strong> ${Formatters.formatValue(
      DataProcessor.getDimensionValue(d, yAxis),
      yAxis
    )}</div>`;

    if (colorBy !== "none") {
      tooltipContent += `<div><strong>${Formatters.getDimensionLabel(
        colorBy
      )}:</strong> ${Formatters.formatValue(
        DataProcessor.getDimensionValue(d, colorBy),
        colorBy
      )}</div>`;
    }

    if (sizeBy !== "none") {
      tooltipContent += `<div><strong>${Formatters.getDimensionLabel(
        sizeBy
      )}:</strong> ${Formatters.formatValue(
        DataProcessor.getDimensionValue(d, sizeBy),
        sizeBy
      )}</div>`;
    }

    tooltipContent += `<div style="margin-top: 5px;"><strong>Outcome:</strong> ${
      d.death_inhosp ? "Mortality" : "Survived"
    }</div>`;

    tooltip.html(tooltipContent);

    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    let left = event.clientX + 10;
    let top = event.clientY - 10;

    if (left + tooltipWidth > viewportWidth) {
      left = event.clientX - tooltipWidth - 10;
    }

    if (top + tooltipHeight > viewportHeight) {
      top = event.clientY - tooltipHeight - 10;
    }

    tooltip.style("left", left + "px").style("top", top + "px");
  }

  moveTooltip(event) {
    const tooltip = d3.select("body .tooltip");
    const tooltipNode = tooltip.node();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = tooltipNode.offsetWidth;
    const tooltipHeight = tooltipNode.offsetHeight;

    let left = event.clientX + 10;
    let top = event.clientY - 10;

    if (left + tooltipWidth > viewportWidth) {
      left = event.clientX - tooltipWidth - 10;
    }

    if (top + tooltipHeight > viewportHeight) {
      top = event.clientY - tooltipHeight - 10;
    }

    tooltip.style("left", left + "px").style("top", top + "px");
  }

  hideTooltip() {
    d3.select("body .tooltip").transition().duration(500).style("opacity", 0);
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
          "1 - Normal healthy",
          "2 - Mild disease",
          "3 - Severe disease",
          "4 - Life-threatening",
          "5 - Moribund",
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
