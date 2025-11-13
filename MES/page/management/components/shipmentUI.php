<?php
// ไฟล์: MES/page/management/components/shipmentUI.php
?>

<div class="card shadow-sm d-flex flex-column flex-grow-1" style="min-height: 0;">    
    <div class="card-header">
        <div class="row g-2 align-items-center">
            
            <div class="col-xl-9">
                <div class="row g-2 align-items-center">
                    <div class="col-md-1">
                        <!--label for="shipmentStatusFilter" class="form-label small mb-1">Status</label-->
                        <select id="shipmentStatusFilter" class="form-select form-select-sm">
                            <option value="pending">Pending</option>
                            <option value="shipped">Shipped</option>
                            <option value="rejected">Rejected</option>
                            <option value="all" selected>All</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <!--label for="shipmentSearch" class="form-label small mb-1">Search</label-->
                        <input type="text" id="shipmentSearch" class="form-control form-control-sm" placeholder="Search SAP, Part, Location...">
                    </div>
                    <div class="col-md-9">
                        <!--label for="shipmentStartDate" class="form-label small mb-1">Date Range</label-->
                        <div class="input-group input-group-sm" style="width: fit-content;">
                            <input type="date" id="shipmentStartDate" class="form-control">
                            <span class="input-group-text">-</span>
                            <input type="date" id="shipmentEndDate" class="form-control">
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="col-xl-3">
                <div class="d-flex justify-content-end gap-2">
                    <button class="btn btn-sm btn-outline-primary" id="shipmentRefreshBtn" title="Refresh">
                        <i class="fas fa-sync-alt"></i> Refresh
                    </button>
                    <button class="btn btn-sm btn-danger py-1 px-2" id="rejectShipmentBtn" disabled>
                        <i class="fas fa-times-circle me-1"></i> Reject
                    </button>
                    <button class="btn btn-sm btn-success py-1 px-2" id="confirmShipmentBtn" disabled>
                        <i class="fas fa-check-circle me-1"></i> Confirm
                    </button>
                </div>
            </div>

        </div>
    </div>
    
    <div class="planning-table-wrapper">
        <table class="table table-striped table-hover table-sm" id="shipmentTable">
            <thead class="table-light">
                <tr>
                    <th style="width: 50px;" class="text-center">
                        <input class="form-check-input" type="checkbox" id="selectAllShipmentCheckbox">
                    </th>
                    <th style="width: 10%;">Date</th>
                    <th style="width: 15%;" class="text-center">From Location</th>
                    <th style="width: 15%;" class="text-center">To Location</th>
                    <th style="width: 15%;" class="text-center">Item (SAP / Part No)</th>
                    <th style="width: 15%;" class="text-center">Quantity</th>
                    <th class="text-center">Notes</th>
                </tr>
            </thead>
            <tbody id="shipmentTableBody">
                <tr><td colspan="7" class="text-center">Loading shipments...</td></tr>
            </tbody>
        </table>
    </div>
</div>