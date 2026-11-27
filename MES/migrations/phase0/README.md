# Phase 0 SQL Migrations (`IIOT_TOOLBOX`)

> **CRITICAL:** Execute these scripts in exact numerical order during a brief maintenance window (5–10 minutes) **BEFORE** deploying the Phase 0 PHP/React code.

## Execution Order
1. Verify backup file `00_backup_existing_sps.sql` is accessible (do NOT execute it during forward deploy; it is for emergency rollback).
2. Run `01_schema_migration_phase0.sql` — Adds `INVENTORY_ONHAND.stock_type` (`UNRESTRICTED` | `QUALITY_INSPECTION` | `BLOCKED_SCRAP`) and `STOCK_TRANSACTIONS` immutable reversal columns.
3. Run `02_sp_update_onhand_balance.sql` — Upgrades `sp_UpdateOnhandBalance` with `@stock_type` (default `'UNRESTRICTED'`).
4. Run `03_sp_execute_production.sql` — Fixes FG/HOLD/SCRAP stock segregation, Active BOM filter, `@job_id` stamping, OUTPUT `transaction_id`, and Nested Transaction `SAVEPOINT` safety.
5. Run `04_sp_reverse_production_transaction.sql` — Adds `sp_ReverseProductionTransaction` (fixes CONSUMPTION sign bug, eliminates Hard Delete) and updates `sp_Job_DeleteTransaction` to delegate to it.

## Post-Migration Verification Query
```sql
SELECT COL_LENGTH('dbo.INVENTORY_ONHAND', 'stock_type') AS onhand_stock_type_len,
       COL_LENGTH('dbo.STOCK_TRANSACTIONS', 'is_reversed') AS txn_is_reversed_len,
       OBJECT_ID('dbo.sp_ReverseProductionTransaction', 'P') AS rev_sp_id;
```

## Emergency Rollback
1. Run `99_rollback_phase0.sql` (uncommenting the schema rollback block if rolling back PHP code too).
2. Run `00_backup_existing_sps.sql` to restore original Stored Procedures.
