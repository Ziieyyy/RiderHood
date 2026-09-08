import { Platform } from 'react-native';
import type { WorkshopReportMetrics } from '../services/reportService';

export interface ReportPdfParams {
  workshopName: string;
  workshopAddress?: string;
  workshopPhone?: string;
  timeRangeLabel: string;
  report: WorkshopReportMetrics;
  generatedDate?: string;
  language?: string;
}

export function generateReportHtml({
  workshopName,
  workshopAddress,
  workshopPhone,
  timeRangeLabel,
  report,
  generatedDate = new Date().toLocaleString(),
  language = 'en',
}: ReportPdfParams): string {
  const isMs = language.startsWith('ms');

  const totalAllBookings =
    (report.completedBookingsCount || 0) +
    (report.pendingBookingsCount || 0) +
    (report.cancelledBookingsCount || 0);

  const completionRate =
    totalAllBookings > 0
      ? (((report.completedBookingsCount || 0) / totalAllBookings) * 100).toFixed(1)
      : '0.0';

  const avgBookingVal = report.averageBookingValue || 0;

  return `
<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="utf-8">
  <title>RiderHood Workshop Report - ${workshopName}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 18mm;
    }
    * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #FFFFFF;
      color: #0F172A;
      margin: 0;
      padding: 0;
      font-size: 12px;
      line-height: 1.5;
    }

    /* Header Bar */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2.5px solid #FF6B00;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 900;
      color: #FF6B00;
      letter-spacing: 1px;
      margin: 0;
      line-height: 1.1;
    }
    .brand-sub {
      font-size: 13px;
      color: #475569;
      font-weight: 700;
      margin-top: 3px;
    }
    .ws-name {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 6px;
    }
    .ws-sub {
      font-size: 11px;
      color: #64748B;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #475569;
    }
    .meta-box strong {
      color: #0F172A;
    }
    .status-badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 800;
      background: #E0F2FE;
      color: #0369A1;
      border: 1px solid #BAE6FD;
      margin-top: 4px;
      text-transform: uppercase;
    }

    /* KPI Summary Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      text-align: center;
    }
    .kpi-label {
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 800;
      color: #64748B;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 20px;
      font-weight: 900;
      color: #FF6B00;
      margin-top: 4px;
      line-height: 1.2;
    }
    .kpi-sub {
      font-size: 10px;
      color: #94A3B8;
      margin-top: 2px;
      font-weight: 600;
    }

    /* Section Headings */
    .section-title {
      font-size: 13px;
      font-weight: 900;
      color: #0F172A;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      margin: 22px 0 10px 0;
      border-left: 4px solid #FF6B00;
      padding-left: 8px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 11.5px;
    }
    th {
      background: #F1F5F9;
      color: #334155;
      font-weight: 800;
      text-align: left;
      padding: 9px 12px;
      border-bottom: 2px solid #CBD5E1;
      text-transform: uppercase;
      font-size: 10.5px;
      letter-spacing: 0.4px;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #E2E8F0;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #F8FAFC;
    }
    .text-right {
      text-align: right;
    }
    .text-center {
      text-align: center;
    }

    /* Summary Metrics Mini Grid */
    .summary-box {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 18px;
    }
    .summary-item {
      font-size: 11px;
    }
    .summary-item span {
      color: #64748B;
    }
    .summary-item strong {
      color: #0F172A;
      font-size: 12px;
    }

    /* Footer */
    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #94A3B8;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="report-header">
    <div>
      <div class="brand-title">⚡ RIDERHOOD</div>
      <div class="brand-sub">${isMs ? 'Laporan Prestasi & Hasil Bengkel' : 'Workshop Performance & Revenue Report'}</div>
      <div class="ws-name">${workshopName}</div>
      ${workshopAddress ? `<div class="ws-sub">📍 ${workshopAddress}</div>` : ''}
      ${workshopPhone ? `<div class="ws-sub">📞 ${workshopPhone}</div>` : ''}
    </div>
    <div class="meta-box">
      <div>${isMs ? 'Tempoh' : 'Period'}: <strong>${timeRangeLabel}</strong></div>
      <div>${isMs ? 'Dijana pada' : 'Generated'}: <strong>${generatedDate}</strong></div>
      <div class="status-badge">${isMs ? 'LAPORAN RASMI' : 'OFFICIAL REPORT'}</div>
    </div>
  </div>

  <!-- Key Performance Indicators (4-Box Grid) -->
  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">${isMs ? 'Jumlah Hasil Kasar' : 'Gross Revenue'}</div>
      <div class="kpi-val">RM ${(report.totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <div class="kpi-sub">${report.completedBookingsCount || 0} ${isMs ? 'servis selesai' : 'completed jobs'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">${isMs ? 'Jumlah Tempahan' : 'Total Appointments'}</div>
      <div class="kpi-val" style="color: #0F172A;">${totalAllBookings}</div>
      <div class="kpi-sub">${report.completedBookingsCount || 0} ${isMs ? 'selesai' : 'completed'} • ${report.pendingBookingsCount || 0} ${isMs ? 'menunggu' : 'pending'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">${isMs ? 'Nilai Purata Tempahan' : 'Avg Order Value'}</div>
      <div class="kpi-val" style="color: #0F172A;">RM ${avgBookingVal.toFixed(2)}</div>
      <div class="kpi-sub">${isMs ? 'Setiap servis siap' : 'Per completed booking'}</div>
    </div>

    <div class="kpi-card">
      <div class="kpi-label">${isMs ? 'Pelanggan Unik' : 'Unique Riders Served'}</div>
      <div class="kpi-val" style="color: #10B981;">${report.uniqueCustomersCount || report.completedBookingsCount || 0}</div>
      <div class="kpi-sub">${completionRate}% ${isMs ? 'kadar penyelesaian' : 'completion rate'}</div>
    </div>
  </div>

  <!-- Bookings Breakdown Summary -->
  <div class="summary-box">
    <div class="summary-item">
      <span>${isMs ? 'Servis Selesai' : 'Completed Services'}:</span>
      <strong>${report.completedBookingsCount || 0}</strong>
    </div>
    <div class="summary-item">
      <span>${isMs ? 'Tempahan Menunggu' : 'Pending Requests'}:</span>
      <strong>${report.pendingBookingsCount || 0}</strong>
    </div>
    <div class="summary-item">
      <span>${isMs ? 'Dibatalkan / Ditolak' : 'Cancelled / Rejected'}:</span>
      <strong>${report.cancelledBookingsCount || 0}</strong>
    </div>
  </div>

  <!-- Popular Services Breakdown -->
  <div class="section-title">${isMs ? 'Pakej Servis & Penalaan Popular' : 'Popular Services & Maintenance Packages'}</div>
  <table>
    <thead>
      <tr>
        <th style="width: 36px;" class="text-center">#</th>
        <th>${isMs ? 'Nama Pakej Servis' : 'Service Package Name'}</th>
        <th class="text-right">${isMs ? 'Jumlah Siap' : 'Jobs Completed'}</th>
        <th class="text-right">${isMs ? 'Hasil Dijana (RM)' : 'Revenue (RM)'}</th>
      </tr>
    </thead>
    <tbody>
      ${
        report.popularServices && report.popularServices.length > 0
          ? report.popularServices
              .map(
                (s, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td><strong>${s.service_name}</strong></td>
          <td class="text-right">${s.count}</td>
          <td class="text-right"><strong>RM ${Number(s.revenue || 0).toFixed(2)}</strong></td>
        </tr>`
              )
              .join('')
          : `<tr><td colspan="4" class="text-center" style="color: #94A3B8;">${isMs ? 'Tiada data pakej servis untuk tempoh ini.' : 'No completed services recorded for this period.'}</td></tr>`
      }
    </tbody>
  </table>

  <!-- Spare Parts Usage Section -->
  <div class="section-title">${isMs ? 'Penggunaan Alat Ganti & Inventori' : 'Spare Parts & Inventory Consumption'}</div>
  <table>
    <thead>
      <tr>
        <th style="width: 36px;" class="text-center">#</th>
        <th>${isMs ? 'Nama Alat Ganti / Item' : 'Spare Part Item Name'}</th>
        <th class="text-right">${isMs ? 'Kuantiti Digunakan' : 'Total Quantity Used'}</th>
        <th class="text-right">${isMs ? 'Kekerapan Servis' : 'Service Frequency'}</th>
      </tr>
    </thead>
    <tbody>
      ${
        report.inventoryUsage && report.inventoryUsage.length > 0
          ? report.inventoryUsage
              .map(
                (p, i) => `
        <tr>
          <td class="text-center">${i + 1}</td>
          <td><strong>${p.part_name}</strong></td>
          <td class="text-right">${p.quantity_used} ${isMs ? 'unit' : 'units'}</td>
          <td class="text-right">${p.times_used || p.quantity_used} ${isMs ? 'kali' : 'jobs'}</td>
        </tr>`
              )
              .join('')
          : `<tr><td colspan="4" class="text-center" style="color: #94A3B8;">${isMs ? 'Tiada alat ganti direkodkan untuk tempoh ini.' : 'No spare parts recorded for this period.'}</td></tr>`
      }
    </tbody>
  </table>

  <!-- Footer -->
  <div class="footer">
    <div>RiderHood Digital Motorcycle Ecosystem • ${isMs ? 'Laporan Prestasi Sulit' : 'Confidential Performance Report'}</div>
    <div>${isMs ? 'Muka surat 1 daripada 1' : 'Page 1 of 1'}</div>
  </div>

  <script>
    // Automatically trigger Print / Save as PDF when opened
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>
  `;
}

/**
 * Exports report as a PDF by opening the printable document and invoking the browser's PDF print driver.
 */
export function exportReportToPdf(params: ReportPdfParams): boolean {
  try {
    const html = generateReportHtml(params);

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        return true;
      }

      // Fallback: Invisible iframe technique
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }, 300);
        return true;
      }
    }

    return false;
  } catch (err) {
    console.error('Failed to export report PDF:', err);
    return false;
  }
}
