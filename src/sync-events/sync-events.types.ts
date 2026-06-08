export type ScopeType = 'branch';

export interface JournalUpdatedEvent {
  type: 'journal_updated';
  scopeType: ScopeType;
  scopeId: string;
  latestCursor: string;
  hints?: string[];
  serverTime: string;
  eventId: string;
  version: number;
}

export type SyncEvent = JournalUpdatedEvent;
