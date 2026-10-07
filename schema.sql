CREATE TABLE IF NOT EXISTS assessments (
 id TEXT PRIMARY KEY,
 access_token TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'IN_ASSESSMENT',
 agent_name TEXT NOT NULL,
 workflow_name TEXT NOT NULL,
 scope TEXT NOT NULL,
 summary TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS assessment_tests (
 id TEXT PRIMARY KEY,
 assessment_id TEXT NOT NULL,
 category TEXT NOT NULL,
 scenario TEXT NOT NULL,
 expected_decision TEXT NOT NULL,
 observed_decision TEXT NOT NULL,
 status TEXT NOT NULL,
 FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);
CREATE TABLE IF NOT EXISTS findings (
 id TEXT PRIMARY KEY,
 assessment_id TEXT NOT NULL,
 title TEXT NOT NULL,
 severity TEXT NOT NULL,
 severity_rank INTEGER NOT NULL DEFAULT 0,
 status TEXT NOT NULL,
 declared_authority TEXT NOT NULL,
 observed_capability TEXT NOT NULL,
 business_impact TEXT NOT NULL,
 recommendation TEXT NOT NULL,
 FOREIGN KEY (assessment_id) REFERENCES assessments(id)
);
CREATE INDEX IF NOT EXISTS idx_assessments_token ON assessments(access_token);
CREATE INDEX IF NOT EXISTS idx_tests_assessment ON assessment_tests(assessment_id);
CREATE INDEX IF NOT EXISTS idx_findings_assessment ON findings(assessment_id);
