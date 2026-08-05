import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportTasksToExcel = (tasks, filename = 'tasks_export.xlsx') => {
  const headers = ['ID', 'ชื่องาน', 'สถานะ', 'โปรเจ็กต์', 'สิทธิ์', 'ความสำคัญ', 'ผู้รับผิดชอบ', 'เริ่ม', 'สิ้นสุด', 'รายละเอียด'];
  
  const data = tasks.map(t => [
    t.Id,
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

export const exportTasksToPDF = (tasks, filename = 'tasks_export.pdf') => {
  const doc = new jsPDF();
  
  // Basic PDF export (Note: Thai fonts require custom VFS, using English titles for columns as fallback if fonts aren't loaded)
  doc.text("Task Report", 14, 15);
  
  const head = [['ID', 'Task Name', 'Status', 'Assignee', 'Due Date']];
  const data = tasks.map(t => [
    t.Id,
    t.Title || '',
    t.Status || '',
    t.Assignee || '',
    t.dueDate || ''
  ]);
  
  autoTable(doc, {
    head: head,
    body: data,
    startY: 20,
    styles: { font: 'helvetica' } 
  });
  
  doc.save(filename);
};
