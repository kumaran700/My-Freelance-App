import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { Invoice, Client, Task } from '../types';
import { formatCurrency } from './formatters';
import { format } from 'date-fns';

export const generateInvoicePDF = (invoice: Invoice, client: Client, tasks: Task[]) => {
  const doc = new jsPDF();
  const primaryBlue: [number, number, number] = [37, 99, 235];
  const darkBg: [number, number, number] = [15, 23, 42];
  
  // Header
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 15, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(invoice.invoiceNumber.toUpperCase(), 15, 32);

  // Business Name and Phone
  doc.setTextColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KARTHICK KUMARAN M', 195, 20, { align: 'right' });
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('+91 9159538955', 195, 26, { align: 'right' });

  // Divider
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.8);
  doc.line(15, 45, 195, 45);

  // Bill To & Dates
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 15, 60);
  
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.text(client.name.toUpperCase(), 15, 72);
  if (client.company) {
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(client.company.toUpperCase(), 15, 79);
  }

  // Dates on right
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('DATE ISSUED', 140, 60);
  doc.text('DUE DATE', 170, 60);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(format(invoice.createdAt.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt), 'MMM d, yyyy').toUpperCase(), 140, 68);
  doc.text(invoice.dueDate ? format(invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate), 'MMM d, yyyy').toUpperCase() : 'UPON RECEIPT', 170, 68);

  // Table
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text('DESCRIPTION', 15, 100);
  doc.text('PRICE', 195, 100, { align: 'right' });

  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.line(15, 105, 195, 105);

  let currentY = 115;
  tasks.forEach((task) => {
    // Task Title Row
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(task.title.toUpperCase(), 15, currentY);
    doc.text(formatCurrency(task.amount || 0, invoice.currency), 195, currentY, { align: 'right' });
    currentY += 8;

    // Task Checklist items
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'oblique');
    (task.checklist || []).forEach(item => {
      doc.text(`• ${item.text.toUpperCase()}`, 20, currentY);
      if (item.price > 0) {
        doc.text(formatCurrency(item.price, invoice.currency), 195, currentY, { align: 'right' });
      }
      currentY += 5;
    });
    currentY += 5;
    
    // Check for page break
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
  });

  // Totals Area
  const totalsY = Math.max(currentY + 10, 220);
  
  // Subtotal
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SUBTOTAL', 140, totalsY);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(formatCurrency(invoice.amount, invoice.currency), 195, totalsY, { align: 'right' });

  // Total Due Box
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.roundedRect(140, totalsY + 8, 55, 25, 2, 2, 'F');
  
  // Blue accent in box
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(190, totalsY + 8, 5, 25, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('TOTAL DUE', 145, totalsY + 18);
  doc.setFontSize(16);
  doc.text(formatCurrency(invoice.amount, invoice.currency), 185, totalsY + 26, { align: 'right' });

  // Footer
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('THANK YOU', 195, 280, { align: 'right' });

  return doc;
};

export const generateStatementPDF = (ledger: any[], ownerName: string) => {
  const doc = new jsPDF();
  const primaryBlue: [number, number, number] = [37, 99, 235];

  // Header Title
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const title = (ownerName || 'KWORKS FREELANCE APP').toUpperCase();
  doc.text(title, 200, 20, { align: 'right' });

  doc.setFontSize(8);
  doc.text('FINANCIAL STATEMENT / CATEGORY', 15, 12);
  doc.text('AMOUNT', 200, 12, { align: 'right' });

  const tableRows = ledger.map(entry => {
    return [
      `${entry.category.toUpperCase()} - ${entry.description.toUpperCase()}`,
      `${entry.type === 'income' ? '+' : '-'} ${formatCurrency(entry.amount, 'INR')}`
    ];
  });

  autoTable(doc, {
    startY: 35,
    head: [['DESCRIPTION / CATEGORY', 'AMOUNT (INR)']],
    body: tableRows,
    headStyles: { 
      fillColor: primaryBlue, 
      textColor: [255, 255, 255], 
      fontSize: 8,
      halign: 'right'
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 60, halign: 'right' }
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      font: 'helvetica'
    },
    theme: 'striped'
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalIncome = ledger.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
  const totalExpense = ledger.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INCOME:', 140, finalY);
  doc.setTextColor(16, 185, 129);
  doc.text(formatCurrency(totalIncome, 'INR'), 200, finalY, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EXPENSE:', 140, finalY + 7);
  doc.setTextColor(244, 63, 94);
  doc.text(formatCurrency(totalExpense, 'INR'), 200, finalY + 7, { align: 'right' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(140, finalY + 10, 200, finalY + 10);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text('NET BALANCE:', 140, finalY + 18);
  
  const balanceColor: [number, number, number] = totalBalance >= 0 ? [16, 185, 129] : [244, 63, 94];
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.text(formatCurrency(totalBalance, 'INR'), 200, finalY + 18, { align: 'right' });

  doc.save(`Statement_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const downloadInvoicePDF = (invoice: Invoice, client: Client, tasks: Task[]) => {
  const doc = generateInvoicePDF(invoice, client, tasks);
  doc.save(`INV-${invoice.invoiceNumber}.pdf`);
};

