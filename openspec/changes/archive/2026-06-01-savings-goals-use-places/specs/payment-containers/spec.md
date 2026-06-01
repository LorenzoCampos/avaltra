# Delta for payment-containers

## MODIFIED Requirements

### Requirement: Mini Breakdown by Money Location
Dashboard/home MUST expose a compact breakdown of money by container/location for v1. The breakdown SHOULD support container type grouping and MUST tolerate partial unmigrated data. The breakdown MUST include active place-transfer inflows and outflows so moved money is reflected in source and destination container balances. The breakdown MUST include migration-forward savings deposits/withdrawals with exact place attribution. Savings movement without place linkage (historical pre-migration) MUST be included only in an explicit unassigned historical savings bucket. Canceled transfers MUST be excluded from money-by-container calculations.

(Previously: mini breakdown included normalized transactions and place transfers, but did not require explicit handling of migration-forward savings attribution plus historical unassigned savings movement.)

#### Scenario: Mixed migrated and unmigrated data
- GIVEN some transactions have normalized links and some do not
- WHEN the mini breakdown is rendered
- THEN linked amounts SHALL be grouped by container/location
- AND unmapped amounts SHALL be included in an explicit unknown/unassigned bucket

#### Scenario: Transfer updates source and destination containers
- GIVEN an active transfer of amount A from place S to place D in the active account
- WHEN money-by-container is recalculated
- THEN place S SHALL decrease by A and place D SHALL increase by A
- AND net account money-by-container sum SHALL remain balanced

#### Scenario: Transfer does not affect P&L totals
- GIVEN one or more persisted place transfers
- WHEN dashboard totals are calculated
- THEN income and expense totals SHALL remain unchanged by those transfers
- AND P&L SHALL remain unchanged by transfer-only activity

#### Scenario: Canceled transfer is excluded from mini breakdown
- GIVEN a previously active transfer was canceled
- WHEN money-by-container is recalculated
- THEN the canceled transfer SHALL contribute zero movement to both involved places

#### Scenario: Attributed savings movement updates place balances
- GIVEN a migration-forward savings deposit or withdrawal with exact place attribution
- WHEN money-by-container is recalculated
- THEN the attributed savings movement SHALL affect that place balance by the recorded direction and amount

#### Scenario: Historical savings without place stays unassigned
- GIVEN savings movement was recorded before place attribution existed
- WHEN money-by-container is recalculated
- THEN the movement SHALL NOT be assigned to any specific place
- AND it SHALL be reported in unassigned historical savings movement
