import type {
  SqlPlaygroundRequestPayload,
  SqlPlaygroundResponse,
  SqlPlaygroundResponsePayload,
} from "./sqlPlaygroundProtocol";
import { isSqlPlaygroundResponse } from "./sqlPlaygroundProtocol";
import type { SqlPlaygroundSessionState } from "./sqlPlaygroundState";

export class SqlPlaygroundClientError extends Error {
  readonly payload;

  constructor(payload: Extract<SqlPlaygroundResponsePayload, { type: "error" }>["error"]) {
    super(payload.message);
    this.name = "SqlPlaygroundClientError";
    this.payload = payload;
  }
}

export class SqlPlaygroundManager {
  private worker: Worker | null = null;
  private nextRequestId = 1;
  private readonly pending = new Map<
    string,
    { resolve: (response: SqlPlaygroundResponse) => void; reject: (error: Error) => void }
  >();
  private readonly sessionStates = new Map<string, SqlPlaygroundSessionState>();
  private initialization: Promise<string> | null = null;

  getSessionState(sessionId: string): SqlPlaygroundSessionState | undefined {
    return this.sessionStates.get(sessionId);
  }

  setSessionState(state: SqlPlaygroundSessionState): void {
    this.sessionStates.set(state.sessionId, state);
  }

  private getWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker(new URL("./sqlite.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<unknown>) => {
      if (!isSqlPlaygroundResponse(event.data)) return;
      const pending = this.pending.get(event.data.requestId);
      if (!pending) return;
      this.pending.delete(event.data.requestId);
      if (event.data.type === "error") {
        pending.reject(new SqlPlaygroundClientError(event.data.error));
      } else {
        pending.resolve(event.data);
      }
    };
    worker.onerror = (event) => {
      const error = new Error(event.message || "SQLite worker failed.");
      this.pending.forEach(({ reject }) => reject(error));
      this.pending.clear();
    };
    this.worker = worker;
    return worker;
  }

  private send(payload: SqlPlaygroundRequestPayload): Promise<SqlPlaygroundResponse> {
    const requestId = `sql-playground-${this.nextRequestId++}`;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.getWorker().postMessage({ ...payload, requestId });
    });
  }

  initialize(): Promise<string> {
    if (!this.initialization) {
      this.initialization = this.send({ type: "initialize" }).then((response) => {
        if (response.type !== "initialized") throw new Error("Unexpected SQLite initialization response.");
        return response.sqliteVersion;
      });
    }
    return this.initialization;
  }

  async createSchema(sessionId: string, sql: string, schemaChecksum: string, reset: boolean): Promise<void> {
    await this.initialize();
    const response = await this.send({
      type: reset ? "reset" : "create-schema",
      sessionId,
      sql,
      schemaChecksum,
    });
    if (response.type !== "schema-ready") throw new Error("Unexpected SQLite schema response.");
  }

  async execute(sessionId: string, sql: string, maxRows: number) {
    const response = await this.send({ type: "execute", sessionId, sql, maxRows });
    if (response.type !== "execution-complete") throw new Error("Unexpected SQLite execution response.");
    return response;
  }

  async exportDatabase(sessionId: string): Promise<ArrayBuffer> {
    const response = await this.send({ type: "export", sessionId });
    if (response.type !== "export-complete") throw new Error("Unexpected SQLite export response.");
    return response.bytes;
  }

  async closeSession(sessionId: string): Promise<void> {
    this.sessionStates.delete(sessionId);
    if (!this.worker) return;
    const response = await this.send({ type: "close-session", sessionId });
    if (response.type !== "session-closed") throw new Error("Unexpected SQLite close response.");
  }

  async dispose(): Promise<void> {
    this.sessionStates.clear();
    const worker = this.worker;
    if (!worker) return;
    try {
      await this.send({ type: "dispose" });
    } finally {
      worker.terminate();
      this.worker = null;
      this.initialization = null;
      const error = new Error("SQLite worker disposed.");
      this.pending.forEach(({ reject }) => reject(error));
      this.pending.clear();
    }
  }
}
