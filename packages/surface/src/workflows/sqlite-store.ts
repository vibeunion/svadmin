import { DatabaseSync } from 'node:sqlite';
import type {
  SurfaceWorkflowStore, SurfaceWorkflowTransaction, SurfaceStoredRevision,
  SurfaceActionProposal, SurfaceWorkflowAuditEvent,
} from './types.js';

/** Node-only durable adapter. Use a local persistent volume, not an ephemeral
 * serverless filesystem or a network filesystem shared between server replicas.
 * DB files/backups contain form data and require application retention/access controls.
 */
export class SqliteSurfaceWorkflowStore implements SurfaceWorkflowStore {
  private readonly db: DatabaseSync;
  private active = false;
  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      CREATE TABLE IF NOT EXISTS svadmin_surface_revisions (
        tenant TEXT NOT NULL, surface TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision > 0),
        document TEXT NOT NULL, PRIMARY KEY(tenant, surface, revision)
      );
      CREATE TABLE IF NOT EXISTS svadmin_surface_proposals (
        tenant TEXT NOT NULL, id TEXT NOT NULL, requester TEXT NOT NULL, request_key TEXT NOT NULL,
        document TEXT NOT NULL, PRIMARY KEY(tenant, id), UNIQUE(tenant, requester, request_key)
      );
      CREATE TABLE IF NOT EXISTS svadmin_surface_audit (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT NOT NULL, surface TEXT NOT NULL,
        document TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS svadmin_surface_audit_scope ON svadmin_surface_audit(tenant, surface, sequence);
    `);
  }
  transaction<T>(work: (tx: SurfaceWorkflowTransaction) => T): T {
    if (this.active) throw new Error('Nested workflow transactions are not supported');
    this.db.exec('BEGIN IMMEDIATE');
    this.active = true;
    try {
      const result = work(this);
      if (result && typeof result === 'object' && 'then' in result) throw new Error('Workflow transactions must be synchronous');
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    } finally { this.active = false; }
  }
  private writing(): void {
    if (!this.active) throw new Error('Workflow writes must occur in an atomic transaction');
  }
  getRevision(tenantId: string, surfaceId: string, revision?: number): SurfaceStoredRevision | undefined {
    const row = revision === undefined
      ? this.db.prepare('SELECT document FROM svadmin_surface_revisions WHERE tenant = ? AND surface = ? ORDER BY revision DESC LIMIT 1').get(tenantId, surfaceId)
      : this.db.prepare('SELECT document FROM svadmin_surface_revisions WHERE tenant = ? AND surface = ? AND revision = ?').get(tenantId, surfaceId, revision);
    return row ? JSON.parse(String(row['document'])) as SurfaceStoredRevision : undefined;
  }
  putRevision(revision: SurfaceStoredRevision): void {
    this.writing();
    this.db.prepare('INSERT INTO svadmin_surface_revisions(tenant, surface, revision, document) VALUES (?, ?, ?, ?)')
      .run(revision.tenantId, revision.surfaceId, revision.revision, JSON.stringify(revision));
  }
  getProposal(tenantId: string, id: string): SurfaceActionProposal | undefined {
    const row = this.db.prepare('SELECT document FROM svadmin_surface_proposals WHERE tenant = ? AND id = ?').get(tenantId, id);
    return row ? JSON.parse(String(row['document'])) as SurfaceActionProposal : undefined;
  }
  findRequest(tenantId: string, requesterId: string, requestKey: string): SurfaceActionProposal | undefined {
    const row = this.db.prepare('SELECT document FROM svadmin_surface_proposals WHERE tenant = ? AND requester = ? AND request_key = ?')
      .get(tenantId, requesterId, requestKey);
    return row ? JSON.parse(String(row['document'])) as SurfaceActionProposal : undefined;
  }
  putProposal(proposal: SurfaceActionProposal): void {
    this.writing();
    this.db.prepare(`INSERT INTO svadmin_surface_proposals(tenant, id, requester, request_key, document)
      VALUES (?, ?, ?, ?, ?) ON CONFLICT(tenant, id) DO UPDATE SET document = excluded.document`)
      .run(proposal.tenantId, proposal.id, proposal.requesterId, proposal.requestKey, JSON.stringify(proposal));
  }
  audit(event: SurfaceWorkflowAuditEvent): void {
    this.writing();
    this.db.prepare('INSERT INTO svadmin_surface_audit(tenant, surface, document) VALUES (?, ?, ?)')
      .run(event.tenantId, event.surfaceId, JSON.stringify(event));
  }
  listAudit(tenantId: string, surfaceId: string, after: number, limit: number): readonly SurfaceWorkflowAuditEvent[] {
    return this.db.prepare('SELECT sequence, document FROM svadmin_surface_audit WHERE tenant = ? AND surface = ? AND sequence > ? ORDER BY sequence LIMIT ?')
      .all(tenantId, surfaceId, after, limit)
      .map((row) => ({ ...JSON.parse(String(row['document'])) as SurfaceWorkflowAuditEvent, sequence: Number(row['sequence']) }));
  }
  close(): void { this.db.close(); }
}
