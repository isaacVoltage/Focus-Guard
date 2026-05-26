// Global chart instances so we can wipe/reset them cleanly
let todayChartInstance = null;
let weeklyChartInstance = null;
let timelineChartInstance = null;

// Helper: Convert seconds into readable hours/minutes
function formatMins(seconds) {
  return Math.round(seconds / 60);
}

// Helper: Generate last 7 dates strings (YYYY-MM-DD)
function getLast7Days() {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }
  return dates;
}

async function buildAnalyticsDashboard() {
  // Grab all keys cleanly with safe defaults
  const store = await chrome.storage.local.get(['usageData', 'siteCategories', 'bypassPenalties', 'hourlyTimeline']);
  const usageData = store.usageData || {};
  const siteCategories = store.siteCategories || {};
  const bypassPenalties = store.bypassPenalties || {};
  const hourlyTimeline = store.hourlyTimeline || {};
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysData = usageData[todayStr] || {};
  const todayOverrides = bypassPenalties[todayStr] || 0;

  // --- CALCULATE PRODUCTIVITY ENGINE METRICS ---
  let productiveSeconds = 0;
  let distractingSeconds = 0;
  let totalSeconds = 0;

  Object.entries(todaysData).forEach(([domain, sec]) => {
    if (domain.includes('chrome-extension://')) return;
    
    totalSeconds += sec;
    const category = siteCategories[domain] || "Unclassified";

    if (category === "Coding" || category === "Learning" || category === "Utility") {
      productiveSeconds += sec;
    } else if (category === "Social Media" || category === "Gaming" || category === "Entertainment") {
      distractingSeconds += sec;
    } else {
      productiveSeconds += sec * 0.5;
      distractingSeconds += sec * 0.5;
    }
  });

  // Calculate Base Percentage Score out of 100
  let finalScore = 100;
  if (totalSeconds > 0) {
    const baseScore = (productiveSeconds / totalSeconds) * 100;
    finalScore = Math.max(0, Math.round(baseScore - (todayOverrides * 5)));
  }

  let gradeString = "⚖️ Neutral Performance Balance";
  if (finalScore >= 85) gradeString = "🚀 Elite Focus Profile (Excellent)";
  else if (finalScore >= 70) gradeString = "📈 Productive Work Track (Good)";
  else if (finalScore < 50) gradeString = "⚠️ Heavy Distraction Exposure Warning";

  if (todayOverrides > 0) {
    gradeString += ` (${todayOverrides} bypass penalty applied)`;
  }

  // Render text selectors safely
  const dynamicDomains = Object.keys(todaysData).filter(d => !d.includes('chrome-extension://'));
  document.getElementById('stat-total-sites').textContent = dynamicDomains.length;
  document.getElementById('stat-total-time').textContent = `${formatMins(totalSeconds)} mins`;
  document.getElementById('stat-prod-score').textContent = `${finalScore}%`;
  document.getElementById('stat-score-grade').textContent = gradeString;

  // --- TODAY'S PIE CHART ---
  const pieLabels = [];
  const pieData = [];
  Object.entries(todaysData).forEach(([domain, sec]) => {
    if (domain.includes('chrome-extension://')) return;
    pieLabels.push(domain);
    pieData.push(formatMins(sec));
  });

  const ctxPie = document.getElementById('todayPieChart').getContext('2d');
  if (todayChartInstance) todayChartInstance.destroy();
  todayChartInstance = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: pieLabels,
      datasets: [{
        data: pieData,
        backgroundColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  // --- TOP DISTRACTIONS LIST ---
  const sortedList = Object.entries(todaysData)
    .filter(([dom]) => !dom.includes('chrome-extension://'))
    .sort((a, b) => b[1] - a[1]);

  let listHtml = '<ul style="list-style: none; padding:0; margin:0;">';
  sortedList.slice(0, 5).forEach(([dom, sec], idx) => {
    listHtml += `<li style="padding: 10px 0; border-bottom: 1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:14px;">
      <span><strong>#${idx+1}</strong> ${dom}</span>
      <span class="btn" style="padding:2px 8px; font-size:12px; background:#64748b; color:white;">${formatMins(sec)} min</span>
    </li>`;
  });
  listHtml += '</ul>';
  document.getElementById('top-sites-list').innerHTML = sortedList.length ? listHtml : '<em>No data recorded today yet.</em>';

  // --- PHASE 11: 24-HOUR HOURLY TIMELINE CHART (With Safe Fallbacks) ---
  const todaysTimeline = hourlyTimeline[todayStr] || {};
  const hoursLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const productiveHoursData = Array(24).fill(0);
  const distractingHoursData = Array(24).fill(0);

  for (let hr = 0; hr < 24; hr++) {
    const hourlyRecords = todaysTimeline[hr] || {};
    Object.entries(hourlyRecords).forEach(([domain, sec]) => {
      const category = siteCategories[domain] || "Unclassified";
      const minutes = sec / 60;

      if (category === "Coding" || category === "Learning" || category === "Utility") {
        productiveHoursData[hr] += parseFloat(minutes.toFixed(1));
      } else if (category === "Social Media" || category === "Gaming" || category === "Entertainment") {
        distractingHoursData[hr] += parseFloat(minutes.toFixed(1));
      } else {
        productiveHoursData[hr] += parseFloat((minutes * 0.5).toFixed(1));
        distractingHoursData[hr] += parseFloat((minutes * 0.5).toFixed(1));
      }
    });
  }

  const ctxTimeline = document.getElementById('hourlyTimelineChart').getContext('2d');
  if (timelineChartInstance) timelineChartInstance.destroy();
  timelineChartInstance = new Chart(ctxTimeline, {
    type: 'bar',
    data: {
      labels: hoursLabels,
      datasets: [
        { label: '⚡ Productive (Mins)', data: productiveHoursData, backgroundColor: '#10b981' },
        { label: '🍿 Distractions (Mins)', data: distractingHoursData, backgroundColor: '#ef4444' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }
    }
  });

  // --- HISTORICAL 7-DAY TREND BAR CHART (With Safe Fallbacks) ---
  const last7Days = getLast7Days();
  const barLabels = last7Days.map(dateStr => dateStr.split('-')[2]);
  const barData = last7Days.map(dateStr => {
    const dayRecords = usageData[dateStr] || {};
    const totalSec = Object.entries(dayRecords)
      .filter(([dom]) => !dom.includes('chrome-extension://'))
      .reduce((sum, [, sec]) => sum + sec, 0);
    return formatMins(totalSec);
  });

  const ctxBar = document.getElementById('weeklyBarChart').getContext('2d');
  if (weeklyChartInstance) weeklyChartInstance.destroy();
  weeklyChartInstance = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: barLabels,
      datasets: [{ label: 'Total Minutes Online', data: barData, backgroundColor: '#3b82f6', borderRadius: 4 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true } }
    }
  });
}
// Core Logic: Convert storage JSON data map structures into a spreadsheet CSV file
async function exportTrackingDataToCSV() {
  const store = await chrome.storage.local.get(['usageData']);
  const usageData = store.usageData || {};

  if (Object.keys(usageData).length === 0) {
    alert("There are no tracking logs recorded in the database to export yet!");
    return;
  }

  // 1. Build the structural headers row
  let csvContent = "Date,Website Domain,Time Spent (Seconds),Time Spent (Minutes)\n";

  // 2. Loop through every recorded date string entry chronologically
  const sortedDates = Object.keys(usageData).sort();

  sortedDates.forEach(dateStr => {
    const domainsRecorded = usageData[dateStr] || {};
    
    Object.entries(domainsRecorded).forEach(([domain, totalSeconds]) => {
      // Clean up local system extension tracking rows
      if (domain.includes('chrome-extension://') || !domain) return;

      const minutesCalculated = (totalSeconds / 60).toFixed(2);
      
      // Escape domains just in case of unusual symbols, wrap rows safely
      const safeDomain = `"${domain.replace(/"/g, '""')}"`;
      
      csvContent += `${dateStr},${safeDomain},${totalSeconds},${minutesCalculated}\n`;
    });
  });

  // 3. Convert plaintext string layout into a binary browser-downloadable stream asset object
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  
  // 4. Force browser virtual link trigger mechanism execution
  const virtualLink = document.createElement("a");
  virtualLink.setAttribute("href", downloadUrl);
  virtualLink.setAttribute("download", `focusguard_history_${new Date().toISOString().split('T')[0]}.csv`);
  virtualLink.style.visibility = 'hidden';
  
  document.body.appendChild(virtualLink);
  virtualLink.click();
  document.body.removeChild(virtualLink);
  
  console.log("📈 FocusGuard history log sheet generated and dispatched safely.");
}

// Attach execution link listener onto the header button asset element
document.getElementById('export-csv-btn').addEventListener('click', exportTrackingDataToCSV);

// Run rendering script immediately on load
buildAnalyticsDashboard();

// --- PHASE 10: CUSTOM GOAL MANAGER LOGIC ---

// Save a brand new goal contract to storage database
document.getElementById('save-goal-btn').addEventListener('click', async () => {
  const targetCat = document.getElementById('goal-source-cat').value;
  const reqMins = parseInt(document.getElementById('goal-req-mins').value, 10);
  const targetSite = document.getElementById('goal-target-site').value.trim().toLowerCase();
  const rewMins = parseInt(document.getElementById('goal-rew-mins').value, 10);

  // Form Validation
  if (!targetSite) return alert("Please enter a target distraction website to lock.");
  if (isNaN(reqMins) || reqMins <= 0 || isNaN(rewMins) || rewMins <= 0) {
    return alert("Please enter valid positive numbers for minutes required and rewarded.");
  }

  // Read existing goal profiles
  const store = await chrome.storage.local.get(['productivityGoals']);
  const productivityGoals = store.productivityGoals || {};

  // Clean domain input formatting (strip protocols if pasted)
  let cleanDomain = targetSite;
  try {
    if (cleanDomain.includes("://")) {
      cleanDomain = new URL(cleanDomain).hostname;
    }
    if (cleanDomain.startsWith("www.")) {
      cleanDomain = cleanDomain.substring(4);
    }
  } catch (e) {}

  // Structure contract rule mapping
  productivityGoals[cleanDomain] = {
    targetType: targetCat,
    requiredMinutes: reqMins,
    rewardMinutes: rewMins
  };

  await chrome.storage.local.set({ productivityGoals });
  
  // Clear layout inputs
  document.getElementById('goal-req-mins').value = '';
  document.getElementById('goal-target-site').value = '';
  document.getElementById('goal-rew-mins').value = '';

  // Trigger reactive layout rebuild
  renderDashboardGoals();
});

// Build visual active goal rules list cards
async function renderDashboardGoals() {
  const listContainer = document.getElementById('active-goals-list');
  const store = await chrome.storage.local.get(['productivityGoals']);
  const goals = store.productivityGoals || {};

  const goalEntries = Object.entries(goals);

  if (goalEntries.length === 0) {
    listContainer.innerHTML = `<div style="text-align: center; color: #64748b; font-size:13px; padding: 10px; border: 1px dashed #cbd5e1; border-radius: 6px;">
      <em>No goal contracts active. Use the form above to tie distractions to work benchmarks!</em>
    </div>`;
    return;
  }

  let htmlMarkup = "";
  goalEntries.forEach(([blockedSite, profile]) => {
    htmlMarkup += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: #faf5ff; border: 1px solid #e9d5ff; padding: 10px 15px; border-radius: 6px; font-size: 14px;">
        <div>
          🔒 Website <strong>${blockedSite}</strong> is locked completely until you spend 
          <span style="color:#7c3aed; font-weight:bold;">${profile.requiredMinutes} mins</span> on 
          <strong>${profile.targetType}</strong> tasks today. 
          <span style="color:#16a34a; font-weight:600;">(Reward: ${profile.rewardMinutes}m allowance)</span>
        </div>
        <button class="btn btn-danger delete-goal-btn" data-site="${blockedSite}" style="padding: 4px 10px; font-size: 12px;">Delete Contract</button>
      </div>
    `;
  });

  listContainer.innerHTML = htmlMarkup;

  // Bind dynamic deletion event click triggers
  document.querySelectorAll('.delete-goal-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const siteToRemove = e.target.getAttribute('data-site');
      const data = await chrome.storage.local.get(['productivityGoals']);
      const currentGoals = data.productivityGoals || {};
      
      delete currentGoals[siteToRemove];
      await chrome.storage.local.set({ productivityGoals: currentGoals });
      
      // Auto-refresh layout view window
      renderDashboardGoals();
    });
  });
}

// Hook invocation trigger inside dashboard boot workflow
// Add this call line directly to the absolute bottom of your existing code setup file:
renderDashboardGoals();


// --- PHASE 17: DYNAMIC CATEGORY MANAGER LOGIC ---

// Default fallback categories if the user hasn't configured any yet
const DEFAULT_CATEGORIES = ["Coding", "Learning", "Social Media", "Entertainment", "Gaming"];

// Fetch categories and domain mappings, then render the panels
async function renderCategoryManager() {
  const store = await chrome.storage.local.get(['customCategoryList', 'siteCategories']);
  
  // 1. Initialize category options list
  let categories = store.customCategoryList || DEFAULT_CATEGORIES;
  if (!store.customCategoryList) {
    await chrome.storage.local.set({ customCategoryList: categories });
  }

  // 2. Populate Dropdowns (Both in Category Manager and the Phase 10 Goal Form)
  const catSelector = document.getElementById('cat-selector');
  const goalSourceCat = document.getElementById('goal-source-cat');
  
  let dropdownHtml = "";
  categories.forEach(cat => {
    dropdownHtml += `<option value="${cat}">${cat}</option>`;
  });
  
  if (catSelector) catSelector.innerHTML = dropdownHtml;
  if (goalSourceCat) goalSourceCat.innerHTML = dropdownHtml;

  // 3. Render Active Matrix Mapping Rules List
  const matrixList = document.getElementById('matrix-mappings-list');
  const siteCategories = store.siteCategories || {};
  const mappingsEntries = Object.entries(siteCategories);

  if (mappingsEntries.length === 0) {
    matrixList.innerHTML = `<div style="text-align: center; color: #64748b; font-size: 12px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 4px;">No domains manually classified yet.</div>`;
    return;
  }

  let matrixHtml = "";
  mappingsEntries.forEach(([domain, category]) => {
    let tagColor = "#64748b"; // Fallback gray
    if (category === "Coding") tagColor = "#3b82f6";
    if (category === "Learning") tagColor = "#8b5cf6";
    if (category === "Social Media" || category === "Entertainment") tagColor = "#ef4444";

    matrixHtml += `
      <div style="display: flex; justify-content: space-between; align-items: center; background: white; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 4px; font-size: 13px;">
        <div><strong>${domain}</strong> <span style="background: ${tagColor}; color: white; padding: 2px 6px; font-size: 10px; font-weight: bold; border-radius: 10px; margin-left: 5px;">${category}</span></div>
        <button class="delete-matrix-btn" data-domain="${domain}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px;">✕ Remove</button>
      </div>
    `;
  });

  matrixList.innerHTML = matrixHtml;

  // Attach Deletion Trigger Loops
  document.querySelectorAll('.delete-matrix-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const domToWipe = e.target.getAttribute('data-domain');
      const data = await chrome.storage.local.get(['siteCategories']);
      const currentCats = data.siteCategories || {};
      
      delete currentCats[domToWipe];
      await chrome.storage.local.set({ siteCategories: currentCats });
      renderCategoryManager();
    });
  });
}

// Handler: Create a completely unique new category classification tag
document.getElementById('add-custom-cat-btn').addEventListener('click', async () => {
  const newCatInput = document.getElementById('new-custom-cat-input');
  const rawCatName = newCatInput.value.trim();
  
  if (!rawCatName) return alert("Please enter a category name.");
  
  // Format string nicely (e.g., "social media" -> "Social Media")
  const formattedCat = rawCatName.charAt(0).toUpperCase() + rawCatName.slice(1);

  const store = await chrome.storage.local.get(['customCategoryList']);
  const categories = store.customCategoryList || DEFAULT_CATEGORIES;

  if (categories.includes(formattedCat)) {
    return alert("This category tag already exists.");
  }

  categories.push(formattedCat);
  await chrome.storage.local.set({ customCategoryList: categories });
  
  newCatInput.value = "";
  renderCategoryManager();
  alert(`Category tag "${formattedCat}" added successfully!`);
});

// Handler: Map a specific web address to an active category selection choice
document.getElementById('save-mapping-btn').addEventListener('click', async () => {
  let domain = document.getElementById('cat-domain-input').value.trim().toLowerCase();
  const selectedCategory = document.getElementById('cat-selector').value;

  if (!domain) return alert("Please enter a target domain name.");

  // URL Sanitization Pipeline
  try {
    if (domain.includes("://")) domain = new URL(domain).hostname;
    if (domain.startsWith("www.")) domain = domain.substring(4);
  } catch (e) {}

  const store = await chrome.storage.local.get(['siteCategories']);
  const siteCategories = store.siteCategories || {};

  siteCategories[domain] = selectedCategory;
  await chrome.storage.local.set({ siteCategories });

  document.getElementById('cat-domain-input').value = "";
  renderCategoryManager();
});

// Hook Category Boot Setup into the bottom of dashboard initialization sequence:
renderCategoryManager();

// =========================================================================
// INTERACTIVE PDF EXPORT MODULE (COMPLETE LOGIC & STEP 2 EVENT BINDING)
// =========================================================================

/**
 * 1. CORE FUNCTION LOGIC: Compiles metrics and structures the PDF canvas document
 */
async function exportDailyAnalysisToPDF() {
  const jspdfModule = window.jspdf || window.jspdf__default;
  if (!jspdfModule) {
    alert("❌ PDF Generation dependency missing. Please reload the extension configuration parameters.");
    return;
  }

  // Target the internal constructor reference safely
  const jsPDF = jspdfModule.jsPDF;
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });



  // Extract storage tokens
  const store = await chrome.storage.local.get(['usageData', 'siteCategories', 'bypassPenalties']);
  const usageData = store.usageData || {};
  const siteCategories = store.siteCategories || {};
  const bypassPenalties = store.bypassPenalties || {};
  
  const todayStr = new Date().toISOString().split('T')[0];
  const todaysData = usageData[todayStr] || {};
  const dailyOverridesCount = bypassPenalties[todayStr] || 0;

  let totalTrackedSeconds = 0;
  let productiveSeconds = 0;
  const siteRows = [];

  Object.entries(todaysData).forEach(([domain, seconds]) => {
    if (domain.includes('chrome-extension://')) return;
    
    totalTrackedSeconds += seconds;
    const category = siteCategories[domain] || "Unclassified";
    
    if (category === "Coding" || category === "Learning" || category === "Utility") {
      productiveSeconds += seconds;
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

  // Sort by heaviest usage descending
  siteRows.sort((a, b) => b.rawSeconds - a.rawSeconds);

  const totalMinutes = Math.floor(totalTrackedSeconds / 60);
  const productivityScore = totalTrackedSeconds > 0 
    ? Math.round((productiveSeconds / totalTrackedSeconds) * 100) 
    : 0;

  let currentY = 20;

  // Header Style Line
  doc.setFillColor(59, 130, 246);
  doc.rect(15, currentY, 180, 2, "F");
  currentY += 10;

  // Title text layout parameters
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text("🛡️ FocusGuard Daily Analytics Report", 15, currentY);
  currentY += 8;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated Timeline Target: ${todayStr}  |  System Status: Active Monitoring`, 15, currentY);
  currentY += 15;

  // Render Summary Statistics Box Frame
  doc.setFillColor(248, 250, 252);
  doc.rect(15, currentY, 180, 32, "F");
  doc.setDrawColor(226, 232, 240);
  doc.rect(15, currentY, 180, 32, "S");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text("📊 EXECUTIVE PRODUCTIVITY LIFECYCLE SUMMARY", 20, currentY + 8);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`• Total Tracked Screen Time:  ${totalMinutes} minutes`, 20, currentY + 15, { maxWidth: 170 });
  doc.text(`• Focus Productivity Rating:   ${productivityScore}% Score`, 20, currentY + 21, { maxWidth: 170 });
  doc.text(`• Total Policy Bypass Interventions:  ${dailyOverridesCount} challenge events verified`, 20, currentY + 27, { maxWidth: 170 });
  currentY += 45;

  // Render data tables ledger
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("📋 DETAILED DOMAIN INTERCEPTION LEDGER", 15, currentY);
  currentY += 6;

  doc.setFillColor(15, 23, 42);
  doc.rect(15, currentY, 180, 8, "F");

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text("Target Web Domain", 18, currentY + 5.5);
  doc.text("Mapped Category Tag", 85, currentY + 5.5);
  doc.text("Accumulated Allocation Time", 140, currentY + 5.5);
  currentY += 8;

  doc.setFont("Helvetica", "normal");
  doc.setTextColor(51, 65, 85);

  if (siteRows.length === 0) {
    doc.text("No data metrics logged into storage slots for today.", 20, currentY + 10);
  } else {
    siteRows.forEach((row, idx) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(241, 245, 249);
        doc.rect(15, currentY, 180, 8, "F");
      }

      doc.text(row.domain, 18, currentY + 5.5);
      doc.text(row.category, 85, currentY + 5.5);
      doc.text(row.timeStr, 140, currentY + 5.5);
      
      currentY += 8;
    });
  }

  doc.save(`FocusGuard_Daily_Report_${todayStr}.pdf`);
}

/**
 * 2. EXECUTION LINK HOOKS: Injects the button and binds the live click handler
 */
if (!document.getElementById('export-pdf-btn')) {
  document.getElementById('export-csv-btn').insertAdjacentHTML('afterend', `
    <button class="btn" id="export-pdf-btn" style="background-color: #3b82f6; margin-left: 8px;">📋 Export Daily PDF</button>
  `);
}

document.getElementById('export-pdf-btn').addEventListener('click', () => {
  exportDailyAnalysisToPDF();
});