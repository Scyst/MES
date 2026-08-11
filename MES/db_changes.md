# Database Schema Changes Tracking

## 2026-08-11: Team Logging Schema
- Added `STOCK_TRANSACTION_USERS` table to track team members involved in transactions and compute Income Per Head ratios.
```sql
CREATE TABLE dbo.STOCK_TRANSACTION_USERS (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    transaction_id BIGINT NOT NULL,
    user_id INT NOT NULL,
    head_count_ratio DECIMAL(10,4) DEFAULT 1.0,
    created_at DATETIME DEFAULT GETDATE()
);
CREATE INDEX IX_STOCK_TRANSACTION_USERS_TxnId ON dbo.STOCK_TRANSACTION_USERS(transaction_id);
```
- Altered `sp_ExecuteProduction` to accept `@team_user_ids VARCHAR(MAX) = NULL` and insert members into `STOCK_TRANSACTION_USERS` splitting `head_count_ratio` evenly.
