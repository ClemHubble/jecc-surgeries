const DataProcessor = {
  processRawData(rawData) {
    return rawData.map((d) => {
      const numeric = [
        "age",
        "height",
        "weight",
        "bmi",
        "asa",
        "icu_days",
        "intraop_ebl",
        "death_inhosp",
        "opend",
        "opstart",
      ];

      numeric.forEach((field) => {
        d[field] = parseFloat(d[field]) || 0;
      });

      if (!d.bmi && d.height && d.weight) {
        d.bmi = d.weight / ((d.height / 100) * (d.height / 100));
      }

      if (d.opend && d.opstart) {
        d.duration = (d.opend - d.opstart) / 60;
      } else {
        d.duration = 0;
      }

      if (!d.department || d.department === "") d.department = "Unknown";
      if (!d.approach || d.approach === "") d.approach = "Unknown";

      return d;
    });
  },

  getSimilarProfiles(data, params) {
    const bmi = params.weight / ((params.height / 100) * (params.height / 100));

    const filters = [
      { ageRange: 2, bmiRange: 5, requireASA: true },
      { ageRange: 5, bmiRange: 8, requireASA: true },
      { ageRange: 8, bmiRange: 10, requireASA: true },
      { ageRange: 10, bmiRange: 15, requireASA: true },
      { ageRange: 10, bmiRange: 20, requireASA: true },
      { ageRange: 10, bmiRange: 25, requireASA: true }
    ];

    // Save all results for each filter level
    const allResults = [];

    for (const filter of filters) {
      const filtered = data.filter((d) => {
        if (!d.age || !d.sex) return false;

        return (
          d.age >= params.age - filter.ageRange &&
          d.age <= params.age + filter.ageRange &&
          d.sex === params.sex &&
          (filter.requireASA ? d.asa === params.asa : true) &&
          (!filter.bmiRange ||
            (d.bmi >= bmi - filter.bmiRange && d.bmi <= bmi + filter.bmiRange))
        );
      });

      // Save the current filter results
      allResults.push({
        filter: filter,
        count: filtered.length,
        data: filtered
      });

      if (filtered.length >= 10) return filtered;
    }

    // If we've reached this point, we didn't find enough matches at any filter level
    // Instead of returning all data filtered by sex, return the results from the most 
    // lenient filter that had at least one match
    const bestResult = allResults
      .filter(result => result.count > 0)
      .sort((a, b) => b.count - a.count)[0];
    
    if (bestResult) {
      return bestResult.data;
    }
    
    // If no matches at all, return empty array instead of falling back to the entire dataset
    return [];
  },

  applyDimensionFilters(data, filters) {
    return data.filter((d) => {
      if (!d.age || d.age <= 0 || !d.asa || d.asa <= 0) {
        return false;
      }

      const ageMatch = d.age >= filters.ageMin && d.age <= filters.ageMax;

      return ageMatch;
    });
  },

  getDataRange(data, dimension) {
    if (["department", "approach"].includes(dimension)) {
      return {
        type: "categorical",
        categories: [
          ...new Set(data.map((d) => this.getDimensionValue(d, dimension))),
        ]
          .filter(Boolean)
          .sort(),
      };
    } else {
      const values = data
        .map((d) => this.getDimensionValue(d, dimension))
        .filter((v) => v !== null && v !== undefined && !isNaN(v));

      return {
        type: "numeric",
        min: d3.min(values),
        max: d3.max(values),
      };
    }
  },

  getDimensionValue(dataPoint, dimension) {
    switch (dimension) {
      case "age":
        return dataPoint.age;
      case "icu":
        return dataPoint.icu_days;
      case "ebl":
        return dataPoint.intraop_ebl;
      case "duration":
        return dataPoint.duration;
      case "asa":
        return dataPoint.asa;
      case "bmi":
        return dataPoint.bmi;
      case "department":
        return dataPoint.department;
      case "approach":
        return dataPoint.approach;
      default:
        return null;
    }
  },

  calculateStats(data) {
    return {
      count: data.length,
      avgAge: d3.mean(data, (d) => d.age) || 0,
      avgDuration: d3.mean(data, (d) => d.duration) || 0,
      mortalityRate:
        data.length > 0
          ? (data.filter((d) => d.death_inhosp === 1).length / data.length) *
            100
          : 0,
    };
  },
};
