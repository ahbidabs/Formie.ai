// Add event listener for the send button
document.getElementById('send-button').addEventListener('click', () => {
  const userInput = document.getElementById('user-input').value;
  if (userInput) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const url = tabs[0].url;
          if (url.startsWith('chrome://')) {
              // Notify the user instead of just logging to the console
              addMessage('System', 'Cannot interact with chrome:// URLs. Please open a regular webpage.');
              return;
          }

          // If not a chrome:// URL, continue processing
          chrome.scripting.executeScript({
              target: { tabId: tabs[0].id },
              files: ['content.js']
          }, (results) => {
              if (chrome.runtime.lastError) {
                  console.error('Script injection failed: ' + chrome.runtime.lastError.message);
                  return;
              }

              // Send a message to the content script to get the page's text content
              chrome.tabs.sendMessage(tabs[0].id, { action: 'getTextContent' }, (response) => {
                  if (chrome.runtime.lastError) {
                      console.error('Message sending failed: ' + chrome.runtime.lastError.message);
                      return;
                  }

                  if (response && response.text) {
                      const textContent = response.text;
                      addMessage('User', userInput);
                      getChatGPTResponse(userInput, textContent);
                      document.getElementById('user-input').value = '';
                  } else {
                      console.error('Failed to retrieve text content or response is undefined');
                  }
              });
          });
      });
  }
});

// Function to add messages to the chatbox
function addMessage(sender, message) {
  const chatbox = document.getElementById('chatbox');
  const messageElement = document.createElement('div');
  messageElement.textContent = `${sender}: ${message}`;
  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}
