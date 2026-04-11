const axios = require('axios');
const VIATOR_API_KEY = process.env.VIATOR_API_KEY || "59af2dfa-0cd4-44ed-bef7-efdf23e3cb62"; // dummy if none

async function run() {
  try {
    const res = await axios.post("https://api.viator.com/partner/locations/search", {
      "locations": ["Ubud"] // ??? Or maybe something else
    }, {
      headers: {
        "Accept": "application/json;version=2.0",
        "exp-api-key": VIATOR_API_KEY
      }
    });
    console.log("Success:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error("Error:", err.response?.data || err.message);
  }
}

run();
