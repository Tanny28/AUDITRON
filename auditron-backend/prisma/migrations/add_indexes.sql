-- Database Performance Optimization
-- Add indexes for common queries

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON "User"(email);
CREATE INDEX IF NOT EXISTS idx_users_org_id ON "User"("orgId");
CREATE INDEX IF NOT EXISTS idx_users_created_at ON "User"("createdAt" DESC);

-- Organizations table indexes
CREATE INDEX IF NOT EXISTS idx_orgs_stripe_customer ON "Organization"("stripeCustomerId") WHERE "stripeCustomerId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orgs_subscription_status ON "Organization"("subscriptionStatus");

-- Invoices table indexes
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON "Invoice"("orgId");
CREATE INDEX IF NOT EXISTS idx_invoices_org_date ON "Invoice"("orgId", "invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS idx_invoices_org_status ON "Invoice"("orgId", "status");
CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON "Invoice"("vendorName");
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON "Invoice"("createdAt" DESC);

-- Transactions table indexes
CREATE INDEX IF NOT EXISTS idx_transactions_org_id ON "Transaction"("orgId");
CREATE INDEX IF NOT EXISTS idx_transactions_org_date ON "Transaction"("orgId", "transactionDate" DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON "Transaction"("type");
CREATE INDEX IF NOT EXISTS idx_transactions_category ON "Transaction"("category");
CREATE INDEX IF NOT EXISTS idx_transactions_org_type_date ON "Transaction"("orgId", "type", "transactionDate" DESC);

-- Agent Jobs table indexes
CREATE INDEX IF NOT EXISTS idx_agent_jobs_org_id ON "AgentJob"("orgId");
CREATE INDEX IF NOT EXISTS idx_agent_jobs_status ON "AgentJob"("status");
CREATE INDEX IF NOT EXISTS idx_agent_jobs_org_status ON "AgentJob"("orgId", "status");
CREATE INDEX IF NOT EXISTS idx_agent_jobs_created_at ON "AgentJob"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_agent_jobs_workflow ON "AgentJob"("workflowType");

-- Agent Logs table indexes
CREATE INDEX IF NOT EXISTS idx_agent_logs_job_id ON "AgentLog"("jobId");
CREATE INDEX IF NOT EXISTS idx_agent_logs_created_at ON "AgentLog"("createdAt" DESC);

-- Reconciliation Matches table indexes
CREATE INDEX IF NOT EXISTS idx_recon_matches_org_id ON "ReconciliationMatch"("orgId");
CREATE INDEX IF NOT EXISTS idx_recon_matches_invoice_id ON "ReconciliationMatch"("invoiceId");
CREATE INDEX IF NOT EXISTS idx_recon_matches_transaction_id ON "ReconciliationMatch"("transactionId");
CREATE INDEX IF NOT EXISTS idx_recon_matches_confidence ON "ReconciliationMatch"("confidenceScore" DESC);

-- API Keys table indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON "ApiKey"("orgId");
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON "ApiKey"("active") WHERE "active" = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_org_active ON "ApiKey"("orgId", "active");
CREATE INDEX IF NOT EXISTS idx_api_keys_hashed ON "ApiKey"("hashedKey");

-- Organization Invites table indexes
CREATE INDEX IF NOT EXISTS idx_org_invites_org_id ON "OrganizationInvite"("orgId");
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON "OrganizationInvite"("email");
CREATE INDEX IF NOT EXISTS idx_org_invites_token ON "OrganizationInvite"("inviteToken");
CREATE INDEX IF NOT EXISTS idx_org_invites_expires ON "OrganizationInvite"("expiresAt") WHERE "expiresAt" > NOW();

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_invoices_org_vendor_date ON "Invoice"("orgId", "vendorName", "invoiceDate" DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_org_category_date ON "Transaction"("orgId", "category", "transactionDate" DESC);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_invoices_pending ON "Invoice"("orgId", "invoiceDate" DESC) WHERE "status" = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_agent_jobs_running ON "AgentJob"("orgId", "createdAt" DESC) WHERE "status" IN ('PENDING', 'RUNNING');

-- Full-text search indexes (if using PostgreSQL)
CREATE INDEX IF NOT EXISTS idx_invoices_vendor_search ON "Invoice" USING gin(to_tsvector('english', "vendorName"));
CREATE INDEX IF NOT EXISTS idx_transactions_description_search ON "Transaction" USING gin(to_tsvector('english', "description"));

-- Analyze tables to update statistics
ANALYZE "User";
ANALYZE "Organization";
ANALYZE "Invoice";
ANALYZE "Transaction";
ANALYZE "AgentJob";
ANALYZE "AgentLog";
ANALYZE "ReconciliationMatch";
ANALYZE "ApiKey";
ANALYZE "OrganizationInvite";
