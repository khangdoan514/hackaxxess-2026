r"""
Train KNN model and vectorizer from Kaggle disease/symptom dataset.
Run from backend/ with: python train.py
Requires: pip install kaggle scikit-learn pandas; kaggle.json in ~/.kaggle (or Windows %USERPROFILE%\.kaggle)
Download dataset first: kaggle datasets download -d kaushil268/disease-prediction-using-machine-learning -p data --unzip
"""
import sys
from pathlib import Path

# Ensure app and data paths are resolvable
BACKEND_ROOT = Path(__file__).resolve().parent
DATA_DIR = BACKEND_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Try to use Kaggle dataset if not already present
KAGGLE_DATASET = "kaushil268/disease-prediction-using-machine-learning"


def download_dataset():
    """Download dataset using Kaggle API if not already in data/."""
    csv_files = list(DATA_DIR.glob("*.csv"))
    if csv_files:
        print("CSV already present, skipping download:", csv_files[0].name)
        return csv_files[0]
    try:
        import kaggle
        kaggle.api.dataset_download_files(
            KAGGLE_DATASET,
            path=str(DATA_DIR),
            unzip=True,
        )
        csv_files = list(DATA_DIR.glob("*.csv"))
        if not csv_files:
            raise FileNotFoundError("No CSV found after download")
        return csv_files[0]
    except Exception as e:
        print("Kaggle download failed:", e)
        print("Download manually: kaggle datasets download -d", KAGGLE_DATASET, "-p", DATA_DIR, "--unzip")
        sys.exit(1)


def load_and_prepare(csv_path: Path):
    """Load CSV and return (X_texts, y_labels). Expects symptom columns and a disease/prognosis column."""
    import pandas as pd
    df = pd.read_csv(csv_path)
    # Common column names in disease prediction datasets (kaushil268 has Symptom_1, ..., Symptom_17, Prognosis)
    symptom_cols = [c for c in df.columns if "symptom" in c.lower() or c.startswith("Symptom_")]
    if not symptom_cols:
        cols = df.columns.tolist()
        target_candidates = ["prognosis", "Disease", "disease", "Prognosis", "outcome"]
        target_col = next((t for t in target_candidates if t in cols), cols[-1])
        symptom_cols = [c for c in cols if c != target_col]
    else:
        target_candidates = ["prognosis", "Disease", "disease", "Prognosis"]
        target_col = next((c for c in target_candidates if c in df.columns), df.columns[-1])
    df = df.dropna(subset=symptom_cols + [target_col])
    # Combine symptom columns into one string per row; replace NaN string and collapse spaces
    X = df[symptom_cols].fillna("").astype(str).agg(" ".join, axis=1).str.replace(r"\s+", " ", regex=True).str.strip()
    y = df[target_col].astype(str)
    # Drop rows where symptom text is empty or too short (avoids empty vocabulary)
    valid = X.str.len() >= 2
    X = X[valid].tolist()
    y = y[valid].tolist()
    if not X:
        raise ValueError("No valid symptom text in dataset; check CSV columns and content.")
    return X, y


def main():
    csv_path = download_dataset()
    X_texts, y_labels = load_and_prepare(csv_path)
    print("Samples:", len(X_texts), "Classes:", len(set(y_labels)))

    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.neighbors import KNeighborsClassifier
    from sklearn.model_selection import train_test_split
    import pickle

    # No stop_words; allow single-char tokens (default token_pattern \b\w\w+\b drops them and can yield empty vocab)
    vectorizer = TfidfVectorizer(
        max_features=5000,
        ngram_range=(1, 2),
        min_df=1,
        token_pattern=r"(?u)\b\w+\b",  # keep single-char tokens so numeric/code columns still produce vocab
    )
    X_vec = vectorizer.fit_transform(X_texts)
    X_train, X_test, y_train, y_test = train_test_split(X_vec, y_labels, test_size=0.2, random_state=42)

    model = KNeighborsClassifier(n_neighbors=5, weights="distance")
    model.fit(X_train, y_train)
    acc = (model.predict(X_test) == y_test).mean()
    print("Test accuracy:", round(acc, 4))

    # Save using same feature space as fit (vectorizer must be used on same-style input in api)
    model_path = DATA_DIR / "model.pkl"
    vec_path = DATA_DIR / "vectorizer.pkl"
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    with open(vec_path, "wb") as f:
        pickle.dump(vectorizer, f)
    print("Saved", model_path, vec_path)


if __name__ == "__main__":
    main()
