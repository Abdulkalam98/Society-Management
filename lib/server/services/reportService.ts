import { createObjectCsvStringifier } from 'csv-writer';
import PDFDocument from 'pdfkit';
import { prisma } from '@/lib/server/prisma';

// ─── Monthly Collection Report ────────────────────────────────────────────────

export async function getMonthlyReport(month: number, year: number) {
  const flatBills = await prisma.flatBill.findMany({
    where: { expense: { month, year } },
    include: {
      flat: { select: { unitNumber: true, block: true, occupantName: true } },
      expense: { include: { category: true } },
    },
  });

  const totalBilled = flatBills.reduce((s, b) => s + b.amountDue, 0);
  const totalCollected = flatBills.reduce((s, b) => s + b.amountPaid, 0);
  const totalOutstanding = totalBilled - totalCollected;
  const paidCount = flatBills.filter((b) => b.status === 'PAID').length;
  const pendingCount = flatBills.filter((b) => b.status !== 'PAID').length;

  return {
    month,
    year,
    summary: { totalBilled, totalCollected, totalOutstanding, paidCount, pendingCount },
    bills: flatBills,
  };
}

// ─── Yearly Aggregate ─────────────────────────────────────────────────────────

export async function getYearlyReport(year: number) {
  const monthly: Array<{ month: number; totalBilled: number; totalCollected: number }> = [];

  for (let m = 1; m <= 12; m++) {
    const bills = await prisma.flatBill.findMany({
      where: { expense: { month: m, year } },
      select: { amountDue: true, amountPaid: true },
    });
    monthly.push({
      month: m,
      totalBilled: bills.reduce((s, b) => s + b.amountDue, 0),
      totalCollected: bills.reduce((s, b) => s + b.amountPaid, 0),
    });
  }

  const totalBilled = monthly.reduce((s, m) => s + m.totalBilled, 0);
  const totalCollected = monthly.reduce((s, m) => s + m.totalCollected, 0);

  return { year, summary: { totalBilled, totalCollected, outstanding: totalBilled - totalCollected }, monthly };
}

// ─── Per-Flat Outstanding Report ─────────────────────────────────────────────

export async function getFlatOutstandingReport() {
  const flats = await prisma.flat.findMany({
    where: { isActive: true },
    include: {
      owner: { select: { email: true, phone: true } },
      flatBills: {
        where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
        include: { expense: { include: { category: true } } },
      },
    },
    orderBy: [{ block: 'asc' }, { unitNumber: 'asc' }],
  });

  return flats.map((flat) => ({
    unitNumber: flat.unitNumber,
    block: flat.block,
    occupantName: flat.occupantName,
    ownerEmail: flat.owner.email,
    totalOutstanding: flat.flatBills.reduce((s, b) => s + (b.amountDue - b.amountPaid), 0),
    billCount: flat.flatBills.length,
    bills: flat.flatBills,
  }));
}

// ─── CSV Export ───────────────────────────────────────────────────────────────

export async function exportMonthlyReportCsv(month: number, year: number): Promise<string> {
  const report = await getMonthlyReport(month, year);

  const csvStringifier = createObjectCsvStringifier({
    header: [
      { id: 'unit', title: 'Unit' },
      { id: 'block', title: 'Block' },
      { id: 'occupant', title: 'Occupant' },
      { id: 'expense', title: 'Expense' },
      { id: 'category', title: 'Category' },
      { id: 'amountDue', title: 'Amount Due (INR)' },
      { id: 'amountPaid', title: 'Amount Paid (INR)' },
      { id: 'status', title: 'Status' },
      { id: 'dueDate', title: 'Due Date' },
    ],
  });

  const rows = report.bills.map((b) => ({
    unit: b.flat.unitNumber,
    block: b.flat.block,
    occupant: b.flat.occupantName,
    expense: b.expense.title,
    category: b.expense.category.name,
    amountDue: b.amountDue.toFixed(2),
    amountPaid: b.amountPaid.toFixed(2),
    status: b.status,
    dueDate: b.dueDate.toLocaleDateString('en-IN'),
  }));

  return csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(rows);
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

export function buildMonthlyReportPdf(
  report: Awaited<ReturnType<typeof getMonthlyReport>>
): InstanceType<typeof PDFDocument> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const society = process.env.SOCIETY_NAME ?? 'Society Management';

  const monthName = new Date(report.year, report.month - 1).toLocaleString('en-IN', { month: 'long' });

  doc.fontSize(18).text(society, { align: 'center' });
  doc.fontSize(14).text(`Monthly Collection Report — ${monthName} ${report.year}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Total Billed:       ₹${report.summary.totalBilled.toFixed(2)}`);
  doc.text(`Total Collected:    ₹${report.summary.totalCollected.toFixed(2)}`);
  doc.text(`Outstanding:        ₹${report.summary.totalOutstanding.toFixed(2)}`);
  doc.text(`Paid Flats:         ${report.summary.paidCount}`);
  doc.text(`Pending Flats:      ${report.summary.pendingCount}`);
  doc.moveDown();

  doc.fontSize(11).text('--- Bill Details ---', { underline: true });
  doc.moveDown(0.5);

  for (const b of report.bills) {
    doc.fontSize(10).text(
      `${b.flat.unitNumber} | ${b.flat.occupantName} | ${b.expense.title} | ` +
      `Due: ₹${b.amountDue.toFixed(2)} | Paid: ₹${b.amountPaid.toFixed(2)} | ${b.status}`
    );
  }

  return doc;
}
