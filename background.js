chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
      target: {
          tabId: tab.id
      },
      files: ['content.js']
  }, () => {
      chrome.tabs.sendMessage(tab.id, {
          action: 'getHTML'
      }, (response) => {
          if (response) {
              console.log('HTML content:', response.html);
          } else {
              console.error('Failed to retrieve HTML content');
          }
      });
  });
});