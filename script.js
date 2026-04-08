// State and Data Variables
let state = {
    overviewData: null,
    detailedData: null,
    charts: {} 
};

const CHART_COLORS = {
    asia: '#00f2fe',
    americas: '#fe5f75',
    europe: '#a18cd1',
    oceania: '#fbc2eb',
    africa: '#e0c3fc',
    mainline: '#4facfe',
    grid: 'rgba(255,255,255,0.05)',
    text: '#94a3b8',
    compare: 'rgba(255, 255, 255, 0.1)'
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    if (typeof TOURISM_DATA !== 'undefined') {
        state.overviewData = TOURISM_DATA.overviewData;
        state.detailedData = TOURISM_DATA.detailedData;
        
        // Data Normalization
        const clean = (d) => d.filter(row => row['年別'] && !isNaN(row['年別'])).map(row => {
            const r = {...row};
            Object.keys(r).forEach(k => { if(k !== '年別' && k !== '月份') r[k] = parseInt(r[k]) || 0; });
            return r;
        });

        state.overviewData = clean(state.overviewData);
        state.detailedData = clean(state.detailedData);

        hideLoader();
        updateKPIs(true); // true for animation
        renderCharts();
    }
});

// --- UI Logic ---
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.dashboard-view');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            views.forEach(v => {
                if (v.id === targetId) v.classList.remove('hidden');
                else v.classList.add('hidden');
            });
        });
    });

    document.getElementById('trendSelect').addEventListener('change', (e) => {
        const text = e.target.options[e.target.selectedIndex].text;
        document.getElementById('insight-target-name').innerText = text.split(' ')[0];
        renderRecoveryChart(e.target.value);
    });

    document.getElementById('yearSelect').addEventListener('change', (e) => {
        renderCountriesChart(state.detailedData, e.target.value);
    });
}

function hideLoader() {
    const loader = document.getElementById('loader');
    loader.classList.add('hidden');
    setTimeout(() => loader.style.display = 'none', 500);
}

// --- Animation Engine ---
function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        obj.innerHTML = val.toLocaleString() + (id.includes('rate') ? '%' : '');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// --- KPI Engine ---
function updateKPIs(animate = false) {
    const data = state.overviewData;
    const yearlyTotals = {};
    
    data.forEach(row => {
        const year = parseInt(row['年別']) + 1911;
        if (!yearlyTotals[year]) yearlyTotals[year] = 0;
        yearlyTotals[year] += row['小計'];
    });

    const CUR_YEAR = 2025;
    const PREV_YEAR = 2024;
    const BASE_YEAR = 2019;

    const totalCur = yearlyTotals[CUR_YEAR] || 0;
    const totalPrev = yearlyTotals[PREV_YEAR] || 0;
    const totalBase = yearlyTotals[BASE_YEAR] || 0;

    if (animate) {
        animateValue('kpi-current-year', 0, totalCur, 1500);
        const rate = Math.round((totalCur / totalBase) * 100);
        animateValue('kpi-recovery-rate', 0, rate, 1500);
    } else {
        document.getElementById('kpi-current-year').innerText = totalCur.toLocaleString();
        document.getElementById('kpi-recovery-rate').innerText = `${((totalCur / totalBase) * 100).toFixed(1)}%`;
    }

    const trendElem = document.getElementById('kpi-trend-current');
    if (totalPrev > 0) {
        const growth = ((totalCur - totalPrev) / totalPrev * 100).toFixed(1);
        trendElem.innerHTML = `↑ ${growth}% <span style="font-size: 0.8em; color: var(--text-muted)">vs 2024</span>`;
    }

    const statusElem = document.getElementById('kpi-recovery-status');
    statusElem.innerText = (totalCur / totalBase) >= 1 ? "超越疫情前水準" : "穩健向 2019 靠攏";
    
    document.getElementById('kpi-top-market').innerText = "港澳 / 日本"; 
}

// --- Seasonal Engine ---
function updateSeasonalInsight(metricKey) {
    const isDetailed = ['日本', '韓國', '美國', '香港', '新加坡', '馬來西亞', '泰國', '興南', '菲律賓'].includes(metricKey);
    const data = isDetailed ? state.detailedData : state.overviewData;
    
    // Group monthly averages across 2023-2025 (Recovery phase)
    const monthlySums = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    data.forEach(row => {
        const y = parseInt(row['年別']) + 1911;
        const m = parseInt(row['月份']) - 1;
        if (y >= 2023 && y <= 2025) {
            monthlySums[m] += (row[metricKey] || 0);
            monthlyCounts[m] += 1;
        }
    });

    const averages = monthlySums.map((sum, i) => sum / (monthlyCounts[i] || 1));
    const maxVal = Math.max(...averages);
    const peakMonth = averages.indexOf(maxVal) + 1;
    
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    
    const insightBox = document.getElementById('seasonal-insight');
    let text = `該市場平均旺季集中在 <span class="season-badge">${monthNames[peakMonth-1]}</span>。`;
    
    if (metricKey === '日本' || peakMonth <= 3) text += " 寒假與農曆新年帶動了顯著流量。";
    else if (peakMonth >= 6 && peakMonth <= 8) text += " 夏季旅遊高峰期表現最為強勁。";
    else if (peakMonth >= 10) text += " 秋冬季商務與賞楓需求帶動回流。";
    else text += " 流量分佈平均，呈現穩健增長態勢。";

    insightBox.innerHTML = text;
}

// --- Charts Engine ---

function renderCharts() {
    renderRecoveryChart('小計');
    renderContinentsChart();
    renderCountriesChart(state.detailedData, 'all');
    renderMonthlyComparisonChart();
    renderResidencePieChart();
}

// 1. Recovery Trend (Line)
function renderRecoveryChart(metricKey) {
    const isDetailed = ['日本', '韓國', '美國', '香港', '新加坡', '馬來西亞', '泰國', '越南', '菲律賓', '中國大陸'].includes(metricKey);
    const data = isDetailed ? state.detailedData : state.overviewData;
    
    const yearlyData = {};
    data.forEach(row => {
        const year = parseInt(row['年別']) + 1911;
        if (!yearlyData[year]) yearlyData[year] = 0;
        yearlyData[year] += (row[metricKey] || 0);
    });

    const labels = Object.keys(yearlyData);
    const values = Object.values(yearlyData);

    const ctx = document.getElementById('recoveryChart').getContext('2d');
    if (state.charts['recoveryChart']) state.charts['recoveryChart'].destroy();

    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 242, 254, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 242, 254, 0)');

    state.charts['recoveryChart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: `${metricKey} 人次`,
                data: values,
                borderColor: CHART_COLORS.asia,
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 17, 26, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    borderColor: 'rgba(0, 242, 254, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.raw;
                            const year = ctx.label;
                            let res = ` 訪客人數: ${val.toLocaleString()}`;
                            if(year == 2019) res += " (基準點)";
                            return res;
                        }
                    }
                }
            },
            scales: {
                y: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v / 10000).toFixed(0) + ' 萬' } },
                x: { grid: { display: false } }
            }
        }
    });

    updateSeasonalInsight(metricKey);
}

// 2. Continental Radar & Momentum
function renderContinentsChart() {
    const data = state.overviewData;
    let y2019 = { '亞洲地區': 0, '美洲地區': 0, '歐洲地區': 0, '大洋洲地區': 0, '非洲地區': 0 };
    let y2024 = { '亞洲地區': 0, '美洲地區': 0, '歐洲地區': 0, '大洋洲地區': 0, '非洲地區': 0 };
    let y2025 = { '亞洲地區': 0, '美洲地區': 0, '歐洲地區': 0, '大洋洲地區': 0, '非洲地區': 0 };
    
    data.forEach(row => {
        const y = parseInt(row['年別']) + 1911;
        const target = (y === 2019) ? y2019 : (y === 2024 ? y2024 : (y === 2025 ? y2025 : null));
        if (target) {
            Object.keys(target).forEach(continent => {
                target[continent] += (row[continent] || 0);
            });
        }
    });

    const labels = ['亞洲', '美洲', '歐洲', '大洋洲', '非洲'];
    const continentKeys = ['亞洲地區', '美洲地區', '歐洲地區', '大洋洲地區', '非洲地區'];
    const recoveryRates = continentKeys.map(k => y2019[k] > 0 ? (y2025[k] / y2019[k] * 100).toFixed(1) : 0);

    const ctxRadar = document.getElementById('continentRadarChart').getContext('2d');
    if (state.charts['continentRadar']) state.charts['continentRadar'].destroy();
    
    state.charts['continentRadar'] = new Chart(ctxRadar, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '2025 復甦深度 (%)',
                data: recoveryRates,
                backgroundColor: 'rgba(0, 242, 254, 0.2)',
                borderColor: CHART_COLORS.asia,
                pointBackgroundColor: CHART_COLORS.asia
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: { 
                    angleLines: { color: CHART_COLORS.grid }, 
                    grid: { color: CHART_COLORS.grid }, 
                    ticks: { display: false },
                    pointLabels: { font: { size: 14 } },
                    suggestedMin: 0,
                    suggestedMax: 120
                }
            }
        }
    });

    const ctxBar = document.getElementById('continentBarChart').getContext('2d');
    if (state.charts['continentBar']) state.charts['continentBar'].destroy();

    state.charts['continentBar'] = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: '2024', data: continentKeys.map(k => y2024[k]), backgroundColor: CHART_COLORS.compare, borderRadius: 4 },
                { label: '2025', data: continentKeys.map(k => y2025[k]), backgroundColor: CHART_COLORS.mainline, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v/10000).toFixed(0) + 'w' } }
            }
        }
    });
}

// 3. Country Rankings (Horizontal Bar)
function renderCountriesChart(data, targetYear) {
    const countries = ['日本', '韓國', '香港', '美國', '新加坡', '馬來西亞', '泰國', '越南', '菲律賓', '中國大陸'];
    const countryData = {};
    countries.forEach(c => countryData[c] = 0);

    data.forEach(row => {
        const year = parseInt(row['年別']) + 1911;
        if (targetYear === 'all' || targetYear == year) {
            countries.forEach(c => {
                countryData[c] += (row[c] || 0);
            });
        }
    });

    const sorted = Object.entries(countryData).sort((a,b) => b[1] - a[1]);
    const labels = sorted.map(item => item[0]);
    const values = sorted.map(item => item[1]);

    const ctx = document.getElementById('countryRankingChart').getContext('2d');
    if(state.charts['countriesRanking']) state.charts['countriesRanking'].destroy();

    state.charts['countriesRanking'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '觀光客人數',
                data: values,
                backgroundColor: ['#00f2fe', '#4facfe', '#a18cd1', '#fbc2eb', '#fe5f75', '#ff9a9e', '#fecfef', '#e0c3fc', '#8fd3f4', '#f8f9fa'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v/10000).toFixed(0) + '萬' } },
                y: { grid: { display: false }, ticks: { color: '#fff' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// 4. Monthly Multi-Year Comparison (Line)
function renderMonthlyComparisonChart() {
    const data = state.overviewData;
    const years = [2023, 2024, 2025, 2026];
    const yearColors = {
        2023: '#ff7e5f', // Orange
        2024: '#a1c4fd', // Light Blue
        2025: '#4facfe', // Blue
        2026: '#fe5f75'  // Red
    };

    const datasets = years.map(year => {
        const yearPoints = Array(12).fill(null);
        data.forEach(row => {
            const y = parseInt(row['年別']) + 1911;
            const m = parseInt(row['月份']) - 1;
            if (y === year) {
                yearPoints[m] = row['小計'];
            }
        });
        
        return {
            label: `${year}年`,
            data: yearPoints,
            borderColor: yearColors[year],
            backgroundColor: yearColors[year],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            fill: false
        };
    });

    const ctx = document.getElementById('monthlyComparisonChart').getContext('2d');
    if (state.charts['monthlyComparison']) state.charts['monthlyComparison'].destroy();

    state.charts['monthlyComparison'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } }
            },
            scales: {
                y: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v/10000).toFixed(0) + 'w' } },
                x: { grid: { display: false } }
            }
        }
    });
}

// 5. Residence Distribution (Pie/Doughnut)
function renderResidencePieChart() {
    const data = state.detailedData;
    
    // Find latest year and month available
    let latestYear = 0;
    let latestMonth = 0;
    data.forEach(row => {
        const y = parseInt(row['年別']) + 1911;
        const m = parseInt(row['月份']);
        if (y > latestYear || (y === latestYear && m > latestMonth)) {
            latestYear = y;
            latestMonth = m;
        }
    });

    document.getElementById('pie-chart-title').innerText = `${latestYear}年${latestMonth}月 客源分佈`;

    const countries = ['日本', '韓國', '香港', '澳門', '越南', '泰國', '馬來西亞', '新加坡', '菲律賓', '美國', '中國大陸'];
    const countryData = {};
    countries.forEach(c => countryData[c] = 0);
    let otherTotal = 0;
    let total = 0;

    data.forEach(row => {
        const y = parseInt(row['年別']) + 1911;
        const m = parseInt(row['月份']);
        if (y === latestYear && m === latestMonth) {
            let rowSum = 0;
            countries.forEach(c => {
                const val = row[c] || 0;
                countryData[c] += val;
                rowSum += val;
            });
            const subTotal = row['小計'] || 0;
            otherTotal += (subTotal - rowSum);
            total += subTotal;
        }
    });

    const categories = Object.entries(countryData)
        .filter(i => i[1] > 0)
        .sort((a,b) => b[1] - a[1]);
    
    categories.push(['其他', otherTotal]);

    const labels = categories.map(i => i[0]);
    const values = categories.map(i => i[1]);

    const ctx = document.getElementById('residencePieChart').getContext('2d');
    if (state.charts['residencePie']) state.charts['residencePie'].destroy();

    state.charts['residencePie'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    '#fe5f75', '#4facfe', '#a18cd1', '#fbc2eb', '#00f2fe', 
                    '#ff9a9e', '#fecfef', '#e0c3fc', '#8fd3f4', '#84fab0', 
                    '#fccb90', '#94a3b8'
                ],
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10 } } },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.raw;
                            const perc = ((val / total) * 100).toFixed(1);
                            return `${ctx.label}: ${val.toLocaleString()} (${perc}%)`;
                        }
                    }
                }
            },
            cutout: '60%'
        }
    });
}
