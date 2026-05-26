async function renderBlockDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const blockedSite = urlParams.get('blockedSite') || 'This Website';
  // 1. Grab the custom block reason passed from background.js
  const customReason = urlParams.get('reason') || 'Daily limit configuration exceeded.';
  
  document.getElementById('target-site').textContent = blockedSite;

  // Query usage structures to present data
  const today = new Date().toISOString().split('T')[0];
  const store = await chrome.storage.local.get(['usageData', 'siteLimits']);
  
  const usageData = store.usageData || {};
  const siteLimits = store.siteLimits || {};

  const absoluteSeconds = (usageData[today] && usageData[today][blockedSite]) || 0;
  const configuredLimit = siteLimits[blockedSite] || 0;

  const minutesUsed = Math.floor(absoluteSeconds / 60);
  const minutesAllowed = Math.floor(configuredLimit / 60);

  // 2. SMART CONDITIONAL LAYOUT INJECTION ENGINE (Handles Limits vs Goals)
  if (customReason.includes("Goal Lock") || customReason.includes("Reward Expired")) {
    document.getElementById('limit-info').innerHTML = `
      🎯 <strong>Goal Contract Active:</strong> Website restricted until task completed.<br>
      📊 <strong>Current Status:</strong> ${customReason}<br>
      🚀 <em>Keep pushing! Open up your development environments or learning paths to unlock your reward tokens.</em>
    `;
  } else {
    // Falls back seamlessly to your original layout parameters
    document.getElementById('limit-info').innerHTML = `
      • <strong>Block Reason:</strong> ${customReason}<br>
      • <strong>Time Used Today:</strong> ${minutesUsed} min (${absoluteSeconds} seconds)<br>
      • <strong>Configured Max Limit:</strong> ${configuredLimit ? `${minutesAllowed} min (${configuredLimit} seconds)` : 'No limit set (Scheduled Block)'}
    `;
  }
}

document.getElementById('back-btn').addEventListener('click', () => {
  // Try bouncing back in history or close tab if stuck
  if (history.length > 1) {
    history.back();
  } else {
    window.close();
  }
});

renderBlockDetails();