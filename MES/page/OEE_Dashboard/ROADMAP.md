# OEE Dashboard - Module Roadmap & Architecture

## Current State & Known Limitations
- **Actual Cost Filtering by Team**: Currently, filtering Actual Cost by "Team" (HC Group) is disabled (it fallbacks to Standard Cost). 
- **Reason**: The `MES_MANUAL_DAILY_COSTS` table, which serves as a snapshot for fast dashboard rendering, only aggregates costs up to the `line` level via `sp_CalculateDailyCost`. The `team` (or `hc_group`) information from the Manpower system is discarded during this aggregation step.

## Proposed Architecture for "Team" Level Filtering (Actual Cost)
To support calculating and filtering Actual Cost by Team (where 1 Team = Multiple Lines), the following data pipeline changes are planned:

1. **Database Schema Update**
   - **Target**: `MES_MANUAL_DAILY_COSTS`
   - **Action**: Add a new column `team` (NVARCHAR).
   - **Purpose**: To retain the team context when syncing data from the Manpower module.

2. **Aggregation Pipeline Modification (Sync Job)**
   - **Target**: `sp_CalculateDailyCost`
   - **Action**: Modify the `GROUP BY` clause from `GROUP BY display_section` (line) to `GROUP BY display_section, hc_group`.
   - **Action**: Map the `hc_group` output from `fn_GetLaborCost_Split` into the new `team` column during the `INSERT` operation.

3. **API Data Retrieval Update**
   - **Target (SQL)**: `sp_CalculateActualCostSummary` (The procedure used by OEE Dashboard)
   - **Action**: Add support for filtering by the new column, e.g., `AND (@Team IS NULL OR [team] = @Team)`.
   - **Target (PHP)**: `page/OEE_Dashboard/api/oeeDashboardApi.php`
   - **Action**: Remove the Fallback mechanism for Actual Cost when a Team is selected. Allow the API to pass the `@Team` parameter down to the SP to fetch the accurate, team-level cost.

## Future Enhancements
- TBD
