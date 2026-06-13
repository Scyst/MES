# Original User Request

## Initial Request — 2026-06-13T01:29:50Z

# Teamwork Project Prompt

> Status: Launched

Create a Markdown file containing a Mermaid diagram that visualizes the transition from a line-based to a machine-based production recording system. The diagram must integrate new components (`page/PE`, `mes-mobile-app`) with existing legacy components (`page/OEE_Dashboard`, `page/production`).

Working directory: e:\MES\MES\MES\docs
Integrity mode: development

## Requirements

### R1. Phase Division
The diagram must visually structure the workflow into distinct phases (e.g., Incoming, Production, Outgoing), similar to the reference concept.

### R2. Machine-Based Focus
The flow must clearly depict data being recorded at the individual *machine* level rather than the production *line* level.

### R3. System Integration
The diagram must explicitly include and connect:
- **New Systems:** `page/PE`, `mes-mobile-app`
- **Legacy Systems:** `page/OEE_Dashboard`, `page/production`

## Acceptance Criteria

### Verification
- [ ] A `.md` file named `architecture_map.md` is generated in `e:\MES\MES\MES\docs`.
- [ ] The file contains a syntactically valid `mermaid` code block.
- [ ] All 4 specific systems (`page/PE`, `mes-mobile-app`, `page/OEE_Dashboard`, `page/production`) are present as distinct nodes in the diagram.
- [ ] The diagram structurally shows "Machine" nodes feeding data into the systems, rather than generic "Line" nodes.
