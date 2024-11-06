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

// Function to detect and fill job application form fields
function detectAndFillJobApplicationForm(userData) {
  const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
  
  inputs.forEach(input => {
    if (input.name.includes("name")) {
      input.value = userData.name || "";
    } else if (input.name.includes("email")) {
      input.value = userData.email || "";
    } else if (input.name.includes("phone")) {
      input.value = userData.phone || "";
    } else if (input.name.includes("resume") && userData.resumeLink) {
      input.value = userData.resumeLink;
    }
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getTextContent') {
    try {
      const initialContent = getTextContent();

      const observer = new MutationObserver(debounce(() => {
        const updatedContent = getTextContent();
        sendResponse({ text: updatedContent });
        observer.disconnect();
      }, 1000));

      observer.observe(document.body, { childList: true, subtree: true });

      setTimeout(() => {
        sendResponse({ text: initialContent });
        observer.disconnect();
      }, 3000);
    } catch (error) {
      console.error('Error retrieving text content:', error);
      sendResponse({ text: null });
    }
  } else if (message.action === 'fillForm') {
    detectAndFillJobApplicationForm(message.userData);
    sendResponse({ success: true });
  }
  return true;
});
