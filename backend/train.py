r"""
Train KNN model and vectorizer from symptoms-to-disease CSV.
Run from backend/ with: python train.py
Requires: scikit-learn, pandas, kagglehub.
Dataset: abhishekgodara/symptoms-to-diseases (final_symptoms_to_disease.csv).
Uses kagglehub to download the dataset if the CSV is not already in DATA_DIR.
"""
import os
import sys
from pathlib import Path
from typing import Optional

# Ensure app and data paths are resolvable
BACKEND_ROOT = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", str(BACKEND_ROOT / "data"))).resolve()
DATA_DIR.mkdir(parents=True, exist_ok=True)

KAGGLE_HANDLE = "abhishekgodara/symptoms-to-diseases"
CSV_FILENAME = os.getenv("TRAIN_CSV", "final_symptoms_to_disease.csv")


def _find_csv_in_dir(directory: Path) -> Optional[Path]:
    """Return path to CSV_FILENAME in directory or subdirs, or single CSV, or None."""
    target = directory / CSV_FILENAME
    if target.exists():
        return target
    candidates = list(directory.rglob(CSV_FILENAME))
    if candidates:
        return candidates[0]
    all_csv = list(directory.rglob("*.csv"))
    if len(all_csv) == 1:
        return all_csv[0]
    return None


def get_csv_path() -> Path:
    """Use CSV from DATA_DIR, or download via kagglehub and return path."""
    csv_path = _find_csv_in_dir(DATA_DIR)
    if csv_path is not None:
        print("Using CSV:", csv_path)
        return csv_path
    print("Dataset not found locally. Downloading with kagglehub...")
    try:
        import kagglehub
        download_path = kagglehub.dataset_download(KAGGLE_HANDLE, output_dir=str(DATA_DIR))
        # kagglehub may return path to extracted dir (dataset name or version subdir)
        search_dir = Path(download_path) if isinstance(download_path, str) else download_path
        csv_path = _find_csv_in_dir(search_dir)
        if csv_path is None:
            csv_path = _find_csv_in_dir(DATA_DIR)
        if csv_path is None:
            raise FileNotFoundError("Download completed but CSV not found in", download_path)
        print("Downloaded and using CSV:", csv_path)
        return csv_path
    except Exception as e:
        print("Download failed:", e)
        print("Ensure kagglehub is installed (pip install kagglehub) and you are authenticated.")
        print("See https://github.com/Kaggle/kagglehub#authenticate")
        sys.exit(1)


def load_and_prepare(csv_path: Path):
    """Load CSV and return (X_texts, y_labels). Expects symptom columns and a disease/prognosis column."""
    import pandas as pd
    df = pd.read_csv(csv_path)
    cols = [c.strip() for c in df.columns]
    df.columns = cols
    target_candidates = ["prognosis", "Disease", "disease", "Prognosis", "outcome"]
    symptom_like = [c for c in cols if "symptom" in c.lower() or c.startswith("Symptom_")]
    target_col = next((t for t in target_candidates if t in cols), None)

    if symptom_like and target_col:
        symptom_cols = symptom_like
    elif not symptom_like and target_col:
        symptom_cols = [c for c in cols if c != target_col]
    elif target_col is None:
        target_col = cols[-1]
        symptom_cols = [c for c in cols if c != target_col]
    else:
        symptom_cols = symptom_like
        target_col = target_col or cols[-1]

    df = df.dropna(subset=symptom_cols + [target_col])
    # If long format (one symptom per row, same disease repeated), group by disease and join symptoms
    if len(symptom_cols) == 1 and df.duplicated(subset=[target_col]).any():
        grouped = df.groupby(target_col, as_index=False)[symptom_cols[0]].agg(lambda x: " ".join(x.dropna().astype(str)))
        x_ser = grouped[symptom_cols[0]].str.replace(r"\s+", " ", regex=True).str.strip()
        y_ser = grouped[target_col].astype(str)
        valid = x_ser.str.len() >= 2
        X = x_ser[valid].tolist()
        y = y_ser[valid].tolist()
    else:
        # Wide format: one row per case, combine symptom columns into one string
        X = df[symptom_cols].fillna("").astype(str).agg(" ".join, axis=1).str.replace(r"\s+", " ", regex=True).str.strip()
        y = df[target_col].astype(str)
        valid = X.str.len() >= 2
        X = X[valid].tolist()
        y = y[valid].tolist()
    if not X:
        raise ValueError("No valid symptom text in dataset; check CSV columns and content.")
    return X, y


def main():
    csv_path = get_csv_path()
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
