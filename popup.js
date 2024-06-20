document.getElementById('send-button').addEventListener('click', () => {
    const userInput = document.getElementById('user-input').value;
    if (userInput) {
        chrome.tabs.query({
            active: true,
            currentWindow: true
        }, (tabs) => {
            chrome.scripting.executeScript({
                target: {
                    tabId: tabs[0].id
                },
                files: ['content.js']
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error('Script injection failed: ' + chrome.runtime.lastError.message);
                    return;
                }
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: 'getFormQuestionsAndInputs'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Message sending failed: ' + chrome.runtime.lastError.message);
                        return;
                    }
                    if (response && response.formData) {
                        const formData = response.formData;
                        console.log('Form Data:', formData);
                        getChatGPTResponse(userInput, formData).then(answers => {
                            console.log('Answers:', answers);
                            chrome.tabs.sendMessage(tabs[0].id, {
                                action: 'fillForm',
                                answers: answers
                            }, (response) => {
                                if (response.status === 'form filled') {
                                    displayQuestionsAndAnswers(formData, answers);
                                } else {
                                    console.error('Failed to fill the form');
                                }
                            });
                        });
                    } else {
                        console.error('Failed to retrieve form data or response is undefined');
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

async function getChatGPTResponse(userInput, formData) {
    let retries = 5;
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    let answers = [];

    while (retries > 0) {
        try {
            console.log('Sending request to OpenAI:', {
                userInput,
                formData
            });
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-proj-rtl8xw4O4du6FimFCKsaT3BlbkFJQgXaG4kJABwPxI9k5h1F'
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [{
                            role: 'system',
                            content: 'You are an assistant that fills out form fields based on user input.'
                        },
                        {
                            role: 'user',
                            content: `User input: ${userInput}`
                        },
                        ...formData.map(data => ({
                            role: 'user',
                            content: `Form question: ${data.question}`
                        }))
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
                const responses = data.choices[0].message.content.trim().split('\n');
                console.log('Parsed Responses:', responses);
                formData.forEach((form, index) => {
                    if (responses[index]) {
                        answers.push({
                            inputId: form.inputId,
                            response: responses[index]
                        });
                    }
                });
            } else {
                console.error('No valid response from OpenAI');
            }
            break;
        } catch (error) {
            console.error('Error fetching ChatGPT response:', error);
            addMessage('ChatGPT', 'Sorry, something went wrong.');
            break;
        }
    }
    return answers;
}

function displayQuestionsAndAnswers(formData, answers) {
    const chatbox = document.getElementById('chatbox');
    console.log('Displaying Questions and Answers:');
    formData.forEach((form, index) => {
        const answer = answers.find(ans => ans.inputId === form.inputId);
        if (answer) {
            const messageElement = document.createElement('div');
            messageElement.textContent = `Question: ${form.question}\nAnswer: ${answer.response}`;
            console.log(`Question: ${form.question}, Answer: ${answer.response}`);
            chatbox.appendChild(messageElement);
        } else {
            console.warn(`No answer found for question: ${form.question}`);
        }
    });
    chatbox.scrollTop = chatbox.scrollHeight;
}