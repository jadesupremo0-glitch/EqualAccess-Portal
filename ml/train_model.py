"""
Trains a Decision Tree classifier (with a Random Forest for comparison) that
reproduces the PWD-job recommendation engine's recommend/hide decision from its
three weighted matching variables (location and work-type/arrangement preference
are computed by the engine but no longer scored — they only drive the Jobs page's
location filter — so they are not training features here).

Input : ml/dataset.csv          (built by `npx tsx scripts/export-ml-dataset.ts`)
Output: ml/output/
  - decision_tree.png           visual tree (which variable it checks at each split)
  - feature_importance.png      bar chart of how much each variable matters
  - confusion_matrix.png        test-set confusion matrix
  - decision_tree_rules.txt     the tree as plain-English if/else rules
  - model.joblib                the trained scikit-learn model
  - training_report.xlsx        everything above in spreadsheet form, plus
                                 per-row test-set predictions, for the thesis

Usage: python ml/train_model.py
"""
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = Path(__file__).parent
DATA_FILE = HERE / "dataset.csv"
OUT_DIR = HERE / "output"
OUT_DIR.mkdir(exist_ok=True)

FEATURES = [
    "skill_coverage",
    "suitability_fraction",
    "education_fraction",
    "disability_listed",
]
FEATURE_LABELS = [
    "Skill coverage",
    "Disability/accommodation suitability",
    "Education fit",
    "Disability type explicitly listed",
]
# "label" = the weighted match score alone (>=40), i.e. the ML features above.
# "label_gated" = the engine's real recommend/hide decision, which ALSO applies a fixed
# 40% skill-coverage cutoff (MIN_SKILL_COVERAGE) as a hard business rule on top. That
# cutoff is a single-variable threshold, not something worth training a model to find,
# so the model here learns the score decision and the gate is documented separately.
TARGET = "label"

df = pd.read_csv(DATA_FILE)
X = df[FEATURES]
y = df[TARGET]

# Stratified split keeps the ~24% positive rate in both halves despite the small dataset.
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y
)

# ── Decision Tree (primary model) ───────────────────────────────────────────
tree = DecisionTreeClassifier(max_depth=4, min_samples_leaf=3, random_state=42)
tree.fit(X_train, y_train)
tree_pred = tree.test_pred = tree.predict(X_test)

# ── Random Forest (comparison / robustness check) ───────────────────────────
forest = RandomForestClassifier(n_estimators=200, max_depth=5, random_state=42)
forest.fit(X_train, y_train)
forest_pred = forest.predict(X_test)


def metrics_for(y_true, y_pred):
    return {
        "Accuracy": accuracy_score(y_true, y_pred),
        "Precision": precision_score(y_true, y_pred, zero_division=0),
        "Recall": recall_score(y_true, y_pred, zero_division=0),
        "F1-score": f1_score(y_true, y_pred, zero_division=0),
    }


tree_metrics = metrics_for(y_test, tree_pred)
forest_metrics = metrics_for(y_test, forest_pred)

print("Rows:", len(df), " Train:", len(X_train), " Test:", len(X_test))
print("\nDecision Tree test metrics:")
for k, v in tree_metrics.items():
    print(f"  {k}: {v:.3f}")
print("\nRandom Forest test metrics:")
for k, v in forest_metrics.items():
    print(f"  {k}: {v:.3f}")

# ── Decision tree plot ───────────────────────────────────────────────────────
fig, ax = plt.subplots(figsize=(20, 10))
plot_tree(
    tree,
    feature_names=FEATURE_LABELS,
    class_names=["Not recommended", "Recommended"],
    filled=True,
    rounded=True,
    fontsize=9,
    ax=ax,
)
fig.tight_layout()
fig.savefig(OUT_DIR / "decision_tree.png", dpi=150)
plt.close(fig)

# ── Feature importance chart ─────────────────────────────────────────────────
importance_df = pd.DataFrame(
    {
        "Feature": FEATURE_LABELS,
        "Decision Tree importance": tree.feature_importances_,
        "Random Forest importance": forest.feature_importances_,
    }
).sort_values("Decision Tree importance", ascending=True)

fig, ax = plt.subplots(figsize=(9, 5))
ax.barh(importance_df["Feature"], importance_df["Decision Tree importance"], color="#2563eb")
ax.set_xlabel("Importance (share of split contribution)")
ax.set_title("Which variables the Decision Tree actually checks")
fig.tight_layout()
fig.savefig(OUT_DIR / "feature_importance.png", dpi=150)
plt.close(fig)

# ── Confusion matrix ──────────────────────────────────────────────────────────
cm = confusion_matrix(y_test, tree_pred)
fig, ax = plt.subplots(figsize=(5, 5))
ConfusionMatrixDisplay(cm, display_labels=["Not recommended", "Recommended"]).plot(ax=ax, cmap="Blues", colorbar=False)
ax.set_title("Decision Tree — test set confusion matrix")
fig.tight_layout()
fig.savefig(OUT_DIR / "confusion_matrix.png", dpi=150)
plt.close(fig)

# ── Rules as text ─────────────────────────────────────────────────────────────
rules_text = export_text(tree, feature_names=FEATURE_LABELS)
(OUT_DIR / "decision_tree_rules.txt").write_text(rules_text, encoding="utf-8")

# ── Save the trained model ────────────────────────────────────────────────────
joblib.dump(tree, OUT_DIR / "model.joblib")

# ── Excel report ───────────────────────────────────────────────────────────────
test_results = X_test.copy()
test_results["pwd_id"] = df.loc[X_test.index, "pwd_id"]
test_results["job_id"] = df.loc[X_test.index, "job_id"]
test_results["actual_label"] = y_test.values
test_results["predicted_label"] = tree_pred
test_results["correct"] = test_results["actual_label"] == test_results["predicted_label"]
test_results = test_results[
    ["pwd_id", "job_id"] + FEATURES + ["actual_label", "predicted_label", "correct"]
]

metrics_df = pd.DataFrame(
    {
        "Metric": list(tree_metrics.keys()),
        "Decision Tree": list(tree_metrics.values()),
        "Random Forest": list(forest_metrics.values()),
    }
)

cm_df = pd.DataFrame(
    cm,
    index=["Actual: Not recommended", "Actual: Recommended"],
    columns=["Predicted: Not recommended", "Predicted: Recommended"],
)

split_info = pd.DataFrame(
    {
        "Item": ["Total rows (applicant x job pairs)", "Training rows (75%)", "Test rows (25%)", "Positive rate (whole dataset)", "Random seed"],
        "Value": [len(df), len(X_train), len(X_test), f"{y.mean():.1%}", 42],
    }
)

with pd.ExcelWriter(OUT_DIR / "training_report.xlsx", engine="openpyxl") as writer:
    split_info.to_excel(writer, sheet_name="Train-Test Split", index=False)
    importance_df.sort_values("Decision Tree importance", ascending=False).to_excel(
        writer, sheet_name="Feature Importance", index=False
    )
    metrics_df.to_excel(writer, sheet_name="Model Metrics", index=False)
    cm_df.to_excel(writer, sheet_name="Confusion Matrix")
    pd.DataFrame(
        classification_report(y_test, tree_pred, target_names=["Not recommended", "Recommended"], output_dict=True, zero_division=0)
    ).transpose().to_excel(writer, sheet_name="Classification Report")
    test_results.to_excel(writer, sheet_name="Test Set Predictions", index=False)
    df.to_excel(writer, sheet_name="Full Training Dataset", index=False)

print(f"\nArtifacts written to {OUT_DIR}/")
