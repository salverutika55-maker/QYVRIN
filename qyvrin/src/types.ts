export type DecisionCategory = 
  | 'Personal'
  | 'Business'
  | 'Purchase'
  | 'Saving'
  | 'Debt'
  | 'Investment'
  | 'Career'
  | 'Other';

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  content: string;
  category: DecisionCategory;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'analysing' | 'analysed' | 'error';
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  financialImpact: string;
}

export interface PreMortemAnalysis {
  failureScenarios: {
    title: string;
    description: string;
  }[];
  criticalAssumptions: string[];
  earlyWarningIndicators: string[];
  questionsToInvestigate: string[];
  mitigationOptions: string[];
  informationGaps: string[];
  generatedAt: string;
}

export interface DecisionAnalysis {
  id: string;
  journalEntryId: string;
  summary: string;
  userFacts: string[];
  possibleSignals: string[];
  assumptions: string[];
  potentialRisks: string[];
  decisionPatterns: string[];
  questionsToValidate: string[];
  alternativeScenarios: Scenario[];
  informationGaps: string[];
  decisionReadiness: string;
  createdAt: string;
  preMortem?: PreMortemAnalysis;
}

export interface ExpectedOutcome {
  outcome: string;
  timeframe?: string;
  metric?: string;
  value?: string;
  confidence: 'Low' | 'Medium' | 'High';
}

export interface ActualOutcome {
  outcome: string;
  timeframe?: string;
  metric?: string;
  value?: string;
  surprises?: string;
  differentNextTime?: string;
}

export interface DecisionReplayAnalysis {
  decisionSummary: string;
  originalReasoning: string;
  expectedOutcome: string;
  actualOutcome: string;
  expectationVsReality: string;
  whatWentWell: string[];
  whatWasDifferent: string[];
  possibleReasoningGaps: string[];
  lessonLearned: string;
  futureQuestions: string[];
}

export interface Decision {
  id: string;
  userId: string;
  journalEntryId: string;
  analysisId: string;
  title: string;
  category: DecisionCategory;
  createdAt: string;
  updatedAt: string;
  status: 'analysing' | 'awaiting_outcome' | 'outcome_recorded' | 'replayed';
  expected?: ExpectedOutcome;
  actual?: ActualOutcome;
  replay?: DecisionReplayAnalysis;
}

export interface FingerprintPattern {
  pattern: string;
  observedIn: string[];
}

export interface DecisionFingerprint {
  expectationAccuracySummary: string;
  recurringAssumptions: FingerprintPattern[];
  decisionStrengths: FingerprintPattern[];
  informationGaps: FingerprintPattern[];
  confidenceCalibration: string;
  emergingPatterns: FingerprintPattern[];
}

export interface FingerprintDocument {
  generatedAt: string;
  analyzedDecisionIds: string[];
  completedDecisionCount: number;
  deterministicSummary: any;
  fingerprint: DecisionFingerprint;
}

export interface Insight {
  id: string;
  userId: string;
  type: 'pattern' | 'improvement' | 'risk' | 'lesson';
  title: string;
  description: string;
  date: string;
}

export interface Goal {
  id: string;
  userId: string;
  title: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string;
  status: 'active' | 'completed';
}

export interface PublicProfile {
  uid: string;
  displayName: string;
  professionalRole: string;
  expertise: string;
  bio: string;
  visibility: 'PRIVATE' | 'COMMUNITY';
  updatedAt: string;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
}

export interface CircleMember {
  userId: string;
  role: 'OWNER' | 'MEMBER';
  joinedAt: string;
}

export interface CircleJoinRequest {
  userId: string;
  status: 'pending';
  requestedAt: string;
}

export interface SharedDecisionSnapshot {
  id: string;
  circleId: string;
  title: string;
  category: DecisionCategory;
  decisionSummary: string;
  selectedAssumptions: string[];
  selectedInformationGaps: string[];
  authorId: string;
  authorDisplayName: string;
  createdAt: string;
  perspectiveCount: number;
}

export type PerspectiveType = 'perspective' | 'risk' | 'question' | 'alternative';

export interface CommunityPerspective {
  id: string;
  sharedDecisionId: string;
  authorId: string;
  authorDisplayName: string;
  type: PerspectiveType;
  content: string;
  createdAt: string;
}

export interface CommunitySynthesisItem {
  text: string;
  supportingPerspectiveIds: string[];
}

export interface CommunitySynthesis {
  generatedAt: string;
  analyzedPerspectiveIds: string[];
  keyConsiderations: CommunitySynthesisItem[];
  commonRisks: CommunitySynthesisItem[];
  alternativePerspectives: CommunitySynthesisItem[];
  areasOfAgreement: CommunitySynthesisItem[];
  areasOfDisagreement: CommunitySynthesisItem[];
  questionsWorthExploring: CommunitySynthesisItem[];
}
