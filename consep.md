# API Bridge — Concept & Process

**Stack**: Node.js + Express.js, PostgreSQL, Redis (cache), RabbitMQ (with DLX), Swagger (OpenAPI), Grafana (monitoring). Sync modes: Cron (scheduled), Manual (operator/API), On-demand Incremental Sync (lastUpdated).

---

## 1. Ringkasan Tujuan

Dokumen ini menjelaskan desain arsitektur, alur data, skema database, detail messaging (RabbitMQ + DLX), strategi caching (Redis), endpoint API, pola sinkronisasi incremental (lastUpdated), handling pagination, retry & backoff, monitoring (Grafana), dokumentasi (Swagger), dan best-practices operasional.

---

## 2. High-level Architecture

```
[Internal Systems] <-HTTPS-> [API Bridge (Express)] <-DB/Cache-> [Postgres] [Redis]
                                         |
                                         +--> [RabbitMQ] -> [Workers] -> [NetSuite API]
                                                               ^
                                                               |
                                                            [DLX/Retry]

Monitoring: Metrics -> Prometheus -> Grafana
Logging: Structured logs -> Loki / ELK

Swagger UI served by API Bridge
```

Komponen:

* API Gateway / Express app
* Sync Worker(s) yang konsumsi queue RabbitMQ
* PostgreSQL sebagai source of truth lokal
* Redis untuk cache read-through
* RabbitMQ untuk job queue, DLX & retry
* Swagger/OpenAPI untuk dokumentasi
* Grafana + Prometheus untuk monitoring

---

## 3. Data Model (Contoh tabel penting)

### `customers`

```
- id SERIAL PRIMARY KEY
- netsuite_id VARCHAR UNIQUE
- name TEXT
- email VARCHAR
- phone VARCHAR
- data JSONB           -- raw mapped payload
- last_modified_netsuite TIMESTAMP WITH TIME ZONE
- created_at TIMESTAMP DEFAULT now()
- updated_at TIMESTAMP DEFAULT now()
- is_deleted BOOLEAN DEFAULT false
```

### `sync_tracker`

```
- id SERIAL PRIMARY KEY
- module VARCHAR   -- 'customer','product'
- last_sync_at TIMESTAMP WITH TIME ZONE
- last_synced_batch_max TIMESTAMP WITH TIME ZONE
- status VARCHAR
- remark TEXT
- created_at TIMESTAMP
```

### `sync_jobs` (optional)

```
- id SERIAL PRIMARY KEY
- job_id UUID
- module VARCHAR
- params JSONB
- status VARCHAR -- pending, processing, success, failed
- attempts INT
- last_error TEXT
- created_at, updated_at
```

### `failed_jobs`

```
- id SERIAL
- job_id UUID
- payload JSONB
- error TEXT
- created_at
```

---

## 4. RabbitMQ Topology & DLX

### Exchanges & queues

* Exchange `ns.jobs` (direct / topic)
* Queue `ns.sync.customer` bound to `ns.jobs` with routing key `sync.customer`
* DLX exchange `ns.dlx` with queue `ns.dlx.customer`
* Retry queues pattern: `ns.retry.customer.1s`, `ns.retry.customer.10s`, `ns.retry.customer.1m`

### Message format (example)

```json
{
  "jobId":"<uuid>",
  "module":"customer",
  "type":"incremental_sync",
  "params":{
    "since":"2025-11-30T09:00:00Z",
    "page":1,
    "pageSize":500
  },
  "attempts":0
}
```

### DLX & Retry pattern

* Worker nack() message on failure with requeue=false.
* Message routed to retry queue with TTL.
* After TTL message dead-letters into main queue for retry.
* After N attempts route to `ns.dlx` queue for manual inspection.

---

## 5. Redis Cache Strategy

### Keys & TTL

* `customer:{netsuite_id}` => JSON (TTL 12h default)
* `customer:list:page:{paramsHash}` => JSON (TTL 5m)
* `sync:lastSync:customer` => string timestamp (no TTL)

### Patterns

* Read-through: API checks Redis first; if miss -> read DB; if DB miss or stale -> queue sync OR call NetSuite directly (on-demand) -> persist DB -> set cache.
* Cache invalidation: after write/update to DB, invalidate/update Redis key. Use `PUB/SUB` if many instances.

---

## 6. Sync Modes & Flows

### 6.1 On-demand Incremental Sync (API GET request)

1. Internal calls `GET /api/v1/customers/:id` or `GET /api/v1/customers?sku=...`.
2. API Bridge checks Redis cache.

   * HIT: return cached data.
   * MISS: check local Postgres.

     * FOUND & fresh (based on `last_modified_netsuite` + TTL): return.
     * FOUND but stale / NOT FOUND: enqueue incremental sync job (params: since = sync_tracker.last_sync or customer's last_modified) and optionally return 202 Accepted with location to job status OR serve DB data while worker refreshes in background.
3. Worker consumes job -> request to NetSuite with `lastModifiedDate > since` + pagination.
4. Worker upserts rows into Postgres, updates `last_modified_netsuite` field, updates `sync_tracker`.
5. Worker invalidates & updates Redis cache for affected keys.
6. Internal client can poll job status if desired.

**Notes**: For synchronous blocking GET (user wants fresh data immediately), API can be configured to wait for worker to finish but beware latency. Prefer returning DB data (stale) + async refresh.

### 6.2 Scheduled Cron Sync (Batch)

* Cron triggers a job every X minutes/hours depending module TTL.
* Cron enqueues `sync.full` or `sync.incremental` jobs with `since=last_sync`
* Workers process sequentially with per-module concurrency limits.
* On success update `sync_tracker.last_sync_at` to maximum `lastModifiedDate` observed.

### 6.3 Manual Trigger

* Admin UI or `POST /admin/sync` with body `{ module, since }`.
* Creates a `sync_jobs` record & enqueues message.
* Admin can view job logs and force re-run or mark as resolved.

---

## 7. Pagination & Large Data Handling

* Use NetSuite pagination (e.g. page, pageSize or searchMoreWithId for SOAP/SuiteTalk).
* Worker should loop pages; commit DB in transactional batches (e.g. upsert in chunk of 500–1000 rows).
* Use streaming when possible to limit memory.

---

## 8. Idempotency & Upsert Strategy

* Use `netsuite_id` as unique key.
* Upsert semantics (Postgres `INSERT ... ON CONFLICT (netsuite_id) DO UPDATE SET ...`), only update columns when `last_modified_netsuite` is newer than stored value.
* Worker must compare `lastModifiedDate` from NetSuite against DB `last_modified_netsuite` to avoid overwriting newer local changes.

---

## 9. Error Handling & Retry Logic

* Transient failures: use exponential backoff via retry queues in RabbitMQ.
* Permanent failures: after N attempts -> send to DLX & create `failed_jobs` row + alert.
* Transactional safety: each batch upsert should be atomic per page. If a page fails, retry the whole page.

---

## 10. Concurrency Control & Rate Limit

* Limit parallel workers per module to protect NetSuite rate limits (configurable concurrency).
* Implement a Token Bucket or Leaky Bucket limiter if necessary.
* Respect NetSuite response headers for rate limits (if provided), and slow down.

---

## 11. API Endpoints (Example)

```
GET  /api/v1/customers?filter...      -> read (cache -> db -> enqueue job if stale)
GET  /api/v1/customers/:id            -> read single
POST /admin/sync                      -> trigger manual sync
GET  /admin/sync/{jobId}              -> job status
GET  /admin/metrics                   -> expose Prometheus metrics
```

Responses:

* For read endpoints: prefer 200 with DB data; when enqueueing refresh return `X-Sync-Triggered: true` header or 202 if you choose asynchronous flow.

---

## 12. Swagger / OpenAPI

* Serve OpenAPI spec at `/docs` and Swagger UI.
* Document endpoints including examples for `202 Accepted` asynchronous responses and job payload.

---

## 13. Monitoring & Metrics (Grafana)

**Emit Prometheus metrics from API & Workers**:

* `api_requests_total{endpoint,method,status}`
* `api_request_duration_seconds_bucket{endpoint}`
* `sync_jobs_processed_total{module}`
* `sync_jobs_failed_total{module}`
* `netsuite_requests_total{module,status}`
* `netsuite_rate_limit_remaining`
* `redis_cache_hits_total`, `redis_cache_misses_total`
* `rabbitmq_queue_length{queue}` (scrape RabbitMQ exporter)

**Dashboards**:

* API latency & error rates
* Sync throughput per module
* Redis hit/miss ratio
* Pending jobs & DLX queue size
* NetSuite rate usage & throttles

Alerting:

* Job failure spikes
* DLX queue non-empty
* High error rates from NetSuite
* Redis outage / high miss rate

---

## 14. Security

* Internal Auth: JWT or mTLS between internal systems and API Bridge.
* Admin endpoints: IP-restrict, 2FA on admin console.
* NetSuite: Token Based Authentication (TBA) or OAuth2 stored securely in Vault (HashiCorp / AWS Secrets Manager).
* Database credentials, RabbitMQ credentials, Redis passwords in Vault / env with least privilege.
* Sanitize and validate all payloads.

---

## 15. Testing Strategy

* Unit tests for transformers and DB upsert logic.
* Integration tests using NetSuite sandbox (or mocked NetSuite server).
* Contract tests for message payloads.
* Load tests for expected concurrency (k6 / Artillery).

---

## 16. Operational Runbook (singkat)

* How to re-run failed job: Admin -> requeue job via UI or CLI.
* How to escalate DLX items: view `failed_jobs` -> inspect error -> requeue or manual patch.
* Rolling deploy: drain workers (stop consuming), deploy, resume.

---

## 17. Implementation Snippets (Pseudo)

**Enqueue job (Express)**

```js
// enqueue incremental sync
const job = {
  jobId: uuid(), module:'customer', type:'incremental_sync',
  params:{ since: lastSync, page:1, pageSize:500 }, attempts:0
};
await rabbit.publish('ns.jobs', 'sync.customer', job);
await db.insert('sync_jobs', { job_id: job.jobId, module:'customer', params: job.params, status:'pending' });
```

**Worker (consume)**

```js
channel.consume('ns.sync.customer', async msg => {
  const job = JSON.parse(msg.content.toString());
  try {
    await processIncremental(job.params);
    channel.ack(msg);
    updateJobStatus(job.jobId,'success');
  } catch(err) {
    // publish to retry / DLX via nack
    channel.nack(msg, false, false);
    updateJobStatus(job.jobId,'failed', err.message);
  }
});
```

---

## 18. Checklist sebelum go-live

* [ ] NetSuite sandbox integration working
* [ ] DB schema & indexes optimized for upsert
* [ ] Retry + DLX pipeline tested
* [ ] Redis cache hit/miss tested
* [ ] Prometheus metrics instrumented
* [ ] Grafana dashboards + alerts configured
* [ ] Swagger docs complete
* [ ] Security: secrets in Vault
* [ ] Runbook & rollback steps documented

---

## 19. Next Steps (recommended)

1. Buat prototype minimal: sync single module `customer` with on-demand incremental + Redis cache + simple worker + DLX.
2. Load test prototype and tune pageSize & concurrency.
3. Expand to other modules and schedule jobs.
4. Harden auth, monitoring, and ops.

---

Jika kamu mau, saya bisa:

* Generate Postgres migration SQL untuk tabel di atas
* Buatkan contoh implementasi worker + enqueue + upsert di Node.js (TypeScript)
* Buatkan OpenAPI (Swagger) spec skeleton

Ketik: `Buatkan prototype worker` atau `Buatkan OpenAPI spec` untuk saya buatkan file-nya.
