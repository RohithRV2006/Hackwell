export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitize = (str: string | number) => {
    const stringified = String(str ?? '');
    const escaped = stringified.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const headerLine = headers.map(sanitize).join(',');
  const rowLines = rows.map((row) => row.map(sanitize).join(','));
  const csvContent = [headerLine, ...rowLines].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToPDF(title: string, subtitle: string, headers: string[], rows: (string | number)[][]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and view the PDF report.');
    return;
  }

  const generatedDate = new Date().toLocaleString();

  const tableHeaderHtml = headers
    .map((h) => `<th style="border: 1px solid #CBD5E1; padding: 10px 12px; background-color: #F8FAFC; color: #1E293B; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">${h}</th>`)
    .join('');

  const tableRowsHtml = rows
    .map(
      (row, idx) => `
      <tr style="background-color: ${idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'};">
        ${row
          .map(
            (cell) => `<td style="border: 1px solid #E2E8F0; padding: 8px 12px; font-size: 12px; color: #334155;">${cell ?? '-'}</td>`
          )
          .join('')}
      </tr>
    `
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} Report</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 30px; color: #0F172A; }
          .header { border-bottom: 2px solid #2563EB; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; items-align: flex-end; }
          .title { font-size: 22px; font-weight: 800; color: #1D4ED8; margin: 0; }
          .subtitle { font-size: 13px; color: #64748B; margin-top: 4px; }
          .meta { font-size: 11px; color: #64748B; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .footer { margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #94A3B8; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="background-color: #2563EB; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 4px; cursor: pointer;">
            Print / Save as PDF
          </button>
        </div>
        <div class="header">
          <div>
            <h1 class="title">Hackwell 2.O - ${title}</h1>
            <div class="subtitle">${subtitle}</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${generatedDate}</div>
            <div><strong>Total Records:</strong> ${rows.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>${tableHeaderHtml}</tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
        <div class="footer">
          <div>Official Event Management Report - Hackwell 2.O</div>
          <div>Page 1</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
