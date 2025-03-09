class DataService {
  constructor() {
    this.data = [];
    this.isLoaded = false;
    this.dataLoadedCallbacks = [];
  }

  loadData(url) {
    return d3
      .csv(url)
      .then((rawData) => {
        this.data = DataProcessor.processRawData(rawData);
        this.isLoaded = true;
        this.dataLoadedCallbacks.forEach((callback) => callback(this.data));
        return this.data;
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        throw error;
      });
  }

  getData() {
    return this.data;
  }

  onDataLoaded(callback) {
    if (this.isLoaded) {
      callback(this.data);
    } else {
      this.dataLoadedCallbacks.push(callback);
    }
  }

  getProfileData(profileParams) {
    return DataProcessor.getSimilarProfiles(this.data, profileParams);
  }

  getDimensionsData(filters) {
    return DataProcessor.applyDimensionFilters(this.data, filters);
  }
}

const dataService = new DataService();
