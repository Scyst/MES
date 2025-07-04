/**
 * ฟังก์ชันสำหรับดึงข้อมูลจาก API มาใส่ใน Dropdown
 * @param {string} id - ID ของ <select> element
 * @param {string} url - URL ของ API ที่จะดึงข้อมูล
 * @param {string} [selectedValue=""] - ค่าที่ต้องการให้เลือกไว้ล่วงหน้า
 */
async function populateDropdown(id, url, selectedValue = "") {
  const select = document.getElementById(id);
  //-- หากไม่พบ element ให้จบการทำงาน --
  if (!select) return;

  try {
    //-- ดึงข้อมูลจาก API --
    const res = await fetch(url);
    const responseData = await res.json();

    //-- หาก API คืนค่าว่าไม่สำเร็จ ให้แสดงข้อผิดพลาดใน Console --
    if (!responseData.success) {
      console.error(`API call for ${id} failed:`, responseData.message);
      return;
    }
    
    const data = responseData.data;

    //-- สร้าง Option แรกสำหรับ "All" --
    const label = id === "lineFilter" ? "Lines" : "Models";
    select.innerHTML = `<option value="">All ${label}</option>`;

    //-- วนลูปเพื่อสร้าง <option> จากข้อมูลที่ได้มา --
    data.forEach(option => {
      const opt = document.createElement("option");
      opt.value = option;
      opt.textContent = option;
      //-- หากค่าตรงกับ selectedValue ให้ตั้งเป็นค่าที่ถูกเลือก --
      if (option === selectedValue) opt.selected = true;
      select.appendChild(opt);
    });
  } catch (err) {
    console.error(`Failed to populate ${id}:`, err);
  }
}

/**
 * ฟังก์ชันสำหรับเริ่มต้นการทำงานของหน้า: อ่าน Filter จาก URL, ตั้งค่า Dropdown และ Input, และเริ่ม Render Chart
 */
async function applyFiltersAndInitCharts() {
  //-- อ่านค่า Filter จาก Query Parameters ใน URL --
  const params = new URLSearchParams(window.location.search);
  const startDate = params.get("startDate");
  const endDate = params.get("endDate");
  const line = params.get("line");
  const model = params.get("model");

  //-- ดึงข้อมูลสำหรับ Dropdown ทั้งสองพร้อมกันเพื่อความรวดเร็ว --
  await Promise.all([
    populateDropdown("lineFilter", "../../api/OEE_Dashboard/get_lines.php", line),
    populateDropdown("modelFilter", "../../api/OEE_Dashboard/get_models.php", model)
  ]);

  //-- ตั้งค่าใน Input ตามค่าที่ได้จาก URL --
  if (startDate) document.getElementById("startDate").value = startDate;
  if (endDate) document.getElementById("endDate").value = endDate;

  //-- เรียกฟังก์ชันสำหรับ Render Chart ต่างๆ (ถ้ามีฟังก์ชันเหล่านี้อยู่) --
  fetchAndRenderCharts?.();
  fetchAndRenderLineCharts?.();
  fetchAndRenderBarCharts?.();
}

/**
 * ฟังก์ชันที่จะถูกเรียกเมื่อมีการเปลี่ยนแปลงค่าใน Filter
 */
function handleFilterChange() {
  //-- อ่านค่าปัจจุบันจากทุก Filter --
  const startDate = document.getElementById("startDate")?.value || '';
  const endDate = document.getElementById("endDate")?.value || '';
  const line = document.getElementById("lineFilter")?.value || '';
  const model = document.getElementById("modelFilter")?.value || '';

  //-- อัปเดต URL ใน Address bar โดยไม่โหลดหน้าใหม่ --
  const params = new URLSearchParams({ startDate, endDate, line, model });
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', newUrl);

  //-- เรียกฟังก์ชันเพื่อ Render Chart ใหม่ตาม Filter ที่เปลี่ยนไป --
  fetchAndRenderCharts?.();
  fetchAndRenderLineCharts?.();
  fetchAndRenderBarCharts?.();
}

/**
 * ฟังก์ชันสำหรับตั้งค่าวันที่และเวลาเริ่มต้นให้กับ Input หากยังไม่มีค่า
 */
function ensureDefaultDateInputs() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(':').slice(0, 2).join(':');

  document.querySelectorAll('input[type="date"]').forEach(input => {
    if (!input.value) input.value = dateStr;
  });

  document.querySelectorAll('input[type="time"]').forEach(input => {
    if (!input.value) input.value = timeStr;
  });
}

/**
 * ฟังก์ชันสำหรับแปลงนาทีเป็นรูปแบบ "Xh Ym"
 */
function formatMinutes(minutes) {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs.toLocaleString()}h ${mins.toLocaleString()}m`;
}

//-- Event Listener ที่จะทำงานเมื่อหน้าเว็บโหลดเสร็จสมบูรณ์ --
window.addEventListener("load", () => {
  //-- 1. ตั้งค่าวันที่เริ่มต้น --
  ensureDefaultDateInputs();

  //-- 2. ผูก Event Listener 'change' ให้กับทุก Filter --
  ["startDate", "endDate", "lineFilter", "modelFilter"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", handleFilterChange);
  });

  //-- 3. เริ่มต้นการทำงานหลักของหน้าเว็บ --
  applyFiltersAndInitCharts();
});