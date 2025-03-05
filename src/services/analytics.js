// Track page views
export const trackPageView = (path) => {
    if (window.gtag) {
      window.gtag('config', 'G-Q885CFPDYX', {
        page_path: path
      });
    }
  };
  
  // Track events
  export const trackEvent = (category, action, label = null, value = null) => {
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      });
    }
  };