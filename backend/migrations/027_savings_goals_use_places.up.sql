ALTER TABLE savings_goals
    ADD COLUMN IF NOT EXISTS saved_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL;

ALTER TABLE savings_goal_transactions
    ADD COLUMN IF NOT EXISTS container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_savings_goals_saved_container_id
    ON savings_goals(saved_container_id);

CREATE INDEX IF NOT EXISTS idx_savings_goal_transactions_container_id
    ON savings_goal_transactions(container_id);

COMMENT ON COLUMN savings_goals.saved_container_id IS 'Validated place/container where savings goal money is stored; NULL means unassigned/legacy. Does not backfill from saved_in.';
COMMENT ON COLUMN savings_goal_transactions.container_id IS 'Snapshot place/container attribution for migration-forward savings movements; NULL means unassigned historical or explicitly unassigned.';
