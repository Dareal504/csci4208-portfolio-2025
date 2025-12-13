// scripts/http.js

// ---------- GET ----------
export const sendGETRequest = async (url) => { // Asynchronous function
    const options = new Object();               // Empty object for HTTP options
    options.method = "GET";                     // HTTP method: GET
    const response = await fetch(url, options); // Send request with fetch (wait)
    const data = await response.json();         // Extract json from response (wait)
    return data;                                // Return data as an Object
  };
  
  // ---------- PUT ----------
  export const sendPUTRequest = async (url, data) => {
    const options = new Object();
    options.method = "PUT";
    options.headers = { "Content-type": "application/json" };
    options.body = JSON.stringify(data);
    const response = await fetch(url, options);
    return response;
  };
  