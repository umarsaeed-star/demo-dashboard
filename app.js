const MISSING = "Unknown";

function isFilled(value) {
    return value !== null && value !== undefined && value !== "";
}

function displayValue(value) {
    return isFilled(value) ? String(value) : MISSING;
}

function parseCreatedDate(value) {
    if (!isFilled(value)) {
        return null;
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const PAGE = document.body.dataset.page || "respondents";
let COMPANY_NAME = "";
let COMPANY_HIERS = new Set();

function inflateNkiRows() {
    if (typeof nkiPack === "undefined" || !nkiPack || !Array.isArray(nkiPack.rows)) {
        return [];
    }

    const pack = nkiPack;
    const lookup = (list, index) => (list && index >= 0 && index < list.length ? list[index] : "");

    return pack.rows.map((row, index) => {
        const company = lookup(pack.companies, row[1]);
        const hier = lookup(pack.hiers, row[3]) || MISSING;
        const year = row[0] ? String(row[0]) : MISSING;
        const device = lookup(pack.devices, row[7]);
        const csi = lookup(pack.csi, row[8]);

        return {
            respid: index + 1,
            CompanyOPEN: company,
            Company: company,
            hier,
            Reportyear: year,
            reportYear: year,
            regionGroup: lookup(pack.regions, row[2]) || MISSING,
            size: lookup(pack.sizes, row[4]),
            agecat: lookup(pack.ages, row[5]),
            gender: lookup(pack.genders, row[6]),
            DeviceRecode: device,
            CSIcat3levelsG: csi,
            familycat2: lookup(pack.families, row[9]),
            income3intervall: lookup(pack.incomes, row[10]),
            areaINTERVALL: lookup(pack.areas, row[11]),
            priceBand: lookup(pack.prices, row[12]),
            CSIoverall_CSIoa: row[13],
            loyaltyrec_loyrec: row[14],
            IfactorOPEN_home: row[15],
            IfactorOPEN_closesit: row[16],
            IfactorOPEN_choises: row[17],
            IfactorOPEN_info: row[18],
            IfactorOPEN_personal: row[19],
            IfactorOPEN_reliable: row[20],
            IfactorOPEN_value: row[21],
            IfactorOPEN_loyalty: row[22],
            IfactorOPEN_csi: row[23],
            status: "complete",
            respstatus: "complete",
            createdDate: year,
            createdDateParsed: year === MISSING ? null : new Date(`${year}-01-01`),
            emailsSent: null,
            surveyLink: null
        };
    });
}

const surveyRows = inflateNkiRows();
const rows = surveyRows;
const hierCompanyMap = new Map();
surveyRows.forEach((row) => {
    if (!hierCompanyMap.has(row.hier)) {
        hierCompanyMap.set(row.hier, displayValue(row.CompanyOPEN));
    }
});
const fieldKeys = [
    "CompanyOPEN", "hier", "Reportyear", "regionGroup", "size", "agecat", "gender",
    "DeviceRecode", "CSIcat3levelsG", "familycat2", "income3intervall", "areaINTERVALL",
    "priceBand", "CSIoverall_CSIoa", "loyaltyrec_loyrec"
];
const nkiMeta = typeof nkiPack === "undefined" ? {} : nkiPack;

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

const filters = {
    hierarchy: document.getElementById("filter-hierarchy"),
    status: document.getElementById("filter-status"),
    year: document.getElementById("filter-year"),
    search: document.getElementById("filter-search"),
    group: document.getElementById("filter-group"),
    company: document.getElementById("filter-company"),
    csi: document.getElementById("filter-csi"),
    device: document.getElementById("filter-device"),
    plot: document.getElementById("filter-plot"),
    contract: document.getElementById("filter-contract"),
    age: document.getElementById("filter-age"),
    gender: document.getElementById("filter-gender"),
    region: document.getElementById("filter-region"),
    size: document.getElementById("filter-size"),
    family: document.getElementById("filter-family"),
    income: document.getElementById("filter-income"),
    dwelling: document.getElementById("filter-area"),
    price: document.getElementById("filter-price")
};

const AGE_LABELS = {
    "25": "25–34",
    "35": "35–44",
    "45": "45–54",
    "55": "55–64",
    "65": "65–65",
    "66": "66+",
    noAnswer: "No answer"
};

const GENDER_LABELS = {
    "1": "Male",
    "2": "Female",
    villej: "Prefer not to say",
    annat: "Other",
    osaker: "Unsure"
};

const SIZE_LABELS = {
    "1": "1 room",
    "2": "2 rooms",
    "3": "3 rooms",
    "4": "4 rooms",
    "5": "5 rooms",
    "6": "6 rooms",
    "7": "7 rooms",
    "8": "8 rooms"
};

const FAMILY_LABELS = {
    barnlos: "No children",
    singel: "Single",
    small: "Small family",
    medium: "Medium family",
    large: "Large family"
};

const INCOME_LABELS = {
    under50: "Under 50k",
    "50t90": "50–90k",
    over90: "Over 90k"
};

const AREA_LABELS = {
    mindre50: "Under 50 m²",
    "50till75": "50–75 m²",
    "75till100": "75–100 m²",
    "100till125": "100–125 m²",
    mer125: "Over 125 m²"
};

const PLOT_LABELS = {};
const CONTRACT_LABELS = {};

const CSI_LABELS = {
    good: "Good",
    average: "Average",
    bad: "Bad"
};

const NKI_FACTORS = (nkiMeta.factors && nkiMeta.factors.length)
    ? nkiMeta.factors
    : [
        ["IfactorOPEN_home", "Home"],
        ["IfactorOPEN_info", "Information"],
        ["IfactorOPEN_choises", "Choices"],
        ["IfactorOPEN_personal", "Staff"],
        ["IfactorOPEN_reliable", "Reliability"],
        ["IfactorOPEN_value", "Value"],
        ["IfactorOPEN_closesit", "Site completion"],
        ["IfactorOPEN_csi", "CSI"],
        ["IfactorOPEN_loyalty", "Loyalty"]
    ];

const HUBEXO_PALETTE = ["#008cff", "#a54cff", "#ff8700", "#00dc00", "#e6284b", "#dcff3c", "#321432", "#c8d2d2"];

function hubexoFill(index) {
    return HUBEXO_PALETTE[index % HUBEXO_PALETTE.length];
}

const CSI_COLORS = {
    Good: "#00dc00",
    Average: "#ff8700",
    Bad: "#e6284b",
    Unknown: "#c8d2d2"
};

const YEAR_COLORS = {
    "2018": "#008cff",
    "2019": "#a54cff",
    "2020": "#ff8700",
    "2021": "#00dc00",
    "2022": "#e6284b",
    "2023": "#321432",
    "2024": "#dcff3c",
    "2025": "#008cff",
    "2026": "#c8d2d2",
    Unknown: "#c8d2d2"
};

const YEAR_ORDER = ["2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026", MISSING];

const FACTOR_EFFECT_LABELS = {
    home: "Home",
    info: "Information",
    choises: "Choices",
    person: "Staff",
    value: "Value",
    reliable: "Reliability",
    closesite: "Site completion"
};

function scoreBandColor(score) {
    if (score >= 8) return "#00dc00";
    if (score >= 6) return "#ff8700";
    return "#e6284b";
}

function csiCategory(row) {
    return CSI_LABELS[row.CSIcat3levelsG] || displayValue(row.CSIcat3levelsG);
}

function addYGrid(chart, y, width, ticks = 5) {
    chart.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(ticks).tickSize(-width).tickFormat(""))
        .select(".domain")
        .remove();
}

function addXGrid(chart, x, height, ticks = 5) {
    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(ticks).tickSize(-height).tickFormat(""))
        .select(".domain")
        .remove();
}

function uniqueSorted(values) {
    return Array.from(new Set(values)).sort((a, b) => {
        if (a === MISSING) return 1;
        if (b === MISSING) return -1;
        return String(a).localeCompare(String(b), undefined, { numeric: true });
    });
}

function companySlug(name) {
    return String(name || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function companyKey(name) {
    return companySlug(name).replace(/-/g, "");
}

function companyNames() {
    return uniqueSorted(surveyRows.map((row) => displayValue(row.CompanyOPEN)))
        .filter((name) => name !== MISSING);
}

function resolveCompanyName(query) {
    if (!query) return "";
    const decoded = decodeURIComponent(String(query)).trim();
    const names = companyNames();
    return names.find((name) => name === decoded)
        || names.find((name) => companyKey(name) === companyKey(decoded))
        || "";
}

function companyPageUrl(name) {
    if (!name) return "company.html";
    return `company.html?company=${encodeURIComponent(companySlug(name))}`;
}

function urlCompanyQuery() {
    return new URLSearchParams(window.location.search).get("company") || "";
}

function fillSelect(select, values, labels = {}) {
    const current = select.value;

    select.querySelectorAll("option:not([value=''])").forEach((option) => option.remove());

    values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = labels[value] || value;
        select.appendChild(option);
    });

    if (values.includes(current)) {
        select.value = current;
    }
}

function filterValue(element) {
    return element && element.value ? element.value : "";
}

function getFilteredRows() {
    const hierarchy = filterValue(filters.hierarchy);
    const status = filterValue(filters.status);
    const year = filterValue(filters.year);
    const group = filterValue(filters.group);
    const query = (filters.search && filters.search.value.trim().toLowerCase()) || "";

    return rows.filter((row) => {
        if (hierarchy && row.hier !== hierarchy) return false;
        if (status && row.respstatus !== status) return false;
        if (year && row.reportYear !== year) return false;
        if (group && displayValue(row.CompanyOPEN) !== group) return false;
        if (PAGE === "company" && COMPANY_NAME && displayValue(row.CompanyOPEN) !== COMPANY_NAME) return false;

        if (filterValue(filters.region) && row.regionGroup !== filterValue(filters.region)) return false;
        if (filterValue(filters.size) && displayValue(row.size) !== filterValue(filters.size)) return false;
        if (filterValue(filters.price) && displayValue(row.priceBand) !== filterValue(filters.price)) return false;
        if (filterValue(filters.family) && displayValue(row.familycat2) !== filterValue(filters.family)) return false;
        if (filterValue(filters.income) && displayValue(row.income3intervall) !== filterValue(filters.income)) return false;
        if (filterValue(filters.dwelling) && displayValue(row.areaINTERVALL) !== filterValue(filters.dwelling)) return false;

        if (!query) return true;

        const haystack = [
            row.respid,
            row.hier,
            row.CompanyOPEN,
            row.regionGroup,
            row.reportYear
        ].join(" ").toLowerCase();

        return haystack.includes(query);
    });
}

function getFilteredSurveyRows() {
    const hierarchy = filterValue(filters.hierarchy);
    const year = filterValue(filters.year);
    const company = PAGE === "company" ? COMPANY_NAME : filterValue(filters.company);
    const csi = filterValue(filters.csi);
    const device = filterValue(filters.device);
    const plot = filterValue(filters.plot);
    const contract = filterValue(filters.contract);
    const age = filterValue(filters.age);
    const gender = filterValue(filters.gender);
    const query = (filters.search && filters.search.value.trim().toLowerCase()) || "";

    return surveyRows.filter((row) => {
        if (hierarchy && displayValue(row.hier) !== hierarchy) return false;
        if (year && displayValue(row.Reportyear) !== year) return false;
        if (company && displayValue(row.CompanyOPEN) !== company) return false;
        if (csi && displayValue(row.CSIcat3levelsG) !== csi) return false;
        if (device && deviceLabel(row) !== device) return false;
        if (plot && displayValue(row.priceBand) !== plot) return false;
        if (contract && displayValue(row.income3intervall) !== contract) return false;
        if (age && displayValue(row.agecat) !== age) return false;
        if (gender && displayValue(row.gender) !== gender) return false;
        if (filterValue(filters.region) && row.regionGroup !== filterValue(filters.region)) return false;
        if (filterValue(filters.size) && displayValue(row.size) !== filterValue(filters.size)) return false;
        if (filterValue(filters.family) && displayValue(row.familycat2) !== filterValue(filters.family)) return false;
        if (filterValue(filters.income) && displayValue(row.income3intervall) !== filterValue(filters.income)) return false;
        if (filterValue(filters.dwelling) && displayValue(row.areaINTERVALL) !== filterValue(filters.dwelling)) return false;
        if (filterValue(filters.price) && displayValue(row.priceBand) !== filterValue(filters.price)) return false;

        if (!query) return true;

        const haystack = [
            row.respid,
            row.hier,
            row.CompanyOPEN,
            row.regionGroup,
            row.status
        ].join(" ").toLowerCase();

        return haystack.includes(query);
    });
}

function scoreValue(value) {
    const number = Number(value);
    if (!Number.isFinite(number) || number === 98) return null;
    return number;
}

function deviceLabel(row) {
    const device = String(row.DeviceRecode || "").toLowerCase();
    if (device === "mobile") return "Mobile";
    if (device === "tablet") return "Tablet";
    if (device === "desktop") return "Desktop";
    return MISSING;
}

function parseSendout(value) {
    const text = String(value || "");
    if (!/^\d{6}$/.test(text)) return null;
    const parsed = new Date(`${text.slice(0, 4)}-${text.slice(4, 6)}-01`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function meanScore(data, field) {
    const values = data.map((row) => scoreValue(row[field])).filter((value) => value !== null);
    return values.length ? d3.mean(values) : null;
}

function rollupCounts(data, key) {
    return Array.from(
        d3.rollup(data, (values) => values.length, (d) => d[key]),
        ([label, count]) => ({ label, count })
    ).sort((a, b) => b.count - a.count || String(a.label).localeCompare(String(b.label)));
}

function coverageFor(data) {
    if (!data.length || !fieldKeys.length) {
        return { percent: 0, fields: [] };
    }

    const totalCells = data.length * fieldKeys.length;
    const filledCells = data.reduce((sum, row) => {
        return sum + fieldKeys.filter((key) => isFilled(row[key])).length;
    }, 0);

    const fields = fieldKeys
        .map((field) => {
            const filled = data.filter((row) => isFilled(row[field])).length;
            return {
                field,
                filled,
                total: data.length,
                pct: data.length ? filled / data.length : 0
            };
        })
        .filter((item) => item.filled > 0)
        .sort((a, b) => b.pct - a.pct || a.field.localeCompare(b.field));

    return {
        percent: totalCells ? filledCells / totalCells : 0,
        fields
    };
}

function updateKpis(data) {
    const coverage = coverageFor(data);
    const companies = new Set(data.filter((row) => row.CompanyOPEN).map((row) => row.CompanyOPEN)).size;
    const years = new Set(data.filter((row) => row.reportYear !== MISSING).map((row) => row.reportYear)).size;
    const totalEl = document.getElementById("kpi-total");
    if (!totalEl) return;

    totalEl.textContent = data.length.toLocaleString();
    const activeEl = document.getElementById("kpi-active");
    if (activeEl) activeEl.textContent = companies.toLocaleString();
    const hierEl = document.getElementById("kpi-hierarchies");
    if (hierEl) hierEl.textContent = years.toLocaleString();
    const coverageEl = document.getElementById("kpi-coverage");
    if (coverageEl) {
        const csi = meanScore(data, "IfactorOPEN_csi");
        coverageEl.textContent = csi == null ? "—" : csi.toFixed(1);
    }

    const label = document.getElementById("record-count-label");
    if (label && PAGE !== "company") {
        label.textContent = `${data.length.toLocaleString()} answers · 2018–2026`;
    }
}

function showTooltip(event, html) {
    tooltip
        .style("opacity", 1)
        .html(html)
        .style("left", `${event.pageX + 12}px`)
        .style("top", `${event.pageY - 28}px`);
}

function hideTooltip() {
    tooltip.style("opacity", 0);
}

function clearChart(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return false;
    container.innerHTML = "";
    return true;
}

function scaleChartHeight(preferred) {
    const width = window.innerWidth;
    if (width < 640) return Math.round(preferred * 0.7);
    if (width < 960) return Math.round(preferred * 0.82);
    return preferred;
}

function createBarChart(containerId, chartData, valueLabel, options = {}) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);
    const colorFn = typeof options === "function" ? options : options.colorFn;
    const containerWidth = container.clientWidth || 480;
    const margin = { top: 28, right: 20, bottom: 72, left: 56 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(options.height || 240);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
        .domain(chartData.map((d) => d.label))
        .range([0, width])
        .padding(0.28);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.count) || 1])
        .nice()
        .range([height, 0]);

    addYGrid(chart, y, width, 5);

    chart.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.label))
        .attr("y", (d) => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", (d) => Math.max(0, height - y(d.count)))
        .attr("rx", 3)
        .style("fill", (d, index) => (colorFn ? colorFn(d) : hubexoFill(index)))
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("opacity", 0.75);
            showTooltip(event, `<strong>${d.label}</strong><br>${valueLabel}: ${d.count.toLocaleString()}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("opacity", 1);
            hideTooltip();
        });

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .attr("transform", "rotate(-20)")
        .style("text-anchor", "end");

    chart.append("g")
        .call(d3.axisLeft(y).ticks(Math.min(6, d3.max(chartData, (d) => d.count) || 1)).tickFormat(d3.format("d")).tickSizeOuter(0));

    chart.selectAll(".bar-value")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "chart-value")
        .attr("x", (d) => x(d.label) + x.bandwidth() / 2)
        .attr("y", (d) => {
            const barTop = y(d.count);
            return barTop < 16 ? barTop + 16 : barTop - 6;
        })
        .attr("text-anchor", "middle")
        .attr("fill", (d) => (y(d.count) < 16 ? "#fff" : null))
        .text((d) => (d.count ? d.count.toLocaleString() : ""));
}

function hierarchyGroupName(label, row) {
    if (row && isFilled(row.CompanyOPEN)) return row.CompanyOPEN;
    if (!label || label === MISSING) return MISSING;
    return hierCompanyMap.get(label) || "Other";
}

function nestHierarchyData(chartData) {
    const groups = d3.group(chartData, (d) => hierarchyGroupName(d.label));

    return Array.from(groups, ([name, values]) => ({
        name,
        children: values.map((item) => ({
            name: item.label,
            label: item.label,
            count: item.count
        }))
    })).sort((a, b) => (
        d3.sum(b.children, (d) => d.count) - d3.sum(a.children, (d) => d.count)
    ));
}

function contrastFill(colorValue) {
    const color = d3.color(colorValue);
    if (!color) return "#fff";
    const luminance = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
    return luminance > 0.62 ? "#321432" : "#fff";
}

function createTreemapChart(containerId, chartData, height = 360) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 480;
    const width = Math.max(containerWidth, 280);
    const chartHeight = scaleChartHeight(height);
    const grouped = nestHierarchyData(chartData);
    const color = d3.scaleOrdinal(HUBEXO_PALETTE)
        .domain(grouped.map((d) => d.name));

    const root = d3.hierarchy({ name: "root", children: grouped })
        .sum((d) => d.count || 0)
        .sort((a, b) => (b.value || 0) - (a.value || 0));

    d3.treemap()
        .size([width, chartHeight])
        .paddingInner(2)
        .paddingOuter(3)
        .paddingTop(22)
        .round(true)(root);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width)
        .attr("height", chartHeight);

    const leaves = root.leaves();

    const nodes = svg.selectAll(".treemap-leaf")
        .data(leaves)
        .enter()
        .append("g")
        .attr("class", "treemap-leaf")
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    nodes.append("rect")
        .attr("width", (d) => Math.max(0, d.x1 - d.x0))
        .attr("height", (d) => Math.max(0, d.y1 - d.y0))
        .attr("fill", (d) => color(d.parent.data.name))
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .attr("rx", 3)
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("opacity", 0.8);
            const share = root.value ? d.value / root.value : 0;
            showTooltip(
                event,
                `<strong>${d.data.label}</strong><br>` +
                `${d.parent.data.name}<br>` +
                `Respondents: ${d.value.toLocaleString()} (${d3.format(".0%")(share)})`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("opacity", 1);
            hideTooltip();
        })
        .on("click", (event, d) => {
            filters.hierarchy.value = d.data.label;
            resetToFirstPage();
        });

    nodes.append("text")
        .attr("class", "treemap-leaf-label")
        .attr("x", 6)
        .attr("y", 16)
        .attr("fill", (d) => contrastFill(color(d.parent.data.name)))
        .text((d) => {
            const boxWidth = d.x1 - d.x0;
            const boxHeight = d.y1 - d.y0;
            if (boxWidth < 48 || boxHeight < 24) return "";
            const label = String(d.data.label);
            const maxChars = Math.max(4, Math.floor((boxWidth - 10) / 6));
            return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
        });

    nodes.append("text")
        .attr("class", "treemap-count")
        .attr("x", 6)
        .attr("y", 30)
        .attr("fill", (d) => contrastFill(color(d.parent.data.name)))
        .text((d) => ((d.x1 - d.x0) > 48 && (d.y1 - d.y0) > 36 ? d.value.toLocaleString() : ""));

    svg.selectAll(".treemap-group-label")
        .data(root.children || [])
        .enter()
        .append("text")
        .attr("class", "treemap-group-label")
        .attr("x", (d) => d.x0 + 4)
        .attr("y", (d) => d.y0 + 14)
        .text((d) => {
            const widthAvailable = d.x1 - d.x0;
            if (widthAvailable < 48) return "";
            const label = `${d.data.name} (${d.value.toLocaleString()})`;
            const maxChars = Math.max(4, Math.floor(widthAvailable / 7));
            return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
        });
}

function createDonutChart(containerId, chartData, caption = "respondents", colorMap) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const size = Math.min(container.clientWidth || 360, window.innerWidth < 640 ? 220 : 280);
    const radius = size / 2 - 8;
    const palette = ["#008cff", "#00dc00", "#e6284b", "#ff8700", "#a54cff", "#dcff3c"];
    const color = d3.scaleOrdinal()
        .domain(chartData.map((d) => d.label))
        .range(chartData.map((d, index) => (colorMap && colorMap[d.label]) || palette[index % palette.length]));

    const wrap = d3.select(`#${containerId}`).append("div").attr("class", "donut-layout");

    const svg = wrap.append("svg")
        .attr("width", size)
        .attr("height", size);

    const chart = svg.append("g")
        .attr("transform", `translate(${size / 2},${size / 2})`);

    const unit = PAGE === "survey" ? "Answers" : "Respondents";
    const total = d3.sum(chartData, (d) => d.count) || 1;
    const pie = d3.pie().value((d) => d.count).sort(null);
    const arc = d3.arc().innerRadius(radius * 0.58).outerRadius(radius);
    const slices = pie(chartData);

    chart.selectAll("path")
        .data(slices)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => color(d.data.label))
        .on("mouseover", (event, d) => {
            showTooltip(
                event,
                `<strong>${d.data.label}</strong><br>${unit}: ${d.data.count.toLocaleString()} (${d3.format(".0%")(d.data.count / total)})`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    chart.selectAll(".donut-slice-value")
        .data(slices.filter((d) => d.data.count / total >= 0.08))
        .enter()
        .append("text")
        .attr("class", "chart-value")
        .attr("transform", (d) => `translate(${arc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", (d) => contrastFill(color(d.data.label)))
        .text((d) => d.data.count.toLocaleString());

    chart.append("text")
        .attr("class", "donut-total")
        .attr("text-anchor", "middle")
        .attr("dy", "0.1em")
        .text(d3.sum(chartData, (d) => d.count).toLocaleString());

    chart.append("text")
        .attr("class", "donut-caption")
        .attr("text-anchor", "middle")
        .attr("dy", "1.6em")
        .text(caption);

    const legend = wrap.append("ul").attr("class", "donut-legend");

    legend.selectAll("li")
        .data(chartData)
        .enter()
        .append("li")
        .html((d) => (
            `<span class="swatch" style="background:${color(d.label)}"></span>` +
            `<span>${d.label}</span>` +
            `<strong>${d.count.toLocaleString()}</strong>` +
            `<span class="donut-pct">${d3.format(".0%")(d.count / total)}</span>`
        ));
}

function createCoverageChart(containerId, fields) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!fields.length) {
        container.innerHTML = `<p class="empty-state">No populated fields for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 480;
    const margin = { top: 8, right: 48, bottom: 24, left: 140 };
    const width = Math.max(containerWidth - margin.left - margin.right, 220);
    const barHeight = 28;
    const height = fields.length * barHeight;

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
        .domain(fields.map((d) => d.field))
        .range([0, height])
        .padding(0.28);

    const x = d3.scaleLinear()
        .domain([0, 1])
        .range([0, width]);

    chart.selectAll(".coverage-track")
        .data(fields)
        .enter()
        .append("rect")
        .attr("class", "coverage-track")
        .attr("x", 0)
        .attr("y", (d) => y(d.field))
        .attr("width", width)
        .attr("height", y.bandwidth());

    chart.selectAll(".coverage-bar")
        .data(fields)
        .enter()
        .append("rect")
        .attr("class", "coverage-bar")
        .attr("x", 0)
        .attr("y", (d) => y(d.field))
        .attr("width", (d) => x(d.pct))
        .attr("height", y.bandwidth())
        .style("fill", (d) => d3.interpolateRgb("#dcff3c", "#321432")(d.pct))
        .on("mouseover", (event, d) => {
            showTooltip(
                event,
                `<strong>${d.field}</strong><br>${d.filled} of ${d.total} records`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain")
        .remove();

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(4).tickFormat(d3.format(".0%")));

    chart.selectAll(".coverage-label")
        .data(fields)
        .enter()
        .append("text")
        .attr("class", "coverage-label")
        .attr("x", (d) => x(d.pct) + 6)
        .attr("y", (d) => y(d.field) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text((d) => `${d.filled}/${d.total}`);
}

function createHorizontalBarChart(containerId, chartData, valueLabel) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 480;
    const longest = d3.max(chartData, (d) => String(d.label).length) || 8;
    const margin = { top: 8, right: 48, bottom: 24, left: Math.min(160, Math.max(110, longest * 7)) };
    const width = Math.max(containerWidth - margin.left - margin.right, 220);
    const barHeight = 32;
    const height = Math.max(chartData.length * barHeight, 80);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
        .domain(chartData.map((d) => d.label))
        .range([0, height])
        .padding(0.28);

    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.count) || 1])
        .nice()
        .range([0, width]);

    chart.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", (d) => y(d.label))
        .attr("width", (d) => x(d.count))
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("fill", (d, index) => hubexoFill(index))
        .style("fill", (d, index) => hubexoFill(index))
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("opacity", 0.75);
            showTooltip(event, `<strong>${d.label}</strong><br>${valueLabel}: ${d.count.toLocaleString()}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("opacity", 1);
            hideTooltip();
        });

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain")
        .remove();

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format("d")).tickSizeOuter(0));

    chart.selectAll(".coverage-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "coverage-label")
        .attr("x", (d) => x(d.count) + 6)
        .attr("y", (d) => y(d.label) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text((d) => d.count.toLocaleString());
}

function createLineChart(containerId, chartData, valueLabel) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 480;
    const margin = { top: 28, right: 24, bottom: 48, left: 48 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(340);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(chartData, (d) => d.date))
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.count) || 1])
        .nice()
        .range([height, 0]);

    addYGrid(chart, y, width, 5);

    const area = d3.area()
        .x((d) => x(d.date))
        .y0(height)
        .y1((d) => y(d.count))
        .curve(d3.curveMonotoneX);

    const line = d3.line()
        .x((d) => x(d.date))
        .y((d) => y(d.count))
        .curve(d3.curveMonotoneX);

    chart.append("path")
        .datum(chartData)
        .attr("class", "area")
        .attr("d", area);

    chart.append("path")
        .datum(chartData)
        .attr("class", "line")
        .attr("d", line);

    chart.selectAll(".point")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => y(d.count))
        .attr("r", 5)
        .on("mouseover", (event, d) => {
            showTooltip(
                event,
                `<strong>${d3.timeFormat("%b %Y")(d.date)}</strong><br>${valueLabel}: ${d.count.toLocaleString()}`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    chart.selectAll(".point-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "point-label")
        .attr("x", (d) => x(d.date))
        .attr("y", (d) => y(d.count) - 10)
        .attr("text-anchor", "middle")
        .text((d) => d.count.toLocaleString());

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(Math.min(chartData.length, 8)).tickFormat(d3.timeFormat("%b %Y")));

    chart.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")));
}

function flowNode(title, count, extraClass = "") {
    return `
        <div class="flow-node ${extraClass}">
            <div class="flow-title">${title}</div>
            <div class="flow-count">${count.toLocaleString()}</div>
        </div>
    `;
}

function createProcessFlow(containerId, columns) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!columns.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    container.innerHTML = `<div class="flow">${columns.map((column, index) => {
        const nodes = column.map((node) => flowNode(node.title, node.count, node.className || "")).join("");
        const arrow = index < columns.length - 1 ? `<div class="flow-arrow" aria-hidden="true">→</div>` : "";
        return `<div class="flow-col">${nodes}</div>${arrow}`;
    }).join("")}</div>`;
}

function createSankeyChart(containerId, links, heightOverride) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!links.length || typeof d3.sankey !== "function") {
        container.innerHTML = `<p class="empty-state">No flow data for the current filters.</p>`;
        return;
    }

    const names = Array.from(new Set(links.flatMap((link) => [link.source, link.target])));
    const nodes = names.map((name) => ({ name }));
    const index = new Map(names.map((name, i) => [name, i]));
    const graph = {
        nodes: nodes.map((node) => ({ ...node })),
        links: links.map((link) => ({
            source: index.get(link.source),
            target: index.get(link.target),
            value: link.value
        }))
    };

    const containerWidth = container.clientWidth || 720;
    const width = Math.max(containerWidth, 320);
    const height = scaleChartHeight(heightOverride || Math.max(280, Math.min(520, names.length * 32)));
    const color = d3.scaleOrdinal(HUBEXO_PALETTE).domain(names);

    const layout = d3.sankey()
        .nodeWidth(18)
        .nodePadding(14)
        .extent([[8, 8], [width - 8, height - 8]]);

    let sankey;
    try {
        sankey = layout(graph);
    } catch (error) {
        container.innerHTML = `<p class="empty-state">No flow data for the current filters.</p>`;
        return;
    }

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    svg.append("g")
        .selectAll("path")
        .data(sankey.links)
        .enter()
        .append("path")
        .attr("class", "sankey-link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", (d) => color(d.source.name))
        .attr("stroke-width", (d) => Math.max(1, d.width))
        .on("mouseover", (event, d) => {
            showTooltip(
                event,
                `<strong>${d.source.name} → ${d.target.name}</strong><br>${d.value.toLocaleString()} ${PAGE === "survey" ? "answers" : "respondents"}`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    const node = svg.append("g")
        .selectAll("g")
        .data(sankey.nodes)
        .enter()
        .append("g");

    node.append("rect")
        .attr("x", (d) => d.x0)
        .attr("y", (d) => d.y0)
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => Math.max(1, d.y1 - d.y0))
        .attr("fill", (d) => CSI_COLORS[d.name] || YEAR_COLORS[d.name] || color(d.name))
        .attr("rx", 3);

    node.append("text")
        .attr("class", "sankey-label")
        .attr("x", (d) => (d.x0 < width / 2 ? d.x1 + 8 : d.x0 - 8))
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => (d.x0 < width / 2 ? "start" : "end"))
        .text((d) => `${d.name} (${d.value.toLocaleString()})`);

    svg.append("g")
        .selectAll("text")
        .data(sankey.links.filter((d) => d.width >= 18 && d.value > 0))
        .enter()
        .append("text")
        .attr("class", "sankey-link-value")
        .attr("x", (d) => (d.source.x1 + d.target.x0) / 2)
        .attr("y", (d) => (d.y0 + d.y1) / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .text((d) => d.value.toLocaleString());
}

function createBubbleChart(containerId, chartData, height = 360, onSelect) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const width = Math.max(container.clientWidth || 480, 280);
    const chartHeight = scaleChartHeight(height);
    const color = d3.scaleOrdinal(HUBEXO_PALETTE).domain(chartData.map((d) => d.label));
    const root = d3.pack()
        .size([width, chartHeight])
        .padding(6)(
            d3.hierarchy({ children: chartData })
                .sum((d) => d.count || 0)
                .sort((a, b) => (b.value || 0) - (a.value || 0))
        );

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width)
        .attr("height", chartHeight);

    const node = svg.selectAll(".bubble")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("class", "bubble")
        .attr("transform", (d) => `translate(${d.x},${d.y})`);

    node.append("circle")
        .attr("r", (d) => d.r)
        .attr("fill", (d) => color(d.data.label))
        .attr("opacity", 0.88)
        .on("mouseover", (event, d) => {
            showTooltip(
                event,
                `<strong>${d.data.label}</strong><br>Respondents: ${d.value.toLocaleString()}`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip)
        .on("click", (event, d) => {
            if (typeof onSelect === "function") {
                onSelect(d.data.label);
            }
        });

    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", (d) => (d.r > 22 ? "0.2em" : "0.35em"))
        .attr("fill", (d) => contrastFill(color(d.data.label)))
        .style("font-size", "12px")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .text((d) => {
            if (d.r > 22) return d.data.label;
            if (d.r > 16) return d.value.toLocaleString();
            return "";
        });

    node.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "1.3em")
        .attr("fill", (d) => contrastFill(color(d.data.label)))
        .style("font-size", "11px")
        .style("font-weight", "600")
        .style("pointer-events", "none")
        .text((d) => (d.r > 22 ? d.value.toLocaleString() : ""));
}

function createStackedBarChart(containerId, data, options = {}) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!data.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const groupFn = options.groupFn || ((row) => displayValue(row.CompanyOPEN));
    const keyFn = options.keyFn || ((row) => row.reportYear);
    const preferred = options.keyOrder || YEAR_ORDER;
    const colorRange = options.colorRange || ["#008cff", "#a54cff", "#ff8700", "#00dc00", "#e6284b"];
    const presentKeys = uniqueSorted(data.map(keyFn));
    const keys = preferred.filter((key) => presentKeys.includes(key))
        .concat(presentKeys.filter((key) => !preferred.includes(key)));

    let rows = Array.from(
        d3.rollup(data, (values) => values.length, groupFn, keyFn),
        ([group, keyMap]) => {
            const item = { group };
            keys.forEach((key) => {
                item[key] = keyMap.get(key) || 0;
            });
            return item;
        }
    );

    if (options.groupOrder) {
        const order = new Map(options.groupOrder.map((name, index) => [name, index]));
        rows.sort((a, b) => (order.has(a.group) ? order.get(a.group) : 99) - (order.has(b.group) ? order.get(b.group) : 99));
    } else {
        rows.sort((a, b) => d3.sum(keys, (key) => b[key]) - d3.sum(keys, (key) => a[key]));
    }

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 28, right: 16, bottom: 88, left: 48 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(options.height || 280);
    const stacked = d3.stack().keys(keys)(rows);
    const color = d3.scaleOrdinal().domain(keys).range(colorRange);

    const x = d3.scaleBand()
        .domain(rows.map((row) => row.group))
        .range([0, width])
        .padding(0.22);

    const y = d3.scaleLinear()
        .domain([0, d3.max(rows, (row) => d3.sum(keys, (key) => row[key])) || 1])
        .nice()
        .range([height, 0]);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    addYGrid(chart, y, width, 5);

    chart.selectAll("g.stack")
        .data(stacked)
        .enter()
        .append("g")
        .attr("fill", (d) => color(d.key))
        .selectAll("rect")
        .data((d) => d.map((item) => ({ ...item, key: d.key })))
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.data.group))
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])))
        .attr("width", x.bandwidth())
        .attr("rx", 2)
        .style("fill", (d) => color(d.key))
        .on("mouseover", (event, d) => {
            const value = d[1] - d[0];
            showTooltip(
                event,
                `<strong>${d.data.group}</strong><br>${d.key}: ${value.toLocaleString()}`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    const segments = stacked.flatMap((layer) => layer.map((item) => ({ ...item, key: layer.key })));

    chart.selectAll(".stack-value")
        .data(segments)
        .enter()
        .append("text")
        .attr("class", "chart-value")
        .attr("x", (d) => x(d.data.group) + x.bandwidth() / 2)
        .attr("y", (d) => (y(d[0]) + y(d[1])) / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", (d) => contrastFill(color(d.key)))
        .text((d) => {
            const value = d[1] - d[0];
            const barHeight = y(d[0]) - y(d[1]);
            return value && barHeight >= 18 ? value.toLocaleString() : "";
        });

    chart.selectAll(".stack-total")
        .data(rows)
        .enter()
        .append("text")
        .attr("class", "chart-value")
        .attr("x", (d) => x(d.group) + x.bandwidth() / 2)
        .attr("y", (d) => y(d3.sum(keys, (key) => d[key])) - 6)
        .attr("text-anchor", "middle")
        .text((d) => {
            const total = d3.sum(keys, (key) => d[key]);
            return total ? total.toLocaleString() : "";
        });

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0))
        .selectAll("text")
        .attr("transform", "rotate(-25)")
        .style("text-anchor", "end");

    chart.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")).tickSizeOuter(0));

    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left},${height + margin.top + 52})`);

    keys.forEach((key, index) => {
        const item = legend.append("g").attr("transform", `translate(${index * 110}, 0)`);
        item.append("rect").attr("width", 12).attr("height", 12).attr("fill", color(key)).attr("rx", 2);
        item.append("text").attr("x", 18).attr("y", 10).style("font-size", "12px").text(key);
    });
}

function createHorizontalStackedBarChart(containerId, data, options = {}) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!data.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const groupFn = options.groupFn || ((row) => row.regionGroup);
    const keyFn = options.keyFn || csiCategory;
    const preferredKeys = options.keyOrder || ["Good", "Average", "Bad"];
    const colorRange = options.colorRange || ["#00dc00", "#ff8700", "#e6284b"];
    const presentKeys = uniqueSorted(data.map(keyFn));
    const keys = preferredKeys.filter((key) => presentKeys.includes(key));
    const valueLabel = options.valueLabel || "answers";
    const maxGroups = options.maxGroups || 16;

    let rows = Array.from(
        d3.rollup(data, (values) => values.length, groupFn, keyFn),
        ([group, keyMap]) => {
            const item = { group };
            keys.forEach((key) => {
                item[key] = keyMap.get(key) || 0;
            });
            return item;
        }
    ).filter((row) => d3.sum(keys, (key) => row[key]) > 0);

    rows.sort((a, b) => d3.sum(keys, (key) => b[key]) - d3.sum(keys, (key) => a[key]));

    if (rows.length > maxGroups) {
        const kept = rows.slice(0, maxGroups);
        const rest = rows.slice(maxGroups);
        const other = { group: "Other" };
        keys.forEach((key) => {
            other[key] = d3.sum(rest, (row) => row[key]);
        });
        rows = kept.concat(other);
    }

    if (!rows.length || !keys.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const longest = d3.max(rows, (row) => String(row.group).length) || 8;
    const containerWidth = container.clientWidth || 720;
    const margin = {
        top: 36,
        right: 56,
        bottom: 36,
        left: Math.min(140, Math.max(88, longest * 7.2))
    };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const barHeight = options.barHeight || 28;
    const height = Math.max(rows.length * barHeight, 80);
    const stacked = d3.stack().keys(keys)(rows);
    const color = d3.scaleOrdinal().domain(keys).range(colorRange);
    const maxTotal = d3.max(rows, (row) => d3.sum(keys, (key) => row[key])) || 1;

    const y = d3.scaleBand()
        .domain(rows.map((row) => row.group))
        .range([0, height])
        .padding(0.32);

    const x = d3.scaleLinear()
        .domain([0, maxTotal])
        .nice()
        .range([0, width]);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left}, 10)`);

    keys.forEach((key, index) => {
        const item = legend.append("g").attr("transform", `translate(${index * 96}, 0)`);
        item.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(key));
        item.append("text")
            .attr("x", 16)
            .attr("y", 9)
            .attr("fill", "#6b5a6b")
            .style("font-size", "12px")
            .text(key);
    });

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    addXGrid(chart, x, height, 6);

    chart.selectAll("g.stack")
        .data(stacked)
        .enter()
        .append("g")
        .attr("fill", (d) => color(d.key))
        .selectAll("rect")
        .data((layer) => layer.map((item) => ({ ...item, key: layer.key })))
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d[0]))
        .attr("y", (d) => y(d.data.group))
        .attr("width", (d) => Math.max(0, x(d[1]) - x(d[0])))
        .attr("height", y.bandwidth())
        .attr("rx", 2)
        .attr("fill", (d) => color(d.key))
        .style("fill", (d) => color(d.key))
        .style("cursor", filters.region ? "pointer" : "default")
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("opacity", 0.82);
            const value = d[1] - d[0];
            const total = d3.sum(keys, (key) => d.data[key]);
            const share = total ? Math.round((value / total) * 100) : 0;
            showTooltip(
                event,
                `<strong>${d.data.group}</strong><br>${d.key}: ${value.toLocaleString()} (${share}%)<br>Total: ${total.toLocaleString()}`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("opacity", 1);
            hideTooltip();
        })
        .on("click", (event, d) => {
            if (!filters.region || d.data.group === "Other") return;
            filters.region.value = d.data.group;
            resetToFirstPage();
        });

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain")
        .remove();

    const xAxis = chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6).tickFormat(d3.format(",d")).tickSizeOuter(0));

    xAxis.append("text")
        .attr("x", width + 8)
        .attr("y", 18)
        .attr("fill", "#6b5a6b")
        .attr("text-anchor", "start")
        .style("font-size", "11px")
        .text(valueLabel);
}

function createGroupedBarChart(containerId, data, options = {}) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!data.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const groupFn = options.groupFn || ((row) => row.reportYear);
    const keyFn = options.keyFn || csiCategory;
    const preferredKeys = options.keyOrder || ["Good", "Average", "Bad"];
    const colorRange = options.colorRange || ["#00dc00", "#ff8700", "#e6284b"];
    const presentKeys = uniqueSorted(data.map(keyFn));
    const keys = preferredKeys.filter((key) => presentKeys.includes(key));
    const preferredGroups = options.groupOrder || YEAR_ORDER.filter((year) => year !== MISSING);
    const presentGroups = uniqueSorted(data.map(groupFn));
    const groups = preferredGroups.filter((group) => presentGroups.includes(group))
        .concat(presentGroups.filter((group) => !preferredGroups.includes(group) && group !== MISSING));

    const rows = groups.map((group) => {
        const item = { group };
        keys.forEach((key) => {
            item[key] = 0;
        });
        return item;
    });
    const rowMap = new Map(rows.map((row) => [row.group, row]));

    data.forEach((row) => {
        const group = groupFn(row);
        const key = keyFn(row);
        const target = rowMap.get(group);
        if (target && Object.prototype.hasOwnProperty.call(target, key)) {
            target[key] += 1;
        }
    });

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 40, right: 16, bottom: 36, left: 44 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(options.height || 280);
    const color = d3.scaleOrdinal().domain(keys).range(colorRange);

    const x0 = d3.scaleBand()
        .domain(groups)
        .range([0, width])
        .paddingInner(0.28)
        .paddingOuter(0.08);

    const x1 = d3.scaleBand()
        .domain(keys)
        .range([0, x0.bandwidth()])
        .padding(0.12);

    const y = d3.scaleLinear()
        .domain([0, d3.max(rows, (row) => d3.max(keys, (key) => row[key])) || 1])
        .nice()
        .range([height, 0]);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left}, 8)`);

    keys.forEach((key, index) => {
        const item = legend.append("g").attr("transform", `translate(${index * 92}, 0)`);
        item.append("rect")
            .attr("width", 10)
            .attr("height", 10)
            .attr("rx", 2)
            .attr("fill", color(key));
        item.append("text")
            .attr("x", 16)
            .attr("y", 9)
            .attr("fill", "#6b5a6b")
            .style("font-size", "12px")
            .text(key);
    });

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    addYGrid(chart, y, width, 5);

    chart.selectAll("g.year-group")
        .data(rows)
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${x0(d.group)},0)`)
        .selectAll("rect")
        .data((d) => keys.map((key) => ({ group: d.group, key, value: d[key] })))
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x1(d.key))
        .attr("y", (d) => y(d.value))
        .attr("width", x1.bandwidth())
        .attr("height", (d) => Math.max(0, height - y(d.value)))
        .attr("rx", 2)
        .attr("fill", (d) => color(d.key))
        .style("fill", (d) => color(d.key))
        .on("mouseover", (event, d) => {
            d3.select(event.currentTarget).attr("opacity", 0.8);
            showTooltip(event, `<strong>${d.group}</strong><br>${d.key}: ${d.value.toLocaleString()}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", (event) => {
            d3.select(event.currentTarget).attr("opacity", 1);
            hideTooltip();
        });

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x0).tickSizeOuter(0));

    chart.append("g")
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")).tickSizeOuter(0));
}

function createRadarChart(containerId, chartData, maxValue = 100) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (chartData.length < 3) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const size = Math.min(Math.max(container.clientWidth || 420, 320), 520);
    const levels = 4;
    const radius = size / 2 - 48;
    const angle = (Math.PI * 2) / chartData.length;
    const center = size / 2;

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", size)
        .attr("height", size);

    const chart = svg.append("g")
        .attr("transform", `translate(${center},${center})`);

    d3.range(1, levels + 1).forEach((level) => {
        const r = (radius * level) / levels;
        chart.append("circle")
            .attr("class", "radar-level")
            .attr("r", r);
        chart.append("text")
            .attr("x", 4)
            .attr("y", -r + 3)
            .attr("fill", "#999")
            .style("font-size", "10px")
            .text(Math.round((maxValue * level) / levels));
    });

    chartData.forEach((item, index) => {
        const theta = index * angle - Math.PI / 2;
        chart.append("line")
            .attr("class", "radar-axis")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", Math.cos(theta) * radius)
            .attr("y2", Math.sin(theta) * radius);

        const labelR = radius + 22;
        chart.append("text")
            .attr("class", "radar-label")
            .attr("x", Math.cos(theta) * labelR)
            .attr("y", Math.sin(theta) * labelR)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(item.label);
    });

    const line = d3.lineRadial()
        .radius((d) => (d.count / maxValue) * radius)
        .angle((d, index) => index * angle)
        .curve(d3.curveLinearClosed);

    const radialPoints = chartData.map((item, index) => ({
        ...item,
        angle: index * angle
    }));

    chart.append("path")
        .datum(radialPoints)
        .attr("class", "radar-area")
        .attr("d", line);

    radialPoints.forEach((item, index) => {
        const theta = index * angle - Math.PI / 2;
        const r = (item.count / maxValue) * radius;
        const cx = Math.cos(theta) * r;
        const cy = Math.sin(theta) * r;
        chart.append("circle")
            .attr("cx", cx)
            .attr("cy", cy)
            .attr("r", 4)
            .attr("fill", "#a54cff")
            .on("mouseover", (event) => {
                showTooltip(event, `<strong>${item.label}</strong><br>Average: ${item.count}`);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", `${event.pageX + 12}px`)
                    .style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", hideTooltip);

        const labelR = Math.min(r + 16, radius - 8);
        chart.append("text")
            .attr("class", "chart-value radar-value")
            .attr("x", Math.cos(theta) * labelR)
            .attr("y", Math.sin(theta) * labelR)
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(item.count);
    });
}

function createScatterChart(containerId, points) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!points.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const cells = Array.from(
        d3.rollup(
            points,
            (values) => values.length,
            (d) => Math.round(d.x),
            (d) => Math.round(d.y)
        ),
        ([csi, recommendMap]) => Array.from(recommendMap, ([recommend, count]) => ({
            x: csi,
            y: recommend,
            count
        }))
    ).flat();

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 40, right: 28, bottom: 52, left: 56 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(360);
    const maxCount = d3.max(cells, (d) => d.count) || 1;
    const radius = d3.scaleSqrt().domain([1, maxCount]).range([12, 24]);
    const avgCsi = d3.mean(points, (d) => d.x);
    const avgRecommend = d3.mean(points, (d) => d.y);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear().domain([0, 10]).range([28, width - 28]);
    const y = d3.scaleLinear().domain([0, 10]).range([height - 28, 28]);

    addYGrid(chart, y, width, 11);

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(11).tickFormat(d3.format("d")).tickSizeOuter(0));

    chart.append("g")
        .call(d3.axisLeft(y).ticks(11).tickFormat(d3.format("d")).tickSizeOuter(0));

    chart.append("text")
        .attr("x", width / 2)
        .attr("y", height + 36)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b5a6b")
        .style("font-size", "12px")
        .text("Overall CSI");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -36)
        .attr("text-anchor", "middle")
        .attr("fill", "#6b5a6b")
        .style("font-size", "12px")
        .text("Would recommend");

    if (avgCsi != null && avgRecommend != null) {
        chart.append("line")
            .attr("class", "scatter-mean")
            .attr("x1", x(avgCsi))
            .attr("x2", x(avgCsi))
            .attr("y1", 0)
            .attr("y2", height);
        chart.append("line")
            .attr("class", "scatter-mean")
            .attr("x1", 0)
            .attr("x2", width)
            .attr("y1", y(avgRecommend))
            .attr("y2", y(avgRecommend));
    }

    const bubbles = chart.selectAll(".scatter-cell")
        .data(cells.sort((a, b) => b.count - a.count))
        .enter()
        .append("g")
        .attr("class", "scatter-cell")
        .attr("transform", (d) => `translate(${x(d.x)},${y(d.y)})`);

    bubbles.append("circle")
        .attr("class", "scatter-point")
        .attr("r", (d) => radius(d.count))
        .style("fill", (d) => scoreBandColor(d.x))
        .style("fill-opacity", 0.78)
        .on("mouseover", (event, d) => {
            showTooltip(
                event,
                `<strong>CSI ${d.x} · Recommend ${d.y}</strong><br>${d.count.toLocaleString()} answers`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    bubbles.append("text")
        .attr("class", "chart-value")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", (d) => contrastFill(scoreBandColor(d.x)))
        .text((d) => d.count.toLocaleString());

    chart.append("text")
        .attr("class", "chart-value")
        .attr("x", 8)
        .attr("y", 4)
        .attr("text-anchor", "start")
        .text(
            avgCsi == null
                ? `${points.length.toLocaleString()} answers`
                : `${points.length.toLocaleString()} answers · avg CSI ${avgCsi.toFixed(1)} · avg recommend ${avgRecommend.toFixed(1)}`
        );
}

function createHeatmapChart(containerId, data, rowFn, colFn, colOrder) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!data.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const nested = d3.rollup(data, (values) => values.length, rowFn, colFn);
    const rowTotals = Array.from(nested, ([row, cols]) => ({
        row,
        total: d3.sum(cols.values())
    })).sort((a, b) => b.total - a.total);

    const rows = rowTotals.map((item) => item.row);
    const cols = (colOrder || uniqueSorted(data.map(colFn)))
        .filter((col) => Array.from(nested.values()).some((map) => map.has(col)));

    const cells = [];
    rows.forEach((row) => {
        cols.forEach((col) => {
            cells.push({
                row,
                col,
                count: nested.get(row)?.get(col) || 0
            });
        });
    });

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 36, right: 24, bottom: 16, left: 130 };
    const width = Math.max(containerWidth - margin.left - margin.right, 240);
    const height = Math.max(rows.length * 34, 120);

    const x = d3.scaleBand().domain(cols).range([0, width]).padding(0.08);
    const y = d3.scaleBand().domain(rows).range([0, height]).padding(0.08);
    const maxCount = d3.max(cells, (d) => d.count) || 1;
    const color = d3.scaleSequential(d3.interpolateRgb("#dcff3c", "#321432"))
        .domain([0, maxCount]);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart.selectAll("rect")
        .data(cells)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", (d) => x(d.col))
        .attr("y", (d) => y(d.row))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("fill", (d) => (d.count ? color(d.count) : "#f7f7f2"))
        .on("mouseover", (event, d) => {
            showTooltip(event, `<strong>${d.row}</strong><br>${d.col}: ${d.count.toLocaleString()}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    chart.selectAll(".heatmap-count")
        .data(cells.filter((d) => d.count))
        .enter()
        .append("text")
        .attr("class", "heatmap-label")
        .attr("x", (d) => x(d.col) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.row) + y.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", (d) => (d.count / maxCount > 0.55 ? "#fff" : "#321432"))
        .text((d) => d.count.toLocaleString());

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain")
        .remove();

    chart.append("g")
        .attr("transform", "translate(0,-4)")
        .call(d3.axisTop(x).tickSize(0))
        .select(".domain")
        .remove();
}

function createComboTrendChart(containerId, chartData) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 28, right: 56, bottom: 48, left: 48 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(300);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleTime()
        .domain(d3.extent(chartData, (d) => d.date))
        .range([0, width]);

    const yCount = d3.scaleLinear()
        .domain([0, d3.max(chartData, (d) => d.count) || 1])
        .nice()
        .range([height, 0]);

    const yCsi = d3.scaleLinear()
        .domain([0, 10])
        .range([height, 0]);

    addYGrid(chart, yCount, width, 5);

    const area = d3.area()
        .x((d) => x(d.date))
        .y0(height)
        .y1((d) => yCount(d.count))
        .curve(d3.curveMonotoneX);

    const line = d3.line()
        .defined((d) => d.csi != null)
        .x((d) => x(d.date))
        .y((d) => yCsi(d.csi))
        .curve(d3.curveMonotoneX);

    chart.append("path")
        .datum(chartData)
        .attr("class", "area")
        .attr("d", area);

    chart.append("path")
        .datum(chartData)
        .attr("class", "line-secondary")
        .attr("d", line);

    chart.selectAll(".point")
        .data(chartData)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => yCount(d.count))
        .attr("r", 5)
        .on("mouseover", (event, d) => {
            const csi = d.csi == null ? "—" : d.csi.toFixed(1);
            showTooltip(
                event,
                `<strong>${d3.timeFormat("%Y")(d.date)}</strong><br>Answers: ${d.count.toLocaleString()}<br>Avg CSI: ${csi}`
            );
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    chart.selectAll(".csi-point")
        .data(chartData.filter((d) => d.csi != null))
        .enter()
        .append("circle")
        .attr("class", "csi-point")
        .attr("cx", (d) => x(d.date))
        .attr("cy", (d) => yCsi(d.csi))
        .attr("r", 4)
        .attr("fill", "#ff8700");

    chart.selectAll(".point-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "chart-value")
        .attr("x", (d) => x(d.date))
        .attr("y", (d) => yCount(d.count) - 10)
        .attr("text-anchor", "middle")
        .text((d) => d.count.toLocaleString());

    chart.selectAll(".csi-label")
        .data(chartData.filter((d) => d.csi != null))
        .enter()
        .append("text")
        .attr("class", "chart-value csi-label")
        .attr("x", (d) => x(d.date))
        .attr("y", (d) => yCsi(d.csi) + 16)
        .attr("text-anchor", "middle")
        .text((d) => d.csi.toFixed(1));

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(Math.min(chartData.length, 8)).tickFormat(d3.timeFormat("%Y")).tickSizeOuter(0));

    chart.append("g")
        .call(d3.axisLeft(yCount).ticks(5).tickFormat(d3.format("d")).tickSizeOuter(0));

    chart.append("g")
        .attr("transform", `translate(${width},0)`)
        .call(d3.axisRight(yCsi).ticks(5).tickSizeOuter(0));

    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left},${8})`);

    legend.append("rect").attr("width", 12).attr("height", 12).attr("fill", "#a54cff").attr("opacity", 0.4).attr("rx", 2);
    legend.append("text").attr("x", 18).attr("y", 10).style("font-size", "12px").text("Answers");
    legend.append("rect").attr("x", 90).attr("width", 12).attr("height", 3).attr("y", 5).attr("fill", "#ff8700");
    legend.append("text").attr("x", 108).attr("y", 10).style("font-size", "12px").text("Avg CSI");
}

function createValueHeatmap(containerId, cells, options = {}) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);
    if (!cells.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const rows = uniqueSorted(cells.map((d) => d.row));
    const cols = options.colOrder || uniqueSorted(cells.map((d) => d.col));
    const lookup = d3.rollup(cells, (values) => values[0].value, (d) => d.row, (d) => d.col);
    const grid = [];
    rows.forEach((row) => {
        cols.forEach((col) => {
            const value = lookup.get(row)?.get(col);
            grid.push({ row, col, value: value == null ? null : value });
        });
    });

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 36, right: 24, bottom: 16, left: options.left || 150 };
    const width = Math.max(containerWidth - margin.left - margin.right, 240);
    const height = Math.max(rows.length * 28, 120);
    const values = grid.map((d) => d.value).filter((value) => value != null);
    const x = d3.scaleBand().domain(cols).range([0, width]).padding(0.08);
    const y = d3.scaleBand().domain(rows).range([0, height]).padding(0.08);
    const color = d3.scaleSequential(d3.interpolateRgb("#dcff3c", "#321432"))
        .domain([d3.min(values) ?? 0, d3.max(values) ?? 1]);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    chart.selectAll("rect")
        .data(grid)
        .enter()
        .append("rect")
        .attr("class", "heatmap-cell")
        .attr("x", (d) => x(d.col))
        .attr("y", (d) => y(d.row))
        .attr("width", x.bandwidth())
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("fill", (d) => (d.value == null ? "#f7f7f2" : color(d.value)))
        .on("mouseover", (event, d) => {
            const text = d.value == null ? "n/a" : Number(d.value).toFixed(3);
            showTooltip(event, `<strong>${d.row}</strong><br>${d.col}: ${text}`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip);

    chart.selectAll(".heatmap-count")
        .data(grid.filter((d) => d.value != null && x.bandwidth() > 36))
        .enter()
        .append("text")
        .attr("class", "heatmap-label")
        .attr("x", (d) => x(d.col) + x.bandwidth() / 2)
        .attr("y", (d) => y(d.row) + y.bandwidth() / 2)
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("fill", (d) => contrastFill(color(d.value)))
        .text((d) => Number(d.value).toFixed(2));

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(0).tickPadding(8))
        .select(".domain")
        .remove();

    chart.append("g")
        .call(d3.axisTop(x).tickSize(0).tickPadding(8))
        .select(".domain")
        .remove();
}

function createMultiLineChart(containerId, series, valueLabel) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);
    const points = series.flatMap((item) => item.values);
    if (!points.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 720;
    const margin = { top: 28, right: 24, bottom: 48, left: 48 };
    const width = Math.max(containerWidth - margin.left - margin.right, 280);
    const height = scaleChartHeight(320);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 28);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scalePoint()
        .domain(uniqueSorted(points.map((d) => d.year)))
        .range([0, width])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(points, (d) => d.value) || 1])
        .nice()
        .range([height, 0]);

    addYGrid(chart, y, width, 5);

    series.forEach((item, index) => {
        const color = hubexoFill(index);
        const line = d3.line()
            .x((d) => x(d.year))
            .y((d) => y(d.value))
            .curve(d3.curveMonotoneX);

        chart.append("path")
            .datum(item.values)
            .attr("fill", "none")
            .attr("stroke", color)
            .attr("stroke-width", 2)
            .attr("d", line);

        chart.selectAll(`.point-${index}`)
            .data(item.values)
            .enter()
            .append("circle")
            .attr("cx", (d) => x(d.year))
            .attr("cy", (d) => y(d.value))
            .attr("r", 4)
            .attr("fill", color)
            .on("mouseover", (event, d) => {
                showTooltip(event, `<strong>${item.label}</strong><br>${d.year}: ${d.value.toFixed(1)} ${valueLabel}`);
            })
            .on("mousemove", (event) => {
                tooltip.style("left", `${event.pageX + 12}px`).style("top", `${event.pageY - 28}px`);
            })
            .on("mouseout", hideTooltip);
    });

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickSizeOuter(0));

    chart.append("g")
        .call(d3.axisLeft(y).ticks(5).tickSizeOuter(0));

    const legend = svg.append("g")
        .attr("transform", `translate(${margin.left},${height + margin.top + 28})`);

    series.forEach((item, index) => {
        const g = legend.append("g").attr("transform", `translate(${index * 108},0)`);
        g.append("rect").attr("width", 10).attr("height", 10).attr("fill", hubexoFill(index)).attr("rx", 2);
        g.append("text").attr("x", 16).attr("y", 10).style("font-size", "11px").text(item.label);
    });
}

function weightHeatmapCells(table, years) {
    return (table || []).flatMap((item) => years.map((year) => ({
        row: item.label || item.question,
        col: String(year),
        value: item[String(year)]
    })).filter((d) => d.value != null));
}

function factorTrendSeries(data) {
    const years = uniqueSorted(data.map((row) => row.reportYear)).filter((year) => year !== MISSING);
    return NKI_FACTORS.filter(([field]) => field !== "IfactorOPEN_csi" && field !== "IfactorOPEN_loyalty").map(([field, label]) => ({
        label,
        values: years.map((year) => {
            const average = meanScore(data.filter((row) => row.reportYear === year), field);
            return average == null ? null : { year, value: Number(average.toFixed(1)) };
        }).filter(Boolean)
    })).filter((item) => item.values.length);
}

function yearCsiTrend(data) {
    return Array.from(
        d3.rollup(
            data.filter((row) => row.reportYear !== MISSING),
            (values) => ({
                count: values.length,
                csi: d3.mean(values.map((row) => scoreValue(row.IfactorOPEN_csi)).filter((value) => value !== null))
            }),
            (row) => row.reportYear
        ),
        ([year, stats]) => ({
            date: new Date(`${year}-01-01`),
            count: stats.count,
            csi: Number.isFinite(stats.csi) ? stats.csi : null
        })
    ).sort((a, b) => a.date - b.date);
}

function createScaleBarChart(containerId, chartData, valueLabel, maxValue, onSelect) {
    if (!clearChart(containerId)) return;

    const container = document.getElementById(containerId);

    if (!chartData.length) {
        container.innerHTML = `<p class="empty-state">No data for the current filters.</p>`;
        return;
    }

    const containerWidth = container.clientWidth || 480;
    const longest = d3.max(chartData, (d) => String(d.label).length) || 8;
    const margin = { top: 8, right: 48, bottom: 24, left: Math.min(240, Math.max(130, longest * 7.2)) };
    const width = Math.max(containerWidth - margin.left - margin.right, 220);
    const height = Math.max(chartData.length * 32, 80);

    const svg = d3.select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand()
        .domain(chartData.map((d) => d.label))
        .range([0, height])
        .padding(0.28);

    const x = d3.scaleLinear()
        .domain([0, maxValue || d3.max(chartData, (d) => d.count) || 1])
        .range([0, width]);

    chart.selectAll(".bar")
        .data(chartData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", (d) => y(d.label))
        .attr("width", (d) => x(d.count))
        .attr("height", y.bandwidth())
        .attr("rx", 3)
        .attr("fill", (d, index) => hubexoFill(index))
        .style("fill", (d, index) => hubexoFill(index))
        .on("mouseover", (event, d) => {
            showTooltip(event, `<strong>${d.label}</strong><br>${valueLabel}: ${d.count.toLocaleString()}`);
        })
        .on("mousemove", (event) => {
            tooltip
                .style("left", `${event.pageX + 12}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", hideTooltip)
        .on("click", (event, d) => {
            if (typeof onSelect === "function") {
                onSelect(d.label);
            } else if (containerId === "top-hierarchy-chart" && filters.hierarchy) {
                filters.hierarchy.value = d.label;
                resetToFirstPage();
            }
        });

    chart.append("g")
        .call(d3.axisLeft(y).tickSize(0))
        .select(".domain")
        .remove();

    chart.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(5));

    chart.selectAll(".coverage-label")
        .data(chartData)
        .enter()
        .append("text")
        .attr("class", "coverage-label")
        .attr("x", (d) => x(d.count) + 6)
        .attr("y", (d) => y(d.label) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .text((d) => d.count.toLocaleString());
}

function labeledRollup(data, field, labels) {
    return rollupCounts(
        data.filter((row) => isFilled(row[field])).map((row) => ({
            label: labels[row[field]] || displayValue(row[field])
        })),
        "label"
    );
}

function companyCsiLinks(data) {
    const rows = data.filter((row) => isFilled(row.CompanyOPEN) && isFilled(row.CSIcat3levelsG));
    const pairCounts = d3.rollup(
        rows,
        (values) => values.length,
        (row) => row.CompanyOPEN,
        (row) => CSI_LABELS[row.CSIcat3levelsG] || row.CSIcat3levelsG
    );

    const links = [];
    pairCounts.forEach((targets, source) => {
        targets.forEach((value, target) => {
            links.push({ source, target, value });
        });
    });

    return links;
}

function hierarchyCsiLinks(data) {
    const rows = data.filter((row) => isFilled(row.hier) && isFilled(row.CSIcat3levelsG));
    const pairCounts = d3.rollup(
        rows,
        (values) => values.length,
        (row) => displayValue(row.hier),
        (row) => CSI_LABELS[row.CSIcat3levelsG] || row.CSIcat3levelsG
    );

    const links = [];
    pairCounts.forEach((targets, source) => {
        targets.forEach((value, target) => {
            links.push({ source, target, value });
        });
    });

    return links;
}

function nkiFactorScores(data) {
    return NKI_FACTORS.map(([field, label]) => {
        const average = meanScore(data, field);
        return average == null ? null : { label, count: Number(average.toFixed(1)) };
    }).filter(Boolean);
}

function scoreDistribution(data, field) {
    const counts = d3.rollup(
        data.map((row) => scoreValue(row[field])).filter((value) => value !== null && value >= 1 && value <= 10),
        (values) => values.length,
        (value) => Math.round(value)
    );

    return d3.range(1, 11).map((score) => ({
        label: String(score),
        count: counts.get(score) || 0
    }));
}

function sendoutCsiTrend(data) {
    return Array.from(
        d3.rollup(
            data.filter((row) => parseSendout(row.Sendout)),
            (values) => ({
                count: values.length,
                csi: d3.mean(values.map((row) => scoreValue(row.CSIoverall_CSIoa)).filter((value) => value !== null))
            }),
            (row) => d3.timeFormat("%Y-%m")(parseSendout(row.Sendout))
        ),
        ([key, stats]) => ({
            date: new Date(`${key}-01`),
            count: stats.count,
            csi: Number.isFinite(stats.csi) ? stats.csi : null
        })
    ).sort((a, b) => a.date - b.date);
}

function csiLoyaltyPoints(data) {
    return data.map((row) => {
        const x = scoreValue(row.CSIoverall_CSIoa);
        const y = scoreValue(row.loyaltyrec_loyrec);
        if (x == null || y == null) return null;
        return { x, y, company: displayValue(row.CompanyOPEN) };
    }).filter(Boolean);
}

function updateSurveyKpis(data) {
    const csi = meanScore(data, "CSIoverall_CSIoa");
    const loyalty = meanScore(data, "loyaltyrec_loyrec");
    const good = data.filter((row) => row.CSIcat3levelsG === "good").length;
    const totalEl = document.getElementById("kpi-survey-total");
    if (!totalEl) return;

    totalEl.textContent = data.length.toLocaleString();
    const completeEl = document.getElementById("kpi-survey-complete");
    if (completeEl) {
        completeEl.textContent = data.length ? `${Math.round((good / data.length) * 100)}%` : "—";
    }
    const csiEl = document.getElementById("kpi-survey-csi");
    if (csiEl) csiEl.textContent = csi == null ? "—" : csi.toFixed(1);
    const loyaltyEl = document.getElementById("kpi-survey-loyalty");
    if (loyaltyEl) loyaltyEl.textContent = loyalty == null ? "—" : loyalty.toFixed(1);
    const factorCsi = meanScore(data, "IfactorOPEN_csi");
    const coverageEl = document.getElementById("kpi-coverage");
    if (coverageEl) coverageEl.textContent = factorCsi == null ? "—" : factorCsi.toFixed(1);

    const label = document.getElementById("record-count-label");
    if (label) {
        label.textContent = COMPANY_NAME
            ? `${COMPANY_NAME} · ${data.length.toLocaleString()} answers`
            : `${data.length.toLocaleString()} answers`;
    }
}

function renderSurveyCharts(data) {
    const companies = rollupCounts(data.map((row) => ({ label: displayValue(row.CompanyOPEN) })), "label").slice(0, 20);
    const factors = nkiFactorScores(data);
    const topCompanySet = new Set(companies.map((item) => item.label));
    const csiStack = {
        groupFn: (row) => displayValue(row.CompanyOPEN),
        keyFn: csiCategory,
        keyOrder: ["Good", "Average", "Bad", MISSING],
        colorRange: ["#00dc00", "#ff8700", "#e6284b", "#c8d2d2"],
        height: 340
    };

    updateSurveyKpis(data);
    createDonutChart("survey-csi-cat-chart", labeledRollup(data, "CSIcat3levelsG", CSI_LABELS), "ratings", CSI_COLORS);
    createDonutChart("survey-device-chart", rollupCounts(data.map((row) => ({ label: deviceLabel(row) })), "label"), "answers", {
        Mobile: "#008cff",
        Desktop: "#a54cff",
        Tablet: "#ff8700",
        Unknown: "#c8d2d2"
    });
    createStackedBarChart(
        "survey-company-csi",
        data.filter((row) => topCompanySet.has(displayValue(row.CompanyOPEN))),
        csiStack
    );
    createTreemapChart(
        "survey-hierarchy-chart",
        rollupCounts(data.map((row) => ({ label: displayValue(row.hier) })), "label").slice(0, 80),
        560
    );
    createBarChart("survey-csi-score-chart", scoreDistribution(data, "CSIoverall_CSIoa"), "Answers", {
        height: 320,
        colorFn: (d) => scoreBandColor(Number(d.label))
    });
    createBarChart("survey-loyalty-chart", scoreDistribution(data, "loyaltyrec_loyrec"), "Answers", {
        height: 320,
        colorFn: (d) => scoreBandColor(Number(d.label))
    });
    createScaleBarChart("survey-factor-chart", factors, "Average", 100);
    createMultiLineChart("survey-factor-trend", factorTrendSeries(data), "0–100");
    createValueHeatmap(
        "survey-weight-heatmap",
        weightHeatmapCells(nkiMeta.questionWeights, YEAR_ORDER.filter((year) => year !== MISSING)),
        { colOrder: YEAR_ORDER.filter((year) => year !== MISSING), left: 170 }
    );
    createValueHeatmap(
        "survey-effect-heatmap",
        (nkiMeta.totalEffectFactors || []).flatMap((item) => YEAR_ORDER.filter((year) => year !== MISSING).map((year) => ({
            row: FACTOR_EFFECT_LABELS[item.factorId] || item.factorId,
            col: year,
            value: item[year]
        })).filter((cell) => cell.value != null)),
        { colOrder: YEAR_ORDER.filter((year) => year !== MISSING), left: 140 }
    );
    createStackedBarChart("survey-age-csi", data, {
        ...csiStack,
        groupFn: (row) => AGE_LABELS[row.agecat] || displayValue(row.agecat),
        groupOrder: Object.values(AGE_LABELS).concat(MISSING),
        height: 300
    });
    createDonutChart("survey-gender-chart", labeledRollup(data, "gender", GENDER_LABELS), "answers", {
        Male: "#008cff",
        Female: "#a54cff",
        "Prefer not to say": "#c8d2d2",
        Other: "#ff8700",
        Unsure: "#321432",
        Unknown: "#c8d2d2"
    });
    createComboTrendChart("survey-sendout-chart", yearCsiTrend(data));
}

function statusClass(status) {
    if (status === "active") return "badge badge-active";
    if (status === MISSING) return "badge badge-unknown";
    return "badge";
}

let currentPage = 1;
let pageSize = 25;
let surveyPage = 1;
let surveyPageSize = 25;

function pageWindow(current, totalPages, span = 2) {
    const pages = [];
    const start = Math.max(1, current - span);
    const end = Math.min(totalPages, current + span);

    if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push("ellipsis-start");
    }

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    if (end < totalPages) {
        if (end < totalPages - 1) pages.push("ellipsis-end");
        pages.push(totalPages);
    }

    return pages;
}

function setPage(page) {
    currentPage = page;
    renderTable(getFilteredRows());
}

function setSurveyPage(page) {
    surveyPage = page;
    renderSurveyAnswersTable(getFilteredSurveyRows());
}

function renderPager(total, options = {}) {
    const pagination = document.getElementById(options.paginationId || "pagination");
    if (!pagination) return;
    const info = document.getElementById(options.infoId || "page-info");
    const buttons = document.getElementById(options.buttonsId || "page-buttons");
    const size = options.pageSize || pageSize;
    const goTo = options.onPage || setPage;
    let page = options.page != null ? options.page : currentPage;
    const totalPages = Math.max(1, Math.ceil(total / size));

    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;

    pagination.hidden = total === 0;

    if (!total) {
        if (info) info.textContent = "";
        if (buttons) buttons.innerHTML = "";
        return;
    }

    const start = (page - 1) * size + 1;
    const end = Math.min(page * size, total);
    if (info) info.textContent = `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`;
    if (!buttons) return;

    buttons.innerHTML = "";

    const prev = document.createElement("button");
    prev.type = "button";
    prev.textContent = "Previous";
    prev.disabled = page <= 1;
    prev.addEventListener("click", () => goTo(page - 1));
    buttons.appendChild(prev);

    pageWindow(page, totalPages).forEach((item) => {
        if (typeof item === "string") {
            const dots = document.createElement("span");
            dots.className = "page-ellipsis";
            dots.textContent = "…";
            buttons.appendChild(dots);
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.textContent = String(item);
        if (item === page) {
            button.classList.add("is-active");
            button.setAttribute("aria-current", "page");
        }
        button.addEventListener("click", () => goTo(item));
        buttons.appendChild(button);
    });

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next";
    next.disabled = page >= totalPages;
    next.addEventListener("click", () => goTo(page + 1));
    buttons.appendChild(next);
}

function renderTable(data) {
    const tbody = document.getElementById("respondents-table");
    if (!tbody) return;
    const count = document.getElementById("table-count");
    const totalPages = Math.max(1, Math.ceil(data.length / pageSize));

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (count) count.textContent = `${data.length.toLocaleString()} matching`;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No respondents match the current filters.</td></tr>`;
        renderPager(0);
        return;
    }

    const start = (currentPage - 1) * pageSize;
    const pageRows = data.slice(start, start + pageSize);

    tbody.innerHTML = pageRows.map((row) => {
        const sizeLabel = SIZE_LABELS[row.size] || displayValue(row.size);

        return `
            <tr>
                <td>${row.respid}</td>
                <td>${displayValue(row.CompanyOPEN)}</td>
                <td>${row.hier}</td>
                <td><span class="badge">${CSI_LABELS[row.CSIcat3levelsG] || displayValue(row.CSIcat3levelsG)}</span></td>
                <td>${row.reportYear}</td>
                <td>${row.regionGroup}</td>
                <td>${sizeLabel}</td>
            </tr>
        `;
    }).join("");

    renderPager(data.length);
}

function surveyScoreText(row, field) {
    const value = scoreValue(row[field]);
    return value == null ? MISSING : String(value);
}

function renderSurveyAnswersTable(data) {
    const tbody = document.getElementById("survey-answers-table");
    if (!tbody) return;

    const count = document.getElementById("survey-table-count");
    const totalPages = Math.max(1, Math.ceil(data.length / surveyPageSize));

    if (surveyPage > totalPages) surveyPage = totalPages;
    if (surveyPage < 1) surveyPage = 1;

    if (count) count.textContent = `${data.length.toLocaleString()} matching`;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="empty-state">No survey answers match the current filters.</td></tr>`;
        renderPager(0, {
            paginationId: "survey-pagination",
            infoId: "survey-page-info",
            buttonsId: "survey-page-buttons",
            page: surveyPage,
            pageSize: surveyPageSize,
            onPage: setSurveyPage
        });
        return;
    }

    const start = (surveyPage - 1) * surveyPageSize;
    const pageRows = data.slice(start, start + surveyPageSize);
    tbody.innerHTML = pageRows.map((row) => `
        <tr>
            <td>${displayValue(row.CompanyOPEN)}</td>
            <td>${displayValue(row.hier)}</td>
            <td>${csiCategory(row)}</td>
            <td>${surveyScoreText(row, "CSIoverall_CSIoa")}</td>
            <td>${surveyScoreText(row, "loyaltyrec_loyrec")}</td>
            <td>${displayValue(row.Reportyear)}</td>
            <td>${deviceLabel(row)}</td>
            <td>${AGE_LABELS[row.agecat] || displayValue(row.agecat)}</td>
            <td>${GENDER_LABELS[row.gender] || displayValue(row.gender)}</td>
        </tr>
    `).join("");

    renderPager(data.length, {
        paginationId: "survey-pagination",
        infoId: "survey-page-info",
        buttonsId: "survey-page-buttons",
        page: surveyPage,
        pageSize: surveyPageSize,
        onPage: setSurveyPage
    });
}

function renderCompanyIndex() {
    const grid = document.getElementById("company-index-grid");
    if (!grid) return;

    grid.innerHTML = companyNames().map((name) => {
        const answers = surveyRows.filter((row) => displayValue(row.CompanyOPEN) === name);
        const hiers = new Set(answers.map((row) => displayValue(row.hier)));
        const people = answers.length;
        const csi = meanScore(answers, "IfactorOPEN_csi");
        return `
            <a class="company-card" href="${companyPageUrl(name)}">
                <div class="company-card-top">
                    <h3>${name}</h3>
                    <span class="company-csi" title="Average CSI">${csi == null ? "—" : csi.toFixed(1)}<small>CSI</small></span>
                </div>
                <p class="company-card-stat">${answers.length.toLocaleString()} answers · ${hiers.size.toLocaleString()} projects</p>
            </a>
        `;
    }).join("");
}

function fillCompanyNav() {
    const nav = document.getElementById("company-nav");
    if (!nav) return;

    const ranked = rollupCounts(surveyRows.map((row) => ({ label: displayValue(row.CompanyOPEN) })), "label")
        .filter((item) => item.label !== MISSING)
        .slice(0, 30)
        .map((item) => item.label);

    const names = COMPANY_NAME && !ranked.includes(COMPANY_NAME)
        ? [COMPANY_NAME, ...ranked]
        : ranked;

    nav.innerHTML = names.map((name) => {
        return `<a href="${companyPageUrl(name)}"${name === COMPANY_NAME ? ' class="is-active"' : ""}>${name}</a>`;
    }).join("");
}

function renderCompanyPage() {
    const index = document.getElementById("company-index");
    const detail = document.getElementById("company-detail");

    if (!COMPANY_NAME) {
        if (index) index.hidden = false;
        if (detail) detail.hidden = true;
        const title = document.getElementById("company-title");
        if (title) title.textContent = "Companies";
        const lead = document.getElementById("company-lead");
        if (lead) lead.textContent = "Select a builder to open survey scores and respondent details.";
        const label = document.getElementById("record-count-label");
        if (label) label.textContent = `${companyNames().length} companies`;
        document.title = "Companies · Hubexo NKI";
        renderCompanyIndex();
        return;
    }

    if (index) index.hidden = true;
    if (detail) detail.hidden = false;

    const title = document.getElementById("company-title");
    if (title) title.textContent = COMPANY_NAME;
    document.title = `${COMPANY_NAME} · Hubexo NKI`;
    const lead = document.getElementById("company-lead");
    if (lead) lead.textContent = "Survey scores and respondent sample for this builder.";

    const survey = getFilteredSurveyRows();

    renderSurveyCharts(survey);
    renderSurveyAnswersTable(survey);
}

function renderDashboard() {
    if (PAGE === "company") {
        renderCompanyPage();
        return;
    }
    if (PAGE === "survey") {
        renderSurveyCharts(getFilteredSurveyRows());
        return;
    }

    const data = getFilteredRows();
    const companies = rollupCounts(data.map((row) => ({ label: displayValue(row.CompanyOPEN) })), "label");
    const topCompanies = companies.slice(0, 12);
    const topSet = new Set(topCompanies.map((item) => item.label));

    updateKpis(data);
    createDonutChart("status-chart", labeledRollup(data, "CSIcat3levelsG", CSI_LABELS), "answers", CSI_COLORS);
    createGroupedBarChart("csi-year-grouped", data, {
        groupFn: (row) => row.reportYear,
        keyFn: csiCategory,
        keyOrder: ["Good", "Average", "Bad"],
        groupOrder: YEAR_ORDER.filter((year) => year !== MISSING),
        colorRange: ["#00dc00", "#ff8700", "#e6284b"],
        height: 280
    });
    createComboTrendChart("sample-csi-trend", yearCsiTrend(data));
    createScaleBarChart("group-chart", companies.slice(0, 18), "Answers", null, (label) => {
        window.location.href = companyPageUrl(label);
    });
    createStackedBarChart("group-year-chart", data.filter((row) => topSet.has(displayValue(row.CompanyOPEN))), {
        groupFn: (row) => displayValue(row.CompanyOPEN),
        keyOrder: YEAR_ORDER,
        colorRange: ["#008cff", "#a54cff", "#ff8700", "#00dc00", "#e6284b", "#321432", "#dcff3c", "#008cff", "#c8d2d2"],
        height: 340
    });
    createTreemapChart("hierarchy-chart", rollupCounts(data, "hier").slice(0, 80), 560);
    createHorizontalStackedBarChart("region-csi-stacked", data, {
        groupFn: (row) => row.regionGroup,
        keyFn: csiCategory,
        keyOrder: ["Good", "Average", "Bad"],
        colorRange: ["#00dc00", "#ff8700", "#e6284b"],
        valueLabel: "answers"
    });
    createDonutChart("created-chart", rollupCounts(data.map((row) => ({ label: row.regionGroup })), "label"), "answers", {
        Stockholm: "#008cff",
        Göteborg: "#a54cff",
        Skåne: "#ff8700",
        West: "#00dc00",
        East: "#e6284b",
        South: "#321432",
        North: "#dcff3c",
        Central: "#008cff",
        Mälardalen: "#a54cff",
        Other: "#ff8700",
        Unknown: "#c8d2d2"
    });
    createHorizontalBarChart("sample-size-chart", labeledRollup(data, "size", SIZE_LABELS), "Answers");
    createBarChart("sample-price-chart", labeledRollup(data, "priceBand", {}), "Answers");
    createDonutChart("sample-family-chart", labeledRollup(data, "familycat2", FAMILY_LABELS), "answers");
    createDonutChart("sample-income-chart", labeledRollup(data, "income3intervall", INCOME_LABELS), "answers");
    renderTable(data);
}

function resetToFirstPage() {
    currentPage = 1;
    surveyPage = 1;
    renderDashboard();
}

function initCompanyContext() {
    if (PAGE !== "company") return;

    COMPANY_NAME = resolveCompanyName(urlCompanyQuery());
    COMPANY_HIERS = new Set(
        surveyRows
            .filter((row) => displayValue(row.CompanyOPEN) === COMPANY_NAME)
            .map((row) => displayValue(row.hier))
    );
}

function initFilters() {
    const companySurvey = PAGE === "company" && COMPANY_NAME
        ? surveyRows.filter((row) => displayValue(row.CompanyOPEN) === COMPANY_NAME)
        : surveyRows;
    const companyRespondents = PAGE === "company" && COMPANY_NAME
        ? rows.filter((row) => displayValue(row.CompanyOPEN) === COMPANY_NAME)
        : rows;

    const hierarchyValues = uniqueSorted(companySurvey.map((row) => displayValue(row.hier)));
    const yearValues = PAGE === "respondents"
        ? uniqueSorted(companyRespondents.map((row) => row.reportYear))
        : uniqueSorted(companySurvey.map((row) => displayValue(row.Reportyear)));

    if (filters.hierarchy && (PAGE === "company" || hierarchyValues.length <= 120)) {
        fillSelect(filters.hierarchy, hierarchyValues);
    }
    if (filters.status) fillSelect(filters.status, uniqueSorted(companyRespondents.map((row) => row.respstatus)));
    if (filters.year) fillSelect(filters.year, yearValues);
    if (filters.group) {
        fillSelect(filters.group, uniqueSorted(companySurvey.map((row) => displayValue(row.CompanyOPEN))));
    }
    if (filters.company) {
        fillSelect(filters.company, uniqueSorted(companySurvey.map((row) => displayValue(row.CompanyOPEN))));
    }
    if (filters.csi) {
        fillSelect(filters.csi, uniqueSorted(companySurvey.map((row) => displayValue(row.CSIcat3levelsG))), CSI_LABELS);
    }
    if (filters.device) {
        fillSelect(filters.device, uniqueSorted(companySurvey.map((row) => deviceLabel(row))));
    }
    if (filters.plot) {
        fillSelect(filters.plot, uniqueSorted(companySurvey.map((row) => displayValue(row.familycat2))), FAMILY_LABELS);
    }
    if (filters.contract) {
        fillSelect(filters.contract, uniqueSorted(companySurvey.map((row) => displayValue(row.income3intervall))), INCOME_LABELS);
    }
    if (filters.age) {
        fillSelect(filters.age, uniqueSorted(companySurvey.map((row) => displayValue(row.agecat))), AGE_LABELS);
    }
    if (filters.gender) {
        fillSelect(filters.gender, uniqueSorted(companySurvey.map((row) => displayValue(row.gender))), GENDER_LABELS);
    }
    if (filters.region) {
        fillSelect(filters.region, uniqueSorted(companySurvey.map((row) => row.regionGroup)));
    }
    if (filters.size) {
        fillSelect(filters.size, uniqueSorted(companySurvey.map((row) => displayValue(row.size))), SIZE_LABELS);
    }
    if (filters.family) {
        fillSelect(filters.family, uniqueSorted(companySurvey.map((row) => displayValue(row.familycat2))), FAMILY_LABELS);
    }
    if (filters.income) {
        fillSelect(filters.income, uniqueSorted(companySurvey.map((row) => displayValue(row.income3intervall))), INCOME_LABELS);
    }
    if (filters.dwelling) {
        fillSelect(filters.dwelling, uniqueSorted(companySurvey.map((row) => displayValue(row.areaINTERVALL))), AREA_LABELS);
    }
    if (filters.price) {
        fillSelect(filters.price, uniqueSorted(companySurvey.map((row) => displayValue(row.priceBand))));
    }

    fillCompanyNav();

    if (filters.search) {
        filters.search.addEventListener("input", resetToFirstPage);
    }

    Object.values(filters)
        .filter((element) => element && element.tagName === "SELECT")
        .forEach((element) => {
            element.addEventListener("change", resetToFirstPage);
        });

    const resetButton = document.getElementById("reset-filters");
    if (resetButton) {
        resetButton.addEventListener("click", () => {
            Object.values(filters).forEach((element) => {
                if (element) element.value = "";
            });
            resetToFirstPage();
        });
    }

    const pageSizeSelect = document.getElementById("page-size");
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", (event) => {
            pageSize = Number(event.target.value) || 25;
            currentPage = 1;
            renderTable(getFilteredRows());
        });
    }

    const surveyPageSizeSelect = document.getElementById("survey-page-size");
    if (surveyPageSizeSelect) {
        surveyPageSizeSelect.addEventListener("change", (event) => {
            surveyPageSize = Number(event.target.value) || 25;
            surveyPage = 1;
            renderSurveyAnswersTable(getFilteredSurveyRows());
        });
    }
}

initCompanyContext();
initFilters();
renderDashboard();

window.addEventListener("resize", () => {
    window.clearTimeout(window.__dashboardResize);
    window.__dashboardResize = window.setTimeout(renderDashboard, 150);
});
