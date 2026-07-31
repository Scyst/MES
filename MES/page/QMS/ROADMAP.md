# QMS Module Roadmap & Documentation

## Concession Module
**Pending Decision: Customer Approver Workflow**
Currently, the concession module assigns approvals. However, since the final approver may be an external customer (who does not have a system account), we need a workflow to handle this.
Three potential solutions have been proposed to QA/QC:
1. **Online Token Link (Recommended):** Generate a unique link similar to CAR, allowing the customer to review and approve without a login.
2. **Offline Print & Sign:** Select "External Customer" as the approver, print the blank PDF, get a physical signature, and upload the signed document back into the system to close the case.
3. **Proxy Approval:** The internal user approves on behalf of the customer, but the system strictly requires an evidence file upload (e.g., email confirmation screenshot or PDF).

*Awaiting final decision from QA/QC team before implementation.*
