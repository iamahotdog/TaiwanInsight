// State and Data Variables
let state = {
    overviewData: null,
    detailedData: null,
    charts: {},
    currentMetric: '小計' // Default metric for table and charts
};

const CHART_COLORS = {
    asia: '#00f2fe',
    americas: '#fe5f75',
    europe: '#a18cd1',
    oceania: '#fbc2eb',
    africa: '#e0c3fc',
    mainline: '#4facfe',
    baseline: 'rgba(255, 255, 255, 0.4)',
    grid: 'rgba(255,255,255,0.05)',
    text: '#94a3b8',
    compare: 'rgba(255, 255, 255, 0.1)'
};

const DETAILED_LIST = ['日本', '韓國', '美國', '香港', '新加坡', '馬來西亞', '泰國', '越南', '菲律賓', '中國大陸', '澳門'];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    
    if (typeof TOURISM_DATA !== 'undefined') {
        const clean = (d) => {
            if (!Array.isArray(d)) return [];
            return d.filter(row => row && (row['年別'] || row['\ufeff年別'])).map(row => {
                const r = {};
                Object.keys(row).forEach(k => {
                    const cleanKey = k.trim().replace(/^\ufeff/, '');
                    let val = row[k];
                    if (cleanKey !== '年別' && cleanKey !== '月份') {
                        val = parseInt(String(val).replace(/,/g, '')) || 0;
                    } else {
                        val = parseInt(val) || 0;
                    }
                    r[cleanKey] = val;
                });
                return r;
            }).filter(r => !isNaN(r['年別']));
        };

        state.overviewData = clean(TOURISM_DATA.overviewData);
        state.detailedData = clean(TOURISM_DATA.detailedData);

        hideLoader();
        updateHeroSummary();
        updateKPIs(true);
        renderCharts();
    }
});

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
            // Re-render charts when switching view to ensure canvas size is correct
            if (targetId === 'continents') renderContinentsChart();
            if (targetId === 'overview') renderMonthlyComparisonChart();
        });
    });

    const trendSelect = document.getElementById('trendSelect');
    if (trendSelect) {
        trendSelect.addEventListener('change', (e) => {
            state.currentMetric = e.target.value;
            const text = e.target.options[e.target.selectedIndex].text;
            const insightTarget = document.getElementById('insight-target-name');
            if (insightTarget) insightTarget.innerText = text.split(' ')[0];
            
            renderRecoveryChart(state.currentMetric);
            renderComparisonTable(state.currentMetric);
        });
    }

    const yearSelect = document.getElementById('yearSelect');
    if (yearSelect) {
        yearSelect.addEventListener('change', (e) => {
            renderCountriesChart(state.detailedData, e.target.value);
        });
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.style.display = 'none', 500);
    }
}

Chart.defaults.color = CHART_COLORS.text;
Chart.defaults.font.family = "'Inter', 'Noto Sans TC', sans-serif";

// --- V4 Summary Expansion Logic ---

function updateHeroSummary() {
    const data = state.overviewData;
    const currentYear = 2026;
    let total2026 = 0;
    let latestMonth = 0;

    data.forEach(row => {
        if (row['年別'] + 1911 === currentYear) {
            total2026 += row['小計'];
            if (row['月份'] > latestMonth) latestMonth = row['月份'];
        }
    });

    // Populate Big Number
    animateValue('hero-total-visitors', 0, total2026, 2000);
    const dateRangeElem = document.getElementById('hero-date-range');
    if (dateRangeElem) dateRangeElem.innerText = `2026年1月1日 - ${latestMonth}月底`;

    // Populate Top 5 Rankings (參考圖一)
    const detailed = state.detailedData;
    const countryAgg = {};
    DETAILED_LIST.forEach(c => countryAgg[c] = 0);

    detailed.forEach(row => {
        if (row['年別'] + 1911 === currentYear) {
            DETAILED_LIST.forEach(c => {
                countryAgg[c] += (row[c] || 0);
            });
        }
    });

    const sorted = Object.entries(countryAgg).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const maxVal = sorted[0][1];
    const topListElem = document.getElementById('hero-top-countries');
    if (!topListElem) return;

    topListElem.innerHTML = sorted.map((item, idx) => `
        <div class="ranking-item">
            <div class="ranking-info">
                <span class="ranking-name">${idx+1}. ${item[0]}</span>
                <span class="ranking-value">${item[1].toLocaleString()}</span>
            </div>
            <div class="ranking-bar-bg">
                <div class="ranking-bar-fill" style="width: ${(item[1]/maxVal * 100).toFixed(1)}%"></div>
            </div>
        </div>
    `).join('');
}

// --- Growth Table Logic (參考圖二) ---

function renderComparisonTable(metricKey) {
    const data = DETAILED_LIST.includes(metricKey) ? state.detailedData : state.overviewData;
    const tableTitle = document.getElementById('table-title');
    if (tableTitle) tableTitle.innerText = `歷年成長率 | ${metricKey} 訪客數據`;

    const tableElem = document.getElementById('comparisonTable');
    if (!tableElem) return;

    // Structure: { Month: { 2024: val, 2025: val, 2026: val } }
    const matrix = Array.from({length: 12}, (_, i) => ({ month: i + 1, 2024: 0, 2025: 0, 2026: 0 }));
    
    data.forEach(row => {
        const y = row['年別'] + 1911;
        const m = row['月份'];
        if ([2024, 2025, 2026].includes(y) && m >= 1 && m <= 12) {
            matrix[m-1][y] = row[metricKey] || 0;
        }
    });

    let html = `
        <thead>
            <tr>
                <th>月份</th>
                <th>2024年</th>
                <th>2025年</th>
                <th>2026年</th>
                <th>成長率 (YoY)</th>
            </tr>
        </thead>
        <tbody>
    `;

    matrix.forEach(row => {
        const val25 = row[2025];
        const val26 = row[2026];
        let growthHtml = '<span style="color:var(--text-muted)">--</span>';
        
        if (val26 > 0 && val25 > 0) {
            const growth = ((val26 - val25) / val25 * 100).toFixed(1);
            const isUp = growth >= 0;
            growthHtml = `
                <div class="growth-indicator ${isUp ? 'indicator-up' : 'indicator-down'}">
                    ${isUp ? '↑' : '↓'} ${Math.abs(growth)}%
                </div>
            `;
        }

        html += `
            <tr>
                <td>${row.month}月</td>
                <td>${row[2024] > 0 ? row[2024].toLocaleString() : '-'}</td>
                <td>${row[2025] > 0 ? row[2025].toLocaleString() : '-'}</td>
                <td>${row[2026] > 0 ? row[2026].toLocaleString() : '-'}</td>
                <td>${growthHtml}</td>
            </tr>
        `;
    });

    // Add Year Summary row (accumulated for Feb)
    const m12_25 = matrix[0][2025] + matrix[1][2025];
    const m12_26 = matrix[0][2026] + matrix[1][2026];
    const yoy = (((m12_26 - m12_25) / m12_25) * 100).toFixed(1);

    html += `
        <tr style="background: rgba(212, 175, 55, 0.1); border-top: 2px solid #d4af37">
            <td>1月-2月累計</td>
            <td>${(matrix[0][2024] + matrix[1][2024]).toLocaleString()}</td>
            <td>${m12_25.toLocaleString()}</td>
            <td>${m12_26.toLocaleString()}</td>
            <td>
                <div class="growth-indicator ${yoy >= 0 ? 'indicator-up' : 'indicator-down'}">
                    ${yoy >= 0 ? '↑' : '↓'} ${Math.abs(yoy)}%
                </div>
            </td>
        </tr>
    </tbody>`;

    tableElem.innerHTML = html;
}

// --- Animation & Core KPI Handlers ---

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const val = Math.floor(progress * (end - start) + start);
        obj.innerHTML = val.toLocaleString() + (id.includes('rate') ? '%' : '');
        if (progress < 1) window.requestAnimationFrame(step);
        else obj.innerHTML = end.toLocaleString() + (id.includes('rate') ? '%' : '');
    };
    window.requestAnimationFrame(step);
}

function updateKPIs(animate = false) {
    const data = state.overviewData;
    const yearlyTotals = {};
    data.forEach(row => {
        const year = row['年別'] + 1911;
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
        const rate = totalBase > 0 ? Math.round((totalCur / totalBase) * 100) : 0;
        animateValue('kpi-recovery-rate', 0, rate, 1500);
    } else {
        const curElem = document.getElementById('kpi-current-year');
        if (curElem) curElem.innerText = totalCur.toLocaleString();
        const rateElem = document.getElementById('kpi-recovery-rate');
        if (rateElem) rateElem.innerText = `${((totalCur / (totalBase || 1)) * 100).toFixed(1)}%`;
    }

    const trendElem = document.getElementById('kpi-trend-current');
    if (trendElem && totalPrev > 0) {
        const growth = ((totalCur - totalPrev) / totalPrev * 100).toFixed(1);
        trendElem.innerHTML = `↑ ${growth}% <span style="font-size: 0.8em; color: var(--text-muted)">vs 2024</span>`;
    }

    const statusElem = document.getElementById('kpi-recovery-status');
    if (statusElem) {
        statusElem.innerText = (totalCur / (totalBase || 1)) >= 1 ? "超越疫情前水準" : "穩健向 2019 靠攏";
    }
    
    const topMarketElem = document.getElementById('kpi-top-market');
    if (topMarketElem) topMarketElem.innerText = "港澳 / 日本"; 
}

// --- Seasonal Engine ---

function updateSeasonalInsight(metricKey) {
    const data = DETAILED_LIST.includes(metricKey) ? state.detailedData : state.overviewData;
    if (!data || data.length === 0) return;

    const monthlySums = Array(12).fill(0);
    const monthlyCounts = Array(12).fill(0);
    
    data.forEach(row => {
        const y = row['年別'] + 1911;
        const m = row['月份'] - 1;
        if (y >= 2023 && y <= 2025 && m >= 0 && m < 12) {
            monthlySums[m] += (row[metricKey] || 0);
            monthlyCounts[m] += 1;
        }
    });

    const averages = monthlySums.map((sum, i) => sum / (monthlyCounts[i] || 1));
    const maxVal = Math.max(...averages);
    const peakMonth = averages.indexOf(maxVal) + 1;
    
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    const insightBox = document.getElementById('seasonal-insight');
    if (!insightBox) return;

    let text = `該市場平均旺季集中在 <span class="season-badge">${monthNames[peakMonth-1]}</span>。`;
    if (metricKey === '日本' || peakMonth <= 3) text += " 寒假與農曆新年帶動了顯著流量。";
    else if (peakMonth >= 6 && peakMonth <= 8) text += " 夏季旅遊高峰期表現最為強勁。";
    else if (peakMonth >= 10) text += " 秋冬季商務與賞楓需求帶動回流。";
    else text += " 流量分佈趨勢穩定，呈現復甦態勢。";

    insightBox.innerHTML = text;
}

// --- Charts Engine ---

function renderCharts() {
    renderRecoveryChart(state.currentMetric);
    renderComparisonTable(state.currentMetric);
    renderContinentsChart();
    renderCountriesChart(state.detailedData, 'all');
    renderMonthlyComparisonChart();
    renderResidencePieChart();
}

function renderRecoveryChart(metricKey) {
    const data = DETAILED_LIST.includes(metricKey) ? state.detailedData : state.overviewData;
    
    const yearlyData = {};
    const base2019Line = Array(8).fill(null); // 2019-2026

    // Baseline 2019 calculation
    let total2019 = 0;
    data.forEach(row => {
        const year = row['年別'] + 1911;
        if (!yearlyData[year]) yearlyData[year] = 0;
        yearlyData[year] += (row[metricKey] || 0);
        if (year === 2019) total2019 += (row[metricKey] || 0);
    });

    const labels = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    const values = labels.map(l => yearlyData[l] || 0);
    const baselineData = Array(8).fill(total2019);

    const ctx = document.getElementById('recoveryChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['recoveryChart']) state.charts['recoveryChart'].destroy();

    state.charts['recoveryChart'] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: `2019 基準`,
                    data: baselineData,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderDash: [5, 5],
                    borderWidth: 1,
                    pointRadius: 0,
                    fill: false
                },
                {
                    label: `${metricKey} 人次`,
                    data: values,
                    borderColor: CHART_COLORS.asia,
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()}`
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

function renderContinentsChart() {
    const data = state.overviewData;
    const keys = ['亞洲地區', '美洲地區', '歐洲地區', '大洋洲地區', '非洲地區'];
    const years = [2019, 2024, 2025];
    const yearlyMap = { 2019: {}, 2024: {}, 2025: {} };
    
    keys.forEach(k => { yearlyMap[2019][k] = 0; yearlyMap[2024][k] = 0; yearlyMap[2025][k] = 0; });

    data.forEach(row => {
        const y = row['年別'] + 1911;
        if (yearlyMap[y]) {
            keys.forEach(k => yearlyMap[y][k] += (row[k] || 0));
        }
    });

    const labels = ['亞洲', '美洲', '歐洲', '大洋洲', '非洲'];
    const recoveryRates = keys.map(k => (yearlyMap[2025][k] / (yearlyMap[2019][k] || 1) * 100).toFixed(1));
    const momentum = keys.map(k => ((yearlyMap[2025][k] - yearlyMap[2024][k]) / (yearlyMap[2024][k] || 1) * 100).toFixed(1));

    // Update Hero Cells
    const maxRecIdx = recoveryRates.indexOf(String(Math.max(...recoveryRates)));
    const maxMomIdx = momentum.indexOf(String(Math.max(...momentum)));
    const maxVolIdx = keys.indexOf(keys.reduce((a, b) => yearlyMap[2025][a] > yearlyMap[2025][b] ? a : b));

    document.getElementById('continent-hero-recovery').innerText = `${labels[maxRecIdx]} (${recoveryRates[maxRecIdx]}%)`;
    document.getElementById('continent-hero-momentum').innerText = `${labels[maxMomIdx]} (+${momentum[maxMomIdx]}%)`;
    document.getElementById('continent-hero-volume').innerText = `${labels[maxVolIdx]}`;

    const ctxRadar = document.getElementById('continentRadarChart')?.getContext('2d');
    if (ctxRadar) {
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
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { angleLines: { color: CHART_COLORS.grid }, grid: { color: CHART_COLORS.grid }, ticks: { display: false }, suggestedMin: 0, suggestedMax: 120 } } }
        });
    }

    const ctxBar = document.getElementById('continentBarChart')?.getContext('2d');
    if (ctxBar) {
        if (state.charts['continentBar']) state.charts['continentBar'].destroy();
        state.charts['continentBar'] = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: '2024 人次', data: keys.map(k => yearlyMap[2024][k]), backgroundColor: CHART_COLORS.compare, borderRadius: 4 },
                    { label: '2025 人次', data: keys.map(k => yearlyMap[2025][k]), backgroundColor: CHART_COLORS.mainline, borderRadius: 4 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v/10000).toFixed(0) + 'w' } } } }
        });
    }

    // Continent Insight Narrative
    const insightElem = document.getElementById('continent-insight');
    let story = `當前全球復甦以 <span class="season-badge">${labels[maxRecIdx]}</span> 最為顯著，`;
    if (parseFloat(recoveryRates[maxRecIdx]) > 100) story += `已超越 2019 基準。`;
    else story += `正逐步逼近疫情前水準。`;
    story += ` 增長動能則由 <span class="season-badge">${labels[maxMomIdx]}</span> 領銜，表現令人矚目。`;
    insightElem.innerHTML = story;
}

function renderCountriesChart(data, targetYear) {
    const countryData = {};
    DETAILED_LIST.forEach(c => countryData[c] = 0);

    data.forEach(row => {
        const y = row['年別'] + 1911;
        if (targetYear === 'all' || targetYear == y) {
            DETAILED_LIST.forEach(c => countryData[c] += (row[c] || 0));
        }
    });

    const sorted = Object.entries(countryData).filter(i => i[1] > 0).sort((a,b) => b[1] - a[1]);
    const labels = sorted.map(item => item[0]);
    const values = sorted.map(item => item[1]);

    const ctx = document.getElementById('countryRankingChart')?.getContext('2d');
    if (!ctx) return;
    if(state.charts['countriesRanking']) state.charts['countriesRanking'].destroy();

    state.charts['countriesRanking'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '觀光客人數',
                data: values,
                backgroundColor: ['#d4af37', '#ffd700', '#f1c40f', '#00f2fe', '#4facfe', '#a18cd1', '#fbc2eb', '#fe5f75', '#ff9a9e', '#fecfef'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: { x: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v/10000).toFixed(0) + '萬' } }, y: { grid: { display: false }, ticks: { color: '#fff' } } },
            plugins: { legend: { display: false } }
        }
    });
}

function renderMonthlyComparisonChart() {
    const data = state.overviewData;
    if (!data || data.length === 0) return;
    const years = [2023, 2024, 2025, 2026];
    const yearColors = { 2023: '#ff7e5f', 2024: '#a1c4fd', 2025: '#4facfe', 2026: '#fe5f75' };

    const datasets = years.map(year => {
        const yearPoints = Array(12).fill(null);
        data.forEach(row => {
            const y = row['年別'] + 1911;
            const m = row['月份'] - 1;
            if (y === year && m >= 0 && m < 12) yearPoints[m] = row['小計'];
        });
        return { label: `${year}年`, data: yearPoints, borderColor: yearColors[year], backgroundColor: yearColors[year], borderWidth: 2, tension: 0.3, pointRadius: 3, fill: false };
    });

    const ctx = document.getElementById('monthlyComparisonChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['monthlyComparison']) state.charts['monthlyComparison'].destroy();

    state.charts['monthlyComparison'] = new Chart(ctx, {
        type: 'line',
        data: { labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], datasets: datasets },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { y: { grid: { color: CHART_COLORS.grid }, ticks: { callback: v => (v/10000).toFixed(0) + 'w' } }, x: { grid: { display: false } } } }
    });
}

function renderResidencePieChart() {
    const data = state.detailedData;
    if (!data || data.length === 0) return;
    
    let latestYear = 0, latestMonth = 0;
    data.forEach(row => {
        const y = row['年別'] + 1911, m = row['月份'];
        if (y > latestYear || (y === latestYear && m > latestMonth)) { latestYear = y; latestMonth = m; }
    });

    const titleElem = document.getElementById('pie-chart-title');
    if (titleElem) titleElem.innerText = `${latestYear}年${latestMonth}月 客源分佈`;

    const countryData = {};
    DETAILED_LIST.forEach(c => countryData[c] = 0);
    let otherTotal = 0, total = 0;

    data.forEach(row => {
        const y = row['年別'] + 1911, m = row['月份'];
        if (y === latestYear && m === latestMonth) {
            let rowSum = 0;
            DETAILED_LIST.forEach(c => { const val = row[c] || 0; countryData[c] += val; rowSum += val; });
            const subTotal = row['小計'] || 0;
            otherTotal += (subTotal - rowSum);
            total += subTotal;
        }
    });

    const categories = Object.entries(countryData).filter(i => i[1] > 0).sort((a,b) => b[1] - a[1]);
    if (otherTotal > 0) categories.push(['其他', otherTotal]);

    const ctx = document.getElementById('residencePieChart')?.getContext('2d');
    if (!ctx || total === 0) return;
    if (state.charts['residencePie']) state.charts['residencePie'].destroy();

    state.charts['residencePie'] = new Chart(ctx, {
        type: 'doughnut',
        data: { labels: categories.map(i => i[0]), datasets: [{ data: categories.map(i => i[1]), backgroundColor: ['#fe5f75', '#4facfe', '#a18cd1', '#fbc2eb', '#00f2fe', '#ff9a9e', '#fecfef', '#e0c3fc', '#8fd3f4', '#84fab0', '#fccb90', '#94a3b8'], borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 8, font: { size: 10 } } }, tooltip: { callbacks: { label: (ctx) => { const val = ctx.raw; const perc = ((val / total) * 100).toFixed(1); return `${ctx.label}: ${val.toLocaleString()} (${perc}%)`; } } } }, cutout: '60%' }
    });
}
