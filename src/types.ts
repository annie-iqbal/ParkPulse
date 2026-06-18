export interface RegulatoryItem {
  status: 'ok' | 'warning' | 'error' | 'info';
  title: string;
  detail: string;
}

export interface ContextCard {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  colSpan?: number;
}

export interface ParkingAnalysis {
  canPark: boolean;
  verdict: string;
  description: string;
  maxDuration?: string;
  until?: string;
  contextCards: ContextCard[];
  regulatoryBreakdown: RegulatoryItem[];
  location: string;
  analysisTime: string;
  rawSignText?: string;
}
