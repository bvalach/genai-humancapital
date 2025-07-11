# The Impact of Generative AI on the Future of Work

## A Living Literature Review

### Introduction

This repository contains the source code for a dynamic web application that serves as a living literature review on the impact of Generative Artificial Intelligence on employment and the future of work. The project aims to provide an up-to-date, interactive repository of academic papers and gray literature, facilitating ongoing analysis of the socioeconomic impacts and technological implications of AI in the labor market.

The application automatically fetches recent publications from leading academic databases, filters them for relevance, and presents them in a user-friendly interface. This enables continuous monitoring of developments in AI automation, human-AI collaboration, and workforce transformation across industries.

### Doctoral Research Context

This work is part of the PhD thesis by:

- **PhD Candidate:** Beatriz Vallina, PhD
- **Institution:** Doctorate in Agrifood Economics, Universitat Politècnica de València  
- **LinkedIn:** [linkedin.com/in/beatrizvallina](https://www.linkedin.com/in/beatrizvallina/)

Supervised by:

- Roberto Cervelló, Prof.PhD
- Juan José Llul, PhD

### Related Work

This living review builds upon the researcher's previous work:
- [Living Review on Generative AI in the Food Chain](https://bvalach.github.io/genai-agrifood/index.html)

### Features

- **Real-time Data Fetching:** Automatically retrieves paper data from the CrossRef API and other academic sources.
- **Dynamic Filtering:** Displays recent publications with filtering capabilities by year, type, and relevance to maintain currency of the review.
- **Interactive Interface:** Users can explore papers with detailed metadata, abstracts, and citation information in an intuitive interface.
- **DOI Integration:** Provides direct links to publications via their Digital Object Identifier (DOI) where available.
- **Gray Literature Integration:** Includes reports and working papers from major institutions such as World Bank, OECD, McKinsey Global Institute, and Brookings Institution.
- **Manual Curation:** Allows for manual addition of relevant papers not captured by automated searches.

### Scope and Focus

This living review covers key themes including:

- Generative AI and knowledge work productivity
- Large language models and employment effects
- Automation and job displacement
- Human-AI collaboration in professional services
- Reskilling and upskilling in the AI era
- Economic impacts of AI on labor markets
- Policy implications for workforce development

### Technical Overview

The application is built with standard web technologies:
- HTML5
- CSS3
- Vanilla JavaScript

It fetches data asynchronously from public APIs and dynamically generates content on the client-side, requiring no backend infrastructure.

### Data Sources

This living review integrates data from multiple sources:

- **Academic Databases:**
  - [CrossRef](https://www.crossref.org/services/metadata-delivery/rest-api/) - Comprehensive scholarly metadata
  - [Semantic Scholar](https://www.semanticscholar.org/product/api) - AI-powered academic search
  - [OpenAlex](https://openalex.org/) - Open catalog of scholarly papers

- **Gray Literature Sources:**
  - World Bank Open Knowledge Repository
  - OECD Publications
  - McKinsey Global Institute Reports
  - Brookings Institution Research

### Local Development

To run this project locally, a web server is required to handle API requests correctly due to browser security policies (CORS).

1. Ensure you have Python installed.
2. Navigate to the project's root directory in your terminal.
3. Start the local server with the following command:

   ```bash
   # For Python 3
   python -m http.server 8000
   ```

4. Open your web browser and navigate to `http://localhost:8000`.

Alternatively, you can use any other local web server such as:

```bash
# Using Node.js http-server
npx http-server

# Using PHP built-in server
php -S localhost:8000
```

### Deployment

This project is designed for static hosting platforms and can be easily deployed using services like:

- GitHub Pages
- Netlify
- Vercel
- Any static web hosting service

### Configuration

The application can be configured by modifying the `CONFIG` object in `script.js`:

- **Search Keywords:** Adjust the keywords used for automatic literature searches
- **Date Ranges:** Modify the minimum and maximum years for paper inclusion
- **API Endpoints:** Update API URLs and parameters as needed
- **Display Settings:** Customize pagination, filtering options, and UI elements

### Usage Guidelines

1. **Automatic Updates:** The application automatically refreshes data from APIs every 24 hours
2. **Manual Curation:** Use the "Add Paper" tab to manually include relevant literature not captured by automated searches
3. **Filtering:** Use the search and filter controls to narrow down results by year, type, or keywords
4. **Citations:** All papers include citation counts and relevance scores for academic assessment

### Relevance Scoring Algorithm

The application employs a multi-criteria relevance scoring system (0-100 points) to rank papers by their importance to the research domain. The algorithm considers four key dimensions:

#### Scoring Components

**1. Academic Impact (30% weight)**
- Based on citation count as a proxy for scholarly influence
- Formula: `min(citations ÷ 10, 30)`
- Papers with 300+ citations receive maximum points (30)
- Reflects the paper's recognition within the academic community

**2. Temporal Relevance (25% weight)**
- Prioritizes recent publications capturing latest developments
- Formula: `((year - 2021) ÷ 4) × 25`
- Range covers 2021-2025 to capture the generative AI revolution
- 2025 publications receive maximum points (25)

**3. Thematic Relevance (25% weight)**
- Measures alignment with core research keywords through content analysis
- Evaluates title and abstract against 8 key terms:
  - "artificial intelligence jobs"
  - "generative AI employment"
  - "AI automation workforce"
  - "machine learning labor market"
  - "agentic AI future work"
  - "ChatGPT employment impact"
  - "large language models jobs"
  - "AI displacement workers"
- Formula: `(keyword matches ÷ 8) × 25`

**4. Publication Type Quality (20% weight)**
- Reflects the scholarly rigor and peer-review standards
- Scoring hierarchy:
  - Peer-reviewed journals: 20 points
  - Institutional reports: 18 points
  - Books: 16 points
  - Conference proceedings: 15 points
  - Working papers: 12 points
  - Other sources: 10 points

#### Score Interpretation

- **90-100:** Highly relevant, recent, and impactful papers
- **70-89:** Strong relevance with good academic standing
- **50-69:** Moderate relevance, suitable for background research
- **30-49:** Limited relevance, may provide contextual information
- **0-29:** Low relevance, included for completeness

This scoring system enables researchers to quickly identify the most valuable papers for their literature review while maintaining transparency in the ranking methodology.

### Limitations

- API rate limits may affect the frequency of automatic updates
- Gray literature sources require manual curation due to varied publication formats
- Citation counts may vary between different academic databases
- Some papers may require institutional access for full-text viewing

### Contributing

This is a research tool designed for academic purposes. Contributions in the form of relevant paper suggestions, improved search algorithms, or enhanced UI functionality are welcome through GitHub issues and pull requests.

### License

This project is licensed under the MIT License - see the LICENSE file for details.

### Contact

For questions regarding this living literature review or its underlying research, please open an issue in this repository.
