// background.js
// This script is minimal because we are not doing any background tasks here.
// It's included for completeness in case you need background functionality in the future.

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
