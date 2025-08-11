export async function handler(event) {
    try {
      const { text } = JSON.parse(event.body || "{}");
  
      if (!text) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "No text provided" })
        };
      }
  
      // --- KIMI API Call ---
      const kimiResponse = await fetch("https://api.moonshot.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.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}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "kimi-k2", // ya jo model tum use karna chahte ho
          messages: [{ role: "user", content: text }]
        })
      });
  
      const kimiData = await kimiResponse.json();
  
      // --- DeepSeek API Call ---
      const deepseekResponse = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.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}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek-chat", // apne model ka naam dal
          messages: [{ role: "user", content: text }]
        })
      });
  
      const deepseekData = await deepseekResponse.json();
  
      // --- Return Combined Result ---
      return {
        statusCode: 200,
        body: JSON.stringify({
          kimiResult: kimiData,
          deepseekResult: deepseekData
        })
      };
  
    } catch (error) {
      console.error("Error in analyze.js:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message || error })
      };
    }
  }
  