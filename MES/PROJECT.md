# Project: MES Production Recording Diagram

## Architecture
This project visualizes the transition from a line-based production recording system to a machine-based system.
Data flows from individual machine nodes to legacy and new components instead of generic line-level aggregation.

### Key Components:
1. **Legacy Systems:** `page/production`, `page/OEE_Dashboard`
2. **New Systems:** `page/PE`, `mes-mobile-app`
3. **Physical Sources:** Machine nodes (replacing Line nodes)

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Create Diagram | Generate architecture_map.md containing the Mermaid diagram under e:\MES\MES\MES\docs\ | None | PLANNED |

## Interface Contracts
- Input: Requirements in ORIGINAL_REQUEST.md
- Output: `e:\MES\MES\MES\docs\architecture_map.md` with syntactically valid `mermaid` code block.

## Code Layout
- Document path: `e:\MES\MES\MES\docs\architecture_map.md`
