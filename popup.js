document.getElementById('send-button').addEventListener('click', () => {
  const userInput = document.getElementById('user-input').value;
  if (userInput) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0].url;
      if (url.startsWith('chrome://')) {
        console.error('Cannot interact with chrome:// URLs');
        return;
      }
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ['content.js']
      }, (results) => {
        if (chrome.runtime.lastError) {
          console.error('Script injection failed: ' + chrome.runtime.lastError.message);
          return;
        }
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

function addMessage(sender, message) {
  const chatbox = document.getElementById('chatbox');
  const messageElement = document.createElement('div');
  messageElement.textContent = `${sender}: ${message}`;
  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}

async function getChatGPTResponse(userInput, textContent) {
  let retries = 5;
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  while (retries > 0) {
    try {
      console.log('Sending request to OpenAI:', { userInput, textContent });
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': ''
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are an assistant that processes web page content.' },
            { role: 'user', content: `User input: ${userInput}` },
            { role: 'user', content: `Page text content: ${textContent}` }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited. Retrying in ' + (1000 * Math.pow(2, 5 - retries)) + 'ms');
          retries -= 1;
          await delay(1000 * Math.pow(2, 5 - retries));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      if (data.choices && data.choices.length > 0) {
        const chatGPTMessage = data.choices[0].message.content.trim();
        addMessage('ChatGPT', chatGPTMessage);
      } else {
        addMessage('ChatGPT', 'Sorry, I did not understand that.');
      }
      break;
    } catch (error) {
      console.error('Error fetching ChatGPT response:', error);
      addMessage('ChatGPT', 'Sorry, something went wrong.');
      break;
    }
  }
}
