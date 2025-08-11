exports.handler = async (event, context) => {
  console.log("KIMI key loaded:", !!process.env.KIMI_API_KEY);
  console.log("DEEPSEEK key loaded:", !!process.env.DEEPSEEK_API_KEY);

  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        kimiExists: !!process.env.KIMI_API_KEY,
        deepseekExists: !!process.env.DEEPSEEK_API_KEY
      })
    };
  } catch (error) {
    console.error("Error in function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || error })
    };
  }
};
