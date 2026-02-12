# Landscape Explorer

Landscape Explorer is a **React-based web application** for visualizing geospatial data using interactive maps. It enables users to explore landscapes through administrative boundaries, filters, and pattern-based visualizations.

---

## Tech Stack

- React
- OpenLayers
- Node.js / npm
- GeoServer

---

## 📦 Prerequisites

Ensure the following are installed:

- Node.js (v16+ recommended)
- npm

---

## 🛠️ Setup & Installation

### 1. Clone the repository
```bash
git clone <repo-url>
cd landscape-explorer
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables Setup

Create a .env file in the root directory of the project where the package.json is located.

```bash
touch .env
```
Add the following variables to .env
```env
REACT_APP_API_URL="https://geoserver.core-stack.org/api/v1"
REACT_APP_GOOGLE_KEY="xxx"
REACT_APP_GEOSERVER_URL="https://geoserver.core-stack.org:8443/geoserver/"

# Google Analytics
REACT_APP_GA_MEASUREMENT_ID="xxx"
REACT_APP_API_KEY="xxx"

# MANVI environment variables
REACT_APP_WATERBODYREJ_USERNAME="xxx"
REACT_APP_WATERBODYREJ_PASSWORD="xxx"
REACT_APP_BASEURL="https://geoserver.core-stack.org"
```
### 4. Running the Application

```bash
npm run start
```
The application will be available at:
```bash
http://localhost:3000
```
### Common Issue: react-icons/gi Not Found
In some cases, after running npm install, the application may fail to start due to a missing react-icons/gi module.

#### Fix
Install the missing dependency manually:

```bash
npm install react-icons
```
Then restart the development server:
```bash
npm run start
```

## 🤝 Contributing

We welcome contributions to **Landscape Explorer**. Please follow the guidelines below to ensure a smooth collaboration process.

---

### Getting Started

1. **Fork the Repository**  
   Create your own fork of the repository to start working on the codebase.

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/core-stack-org/landscape-explorer.git
   cd landscape-explorer
   ```
3. **Work on the development Branch**
    Always switch to the development branch before starting your work:
   ```
   git checkout development
   ```

### Working on Issues

If you want to work on an existing issue:
1. Comment on the issue expressing your interest.
2. Tag any of the repository maintainers.
3. Wait until the issue is officially assigned to you.
4. After assignment, start working on the implementation.
5. Submit your changes through a Pull Request.

### Submitting a Pull Request

Ensure your branch is updated with the latest `development` branch.

1. Push your changes to your fork.
2. Create a Pull Request (PR) targeting the `development` branch.
3. Provide a clear description of:
   - What changes were made
   - Why the changes were made
   - Any related issue number (if applicable)
