import json
import time
import sys
import os
from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from verification.verifier import verify_claim

def run_eval():
    with open("benchmark/claims.json", "r") as f:
        dataset = json.load(f)

    y_true, y_pred, latencies = [], [], []

    for item in dataset:
        start = time.perf_counter()
        result = verify_claim(item["claim"], item["evidence"])
        latencies.append((time.perf_counter() - start) * 1000)

        y_true.append(item["label"])
        y_pred.append(result["status"])

    labels = ["SUPPORTED", "CONTRADICTED", "INSUFFICIENT"]
    precision, recall, f1, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=labels, average="weighted", zero_division=0
    )

    print(f"\nPrecision: {precision:.4f} | Recall: {recall:.4f} | F1: {f1:.4f}")
    print(f"Average Latency: {sum(latencies)/len(latencies):.2f} ms")

if __name__ == "__main__":
    run_eval()