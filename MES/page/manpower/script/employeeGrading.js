/**
 * page/manpower/script/employeeGrading.js
 */

const App = {
    state: {
        employees: [],
        lines: new Set()
    },

    init: async function() {
        this.bindEvents();
        await this.loadData();
    },

    bindEvents: function() {
        document.getElementById('filterPeriod').addEventListener('change', () => this.loadData());
        document.getElementById('filterLine').addEventListener('change', () => this.renderTable());
    },

    loadData: async function() {
        try {
            const period = document.getElementById('filterPeriod').value;
            
            Swal.fire({
                title: 'Loading Data...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const response = await fetch(`api/api_employee_grading.php?action=get_grading_data&period=${period}`);
            const result = await response.json();

            if (!result.success) throw new Error(result.message);

            this.state.employees = result.data;
            this.extractLines();
            this.renderTable();

            Swal.close();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    },

    extractLines: function() {
        const lineSelect = document.getElementById('filterLine');
        const currentVal = lineSelect.value;
        
        this.state.lines.clear();
        this.state.employees.forEach(emp => {
            if (emp.line) this.state.lines.add(emp.line);
        });

        let html = `<option value="ALL">ALL LINES</option>`;
        Array.from(this.state.lines).sort().forEach(line => {
            html += `<option value="${line}">${line}</option>`;
        });
        
        lineSelect.innerHTML = html;
        if (this.state.lines.has(currentVal)) {
            lineSelect.value = currentVal;
        }
    },

    renderTable: function() {
        const tbody = document.getElementById('gradingTableBody');
        const lineFilter = document.getElementById('filterLine').value;
        
        let filtered = this.state.employees;
        if (lineFilter !== 'ALL') {
            filtered = this.state.employees.filter(e => e.line === lineFilter);
        }

        let html = '';
        let totalIncome = 0;
        let gradeCount = { A: 0, B: 0, C: 0, D: 0 };
        
        filtered.forEach(emp => {
            totalIncome += parseFloat(emp.income_per_head) || 0;
            if (emp.grade && gradeCount[emp.grade] !== undefined) {
                gradeCount[emp.grade]++;
            }

            html += `
                <tr>
                    <td class="fw-bold">${emp.emp_id}</td>
                    <td class="text-start">${emp.name_th}</td>
                    <td><span class="badge bg-secondary">${emp.position || '-'}</span></td>
                    <td><span class="badge bg-info text-dark">${emp.line || '-'}</span></td>
                    <td class="text-end pe-4 fw-bold text-success">${Number(emp.income_per_head).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td>
                        <select class="form-select form-select-sm mx-auto grade-select ${this.getGradeClass(emp.grade)}" 
                                onchange="App.updateGradeState('${emp.emp_id}', this)">
                            <option value="" class="grade-empty">-</option>
                            <option value="A" class="grade-A" ${emp.grade === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" class="grade-B" ${emp.grade === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" class="grade-C" ${emp.grade === 'C' ? 'selected' : ''}>C</option>
                            <option value="D" class="grade-D" ${emp.grade === 'D' ? 'selected' : ''}>D</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm text-center" 
                               value="${emp.notes || ''}" 
                               placeholder="Remarks..."
                               onchange="App.updateNotesState('${emp.emp_id}', this.value)">
                    </td>
                </tr>
            `;
        });

        if (filtered.length === 0) {
            html = `<tr><td colspan="7" class="text-muted py-4">No employees found for this selection.</td></tr>`;
        }

        tbody.innerHTML = html;

        // Update KPIs
        document.getElementById('kpi-total-emp').innerText = filtered.length;
        
        const avgIncome = filtered.length > 0 ? (totalIncome / filtered.length) : 0;
        document.getElementById('kpi-avg-income').innerText = avgIncome.toLocaleString(undefined, {maximumFractionDigits: 0});

        // Update Progress Bar
        const totalGraded = gradeCount.A + gradeCount.B + gradeCount.C + gradeCount.D;
        const calcDist = (count) => totalGraded > 0 ? ((count / totalGraded) * 100).toFixed(0) + '%' : '0%';
        
        document.getElementById('dist-A').style.width = calcDist(gradeCount.A);
        document.getElementById('dist-A').innerText = gradeCount.A > 0 ? calcDist(gradeCount.A) : '';
        
        document.getElementById('dist-B').style.width = calcDist(gradeCount.B);
        document.getElementById('dist-B').innerText = gradeCount.B > 0 ? calcDist(gradeCount.B) : '';
        
        document.getElementById('dist-C').style.width = calcDist(gradeCount.C);
        document.getElementById('dist-C').innerText = gradeCount.C > 0 ? calcDist(gradeCount.C) : '';
        
        document.getElementById('dist-D').style.width = calcDist(gradeCount.D);
        document.getElementById('dist-D').innerText = gradeCount.D > 0 ? calcDist(gradeCount.D) : '';
    },

    getGradeClass: function(grade) {
        if (!grade) return 'grade-empty';
        return `grade-${grade}`;
    },

    updateGradeState: function(empId, selectElement) {
        const newGrade = selectElement.value;
        selectElement.className = `form-select form-select-sm mx-auto grade-select ${this.getGradeClass(newGrade)}`;
        
        const emp = this.state.employees.find(e => e.emp_id === empId);
        if (emp) {
            emp.grade = newGrade;
        }
        
        // Minor re-render to update the distribution bar without resetting the inputs
        this.updateDistributionBar();
    },
    
    updateNotesState: function(empId, notes) {
        const emp = this.state.employees.find(e => e.emp_id === empId);
        if (emp) {
            emp.notes = notes;
        }
    },
    
    updateDistributionBar: function() {
        const lineFilter = document.getElementById('filterLine').value;
        let filtered = this.state.employees;
        if (lineFilter !== 'ALL') {
            filtered = this.state.employees.filter(e => e.line === lineFilter);
        }
        
        let gradeCount = { A: 0, B: 0, C: 0, D: 0 };
        filtered.forEach(emp => {
            if (emp.grade && gradeCount[emp.grade] !== undefined) {
                gradeCount[emp.grade]++;
            }
        });
        
        const totalGraded = gradeCount.A + gradeCount.B + gradeCount.C + gradeCount.D;
        const calcDist = (count) => totalGraded > 0 ? ((count / totalGraded) * 100).toFixed(0) + '%' : '0%';
        
        document.getElementById('dist-A').style.width = calcDist(gradeCount.A);
        document.getElementById('dist-A').innerText = gradeCount.A > 0 ? calcDist(gradeCount.A) : '';
        
        document.getElementById('dist-B').style.width = calcDist(gradeCount.B);
        document.getElementById('dist-B').innerText = gradeCount.B > 0 ? calcDist(gradeCount.B) : '';
        
        document.getElementById('dist-C').style.width = calcDist(gradeCount.C);
        document.getElementById('dist-C').innerText = gradeCount.C > 0 ? calcDist(gradeCount.C) : '';
        
        document.getElementById('dist-D').style.width = calcDist(gradeCount.D);
        document.getElementById('dist-D').innerText = gradeCount.D > 0 ? calcDist(gradeCount.D) : '';
    },

    saveGrades: async function() {
        const period = document.getElementById('filterPeriod').value;
        
        // Filter out employees that have a grade assigned
        const gradesToSave = this.state.employees
            .filter(emp => emp.grade && emp.grade.trim() !== '')
            .map(emp => ({
                emp_id: emp.emp_id,
                grade: emp.grade,
                notes: emp.notes
            }));

        if (gradesToSave.length === 0) {
            Swal.fire('No Changes', 'There are no grades assigned to save.', 'info');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Save Grades?',
            text: `You are about to save/update grades for ${gradesToSave.length} employees for ${period}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, Save it!'
        });

        if (!confirm.isConfirmed) return;

        try {
            Swal.fire({
                title: 'Saving...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const formData = new URLSearchParams();
            formData.append('action', 'save_grades');
            formData.append('period', period);
            formData.append('grades', JSON.stringify(gradesToSave));

            const response = await fetch('api/api_employee_grading.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.message);

            Swal.fire('Saved!', result.message, 'success');
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
