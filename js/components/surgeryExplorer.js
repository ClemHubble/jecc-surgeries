class SurgeryExplorer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container element with ID '${containerId}' not found`);
      return;
    }

    this.selectedSurgery = null;
    this.surgeryData = [];
    this.surgeryOptions = [];
    this.controls = {};

    this.chartContainers = {
      age: null,
      los: null,
    };

    this.handleSurgerySelection = this.handleSurgerySelection.bind(this);
    this.handleSearchInput = this.handleSearchInput.bind(this);
    this.updateExplorer = this.updateExplorer.bind(this);
    this.toggleCombobox = this.toggleCombobox.bind(this);
    this.openCombobox = this.openCombobox.bind(this);
    this.closeCombobox = this.closeCombobox.bind(this);
    this.handleComboboxInput = this.handleComboboxInput.bind(this);
    this.handleComboboxKeydown = this.handleComboboxKeydown.bind(this);

    dataService.onDataLoaded(() => {
      this.initializeControls();
      this.setupEventListeners();
      this.populateSurgeryOptions();
      this.showNoSelectionMessage();

      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      this.resizeObserver.observe(this.container);
    });
  }

  initializeControls() {
    this.controls = {
      surgerySearch: document.getElementById("surgery-search"),
      surgerySelect: document.getElementById("surgery-select"),
      comboboxDisplay: document.getElementById("surgery-combobox-display"),
      comboboxValue: document.querySelector(".combobox-value"),
      comboboxDropdown: document.getElementById("surgery-combobox-dropdown"),
      comboboxSearch: document.getElementById("surgery-combobox-search"),
      comboboxOptions: document.getElementById("surgery-combobox-options"),
      comboboxContainer: document.getElementById("surgery-combobox-container"),
    };

    this.comboboxState = {
      isOpen: false,
      selectedIndex: -1,
      options: [],
      filteredOptions: [],
    };

    if (this.controls.comboboxValue) {
      this.controls.comboboxValue.classList.add("placeholder");
    }
  }

  populateSurgeryOptions() {
    if (!dataService.isLoaded || !this.controls.surgerySelect) return;

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

      this.comboboxState.options = surgeries;
      this.comboboxState.filteredOptions = surgeries;

      this.controls.surgerySelect.innerHTML = "";

      const defaultOption = document.createElement("option");
      defaultOption.value = "";
      defaultOption.textContent = "Select a surgery...";
      this.controls.surgerySelect.appendChild(defaultOption);

      surgeries.forEach((surgery) => {
        const option = document.createElement("option");
        option.value = surgery.name;
        option.textContent = `${surgery.name} (${surgery.count} cases)`;
        this.controls.surgerySelect.appendChild(option);
      });

      this.populateComboboxDropdown();
    } catch (error) {
      console.error("Error populating surgery options:", error);
      this.showErrorMessage("Failed to load surgery options");
    }
  }

  populateComboboxDropdown(filterText = "") {
    if (!this.controls.comboboxOptions) return;

    this.controls.comboboxOptions.innerHTML = "";

    const searchText = filterText.toLowerCase().trim();
    this.comboboxState.filteredOptions = this.comboboxState.options.filter(
      (surgery) => surgery.name.toLowerCase().includes(searchText)
    );

    if (this.comboboxState.filteredOptions.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "combobox-no-results";
      noResults.textContent = "No surgeries found";
      this.controls.comboboxOptions.appendChild(noResults);
      return;
    }

    this.comboboxState.filteredOptions.forEach((surgery, index) => {
      const option = document.createElement("div");
      option.className = "combobox-option";
      option.dataset.value = surgery.name;
      option.dataset.index = index;
      option.textContent = `${surgery.name} (${surgery.count} cases)`;

      if (surgery.name === this.selectedSurgery) {
        option.classList.add("selected");
        this.comboboxState.selectedIndex = index;
      }

      option.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectComboboxOption(surgery.name, index);
      });

      this.controls.comboboxOptions.appendChild(option);
    });

    if (this.comboboxState.selectedIndex >= 0) {
      setTimeout(() => {
        const selectedOption = this.controls.comboboxOptions.querySelector(
          ".combobox-option.selected"
        );
        if (selectedOption) {
          selectedOption.scrollIntoView({ block: "nearest" });
        }
      }, 0);
    }
  }

  setupEventListeners() {
    if (this.controls.surgerySelect) {
      this.controls.surgerySelect.addEventListener(
        "change",
        this.handleSurgerySelection
      );
    }

    if (this.controls.surgerySearch) {
      this.controls.surgerySearch.addEventListener(
        "input",
        this.handleSearchInput
      );
    }

    if (this.controls.comboboxDisplay) {
      this.controls.comboboxDisplay.addEventListener(
        "click",
        this.toggleCombobox
      );
    }

    if (this.controls.comboboxSearch) {
      this.controls.comboboxSearch.addEventListener("input", (e) => {
        this.handleComboboxInput(e.target.value);
      });

      this.controls.comboboxSearch.addEventListener(
        "keydown",
        this.handleComboboxKeydown
      );
    }

    document.addEventListener("click", (e) => {
      if (
        this.controls.comboboxContainer &&
        !this.controls.comboboxContainer.contains(e.target) &&
        this.comboboxState.isOpen
      ) {
        this.closeCombobox();
      }
    });
  }

  handleSurgerySelection() {
    const select = this.controls.surgerySelect;
    this.selectedSurgery = select ? select.value : null;

    if (this.selectedSurgery && this.controls.comboboxValue) {
      this.controls.comboboxValue.textContent = this.selectedSurgery;
      this.controls.comboboxValue.classList.remove("placeholder");
    } else {
      this.controls.comboboxValue.textContent = "Select a surgery...";
      this.controls.comboboxValue.classList.add("placeholder");
    }

    this.updateExplorer();
  }

  handleSearchInput() {
    if (!this.controls.surgerySearch || !this.controls.surgerySelect) return;

    const searchText = this.controls.surgerySearch.value.toLowerCase().trim();
    const options = Array.from(this.controls.surgerySelect.options);

    for (let i = 1; i < options.length; i++) {
      const option = options[i];
      const surgeryName = option.textContent.toLowerCase();

      if (searchText === "" || surgeryName.includes(searchText)) {
        option.style.display = "";
      } else {
        option.style.display = "none";
      }
    }
  }

  handleComboboxInput(value) {
    if (this.controls.surgerySearch) {
      this.controls.surgerySearch.value = value;
      this.controls.surgerySearch.dispatchEvent(new Event("input"));
    }

    this.populateComboboxDropdown(value);
  }

  handleComboboxKeydown(e) {
    const { filteredOptions, selectedIndex } = this.comboboxState;

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
          const option = this.comboboxState.filteredOptions[selectedIndex];
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

  toggleCombobox(e) {
    if (e) {
      e.stopPropagation();
    }

    if (this.comboboxState.isOpen) {
      this.closeCombobox();
    } else {
      this.openCombobox();
    }
  }

  openCombobox() {
    if (!this.controls.comboboxDropdown) return;

    this.comboboxState.isOpen = true;

    this.controls.comboboxDropdown.classList.add("show");

    if (this.controls.comboboxSearch) {
      this.controls.comboboxSearch.value = "";

      this.populateComboboxDropdown("");

      setTimeout(() => {
        this.controls.comboboxSearch.focus();
      }, 10);
    }
  }

  closeCombobox() {
    if (!this.controls.comboboxDropdown) return;

    this.comboboxState.isOpen = false;

    this.controls.comboboxDropdown.classList.remove("show");
  }

  highlightComboboxOption(index) {
    if (!this.controls.comboboxOptions) return;

    const options =
      this.controls.comboboxOptions.querySelectorAll(".combobox-option");
    options.forEach((opt) => opt.classList.remove("highlighted"));

    if (index >= 0 && index < options.length) {
      options[index].classList.add("highlighted");
      this.comboboxState.selectedIndex = index;

      options[index].scrollIntoView({ block: "nearest" });
    }
  }

  selectComboboxOption(value, index) {
    if (this.controls.comboboxValue) {
      this.controls.comboboxValue.textContent = value;
      this.controls.comboboxValue.classList.remove("placeholder");
    }

    if (this.controls.surgerySelect) {
      this.controls.surgerySelect.value = value;
      this.controls.surgerySelect.dispatchEvent(new Event("change"));
    }

    this.closeCombobox();

    this.selectedSurgery = value;
    this.updateExplorer();

    this.comboboxState.selectedIndex = index;
  }

  getSurgeryData() {
    if (!dataService.isLoaded || !this.selectedSurgery) {
      return [];
    }

    try {
      return dataService.data.filter((d) => d.opname === this.selectedSurgery);
    } catch (error) {
      console.error("Error filtering data:", error);
      return [];
    }
  }

  updateExplorer() {
    try {
      this.surgeryData = this.getSurgeryData();

      this.clearErrorMessage();

      if (!this.selectedSurgery) {
        this.showNoSelectionMessage();
        return;
      }

      if (this.surgeryData.length === 0) {
        this.showNoDataMessage();
        return;
      }

      if (this.surgeryData.length < 5) {
        this.showInsufficientDataMessage(this.surgeryData.length);
        return;
      }

      this.renderDashboard();
    } catch (error) {
      console.error("Error updating explorer:", error);
      this.showErrorMessage(
        "An error occurred while updating the visualization"
      );
    }
  }

  renderDashboard() {
    this.container.innerHTML = "";
    this.container.className = "surgery-visualization-container";

    this.renderSampleSizeInfo();

    this.renderKeyStats();

    this.renderVisualizations();
  }

  renderSampleSizeInfo() {
    const sampleInfo = document.createElement("div");
    sampleInfo.className = "sample-info";

    const sampleText = document.createElement("div");
    sampleText.className = "sample-text";
    sampleText.innerHTML = `Analysis based on <strong>${this.surgeryData.length}</strong> ${this.selectedSurgery} procedures`;

    sampleInfo.appendChild(sampleText);
    this.container.appendChild(sampleInfo);
  }

  renderKeyStats() {
    const section = document.createElement("div");
    section.className = "results-section";

    const title = document.createElement("h3");
    title.textContent = "Summary statistics";
    title.className = "results-section-title";
    section.appendChild(title);

    const stats = this.calculateKeyStats();

    const statsGrid = document.createElement("div");
    statsGrid.className = "compact-stats-grid";
    section.appendChild(statsGrid);

    const statsItems = [
      {
        label: "Surgery duration",
        value: `${Math.round(stats.avgDuration)} min`,
        icon: "⏱️",
        comparison: `${stats.durationPercent > 0 ? "+" : ""}${
          stats.durationPercent
        }%`,
        isPositive: stats.durationPercent < 0,
      },
      {
        label: "ICU stays",
        value: `${stats.avgICU} days`,
        icon: "🏥",
        comparison: `${stats.icuPercent > 0 ? "+" : ""}${stats.icuPercent}%`,
        isPositive: stats.icuPercent < 0,
      },
      {
        label: "Blood loss",
        value: `${Math.round(stats.avgEBL)} mL`,
        icon: "🩸",
        comparison: `${stats.eblPercent > 0 ? "+" : ""}${stats.eblPercent}%`,
        isPositive: stats.eblPercent < 0,
      },
      {
        label: "Mortality rate",
        value: `${stats.mortalityRate}%`,
        icon: "⚠️",
        comparison: `${stats.mortalityPercent > 0 ? "+" : ""}${
          stats.mortalityPercent
        }%`,
        isPositive: stats.mortalityPercent < 0,
      },
    ];

    statsItems.forEach((stat) => {
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

      const valueWrapper = document.createElement("div");
      valueWrapper.className = "stat-value-wrapper";
      contentWrapper.appendChild(valueWrapper);

      const value = document.createElement("div");
      value.textContent = stat.value;
      value.className = "stat-value";
      valueWrapper.appendChild(value);

      const comparison = document.createElement("div");
      comparison.textContent = stat.comparison;
      comparison.className = "stat-comparison";
      comparison.classList.add(stat.isPositive ? "positive" : "negative");
      valueWrapper.appendChild(comparison);
    });

    this.container.appendChild(section);

    this.renderDescriptiveStats(stats);
  }

  renderDescriptiveStats(stats) {
    const section = document.createElement("div");
    section.className = "results-section";

    const title = document.createElement("h3");
    title.textContent = "Surgery overview";
    title.className = "results-section-title";
    section.appendChild(title);

    const statsList = document.createElement("div");
    statsList.className = "stats-list";

    const demographicsSection = document.createElement("div");
    demographicsSection.className = "stat-list-item";

    const demographicsTitle = document.createElement("h4");
    demographicsTitle.textContent = "Demographics";
    demographicsSection.appendChild(demographicsTitle);

    const demographicsList = document.createElement("ul");

    const ageBullet = document.createElement("li");
    ageBullet.innerHTML = `The average patient age is <strong>${stats.avgAge} years</strong> with a range of <strong>${stats.ageRange}</strong> years.`;
    demographicsList.appendChild(ageBullet);

    const sexBullet = document.createElement("li");
    const malePercent = parseInt(stats.sexDistribution.split("%")[0]);
    const femalePercent = parseInt(stats.sexDistribution.split("and ")[1]);
    const maleDominant = malePercent > femalePercent;
    sexBullet.innerHTML = `Patient population is <strong><span style="color: ${
      maleDominant ? "#0ea5e9" : ""
    }">${malePercent}% male</span></strong> and <strong><span style="color: ${
      !maleDominant ? "#f43f5e" : ""
    }">${femalePercent}% female</span></strong>.`;
    demographicsList.appendChild(sexBullet);

    const bmiBullet = document.createElement("li");
    bmiBullet.innerHTML = `Patients have an average BMI of <strong>${stats.avgBMI}</strong>, categorized as <strong>${stats.bmiCategory}</strong>.`;
    demographicsList.appendChild(bmiBullet);

    const asaBullet = document.createElement("li");
    asaBullet.innerHTML = `<strong>${stats.primaryASA}</strong> is the most common classification, representing <strong>${stats.asaPercent}%</strong> of all cases.`;
    demographicsList.appendChild(asaBullet);

    demographicsSection.appendChild(demographicsList);
    statsList.appendChild(demographicsSection);

    const procedureSection = document.createElement("div");
    procedureSection.className = "stat-list-item";

    const procedureTitle = document.createElement("h4");
    procedureTitle.textContent = "Procedure details";
    procedureSection.appendChild(procedureTitle);

    const procedureList = document.createElement("ul");

    const approachBullet = document.createElement("li");
    approachBullet.innerHTML = `<strong>${stats.topApproach}</strong> is the predominant surgical approach, used in <strong>${stats.approachPercent}%</strong> of cases.`;
    procedureList.appendChild(approachBullet);

    const deptBullet = document.createElement("li");
    deptBullet.innerHTML = `The <strong>${stats.topDepartment}</strong> department performs <strong>${stats.departmentPercent}%</strong> of these procedures.`;
    procedureList.appendChild(deptBullet);

    const aneBullet = document.createElement("li");
    aneBullet.innerHTML = `<strong>${stats.topAnesthesia}</strong> anesthesia is preferred for <strong>${stats.anesthesiaPercent}%</strong> of surgeries.`;
    procedureList.appendChild(aneBullet);

    const durationBullet = document.createElement("li");
    const durationCompClass = stats.durationPercent < 0 ? "better" : "worse";
    durationBullet.innerHTML = `
      Procedures last <strong>${Math.round(
        stats.avgDuration
      )} minutes</strong> on average, 
      <strong><span class="stat-comparison ${durationCompClass}">${Math.abs(
      stats.durationPercent
    )}% ${
      stats.durationPercent > 0 ? "longer" : "shorter"
    }</span></strong> than the hospital average.
    `;
    procedureList.appendChild(durationBullet);

    procedureSection.appendChild(procedureList);
    statsList.appendChild(procedureSection);

    const resourceSection = document.createElement("div");
    resourceSection.className = "stat-list-item";

    const resourceTitle = document.createElement("h4");
    resourceTitle.textContent = "Resource utilization";
    resourceSection.appendChild(resourceTitle);

    const resourceList = document.createElement("ul");

    const ivBullet = document.createElement("li");
    ivBullet.innerHTML = `<strong>${
      stats.ivAccess.split(" (")[0]
    }</strong> is the standard site for IV access in <strong>${
      stats.ivAccess.split("(")[1].split(")")[0]
    }</strong> of procedures.`;
    resourceList.appendChild(ivBullet);

    const arterialBullet = document.createElement("li");
    arterialBullet.innerHTML = `Arterial monitoring is typically achieved via <strong>${
      stats.arterialLine.split(" (")[0]
    }</strong> in <strong>${
      stats.arterialLine.split("(")[1].split(")")[0]
    }</strong> of cases.`;
    resourceList.appendChild(arterialBullet);

    const fluidsBullet = document.createElement("li");
    fluidsBullet.innerHTML = `Patients receive an average of <strong>${stats.avgFluid}</strong> during the procedure.`;
    resourceList.appendChild(fluidsBullet);

    const eblBullet = document.createElement("li");
    const eblCompClass = stats.eblPercent < 0 ? "better" : "worse";
    eblBullet.innerHTML = `
      Blood loss averages <strong>${Math.round(stats.avgEBL)} mL</strong>, 
      <strong><span class="stat-comparison ${eblCompClass}">${Math.abs(
      stats.eblPercent
    )}% ${
      stats.eblPercent > 0 ? "higher" : "lower"
    }</span></strong> than the hospital average.
    `;
    resourceList.appendChild(eblBullet);

    resourceSection.appendChild(resourceList);
    statsList.appendChild(resourceSection);

    const outcomesSection = document.createElement("div");
    outcomesSection.className = "stat-list-item";

    const outcomesTitle = document.createElement("h4");
    outcomesTitle.textContent = "Outcomes";
    outcomesSection.appendChild(outcomesTitle);

    const outcomesList = document.createElement("ul");

    const losBullet = document.createElement("li");
    losBullet.innerHTML = `Patients stay in the hospital for an average of <strong>${stats.avgLOS} days</strong>.`;
    outcomesList.appendChild(losBullet);

    const icuBullet = document.createElement("li");
    icuBullet.innerHTML = `ICU care is required for <strong>${stats.icuAdmission}</strong> undergoing this procedure.`;
    outcomesList.appendChild(icuBullet);

    const icuDaysBullet = document.createElement("li");
    const icuCompClass = stats.icuPercent < 0 ? "better" : "worse";
    icuDaysBullet.innerHTML = `
      When ICU care is needed, the average stay is <strong>${
        stats.avgICU
      } days</strong>, 
      <strong><span class="stat-comparison ${icuCompClass}">${Math.abs(
      stats.icuPercent
    )}% ${
      stats.icuPercent > 0 ? "longer" : "shorter"
    }</span></strong> than the hospital average.
    `;
    outcomesList.appendChild(icuDaysBullet);

    const mortalityBullet = document.createElement("li");
    const mortalityCompClass = stats.mortalityPercent < 0 ? "better" : "worse";
    mortalityBullet.innerHTML = `
      The mortality rate is <strong>${stats.mortalityRate}%</strong>, 
      <strong><span class="stat-comparison ${mortalityCompClass}">${Math.abs(
      stats.mortalityPercent
    )}% ${
      stats.mortalityPercent > 0 ? "higher" : "lower"
    }</span></strong> than the hospital average.
    `;
    outcomesList.appendChild(mortalityBullet);

    outcomesSection.appendChild(outcomesList);
    statsList.appendChild(outcomesSection);

    section.appendChild(statsList);
    this.container.appendChild(section);
  }

  calculateKeyStats() {
    try {
      const validData = this.surgeryData;
      const allData = dataService.data || [];

      const validAges = validData.filter(
        (d) => !isNaN(d.age) && d.age > 0 && d.age < 120
      );
      const avgAge =
        validAges.length > 0
          ? d3.mean(validAges, (d) => d.age).toFixed(1)
          : "N/A";
      const minAge =
        validAges.length > 0 ? Math.min(...validAges.map((d) => d.age)) : "N/A";
      const maxAge =
        validAges.length > 0 ? Math.max(...validAges.map((d) => d.age)) : "N/A";
      const ageRange = `${Math.round(minAge)}-${Math.round(maxAge)}`;

      const validSex = validData.filter((d) => d.sex === "M" || d.sex === "F");
      const maleCount = validSex.filter((d) => d.sex === "M").length;
      const femaleCount = validSex.filter((d) => d.sex === "F").length;
      const malePercent =
        validSex.length > 0
          ? Math.round((maleCount / validSex.length) * 100)
          : 0;
      const femalePercent =
        validSex.length > 0
          ? Math.round((femaleCount / validSex.length) * 100)
          : 0;
      const sexDistribution = `${malePercent}% male and ${femalePercent}% female`;

      const validBMI = validData.filter(
        (d) => !isNaN(d.bmi) && d.bmi > 10 && d.bmi < 60
      );
      const avgBMI =
        validBMI.length > 0
          ? d3.mean(validBMI, (d) => d.bmi).toFixed(1)
          : "N/A";

      let bmiCategory;
      if (avgBMI !== "N/A") {
        if (avgBMI < 18.5) bmiCategory = "underweight";
        else if (avgBMI < 25) bmiCategory = "normal weight";
        else if (avgBMI < 30) bmiCategory = "overweight";
        else bmiCategory = "obese";
      } else {
        bmiCategory = "unknown";
      }

      const asaCounts = d3.rollup(
        validData.filter((d) => d.asa && !isNaN(d.asa)),
        (v) => v.length,
        (d) => d.asa
      );
      const asaArray = Array.from(asaCounts, ([key, value]) => ({
        key,
        value,
      })).sort((a, b) => b.value - a.value);
      const primaryASA =
        asaArray.length > 0 ? `ASA ${asaArray[0].key}` : "Unknown";
      const asaPercent =
        asaArray.length > 0
          ? Math.round((asaArray[0].value / validData.length) * 100)
          : 0;

      const approachCounts = d3.rollup(
        validData.filter((d) => d.approach && d.approach.trim() !== ""),
        (v) => v.length,
        (d) => d.approach
      );
      const approachArray = Array.from(approachCounts, ([key, value]) => ({
        key,
        value,
      })).sort((a, b) => b.value - a.value);
      const topApproach =
        approachArray.length > 0 ? approachArray[0].key : "Unknown";
      const approachPercent =
        approachArray.length > 0
          ? Math.round((approachArray[0].value / validData.length) * 100)
          : 0;

      const deptCounts = d3.rollup(
        validData.filter((d) => d.department && d.department.trim() !== ""),
        (v) => v.length,
        (d) => d.department
      );
      const deptArray = Array.from(deptCounts, ([key, value]) => ({
        key,
        value,
      })).sort((a, b) => b.value - a.value);
      const topDepartment = deptArray.length > 0 ? deptArray[0].key : "Unknown";
      const departmentPercent =
        deptArray.length > 0
          ? Math.round((deptArray[0].value / validData.length) * 100)
          : 0;

      const aneCounts = d3.rollup(
        validData.filter((d) => d.ane_type && d.ane_type.trim() !== ""),
        (v) => v.length,
        (d) => d.ane_type
      );
      const aneArray = Array.from(aneCounts, ([key, value]) => ({
        key,
        value,
      })).sort((a, b) => b.value - a.value);
      const topAnesthesia = aneArray.length > 0 ? aneArray[0].key : "Unknown";
      const anesthesiaPercent =
        aneArray.length > 0
          ? Math.round((aneArray[0].value / validData.length) * 100)
          : 0;

      const validDuration = validData.filter(
        (d) => !isNaN(d.opstart) && !isNaN(d.opend) && d.opend > d.opstart
      );
      const avgDuration =
        validDuration.length > 0
          ? d3.mean(validDuration, (d) => d.opend - d.opstart)
          : 0;

      const ivCounts = d3.rollup(
        validData.filter((d) => d.iv1 && d.iv1.trim() !== ""),
        (v) => v.length,
        (d) => d.iv1
      );
      const ivArray = Array.from(ivCounts, ([key, value]) => ({
        key,
        value,
      })).sort((a, b) => b.value - a.value);
      const topIV = ivArray.length > 0 ? ivArray[0].key : "Unknown";
      const ivPercent =
        ivArray.length > 0
          ? Math.round((ivArray[0].value / validData.length) * 100)
          : 0;
      const ivAccess = `${topIV} (${ivPercent}%)`;

      const arterialCounts = d3.rollup(
        validData.filter((d) => d.aline1 && d.aline1.trim() !== ""),
        (v) => v.length,
        (d) => d.aline1
      );
      const arterialArray = Array.from(arterialCounts, ([key, value]) => ({
        key,
        value,
      })).sort((a, b) => b.value - a.value);
      const topArterial =
        arterialArray.length > 0 ? arterialArray[0].key : "None";
      const arterialPercent =
        arterialArray.length > 0
          ? Math.round((arterialArray[0].value / validData.length) * 100)
          : 0;
      const arterialLine = `${topArterial} (${arterialPercent}%)`;

      const avgCrystalloid =
        d3.mean(
          validData.filter(
            (d) => !isNaN(d.intraop_crystalloid) && d.intraop_crystalloid >= 0
          ),
          (d) => d.intraop_crystalloid
        ) || 0;

      const avgColloid =
        d3.mean(
          validData.filter(
            (d) => !isNaN(d.intraop_colloid) && d.intraop_colloid >= 0
          ),
          (d) => d.intraop_colloid
        ) || 0;

      const avgFluid =
        `${Math.round(avgCrystalloid)} mL crystalloid` +
        (avgColloid > 0 ? ` and ${Math.round(avgColloid)} mL colloid` : "");

      const avgEBL =
        d3.mean(
          validData.filter((d) => !isNaN(d.intraop_ebl) && d.intraop_ebl >= 0),
          (d) => d.intraop_ebl
        ) || 0;

      const validLOS = validData.filter(
        (d) => d.dis && d.adm && !isNaN(d.dis) && !isNaN(d.adm) && d.dis > d.adm
      );

      const avgLOS =
        validLOS.length > 0
          ? d3
              .mean(validLOS, (d) => (d.dis - d.adm) / (24 * 60 * 60))
              .toFixed(1)
          : "N/A";

      const validICU = validData.filter((d) => !isNaN(d.icu_days));
      const icuCount = validICU.filter((d) => d.icu_days > 0).length;
      const icuPercent =
        validICU.length > 0
          ? Math.round((icuCount / validICU.length) * 100)
          : 0;
      const icuAdmission = `${icuPercent}% of patients`;

      const avgICU =
        validICU.filter((d) => d.icu_days > 0).length > 0
          ? d3
              .mean(
                validICU.filter((d) => d.icu_days > 0),
                (d) => d.icu_days
              )
              .toFixed(1)
          : "0";

      const validMortality = validData.filter(
        (d) => d.death_inhosp !== undefined
      );
      const deaths = d3.sum(validMortality, (d) => (d.death_inhosp ? 1 : 0));
      const mortalityRate =
        validMortality.length > 0
          ? ((deaths / validMortality.length) * 100).toFixed(1)
          : "0";

      const overallAvgDuration =
        d3.mean(
          allData.filter(
            (d) => !isNaN(d.opstart) && !isNaN(d.opend) && d.opend > d.opstart
          ),
          (d) => d.opend - d.opstart
        ) || 1;
      const durationPercent = Math.round(
        ((avgDuration - overallAvgDuration) / overallAvgDuration) * 100
      );

      const overallAvgEBL =
        d3.mean(
          allData.filter((d) => !isNaN(d.intraop_ebl) && d.intraop_ebl >= 0),
          (d) => d.intraop_ebl
        ) || 1;
      const eblPercent = Math.round(
        ((avgEBL - overallAvgEBL) / overallAvgEBL) * 100
      );

      const overallValidMortality = allData.filter(
        (d) => d.death_inhosp !== undefined
      );
      const overallDeaths = d3.sum(overallValidMortality, (d) =>
        d.death_inhosp ? 1 : 0
      );
      const overallMortalityRate =
        overallValidMortality.length > 0
          ? (overallDeaths / overallValidMortality.length) * 100
          : 0.1;

      const mortalityPercent = Math.round(
        ((parseFloat(mortalityRate) - overallMortalityRate) /
          overallMortalityRate) *
          100
      );

      const overallValidICU = allData.filter((d) => !isNaN(d.icu_days));

      const overallICUStays = overallValidICU.filter((d) => d.icu_days > 0);
      const overallAvgICU =
        overallICUStays.length > 0
          ? d3.mean(overallICUStays, (d) => d.icu_days)
          : 0.1;

      const icuComparisonPercent = Math.round(
        ((parseFloat(avgICU) - overallAvgICU) / overallAvgICU) * 100
      );

      return {
        avgAge,
        ageRange,
        sexDistribution,
        avgBMI,
        bmiCategory,
        primaryASA,
        asaPercent,
        topApproach,
        approachPercent,
        topDepartment,
        departmentPercent,
        topAnesthesia,
        anesthesiaPercent,
        avgDuration,
        ivAccess,
        arterialLine,
        avgFluid,
        avgEBL,
        avgLOS,
        icuAdmission,
        avgICU,
        mortalityRate,
        durationPercent,
        eblPercent,
        mortalityPercent,
        icuPercent: icuComparisonPercent,
      };
    } catch (error) {
      console.error("Error calculating key stats:", error);
      return {};
    }
  }

  renderVisualizations() {
    const section = document.createElement("div");
    section.className = "results-section";

    const chartsContainer = document.createElement("div");
    chartsContainer.className = "charts-container";
    chartsContainer.style.display = "grid";
    chartsContainer.style.gridTemplateColumns =
      "repeat(auto-fit, minmax(300px, 1fr))";
    chartsContainer.style.gap = "20px";

    const ageChartWrapper = this.createChartWrapper("Age distribution");
    const losChartWrapper = this.createChartWrapper("Hospital length of stay");

    chartsContainer.appendChild(ageChartWrapper);
    chartsContainer.appendChild(losChartWrapper);
    section.appendChild(chartsContainer);

    this.container.appendChild(section);

    this.chartContainers.age = ageChartWrapper.querySelector(".chart");
    this.chartContainers.los = losChartWrapper.querySelector(".chart");

    setTimeout(() => {
      this.createAgeHistogram(this.chartContainers.age);
      this.createHospitalLOSChart(this.chartContainers.los);
    }, 0);
  }

  createChartWrapper(title) {
    const wrapper = document.createElement("div");
    wrapper.className = "chart-wrapper";

    const headerContainer = document.createElement("div");
    headerContainer.style.display = "flex";
    headerContainer.style.alignItems = "center";
    headerContainer.style.justifyContent = "space-between";
    headerContainer.style.marginBottom = "var(--space-2)";
    wrapper.appendChild(headerContainer);

    const chartTitle = document.createElement("h4");
    chartTitle.textContent = title;
    chartTitle.className = "chart-title";
    chartTitle.style.margin = "0";
    headerContainer.appendChild(chartTitle);

    wrapper.dataset.title = title;

    const chartContainer = document.createElement("div");
    chartContainer.className = "chart";
    chartContainer.style.minHeight = "200px";
    wrapper.appendChild(chartContainer);

    return wrapper;
  }

  createAgeHistogram(container) {
    if (!container || !this.surgeryData.length) {
      this.showNoChartDataMessage(container, "No age data available");
      return;
    }

    try {
      const width = container.clientWidth;
      const height = 200;
      const margin = { top: 20, right: 50, bottom: 40, left: 50 };

      const validData = this.surgeryData.filter(
        (d) => !isNaN(d.age) && d.age >= 0 && d.age <= 120
      );

      if (validData.length === 0) {
        this.showNoChartDataMessage(container, "No valid age data available");
        return;
      }

      const meanAge = d3.mean(validData, (d) => d.age);
      const medianAge = d3.median(validData, (d) => d.age);

      container.innerHTML = "";

      const statsContainer = document.createElement("div");
      statsContainer.className = "distribution-stats";

      const meanStat = document.createElement("div");
      meanStat.className = "distribution-stat";

      const meanColor = document.createElement("div");
      meanColor.className = "distribution-stat-color mean";
      meanStat.appendChild(meanColor);

      const meanLabel = document.createElement("span");
      meanLabel.textContent = `Mean: ${meanAge.toFixed(1)} years`;
      meanStat.appendChild(meanLabel);

      statsContainer.appendChild(meanStat);

      const medianStat = document.createElement("div");
      medianStat.className = "distribution-stat";

      const medianColor = document.createElement("div");
      medianColor.className = "distribution-stat-color median";
      medianStat.appendChild(medianColor);

      const medianLabel = document.createElement("span");
      medianLabel.textContent = `Median: ${medianAge.toFixed(1)} years`;
      medianStat.appendChild(medianLabel);

      statsContainer.appendChild(medianStat);

      container.appendChild(statsContainer);
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3.scaleLinear().domain([0, 100]).range([0, chartWidth]);

      const histogram = d3
        .histogram()
        .value((d) => d.age)
        .domain(x.domain())
        .thresholds(x.ticks(20));

      const bins = histogram(validData);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length) || 1])
        .range([chartHeight, 0]);

      svg
        .selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.x0))
        .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", (d) => y(d.length))
        .attr("height", (d) => chartHeight - y(d.length))
        .style("fill", "var(--primary)")
        .style("opacity", 0.8);

      svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .attr("class", "x-axis")
        .call(d3.axisBottom(x).ticks(10));

      svg
        .append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 30)
        .attr("fill", "var(--muted-foreground)")
        .style("font-size", "12px")
        .text("Patient age (years)");

      svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5));

      svg
        .append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartHeight / 2)
        .attr("y", -30)
        .attr("fill", "var(--muted-foreground)")
        .style("font-size", "12px")
        .text("Number of patients");

      if (meanAge) {
        svg
          .append("line")
          .attr("x1", x(meanAge))
          .attr("x2", x(meanAge))
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .style("stroke", "var(--destructive)")
          .style("stroke-width", 2)
          .style("stroke-dasharray", "4");
      }

      if (medianAge && Math.abs(medianAge - meanAge) > 1) {
        svg
          .append("line")
          .attr("x1", x(medianAge))
          .attr("x2", x(medianAge))
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .style("stroke", "var(--primary)")
          .style("stroke-width", 2)
          .style("stroke-dasharray", "4");
      }
    } catch (error) {
      console.error("Error creating age histogram:", error);
      this.showNoChartDataMessage(container, "Error creating age chart");
    }
  }

  createHospitalLOSChart(container) {
    if (!container || !this.surgeryData.length) {
      this.showNoChartDataMessage(
        container,
        "No length of stay data available"
      );
      return;
    }

    try {
      const width = container.clientWidth;
      const height = 200;
      const margin = { top: 20, right: 50, bottom: 40, left: 50 };

      const validData = this.surgeryData.filter(
        (d) => d.dis && d.adm && !isNaN(d.dis) && !isNaN(d.adm) && d.dis > d.adm
      );

      if (validData.length === 0) {
        this.showNoChartDataMessage(
          container,
          "No valid length of stay data available"
        );
        return;
      }

      const losData = validData.map((d) => ({
        ...d,
        los: (d.dis - d.adm) / (24 * 60 * 60),
      }));

      const meanLOS = d3.mean(losData, (d) => d.los);
      const medianLOS = d3.median(losData, (d) => d.los);

      container.innerHTML = "";

      const statsContainer = document.createElement("div");
      statsContainer.className = "distribution-stats";

      const meanStat = document.createElement("div");
      meanStat.className = "distribution-stat";

      const meanColor = document.createElement("div");
      meanColor.className = "distribution-stat-color mean";
      meanStat.appendChild(meanColor);

      const meanLabel = document.createElement("span");
      meanLabel.textContent = `Mean: ${meanLOS.toFixed(1)} days`;
      meanStat.appendChild(meanLabel);

      statsContainer.appendChild(meanStat);

      const medianStat = document.createElement("div");
      medianStat.className = "distribution-stat";

      const medianColor = document.createElement("div");
      medianColor.className = "distribution-stat-color median";
      medianStat.appendChild(medianColor);

      const medianLabel = document.createElement("span");
      medianLabel.textContent = `Median: ${medianLOS.toFixed(1)} days`;
      medianStat.appendChild(medianLabel);

      statsContainer.appendChild(medianStat);

      container.appendChild(statsContainer);

      const maxLOS = d3.max(losData, (d) => d.los) || 30;
      const roundedMaxLOS = Math.min(Math.ceil(maxLOS * 1.1), 60);

      const chartWidth = width - margin.left - margin.right;
      const chartHeight = height - margin.top - margin.bottom;

      const svg = d3
        .select(container)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      const x = d3
        .scaleLinear()
        .domain([0, roundedMaxLOS])
        .range([0, chartWidth]);

      const histogram = d3
        .histogram()
        .value((d) => d.los)
        .domain(x.domain())
        .thresholds(x.ticks(Math.min(20, roundedMaxLOS)));

      const bins = histogram(losData);

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length) || 1])
        .range([chartHeight, 0]);

      svg
        .selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.x0))
        .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", (d) => y(d.length))
        .attr("height", (d) => chartHeight - y(d.length))
        .style("fill", "var(--primary)")
        .style("opacity", 0.8);

      svg
        .append("g")
        .attr("transform", `translate(0,${chartHeight})`)
        .attr("class", "x-axis")
        .call(d3.axisBottom(x).ticks(Math.min(10, roundedMaxLOS)));

      svg
        .append("text")
        .attr("class", "x-axis-label")
        .attr("text-anchor", "middle")
        .attr("x", chartWidth / 2)
        .attr("y", chartHeight + 30)
        .attr("fill", "var(--muted-foreground)")
        .style("font-size", "12px")
        .text("Length of Stay (days)");

      svg.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5));

      svg
        .append("text")
        .attr("class", "y-axis-label")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("x", -chartHeight / 2)
        .attr("y", -30)
        .attr("fill", "var(--muted-foreground)")
        .style("font-size", "12px")
        .text("Number of patients");

      if (meanLOS) {
        svg
          .append("line")
          .attr("x1", x(meanLOS))
          .attr("x2", x(meanLOS))
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .style("stroke", "var(--destructive)")
          .style("stroke-width", 2)
          .style("stroke-dasharray", "4");
      }

      if (medianLOS && Math.abs(medianLOS - meanLOS) > 0.5) {
        svg
          .append("line")
          .attr("x1", x(medianLOS))
          .attr("x2", x(medianLOS))
          .attr("y1", 0)
          .attr("y2", chartHeight)
          .style("stroke", "var(--primary)")
          .style("stroke-width", 2)
          .style("stroke-dasharray", "4");
      }
    } catch (error) {
      console.error("Error creating LOS chart:", error);
      this.showNoChartDataMessage(container, "Error creating LOS chart");
    }
  }

  showNoChartDataMessage(container, message) {
    if (!container) return;

    container.innerHTML = "";

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const svg = d3
      .select(container)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    svg
      .append("text")
      .attr("class", "no-data-text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .text(message || "No data available");
  }

  showNoSelectionMessage() {
    this.container.innerHTML = `
<div class="no-data-msg">
  <div class="placeholder-text">
    <p>Select a surgery type to explore details.</p>
    <p>You can search for specific procedures using the search box above.</p>
  </div>
  <div class="suggestions-box">
    <p>Popular surgeries to explore:</p>
    <ul class="suggestions-list">
      <li>Appendectomy</li>
      <li>Cholecystectomy</li>
      <li>Total hip replacement</li>
      <li>Coronary artery bypass graft (CABG)</li>
    </ul>
  </div>
</div>
`;
  }

  showNoDataMessage() {
    this.container.innerHTML = `
<div class="no-data-msg">
  <div class="placeholder-text">
    <p>No data available for ${this.selectedSurgery}.</p>
    <p>Try selecting a different surgery type.</p>
  </div>
</div>
`;
  }

  showInsufficientDataMessage(count) {
    this.container.innerHTML = `
<div class="warning-message">
  <div class="warning-icon">⚠️</div>
  <p>
    <strong>Limited Data Available:</strong> 
    Only ${count} cases of ${this.selectedSurgery} found.
  </p>
  <p>
    Statistics and visualizations may not be representative.
    Consider selecting a more common procedure.
  </p>
</div>
`;
  }

  showErrorMessage(message) {
    if (!this.errorContainer) {
      this.errorContainer = document.createElement("div");
      this.errorContainer.className = "error-message";
      this.container.prepend(this.errorContainer);
    }

    this.errorContainer.textContent = message;
    this.errorContainer.style.display = "block";
  }

  clearErrorMessage() {
    if (this.errorContainer) {
      this.errorContainer.style.display = "none";
    }
  }

  handleResize() {
    if (
      this.selectedSurgery &&
      this.chartContainers.age &&
      this.chartContainers.los
    ) {
      this.chartContainers.age.innerHTML = "";
      this.chartContainers.los.innerHTML = "";

      this.createAgeHistogram(this.chartContainers.age);
      this.createHospitalLOSChart(this.chartContainers.los);
    }
  }
}
