import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { Invoice, Client, Task } from '../types';
import { formatCurrency } from './formatters';
import { format } from 'date-fns';

export const generateInvoicePDF = (invoice: Invoice, client: Client, tasks: Task[]) => {
  const doc = new jsPDF();
  const blueColor: [number, number, number] = [37, 99, 235];
  
  // Header Background
  doc.setFillColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.rect(0, 0, 210, 40, 'F');

  // Business info
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('KARTHICK KUMARAN M', 15, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Phone: +91 9159538955', 15, 30);
  doc.text('Email: karthickkumaran20@gmail.com', 15, 35);

  // Invoice label
  doc.setFontSize(30);
  doc.text('INVOICE', 140, 25);

  // Client info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO:', 15, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name.toUpperCase(), 15, 62);
  if (client.company) doc.text(client.company.toUpperCase(), 15, 67);
  if (client.email) doc.text(client.email, 15, 72);
  if (client.phone) doc.text(client.phone, 15, 77);

  // Invoice details
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE NO:', 140, 55);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.invoiceNumber, 175, 55);

  doc.setFont('helvetica', 'bold');
  doc.text('DATE:', 140, 62);
  doc.setFont('helvetica', 'normal');
  doc.text(format(invoice.createdAt.toDate ? invoice.createdAt.toDate() : new Date(invoice.createdAt), 'MMM d, yyyy'), 175, 62);

  doc.setFont('helvetica', 'bold');
  doc.text('DUE DATE:', 140, 69);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.dueDate ? format(invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate), 'MMM d, yyyy') : 'UPON RECEIPT', 175, 69);

  // Table
  const tableRows: RowInput[] = [];
  tasks.forEach(task => {
    tableRows.push([
      { content: task.title.toUpperCase(), styles: { fontStyle: 'bold' } },
      '',
      '',
      formatCurrency(task.amount || 0, invoice.currency)
    ]);
    
    (task.checklist || []).forEach(item => {
      tableRows.push([
        `  - ${item.text.toUpperCase()}`,
        '',
        '',
        ''
      ]);
    });
  });

  autoTable(doc, {
    startY: 90,
    head: [['DESCRIPTION', '', '', 'AMOUNT']],
    body: tableRows,
    headStyles: {
      fillColor: blueColor,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [50, 50, 50],
    },
    columnStyles: {
      0: { cellWidth: 120 },
      3: { halign: 'right', cellWidth: 30 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 15, right: 15 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  
  doc.setDrawColor(226, 232, 240);
  doc.line(140, finalY, 195, finalY);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', 140, finalY + 10);
  doc.setTextColor(blueColor[0], blueColor[1], blueColor[2]);
  doc.text(formatCurrency(invoice.amount, invoice.currency), 195, finalY + 10, { align: 'right' });

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, 280, { align: 'center' });
  doc.text('This is a computer generated invoice.', 105, 285, { align: 'center' });

  return doc;
};

export const generateStatementPDF = (ledger: any[], ownerName: string) => {
  const doc = new jsPDF();
  const primaryColor: [number, number, number] = [37, 99, 235];

  // Header
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL STATEMENT', 15, 25);
  doc.setFontSize(10);
  doc.text(ownerName.toUpperCase(), 15, 35);
  doc.text(`Generated on: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 140, 35);

  const tableRows = ledger.map(entry => [
    format(entry.date.toDate ? entry.date.toDate() : new Date(entry.date), 'MMM d, yyyy'),
    entry.description.toUpperCase(),
    entry.category.toUpperCase(),
    entry.type === 'income' ? `+${formatCurrency(entry.amount, 'INR')}` : `-${formatCurrency(entry.amount, 'INR')}`
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['DATE', 'DESCRIPTION', 'CATEGORY', 'AMOUNT']],
    body: tableRows,
    headStyles: { fillColor: primaryColor },
    columnStyles: {
      3: { halign: 'right', fontStyle: 'bold' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalBalance = ledger.reduce((sum, e) => e.type === 'income' ? sum + e.amount : sum - e.amount, 0);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('NET BALANCE:', 140, finalY);
  const successColor: [number, number, number] = [16, 185, 129];
  const errorColor: [number, number, number] = [244, 63, 94];
  const balanceColor = totalBalance >= 0 ? successColor : errorColor;
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.text(formatCurrency(totalBalance, 'INR'), 195, finalY, { align: 'right' });

  doc.save(`Statement_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

export const downloadInvoicePDF = (invoice: Invoice, client: Client, tasks: Task[]) => {
  const doc = generateInvoicePDF(invoice, client, tasks);
  doc.save(`INV-${invoice.invoiceNumber}.pdf`);
};
