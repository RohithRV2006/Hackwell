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

export function exportAttendanceSheet(title: string, teams: any[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and print the Attendance Sheet.');
    return;
  }

  const generatedDate = new Date().toLocaleString();

  let tableRowsHtml = '';
  let siNo = 1;

  teams.forEach((team) => {
    const membersList: Array<{ name: string; batch: string; dept: string; role: string }> = [];

    // Lead
    if (team.leadData || team.leadEmail) {
      membersList.push({
        name: team.leadData?.name || team.leadEmail || 'Team Lead',
        batch: team.leadData?.batchNumber || '—',
        dept: team.leadData?.department || '—',
        role: 'Lead',
      });
    }

    // Additional members
    if (Array.isArray(team.membersData)) {
      team.membersData.forEach((m: any) => {
        membersList.push({
          name: m.name || 'Member',
          batch: m.batchNumber || '—',
          dept: m.department || '—',
          role: 'Member',
        });
      });
    }

    if (membersList.length === 0) {
      membersList.push({
        name: 'Member 1',
        batch: '—',
        dept: '—',
        role: 'Member',
      });
    }

    const memberCount = membersList.length;
    const labName = team.finalVenue || team.assignedLabName || team.labNo || team.venue || 'TBA';

    membersList.forEach((m, idx) => {
      if (idx === 0) {
        tableRowsHtml += `
          <tr style="border-top: 2px solid #0F172A;">
            <td rowspan="${memberCount}" style="border: 1px solid #64748B; padding: 10px; text-align: center; font-weight: bold; font-size: 13px; vertical-align: middle; background-color: #FAFAFA;">${siNo}</td>
            <td rowspan="${memberCount}" style="border: 1px solid #64748B; padding: 10px; font-weight: bold; font-size: 13px; vertical-align: middle; background-color: #FAFAFA;">
              <div>${team.teamName}</div>
              <div style="font-size: 10px; color: #64748B; font-weight: normal; margin-top: 2px;">${team.displayId || team.id}</div>
            </td>
            <td rowspan="${memberCount}" style="border: 1px solid #64748B; padding: 10px; font-weight: bold; font-size: 12px; text-align: center; vertical-align: middle; background-color: #FAFAFA;">${labName}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; font-size: 12px; font-weight: 600;">${m.name}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; font-size: 12px; font-family: monospace;">${m.batch}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; font-size: 12px;">${m.dept}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; width: 130px;"></td>
          </tr>
        `;
      } else {
        tableRowsHtml += `
          <tr>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; font-size: 12px; font-weight: 600;">${m.name}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; font-size: 12px; font-family: monospace;">${m.batch}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; font-size: 12px;">${m.dept}</td>
            <td style="border: 1px solid #94A3B8; padding: 8px 10px; width: 130px;"></td>
          </tr>
        `;
      }
    });

    siNo++;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hackwell 2.O - ${title} Attendance Sheet</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          body { font-family: 'Times New Roman', Times, serif, Arial, sans-serif; margin: 15px; color: #000; }
          .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 15px; text-align: center; }
          .title { font-size: 20px; font-weight: bold; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 14px; font-weight: bold; margin-top: 4px; text-transform: uppercase; color: #1E293B; }
          .meta { font-size: 11px; margin-top: 6px; display: flex; justify-content: space-between; font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          tr { page-break-inside: avoid; }
          th { border: 1px solid #000; padding: 8px; background-color: #F1F5F9; font-weight: bold; text-align: center; font-size: 12px; font-family: Arial, sans-serif; }
          td { color: #000; }
          .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; font-family: Arial, sans-serif; }
          .sig-box { border-top: 1px solid #000; width: 180px; text-align: center; padding-top: 5px; font-weight: bold; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="background-color: #0F172A; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 4px; cursor: pointer; font-size: 13px;">
             Print Attendance Sheet
          </button>
        </div>
        <div class="header">
          <h1 class="title">HACKWELL 2.O - OFFICIAL ATTENDANCE SHEET</h1>
          <div class="subtitle">${title}</div>
          <div class="meta">
            <span><strong>Date Generated:</strong> ${generatedDate}</span>
            <span><strong>Total Teams:</strong> ${teams.length}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px;">SI No</th>
              <th style="width: 170px;">Team Name</th>
              <th style="width: 100px;">Lab</th>
              <th>Member Name</th>
              <th style="width: 100px;">Batch No</th>
              <th style="width: 80px;">Dept</th>
              <th style="width: 130px;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colSpan="7" style="text-align: center; padding: 20px;">No teams registered.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <div class="sig-box">Coordinator Signature</div>
          <div class="sig-box">Event Convener Signature</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function exportRegistrationReportPDF(teams: any[]) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and view the Registration PDF Report.');
    return;
  }

  const generatedDate = new Date().toLocaleString();

  let tableRowsHtml = '';
  let siNo = 1;

  teams.forEach((team) => {
    const membersList: Array<{
      name: string;
      role: string;
      batch: string;
      dept: string;
      yearSec: string;
    }> = [];

    // Lead
    if (team.leadData || team.leadEmail) {
      const yearSecStr = [team.leadData?.year, team.leadData?.section].filter(Boolean).join(' / ') || '—';
      membersList.push({
        name: team.leadData?.name || 'Team Lead',
        role: 'Leader',
        batch: team.leadData?.batchNumber || '—',
        dept: team.leadData?.department || '—',
        yearSec: yearSecStr,
      });
    }

    // Members
    if (Array.isArray(team.membersData)) {
      team.membersData.forEach((m: any) => {
        const yearSecStr = [m.year, m.section].filter(Boolean).join(' / ') || '—';
        membersList.push({
          name: m.name || 'Member',
          role: 'Member',
          batch: m.batchNumber || '—',
          dept: m.department || '—',
          yearSec: yearSecStr,
        });
      });
    }

    if (membersList.length === 0) {
      membersList.push({
        name: 'Member 1',
        role: 'Member',
        batch: '—',
        dept: '—',
        yearSec: '—',
      });
    }

    const memberCount = membersList.length;
    const leadContactStr = `${team.leadEmail || ''}${team.leadData?.contactNumber ? ` | ${team.leadData.contactNumber}` : ''}`;

    membersList.forEach((m, idx) => {
      if (idx === 0) {
        tableRowsHtml += `
          <tr style="border-top: 2px solid #1E293B;">
            <td rowspan="${memberCount}" style="border: 1px solid #94A3B8; padding: 8px; text-align: center; font-weight: bold; font-size: 11px; vertical-align: middle; background-color: #F8FAFC;">${siNo}</td>
            <td rowspan="${memberCount}" style="border: 1px solid #94A3B8; padding: 8px; font-mono font-weight: bold; font-size: 11px; vertical-align: middle; background-color: #F8FAFC; color: #2563EB;">${team.displayId || team.id}</td>
            <td rowspan="${memberCount}" style="border: 1px solid #94A3B8; padding: 8px; font-weight: bold; font-size: 12px; vertical-align: middle; background-color: #F8FAFC;">${team.teamName}</td>
            <td rowspan="${memberCount}" style="border: 1px solid #94A3B8; padding: 8px; font-size: 11px; color: #475569; vertical-align: middle; background-color: #F8FAFC; max-width: 200px;">${team.problemStatement || 'Not assigned'}</td>
            <td rowspan="${memberCount}" style="border: 1px solid #94A3B8; padding: 8px; font-size: 11px; color: #0F172A; vertical-align: middle; background-color: #F8FAFC;">
              <div style="font-weight: 600; color: #1E293B;">${team.leadEmail || '—'}</div>
              ${team.leadData?.contactNumber ? `<div style="font-size: 10px; color: #64748B; font-family: monospace; margin-top: 2px;">${team.leadData.contactNumber}</div>` : ''}
            </td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px; font-weight: 600;">${m.name}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px; font-weight: bold; color: #2563EB;">${m.role}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px; font-family: monospace;">${m.batch}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px;">${m.dept}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px;">${m.yearSec}</td>
          </tr>
        `;
      } else {
        tableRowsHtml += `
          <tr>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px; font-weight: 600;">${m.name}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px; font-weight: bold; color: #64748B;">${m.role}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px; font-family: monospace;">${m.batch}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px;">${m.dept}</td>
            <td style="border: 1px solid #CBD5E1; padding: 7px 9px; font-size: 11px;">${m.yearSec}</td>
          </tr>
        `;
      }
    });

    siNo++;
  });

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Hackwell 2.O - Registration Phase Detailed Report</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 15px; color: #0F172A; }
          .header { border-bottom: 2px solid #2563EB; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #1D4ED8; margin: 0; }
          .subtitle { font-size: 12px; color: #64748B; margin-top: 3px; }
          .meta { font-size: 11px; color: #64748B; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          tr { page-break-inside: avoid; }
          th { border: 1px solid #64748B; padding: 8px 10px; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: left; font-size: 11px; text-transform: uppercase; }
          td { color: #0F172A; }
          .footer { margin-top: 30px; border-top: 1px solid #CBD5E1; padding-top: 10px; display: flex; justify-content: space-between; font-size: 11px; color: #64748B; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 15px; text-align: right;">
          <button onclick="window.print()" style="background-color: #2563EB; color: white; border: none; padding: 9px 18px; font-weight: bold; border-radius: 4px; cursor: pointer; font-size: 12px;">
             Print / Save PDF Report
          </button>
        </div>
        <div class="header">
          <div>
            <h1 class="title">Hackwell 2.O - Registration Phase Detailed Report</h1>
            <div class="subtitle">Detailed Team & All Member Breakdown</div>
          </div>
          <div class="meta">
            <div><strong>Generated:</strong> ${generatedDate}</div>
            <div><strong>Total Teams:</strong> ${teams.length}</div>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">SI No</th>
              <th style="width: 90px;">Display ID</th>
              <th style="width: 140px;">Team Name</th>
              <th>Problem Statement</th>
              <th style="width: 170px;">Lead Email / Contact</th>
              <th style="width: 130px;">Member Name</th>
              <th style="width: 60px;">Role</th>
              <th style="width: 80px;">Batch No</th>
              <th style="width: 70px;">Dept</th>
              <th style="width: 80px;">Year / Sec</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colSpan="10" style="text-align: center; padding: 20px;">No registered teams found.</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <div>Hackwell 2.O Official Event Management Report</div>
          <div>Page 1</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function exportRegistrationReportCSV(teams: any[]) {
  const headers = [
    'SI No',
    'Display ID',
    'Team Name',
    'Problem Statement',
    'Lead Email / Contact',
    'Member Name',
    'Role',
    'Batch No',
    'Dept',
    'Year / Sec',
  ];

  const rows: (string | number)[][] = [];
  let siNo = 1;

  teams.forEach((team) => {
    const leadContactStr = `${team.leadEmail || ''}${team.leadData?.contactNumber ? ` | ${team.leadData.contactNumber}` : ''}`;

    // Lead
    if (team.leadData || team.leadEmail) {
      const yearSecStr = [team.leadData?.year, team.leadData?.section].filter(Boolean).join(' / ') || 'N/A';
      rows.push([
        siNo,
        team.displayId || team.id,
        team.teamName,
        team.problemStatement || 'Not assigned',
        leadContactStr,
        team.leadData?.name || 'Team Lead',
        'Leader',
        team.leadData?.batchNumber || 'N/A',
        team.leadData?.department || 'N/A',
        yearSecStr,
      ]);
    }

    // Members
    if (Array.isArray(team.membersData)) {
      team.membersData.forEach((m: any) => {
        const yearSecStr = [m.year, m.section].filter(Boolean).join(' / ') || 'N/A';
        rows.push([
          siNo,
          team.displayId || team.id,
          team.teamName,
          team.problemStatement || 'Not assigned',
          leadContactStr,
          m.name || 'Member',
          'Member',
          m.batchNumber || 'N/A',
          m.department || 'N/A',
          yearSecStr,
        ]);
      });
    }

    siNo++;
  });

  exportToCSV('Timeline1_Registration_Detailed_Report', headers, rows);
}
