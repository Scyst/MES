<div id="logsModal" class="modal">
    <div class="modal-dialog modal-dialog-centered" style="max-width: 80%; min-width: 1000px;">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h2>User Activity Logs</h2>
                <span class="close" onclick="closeModal('logsModal')">&times;</span>
            </div>
            <div class="table-responsive" style="max-height: 70vh;">
                <table class="table table-dark table-striped table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Action By</th>
                            <th>Action Type</th>
                            <th>Target User</th>
                            <th>Detail</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody id="logTableBody">
                        <tr>
                            <td colspan="6" class="text-center">Loading logs...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>