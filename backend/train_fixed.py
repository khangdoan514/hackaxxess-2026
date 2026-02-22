"""
Train KNN model on diseases and symptom_text columns.
Each row: disease name, comma-separated symptoms as one string
"""
import pandas as pd
import pickle
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split
import numpy as np

DATA_DIR = Path("data")
csv_path = DATA_DIR / "final_symptoms_to_disease.csv"

print(f"📄 Loading {csv_path}...")
df = pd.read_csv(csv_path)
print(f"Initial shape: {df.shape}")

# Show first few rows
print("\n👀 First 3 rows:")
print(df.head(3))

# Group by disease to combine multiple rows for same disease
print("\n🔄 Grouping by disease...")
grouped = df.groupby('diseases')['symptom_text'].agg(lambda x: ' '.join(x)).reset_index()
print(f"After grouping: {grouped.shape[0]} diseases")

# Prepare data
X_texts = grouped['symptom_text'].tolist()
y_labels = grouped['diseases'].tolist()

print(f"\n📊 Dataset stats:")
print(f"  - Diseases: {len(set(y_labels))}")
print(f"  - Total samples: {len(X_texts)}")
print(f"  - Sample symptoms: {X_texts[0][:100]}...")
print(f"  - Sample disease: {y_labels[0]}")

# Vectorize symptoms
print("\n🔧 Vectorizing symptoms...")
vectorizer = TfidfVectorizer(
    max_features=5000,
    ngram_range=(1, 3),
    stop_words='english',
    token_pattern=r'(?u)\b\w+\b',
)

X_vec = vectorizer.fit_transform(X_texts)
print(f"  - Features: {len(vectorizer.get_feature_names_out())} symptom terms")

# Split data WITHOUT stratification (since some classes have only 1 sample)
print("\n📊 Splitting data (80% train, 20% test)...")
X_train, X_test, y_train, y_test = train_test_split(
    X_vec, y_labels, test_size=0.2, random_state=42, stratify=None  # Removed stratify
)

print(f"  - Train samples: {len(y_train)}")
print(f"  - Test samples: {len(y_test)}")

# Train model
print("\n🏋️ Training KNN model...")
model = KNeighborsClassifier(n_neighbors=3, weights='distance', metric='cosine')
model.fit(X_train, y_train)

# Evaluate
accuracy = model.score(X_test, y_test)
print(f"✅ Test accuracy: {accuracy:.2%}")

# Save model
model_path = DATA_DIR / "model.pkl"
vec_path = DATA_DIR / "vectorizer.pkl"

with open(model_path, "wb") as f:
    pickle.dump(model, f)
with open(vec_path, "wb") as f:
    pickle.dump(vectorizer, f)

print(f"\n💾 Saved:")
print(f"  - {model_path}")
print(f"  - {vec_path}")

# Quick test
print("\n🔬 Quick test with common symptoms:")
test_cases = [
    "chest pain shortness of breath sweating anxiety",
    "fever cough headache fatigue",
    "nausea vomiting stomach pain",
    "rash itching swelling",
    "joint pain muscle pain back pain",
]

for test_symptoms in test_cases:
    print(f"\n  Symptoms: {test_symptoms}")
    X_test_vec = vectorizer.transform([test_symptoms])
    pred = model.predict(X_test_vec)[0]
    
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(X_test_vec)[0]
        top_3_idx = np.argsort(probs)[-3:][::-1]
        print(f"  Prediction: {pred}")
        print(f"  Top 3:")
        for idx in top_3_idx:
            print(f"    - {model.classes_[idx]}: {probs[idx]:.2%}")
    else:
        print(f"  Prediction: {pred}")