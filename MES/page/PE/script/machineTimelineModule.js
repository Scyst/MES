const MachineTimelineModule = (function() {
    let refreshInterval = null;
    let hoveredBarId = null;

    function init() {
        document.addEventListener('peTabChanged', (e) => {
            if (e.detail.tab === 'machine_timeline') {
                startAutoRefresh();
                fetchData();
            } else {
                stopAutoRefresh();
            }
        });
        
        const dateFilter = document.getElementById('timelineDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', fetchData);
        }

        const container = document.getElementById('machineTimelineContainer');
        if (container) {
            // Event delegation for tooltip
            container.addEventListener('mouseover', (e) => {
                if (e.target.classList.contains('timeline-bar')) {
                    hoveredBarId = e.target.id;
                    showTooltip(e, e.target);
                }
            });
            container.addEventListener('mouseout', (e) => {
                if (e.target.classList.contains('timeline-bar')) {
                    hoveredBarId = null;
                    hideTooltip();
                }
            });
            container.addEventListener('mousemove', (e) => {
                if (e.target.classList.contains('timeline-bar')) {
                    moveTooltip(e);
                }
            });
        }
    }

    async function fetchData() {
        const container = document.getElementById('machineTimelineContainer');
        const dateFilter = document.getElementById('timelineDateFilter').value;
        
        let url = PE_CONFIG.apiBase + 'iiotAPI.php?action=get_machine_timeline';
        if (dateFilter) url += '&date=' + dateFilter;

        try {
            const res = await fetch(url);
            const result = await res.json();
            
            if (result.success && result.data) {
                renderTimeline(result, container);
            }
        } catch (e) {
            console.error('Failed to fetch machine timeline', e);
            if (container.innerHTML.includes('spinner-border')) {
                container.innerHTML = `<div class="p-5 text-center text-danger">Failed to load timeline data.</div>`;
            }
        }
    }

    function buildInitialDOM(machines, shiftStart, totalDuration, container) {
        let html = '<div class="timeline-wrapper">';
        
        // Generate Header (Time axis)
        html += '<div class="timeline-header">';
        for (let i = 0; i <= 12; i++) {
            let tickTime = shiftStart + (i * (totalDuration / 12));
            let d = new Date(tickTime * 1000);
            let timeStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
            let leftPct = (i / 12) * 100;
            
            html += `
            <div class="timeline-tick" style="left: ${leftPct}%;">
                <span class="timeline-tick-label">${timeStr}</span>
            </div>`;
        }
        html += '</div>';

        // Generate Row skeletons
        machines.forEach(mc => {
            const safeMc = mc.replace(/\W/g, '_');
            html += `
            <div class="timeline-row" id="row-${safeMc}">
                <div class="timeline-label" title="${mc}">${mc}</div>
                <div class="timeline-track" id="track-${safeMc}"></div>
            </div>`;
        });
        
        html += `
            <!-- Tooltip Element -->
            <div id="timelineTooltip" class="timeline-tooltip"></div>
        </div>`;

        container.innerHTML = html;
    }

    function renderTimeline(payload, container) {
        const data = payload.data;
        const shiftStart = payload.shift_start;
        const shiftEnd = payload.shift_end;
        const totalDuration = shiftEnd - shiftStart;
        
        const machines = Object.keys(data).sort();
        
        if (machines.length === 0) {
            container.innerHTML = `<div class="p-5 text-center text-muted">No machine data available.</div>`;
            return;
        }

        let wrapper = container.querySelector('.timeline-wrapper');
        if (!wrapper) {
            buildInitialDOM(machines, shiftStart, totalDuration, container);
        }

        // Update in place
        machines.forEach(mc => {
            const safeMc = mc.replace(/\W/g, '_');
            const track = document.getElementById('track-' + safeMc);
            if (!track) return;

            const logs = data[mc];
            const activeBarIds = new Set();

            logs.forEach(log => {
                let startOffset = log.start - shiftStart;
                if (startOffset < 0) startOffset = 0;
                
                let endOffset = log.end - shiftStart;
                if (endOffset > totalDuration) endOffset = totalDuration;
                
                let duration = endOffset - startOffset;
                if (duration <= 0) return;
                
                let leftPct = (startOffset / totalDuration) * 100;
                let widthPct = (duration / totalDuration) * 100;
                
                let stDate = new Date(log.start * 1000);
                let etDate = new Date(log.end * 1000);
                let timeRange = String(stDate.getHours()).padStart(2,'0') + ':' + String(stDate.getMinutes()).padStart(2,'0') + 
                                ' - ' + 
                                String(etDate.getHours()).padStart(2,'0') + ':' + String(etDate.getMinutes()).padStart(2,'0');
                                
                let durationMins = Math.round(duration / 60);
                let durationStr = durationMins > 60 ? (durationMins/60).toFixed(1) + ' hrs' : durationMins + ' mins';
                
                const barId = 'bar-' + safeMc + '-' + log.start;
                activeBarIds.add(barId);

                let barEl = document.getElementById(barId);
                
                if (barEl) {
                    // Update existing bar smoothly
                    barEl.style.width = widthPct + '%';
                    
                    // Update data attributes
                    barEl.dataset.mc = mc;
                    barEl.dataset.status = log.status;
                    barEl.dataset.timerange = timeRange;
                    barEl.dataset.duration = durationStr;
                    
                    if (!barEl.classList.contains('status-' + log.status)) {
                        barEl.className = 'timeline-bar status-' + log.status;
                    }

                    // Live update tooltip if this bar is currently hovered
                    if (hoveredBarId === barId) {
                        updateTooltipContent(mc, log.status, timeRange, durationStr);
                    }

                } else {
                    // Create new bar
                    barEl = document.createElement('div');
                    barEl.id = barId;
                    barEl.className = 'timeline-bar status-' + log.status;
                    barEl.style.left = leftPct + '%';
                    barEl.style.width = widthPct + '%';
                    
                    barEl.dataset.mc = mc;
                    barEl.dataset.status = log.status;
                    barEl.dataset.timerange = timeRange;
                    barEl.dataset.duration = durationStr;

                    track.appendChild(barEl);
                }
            });

            // Remove orphaned bars (if a log was deleted)
            Array.from(track.children).forEach(child => {
                if (!activeBarIds.has(child.id)) {
                    child.remove();
                }
            });
        });
    }

    function updateTooltipContent(mc, status, timeRange, durationStr) {
        let tooltipEl = document.getElementById('timelineTooltip');
        if (!tooltipEl) return;
        
        let statusBadge = '';
        if (status === 'RUNNING') statusBadge = '<span class="badge bg-success">RUNNING</span>';
        else if (status === 'STOP') statusBadge = '<span class="badge bg-danger">STOP</span>';
        else if (status === 'IDLE') statusBadge = '<span class="badge bg-warning text-dark">IDLE</span>';
        else statusBadge = `<span class="badge bg-secondary">${status}</span>`;
        
        tooltipEl.innerHTML = `
            <div class="fw-bold mb-1 border-bottom border-secondary pb-1">${mc}</div>
            <div class="mb-1">${statusBadge}</div>
            <div><i class="fas fa-clock text-muted me-1"></i>${timeRange}</div>
            <div><i class="fas fa-hourglass-half text-muted me-1"></i>${durationStr}</div>
        `;
    }

    function showTooltip(e, barEl) {
        updateTooltipContent(barEl.dataset.mc, barEl.dataset.status, barEl.dataset.timerange, barEl.dataset.duration);
        let tooltipEl = document.getElementById('timelineTooltip');
        if (tooltipEl) {
            tooltipEl.style.opacity = '1';
            moveTooltip(e);
        }
    }

    function moveTooltip(e) {
        let tooltipEl = document.getElementById('timelineTooltip');
        if (tooltipEl) {
            tooltipEl.style.left = (e.pageX + 15) + 'px';
            tooltipEl.style.top = (e.pageY - 15) + 'px';
        }
    }

    function hideTooltip() {
        let tooltipEl = document.getElementById('timelineTooltip');
        if (tooltipEl) {
            tooltipEl.style.opacity = '0';
        }
    }

    function startAutoRefresh() {
        if (!refreshInterval) {
            refreshInterval = setInterval(() => {
                const dateFilter = document.getElementById('timelineDateFilter').value;
                if (!dateFilter || dateFilter === new Date().toISOString().split('T')[0]) {
                    fetchData();
                }
            }, 5000);
        }
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    return { init, fetchData };
})();

document.addEventListener('DOMContentLoaded', () => {
    MachineTimelineModule.init();
});
