// Debounce function to limit the rate of function execution
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Function to get visible text content
function getTextContent() {
  return document.body.innerText;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTextContent') {
    try {
      // Initial content read
      const initialContent = getTextContent();

      // Set up MutationObserver to detect changes efficiently
      const observer = new MutationObserver(debounce(() => {
        const updatedContent = getTextContent();
        sendResponse({ text: updatedContent });
        observer.disconnect(); // Stop observing after capturing the content
      }, 1000)); // 1-second debounce

      observer.observe(document.body, { childList: true, subtree: true });

      // Fallback for when no dynamic content is detected after a timeout
      setTimeout(() => {
        sendResponse({ text: initialContent });
        observer.disconnect(); // Stop observing after capturing the content
      }, 3000); // Adjust timeout as needed
    } catch (error) {
      console.error('Error retrieving text content:', error);
      sendResponse({ text: null });
    }
  }
  return true; // Required for async response
});
