# Builds the two small CSVs for Visuals 5 and 6 from the course's World Bank files.
import csv, sys, os
src, out = sys.argv[1], sys.argv[2]
FERT = "average_value_Fertility rate, total (births per woman)"
AGE65 = "average_value_Population ages 65 and above (% of total population)"
REGIONS = ["East Asia & Pacific", "Europe & Central Asia", "Latin America & Caribbean",
           "Middle East & North Africa", "North America", "South Asia", "Sub-Saharan Africa"]

def read(path):
    with open(path, encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

gender = read(os.path.join(src, "gender", "gender.csv"))
health = read(os.path.join(src, "health", "health.csv"))
meta = read(os.path.join(src, "gender", "Metadata_Country_API_17_DS2_en_csv_v2_3058240.csv"))
region_of = {m["Country Code"]: m["Region"] for m in meta if m["Region"]}  # blank region = aggregate
age65 = {(h["Country Code"], h["Year"]): h[AGE65] for h in health if h[AGE65]}

# Visual 5: regional averages over time
rows5 = [{"region": g["Country Name"], "year": g["Year"], "fertility": round(float(g[FERT]), 3)}
         for g in gender if g["Country Name"] in REGIONS and g[FERT]]
rows5.sort(key=lambda r: (r["region"], int(r["year"])))

# Visual 6: countries only, rows with both values
rows6 = []
for g in gender:
    code, year = g["Country Code"], g["Year"]
    if code in region_of and g[FERT] and (code, year) in age65:
        rows6.append({"country": g["Country Name"], "code": code, "region": region_of[code],
                      "year": year, "fertility": round(float(g[FERT]), 3),
                      "age65": round(float(age65[(code, year)]), 3)})
rows6.sort(key=lambda r: (r["country"], int(r["year"])))

for name, rows in [("fertility_by_region.csv", rows5), ("fertility_vs_aging.csv", rows6)]:
    with open(os.path.join(out, name), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys())); w.writeheader(); w.writerows(rows)
    print(name, len(rows), "rows")