function getFormQuestionsAndInputs() {
  const formElements = document.querySelectorAll('input, textarea, select');
  let formData = [];

  formElements.forEach(element => {
    let label = document.querySelector(`label[for="${element.id}"]`) || element.closest('label');
    let labelText = label ? label.innerText.trim() : element.placeholder;
    
    if (labelText) {
      formData.push({
        question: labelText,
        inputId: element.id || element.name,
        inputType: element.tagName.toLowerCase()
      });
    }
  });

  return formData;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getFormQuestionsAndInputs') {
    try {
      const formData = getFormQuestionsAndInputs();
      sendResponse({ formData: formData });
    } catch (error) {
      console.error('Error retrieving form questions:', error);
      sendResponse({ formData: null });
    }
  } else if (message.action === 'fillForm') {
    try {
      message.answers.forEach(answer => {
        const inputElement = document.querySelector(`#${answer.inputId}, [name="${answer.inputId}"]`);
        if (inputElement) {
          if (inputElement.tagName.toLowerCase() === 'select') {
            const option = Array.from(inputElement.options).find(opt => opt.text.includes(answer.response));
            if (option) {
              inputElement.value = option.value;
            }
          } else {
            inputElement.value = answer.response;
          }
        }
      });
      sendResponse({ status: 'form filled' });
    } catch (error) {
      console.error('Error filling form:', error);
      sendResponse({ status: 'error', message: error.message });
    }
  }
  return true; // Required for async response
});
