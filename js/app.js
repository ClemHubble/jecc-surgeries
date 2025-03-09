class App {
  constructor() {
    this.patientProfile = null;
    this.dimensionsExplorer = null;
    this.scrollManager = scrollManager;
    this.initializeData();
    document.addEventListener("DOMContentLoaded", () => {
      this.initializeComponents();
    });
  }

  initializeData() {
    dataService
      .loadData("data/vitaldb_cases.csv")
      .then((data) => {
        console.log(`Loaded ${data.length} records`);
      })
      .catch((error) => {
        console.error("Failed to load data:", error);
        this.showErrorMessage(
          "Failed to load data. Please try refreshing the page."
        );
      });
  }

  initializeComponents() {
    this.patientProfile = new PatientProfile("profile-results");
    this.dimensionsExplorer = new DimensionsExplorer("dimensions-chart");
    this.scrollManager.onVisualizationChange((activeViz) => {
      console.log(`Active visualization changed to: ${activeViz}`);
    });
  }

  showErrorMessage(message) {
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
    errorElement.style.backgroundColor = "#ffeeee";
    errorElement.style.color = "#cc0000";
    errorElement.style.padding = "1rem";
    errorElement.style.margin = "1rem";
    errorElement.style.borderRadius = "8px";
    errorElement.style.textAlign = "center";
    errorElement.style.fontWeight = "bold";
    errorElement.textContent = message;

    const container = document.querySelector(".container");
    if (container) {
      container.insertBefore(errorElement, container.firstChild);
    } else {
      document.body.insertBefore(errorElement, document.body.firstChild);
    }
  }
}

const app = new App();
