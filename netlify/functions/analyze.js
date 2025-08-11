const fetch = require("node-fetch");

exports.handler = async (event, context) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const text = body.text;

    if (!text) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "No text provided" })
      };
    }

    // Call KIMI API
    const kimiResponse = await fetch("https://api.kimi.ai/v1/analyze", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.KIMI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    }).then(res => res.json());

    // Call DeepSeek API
    const deepseekResponse = await fetch("https://api.deepseek.com/v1/analyze", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text })
    }).then(res => res.json());

    return {
      statusCode: 200,
      body: JSON.stringify({
        kimi: kimiResponse,
        deepseek: deepseekResponse
      })
    };

  } catch (error) {
    console.error("Error in analyze function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || error })
    };
  }
};
