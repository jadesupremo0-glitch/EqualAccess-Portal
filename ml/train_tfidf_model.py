"""
Trains a content-based job recommender on dataset/mldataset.xlsx using the method its own
README specifies: TF-IDF vectorization + Cosine Similarity.

Pipeline
  1. Load the 500 applicant profiles and 100 job postings (Applicants / Jobs sheets).
  2. Build one text field per applicant (skills + education + experience + capabilities) and per
     job (title + required skills + qualifications + description); lowercase, strip punctuation,
     normalize whitespace (the README's "recommended preprocessing").
  3. Fit a single TfidfVectorizer on both applicant and job text (shared vocabulary/IDF), so the
     two sides land in the same vector space.
  4. Cosine similarity between every applicant vector and every job vector gives a 500x100
     match-score matrix — the same shape as the dataset's 50,000-row Matching_Data sheet.
  5. Rank each applicant's top-5 jobs by similarity.
  6. Evaluate against the dataset's own Preferred_Job column: Top-1/3/5 accuracy = how often the
     applicant's stated preferred job appears in their top-K ranked recommendations.

Input : dataset/mldataset.xlsx
Output: ml/output_tfidf/
  - recommendations.csv            top-5 job recommendations per applicant, with similarity score
  - evaluation_metrics.json        Top-1/3/5 accuracy, mean/median top-1 similarity
  - similarity_distribution.png    histogram of top-1 similarity scores
  - topk_accuracy.png              bar chart of Top-1/3/5 accuracy
  - sample_walkthroughs.txt        5 worked examples (applicant profile -> ranked jobs)
  - vectorizer.joblib, similarity_matrix.npy   the fitted model, for reuse
  - training_report.xlsx           everything above in spreadsheet form, for the thesis

Usage: python ml/train_tfidf_model.py
"""
import json
import re
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).parent
DATA_FILE = HERE.parent / "dataset" / "mldataset.xlsx"
OUT_DIR = HERE / "output_tfidf"
OUT_DIR.mkdir(exist_ok=True)

TOP_N = 5


def clean_text(s: object) -> str:
    s = str(s).lower()
    s = re.sub(r"[^a-z0-9\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


applicants = pd.read_excel(DATA_FILE, sheet_name="Applicants")
jobs = pd.read_excel(DATA_FILE, sheet_name="Jobs")

applicants["text"] = (
    applicants["Skills"].astype(str) + " " + applicants["Education"].astype(str) + " "
    + applicants["Experience"].astype(str) + " " + applicants["Capabilities"].astype(str)
).apply(clean_text)
jobs["text"] = (
    jobs["Job_Title"].astype(str) + " " + jobs["Required_Skills"].astype(str) + " "
    + jobs["Qualifications"].astype(str) + " " + jobs["Job_Description"].astype(str)
).apply(clean_text)

# One shared vocabulary/IDF for both sides, so applicant and job vectors are comparable.
vectorizer = TfidfVectorizer(stop_words="english")
vectorizer.fit(pd.concat([applicants["text"], jobs["text"]]))

applicant_vectors = vectorizer.transform(applicants["text"])
job_vectors = vectorizer.transform(jobs["text"])

similarity = cosine_similarity(applicant_vectors, job_vectors)  # (500, 100)
print(f"Applicants: {len(applicants)}  Jobs: {len(jobs)}  Similarity matrix: {similarity.shape}")
print(f"Vocabulary size: {len(vectorizer.vocabulary_)}")

# ── Top-N recommendations per applicant ──────────────────────────────────────
records = []
for i, arow in applicants.iterrows():
    scores = similarity[i]
    top_idx = np.argsort(-scores)[:TOP_N]
    for rank, j in enumerate(top_idx, start=1):
        records.append(
            {
                "Applicant_ID": arow["Applicant_ID"],
                "Preferred_Job": arow["Preferred_Job"],
                "Rank": rank,
                "Job_ID": jobs.iloc[j]["Job_ID"],
                "Job_Title": jobs.iloc[j]["Job_Title"],
                "Similarity": round(float(scores[j]), 4),
            }
        )
recommendations = pd.DataFrame(records)
recommendations.to_csv(OUT_DIR / "recommendations.csv", index=False)

# ── Evaluation: does the ranked list surface the applicant's own stated preference? ─────────────
def topk_accuracy(k: int) -> float:
    hits = 0
    for i, arow in applicants.iterrows():
        top_idx = np.argsort(-similarity[i])[:k]
        if arow["Preferred_Job"] in jobs.iloc[top_idx]["Job_Title"].values:
            hits += 1
    return hits / len(applicants)


top1_scores = similarity.max(axis=1)
metrics = {
    "applicants": int(len(applicants)),
    "jobs": int(len(jobs)),
    "vocabulary_size": int(len(vectorizer.vocabulary_)),
    "top1_accuracy": round(topk_accuracy(1), 4),
    "top3_accuracy": round(topk_accuracy(3), 4),
    "top5_accuracy": round(topk_accuracy(5), 4),
    "mean_top1_similarity": round(float(top1_scores.mean()), 4),
    "median_top1_similarity": round(float(np.median(top1_scores)), 4),
}
(OUT_DIR / "evaluation_metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")

print("\nEvaluation (does the ranked list contain the applicant's stated Preferred_Job?):")
for k, v in metrics.items():
    print(f"  {k}: {v}")

# ── Charts ────────────────────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(7, 4.5))
ax.hist(top1_scores, bins=30, color="#0f766e", edgecolor="white")
ax.set_xlabel("Top-1 cosine similarity score")
ax.set_ylabel("Number of applicants")
ax.set_title("Distribution of best-match similarity scores")
fig.tight_layout()
fig.savefig(OUT_DIR / "similarity_distribution.png", dpi=150)
plt.close(fig)

fig, ax = plt.subplots(figsize=(5, 4.5))
ks = ["Top-1", "Top-3", "Top-5"]
vals = [metrics["top1_accuracy"], metrics["top3_accuracy"], metrics["top5_accuracy"]]
bars = ax.bar(ks, vals, color=["#0f766e", "#2563eb", "#d97706"])
ax.set_ylim(0, 1.15)
ax.set_yticks([0, 0.2, 0.4, 0.6, 0.8, 1.0])
ax.set_ylabel("Accuracy (Preferred_Job found in top-K)")
ax.set_title("Top-K accuracy vs. applicants' stated preference", pad=12)
for b, v in zip(bars, vals):
    ax.text(b.get_x() + b.get_width() / 2, v + 0.03, f"{v:.1%}", ha="center", fontsize=10)
fig.tight_layout()
fig.savefig(OUT_DIR / "topk_accuracy.png", dpi=150)
plt.close(fig)

# ── Worked examples for the thesis writeup ────────────────────────────────────
lines = []
for i in [0, 1, 2, 3, 4]:
    arow = applicants.iloc[i]
    top_idx = np.argsort(-similarity[i])[:TOP_N]
    lines.append(f"=== {arow['Applicant_ID']} ===")
    lines.append(f"Skills: {arow['Skills']}")
    lines.append(f"Education: {arow['Education']}  |  Experience: {arow['Experience']}")
    lines.append(f"Stated preferred job: {arow['Preferred_Job']}")
    lines.append("Top 5 recommended jobs:")
    for rank, j in enumerate(top_idx, start=1):
        jrow = jobs.iloc[j]
        mark = " <-- matches stated preference" if jrow["Job_Title"] == arow["Preferred_Job"] else ""
        lines.append(f"  {rank}. {jrow['Job_Title']} ({jrow['Job_ID']}) — similarity {similarity[i, j]:.3f}{mark}")
    lines.append("")
(OUT_DIR / "sample_walkthroughs.txt").write_text("\n".join(lines), encoding="utf-8")

# ── Save the fitted model for reuse ────────────────────────────────────────────
joblib.dump(vectorizer, OUT_DIR / "vectorizer.joblib")
np.save(OUT_DIR / "similarity_matrix.npy", similarity)

# ── Excel report ────────────────────────────────────────────────────────────────
with pd.ExcelWriter(OUT_DIR / "training_report.xlsx", engine="openpyxl") as writer:
    pd.DataFrame([metrics]).T.rename(columns={0: "Value"}).to_excel(writer, sheet_name="Evaluation Metrics")
    recommendations.to_excel(writer, sheet_name="Top-5 Recommendations", index=False)
    applicants[["Applicant_ID", "Skills", "Education", "Experience", "Capabilities", "Preferred_Job"]].to_excel(
        writer, sheet_name="Applicants", index=False
    )
    jobs[["Job_ID", "Job_Title", "Required_Skills", "Qualifications", "Job_Description", "Location", "Employment_Type"]].to_excel(
        writer, sheet_name="Jobs", index=False
    )

print(f"\nArtifacts written to {OUT_DIR}/")
