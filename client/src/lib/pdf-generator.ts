import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quote, Invoice } from '@shared/schema';

interface PDFData {
  type: 'quote' | 'invoice';
  number: string;
  date: string;
  dueDate?: string;
  operationType: string;
  items: Array<{
    description: string;
    date: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    vat: number;
    amount: number;
  }>;
  clientInfo: {
    name: string;
    email: string;
    address?: string;
  };
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  notes?: string;
}

const COMPANY_INFO = {
  name: 'MY JANTES',
  tagline: 'SPÉCIALISTE JANTES ET PNEUS',
  address: '46 rue de la convention',
  city: '62800 Lievin',
  phone: '0321408053',
  email: 'contact@myjantes.com',
  website: 'www.myjantes.fr',
  bankName: 'MY JANTES - SASU',
  iban: 'FR76 3000 3029 5800 0201 0936 525',
  swift: 'BNPAFRPPXXX',
  tva: 'FR73913678199',
};

export function generateQuotePDF(quote: Quote, clientInfo: any, serviceInfo: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with logo space
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MY JANTES', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SPÉCIALISTE JANTES ET PNEUS', 20, 32);
  
  // Document title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  const quoteNumber = `DV-${new Date().getFullYear()}-${quote.id.slice(0, 6)}`;
  doc.text(`DEVIS - ${quoteNumber}`, 20, 50);
  
  // Dates and operation type
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const billingDate = new Date(quote.createdAt || Date.now()).toLocaleDateString('fr-FR');
  const dueDate = quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-FR') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');
  
  doc.text(`Date de facturation: ${billingDate}`, 20, 60);
  doc.text(`Échéance: ${dueDate}`, 20, 66);
  doc.text('Type d\'opération: Opération interne', 20, 72);
  
  // Company info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 20, 90);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, 20, 96);
  doc.text(COMPANY_INFO.city, 20, 102);
  doc.text(COMPANY_INFO.phone, 20, 108);
  doc.text(COMPANY_INFO.email, 20, 114);
  doc.text(COMPANY_INFO.website, 20, 120);
  
  // Client info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const clientName = clientInfo?.name || clientInfo?.email?.split('@')[0] || 'Client';
  doc.text(clientName.toUpperCase(), 20, 138);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (clientInfo?.email) {
    doc.text(clientInfo.email, 20, 144);
  }
  if (clientInfo?.address) {
    doc.text(clientInfo.address, 20, 150);
  }
  
  // Table
  const description = serviceInfo?.description || serviceInfo?.name || 'Service automobile';
  const tableData = [{
    description: description,
    date: billingDate,
    quantity: '1.00',
    unit: 'pce',
    unitPrice: parseFloat(quote.quoteAmount || '0').toFixed(2),
    vat: '20.00 %',
    amount: parseFloat(quote.quoteAmount || '0').toFixed(2),
  }];
  
  autoTable(doc, {
    startY: 165,
    head: [['Description', 'Date', 'Qte', 'Unité', 'Prix unitaire', 'TVA', 'Montant']],
    body: tableData.map(item => [
      item.description,
      item.date,
      item.quantity,
      item.unit,
      `${item.unitPrice} €`,
      item.vat,
      `${item.amount} €`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalHT = parseFloat(quote.quoteAmount || '0');
  const totalVAT = totalHT * 0.20;
  const totalTTC = totalHT + totalVAT;
  
  doc.setFontSize(10);
  doc.text(`Total HT`, 120, finalY);
  doc.text(`${totalHT.toFixed(2)} €`, 170, finalY, { align: 'right' });
  
  doc.text(`TVA 20,00 %`, 120, finalY + 6);
  doc.text(`${totalVAT.toFixed(2)} €`, 170, finalY + 6, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Total TTC`, 120, finalY + 12);
  doc.text(`${totalTTC.toFixed(2)} €`, 170, finalY + 12, { align: 'right' });
  
  // Payment methods
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Moyens de paiement:', 20, finalY + 30);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_INFO.bankName}`, 20, finalY + 38);
  doc.text(`Banque: SOCIETE GENERALE de la convention - 62800 Lievin`, 20, finalY + 44);
  doc.text(`SWIFT/BIC: ${COMPANY_INFO.swift} - Numéro de TVA: ${COMPANY_INFO.tva}`, 20, finalY + 50);
  doc.text(`IBAN: ${COMPANY_INFO.iban}`, 20, finalY + 56);
  
  // Save PDF
  doc.save(`devis-${quoteNumber}.pdf`);
}

export function generateInvoicePDF(invoice: Invoice, clientInfo: any, quoteInfo: any, serviceInfo: any) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header with logo space
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('MY JANTES', 20, 25);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SPÉCIALISTE JANTES ET PNEUS', 20, 32);
  
  // Document title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(`FACTURE - ${invoice.invoiceNumber}`, 20, 50);
  
  // Dates and operation type
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const billingDate = new Date(invoice.createdAt || Date.now()).toLocaleDateString('fr-FR');
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('fr-FR') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR');
  
  doc.text(`Date de facturation: ${billingDate}`, 20, 60);
  doc.text(`Échéance: ${dueDate}`, 20, 66);
  doc.text('Type d\'opération: Opération interne', 20, 72);
  
  // Company info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(COMPANY_INFO.name, 20, 90);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(COMPANY_INFO.address, 20, 96);
  doc.text(COMPANY_INFO.city, 20, 102);
  doc.text(COMPANY_INFO.phone, 20, 108);
  doc.text(COMPANY_INFO.email, 20, 114);
  doc.text(COMPANY_INFO.website, 20, 120);
  
  // Client info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const clientName = clientInfo?.name || clientInfo?.email?.split('@')[0] || 'Client';
  doc.text(clientName.toUpperCase(), 20, 138);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (clientInfo?.email) {
    doc.text(clientInfo.email, 20, 144);
  }
  if (clientInfo?.address) {
    doc.text(clientInfo.address, 20, 150);
  }
  
  // Table
  const description = serviceInfo?.description || serviceInfo?.name || 'Service automobile';
  const tableData = [{
    description: description,
    date: billingDate,
    quantity: '1.00',
    unit: 'pce',
    unitPrice: parseFloat(invoice.amount || '0').toFixed(2),
    vat: '20.00 %',
    amount: parseFloat(invoice.amount || '0').toFixed(2),
  }];
  
  autoTable(doc, {
    startY: 165,
    head: [['Description', 'Date', 'Qte', 'Unité', 'Prix unitaire', 'TVA', 'Montant']],
    body: tableData.map(item => [
      item.description,
      item.date,
      item.quantity,
      item.unit,
      `${item.unitPrice} €`,
      item.vat,
      `${item.amount} €`,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
  });
  
  // Totals
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  const totalHT = parseFloat(invoice.amount || '0');
  const totalVAT = totalHT * 0.20;
  const totalTTC = totalHT + totalVAT;
  
  doc.setFontSize(10);
  doc.text(`Total HT`, 120, finalY);
  doc.text(`${totalHT.toFixed(2)} €`, 170, finalY, { align: 'right' });
  
  doc.text(`TVA 20,00 %`, 120, finalY + 6);
  doc.text(`${totalVAT.toFixed(2)} €`, 170, finalY + 6, { align: 'right' });
  
  doc.setFont('helvetica', 'bold');
  doc.text(`Total TTC`, 120, finalY + 12);
  doc.text(`${totalTTC.toFixed(2)} €`, 170, finalY + 12, { align: 'right' });
  
  // Payment methods
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Moyens de paiement:', 20, finalY + 30);
  
  doc.setFont('helvetica', 'normal');
  doc.text(`${COMPANY_INFO.bankName}`, 20, finalY + 38);
  doc.text(`Banque: SOCIETE GENERALE de la convention - 62800 Lievin`, 20, finalY + 44);
  doc.text(`SWIFT/BIC: ${COMPANY_INFO.swift} - Numéro de TVA: ${COMPANY_INFO.tva}`, 20, finalY + 50);
  doc.text(`IBAN: ${COMPANY_INFO.iban}`, 20, finalY + 56);
  
  // Save PDF
  doc.save(`facture-${invoice.invoiceNumber}.pdf`);
}
