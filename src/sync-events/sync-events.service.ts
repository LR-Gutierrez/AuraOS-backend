import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Observable, Subject, interval, merge, of } from 'rxjs';
import { map } from 'rxjs/operators';
import type { MessageEvent } from '@nestjs/common';
import type { JournalUpdatedEvent } from './sync-events.types';

const COALESCE_WINDOW_MS = 500;
const HEARTBEAT_INTERVAL_MS = 15_000;

function generateEventId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `evt_${ts}${rand}`;
}

@Injectable()
export class SyncEventsService implements OnModuleDestroy {
  private readonly logger = new Logger(SyncEventsService.name);
  private readonly globalSubject = new Subject<JournalUpdatedEvent>();
  private readonly pendingPublishes = new Map<
    string,
    { event: JournalUpdatedEvent; timer: NodeJS.Timeout }
  >();
  private activeConnections = 0;

  subscribe(userId: string): Observable<MessageEvent> {
    this.activeConnections++;
    const connectionId = generateEventId();

    this.logger.log(
      `SSE conectado — userId=${userId} connectionId=${connectionId} activas=${this.activeConnections}`,
    );

    const connectedEvent: MessageEvent = {
      type: 'connected',
      data: JSON.stringify({
        type: 'connected',
        connectionId,
        serverTime: new Date().toISOString(),
        recommendedRetryMs: 3000,
        version: 1,
      }),
    };

    const journalEvents$ = this.globalSubject.pipe(
      map(
        (event): MessageEvent => ({
          type: 'journal_updated',
          data: JSON.stringify(event),
        }),
      ),
    );

    const heartbeat$ = interval(HEARTBEAT_INTERVAL_MS).pipe(
      map(
        (): MessageEvent => ({
          type: 'heartbeat',
          data: JSON.stringify({ serverTime: new Date().toISOString() }),
        }),
      ),
    );

    return new Observable<MessageEvent>((observer) => {
      const sub = merge(
        of(connectedEvent),
        journalEvents$,
        heartbeat$,
      ).subscribe(observer);
      return () => {
        sub.unsubscribe();
        this.activeConnections--;
        this.logger.log(
          `SSE desconectado — userId=${userId} activas=${this.activeConnections}`,
        );
      };
    });
  }

  publish(
    input: Omit<JournalUpdatedEvent, 'eventId' | 'serverTime' | 'version'>,
  ): void {
    const scopeKey = `${input.scopeType}:${input.scopeId}`;
    const existing = this.pendingPublishes.get(scopeKey);

    if (existing) {
      clearTimeout(existing.timer);
      existing.event.latestCursor = input.latestCursor;
      if (input.hints) {
        existing.event.hints = [
          ...new Set([...(existing.event.hints ?? []), ...input.hints]),
        ];
      }
      existing.event.serverTime = new Date().toISOString();
      existing.timer = setTimeout(
        () => this.flush(scopeKey),
        COALESCE_WINDOW_MS,
      );
    } else {
      const event: JournalUpdatedEvent = {
        ...input,
        eventId: generateEventId(),
        serverTime: new Date().toISOString(),
        version: 1,
      };
      const timer = setTimeout(() => this.flush(scopeKey), COALESCE_WINDOW_MS);
      this.pendingPublishes.set(scopeKey, { event, timer });
    }
  }

  private flush(scopeKey: string): void {
    const pending = this.pendingPublishes.get(scopeKey);
    if (!pending) return;
    this.pendingPublishes.delete(scopeKey);
    this.globalSubject.next(pending.event);
    this.logger.debug(
      `Evento emitido: ${pending.event.type} [${scopeKey}] cursor=${pending.event.latestCursor}`,
    );
  }

  onModuleDestroy(): void {
    for (const [, pending] of this.pendingPublishes) {
      clearTimeout(pending.timer);
    }
    this.pendingPublishes.clear();
    this.globalSubject.complete();
    this.logger.log('SyncEventsService destruido — conexiones limpiadas');
  }
}
