chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log("Received message in background.js:", request);
  if (request.action === 'getOpenAIResponse') {
    try {
      console.log("Processing OpenAI request for input:", request.userInput);
      
      const apiKey = "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";
      const endpoint = "https://api.openai.com/v1/chat/completions";
      const requestBody = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You're a career advisor chatbot for job applications." },
          { role: "user", content: `${request.userInput}. Relevant page content: ${request.pageContent}` }
        ],
        temperature: 0.25,
        top_p: 0.95
      };

      // Set up the fetch options
      const fetchOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      };

      // Set a timeout of 10 seconds as a fallback
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("API request timed out")), 10000)
      );

      // Run fetch request with timeout fallback
      const response = await Promise.race([fetch(endpoint, fetchOptions), timeout]);

      if (!response.ok) {
        console.error("API request failed:", response.statusText);
        sendResponse({ response: "Error: Failed to connect to AI API." });
        return true;
      }

      const data = await response.json();
      console.log("API response received:", data);

      const chatResponse = data.choices && data.choices[0]?.message?.content
        ? data.choices[0].message.content
        : "Error: No response from the AI.";
      
      console.log("Parsed chat response:", chatResponse);
      sendResponse({ response: chatResponse });
    } catch (error) {
      console.error("Error in OpenAI request:", error);
      sendResponse({ response: "There was an error or timeout connecting to the AI API." });
    }
  }
  return true;
});

