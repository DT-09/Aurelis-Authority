CREATE TABLE IF NOT EXISTS inbound_leads (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, company TEXT NOT NULL DEFAULT '', role TEXT NOT NULL DEFAULT '', buyer_type TEXT NOT NULL, workflow TEXT NOT NULL, urgency TEXT NOT NULL, trace_readiness TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'direct', landing_path TEXT NOT NULL DEFAULT '/', created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'NEW', consent_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_inbound_leads_created ON inbound_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbound_leads_email_created ON inbound_leads(email,created_at DESC);
CREATE TABLE IF NOT EXISTS inbound_metrics (
 event_date TEXT NOT NULL, event_name TEXT NOT NULL, source TEXT NOT NULL, event_count INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(event_date,event_name,source)
);
CREATE INDEX IF NOT EXISTS idx_inbound_metrics_date ON inbound_metrics(event_date DESC);
