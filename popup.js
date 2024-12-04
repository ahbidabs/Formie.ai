document.getElementById('startChat').addEventListener('click', showChat);
document.getElementById('send-button').addEventListener('click', () => {
  converse(document.getElementById('user-input').value, true);
});
document.getElementById('fill-button').addEventListener('click', () => {
  inputFill();
});

function converse(userInput, display = false) {
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
          document.getElementById('user-input').value = 'Loading...';
          document.getElementById('user-input').disabled = true;
          if (display) {
            addMessage('User', userInput);
          }
          getChatGPTResponse(userInput, textContent);
          document.getElementById('user-input').value = '';
          document.getElementById('user-input').disabled = false;
        } else {
          console.error('Failed to retrieve text content or response is undefined');
        }
      });
    });
  });
}

function showChat() {
  document.getElementById('chat').removeAttribute('hidden');
  document.getElementById('send-button').removeAttribute('hidden');
  document.getElementById('startChat').setAttribute('hidden', true);
  const summary =
    'Create a simplified summary of the page content. Mention the key points and the main idea of the page with an emoji for each. Finally, tell the user you are open to questions.';
  document.getElementById('user-input').value = 'Loading...';
  document.getElementById('user-input').disabled = true;
  converse(summary);
  document.getElementById('user-input').value = '';
  document.getElementById('user-input').disabled = false;
}

function marked(text) {
  return text
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*)\*/gim, '<i>$1</i>')
    .replace(/\n/gim, '<br>');
}

function addMessage(sender, message) {
  const chatbox = document.getElementById('chatbox');
  const messageElement = document.createElement('div');

  if (sender === 'User') {
    messageElement.className = 'user-message';
    messageElement.textContent = `You: ${message}`;
  } else if (sender === 'ChatGPT') {
    messageElement.className = 'ai-message';
    messageElement.textContent = `Formie.AI: ${message}`;
  }

  chatbox.appendChild(messageElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function addThinkingBubbles() {
  const chatbox = document.getElementById('chatbox');
  const thinkingElement = document.createElement('div');
  thinkingElement.className = 'thinking-bubbles';
  thinkingElement.innerHTML = '<span>.</span><span>.</span><span>.</span>';
  thinkingElement.id = 'thinking-bubbles';
  chatbox.appendChild(thinkingElement);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function removeThinkingBubbles() {
  const thinkingElement = document.getElementById('thinking-bubbles');
  if (thinkingElement) {
    thinkingElement.remove();
  }
}

async function getChatGPTResponse(userInput, textContent) {
  let retries = 5;
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  // Add thinking bubbles
  addThinkingBubbles();

  while (retries > 0) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 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'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a career advisor that processes web page content.' },
            { role: 'user', content: `User input: ${userInput}` },
            { role: 'user', content: `Page text content: ${textContent}` }
          ],
          max_tokens: 150,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited. Retrying...');
          retries -= 1;
          await delay(1000 * Math.pow(2, 5 - retries));
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Remove thinking bubbles
      removeThinkingBubbles();

      if (data.choices && data.choices.length > 0) {
        const chatGPTMessage = data.choices[0].message.content.trim();
        addMessage('ChatGPT', chatGPTMessage);
      } else {
        addMessage('ChatGPT', 'Sorry, I did not understand that.');
      }
      break;
    } catch (error) {
      console.error('Error fetching ChatGPT response:', error);
      removeThinkingBubbles();
      addMessage('ChatGPT', 'Sorry, something went wrong.');
      break;
    }
  }
}

function inputFill(elementId = 'first_name', message = 'Your name here') {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0].url;
    if (url.startsWith('chrome://')) {
      console.error('Cannot interact with chrome:// URLs');
      return;
    }
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getSiteHTML' }, (response) => {
        if (response && response.html) {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: (elementId, message) => {
              const element = document.getElementById(elementId);
              if (element) {
                element.innerHTML = message;
              }
            },
            args: [elementId, message]
          });
        }
      });
    });
  });
}
