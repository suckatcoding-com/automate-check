
// DOM Elements
const inputs = [
    'frequencyVal', 'frequencyUnit', 
    'timePerTaskVal', 'timePerTaskUnit', 
    'buildTimeVal', 'buildTimeUnit', 
    'maintenanceSlider'
];

const maintenanceDisplay = document.getElementById('maintenanceDisplay');
const verdictTitle = document.getElementById('verdictTitle');
const verdictText = document.getElementById('verdictText');
const manualYearlyEl = document.getElementById('manualYearly');
const savings5YearsEl = document.getElementById('savings5Years');
const breakEvenEl = document.getElementById('breakEvenPoint');
const langToggle = document.getElementById('langToggle');
const langLabel = document.getElementById('langLabel');
const resetBtn = document.getElementById('resetBtn');

let chartInstance = null;
let currentLang = 'en';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // If the page was opened with query params, apply them to inputs first
    readParamsToInputs();

    initLanguage();

    // Attach Input Listeners that also update the URL
    const onInputChange = () => { 
        calculateAndDraw(); 
        updateURLFromInputs(); 
    };

    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', onInputChange);
        el.addEventListener('change', onInputChange);
    });

    // Attach Language Listener
    langToggle.addEventListener('click', () => { 
        toggleLanguage(); 
        updateURLFromInputs();
     });

    // Attach Reset Listener
    resetBtn.addEventListener('click', () => {
        resetToDefaults();
        updateURLFromInputs();
    });
    
    // Ensure URL reflects current values (useful when no params were present)
    updateURLFromInputs();

    // Initial calc
    calculateAndDraw();
});

function initLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    // Default to DE if browser starts with 'de', else EN
    currentLang = browserLang.startsWith('de') ? 'de' : 'en';
    applyLanguage();
}

function toggleLanguage() {
    currentLang = currentLang === 'de' ? 'en' : 'de';
    applyLanguage();
}

function applyLanguage() {
    const t = translations[currentLang];

    // 1. Update text content elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });

    // 2. Update HTML content elements (like headers with spans)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        if (t[key]) el.innerHTML = t[key];
    });

    // 3. Update Button Label
    langLabel.textContent = currentLang.toUpperCase();
    
    // 4. Update Document Title
    document.title = currentLang === 'de' ? "Lohnt sich die Automatisierung?" : "Is Automation Worth It?";

    // 5. Recalculate to update chart and verdict text
    calculateAndDraw();
}

function formatHours(hours) {
    const t = translations[currentLang];
    if (Math.abs(hours) < 1) {
        return Math.round(hours * 60) + " " + t.unitMin;
    }
    return Math.round(hours * 10) / 10 + " " + t.unitStd;
}

function calculateAndDraw() {
    const t = translations[currentLang];

    // 1. Get Values & Normalize to Hours/Year
    
    // Manual Side
    const freqVal = parseFloat(document.getElementById('frequencyVal').value) || 0;
    const freqUnit = parseFloat(document.getElementById('frequencyUnit').value); 
    const totalExecutionsPerYear = freqVal * freqUnit;
    
    const taskTimeVal = parseFloat(document.getElementById('timePerTaskVal').value) || 0;
    const taskTimeUnit = parseFloat(document.getElementById('timePerTaskUnit').value); 
    const taskDurationHours = taskTimeVal * taskTimeUnit / 60;

    const manualHoursPerYear = totalExecutionsPerYear * taskDurationHours;

    // Automation Side
    const buildVal = parseFloat(document.getElementById('buildTimeVal').value) || 0;
    const buildUnit = parseFloat(document.getElementById('buildTimeUnit').value); 
    const initialBuildHours = buildVal * buildUnit / 60;
    
    const maintenanceHoursPerYear = parseFloat(document.getElementById('maintenanceSlider').value);

    // Update UI Slider Label
    maintenanceDisplay.textContent = maintenanceHoursPerYear + " " + t.unitStd;

    // 2. Calculations for Data Points (Monthly for 5 Years = 60 months)
    const months = 60;
    const labels = [];
    const manualData = [];
    const autoData = [];

    let breakEvenMonth = -1;

    for (let i = 0; i <= months; i++) {
        // X Axis Labels
        if (i === 0) labels.push(t.start);
        else if (i % 12 === 0) labels.push(`${t.year} ${i/12}`);
        else labels.push(''); 

        // Manual
        const manualAcc = (manualHoursPerYear / 12) * i;
        manualData.push(manualAcc);

        // Auto
        const autoAcc = initialBuildHours + (maintenanceHoursPerYear / 12) * i;
        autoData.push(autoAcc);

        // Check for Break Even
        if (breakEvenMonth === -1 && i > 0 && manualAcc >= autoAcc) {
            breakEvenMonth = i;
        }
    }

    // 3. Update Text Metrics
    manualYearlyEl.textContent = formatHours(manualHoursPerYear);
    
    const totalManual5Years = manualHoursPerYear * 5;
    const totalAuto5Years = initialBuildHours + (maintenanceHoursPerYear * 5);
    const netSavings = totalManual5Years - totalAuto5Years;

    if (netSavings > 0) {
        savings5YearsEl.textContent = "+ " + formatHours(netSavings);
        savings5YearsEl.classList.remove('text-red-500');
        savings5YearsEl.classList.add('text-emerald-600');
    } else {
        savings5YearsEl.textContent = formatHours(netSavings); 
        savings5YearsEl.classList.remove('text-emerald-600');
        savings5YearsEl.classList.add('text-red-500');
    }

    // Verdict Logic
    if (breakEvenMonth !== -1) {
        const monthLabel = breakEvenMonth === 1 ? t.month : t.months;
        breakEvenEl.textContent = `${breakEvenMonth} ${monthLabel}`;
        
        verdictTitle.textContent = t.verdictWorth;
        
        if (breakEvenMonth <= 6) {
            verdictText.textContent = t.verdictNoBrainer;
        } else if (breakEvenMonth <= 24) {
            let msg = t.verdictMedium;
            msg = msg.replace('{months}', breakEvenMonth).replace('{monthsLabel}', monthLabel);
            verdictText.textContent = msg;
        } else {
            verdictText.textContent = t.verdictLong;
        }
    } else {
        breakEvenEl.textContent = t.moreThan5Years;
        verdictTitle.textContent = t.verdictNotWorth;
        verdictText.textContent = t.verdictNever;
    }

    // 4. Update Chart
    updateChart(labels, manualData, autoData, t);
}

function updateChart(labels, manualData, autoData, t) {
    const ctx = document.getElementById('roiChart').getContext('2d');

    if (chartInstance) {
        chartInstance.destroy();
    }

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: t.chartManual,
                    data: manualData,
                    borderColor: '#ea580c', // Orange
                    backgroundColor: 'rgba(234, 88, 12, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0
                },
                {
                    label: t.chartAuto,
                    data: autoData,
                    borderColor: '#4f46e5', // Indigo
                    backgroundColor: 'rgba(79, 70, 229, 0.05)',
                    borderWidth: 3,
                    pointRadius: 0,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += Math.round(context.parsed.y) + ' ' + t.unitStd;
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            family: "'Inter', sans-serif"
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: true
                    },
                    ticks: {
                        autoSkip: false,
                        maxTicksLimit: 6,
                        font: { family: "'Inter', sans-serif" }
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: t.chartYAxis
                    },
                    grid: {
                        borderDash: [5, 5],
                        color: '#f1f5f9'
                    },
                    ticks: {
                        font: { family: "'Inter', sans-serif" }
                    }
                }
            }
        }
    });
}

// Read GET parameters and apply to inputs (if present)
function readParamsToInputs() {
    try {
        const params = new URLSearchParams(window.location.search);
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const val = params.get(id);
            if (val !== null) {
                el.value = val;
            }
        });
    } catch (e) {
        // ignore malformed URLs
    }
}

// Update the browser URL (no reload) with current input values
function updateURLFromInputs() {
    try {
        const params = new URLSearchParams();
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            params.set(id, String(el.value));
        });
        const newUrl = window.location.pathname + '?' + params.toString();
        history.replaceState(null, '', newUrl);
    } catch (e) {
        // ignore
    }
}

// Reset inputs to their default values and refresh UI
function resetToDefaults() {
    const defaults = {
        frequencyVal: '5',
        frequencyUnit: '52',
        timePerTaskVal: '10',
        timePerTaskUnit: '1',
        buildTimeVal: '4',
        buildTimeUnit: '60',
        maintenanceSlider: '0'
    };

    Object.keys(defaults).forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.value = defaults[id];
        // also trigger input events for any listeners
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Update maintenance display and recalc
    const maintenanceSlider = document.getElementById('maintenanceSlider');
    const t = translations[currentLang];
    maintenanceDisplay.textContent = (maintenanceSlider.value || '0') + ' ' + (t ? t.unitStd : 'Std');

    calculateAndDraw();
}
