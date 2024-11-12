// 保存済みのAPIキーを読み込む
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['openaiApiKey'], (result) => {
    if (result.openaiApiKey) {
      document.getElementById('apiKey').value = result.openaiApiKey;
    }
  });
});

document.getElementById('saveKey').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (apiKey) {
    chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
      alert('APIキーが保存されました。');
    });
  } else {
    alert('APIキーを入力してください。');
  }
});
