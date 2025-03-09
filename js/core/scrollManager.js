class ScrollManager {
  constructor() {
    this.sections = document.querySelectorAll(".text-section");
    this.highlightSections = document.querySelectorAll(".highlight-section");
    this.vizSections = document.querySelectorAll(".viz-section");
    this.progressBar = document.getElementById("progress-bar");
    this.activeViz = "viz-profile";
    this.transitionMarker = document.querySelector(".transition-marker");
    this.transitionPoint = this.transitionMarker
      ? this.transitionMarker.offsetTop
      : 0;

    this.updateVisualization = this.updateVisualization.bind(this);
    this.updateTransitionPoint = this.updateTransitionPoint.bind(this);

    window.addEventListener("scroll", this.updateVisualization);
    window.addEventListener("resize", this.updateTransitionPoint);

    this.updateVisualization();
    this.updateTransitionPoint();
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
    const newActiveViz =
      scrollTop > this.transitionPoint ? "viz-dimensions" : "viz-profile";

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

  updateTransitionPoint() {
    if (this.transitionMarker) {
      this.transitionPoint = this.transitionMarker.offsetTop;
    }
  }

  onVisualizationChange(callback) {
    this.onVizChangeCallback = callback;
  }

  getActiveVisualization() {
    return this.activeViz;
  }
}

const scrollManager = new ScrollManager();
