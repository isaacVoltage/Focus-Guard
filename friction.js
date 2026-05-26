const urlParams = new URLSearchParams(window.location.search);
const targetSite = urlParams.get('site') || '';
const originalTargetUrl = urlParams.get('url') || '';

document.getElementById('target-site').textContent = targetSite;

let secondsLeft = 15; // Set the enforced friction delay time
const clockDisplay = document.getElementById('countdown-clock');
const optionsBox = document.getElementById('options-box');
const instructionText = document.getElementById('instruction-text');

// --- START THE FORCED FRICTION COUNTDOWN ---
const countdownInterval = setInterval(() => {
  secondsLeft--;
  clockDisplay.textContent = `${secondsLeft}s`;

  if (secondsLeft <= 0) {
    clearInterval(countdownInterval);
    
    // 1. Wipe the timer display numbers
    clockDisplay.style.display = 'none';
    
    // 2. Change instructions and unlock the grid CSS filters
    instructionText.textContent = "Friction delay cleared. Select your operational intent to unlock access:";
    optionsBox.classList.remove('locked');
    
    console.log("🔓 Friction window unlocked.");
  }
}, 1000);

// --- SELECTION TRIGGERS (Only clickable once unlocked) ---
document.querySelectorAll('.opt-btn').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const chosenReason = e.target.getAttribute('data-reason');
    
    const store = await chrome.storage.local.get(['frictionLogs', 'frictionAllowedTokens']);
    const frictionLogs = store.frictionLogs || [];
    const frictionAllowedTokens = store.frictionAllowedTokens || {};

    // Log tracking data
    frictionLogs.push({
      site: targetSite,
      reason: chosenReason,
      timestamp: Date.now()
    });

    // Provide a 5-minute continuous bypass token clearance block
    frictionAllowedTokens[targetSite] = Date.now() + (5 * 60 * 1000);

    await chrome.storage.local.set({ frictionLogs, frictionAllowedTokens });

    // Send them on their way
    window.location.href = originalTargetUrl;
  });
});

// Back-out navigation trigger button
document.getElementById('turn-back-btn').addEventListener('click', () => {
  window.location.href = "about:blank";
});