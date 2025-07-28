// Define the API endpoint for latest articles
const url = "https://data-api.coindesk.com/news/v1/article/list";

// Parameters for the request (based on the documentation)
const params = new URLSearchParams({
  lang: "EN", // Language: English
  limit: "10", // Limit to 10 articles
  // Add other params as needed, e.g., categories: 'category1,category2',
  // source_ids: '1,2', etc. (URLSearchParams handles arrays as comma-separated)
});

// API key - replace with your actual key (assuming it's passed as a query parameter; if it's a header, adjust accordingly)
const apiKey =
  "23d80c318f9a95e99ac45854f2d3d074fe560f2d0c905f880d3d4ec69c4fa9e6"; // Obtain from the API provider
params.append("api_key", apiKey); // Or use headers: { Authorization: `Bearer ${apiKey}` } if required

// Make the GET request using Fetch
fetch(`${url}?${params.toString()}`)
  .then((response) => {
    if (response.ok) {
      // Equivalent to status_code == 200
      return response.json();
    } else {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
  })
  .then((data) => {
    console.log("Latest Articles Data:");
    console.log(data);

    // Extract and print article details
    const articles = data.Data || []; // Fallback to empty array if 'Data' is missing
    articles.forEach((article) => {
      console.log(`Title: ${article.TITLE || "N/A"}`);
      console.log(`Published On: ${article.PUBLISHED_ON || "N/A"}`);
      console.log(`URL: ${article.URL || "N/A"}`);
      console.log("-".repeat(40));
    });

    // For our stock market news analysis app:
    // Here, you could feed 'articles' into a local LLM (e.g., via WebAssembly or a service worker)
    // for analysis, like sentiment scoring on titles/bodies relevant to stocks (e.g., crypto ETFs).
  })
  .catch((error) => {
    console.error("Error fetching data:", error);
  });
