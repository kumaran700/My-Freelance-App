import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Client, Task } from '../types';
import { formatCurrency } from './formatters';
import { format } from 'date-fns';

export const downloadInvoicePDF = (invoice: Invoice, client: Client, tasks: Task[]) => {
  const balanceDue = invoice.amount - (invoice.advancePaid || 0);
  const formattedDate = format(invoice.createdAt?.toDate ? invoice.createdAt.toDate() : new Date(), 'MMM dd, yyyy').toUpperCase();
  const formattedDueDate = invoice.dueDate 
    ? format(invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate), 'MMM dd, yyyy').toUpperCase()
    : 'UPON RECEIPT';

  const html = `
    <div id="invoice-template" style="
      width: 700px;
      margin: auto;
      background: #ffffff;
      padding: 40px;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #111827;
    ">

      <!-- HEADER -->
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-size: 28px; font-weight: 700; color: #111827;">INVOICE</div>
          <div style="font-size: 12px; color: #6b7280; margin-top: 5px;">${invoice.invoiceNumber}</div>
        </div>

        <div style="text-align: right;">
          <div style="font-size: 16px; font-weight: 600; color: #2563eb;">KARTHICK KUMARAN M</div>
          <div style="font-size: 12px; color: #6b7280;">+91 9159538955</div>
          <div style="font-size: 12px; color: #6b7280;">karthickkumaran20@gmail.com</div>
        </div>
      </div>

      <div style="border-bottom: 2px solid #111827; margin: 20px 0;"></div>

      <!-- BILL + DATE SECTION -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div>
          <div style="font-size: 12px; color: #6b7280; font-weight: 600;">BILL TO</div>
          <div style="font-size: 18px; font-weight: 600; margin-top: 5px;">${client.name.toUpperCase()}</div>
          ${client.phone ? `<div style="font-size: 12px; color: #6b7280;">${client.phone}</div>` : ''}
        </div>

        <div style="text-align: right; font-size: 12px;">
          <div style="color: #9ca3af;">DATE ISSUED</div>
          <div style="font-weight: 600; margin-bottom: 5px;">${formattedDate}</div>

          <div style="color: #9ca3af;">DUE DATE</div>
          <div style="font-weight: 600;">${formattedDueDate}</div>
        </div>
      </div>

      <!-- TABLE -->
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding-bottom: 10px; border-bottom: 2px solid #111827; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">DESCRIPTION</th>
            <th style="padding-bottom: 10px; border-bottom: 2px solid #111827; text-align: right; font-size: 12px; color: #6b7280; text-transform: uppercase;">PRICE</th>
          </tr>
        </thead>
        <tbody>
          ${tasks.map(task => `
            <tr>
              <td style="padding: 15px 0 5px 0; font-size: 14px; font-weight: 600;">${task.title.toUpperCase()}</td>
              <td style="padding: 15px 0 5px 0; text-align: right; font-size: 14px; font-weight: 600;">${formatCurrency(task.amount || 0, invoice.currency)}</td>
            </tr>
            ${task.checklist && task.checklist.length > 0 ? `
              <tr>
                <td colspan="2" style="padding-bottom: 10px;">
                  ${task.checklist.map(item => `
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; margin-left: 10px; margin-bottom: 2px;">
                      <span>• ${item.text.toUpperCase()}</span>
                      <span>${formatCurrency(item.price || 0, invoice.currency)}</span>
                    </div>
                  `).join('')}
                </td>
              </tr>
            ` : ''}
          `).join('')}
        </tbody>
      </table>

      <!-- TOTAL -->
      <div style="margin-top: 30px; text-align: right;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase;">SUBTOTAL ${formatCurrency(invoice.amount, invoice.currency)}</div>

        ${invoice.advancePaid && invoice.advancePaid > 0 ? `
           <div style="font-size: 12px; color: #10b981; margin-top: 5px; font-weight: 600; text-transform: uppercase;">ADVANCE PAID - ${formatCurrency(invoice.advancePaid, invoice.currency)}</div>
        ` : ''}

        <div style="margin-top: 15px; display: inline-table; border-radius: 8px; overflow: hidden; border-collapse: collapse;">
          <div style="display: table-cell; background: #111827; color: #ffffff; padding: 12px 25px; font-size: 12px; font-weight: 700; letter-spacing: 2px; vertical-align: middle; text-transform: uppercase;">
            BALANCE DUE
          </div>
          <div style="display: table-cell; background: #2563eb; color: #ffffff; padding: 12px 25px; font-size: 24px; font-weight: 800; vertical-align: middle;">
            ${formatCurrency(balanceDue, invoice.currency)}
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div style="margin-top: 80px; text-align: right; font-size: 12px; color: #9ca3af; letter-spacing: 2px;">
        THANK YOU
      </div>

    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = html;
  document.body.appendChild(element);

  const opt = {
    margin: 10,
    filename: `${invoice.invoiceNumber}.pdf`,
    image: { type: 'jpeg' as const, quality: 0.98 },
    html2canvas: { scale: 3, useCORS: true, logging: false },
    jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    document.body.removeChild(element);
  });
};

export const generateStatementPDF = (ledger: any[]) => {
  const doc = new jsPDF();
  const primaryBlue: [number, number, number] = [37, 99, 235];

  // Header
  doc.setFillColor(primaryBlue[0], primaryBlue[1], primaryBlue[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('ACCOUNT STATEMENT', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, 140, 25);

  const formatPdfCurrency = (amount: number) => {
    return 'Rs.' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const tableRows = ledger.map(entry => {
    return [
      `${entry.category?.toUpperCase() || '-'} - ${entry.description?.toUpperCase() || '-'}`,
      `${entry.type === 'income' ? '+' : '-'} ${formatPdfCurrency(entry.amount)}`
    ];
  });

  autoTable(doc, {
    startY: 50,
    head: [['DESCRIPTION / CATEGORY', 'AMOUNT (INR)']],
    body: tableRows,
    headStyles: { 
      fillColor: primaryBlue, 
      textColor: 255,
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
  doc.text(formatPdfCurrency(totalIncome), 200, finalY, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EXPENSE:', 140, finalY + 7);
  doc.setTextColor(244, 63, 94);
  doc.text(formatPdfCurrency(totalExpense), 200, finalY + 7, { align: 'right' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(140, finalY + 10, 200, finalY + 10);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.text('NET BALANCE:', 140, finalY + 18);
  
  const balanceColor: [number, number, number] = totalBalance >= 0 ? [16, 185, 129] : [244, 63, 94];
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.text(formatPdfCurrency(totalBalance), 200, finalY + 18, { align: 'right' });

  doc.save(`Statement_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
