import { NextRequest, NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { getPaymentReceipt } from '@/lib/server/services/paymentService';
import { authenticateRequest } from '@/lib/server/auth';
import { apiErrorResponse } from '@/lib/server/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  try {
    authenticateRequest(request);

    const receipt = await getPaymentReceipt(params.paymentId);

    // Generate PDF receipt
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve());
      doc.on('error', reject);

      const society = process.env.SOCIETY_NAME ?? 'Society Management';
      doc.fontSize(20).text(society, { align: 'center' });
      doc.fontSize(14).text('Payment Receipt', { align: 'center' });
      doc.moveDown();
      doc.fontSize(11);
      doc.text(`Receipt ID: ${receipt.id}`);
      doc.text(`Payment ID: ${receipt.razorpayPaymentId}`);
      doc.text(`Order ID: ${receipt.razorpayOrderId}`);
      doc.text(`Flat: ${receipt.flatBill.flat.unitNumber} (${receipt.flatBill.flat.block})`);
      doc.text(`Resident: ${receipt.flatBill.flat.occupantName}`);
      doc.text(`Expense: ${receipt.flatBill.expense.title}`);
      doc.text(`Category: ${receipt.flatBill.expense.category.name}`);
      doc.text(`Amount Paid: ₹${receipt.amount}`);
      doc.text(`Date: ${receipt.updatedAt.toLocaleDateString('en-IN')}`);
      doc.moveDown();
      doc.fontSize(10).text('Thank you for your payment.', { align: 'center' });
      doc.end();
    });

    const buffer = Buffer.concat(chunks);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=receipt-${params.paymentId}.pdf`,
      },
    });
  } catch (err) {
    return apiErrorResponse(err);
  }
}
