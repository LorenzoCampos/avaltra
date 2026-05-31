package migrations

import (
	"os"
	"strings"
	"testing"
)

func TestCreatePlaceTransfersMigrations(t *testing.T) {
	tests := map[string][]string{
		"026_create_place_transfers.up.sql": {
			"CREATE TABLE IF NOT EXISTS place_transfers",
			"account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE",
			"source_container_id UUID NOT NULL REFERENCES payment_containers(id) ON DELETE RESTRICT",
			"destination_container_id UUID NOT NULL REFERENCES payment_containers(id) ON DELETE RESTRICT",
			"amount NUMERIC(15,2) NOT NULL",
			"currency currency NOT NULL DEFAULT 'ARS'",
			"CONSTRAINT place_transfers_amount_positive CHECK (amount > 0)",
			"CONSTRAINT place_transfers_distinct_containers CHECK (source_container_id <> destination_container_id)",
			"CREATE INDEX IF NOT EXISTS idx_place_transfers_account_date ON place_transfers(account_id, date DESC)",
		},
		"026_create_place_transfers.down.sql": {
			"DROP INDEX IF EXISTS idx_place_transfers_destination_container",
			"DROP INDEX IF EXISTS idx_place_transfers_source_container",
			"DROP INDEX IF EXISTS idx_place_transfers_account_date",
			"DROP TABLE IF EXISTS place_transfers",
		},
	}
	for name, fragments := range tests {
		content, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		for _, fragment := range fragments {
			if !strings.Contains(string(content), fragment) {
				t.Fatalf("%s missing fragment %q", name, fragment)
			}
		}
	}
}

func TestSavingsGoalsUsePlacesMigration(t *testing.T) {
	tests := map[string][]string{
		"027_savings_goals_use_places.up.sql": {
			"ADD COLUMN IF NOT EXISTS saved_container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL",
			"ADD COLUMN IF NOT EXISTS container_id UUID NULL REFERENCES payment_containers(id) ON DELETE SET NULL",
			"idx_savings_goals_saved_container_id",
			"idx_savings_goal_transactions_container_id",
			"Does not backfill from saved_in",
		},
		"027_savings_goals_use_places.down.sql": {
			"DROP INDEX IF EXISTS idx_savings_goal_transactions_container_id",
			"DROP INDEX IF EXISTS idx_savings_goals_saved_container_id",
			"DROP COLUMN IF EXISTS container_id",
			"DROP COLUMN IF EXISTS saved_container_id",
		},
	}
	for name, fragments := range tests {
		content, err := os.ReadFile(name)
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		for _, fragment := range fragments {
			if !strings.Contains(string(content), fragment) {
				t.Fatalf("%s missing fragment %q", name, fragment)
			}
		}
	}
}
