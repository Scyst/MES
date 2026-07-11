<?php
session_start();
// e:\MES\MES\MES\page\SAP_Sync\index.php
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SAP Data Synchronization</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #0f172a;
            --bg-card: rgba(30, 41, 59, 0.7);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-blue: #3b82f6;
            --accent-hover: #2563eb;
            --border-color: rgba(255, 255, 255, 0.1);
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', sans-serif;
            background: var(--bg-dark);
            color: var(--text-primary);
            min-height: 100vh;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
                radial-gradient(circle at 85% 30%, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 2rem;
            animation: fadeInDown 0.6s ease-out;
        }

        .header h1 {
            font-size: 2.5rem;
            margin: 0;
            background: linear-gradient(135deg, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 2rem;
            animation: fadeIn 0.8s ease-out;
        }

        .tab-btn {
            padding: 0.75rem 1.5rem;
            border-radius: 0.5rem;
            border: 1px solid var(--border-color);
            background: var(--bg-card);
            color: var(--text-primary);
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }

        .tab-btn:hover {
            border-color: var(--accent-blue);
            transform: translateY(-2px);
        }

        .tab-btn.active {
            background: var(--accent-blue);
            border-color: var(--accent-blue);
            box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
        }

        .card {
            background: var(--bg-card);
            border-radius: 1rem;
            border: 1px solid var(--border-color);
            padding: 1.5rem;
            backdrop-filter: blur(12px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            animation: slideUp 0.6s ease-out;
            overflow: hidden;
        }

        .table-container {
            overflow-x: auto;
            max-height: 600px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            text-align: left;
        }

        th {
            position: sticky;
            top: 0;
            background: rgba(15, 23, 42, 0.95);
            padding: 1rem;
            font-weight: 600;
            color: var(--text-secondary);
            border-bottom: 2px solid var(--border-color);
            z-index: 10;
            white-space: nowrap;
        }

        td {
            padding: 1rem;
            border-bottom: 1px solid var(--border-color);
            color: #e2e8f0;
            white-space: nowrap;
        }

        tr {
            transition: background 0.2s ease;
        }

        tr:hover td {
            background: rgba(255, 255, 255, 0.05);
        }

        .loading {
            display: none;
            text-align: center;
            padding: 3rem;
            color: var(--accent-blue);
            font-size: 1.2rem;
            font-weight: 500;
        }

        .loading::after {
            content: '';
            display: inline-block;
            width: 1rem;
            height: 1rem;
            border: 2px solid currentColor;
            border-right-color: transparent;
            border-radius: 50%;
            margin-left: 0.5rem;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        /* Scrollbar styles */
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.1); border-radius: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        
        .badge {
            padding: 0.25rem 0.5rem;
            border-radius: 9999px;
            font-size: 0.85rem;
            font-weight: 500;
            background: rgba(59, 130, 246, 0.2);
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.3);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div>
                <h1>SAP Data Center</h1>
                <p style="color: var(--text-secondary); margin-top: 0.5rem;">Real-time synchronized data from SNC-SAP (10.0.0.4)</p>
            </div>
            <button class="tab-btn" onclick="fetchData(currentView)" style="display: flex; align-items: center; gap: 0.5rem;">
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Refresh Data
            </button>
        </div>

        <div class="tabs">
            <button class="tab-btn active" id="btn-ops" onclick="switchTab('operation_slips')">Operation Slips</button>
            <button class="tab-btn" id="btn-stock" onclick="switchTab('sap_stocks')">SAP All Stock</button>
        </div>

        <div class="card">
            <div id="loading" class="loading">Fetching data from SAP...</div>
            <div class="table-container">
                <table id="data-table">
                    <thead id="table-head">
                        <!-- Headers generated dynamically -->
                    </thead>
                    <tbody id="table-body">
                        <!-- Rows generated dynamically -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        let currentView = 'operation_slips';

        function switchTab(view) {
            currentView = view;
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            if(view === 'operation_slips') {
                document.getElementById('btn-ops').classList.add('active');
            } else {
                document.getElementById('btn-stock').classList.add('active');
            }
            fetchData(view);
        }

        async function fetchData(view) {
            const tableHead = document.getElementById('table-head');
            const tableBody = document.getElementById('table-body');
            const loading = document.getElementById('loading');
            
            tableHead.innerHTML = '';
            tableBody.innerHTML = '';
            loading.style.display = 'block';

            try {
                const action = view === 'operation_slips' ? 'get_operation_slips' : 'get_sap_stocks';
                const response = await fetch(`api/get_sap_data.php?action=${action}`);
                const result = await response.json();

                if(result.success && result.data.length > 0) {
                    // Generate Headers Dynamically from the first row of data
                    const columns = Object.keys(result.data[0]);
                    
                    const tr = document.createElement('tr');
                    columns.forEach(col => {
                        const th = document.createElement('th');
                        th.textContent = col.replace(/_/g, ' ');
                        tr.appendChild(th);
                    });
                    tableHead.appendChild(tr);

                    // Generate Rows
                    result.data.forEach((row, index) => {
                        const trBody = document.createElement('tr');
                        trBody.style.animation = `fadeIn 0.3s ease-out ${index * 0.02}s both`;
                        
                        columns.forEach(col => {
                            const td = document.createElement('td');
                            let val = row[col];
                            
                            // Format dates
                            if (col.toLowerCase().includes('date') && val) {
                                val = new Date(val).toLocaleString('en-GB');
                            }
                            // Format numbers
                            if (typeof val === 'number') {
                                val = `<span class="badge">${val.toLocaleString()}</span>`;
                                td.innerHTML = val;
                            } else {
                                td.textContent = val !== null && val !== undefined ? val : '-';
                            }
                            trBody.appendChild(td);
                        });
                        tableBody.appendChild(trBody);
                    });
                } else {
                    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-secondary)">No data available or error occurred.</td></tr>';
                }
            } catch (error) {
                console.error('Error fetching SAP data:', error);
                tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #ef4444">Failed to fetch data from SAP database.</td></tr>';
            } finally {
                loading.style.display = 'none';
            }
        }

        // Initial Load
        document.addEventListener('DOMContentLoaded', () => {
            fetchData('operation_slips');
        });
    </script>
</body>
</html>
