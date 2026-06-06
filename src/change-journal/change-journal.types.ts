export type EntityType = 'branch' | 'membership' | 'vehicle_entry';
export type Operation = 'CREATE' | 'UPDATE' | 'DELETE';

export interface ChangePayload {
  entityType: EntityType;
  entityId: string;
  operation: Operation;
  data: Record<string, unknown>;
  changedFields: Record<string, unknown> | null;
  timestamp: number;
  deviceId: string;
}

export interface JournalEntry {
  id: bigint;
  entityType: string;
  entityId: string;
  operation: string;
  data: Record<string, unknown>;
  changedFields: Record<string, unknown> | null;
  timestamp: number;
  deviceId: string;
  createdAt: Date;
}

export interface Conflict {
  entityType: EntityType;
  entityId: string;
  localTimestamp: number;
  remoteTimestamp: number;
  resolvedFields: Record<string, unknown>;
}

export interface PushChangesResponse {
  success: boolean;
  conflicts: Conflict[];
}

export interface PullChangesResponse {
  changes: (ChangePayload & { id: bigint })[];
  syncTimestamp: number;
}
