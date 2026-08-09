import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Order } from '../api/orderService';
import { safeFormatDate } from './date';

// Local currency formatter for PDF to avoid '₹' rendering issues in jsPDF standard fonts
const formatPDFCurrency = (amount: number | string | undefined | null): string => {
  const num = Number(amount) || 0;
  return 'Rs. ' + num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const formatDeliveryStatus = (status: string | undefined): string => {
  if (!status) return 'Pending';
  switch (status) {
    case 'ORDER_CONFIRMED': return 'Order Confirmed';
    case 'SHIPPED': return 'Shipped';
    case 'DELIVERED': return 'Delivered';
    case 'PENDING': return 'Pending';
    default: return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ');
  }
};

export const generateInvoice = (order: Order) => {
  const doc = new jsPDF();
  
  // -- Header --
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('STOREFRONT', 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Invoice for your purchase', 14, 26);
  
  // Right side header
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 196, 20, { align: 'right' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const shortId = order.order_id.length > 13 ? order.order_id.substring(0, 13) + '...' : order.order_id;
  doc.text(`#${shortId}`, 196, 26, { align: 'right' });
  doc.text(safeFormatDate(order.created_at, { year: 'numeric', month: 'short', day: 'numeric'}), 196, 32, { align: 'right' });

  // Draw Line
  doc.setDrawColor(220, 220, 220);
  doc.line(14, 38, 196, 38);

  // -- Two Column Info --
  doc.setFontSize(10);
  
  // Left Column (Order Details)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('ORDER DETAILS', 14, 48);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Order ID: ${shortId}`, 14, 55);
  doc.text(`Payment: ${order.payment_method || 'Card'}`, 14, 61);
  doc.text(`Status: ${order.payment_status === 'SUCCESS' ? 'Paid' : 'Pending'}`, 14, 67);

  // Right Column (Bill To)
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('BILL TO', 120, 48);
  
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(order.customer_email || 'Guest Customer', 120, 55);
  doc.text(`Delivery: ${formatDeliveryStatus(order.delivery_status)}`, 120, 61);

  // -- Table Data --
  const tableColumn = ["Item", "Qty", "Unit Price", "Amount"];
  const tableRows: any[][] = [];

  order.items.forEach((item: any) => {
    const itemData = [
      item.product_name || item.product_id,
      item.quantity.toString(),
      formatPDFCurrency(item.price ?? 0),
      formatPDFCurrency(item.subtotal ?? ((item.price ?? 0) * item.quantity)),
    ];
    tableRows.push(itemData);
  });

  // Generate Table
  autoTable(doc, {
    startY: 75,
    head: [tableColumn],
    body: tableRows,
    theme: 'plain',
    headStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
    bodyStyles: { textColor: [50, 50, 50] },
    styles: { font: 'helvetica', fontSize: 10, cellPadding: 6 },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 75;

  // -- Totals --
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Subtotal', 140, finalY + 12);
  doc.text(formatPDFCurrency(order.total_amount), 196, finalY + 12, { align: 'right' });
  
  doc.text('Shipping', 140, finalY + 18);
  doc.text(formatPDFCurrency(0), 196, finalY + 18, { align: 'right' });
  
  doc.text('Tax', 140, finalY + 24);
  doc.text(formatPDFCurrency(0), 196, finalY + 24, { align: 'right' });
  
  // Total Line
  doc.setDrawColor(200, 200, 200);
  doc.line(140, finalY + 28, 196, finalY + 28);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', 140, finalY + 35);
  doc.text(formatPDFCurrency(order.total_amount), 196, finalY + 35, { align: 'right' });

  // -- Footer --
  let currentY = finalY + 50;
  
  if (order.payment_status === 'SUCCESS') {
    doc.setFontSize(11);
    doc.setTextColor(34, 197, 94); // Green
    doc.text('Payment Successful', 14, currentY);
    currentY += 10;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Thank you for your purchase!', 14, currentY);
  
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text('STOREFRONT • Computer-generated invoice', 14, currentY + 6);

  // Save PDF
  doc.save(`Invoice_${order.order_id}.pdf`);
};
