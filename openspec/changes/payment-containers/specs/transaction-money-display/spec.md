# Delta for transaction-money-display

## ADDED Requirements

### Requirement: Payment Context Labels Preserve Money Formatting Rules

When transaction entries include container/instrument context, the system MUST treat those labels as supplemental metadata. Existing money-format and dual-currency rules SHALL remain unchanged.

#### Scenario: Supplemental context on mismatched currency row
- GIVEN a transaction row with currency mismatch and normalized container/instrument labels
- WHEN the row is rendered
- THEN dual-currency rendering SHALL follow existing requirements
- AND container/instrument labels SHALL appear without altering amount formatting

#### Scenario: Legacy fallback still compatible
- GIVEN a transaction row without normalized links and with legacy `payment_method`
- WHEN the row is rendered
- THEN money display SHALL remain governed by existing formatter rules
- AND payment context SHALL fallback to legacy label behavior
