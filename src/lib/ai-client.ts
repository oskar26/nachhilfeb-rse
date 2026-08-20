export interface ListingInput {
  intent?: 'searching' | 'offering';
  subject?: string;
  grade?: string;
  topic?: string;
  availability?: string;
  details?: string;
}

export interface ListingDraftResult {
  ok: boolean;
  feature: 'listing';
  model: string;
  data: {
    title: string;
    tags: string[];
    description: string;
    clarifying_questions: string[];
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

export interface ParentBriefingInput {
  student_first_name?: string;
  duration_minutes?: number;
  subject?: string;
  topic?: string;
  practiced?: string;
  progress?: string;
  next_step?: string;
}

export interface ParentBriefingResult {
  ok: boolean;
  feature: 'parent_briefing';
  model: string;
  data: {
    summary: string;
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

export async function requestAiDraft<T>(payload: any, options: { endpoint?: string; headers?: Record<string, string> } = {}): Promise<T> {
  const endpoint = options.endpoint || '/api/ai/generate';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || !data.ok) {
    const errorMsg = data.error || `HTTP-Fehler ${response.status} bei der KI-Generierung`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export async function generateListingDraft(input: ListingInput): Promise<ListingDraftResult> {
  return requestAiDraft<ListingDraftResult>({
    feature: 'listing',
    input,
  });
}

export async function generateParentBriefingDraft(input: ParentBriefingInput): Promise<ParentBriefingResult> {
  return requestAiDraft<ParentBriefingResult>({
    feature: 'parent_briefing',
    input,
  });
}
