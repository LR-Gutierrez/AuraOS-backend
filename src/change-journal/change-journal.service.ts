import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ChangePayload,
  Conflict,
  PushChangesResponse,
  PullChangesResponse,
} from './change-journal.types';

const ENTITY_FIELDS: Record<string, string[]> = {
  branch: [
    'id', 'name', 'address',
    'motorcycleCapacity', 'lightVehicleCapacity', 'heavyVehicleCapacity',
    'motorcycleRate', 'lightVehicleRate', 'heavyVehicleRate',
    'motorcycleOvernightRate', 'lightVehicleOvernightRate', 'heavyVehicleOvernightRate',
    'openTimeWeekday', 'closeTimeWeekday', 'openTimeWeekend', 'closeTimeWeekend',
    'currency', 'favorite',
  ],
  membership: [
    'id', 'memberName', 'tier', 'cardUuid', 'startDate', 'endDate', 'isActive', 'branchId',
  ],
  vehicle_entry: [
    'id', 'plate', 'vehicleType', 'isVip', 'membershipId', 'branchId',
    'platePhotoUrl', 'frontPhotoUrl', 'rearPhotoUrl', 'leftPhotoUrl', 'rightPhotoUrl',
    'exitedAt', 'createdAt',
  ],
};

const DATE_FIELDS = ['startDate', 'endDate', 'exitedAt', 'createdAt', 'updatedAt'];

@Injectable()
export class ChangeJournalService {
  constructor(private prisma: PrismaService) {}

  async pushChanges(changes: ChangePayload[]): Promise<PushChangesResponse> {
    const conflicts: Conflict[] = [];

    for (const change of changes) {
      if (await this.isDuplicate(change)) continue;

      const conflict = await this.applyChange(change);
      if (conflict) conflicts.push(conflict);
    }

    return { success: true, conflicts };
  }

  async pullChanges(
    since: number | null,
    deviceId: string,
  ): Promise<PullChangesResponse> {
    const where: Record<string, unknown> = {
      deviceId: { not: deviceId },
    };
    if (since !== null) {
      where.timestamp = { gt: since };
    }

    const entries = await this.prisma.changeJournal.findMany({
      where,
      orderBy: { timestamp: 'asc' },
    });

    return {
      changes: entries.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        entityId: e.entityId,
        operation: e.operation,
        data: e.data as Record<string, unknown>,
        changedFields: e.changedFields as Record<string, unknown> | null,
        timestamp: Number(e.timestamp),
        deviceId: e.deviceId,
      })) as (ChangePayload & { id: bigint })[],
      syncTimestamp: Date.now(),
    };
  }

  private async isDuplicate(change: ChangePayload): Promise<boolean> {
    const existing = await this.prisma.changeJournal.findFirst({
      where: {
        deviceId: change.deviceId,
        entityType: change.entityType,
        entityId: change.entityId,
        timestamp: change.timestamp,
      },
    });
    return existing !== null;
  }

  private async applyChange(
    change: ChangePayload,
  ): Promise<Conflict | null> {
    switch (change.operation) {
      case 'CREATE':
        return this.handleCreate(change);
      case 'UPDATE':
        return this.handleUpdate(change);
      case 'DELETE':
        return this.handleDelete(change);
      default:
        return null;
    }
  }

  private async handleCreate(change: ChangePayload): Promise<Conflict | null> {
    const model = this.getModel(change.entityType);

    const existing = await model.findUnique({
      where: { id: change.entityId },
    });

    if (existing) {
      const existingTs = Number(existing.lastModifiedAt ?? 0);
      if (change.timestamp > existingTs) {
        await model.update({
          where: { id: change.entityId },
          data: this.mapDataToModel(change.entityType, change.data, change.timestamp),
        });
      }
    } else {
      await model.create({
        data: this.mapDataToModel(change.entityType, change.data, change.timestamp),
      });
    }

    await this.insertJournalEntry(change);
    return null;
  }

  private async handleUpdate(change: ChangePayload): Promise<Conflict | null> {
    const model = this.getModel(change.entityType);

    let entity = await model.findUnique({
      where: { id: change.entityId },
    });

    if (!entity) {
      await model.create({
        data: this.mapDataToModel(change.entityType, change.data, change.timestamp),
      });
      await this.insertJournalEntry(change);
      return null;
    }

    const conflictChange = await this.prisma.changeJournal.findFirst({
      where: {
        entityType: change.entityType,
        entityId: change.entityId,
        deviceId: { not: change.deviceId },
        timestamp: { gt: change.timestamp },
      },
      orderBy: { timestamp: 'desc' },
    });

    if (conflictChange) {
      const mergedData = this.fieldLevelMerge(
        entity,
        change,
        conflictChange,
      );

      await model.update({
        where: { id: change.entityId },
        data: this.mapDataToModel(change.entityType, mergedData, change.timestamp),
      });

      const resolvedFields: Record<string, unknown> = {};
      if (change.changedFields) {
        for (const [key, value] of Object.entries(change.changedFields)) {
          if (mergedData[key] === value) {
            resolvedFields[key] = value;
          }
        }
      }

      await this.insertJournalEntry(change);

      return {
        entityType: change.entityType,
        entityId: change.entityId,
        localTimestamp: change.timestamp,
        remoteTimestamp: Number(conflictChange.timestamp),
        resolvedFields,
      };
    }

    await model.update({
      where: { id: change.entityId },
      data: this.mapDataToModel(change.entityType, change.data, change.timestamp),
    });
    await this.insertJournalEntry(change);
    return null;
  }

  private async handleDelete(change: ChangePayload): Promise<Conflict | null> {
    const model = this.getModel(change.entityType);

    const entity = await model.findUnique({
      where: { id: change.entityId },
    });

    if (entity) {
      await model.delete({ where: { id: change.entityId } });
    }

    await this.insertJournalEntry(change);
    return null;
  }

  private fieldLevelMerge(
    entity: Record<string, unknown>,
    incoming: ChangePayload,
    conflictChange: Record<string, unknown>,
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...entity };
    const conflictData = conflictChange.data as Record<string, unknown>;
    const conflictChangedFields = conflictChange.changedFields as Record<string, unknown> | null;
    const incomingChangedFields = incoming.changedFields ?? {};
    const conflictTs = Number(conflictChange.timestamp);

    for (const [field, value] of Object.entries(incomingChangedFields)) {
      const fieldWasModifiedByConflict =
        conflictChangedFields !== null && field in conflictChangedFields;

      if (fieldWasModifiedByConflict && conflictTs > incoming.timestamp) {
        merged[field] = conflictData[field] ?? entity[field];
      } else {
        merged[field] = value;
      }
    }

    return merged;
  }

  private getModel(entityType: string): any {
    const map: Record<string, any> = {
      branch: this.prisma.branch,
      membership: this.prisma.membership,
      vehicle_entry: this.prisma.vehicleEntry,
    };
    const model = map[entityType];
    if (!model) throw new Error(`Unknown entity type: ${entityType}`);
    return model;
  }

  private mapDataToModel(
    entityType: string,
    data: Record<string, unknown>,
    timestamp: number,
  ): Record<string, unknown> {
    const allowedFields = ENTITY_FIELDS[entityType] ?? [];
    const mapped: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in data) {
        mapped[field] = this.convertValue(field, data[field]);
      }
    }

    mapped.lastModifiedAt = timestamp;
    return mapped;
  }

  private convertValue(field: string, value: unknown): unknown {
    if (value === null || value === undefined) return value;
    if (DATE_FIELDS.includes(field) && typeof value === 'string') {
      return new Date(value);
    }
    return value;
  }

  private async insertJournalEntry(change: ChangePayload): Promise<void> {
    await this.prisma.changeJournal.create({
      data: {
        entityType: change.entityType,
        entityId: change.entityId,
        operation: change.operation,
        data: change.data as Prisma.InputJsonValue,
        changedFields: (change.changedFields ??
          undefined) as Prisma.InputJsonValue | undefined,
        timestamp: change.timestamp,
        deviceId: change.deviceId,
      },
    });
  }
}
