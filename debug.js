export async function handler(event, context) {
    console.log("KIMI key loaded:", !!process.env.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 );
    console.log("DEEPSEEK key loaded:", !!process.env.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 );
  
    try {
      return {
        statusCode: 200,
        body: JSON.stringify({
          kimiExists: !!process.env.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 ,
          deepseekExists: !!process.env.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 
        })
      };
    } catch (error) {
      console.error("Error in function:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message || error })
      };
    }
  }
  