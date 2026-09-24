"""
Reads the 100 jobs in dataset/mldataset.xlsx (Jobs sheet) and maps them toward the app's Job
shape (src/data.ts), writing an intermediate JSON that scripts/import-mldataset-jobs.ts finishes
(it needs the app's own lowestEducationLabel() from src/lib/recommend/education.ts, which is
TypeScript, to infer minEducation from the free-text Qualifications column).

The source dataset has no company/salary/slots/dates/status — those are synthesized here with a
fixed random seed. Job_ID/Employment_Type/Location are the only columns with real per-row variety;
Job_Title/Required_Skills/Qualifications/Job_Description repeat across 20 unique templates.

Usage: python scripts/map_mldataset_jobs.py
Output: dataset/mldataset-jobs-mapped.json
"""
import json
import random
from datetime import date, timedelta

import pandas as pd

random.seed(42)

SRC = "dataset/mldataset.xlsx"
OUT = "dataset/mldataset-jobs-mapped.json"

# First new job ID after the 13 existing curated demo jobs (JOB-001..JOB-013).
FIRST_ID = 14

EMPLOYMENT_TYPE_MAP = {
    "Full-time": "Full-time",
    "Part-time": "Part-time",
    "Contract": "Contractual",
    "Work-from-home": "Full-time",  # the source conflates "remote" with employment type; see work arrangement below
}

COMPANY_SUFFIX = {
    "Data Entry Clerk": "Records Office",
    "Customer Service Representative": "Customer Care Center",
    "Graphic Designer": "Design Studio",
    "Kitchen Assistant": "Kitchen & Catering Services",
    "Junior Web Developer": "Web Solutions",
    "Accounting Assistant": "Accounting Office",
    "Content Writer": "Media Group",
    "Social Media Assistant": "Digital Marketing Agency",
    "Inventory Assistant": "Trading Company",
    "Online Tutor": "Learning Center",
    "Administrative Assistant": "Business Center",
    "Sales Assistant": "Retail Store",
    "Photo Editor": "Photo Studio",
    "Bookkeeping Assistant": "Bookkeeping Services",
    "Office Assistant": "Business Solutions",
    "Junior Programmer": "Software Solutions",
    "Customer Support Agent": "Support Center",
    "Bakery Assistant": "Bakeshop",
    "Research Assistant": "Research Institute",
    "Inventory Clerk": "Trading Company",
}
CATEGORY = {
    "Data Entry Clerk": "Administrative", "Administrative Assistant": "Administrative", "Office Assistant": "Administrative",
    "Customer Service Representative": "Customer Service", "Customer Support Agent": "Customer Service", "Sales Assistant": "Customer Service",
    "Graphic Designer": "Creative", "Content Writer": "Creative", "Social Media Assistant": "Creative", "Photo Editor": "Creative",
    "Kitchen Assistant": "Food Service", "Bakery Assistant": "Food Service",
    "Junior Web Developer": "Technical", "Junior Programmer": "Technical",
    "Accounting Assistant": "Administrative", "Bookkeeping Assistant": "Administrative", "Inventory Assistant": "Administrative", "Inventory Clerk": "Administrative",
    "Online Tutor": "Education", "Research Assistant": "Education",
}

df = pd.read_excel(SRC, sheet_name="Jobs")

rows = []
for i, r in df.iterrows():
    title = str(r["Job_Title"])
    employment_type = EMPLOYMENT_TYPE_MAP.get(str(r["Employment_Type"]), "Full-time")
    work_arrangement = "Remote" if str(r["Employment_Type"]) == "Work-from-home" else "On-site"
    location = str(r["Location"])
    town = location.split(",")[0].strip()
    skills = [s.strip() for s in str(r["Required_Skills"]).split(",") if s.strip()]

    posted = date(2026, 6, 1) + timedelta(days=random.randint(0, 90))
    deadline = posted + timedelta(days=random.randint(60, 120))

    rows.append({
        "id": f"JOB-{FIRST_ID + i:03d}",
        "title": title,
        "company": f"{town} {COMPANY_SUFFIX.get(title, 'Office')}",
        "description": str(r["Job_Description"]),
        "location": location,
        "employmentType": employment_type,
        "workArrangement": work_arrangement,
        "skills": skills,
        "qualificationsText": str(r["Qualifications"]),  # resolved to minEducation on the TS side
        "slots": random.randint(1, 4),
        "deadline": deadline.isoformat(),
        "status": "Open",
        "postedDate": posted.isoformat(),
        "category": CATEGORY.get(title, "Administrative"),
    })

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(rows, f, ensure_ascii=False, indent=2)

print(f"Wrote {OUT} ({len(rows)} jobs, IDs JOB-{FIRST_ID:03d}..JOB-{FIRST_ID + len(rows) - 1:03d})")
