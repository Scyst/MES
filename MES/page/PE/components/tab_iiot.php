<!-- tab_iiot.php — Live IIoT Monitor -->
<style>
.iiot-dashboard {
    padding: 20px 0;
    background: #0f172a; /* Darker background for control room feel */
    border-radius: 12px;
    min-height: 70vh;
}
.iiot-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 20px 20px 20px;
    border-bottom: 1px solid #334155;
    margin-bottom: 20px;
    color: #f8fafc;
}
.iiot-header h4 { margin: 0; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.iiot-header .live-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.9rem;
    color: #ef4444;
    font-weight: 600;
}
.iiot-header .live-indicator .dot {
    width: 10px; height: 10px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse-red 1.5s infinite;
}
@keyframes pulse-red {
    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
    70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.iiot-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
    padding: 0 20px;
}
.iiot-card {
    background: #1e293b;
    border-radius: 12px;
    border: 1px solid #334155;
    padding: 20px;
    color: #e2e8f0;
    position: relative;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
    transition: transform 0.2s, box-shadow 0.2s;
}
.iiot-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
}
.iiot-card-title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.iiot-card-subtitle {
    font-size: 0.8rem;
    color: #94a3b8;
    margin-bottom: 20px;
}
.iiot-status {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}
.iiot-status.running { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }
.iiot-status.stopped { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #dc2626; }
.iiot-status.offline { background: rgba(100, 116, 139, 0.2); color: #94a3b8; border: 1px solid #64748b; }

.iiot-metrics {
    display: flex;
    flex-direction: column;
    gap: 15px;
}
.iiot-metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: rgba(0,0,0,0.2);
    padding: 10px 15px;
    border-radius: 8px;
}
.iiot-metric-label {
    font-size: 0.85rem;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    gap: 8px;
}
.iiot-metric-value {
    font-size: 1.25rem;
    font-weight: 700;
    font-family: 'Consolas', monospace;
}
.iiot-metric-value.power { color: #f59e0b; }
.iiot-metric-value.output { color: #38bdf8; }
.iiot-metric-value.flow { color: #818cf8; }

.iiot-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: #64748b;
}
.iiot-empty i { font-size: 3rem; margin-bottom: 15px; opacity: 0.5; }
</style>

<div class="iiot-dashboard pe-animate-in">
    <div class="iiot-header">
        <h4><i class="fas fa-satellite-dish"></i> Live IIoT Monitor</h4>
        <div class="live-indicator">
            <div class="dot"></div> LIVE
        </div>
    </div>

    <div class="iiot-grid" id="iiotGrid">
        <div class="iiot-empty">
            <i class="fas fa-spinner fa-spin"></i>
            <h5>Connecting to Telemetry Stream...</h5>
        </div>
    </div>
</div>
