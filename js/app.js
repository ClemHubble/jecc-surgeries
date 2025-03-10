class App {
  constructor() {
    this.patientProfile = null;
    this.dimensionsExplorer = null;
    this.surgeryExplorer = null;
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
    this.surgeryExplorer = new SurgeryExplorer("surgery-results");

    this.scrollManager.onVisualizationChange((activeViz) => {
      console.log(`Active visualization changed to: ${activeViz}`);

      const vizSections = document.querySelectorAll(".viz-section");
      vizSections.forEach((section) => {
        if (section.id === activeViz) {
          section.classList.add("active");
        } else {
          section.classList.remove("active");
        }
      });
    });
  }

  showErrorMessage(message) {
    const errorElement = document.createElement("div");
    errorElement.className = "error-message";
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
