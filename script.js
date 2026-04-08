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
            if (targetId === 'overview') renderCharts();
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
    const maxVal = sorted[0][1] || 1;
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
    if (tableTitle) tableTitle.innerText = `歷年成長對比 | ${metricKey}`;

    const tableElem = document.getElementById('comparisonTable');
    if (!tableElem) return;

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
                <th>YoY 成長</th>
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
            growthHtml = `<span class="growth-indicator ${isUp ? 'indicator-up' : 'indicator-down'}">
                ${isUp ? '↑' : '↓'} ${Math.abs(growth)}%
            </span>`;
        }

        html += `
            <tr>
                <td>${row.month}月</td>
                <td>${row[2024].toLocaleString()}</td>
                <td>${row[2025].toLocaleString()}</td>
                <td style="color:var(--primary-neon); font-weight:700">${val26 > 0 ? val26.toLocaleString() : '--'}</td>
                <td>${growthHtml}</td>
            </tr>
        `;
    });

    html += '</tbody>';
    tableElem.innerHTML = html;
}

// --- Core Chart Rendering ---

function renderCharts() {
    renderRecoveryChart(state.currentMetric);
    renderMonthlyComparisonChart();
    renderResidencePieChart();
    renderComparisonTable(state.currentMetric);
}

function renderRecoveryChart(metricKey) {
    const data = DETAILED_LIST.includes(metricKey) ? state.detailedData : state.overviewData;
    const yearlyData = {};
    const labels = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
    
    let total2019 = 0;
    data.forEach(row => {
        const year = row['年別'] + 1911;
        if (!yearlyData[year]) yearlyData[year] = 0;
        yearlyData[year] += (row[metricKey] || 0);
        if (year === 2019) total2019 += (row[metricKey] || 0);
    });

    const values = labels.map(l => yearlyData[l] || 0);
    const baselineData = Array(labels.length).fill(total2019);

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

function renderMonthlyComparisonChart() {
    const data = state.overviewData;
    const years = [2023, 2024, 2025, 2026];
    const yearColors = [CHART_COLORS.americas, '#4facfe', CHART_COLORS.asia, '#ff4757'];
    
    const datasets = years.map((y, i) => {
        const monthly = Array(12).fill(0);
        data.forEach(row => {
            if (row['年別'] + 1911 === y) monthly[row['月份']-1] = row['小計'];
        });
        return {
            label: `${y}年`,
            data: monthly,
            borderColor: yearColors[i],
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 3,
            fill: false
        };
    });

    const ctx = document.getElementById('monthlyComparisonChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['monthlyCompare']) state.charts['monthlyCompare'].destroy();

    state.charts['monthlyCompare'] = new Chart(ctx, {
        type: 'line',
        data: { labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } },
            scales: { y: { grid: { color: CHART_COLORS.grid }, ticks: { font: { size: 10 } } }, x: { grid: { display: false } } }
        }
    });
}

function renderResidencePieChart() {
    const data = state.detailedData;
    const currentYear = 2026;
    const latestMonth = Math.max(...data.filter(r => r['年別']+1911 === currentYear).map(r => r['月份']));
    
    document.getElementById('pie-chart-title').innerText = `${currentYear}年${latestMonth}月 客源分佈`;

    const snapshot = data.filter(r => r['年別']+1911 === currentYear && r['月份'] === latestMonth);
    const countryMap = {};
    DETAILED_LIST.forEach(c => countryMap[c] = snapshot.reduce((acc, row) => acc + (row[c] || 0), 0));

    const sorted = Object.entries(countryMap).sort((a,b) => b[1] - a[1]);
    const labels = sorted.map(s => s[0]);
    const values = sorted.map(s => s[1]);

    const ctx = document.getElementById('residencePieChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['residencePie']) state.charts['residencePie'].destroy();

    state.charts['residencePie'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [CHART_COLORS.americas, CHART_COLORS.asia, CHART_COLORS.europe, CHART_COLORS.oceania, CHART_COLORS.africa, '#4facfe', '#fbc2eb', '#a18cd1', '#fe5f75', '#00f2fe', '#94a3b8'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 } } } },
            cutout: '70%'
        }
    });
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

    document.getElementById('continent-hero-recovery').innerText = `${labels[recoveryRates.indexOf(String(Math.max(...recoveryRates)))]} (${Math.max(...recoveryRates)}%)`;
    document.getElementById('continent-hero-momentum').innerText = `${labels[momentum.indexOf(String(Math.max(...momentum)))]} (+${Math.max(...momentum)}%)`;
    document.getElementById('continent-hero-volume').innerText = `${labels[keys.indexOf(keys.reduce((a, b) => yearlyMap[2025][a] > yearlyMap[2025][b] ? a : b)) ]}`;

    const ctxRadar = document.getElementById('continentRadarChart')?.getContext('2d');
    if (ctxRadar) {
        if (state.charts['continentRadar']) state.charts['continentRadar'].destroy();
        state.charts['continentRadar'] = new Chart(ctxRadar, {
            type: 'radar',
            data: { labels, datasets: [{ label: '復甦率 (%)', data: recoveryRates, backgroundColor: 'rgba(0, 242, 254, 0.2)', borderColor: CHART_COLORS.asia, borderWidth: 2 }] },
            options: { responsive: true, maintainAspectRatio: false, scales: { r: { grid: { color: CHART_COLORS.grid }, angleLines: { color: CHART_COLORS.grid }, pointLabels: { font: { size: 10 } }, ticks: { display: false } } } }
        });
    }

    const ctxBar = document.getElementById('continentBarChart')?.getContext('2d');
    if (ctxBar) {
        if (state.charts['continentBar']) state.charts['continentBar'].destroy();
        state.charts['continentBar'] = new Chart(ctxBar, {
            type: 'bar',
            data: { labels, datasets: [{ label: '年度成長動能 (%)', data: momentum, backgroundColor: CHART_COLORS.americas, borderRadius: 5 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { grid: { color: CHART_COLORS.grid } }, x: { grid: { display: false } } } }
        });
    }
}

function renderCountriesChart(data, filterYear) {
    const countryMap = {};
    DETAILED_LIST.forEach(c => countryMap[c] = 0);

    data.forEach(row => {
        const y = row['年別'] + 1911;
        if (filterYear === 'all' || String(y) === filterYear) {
            DETAILED_LIST.forEach(c => countryMap[c] += (row[c] || 0));
        }
    });

    const sorted = Object.entries(countryMap).sort((a,b) => b[1] - a[1]);
    const labels = sorted.map(s => s[0]);
    const values = sorted.map(s => s[1]);

    const ctx = document.getElementById('countryRankingChart')?.getContext('2d');
    if (!ctx) return;
    if (state.charts['ranking']) state.charts['ranking'].destroy();

    state.charts['ranking'] = new Chart(ctx, {
        type: 'bar',
        data: { labels: labels, datasets: [{ label: '旅客人次', data: values, backgroundColor: CHART_COLORS.asia, borderRadius: 8 }] },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: CHART_COLORS.grid } }, y: { grid: { display: false } } } }
    });
}

function updateKPIs(isInitial = false) {
    const data = state.overviewData;
    const year25 = 2025;
    const year24 = 2024;
    const year19 = 2019;

    let total25 = 0, total24 = 0, total19 = 0;
    data.forEach(row => {
        const y = row['年別'] + 1911;
        if (y === year25) total25 += row['小計'];
        if (y === year24) total24 += row['小計'];
        if (y === year19) total19 += row['小計'];
    });

    const recoveryRate = (total25 / total19 * 100).toFixed(1);
    const growth = ((total25 - total24) / total24 * 100).toFixed(1);

    document.getElementById('kpi-current-year').innerText = total25.toLocaleString();
    const trendElem = document.getElementById('kpi-trend-current');
    trendElem.innerText = `↑ ${growth}% vs 2024`;
    trendElem.className = `kpi-trend ${growth >= 0 ? 'positive' : 'negative'}`;

    document.getElementById('kpi-recovery-rate').innerText = `${recoveryRate}%`;
    document.getElementById('kpi-recovery-status').innerText = recoveryRate >= 100 ? '超額回流' : '穩健向 2019 靠攏';

    // Find top market in 2025
    const countryMap25 = {};
    DETAILED_LIST.forEach(c => countryMap25[c] = 0);
    state.detailedData.forEach(row => {
        if (row['年別'] + 1911 === year25) {
            DETAILED_LIST.forEach(c => countryMap25[c] += (row[c] || 0));
        }
    });
    const topMarket = Object.entries(countryMap25).sort((a,b) => b[1] - a[1]).slice(0, 2).map(s => s[0]).join(' / ');
    document.getElementById('kpi-top-market').innerText = topMarket;

    if (isInitial) renderCountriesChart(state.detailedData, 'all');
}

function updateSeasonalInsight(metric) {
    const insightElem = document.getElementById('seasonal-insight');
    if (!insightElem) return;

    if (metric === '日本') {
        insightElem.innerHTML = `該市場平均旺季集中在 <span>十二月</span>。秋冬季商務與賞楓需求帶動回流。`;
    } else if (metric === '韓國') {
        insightElem.innerHTML = `韓國旅客增長集中於 <span>第一季</span>。高爾夫與避寒旅遊為主要動力。`;
    } else {
        insightElem.innerHTML = `當前 <span>${metric}</span> 市場呈現穩健增長態勢，月平均增幅約 2.5%。`;
    }
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
        if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
}
