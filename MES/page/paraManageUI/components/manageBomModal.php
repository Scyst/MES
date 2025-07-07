<div class="modal fade" id="manageBomModal" tabindex="-1" aria-labelledby="manageBomModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered modal-xl">
        <div class="modal-content bg-dark text-white">
            <div class="modal-header">
                <h5 class="modal-title" id="bomModalTitle">Manage BOM for [FG_PART_NO]</h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="row">
                    <div class="col-lg-4">
                        <div class="card bg-secondary p-3 h-100">
                            <h5>Add New Component</h5>
                            <form id="modalAddComponentForm">
                                <input type="hidden" id="modalSelectedFgPartNo" name="fg_part_no">
                                
                                <div class="mb-3">
                                    <label for="modalComponentPartNo" class="form-label">Component Part No.</label>
                                    <input list="bomModalPartDatalist" id="modalComponentPartNo" name="component_part_no" class="form-control" placeholder="Select or type component..." required>
                                    <datalist id="bomModalPartDatalist"></datalist>
                                </div>
                                
                                <div class="mb-3">
                                    <label for="modalQuantityRequired" class="form-label">Quantity Required</label>
                                    <input type="number" id="modalQuantityRequired" name="quantity_required" class="form-control" min="1" required>
                                </div>
                                
                                <div class="text-end mt-auto">
                                    <button type="submit" class="btn btn-success">Add Component</button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div class="col-lg-8">
                        <div class="table-responsive" style="max-height: 60vh;">
                            <table class="table table-dark table-striped table-hover">
                                <thead>
                                    <tr>
                                        <th>Component Part No.</th>
                                        <th>Quantity Required</th>
                                        <th style="width: 100px;" class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="modalBomTableBody">
                                    </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>