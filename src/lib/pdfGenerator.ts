import html2pdf from 'html2pdf.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, Client, Task } from '../types';
import { formatCurrency } from './formatters';
import { format } from 'date-fns';

export const generateInvoicePDF = (invoice: any, client: any, tasks: any[]) => {
  const balanceDue = invoice.amount - (invoice.advancePaid || 0);
  const formattedDate = format(invoice.createdAt?.toDate ? invoice.createdAt.toDate() : new Date(), 'MMM dd, yyyy').toUpperCase();
  const formattedDueDate = invoice.dueDate 
    ? format(invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate), 'MMM dd, yyyy').toUpperCase()
    : 'UPON RECEIPT';

  const templateType = invoice.template || 'Enterprise';

  let html = '';

  if (templateType === 'Minimalist') {
    html = `
      <div id="invoice-template" style="width: 700px; margin: auto; background: #ffffff; padding: 60px; font-family: 'Helvetica', Arial, sans-serif; color: #000;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #eee; padding-bottom: 20px;">
          <div style="font-size: 24px; font-weight: 300; letter-spacing: 2px;">INVOICE</div>
          <div style="text-align: right; font-size: 10px; color: #888;">
            <div style="font-weight: bold; color: #000; margin-bottom: 5px;">KARTHICK KUMARAN M</div>
            <div>${invoice.invoiceNumber}</div>
            <div>${formattedDate}</div>
          </div>
        </div>

        <div style="margin: 40px 0;">
          <div style="font-size: 9px; color: #888; margin-bottom: 5px; letter-spacing: 1px;">BILL TO</div>
          <div style="font-size: 14px; font-weight: bold;">${client.name.toUpperCase()}</div>
          ${client.company ? `<div style="font-size: 11px; margin-top: 2px;">${client.company.toUpperCase()}</div>` : ''}
          <div style="font-size: 10px; color: #555; margin-top: 5px; max-width: 250px;">
            ${client.address ? client.address.replace(/\n/g, '<br>') : ''}<br>
            ${client.email || ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; padding: 10px 0; font-size: 10px; font-weight: bold; letter-spacing: 1px;">ITEM</th>
              <th style="text-align: right; padding: 10px 0; font-size: 10px; font-weight: bold; letter-spacing: 1px;">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${tasks.map(task => `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px 0; font-size: 11px;">
                  <div style="font-weight: bold;">${task.title.toUpperCase()}</div>
                </td>
                <td style="padding: 15px 0; text-align: right; font-size: 11px; font-weight: bold;">${formatCurrency(task.amount || 0, invoice.currency)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
          <div style="width: 200px; font-size: 10px;">
            <div style="display: flex; justify-content: space-between; padding: 5px 0;">
              <span>Subtotal</span>
              <span>${formatCurrency(tasks.reduce((sum, t) => sum + (t.amount || 0), 0) + (invoice.roundOff || 0), invoice.currency)}</span>
            </div>
            ${invoice.showDiscount ? `
              <div style="display: flex; justify-content: space-between; padding: 5px 0;">
                <span>Discount</span>
                <span>- ${formatCurrency(invoice.discount || 0, invoice.currency)}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 1px solid #000; font-weight: bold; font-size: 12px; margin-top: 10px;">
              <span>Total</span>
              <span>${formatCurrency(invoice.amount, invoice.currency)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 15px 10px; background: #f9f9f9; font-weight: bold; color: #000; margin-top: 20px; border: 1px solid #eee; text-align: center;">
              <span style="width: 100%;">BALANCE DUE: ${formatCurrency(balanceDue, invoice.currency)}</span>
            </div>
          </div>
        </div>
        
        <div style="margin-top: 100px; text-align: center; font-size: 8px; color: #aaa; letter-spacing: 2px;">
          THANK YOU FOR YOUR BUSINESS
        </div>
      </div>
    `;
  } else if (templateType === 'Creative') {
    html = `
      <div id="invoice-template" style="width: 700px; margin: auto; background: #ffffff; min-height: 900px; font-family: 'Segoe UI', Arial, sans-serif; position: relative; overflow: hidden; border: 1px solid #eee;">
        <!-- Accent Bar -->
        <div style="position: absolute; left: 0; top: 0; bottom: 0; width: 60px; background: linear-gradient(to bottom, #4f46e5, #0ea5e9);"></div>
        
        <div style="margin-left: 60px; padding: 60px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <div style="width: 40px; height: 40px; background: #4f46e5; border-radius: 12px; margin-bottom: 20px;"></div>
              <div style="font-size: 42px; font-weight: 900; color: #1e1b4b; line-height: 1;">INVOICE</div>
              <div style="font-size: 11px; font-weight: bold; color: #4f46e5; margin-top: 5px; letter-spacing: 2px;">${invoice.invoiceNumber}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: 900; color: #1e1b4b;">KARTHICK KUMARAN M</div>
              <div style="font-size: 10px; color: #64748b; font-weight: bold; margin-top: 5px;">${formattedDate}</div>
            </div>
          </div>

          <div style="margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div>
              <div style="font-size: 10px; font-weight: 900; color: #cbd5e1; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">CLIENT DETAILS</div>
              <div style="font-size: 18px; font-weight: 900; color: #1e1b4b;">${client.name.toUpperCase()}</div>
              ${client.company ? `<div style="font-size: 11px; color: #6366f1; font-weight: bold;">${client.company.toUpperCase()}</div>` : ''}
              <div style="margin-top: 15px; font-size: 10px; color: #64748b; line-height: 1.6;">
                ${client.address ? client.address.replace(/\n/g, '<br>') : ''}<br>
                ${client.email || ''}
              </div>
            </div>
            <div style="text-align: right; display: flex; flex-direction: column; justify-content: flex-end;">
               <div style="background: #f1f5f9; padding: 20px; border-radius: 20px; text-align: right;">
                  <div style="font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 5px;">AMOUNT DUE</div>
                  <div style="font-size: 28px; font-weight: 900; color: #4f46e5;">${formatCurrency(balanceDue, invoice.currency)}</div>
               </div>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 60px;">
            <thead>
              <tr style="text-align: left; font-size: 10px; font-weight: 900; color: #94a3b8; border-bottom: 1px solid #f1f5f9;">
                <th style="padding-bottom: 15px;">DESCRIPTION</th>
                <th style="padding-bottom: 15px; text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${tasks.map(task => `
                <tr style="border-bottom: 1px solid #f8fafc;">
                  <td style="padding: 20px 0;">
                    <div style="font-size: 14px; font-weight: 900; color: #1e1b4b;">${task.title.toUpperCase()}</div>
                  </td>
                  <td style="padding: 20px 0; text-align: right;">
                    <div style="font-size: 14px; font-weight: 900; color: #1e1b4b;">${formatCurrency(task.amount || 0, invoice.currency)}</div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; text-align: right;">
            <div style="display: inline-block; text-align: right; space-y: 8px;">
               <div style="font-size: 12px; font-weight: bold; color: #64748b;">TOTAL: ${formatCurrency(invoice.amount, invoice.currency)}</div>
               ${invoice.advancePaid ? `<div style="font-size: 11px; font-weight: bold; color: #10b981;">PAID: -${formatCurrency(invoice.advancePaid, invoice.currency)}</div>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Enterprise (Default)
    html = `
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
            ${client.company ? `<div style="font-size: 12px; color: #111827; font-weight: 600; margin-top: 2px;">${client.company.toUpperCase()}</div>` : ''}
            
            <div style="margin-top: 10px; line-height: 1.4;">
              ${client.address ? `<div style="font-size: 11px; color: #4b5563; max-width: 250px;">${client.address.replace(/\n/g, '<br>')}</div>` : ''}
              ${client.phone ? `<div style="font-size: 11px; color: #4b5563;">${client.phone}</div>` : ''}
              ${client.email ? `<div style="font-size: 11px; color: #4b5563;">${client.email}</div>` : ''}
            </div>
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
                    ${task.checklist.map((item: any) => `
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
    <div style="font-size: 10px; color: #6b7280; font-weight: 600; text-transform: uppercase;">
      SUBTOTAL ${formatCurrency(tasks.reduce((sum, t) => sum + t.amount, 0) + (invoice.roundOff || 0), invoice.currency)}
    </div>
  
    ${invoice.showDiscount && (invoice.discount || 0) > 0 ? `
       <div style="font-size: 10px; color: #f43f5e; margin-top: 5px; font-weight: 700; text-transform: uppercase;">
         DISCOUNT - ${formatCurrency(invoice.discount, invoice.currency)}
       </div>
    ` : ''}
  
    ${invoice.advancePaid && invoice.advancePaid > 0 ? `
       <div style="font-size: 10px; color: #10b981; margin-top: 5px; font-weight: 700; text-transform: uppercase;">
         ADVANCE PAID - ${formatCurrency(invoice.advancePaid, invoice.currency)}
       </div>
    ` : ''}
  
    <!-- BALANCE DUE BOX -->
    <table style="
      margin-top: 15px;
      border-radius: 8px;
      overflow: hidden;
      border-collapse: collapse;
      margin-left: auto;
    ">
      <tr>
  
        <!-- LEFT SIDE -->
        <td style="
          background: #111827;
          padding: 0;
          height: 58px;
          vertical-align: middle;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 30px;
            color: #ffffff;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 2px;
            text-transform: uppercase;
            white-space: nowrap;
            height: 100%;
            line-height: 58px;
            text-align: center;
          ">
            BALANCE DUE
          </div>
        </td>
  
        <!-- RIGHT SIDE -->
        <td style="
          background: #2563eb;
          padding: 0;
          min-width: 180px;
          height: 58px;
          vertical-align: middle;
        ">
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-size: 22px;
            font-weight: 800;
            height: 100%;
            line-height: 58px;
            text-align: center;
          ">
            ${formatCurrency(balanceDue, invoice.currency)}
          </div>
        </td>
  
      </tr>
    </table>
  </div>
  
        <!-- PAYMENT DETAILS -->
        ${invoice.bankAccountSelected === 'kotak' || (invoice.showUpiQr && balanceDue > 0 && invoice.currency === 'INR') ? `
          <div style="margin-top: 35px; width: 100%;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <!-- QR CODE ON LEFT -->
                <td style="width: 50%; vertical-align: top; text-align: left;">
                  ${invoice.showUpiQr && balanceDue > 0 && invoice.currency === 'INR' ? `
                    <div style="display: inline-block; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
                      <div style="background: white; padding: 10px; border-radius: 8px; border: 1px solid #f1f5f9; display: block; margin: 0 auto;">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`upi://pay?pa=9159538955@kotakbank&pn=KARTHICK%20KUMARAN%20M&tr=${invoice.invoiceNumber}&tn=Invoice%20${invoice.invoiceNumber}&am=${balanceDue}&cu=INR&mode=02&purpose=00`)}" 
                             style="width: 120px; height: 120px; display: block;" />
                      </div>
                      <div style="margin-top: 10px;">
                        <div style="font-size: 9px; font-weight: 700; text-transform: uppercase; color: #111827; letter-spacing: 1px;">Scan or Touch to Pay</div>
                        <div style="font-size: 7px; color: #64748b; font-weight: 600; text-transform: uppercase; margin-top: 2px; margin-bottom: 10px;">G-Pay, PhonePe, UPI Apps</div>
                        <a href="${`upi://pay?pa=9159538955@kotakbank&pn=KARTHICK%20KUMARAN%20M&tr=${invoice.invoiceNumber}&tn=Invoice%20${invoice.invoiceNumber}&am=${balanceDue}&cu=INR`}" 
                           style="display: block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; font-size: 10px; font-weight: 800; text-decoration: none; text-transform: uppercase; letter-spacing: 1px;">
                          Pay Now
                        </a>
                      </div>
                    </div>
                  ` : ''}
                </td>
                
                <!-- BANK DETAILS ON RIGHT -->
                <td style="width: 50%; vertical-align: bottom; text-align: right;">
                  ${invoice.bankAccountSelected === 'kotak' ? `
                    <div style="display: inline-block; text-align: left; background: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; min-width: 220px;">
                      <div style="font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px;">Bank Transfer Details</div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                        <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">A/C NO</span>
                        <span style="font-size: 10px; font-weight: 700; margin-left: 30px;">6546590111</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                        <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">IFSC</span>
                        <span style="font-size: 10px; font-weight: 700;">KKBK0008769</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 4px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                        <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">BRANCH</span>
                        <span style="font-size: 10px; font-weight: 700;">ERODE MAIN</span>
                      </div>
                      <div style="display: flex; justify-content: space-between;">
                        <span style="font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase;">UPI ID</span>
                        <span style="font-size: 10px; font-weight: 700;">9159538955@kotakbank</span>
                      </div>
                    </div>
                  ` : ''}
                </td>
              </tr>
            </table>
          </div>
        ` : ''}
  
        <!-- FOOTER -->
        <div style="margin-top: 60px; text-align: right; font-size: 10px; color: #9ca3af; letter-spacing: 3px; font-weight: 700; text-transform: uppercase;">
          THANK YOU
        </div>
  
      </div>
    `;
  }

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

export const downloadInvoicePDF = (invoice: Invoice, client: Client, tasks: Task[]) => {
  generateInvoicePDF(invoice, client, tasks);
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
