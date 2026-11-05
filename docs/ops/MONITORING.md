# Monitoring and error tracking (OPS-03)

## Signals already in the app

| Signal                | Where                                                         |
| --------------------- | ------------------------------------------------------------- |
| Liveness/readiness    | `GET /api/health` → `200` when PostgreSQL answers, `503` otherwise |
| Structured logs       | `src/lib/logger.ts` emits JSON events such as `auth.*`, `jobs.*`, `email.*`, `audit.*` |
| Background jobs       | pg-boss schema `JOBS_SCHEMA` (default `pgboss`)              |
| Reminder sweep        | worker logs `notifications.reminder_sweep` with due/notification/e-mail counts |
| Audit trail           | `/settings/audit` and the `audit_logs` table                  |

`/api/health` never exposes tenant data or secrets. Its response includes
`version`, `uptimeSeconds`, and `checks.database`/`durationMs`.

## Minimum production checks

| Check | Tool | Alert threshold |
| ----- | ---- | --------------- |
| HTTPS + `/api/health` | External uptime monitor every 60 s | 2 consecutive failures (2 min) |
| Web CPU/memory | Host metrics (node_exporter / provider agent) | CPU > 85% for 10 min, memory > 90% |
| Disk usage | Host metrics | > 80% warning, > 90% critical |
| PostgreSQL connections | `pg_stat_activity` | > 80% of `max_connections` |
| PostgreSQL disk | Host metrics | > 80% |
| Queue failures | `pgboss.job` query below | Any failed job or retry backlog > 20 |
| Worker liveness | `jobs.worker_ready` heartbeat + process uptime | No heartbeat for 10 min |
| Reminder sweep | Log event `notifications.reminder_sweep` | Missing after the scheduled time |
| E-mail failures | Log events `email.*_failed` | > 5 in 15 min |
| TLS certificate | Uptime monitor | < 21 days to expiry |
| Backup freshness | File/S3 object age | Newest dump > 26 h old |
| Auth abuse | `rate_limit` / sign-in failure logs | Spike above baseline |

### Queue health query

Run against the application database:

```sql
-- Replace pgboss with JOBS_SCHEMA if customised.
SELECT name, state, count(*)
FROM pgboss.job
WHERE created_on > now() - interval '24 hours'
GROUP BY name, state
ORDER BY name, state;

SELECT name, state, count(*), max(created_on) AS newest
FROM pgboss.job
WHERE state IN ('failed', 'retry')
GROUP BY name, state;

SELECT * FROM pgboss.schedule WHERE name = 'notifications.reminder-sweep';
```

A failed job beyond its retry limit means the handler threw. Inspect the worker
logs for the matching `jobs.processing` / error entry before re-enqueueing.

### Audit volume check

```sql
SELECT date_trunc('hour', created_at) AS hour, count(*)
FROM audit_logs
GROUP BY 1
ORDER BY 1 DESC
LIMIT 24;
```

A sudden drop can indicate an audit write failure (audit writes are
best-effort and never block the business action, by design).

## Error tracking

The logger is a single seam: `src/lib/logger.ts`. To add Sentry/GlitchTip or
another tracker:

1. Initialise the SDK in `src/instrumentation.ts` (server) with the DSN from
   `SENTRY_DSN` / provider-specific env var — never hard-code it.
2. Forward `logger.error`/`logger.warn` payloads to the tracker, redacting
   e-mail addresses, tokens, and document names where required by policy.
3. Tag events with `firmId` only as an internal identifier; never attach file
   contents or request bodies containing personal data.
4. Add the DSN to `.env.production.example` and the deployment docs once chosen.

Until a tracker is configured, ship logs to a durable sink (e.g. Loki,
CloudWatch, or a provider log drain). Container logs are lost on recreation.

## Dashboards

Recommended panels:

- Requests per minute and p95 latency by route (reverse-proxy access logs).
- 4xx/5xx rate; alert on 5xx > 1% for 5 min.
- Health check status and database check duration.
- Job throughput by queue name and failed/retry counts.
- Reminder sweep counts (`dueTasks`, `notifications`, `emails`).
- PostgreSQL connections, cache hit ratio, disk, and slow queries.
- Storage bucket size and object count growth.

## Incident runbook

1. Confirm scope from the external monitor and `/api/health`.
2. Check `docker compose ps`, then `logs web --tail=200` and
   `logs worker --tail=200`.
3. If the database is down or full, stop the worker to prevent retry storms,
   free space, and follow the restore drill in [BACKUPS.md](./BACKUPS.md).
4. If jobs are failing, verify SMTP and S3 connectivity before re-enqueueing.
5. After recovery, confirm audit writes resumed and record the incident.
