const Formatters = {
  formatValue(value, dimension) {
    if (value === undefined || value === null || isNaN(value)) {
      return "N/A";
    }

    switch (dimension) {
      case "duration":
        return value >= 60
          ? `${Math.floor(value / 60)}h ${Math.round(value % 60)}m`
          : `${Math.round(value)}m`;
      case "ebl":
        return `${value.toLocaleString()} mL`;
      case "icu":
        return `${value.toFixed(1)} days`;
      case "bmi":
        return value.toFixed(1);
      case "age":
        return `${Math.round(value)} years`;
      case "asa":
        return value.toFixed(0);
      default:
        return String(value);
    }
  },

  formatStat(value, decimals = 0, unit = "") {
    if (value === undefined || value === null || isNaN(value)) {
      return "N/A";
    }
    return `${value.toFixed(decimals)} ${unit}`.trim();
  },

  formatComparison(value, compareValue, higherIsBetter = true) {
    if (
      value === undefined ||
      value === null ||
      isNaN(value) ||
      compareValue === undefined ||
      compareValue === null ||
      isNaN(compareValue) ||
      compareValue === 0
    ) {
      return "";
    }

    const percentChange = ((value - compareValue) / compareValue) * 100;
    const isHigher = percentChange > 0;

    const isPositive = higherIsBetter ? isHigher : !isHigher;

    const sign = isHigher ? "+" : "";
    const formattedValue = `${sign}${percentChange.toFixed(1)}%`;

    const qualityLabel = isPositive ? " better" : " worse";

    return `${formattedValue} vs avg${qualityLabel}`;
  },

  getDimensionLabel(dimension) {
    const labels = {
      age: "Age (years)",
      icu: "ICU Days",
      ebl: "Blood Loss (mL)",
      duration: "Surgery Duration (min)",
      asa: "ASA Score",
      bmi: "Body Mass Index",
      department: "Department",
      approach: "Surgical Approach",
    };

    return labels[dimension] || dimension;
  },
};
