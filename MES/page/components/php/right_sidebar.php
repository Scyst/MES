<nav class="right-sidebar" id="right-sidebar">
    <ul class="nav nav-tabs nav-fill" id="rightSidebarTab" role="tablist">
        <li class="nav-item" role="presentation">
            <button class="nav-link active" id="notifications-tab" data-bs-toggle="tab" data-bs-target="#notifications-pane" type="button" role="tab">
                <i class="bi bi-bell"></i> Alerts
            </button>
        </li>
        <li class="nav-item" role="presentation">
            <button class="nav-link" id="job-orders-tab" data-bs-toggle="tab" data-bs-target="#job-orders-pane" type="button" role="tab">
                <i class="bi bi-list-check"></i> Jobs
            </button>
        </li>
    </ul>

    <div class="tab-content" id="rightSidebarTabContent">
        <div class="tab-pane fade show active" id="notifications-pane" role="tabpanel">
            <div class="sidebar-pane-header">
                คุณมี <span id="alert-count-sidebar">0</span> การแจ้งเตือนสต็อกต่ำ
            </div>
            <div class="sidebar-pane-body" id="alerts-container-sidebar">
                <div class="text-center p-3 text-muted" id="alert-empty-sidebar">ไม่มีรายการแจ้งเตือน</div>
            </div>
        </div>

        <div class="tab-pane fade" id="job-orders-pane" role="tabpanel">
             <div class="sidebar-pane-header">
                Job Orders
            </div>
            <div class="sidebar-pane-body">
                <div class="text-center p-3 text-muted">ฟีเจอร์นี้ยังไม่เปิดใช้งาน</div>
            </div>
        </div>
    </div>
</nav>