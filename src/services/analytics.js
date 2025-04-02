// analytics.js
const GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;

// Initialize Google Analytics
export const initializeAnalytics = () => {
  if (!window.gtag && GA_MEASUREMENT_ID) {
    // Add the Google Analytics script tag
    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script1);

    // Add the gtag initialization script
    const script2 = document.createElement("script");
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_MEASUREMENT_ID}');
    `;
    document.head.appendChild(script2);
  }
};

// Track page views
export const trackPageView = (path) => {
  if (window.gtag) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path
    });
  }
};

// Track events
export const trackEvent = (category, action, label) => {
  if (window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label
    });
  }
};