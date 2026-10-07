import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification

class ClaimVerifier:
    def __init__(self, model_name: str = "cross-encoder/nli-deberta-v3-small"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self.model.eval()

        # NLI label mapping to required interface
        self.label_mapping = {
            "ENTAILMENT": "SUPPORTED",
            "CONTRADICTION": "CONTRADICTED",
            "NEUTRAL": "INSUFFICIENT"
        }

    def verify_claim(self, claim: str, evidence: str) -> dict:
        if not evidence or len(evidence.strip()) == 0:
            return {
                "status": "INSUFFICIENT",
                "confidence": 0.0,
                "reason": "No evidence was provided to verify the claim."
            }

        inputs = self.tokenizer(
            evidence,
            claim,
            return_tensors="pt",
            truncation=True,
            max_length=512
        )

        with torch.no_grad():
            outputs = self.model(**inputs)
            probabilities = torch.softmax(outputs.logits, dim=1).squeeze().tolist()

        # DeBERTa NLI outputs: 0 = Contradiction, 1 = Entailment, 2 = Neutral
        probs = {
            "CONTRADICTION": probabilities[0],
            "ENTAILMENT": probabilities[1],
            "NEUTRAL": probabilities[2]
        }

        nli_label = max(probs, key=probs.get)
        confidence = round(probs[nli_label], 4)
        status = self.label_mapping[nli_label]

        return {
            "status": status,
            "confidence": confidence,
            "reason": f"Evidence {status.lower()}s the claim."
        }

_verifier_instance = None

def verify_claim(claim: str, evidence: str) -> dict:
    global _verifier_instance
    if _verifier_instance is None:
        _verifier_instance = ClaimVerifier()
    return _verifier_instance.verify_claim(claim, evidence)