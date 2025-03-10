class ScrollManager {
  constructor() {
    this.sections = document.querySelectorAll(".text-section");
    this.highlightSections = document.querySelectorAll(".highlight-section");
    this.vizSections = document.querySelectorAll(".viz-section");
    this.progressBar = document.getElementById("progress-bar");
    this.activeViz = "viz-profile";
    this.transitionMarkers = document.querySelectorAll(".transition-marker");
    this.transitionPoints = [];

    this.updateVisualization = this.updateVisualization.bind(this);
    this.updateTransitionPoints = this.updateTransitionPoints.bind(this);

    window.addEventListener("scroll", this.updateVisualization);
    window.addEventListener("resize", this.updateTransitionPoints);

    this.updateVisualization();
    this.updateTransitionPoints();
  }

  updateScrollProgress() {
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight - windowHeight;
    const scrollTop = window.scrollY;
    const progress = (scrollTop / documentHeight) * 100;

    this.progressBar.style.width = `${progress}%`;
  }

  updateVisualization() {
    this.updateScrollProgress();

    const scrollTop = window.scrollY + window.innerHeight / 2;

    let newActiveViz = "viz-profile";

    if (
      this.transitionPoints.length >= 2 &&
      scrollTop > this.transitionPoints[1]
    ) {
      newActiveViz = "viz-surgery";
    } else if (
      this.transitionPoints.length >= 1 &&
      scrollTop > this.transitionPoints[0]
    ) {
      newActiveViz = "viz-dimensions";
    }

    if (newActiveViz !== this.activeViz) {
      this.activeViz = newActiveViz;

      this.vizSections.forEach((section) => {
        if (section.id === this.activeViz) {
          section.classList.add("active");
        } else {
          section.classList.remove("active");
        }
      });

      if (this.onVizChangeCallback) {
        this.onVizChangeCallback(this.activeViz);
      }
    }

    let activeSection = null;

    this.sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const isVisible =
        rect.top < window.innerHeight * 0.6 &&
        rect.bottom > window.innerHeight * 0.4;

      const sectionViz = section.dataset.viz || "viz-profile";

      if (isVisible && sectionViz === this.activeViz) {
        activeSection = section;
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });

    if (activeSection) {
      const highlightId = activeSection.dataset.highlight;

      this.highlightSections.forEach((section) => {
        if (section.id === highlightId) {
          section.classList.add("active");
        } else {
          section.classList.remove("active");
        }
      });
    }
  }

  updateTransitionPoints() {
    this.transitionPoints = [];

    this.transitionMarkers.forEach((marker) => {
      this.transitionPoints.push(marker.offsetTop);
    });

    this.transitionPoints.sort((a, b) => a - b);
  }

  onVisualizationChange(callback) {
    this.onVizChangeCallback = callback;
  }

  getActiveVisualization() {
    return this.activeViz;
  }
}

const scrollManager = new ScrollManager();
