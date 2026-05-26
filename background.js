// =========================================================================
// SECTION 1: GLOBAL LIFECYCLE INITIALIZATION
// =========================================================================

chrome.runtime.onInstalled.addListener(async () => {
  const store = await chrome.storage.local.get(['siteLimits', 'siteCategories', 'activeProfile', 'bypassPenalties']);
  
  // Base default limits profile initialization
  if (!store.siteLimits) {
    await chrome.storage.local.set({ siteLimits: { "youtube.com": 60, "instagram.com": 300 } });
  }

  // Phase 17: Automatic categorization rules framework database
  if (!store.siteCategories) {
    const defaultCategories = {
      "github.com": "Coding",
      "stackoverflow.com": "Coding",
      "docs.microsoft.com": "Coding",
      "google.com": "Utility",
      "wikipedia.org": "Learning",
      "coursera.org": "Learning",
      "youtube.com": "Entertainment",
      "netflix.com": "Entertainment",
      "instagram.com": "Social Media",
      "facebook.com": "Social Media",
      "linkedin.com": "Networking"
    };
    await chrome.storage.local.set({ siteCategories: defaultCategories });
  }
  
  if (!store.bypassPenalties) {
    await chrome.storage.local.set({ bypassPenalties: {} });
  }

  if (!store.activeProfile) {
    await chrome.storage.local.set({ activeProfile: "Standard" });
  }
  
  console.log("FocusGuard Advanced Engine Initialized Successfully.");
});

// Persistent Core Memory Registers
let activeTabId = null;
let activeDomain = null;
let startTime = null;
let trackingIntervalId = null;
let navigationHistoryStack = []; // Rolling memory to track quick hops (Phase 13)

// =========================================================================
// SECTION 2: CORE SECURITY PARSERS & HELPERS
// =========================================================================

function getDomain(url) {
  if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('chrome-extension://')) {
    return null;
  }
  try {
    const urlObj = new URL(url);
    let hostname = urlObj.hostname.toLowerCase();

    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    const parts = hostname.split('.');
    if (parts.length > 2) {
      const secondaryTLDs = ['co', 'com', 'org', 'net', 'edu', 'gov'];
      const tld2 = parts[parts.length - 2];
      const tld1 = parts[parts.length - 1];

      if (secondaryTLDs.includes(tld2) && tld1.length === 2) {
        return parts.slice(-3).join('.');
      } else {
        return parts.slice(-2).join('.');
      }
    }
    return hostname;
  } catch (e) {
    return null;
  }
}

function getTodayString() {
  const offset = new Date().getTimezoneOffset();
  const localDate = new Date(Date.now() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
}

// =========================================================================
// SECTION 3: ULTRA-PRECISION TIME LOGGING & HEARTBEAT ENGINE
// =========================================================================

async function saveElapsedTime() {
  if (!activeDomain || !startTime) return;

  const now = Date.now();
  const elapsedSeconds = Math.round((now - startTime) / 1000);
  if (elapsedSeconds <= 0) return;

  const today = getTodayString();
  const currentHour = new Date().getHours();

  // Retrieve current tracking data structures safely
  const data = await chrome.storage.local.get(['usageData', 'hourlyTimeline']);
  const usageData = data.usageData || {};
  const hourlyTimeline = data.hourlyTimeline || {};

  // --- 1. DAILY UTILITY TRACKING ENGINE ---
  if (!usageData[today]) usageData[today] = {};
  if (!usageData[today][activeDomain]) usageData[today][activeDomain] = 0;
  usageData[today][activeDomain] += elapsedSeconds;

  // --- 2. PHASE 11 HOURLY GRAPH ENGINE ---
  if (!hourlyTimeline[today]) hourlyTimeline[today] = {};
  if (!hourlyTimeline[today][currentHour]) hourlyTimeline[today][currentHour] = {};
  if (!hourlyTimeline[today][currentHour][activeDomain]) hourlyTimeline[today][currentHour][activeDomain] = 0;
  
  hourlyTimeline[today][currentHour][activeDomain] += elapsedSeconds;

  // Save data back to extension database disk space
  await chrome.storage.local.set({ usageData, hourlyTimeline });
  
  // Slide start time milestone forward to catch incoming time slices
  startTime = now;
}

// Heartbeat Loop Manager: Drives high-frequency verification checks
function startHeartbeat() {
  if (trackingIntervalId) return; 

  trackingIntervalId = setInterval(async () => {
    if (activeDomain && startTime) {
      await saveElapsedTime();
      await checkCurrentTabLimit();
    }
  }, 1000); // Pulse check execution every second
}

function stopHeartbeat() {
  if (trackingIntervalId) {
    clearInterval(trackingIntervalId);
    trackingIntervalId = null;
  }
}

// Coordinate window-switching focus pipelines smoothly
async function handleTabTracking() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      await saveElapsedTime();
      activeTabId = null;
      activeDomain = null;
      startTime = null;
      stopHeartbeat();
      return;
    }

    const currentTab = tabs[0];
    const currentDomain = getDomain(currentTab.url);

    if (currentDomain !== activeDomain) {
      await saveElapsedTime(); // Commit logs accumulated on previous site

      activeTabId = currentTab.id;
      activeDomain = currentDomain;
      
      if (currentDomain) {
        startTime = Date.now();
        startHeartbeat();
      } else {
        startTime = null;
        stopHeartbeat(); // Quiet loops on chrome:// internal settings frames
      }
    } else if (activeDomain) {
      startHeartbeat();
    }
  } catch (err) {
    console.error("FocusGuard Tracking Lifecycle Exception Error:", err);
  }
}

// =========================================================================
// SECTION 4: ADVANCED SECURITY MATRIX BLOCK ENGINE
// =========================================================================

async function isDomainLimitExceeded(domain) {
  if (!domain) return false;

  const today = getTodayString();
  const store = await chrome.storage.local.get(['usageData', 'siteLimits']);
  const usageData = store.usageData || {};
  const siteLimits = store.siteLimits || {};

  const secondsUsed = (usageData[today] && usageData[today][domain]) || 0;
  const allowedLimit = siteLimits[domain];

  return allowedLimit !== undefined && secondsUsed >= allowedLimit;
}

// Evaluates complex dynamic matrices: Contexts, Goals, Schedules, and Locks
async function checkBlockRules(domain) {
  if (!domain) return { block: false, reason: "" };

  const store = await chrome.storage.local.get([
    'focusModeActive', 
    'focusBlockUntil', 
    'siteCategories', 
    'siteLimits', 
    'schedules', 
    'activeProfile',
    'usageData'
  ]);
  
  const now = Date.now();

  // --- 1. FOCUS MODE (POMODORO) ABSOLUTE RESTRICTION GATE ---
  if (store.focusModeActive && store.focusBlockUntil && now < store.focusBlockUntil) {
    const isExplicitlyMonitored = (store.siteLimits && store.siteLimits[domain] !== undefined) || 
                                  (store.schedules && store.schedules[domain] !== undefined);
    
    const siteCategories = store.siteCategories || {};
    const category = siteCategories[domain] || "Unclassified";
    const isDistractionCategory = (category === "Social Media" || category === "Entertainment" || category === "Gaming");

    if (isExplicitlyMonitored || isDistractionCategory) {
      const minsRemaining = Math.ceil((store.focusBlockUntil - now) / 1000 / 60);
      return { 
        block: true, 
        reason: `DEEP LOCK ACTIVE: System locked for productivity. ${minsRemaining} minutes remaining.` 
      };
    }
  } else if (store.focusModeActive) {
    await chrome.storage.local.set({ focusModeActive: false, focusBlockUntil: 0 });
  }

  // --- 2. PHASE 10 GOAL BASED CONTRACT INTERCEPTOR ---
  try {
    if (typeof evaluateGoalUnlock === 'function') {
      const goalCheck = await evaluateGoalUnlock(domain);
      if (goalCheck && goalCheck.isLocked) {
        return { block: true, reason: goalCheck.reason };
      }
    }
  } catch (err) {
    console.error("Goal contract error evaluation step skipped:", err);
  }

  // --- 3. PHASE 9 CONTEXT AWARE PROFILE MANAGER ---
  const currentProfile = store.activeProfile || "Standard";
  const category = await assignWebsiteCategory(domain);

  if (currentProfile === "Study Mode") {
    if (category === "Social Media" || category === "Gaming" || category === "Entertainment") {
      return { block: true, reason: `🔒 Profile Block: 'Study Mode' isolates '${category}' networks.` };
    }
  } else if (currentProfile === "Coding Mode") {
    if (category === "Entertainment" || category === "Gaming") {
      return { block: true, reason: `💻 Profile Block: 'Coding Mode' restricts '${category}' streaming.` };
    }
  }


// --- 4. DAILY LIMIT TRACKING INTERCEPTOR (FIXED & CONSOLIDATED) ---
  const today = getTodayString();
  const backupUtcDay = new Date().toISOString().split('T')[0];
  
  // 1. Fetch historical data using local date first, falling back to UTC if empty
  let savedSecondsUsed = store.usageData?.[today]?.[domain];
  if (savedSecondsUsed === undefined) {
    savedSecondsUsed = store.usageData?.[backupUtcDay]?.[domain] || 0;
  }
  
  // 2. Add real-time active session seconds to the running total
  if (domain === activeDomain && startTime) {
    const activeUnsavedSeconds = Math.round((Date.now() - startTime) / 1000);
    if (activeUnsavedSeconds > 0) {
      savedSecondsUsed += activeUnsavedSeconds;
    }
  }

  // 3. Assign our finalized calculations to a single total variable
  const totalSecondsUsed = savedSecondsUsed;
  let limitInSeconds = store.siteLimits?.[domain];

  if (limitInSeconds !== undefined) {
    console.log(`📊 FocusGuard Guard Audit [${domain}]: Live Usage ${totalSecondsUsed}s / Strict Limit ${limitInSeconds}s`);

    // 4. Fire the block condition immediately if threshold is crossed
    if (totalSecondsUsed >= limitInSeconds) {
      console.log(`🚨 [BLOCK TRIGGERED] ${domain} has breached the ceiling! Routing tab to block page.`);
      return { 
        block: true, 
        reason: `⌛ Daily limit reached: You've used ${Math.floor(totalSecondsUsed / 60)}m out of your allowed ${Math.floor(limitInSeconds / 60)}m limit.` 
      };
    }
  }

  // --- 5. FIXED SCHEDULE TIME INTERCEPTOR ---
  const siteSchedules = store.schedules?.[domain] || [];
  for (const sched of siteSchedules) {
    if (isTimeInSchedule(sched.start, sched.end)) {
      return { block: true, reason: `📅 Custom schedule interception window active.` };
    }
  }

  return { block: false, reason: "" };
}

// Hot-swaps tab views on-the-fly when limits cross lines mid-session
async function checkCurrentTabLimit() {
  if (activeDomain) {
    const rulesCheck = await checkBlockRules(activeDomain);
    if (rulesCheck.block && activeTabId) {
      const blockPageUrl = chrome.runtime.getURL(`block.html?blockedSite=${encodeURIComponent(activeDomain)}&reason=${encodeURIComponent(rulesCheck.reason)}`);
      chrome.tabs.update(activeTabId, { url: blockPageUrl });
    }
  }
}

function isTimeInSchedule(startStr, endStr) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHours, startMins] = startStr.split(':').map(Number);
  const [endHours, endMins] = endStr.split(':').map(Number);

  const startMinutes = startHours * 60 + startMins;
  const [finalEndHours, finalEndMins] = [endHours, endMins];
  const endMinutes = finalEndHours * 60 + finalEndMins;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

// =========================================================================
// SECTION 5: NETWORK TRAFFIC MONITORING LAYER (SOLIDIFIED)
// =========================================================================

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // 1. Only intercept main-frame navigation (ignore sub-frames/iframes)
  if (details.frameId !== 0) return;

  const domain = getDomain(details.url);
  if (!domain) return;
  
  // Phase 13: Audit behavior patterns for habit loops
  await inspectHabitLoops(domain);

  // 2. Evaluate complete filter matrix paths (Schedules, Limits, Pomodoro)
  const result = await checkBlockRules(domain);
  
  if (result && result.block) {
    const blockPageUrl = chrome.runtime.getURL(`block.html?blockedSite=${encodeURIComponent(domain)}&reason=${encodeURIComponent(result.reason)}`);
    
    // Command the tab to redirect to the block screen immediately
    chrome.tabs.update(details.tabId, { url: blockPageUrl });
    console.log(`🚫 FocusGuard Firewall Intercepted Traffic Target: ${domain}`);
    
    return; // 🔥 CRITICAL STOP GUIDE: Prevents the script from falling through to the friction layer!
  }

  // 3. --- ENTRY FRICTION FLOW GATES (Only runs if site is NOT blocked) ---
  const category = await assignWebsiteCategory(domain);
  if (category === "Social Media" || category === "Entertainment" || category === "Gaming") {
    const frictionStore = await chrome.storage.local.get(['frictionAllowedTokens']);
    const tokens = frictionStore.frictionAllowedTokens || {};
    const expirationTime = tokens[domain] || 0;

    if (Date.now() > expirationTime) {
      const frictionPageUrl = chrome.runtime.getURL(`friction.html?site=${encodeURIComponent(domain)}&url=${encodeURIComponent(details.url)}`);
      chrome.tabs.update(details.tabId, { url: frictionPageUrl });
      console.log(`⏳ FocusGuard applied friction boundary to: ${domain}`);
    }
  }
});

// =========================================================================
// SECTION 6: INTELLIGENT PATTERN DETECTION & DYNAMIC FALLBACKS
// =========================================================================

async function assignWebsiteCategory(domain) {
  if (!domain) return "Unclassified";

  const store = await chrome.storage.local.get(['siteCategories']);
  const siteCategories = store.siteCategories || {};

  if (siteCategories[domain]) {
    return siteCategories[domain];
  }

  const domainLower = domain.toLowerCase();
  if (domainLower.includes("learn") || domainLower.includes("edu") || domainLower.includes("quiz")) return "Learning";
  if (domainLower.includes("code") || domainLower.includes("git") || domainLower.includes("dev") || domainLower.includes("api")) return "Coding";
  if (domainLower.includes("game") || domainLower.includes("play") || domainLower.includes("arcade")) return "Gaming";
  if (domainLower.includes("video") || domainLower.includes("tv") || domainLower.includes("stream") || domainLower.includes("movie")) return "Entertainment";
  if (domainLower.includes("social") || domainLower.includes("chat") || domainLower.includes("tweet")) return "Social Media";

  return "Unclassified";
}

async function inspectHabitLoops(newDomain) {
  const store = await chrome.storage.local.get(['siteCategories', 'habitLoopEvents']);
  const siteCategories = store.siteCategories || {};
  const habitLoopEvents = store.habitLoopEvents || [];
  
  const category = siteCategories[newDomain] || await assignWebsiteCategory(newDomain);
  
  if (category !== "Social Media" && category !== "Entertainment" && category !== "Gaming") return;

  const now = Date.now();
  navigationHistoryStack.push({ domain: newDomain, timestamp: now });

  // Filter out sliding slot records older than 10 minutes
  const tenMinutesAgo = now - (10 * 60 * 1000);
  navigationHistoryStack = navigationHistoryStack.filter(item => item.timestamp > tenMinutesAgo);

  // PATTERN A: Bounce loop tracker
  const recentVisitsToSameDomain = navigationHistoryStack.filter(item => item.domain === newDomain);
  if (recentVisitsToSameDomain.length >= 4) {
    await logAndTriggerHabitAlert(
      "🔄 Impulse Loop Detected", 
      `You have opened ${newDomain} ${recentVisitsToSameDomain.length} times in the last 10 minutes.`,
      habitLoopEvents
    );
    navigationHistoryStack = []; 
    return;
  }

  // PATTERN B: Chain loop tracker
  const fiveMinutesAgo = now - (5 * 60 * 1000);
  const deepRecentStack = navigationHistoryStack.filter(item => item.timestamp > fiveMinutesAgo);
  const uniqueDistractionDomains = new Set(deepRecentStack.map(item => item.domain));

  if (uniqueDistractionDomains.size >= 3) {
    const chainList = Array.from(uniqueDistractionDomains).join(" → ");
    await logAndTriggerHabitAlert(
      "⛓️ Distraction Chain Active", 
      `You are cycling across multiple networks: ${chainList}`,
      habitLoopEvents
    );
    navigationHistoryStack = [];
  }
}

async function logAndTriggerHabitAlert(typeString, detailsString, existingEventsArray) {
  const todayStr = getTodayString();
  
  existingEventsArray.push({
    type: typeString,
    description: detailsString,
    timestamp: Date.now(),
    date: todayStr
  });

  await chrome.storage.local.set({ habitLoopEvents: existingEventsArray });

  chrome.notifications.create({
    type: "basic",
    iconUrl: "images/icon128.png",
    title: `🛡️ FocusGuard: ${typeString}`,
    message: `${detailsString} Take a deep breath and close the tabs!`,
    priority: 2
  });
}

async function evaluateGoalUnlock(domain) {
  const store = await chrome.storage.local.get(['productivityGoals', 'usageData', 'siteCategories']);
  const goals = store.productivityGoals || {};
  const usageData = store.usageData || {};
  const todayStr = getTodayString();
  const todaysUsage = usageData[todayStr] || {};

  if (!goals[domain]) return { isLocked: false };

  const activeGoal = goals[domain];
  let accumulatedSeconds = 0;
  const siteCategories = store.siteCategories || {};

  Object.entries(todaysUsage).forEach(([site, secs]) => {
    if (siteCategories[site] === activeGoal.targetType) {
      accumulatedSeconds += secs;
    }
  });

  const accumulatedMinutes = Math.floor(accumulatedSeconds / 60);
  const targetRequired = activeGoal.requiredMinutes;

  if (accumulatedMinutes < targetRequired) {
    return {
      isLocked: true,
      reason: `Goal Lock: Spend ${targetRequired} mins on ${activeGoal.targetType} tasks to unlock.`
    };
  }

  const rewardSecondsAllowed = activeGoal.rewardMinutes * 60;
  const currentDomainUsageToday = todaysUsage[domain] || 0;

  if (currentDomainUsageToday >= rewardSecondsAllowed) {
    return {
      isLocked: true,
      reason: `Reward Expired! You have exhausted your earned ${activeGoal.rewardMinutes}m allowance.`
    };
  }

  return { isLocked: false };
}

// =========================================================================
// SECTION 7: EXTRALONG CONTEXT EVENT BINDINGS
// =========================================================================

chrome.tabs.onActivated.addListener(async () => { await handleTabTracking(); });
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => { if (changeInfo.url) await handleTabTracking(); });
chrome.windows.onFocusChanged.addListener(async () => { await handleTabTracking(); });
chrome.runtime.onSuspend.addListener(async () => { await saveElapsedTime(); });

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "pomodoroFocusSession") {
    await chrome.storage.local.set({ focusModeActive: false });
    await chrome.storage.local.remove(['focusBlockUntil']);

    chrome.notifications.create({
      type: "basic",
      iconUrl: "images/icon128.png",
      title: "🛡️ FocusGuard Break Time!",
      message: "Your focus session is officially complete. Splendid work! Take a break.",
      priority: 2
    });
  }
});


/**
 * FocusGuard Independent PDF Export Module
 * Generates a clean, professional daily productivity ledger.
 */
async function exportDailyAnalysisToPDF() {
  // 1. Ensure the jsPDF dependency exists before building
  if (typeof window.jspdf === 'undefined') {
    alert("❌ PDF Generation dependency missing. Please include the jsPDF script library in your dashboard headers.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  // 2. Extract real-time storage metrics
  const store = await chrome.storage.local.get(['usageData', 'siteCategories', 'bypassPenalties']);
  const usageData = store.usageData || {};
  const siteCategories = store.siteCategories || {};
  const bypassPenalties = store.bypassPenalties || {};
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysData = usageData[todayStr] || {};
  const dailyOverridesCount = bypassPenalties[todayStr] || 0;

  // 3. Process time vectors and categorize entries
  let totalTrackedSeconds = 0;
  let productiveSeconds = 0;
  let distractingSeconds = 0;
  const siteRows = [];

  Object.entries(todaysData).forEach(([domain, seconds]) => {
    if (domain.includes('chrome-extension://')) return;
    
    totalTrackedSeconds += seconds;
    const category = siteCategories[domain] || "Unclassified";
    
    if (category === "Coding" || category === "Learning" || category === "Utility") {
      productiveSeconds += seconds;
    } else if (category === "Social Media" || category === "Entertainment" || category === "Gaming") {
      distractingSeconds += seconds;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSecs = seconds % 60;
    siteRows.push({
      domain,
      category,
      timeStr: `${minutes}m ${remainingSecs}s`,
      rawSeconds: seconds
    });
  });

  // Sort domains by highest usage density
  siteRows.sort((a, b) => b.rawSeconds - a.rawSeconds);

  const totalMinutes = Math.floor(totalTrackedSeconds / 60);
  const productivityScore = totalTrackedSeconds > 0 
    ? Math.round((productiveSeconds / totalTrackedSeconds) * 100) 
    : 0;

  // =========================================================================
  // DOCUMENT DRAW PIPELINE (Canvas Coordinates in Millimeters)
  // =========================================================================
  let currentY = 20;

  // Header Banner Accent Line
  doc.setFillColor(59, 130, 246); // FocusGuard Corporate Blue
  doc.rect(15, currentY, 180, 2, "F");
  currentY += 10;

  // Document Document Typography Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text("🛡️ FocusGuard Daily Analytics Report", 15, currentY);
  currentY += 8;

  // Meta Subtitle
  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated Timeline Target: ${todayStr}  |  System Status: Operational`, 15, currentY);
  currentY += 15;

  // --- EXECUTIVE SUMMARY BLOCK ---
  doc.setFillColor(248, 250, 252); // soft off-white card background
  doc.rect(15, currentY, 180, 32, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, currentY, 180, 32, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("📊 EXECUTIVE PRODUCTIVITY LIFECYCLE SUMMARY", 20, currentY + 8);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`• Total Cumulative Screen Time:  ${totalMinutes} minutes`, 20, currentY + 16);
  doc.text(`• Core Productivity Rating:       ${productivityScore}% Score`, 20, currentY + 22);
  doc.text(`• Total Policy Bypass Interventions:  ${dailyOverridesCount} challenge events verified`, 20, currentY + 28);
  currentY += 45;

  // --- LEDGER DATA TABLE HEADERS ---
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("📋 DETAILED DOMAIN INTERCEPTION LEDGER", 15, currentY);
  currentY += 6;

  // Draw Table Header Background Line
  doc.setFillColor(15, 23, 42); // Slate Header
  doc.rect(15, currentY, 180, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Target Web Domain", 18, currentY + 5.5);
  doc.text("Mapped Category Tag", 85, currentY + 5.5);
  doc.text("Accumulated Allocation Time", 140, currentY + 5.5);
  currentY += 8;

  // --- INJECT DATA ROWS Dynamically ---
  doc.setFont("Helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  if (siteRows.length === 0) {
    doc.text("No data metrics logged into storage slots for this target tracking timeframe.", 20, currentY + 10);
  } else {
    siteRows.forEach((row, idx) => {
      // Dynamic page overflow checking guard loop
      if (currentY > 270) {
        doc.addPage();
        currentY = 20; // reset vertical tracker coordinates on new page context
      }

      // Zebra striping effect row accents
      if (idx % 2 === 1) {
        doc.setFillColor(241, 245, 249);
        doc.rect(15, currentY, 180, 8, "F");
      }

      // Output text targets
      doc.text(row.domain, 18, currentY + 5.5);
      doc.text(row.category, 85, currentY + 5.5);
      doc.text(row.timeStr, 140, currentY + 5.5);
      
      currentY += 8;
    });
  }

  // Footer Branding Parameter
  currentY += 15;
  if (currentY > 280) { doc.addPage(); currentY = 20; }
  doc.setFont("Helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("FocusGuard Automation Architecture. Safeguarding attention cycles.", 15, currentY);

  // 4. Fire localized binary browser save download window
  doc.save(`FocusGuard_Daily_Report_${todayStr}.pdf`);
}