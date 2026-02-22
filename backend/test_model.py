"""
Test the trained KNN model and vectorizer directly.
Run with: python test_model.py
"""
import pickle
import numpy as np
from pathlib import Path

# Paths
MODEL_PATH = Path("data/model.pkl")
VECTORIZER_PATH = Path("data/vectorizer.pkl")

def load_model():
    """Load model and vectorizer from disk"""
    if not MODEL_PATH.exists():
        print(f"❌ Model not found at {MODEL_PATH}")
        print("Run train.py first to train the model")
        return None, None
    
    with open(MODEL_PATH, 'rb') as f:
        model = pickle.load(f)
    
    with open(VECTORIZER_PATH, 'rb') as f:
        vectorizer = pickle.load(f)
    
    print(f"✅ Model loaded: {type(model).__name__}")
    print(f"✅ Vectorizer loaded: {type(vectorizer).__name__}")
    return model, vectorizer

def test_symptom(model, vectorizer, symptom_text):
    """Test a single symptom string"""
    print(f"\n🔍 Testing: '{symptom_text}'")
    
    # Transform text to vector
    X = vectorizer.transform([symptom_text])
    
    # Get prediction
    prediction = model.predict(X)[0]
    
    # Get probabilities if available
    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(X)[0]
        top_3_idx = np.argsort(probabilities)[-3:][::-1]
        diseases = model.classes_
        
        print(f"📊 Top 3 predictions:")
        for i, idx in enumerate(top_3_idx):
            print(f"   {i+1}. {diseases[idx]}: {probabilities[idx]:.2%}")
        
        print(f"🎯 Final prediction: {prediction}")
        return prediction, [(diseases[i], probabilities[i]) for i in top_3_idx]
    else:
        print(f"🎯 Prediction: {prediction}")
        return prediction, [(prediction, 1.0)]

def main():
    """Main test function"""
    print("=" * 50)
    print("🧪 TESTING DISEASE PREDICTION MODEL")
    print("=" * 50)
    
    # Load model
    model, vectorizer = load_model()
    if not model or not vectorizer:
        return
    
    print(f"\n📊 Model info:")
    print(f"   - Classes: {len(model.classes_)} diseases")
    print(f"   - Features: {vectorizer.get_feature_names_out().shape[0]} symptom terms")
    
    # Test cases
    test_cases = [
        "chest pain shortness of breath sweating",
        "fever cough headache fatigue",
        "nausea vomiting stomach pain diarrhea",
        "rash itching swelling",
        "joint pain muscle pain back pain",
        "dizziness weakness fatigue",
        "chest pain",  # Single symptom
    ]
    
    print("\n" + "=" * 50)
    print("🧪 RUNNING TEST CASES")
    print("=" * 50)
    
    for i, symptoms in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i} ---")
        test_symptom(model, vectorizer, symptoms)
    
    # Custom test
    print("\n" + "=" * 50)
    print("🔬 CUSTOM TEST")
    print("=" * 50)
    
    while True:
        print("\nEnter symptoms (or 'quit' to exit):")
        print("Example: fever cough headache")
        user_input = input("> ").strip()
        
        if user_input.lower() in ['quit', 'q', 'exit']:
            break
        
        if user_input:
            test_symptom(model, vectorizer, user_input)

if __name__ == "__main__":
    main()