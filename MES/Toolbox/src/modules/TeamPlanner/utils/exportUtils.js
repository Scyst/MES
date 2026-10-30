// NOTE: Intentionally >50 lines — large export functions with lazy-loaded heavy deps
// xlsx, jspdf, jspdf-autotable are dynamically imported to keep them out of initial bundle

export const exportTasksToExcel = async (tasks, filename = 'tasks_export.xlsx') => {
  const XLSX = await import('xlsx');
  const headers = ['ลำดับ', 'ชื่องาน', 'สถานะ', 'โปรเจ็กต์', 'สิทธิ์', 'ความสำคัญ', 'ผู้รับผิดชอบ', 'เริ่ม', 'สิ้นสุด', 'รายละเอียด'];
  
  // Sort tasks by Due Date then Assignee
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    
    const aAssignee = a.Assignee || '';
    const bAssignee = b.Assignee || '';
    return aAssignee.localeCompare(bAssignee);
  });
  
  const data = sortedTasks.map((t, index) => [
    index + 1,
    t.Title || '',
    t.Status || '',
    t.ProjectId ? `Project #${t.ProjectId}` : '-',
    t.Visibility || 'public',
    t.priority || 'normal',
    t.Assignee || '',
    t.startDate || '',
    t.dueDate || '',
    t.description || ''
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  
  const wscols = [
    {wch:5}, // ID
    {wch:30}, // Title
    {wch:15}, // Status
    {wch:15}, // Project
    {wch:10}, // Visibility
    {wch:10}, // Priority
    {wch:20}, // Assignee
    {wch:12}, // Start Date
    {wch:12}, // Due Date
    {wch:40}  // Description
  ];
  ws['!cols'] = wscols;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Tasks");
  
  XLSX.writeFile(wb, filename);
};

export const exportTasksToPDF = async (tasks, filename = 'tasks_export.pdf') => {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const { THSarabunNew } = await import('./thaiFont');

  const doc = new jsPDF();
  
  // Add Thai Font to VFS with Identity-H encoding
  doc.addFileToVFS("THSarabunNew.ttf", THSarabunNew);
  doc.addFont("THSarabunNew.ttf", "THSarabunNew", "normal", "Identity-H");
  doc.setFont("THSarabunNew");
  
  doc.setFontSize(16);
  doc.text("รายงานสรุปงาน (Task Report)", 14, 15);
  
  // Sort tasks by Due Date then Assignee
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate && b.dueDate) return 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    
    const aAssignee = a.Assignee || '';
    const bAssignee = b.Assignee || '';
    return aAssignee.localeCompare(bAssignee);
  });
  
  const head = [['ลำดับ', 'ชื่องาน', 'สถานะ', 'ผู้รับผิดชอบ', 'กำหนดส่ง']];
  const data = sortedTasks.map((t, index) => [
    index + 1,
    t.Title || '',
    t.Status || '',
    t.Assignee || '',
    t.dueDate || ''
  ]);
  
  autoTable(doc, {
    head: head,
    body: data,
    startY: 20,
    styles: { font: 'THSarabunNew', fontSize: 10 },
    headStyles: { fontStyle: 'normal' }
  });
  
  doc.save(filename);
};
