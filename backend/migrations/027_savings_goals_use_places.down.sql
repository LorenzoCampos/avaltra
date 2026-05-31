DROP INDEX IF EXISTS idx_savings_goal_transactions_container_id;
DROP INDEX IF EXISTS idx_savings_goals_saved_container_id;

ALTER TABLE savings_goal_transactions
    DROP COLUMN IF EXISTS container_id;

ALTER TABLE savings_goals
    DROP COLUMN IF EXISTS saved_container_id;
