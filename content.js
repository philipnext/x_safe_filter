// APIキーを取得
function getApiKey() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['openaiApiKey'], (result) => {
      if (result.openaiApiKey) {
        resolve(result.openaiApiKey);
      } else {
        reject('APIキーが設定されていません。拡張機能の設定からAPIキーを入力してください。');
      }
    });
  });
}

// モデレーション済みの投稿を記録
const processedTweets = new Set();

// 投稿を判定して表示制御
async function moderateTweet(tweetText, tweetElement) {
  if (processedTweets.has(tweetText)) {
    return;  // 既に処理済み
  }
  processedTweets.add(tweetText);

  try {
    const apiKey = await getApiKey();
    const response = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ model: "omni-moderation-latest", input: tweetText })
    });
    const data = await response.json();
    const moderationResult = data.results[0];

    // 判定ロジック
    if (moderationResult.flagged) {
      const tweetContent = tweetElement.querySelector('div[lang] > span');
      if (tweetContent) {
        tweetContent.style.display = 'none';  // ツイート内容のみ非表示

        // 「センシティブな内容を表示」ボタンを作成
        const revealButton = document.createElement('button');
        revealButton.innerText = 'センシティブな内容を表示';
        revealButton.style.margin = '10px';
        revealButton.onclick = () => {
          tweetContent.style.display = 'block';  // 内容を再表示
          revealButton.style.display = 'none';   // ボタンを非表示
        };

        tweetContent.parentNode.insertBefore(revealButton, tweetContent);
      }
    }
  } catch (error) {
    console.error('Moderation APIエラー:', error);
  }
}

// 新しい投稿をチェック
function checkNewTweets(mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tweets = node.querySelectorAll('article');
          tweets.forEach(article => {
            const tweetContent = article.querySelector('div[lang]');
            if (tweetContent) {
              const tweetText = tweetContent.innerText;
              moderateTweet(tweetText, article);
            }
          });
        }
      });
    }
  }
}

// タイムラインを柔軟に検出して監視
function observeTimeline() {
  const timelineSelectors = [
    'div[aria-label="タイムライン: ホームタイムライン"]',
    'section[role="region"][aria-labelledby]',
    'div[aria-label="Timeline: Your Home Timeline"]'
  ];

  let timeline = null;

  for (const selector of timelineSelectors) {
    timeline = document.querySelector(selector);
    if (timeline) break;
  }

  if (timeline) {
    const observer = new MutationObserver(checkNewTweets);
    observer.observe(timeline, { childList: true, subtree: true });

    // 初期ロード時の既存投稿をチェック
    const initialTweets = timeline.querySelectorAll('article');
    initialTweets.forEach(article => {
      const tweetContent = article.querySelector('div[lang]');
      if (tweetContent) {
        const tweetText = tweetContent.innerText;
        moderateTweet(tweetText, article);
      }
    });
  } else {
    console.error('タイムラインが見つかりません。DOMが動的に変わっている可能性があります。');
  }
}

// タイムラインを監視開始
setTimeout(() => {observeTimeline()}, 5000);
