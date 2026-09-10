#!/usr/bin/env python3
"""Pack json/ sheet files into a browser-ready nkidata.js file."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_DIR = ROOT / "json"
SURVEY = JSON_DIR / "SurveyData_2018-2026.json"
FACTORS = JSON_DIR / "TotalEffect_Factors.json"
WEIGHTS = JSON_DIR / "Weights_questions.json"
OUT = ROOT / "nkidata.js"

FACTOR_KEYS = [
    "IfactorOPEN_home",
    "IfactorOPEN_closesit",
    "IfactorOPEN_choises",
    "IfactorOPEN_info",
    "IfactorOPEN_personal",
    "IfactorOPEN_reliable",
    "IfactorOPEN_value",
    "IfactorOPEN_loyalty",
    "IfactorOPEN_csi",
]


def intern(store, index, val):
    if val is None:
        val = ""
    else:
        val = str(val).strip()
    if val not in index:
        index[val] = len(store)
        store.append(val)
    return index[val]


def region_group(value):
    if value is None or str(value).strip() == "":
        return "Unknown"
    text = str(value).lower()
    if "stockholm" in text:
        return "Stockholm"
    if "göteborg" in text or "goteborg" in text:
        return "Göteborg"
    if "malmö" in text or "malmo" in text or "skåne" in text or "skane" in text:
        return "Skåne"
    if "mälardalen" in text or "malardalen" in text:
        return "Mälardalen"
    if "midnorth" in text or "mellersta" in text:
        return "Central"
    if "norr" in text:
        return "North"
    if "öst" in text or "ost" in text:
        return "East"
    if "väst" in text or "vast" in text:
        return "West"
    if "syd" in text:
        return "South"
    return "Other"


def price_band(value):
    if value is None or value == "":
        return ""
    try:
        number = float(str(value).replace(" ", "").replace(",", "."))
    except ValueError:
        return ""
    if number < 2_000_000:
        return "Under 2m SEK"
    if number < 3_000_000:
        return "2–3m SEK"
    if number < 4_000_000:
        return "3–4m SEK"
    if number < 5_000_000:
        return "4–5m SEK"
    return "5m+ SEK"


def num(value):
    if value is None or value == "" or value == "n/a":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number != number or number == 98:
        return None
    return round(number, 1)


def question_label(question):
    mapping = {
        "csiexp_csiexp": "CSI · Expectations",
        "csiideal_csiideal": "CSI · Ideal",
        "csioverall_csioa": "CSI · Overall",
        "loyaltyrec_loyrec": "Loyalty · Recommend",
        "loyaltytalk_loyaltytalk": "Loyalty · Talk",
        "loyaltycontact_loyaltytalk": "Loyalty · Contact",
        "value_valuea": "Value · A",
        "value_valueb": "Value · B",
        "value_valuec": "Value · C",
        "value_valued": "Value · D",
        "choisesq2_choicea": "Choices · A",
        "choisesq2_choicef": "Choices · F",
        "choisesq2_choiceg": "Choices · G",
        "choisesq2_choiceh": "Choices · H",
        "choisesq2_choicei": "Choices · I",
        "closesiteq_csitea": "Site · A",
        "closesiteq_csiteb": "Site · B",
        "closesiteq_csitec": "Site · C",
        "closesiteq_csitee": "Site · E",
        "closesiteq_csitef": "Site · F",
        "homeq_homel": "Home · Layout",
        "homeq_homec": "Home · C",
        "homeq_homee": "Home · E",
        "homeq_homek": "Home · K",
        "homeq_homer": "Home · R",
        "homeq_homeg": "Home · G",
        "infoq_infoa": "Info · A",
        "infoq_infob": "Info · B",
        "infoq_infoc": "Info · C",
        "infoq_infod": "Info · D",
        "infoq_infoe": "Info · E",
        "personq_persona": "Staff · A",
        "personq_personb": "Staff · B",
        "personq_personc": "Staff · C",
        "personq_persone": "Staff · E",
        "personq_personh": "Staff · H",
        "reliableq_rela": "Reliable · A",
        "reliableq_relb": "Reliable · B",
        "reliableq_rele": "Reliable · E",
        "reliableq_relf": "Reliable · F",
        "reliableq_relg": "Reliable · G",
    }
    key = question.lower()
    return mapping.get(key, question.replace("_", " "))


def labeled_weight_rows(items):
    return [{**item, "label": question_label(item["question"])} for item in items]


def main():
    for path in (SURVEY, FACTORS, WEIGHTS):
        if not path.exists():
            raise SystemExit(f"missing {path}. Run scripts/excel-to-json.py first.")

    factors = json.loads(FACTORS.read_text(encoding="utf-8"))
    weights = json.loads(WEIGHTS.read_text(encoding="utf-8"))

    companies, company_i = [], {}
    regions, region_i = [], {}
    hiers, hier_i = [], {}
    ages, age_i = [], {}
    genders, gender_i = [], {}
    devices, device_i = [], {}
    csis, csi_i = [], {}
    families, family_i = [], {}
    incomes, income_i = [], {}
    areas, area_i = [], {}
    prices, price_i = [], {}
    sizes, size_i = [], {}

    packed = []
    with SURVEY.open(encoding="utf-8") as handle:
        for line in handle:
            if line.startswith('"rows":'):
                break
        for line in handle:
            raw = line.strip()
            if raw in ("]", "]}"):
                break
            if raw.endswith(","):
                raw = raw[:-1]
            if not raw:
                continue
            row = json.loads(raw)
            year = int(row["Reportyear"]) if row.get("Reportyear") is not None else 0
            packed.append([
                year,
                intern(companies, company_i, row.get("Company")),
                intern(regions, region_i, region_group(row.get("Region"))),
                intern(hiers, hier_i, row.get("hier")),
                intern(sizes, size_i, row.get("size")),
                intern(ages, age_i, row.get("agecat")),
                intern(genders, gender_i, row.get("gender")),
                intern(devices, device_i, row.get("DeviceRecode")),
                intern(csis, csi_i, row.get("CSIcat3levels")),
                intern(families, family_i, row.get("familycat2")),
                intern(incomes, income_i, row.get("income3intervall")),
                intern(areas, area_i, row.get("areaINTERVALL")),
                intern(prices, price_i, price_band(row.get("Price"))),
                num(row.get("CSIoverall_CSIoa")),
                num(row.get("loyaltyrec_loyrec")),
                *[num(row.get(key)) for key in FACTOR_KEYS],
            ])

    payload = {
        "sourceFile": "json/SurveyData_2018-2026.json",
        "years": [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026],
        "companies": companies,
        "regions": regions,
        "hiers": hiers,
        "sizes": sizes,
        "ages": ages,
        "genders": genders,
        "devices": devices,
        "csi": csis,
        "families": families,
        "incomes": incomes,
        "areas": areas,
        "prices": prices,
        "factors": [
            ["IfactorOPEN_home", "Home"],
            ["IfactorOPEN_info", "Information"],
            ["IfactorOPEN_choises", "Choices"],
            ["IfactorOPEN_personal", "Staff"],
            ["IfactorOPEN_reliable", "Reliability"],
            ["IfactorOPEN_value", "Value"],
            ["IfactorOPEN_closesit", "Site completion"],
            ["IfactorOPEN_csi", "CSI"],
            ["IfactorOPEN_loyalty", "Loyalty"],
        ],
        "totalEffectFactors": [
            {"factorId": item["factor"], **{key: item.get(key) for key in ("2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026")}}
            for item in factors["factors"]
        ],
        "questionWeights": labeled_weight_rows(weights["weights"]),
        "questionImpactWeights": labeled_weight_rows(weights["impactWeights"]),
        "rows": packed,
    }

    OUT.write_text(
        "const nkiPack = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )
    print("wrote", OUT, "mb", round(OUT.stat().st_size / 1024 / 1024, 2), "rows", len(packed))
    print("companies", len(companies), "hiers", len(hiers), "regions", regions)


if __name__ == "__main__":
    main()
