# Delta for payment-containers

## MODIFIED Requirements

### Requirement: Mini Breakdown by Money Location
Dashboard/home MUST expose a compact breakdown of money by container/location for v1. The breakdown SHOULD support container type grouping and MUST tolerate partial unmigrated data. The breakdown MUST include place-transfer inflows and outflows so moved money is reflected in source and destination container balances.

(Previously: mini breakdown grouped amounts by container/location from transaction context and unmapped buckets, without explicit transfer inflow/outflow inclusion.)

#### Scenario: Mixed migrated and unmigrated data
- GIVEN some transactions have normalized links and some do not
- WHEN the mini breakdown is rendered
- THEN linked amounts SHALL be grouped by container/location
- AND unmapped amounts SHALL be included in an explicit unknown/unassigned bucket

#### Scenario: Transfer updates source and destination containers
- GIVEN a transfer of amount A from place S to place D in the active account
- WHEN money-by-container is recalculated
- THEN place S SHALL decrease by A and place D SHALL increase by A
- AND net account money-by-container sum SHALL remain balanced

#### Scenario: Transfer does not affect P&L totals
- GIVEN one or more persisted place transfers
- WHEN dashboard totals are calculated
- THEN income and expense totals SHALL remain unchanged by those transfers
- AND P&L SHALL remain unchanged by transfer-only activity
