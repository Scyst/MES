<div class="modal" id="addUserModal" tabindex="-1">
    <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content ">
            <div class="modal-header">
                <h5 class="modal-title">Add New User</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
                <form id="addUserForm">
                    <div class="mb-3">
                        <label for="addUsername" class="form-label">Username</label>
                        <input type="text" name="username" class="form-control" id="addUsername" required autocomplete="off">
                    </div>
                    <div class="mb-3">
                        <label for="addPassword" class="form-label">Password</label>
                        <input type="password" name="password" class="form-control" id="addPassword" required autocomplete="new-password">
                    </div>
                    <div class="mb-3">
                        <label for="addRole" class="form-label">Role</label>
                        <select class="form-select" name="role" id="addRole" required>
                            <option value="" selected>Select Role...</option>
                            <option value="admin" <?php if (!hasRole('creator')) echo 'disabled'; ?>>Admin</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="operator">Operator</option>
                        </select>
                    </div>
                    <div id="addUserLineWrapper" class="mb-3 d-none">
                        <label for="addLine" class="form-label">Assigned Line</label>
                        <input type="text" name="line" class="form-control text-uppercase" id="addLine" placeholder="Enter line for supervisor">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="submit" form="addUserForm" class="btn btn-primary">Add User</button>
            </div>
        </div>
    </div>
</div>