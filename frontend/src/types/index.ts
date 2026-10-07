export type VerificationStatus = 'SUPPORTED' | 'CONTRADICTED' | 'UNVERIFIED';

export interface EvidenceItem {
  id: string;
  sourceTitle: string;
  snippet: string;
}

export interface Claim {
  id: string;
  text: string;
  status: VerificationStatus;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface VerificationResponse {
  query: string;
  llmAnswer: string;
  hallucinationRisk: number;
  claims: Claim[];
  latencySeconds: number;
}

export interface BenchmarkMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  averageLatency: number;
  datasetSize: number;
  testedModels: string[];
}

export interface VerificationRequest {
  query: string;
  llmAnswer?: string;
  contextDocument?: string;
}

export interface BackendHealth {
  status: string;
  service?: string;
}