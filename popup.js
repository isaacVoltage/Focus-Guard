// Toggle input visibility based on chosen configuration type
document.getElementById('rule-type').addEventListener('change', (e) => {
  const val1 = document.getElementById('rule-val1');
  const val2 = document.getElementById('rule-val2');
  if (e.target.value === 'schedule') {
    val1.type = 'time'; val1.placeholder = 'Start';
    val2.style.display = 'block'; val2.type = 'time';
  } else {
    val1.type = 'text'; val1.placeholder = 'Min (e.g. 30)';
    val2.style.display = 'none';
  }
});

// Save rule to persistent chrome storage
document.getElementById('add-rule-btn').addEventListener('click', async () => {
  let domain = document.getElementById('new-domain').value.trim().toLowerCase();
  const ruleType = document.getElementById('rule-type').value;
  const val1 = document.getElementById('rule-val1').value;
  const val2 = document.getElementById('rule-val2').value;

  if (!domain) return alert('Please enter a target domain.');

  // --- DOMAIN SANITIZATION CLEANUP LAYER ---
  // Safely extracts the core domain even if the user pastes a full link like https://www.youtube.com/watch
  try {
    if (domain.includes("://")) {
      domain = new URL(domain).hostname;
    }
    if (domain.startsWith("www.")) {
      domain = domain.substring(4);
    }
  } catch (e) {
    return alert('Invalid website link format. Please check your text entry.');
  }

  if (ruleType === 'limit') {
    const seconds = parseInt(val1, 10) * 60;
    if (isNaN(seconds)) return alert('Enter valid minutes.');
    
    const store = await chrome.storage.local.get(['siteLimits']);
    const siteLimits = store.siteLimits || {};
    siteLimits[domain] = seconds;
    await chrome.storage.local.set({ siteLimits });
  } else {
    if (!val1 || !val2) return alert('Enter both start and end times.');
    
    const store = await chrome.storage.local.get(['schedules']);
    const schedules = store.schedules || {};
    if (!schedules[domain]) schedules[domain] = [];
    schedules[domain].push({ start: val1, end: val2 });
    await chrome.storage.local.set({ schedules });
  }

  alert(`Rule successfully configured for ${domain}!`);
  
  // Clear layout text fields out smoothly
  document.getElementById('new-domain').value = '';
  document.getElementById('rule-val1').value = '';
  document.getElementById('rule-val2').value = '';
  
  // --- RE-RENDER INTERFACE REFRESH CALLS ---
  if (typeof renderQuickStats === 'function') renderQuickStats();
  if (typeof renderActiveRules === 'function') renderActiveRules();
});

// Primary dashboard link shortcut
document.getElementById('open-dashboard').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Keep existing tracking visualization rendering logic from Phase 2 down here:
async function renderQuickStats() {
  const container = document.getElementById('quick-stats');
  const data = await chrome.storage.local.get(['usageData']);
  const usageData = data.usageData || {};
  const today = new Date().toISOString().split('T')[0];
  const todaysStats = usageData[today];

  if (!todaysStats || Object.keys(todaysStats).length === 0) {
    container.innerHTML = "<em>No web activity recorded yet today.</em>";
    return;
  }

  const sortedDomains = Object.entries(todaysStats).sort((a, b) => b[1] - a[1]);
  let htmlContent = '<ul style="list-style: none; padding: 0; margin: 0; max-height: 120px; overflow-y: auto;">';
  
  sortedDomains.forEach(([domain, totalSeconds]) => {
    if (domain.includes('chrome-extension://')) return;
    const minutes = Math.floor(totalSeconds / 60);
    htmlContent += `<li style="margin-bottom: 4px; font-size: 13px;"><strong>${domain}</strong>: ${minutes}m ${totalSeconds % 60}s</li>`;
  });

  htmlContent += '</ul>';
  container.innerHTML = htmlContent;
}

renderQuickStats();

// --- ✅ PLUG IN THIS UPDATED ADAPTIVE POMODORO DURATION ENGINE ---

const durationSelector = document.getElementById('focus-duration-selector');
const customWrapper = document.getElementById('custom-duration-wrapper');
const customLabel = document.getElementById('custom-input-label');
const customInput = document.getElementById('custom-duration-input');

// Toggle input layout field visibility depending on configuration selection state
if (durationSelector) {
  durationSelector.addEventListener('change', (e) => {
    const selectedMode = e.target.value;

    if (selectedMode === 'CUSTOM_MINS') {
      customWrapper.style.display = 'block';
      customLabel.textContent = "ENTER CUSTOM WORKING MINUTES:";
      customInput.placeholder = "e.g., 45";
      customInput.value = "";
    } else if (selectedMode === 'CUSTOM_HOURS') {
      customWrapper.style.display = 'block';
      customLabel.textContent = "ENTER CUSTOM WORKING HOURS:";
      customInput.placeholder = "e.g., 1.5";
      customInput.value = "";
    } else {
      customWrapper.style.display = 'none';
    }
  });
}

// Action Trigger: Registers focus tracking locks down inside browser background systems
document.getElementById('initialize-focus-btn').addEventListener('click', async () => {
  const selectionMode = durationSelector ? durationSelector.value : "25";
  let calculationMinutes = 0;

  // Evaluate structural conversion parameters
  if (selectionMode === 'CUSTOM_MINS') {
    const parsedMins = parseInt(customInput.value, 10);
    if (isNaN(parsedMins) || parsedMins <= 0) return alert("Please enter a valid number of focus minutes.");
    calculationMinutes = parsedMins;
  } else if (selectionMode === 'CUSTOM_HOURS') {
    const parsedHours = parseFloat(customInput.value);
    if (isNaN(parsedHours) || parsedHours <= 0) return alert("Please enter a valid number of focus hours.");
    // Translate hours accurately to minutes
    calculationMinutes = Math.round(parsedHours * 60);
  } else {
    calculationMinutes = parseInt(selectionMode, 10);
  }

  const msDuration = calculationMinutes * 60 * 1000;
  const targetEndTime = Date.now() + msDuration;

  // 1. Save calculated Focus Session target thresholds to storage keys
  await chrome.storage.local.set({
    focusModeActive: true,
    focusBlockUntil: targetEndTime
  });

  // 2. Schedule system execution check alert callback
  chrome.alarms.create("pomodoroFocusSession", { delayInMinutes: calculationMinutes });

  alert(`🎯 Focus Lock deployed cleanly! Your system is under deep restriction for the next ${calculationMinutes} minutes.`);

  // 3. Re-render UI viewport layouts instantly
  if (typeof evaluateFocusModeView === 'function') {
    evaluateFocusModeView();
  }
});

// Loop engine responsible for painting focus timers inside user control screens
async function evaluateFocusModeView() {
  const store = await chrome.storage.local.get(['focusModeActive', 'focusBlockUntil']);
  const inactiveArea = document.getElementById('focus-inactive-ui');
  const activeArea = document.getElementById('focus-active-ui');
  const clockText = document.getElementById('focus-countdown');

  if (store.focusModeActive && store.focusBlockUntil) {
    inactiveArea.style.display = 'none';
    activeArea.style.display = 'block';

    // Calculate time differences down to delta intervals
    const delta = store.focusBlockUntil - Date.now();

    if (delta <= 0) {
      inactiveArea.style.display = 'block';
      activeArea.style.display = 'none';
      return;
    }

    const minLeft = Math.floor(delta / 1000 / 60);
    const secLeft = Math.floor((delta / 1000) % 60);
    
    // Pad text string layout outputs e.g. "04:09" instead of "4:9"
    clockText.textContent = `${minLeft.toString().padStart(2, '0')}:${secLeft.toString().padStart(2, '0')}`;
    
    // Loop interval execution frame step
    setTimeout(evaluateFocusModeView, 1000);
  } else {
    inactiveArea.style.display = 'block';
    activeArea.style.display = 'none';
  }
}

// Append this invocation tracker sequence to register on popup initialize loads:
evaluateFocusModeView();

// Core Logic: Read rules from storage and display them with delete triggers
async function renderActiveRules() {
  const container = document.getElementById('active-rules-list');
  const store = await chrome.storage.local.get(['siteLimits', 'schedules']);
  
  const siteLimits = store.siteLimits || {};
  const schedules = store.schedules || {};

  const allDomains = new Set([...Object.keys(siteLimits), ...Object.keys(schedules)]);

  if (allDomains.size === 0) {
    container.innerHTML = "<em>No active block profiles configured yet.</em>";
    return;
  }

  let htmlContent = '<div style="display: flex; flex-direction: column; gap: 6px;">';

  allDomains.forEach(domain => {
    let ruleDescription = "";

    // Parse out limit data if present
    if (siteLimits[domain] !== undefined) {
      ruleDescription += `⏱️ Limit: ${Math.floor(siteLimits[domain] / 60)}m `;
    }

    // Parse out custom schedule arrays if present
    if (schedules[domain] && schedules[domain].length > 0) {
      schedules[domain].forEach(sched => {
        ruleDescription += `📅 Schedule: ${sched.start}-${sched.end} `;
      });
    }

    htmlContent += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #f8fafc; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 4px;">
        <div style="max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <strong>${domain}</strong><br>
          <span style="font-size: 11px; color: #64748b;">${ruleDescription}</span>
        </div>
        <button class="delete-rule-btn" data-domain="${domain}" style="background: #ef4444; color: white; border: none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 11px;">Remove</button>
      </div>
    `;
  });

  htmlContent += '</div>';
  container.innerHTML = htmlContent;

  // Attach execution click listeners to the dynamically rendered "Remove" buttons
  document.querySelectorAll('.delete-rule-btn').forEach(button => {
    button.addEventListener('click', async (e) => {
      const domainToRemove = e.target.getAttribute('data-domain');
      if (domainToRemove) {
        console.log(`🎯 Triggering focus challenge verification loop for: ${domainToRemove}`);
        await deleteDomainRule(domainToRemove);
      }
    });
  });
}

// Handler: Completely wipes a domain target out of your system registry structures
// Enhanced Logic: Intercepts straight deletions with an enforced cooldown period
// --- GLOBAL PHASE 14 MEMORY VARIABLES (Declaring outside the function scope) ---
const MINDFULNESS_QUOTES = [
  "I am choosing to break my discipline parameters because my short term impulse is overriding my long term goals.",
  "Am I genuinely seeking critical information, or am I running away from cognitive friction and deep work?",
  "An urge is merely a temporary neurochemical fluctuation. I have the spatial awareness to let it pass completely.",
  "By choosing to open this distraction channel right now, I accept full responsibility for reducing my daily focus metrics."
];

let activeTargetDomainForDeletion = null;
let activeSelectedChallengeQuote = "";

// Intercepts structural deletions with an intentional typing accuracy challenge
async function deleteDomainRule(domain) {
  activeTargetDomainForDeletion = domain;
  
  // 1. Pick a random focus quote challenge mapping
  const randomIndex = Math.floor(Math.random() * MINDFULNESS_QUOTES.length);
  activeSelectedChallengeQuote = MINDFULNESS_QUOTES[randomIndex];

  // 2. Clear inputs and render UI elements securely
  document.getElementById('challenge-input').value = "";
  document.getElementById('challenge-quote').textContent = activeSelectedChallengeQuote;
  
  // Change display to block to fit within extension popup bounds smoothly
  const overlayBox = document.getElementById('challenge-overlay');
  overlayBox.style.display = 'block';
  
  // Smoothly scroll the challenge box into the popup viewport frame
  overlayBox.scrollIntoView({ behavior: 'smooth' });
  
  // Core Optimization: Bind button operational triggers safely *after* UI opens
  setupChallengeButtonListeners();
}

// Separate Helper Engine to ensure buttons have flawless event bindings
function setupChallengeButtonListeners() {
  const submitBtn = document.getElementById('submit-challenge-btn');
  const cancelBtn = document.getElementById('cancel-challenge-btn');

  if (submitBtn) {
    submitBtn.onclick = async () => {
      const userInput = document.getElementById('challenge-input').value.trim();
      
      // Strict matching calculation comparison
      if (userInput !== activeSelectedChallengeQuote) {
        alert("❌ Text mismatch. Please verify your typing precision, punctuation, and capitalization metrics exactly.");
        return;
      }

      // --- CHALLENGE SUCCESSFUL: EXECUTE LIFTOFF ---
      const domain = activeTargetDomainForDeletion;

      if (!domain) {
        alert("System error: Target domain token tracking dropped. Please re-open the popup window.");
        document.getElementById('challenge-overlay').style.display = 'none';
        return;
      }

      const overlay = document.getElementById('challenge-overlay');
      
      // Apply a 5-point productivity score penalty (from Phase 16)
      const todayStr = new Date().toISOString().split('T')[0];
      const penaltyStore = await chrome.storage.local.get(['bypassPenalties']);
      const bypassPenalties = penaltyStore.bypassPenalties || {};
      bypassPenalties[todayStr] = (bypassPenalties[todayStr] || 0) + 1;
      await chrome.storage.local.set({ bypassPenalties });

      // Completely wipe domain rule profile settings entries
      const store = await chrome.storage.local.get(['siteLimits', 'schedules']);
      const siteLimits = store.siteLimits || {};
      const schedules = store.schedules || {};
      
      if (siteLimits[domain] !== undefined) delete siteLimits[domain];
      if (schedules[domain] !== undefined) delete schedules[domain];
      
      await chrome.storage.local.set({ siteLimits, schedules });
      
      // Hide UI and refresh current layout lists
      overlay.style.display = 'none';
      alert(`🔓 Challenge verified. Override authorized. Rules lifted for ${domain}.`);
      
      if (typeof renderActiveRules === 'function') renderActiveRules();
    };
  }

  if (cancelBtn) {
    cancelBtn.onclick = () => {
      document.getElementById('challenge-overlay').style.display = 'none';
      activeTargetDomainForDeletion = null;
    };
  }
}




// Phase 9: Sync context profile select element shifts with disk storage
document.getElementById('profile-selector').addEventListener('change', async (e) => {
  const selectedProfile = e.target.value;
  await chrome.storage.local.set({ activeProfile: selectedProfile });
  console.log(`Guard Mode changed context environment profiles to: ${selectedProfile}`);
});

// Restore previous configuration values instantly upon load execution loop
async function restoreProfileState() {
  const store = await chrome.storage.local.get(['activeProfile']);
  if (store.activeProfile) {
    document.getElementById('profile-selector').value = store.activeProfile;
  }
}

// Invoke configuration read cycle initialization step
restoreProfileState();

// --- POPUP INITIALIZATION INITIAL ENGINE WORKFLOW CHAIN ---
async function initializePopupControlCenter() {
  console.log("Initializing FocusGuard Control Center UI elements...");
  
  // 1. Restore your Context Profile settings state (Phase 9)
  if (typeof restoreProfileState === 'function') {
    await restoreProfileState();
  }
  
  // 2. Evaluate active Pomodoro countdown states (Phase 7)
  if (typeof evaluateFocusModeView === 'function') {
    evaluateFocusModeView();
  }
  
  // 3. CORE FIX: Fetch and draw your Monitored Sites List right on open!
  if (typeof renderActiveRules === 'function') {
    await renderActiveRules();
  } else {
    document.getElementById('active-rules-list').textContent = "No rules configured.";
  }
}

// Fire the entire initialization workflow on window open
initializePopupControlCenter();