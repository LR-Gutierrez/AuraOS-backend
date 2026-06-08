import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SyncEventsService } from '../sync-events/sync-events.service';
import * as admin from 'firebase-admin';

const TOPIC_ALL = 'todos';

interface ChangeInfo {
  entityType: string;
  operation: string;
  data: Record<string, unknown>;
}

const ENTITY_OP_MAP: Record<
  string,
  { CREATE: string; UPDATE: string; DELETE: string }
> = {
  vehicle_entry: {
    CREATE: 'Nuevo ingreso',
    UPDATE: 'Actualización',
    DELETE: 'Salida',
  },
  membership: {
    CREATE: 'Nuevo socio',
    UPDATE: 'Actualización',
    DELETE: 'Baja de socio',
  },
  branch: {
    CREATE: 'Nueva sucursal',
    UPDATE: 'Actualización',
    DELETE: 'Sucursal eliminada',
  },
};

const ENTITY_LABELS: Record<string, string> = {
  vehicle_entry: 'vehículos',
  membership: 'socios',
  branch: 'sucursales',
};

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private initialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly syncEventsService: SyncEventsService,
  ) {}

  onModuleInit(): void {
    const credentialsPath = this.configService.get<string>(
      'FIREBASE_CREDENTIALS_PATH',
    );

    if (!credentialsPath) {
      this.logger.warn(
        'FIREBASE_CREDENTIALS_PATH no definida — Firebase no se inicializará',
      );
      return;
    }

    if (admin.apps.length > 0) {
      this.initialized = true;
      this.logger.log('Firebase Admin ya estaba inicializado');
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert(credentialsPath),
      });
      this.initialized = true;
      this.logger.log('Firebase Admin SDK inicializado correctamente');
    } catch (error) {
      this.logger.error('Error al inicializar Firebase Admin SDK', error);
    }
  }

  async sendNotificationToAll(
    title: string,
    body: string,
  ): Promise<{ success: boolean; messageId?: string }> {
    if (!this.initialized) {
      this.logger.warn('Firebase no inicializado — notificación omitida');
      return { success: false };
    }

    const message: admin.messaging.Message = {
      notification: { title, body },
      topic: TOPIC_ALL,
    };

    try {
      const messageId = await admin.messaging().send(message);
      this.logger.log(
        `Notificación enviada al topic "${TOPIC_ALL}": ${messageId}`,
      );
      return { success: true, messageId };
    } catch (error) {
      this.logger.error('Error al enviar notificación push', error);
      throw error;
    }
  }

  async sendDataToAll(
    data: Record<string, string>,
    notification?: { title: string; body: string },
  ): Promise<{ success: boolean; messageId?: string }> {
    if (!this.initialized) {
      this.logger.warn('Firebase no inicializado — data message omitido');
      return { success: false };
    }

    const message: admin.messaging.Message = {
      data,
      notification,
      topic: TOPIC_ALL,
      android: {
        priority: 'high',
        ttl: 86400000,
      },
    };

    try {
      const messageId = await admin.messaging().send(message);
      this.logger.log(
        `Data message enviado al topic "${TOPIC_ALL}": ${messageId}`,
      );
      return { success: true, messageId };
    } catch (error) {
      this.logger.error('Error al enviar data message', error);
      throw error;
    }
  }

  emitJournalNotification(params: {
    changes: ChangeInfo[];
    branchIds: string[];
    hints: string[];
  }): string {
    if (params.branchIds.length === 0) return '';

    const latestCursor = String(Date.now());
    const { changes, branchIds, hints } = params;

    for (const branchId of branchIds) {
      this.syncEventsService.publish({
        type: 'journal_updated',
        scopeType: 'branch',
        scopeId: branchId,
        latestCursor,
        hints,
      });
    }

    const descriptions = changes
      .map((c) => this.buildDescription(c))
      .filter(Boolean) as string[];

    const title = 'Datos actualizados';
    let body: string;

    if (descriptions.length <= 2) {
      body = descriptions.join(' | ');
    } else {
      const labels = hints.map((h) => ENTITY_LABELS[h] ?? h);
      body = `${descriptions.length} cambios en ${labels.join(', ')}`;
    }

    this.sendDataToAll(
      {
        type: 'journal_updated',
        latestCursor,
        hints: JSON.stringify(hints),
      },
      { title, body },
    ).catch((error) => this.logger.error('FCM data message falló', error));

    return latestCursor;
  }

  private buildDescription(change: ChangeInfo): string | null {
    const { entityType, operation, data } = change;
    const opMap = ENTITY_OP_MAP[entityType];
    if (!opMap) return null;

    let identifier: string | undefined;
    if (entityType === 'vehicle_entry') {
      identifier = data.plate as string | undefined;
    } else if (entityType === 'membership') {
      identifier = data.memberName as string | undefined;
    } else if (entityType === 'branch') {
      identifier = data.name as string | undefined;
    }

    const prefix = opMap[operation as keyof typeof opMap] ?? 'Actualización';
    return identifier ? `${prefix}: ${identifier}` : prefix;
  }
}
