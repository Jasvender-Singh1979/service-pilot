/**
 * WhatsApp Message Utilities
 * Helpers for formatting WhatsApp messages and generating WhatsApp links
 */

export interface MaterialItem {
  product_name: string;
  quantity: number;
  price: number;
  row_total: number;
}

export interface WhatsAppMessageData {
  customerName: string;
  callId: string;
  createdAt: string;
  serviceCharges?: number;
  serviceDiscount?: number;
  materialTotal?: number;
  materialDiscount?: number;
  materialItems?: MaterialItem[];
  grandTotal?: number;
  paidAmount?: number;
  pendingAmount?: number;
  finalDiscount?: number;
}

/**
 * Format phone number for WhatsApp URL
 * Accepts country code + number and returns digits-only format
 */
export const formatPhoneForWhatsApp = (countryCode: string, phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleanCode = countryCode.replace(/\D/g, '');
  const cleanNumber = phoneNumber.replace(/\D/g, '');

  // Return combined format (no + sign for URL)
  return `${cleanCode}${cleanNumber}`;
};

/**
 * Generate WhatsApp link for direct messaging
 * Returns https://wa.me/[phone number]?text=[message]
 */
export const generateWhatsAppLink = (phoneNumber: string, message: string): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
};

/**
 * Generate WhatsApp share link (without pre-selected contact)
 * Opens generic WhatsApp share dialog
 */
export const generateWhatsAppShareLink = (message: string): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/?text=${encodedMessage}`;
};

/**
 * Format currency/amount as string
 */
export const formatAmount = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0.00';
  return Number(amount).toFixed(2);
};

/**
 * CTA 1: Send Invoice to Customer
 * Includes full billing summary with service total, material items, material total, grand total, and payment split
 */
export const generateInvoiceToCustomerMessage = (data: WhatsAppMessageData): string => {
  const formattedDate = new Date(data.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `Dear, ${data.customerName}

Your call no ${data.callId}, created on ${formattedDate}, has been successfully closed.
You can review the work, and if you still face any issue, you may contact us.

`;

  // Service Charges section
  message += `Service Charges: ${formatAmount(data.serviceCharges)}
`;
  if (data.serviceDiscount && data.serviceDiscount > 0) {
    message += `Service Discount: ${formatAmount(data.serviceDiscount)}
`;
  }
  const totalServiceCharges = (data.serviceCharges || 0) - (data.serviceDiscount || 0);
  message += `Total Service Charges: ${formatAmount(totalServiceCharges)}

`;

  // Material Items section
  if (data.materialItems && data.materialItems.length > 0) {
    message += `Material Items:-
`;
    data.materialItems.forEach((item) => {
      message += `${item.product_name} | Qty: ${item.quantity} | Price: ${formatAmount(item.price)} | Amount: ${formatAmount(item.row_total)}
`;
    });
    message += `
`;
  }

  // Material section
  message += `Material Used Total: ${formatAmount(data.materialTotal)}
`;
  if (data.materialDiscount && data.materialDiscount > 0) {
    message += `Material Discount: ${formatAmount(data.materialDiscount)}
`;
  }
  const totalMaterialCharges = (data.materialTotal || 0) - (data.materialDiscount || 0);
  message += `Total Material Charges: ${formatAmount(totalMaterialCharges)}

`;

  // Grand Total and Payment
  message += `Grand Total: ${formatAmount(data.grandTotal)}
`;
  message += `Paid Amount: ${formatAmount(data.paidAmount)}
`;
  const pendingBefore = Math.max(0, (data.grandTotal || 0) - (data.paidAmount || 0));
  message += `Pending Amount: ${formatAmount(pendingBefore)}`;

  // Final Discount (if applicable)
  if (data.finalDiscount && data.finalDiscount > 0) {
    const finalPending = Math.max(0, pendingBefore - (data.finalDiscount || 0));
    message += `
Final Discount: ${formatAmount(data.finalDiscount)}
`;
    message += `Final Pending Amount: ${formatAmount(finalPending)}`;
  }

  return message;
};

/**
 * CTA 2: Send Invoice to Accountant
 * Similar structure to customer invoice with service total, material items, material total, grand total, and payment split
 */
export const generateInvoiceToAccountantMessage = (data: WhatsAppMessageData): string => {
  const formattedDate = new Date(data.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  let message = `Dear, ${data.customerName}

Your call no ${data.callId}, created on ${formattedDate}, has been successfully closed.
You can review the work, and if you still face any issue, you may contact us.

`;

  // Service Charges section
  message += `Service Charges: ${formatAmount(data.serviceCharges)}
`;
  if (data.serviceDiscount && data.serviceDiscount > 0) {
    message += `Service Discount: ${formatAmount(data.serviceDiscount)}
`;
  }
  const totalServiceCharges = (data.serviceCharges || 0) - (data.serviceDiscount || 0);
  message += `Total Service Charges: ${formatAmount(totalServiceCharges)}

`;

  // Material Items section
  if (data.materialItems && data.materialItems.length > 0) {
    message += `Material Items:-
`;
    data.materialItems.forEach((item) => {
      message += `${item.product_name} | Qty: ${item.quantity} | Price: ${formatAmount(item.price)} | Amount: ${formatAmount(item.row_total)}
`;
    });
    message += `
`;
  }

  // Material section
  message += `Material Used Total: ${formatAmount(data.materialTotal)}
`;
  if (data.materialDiscount && data.materialDiscount > 0) {
    message += `Material Discount: ${formatAmount(data.materialDiscount)}
`;
  }
  const totalMaterialCharges = (data.materialTotal || 0) - (data.materialDiscount || 0);
  message += `Total Material Charges: ${formatAmount(totalMaterialCharges)}

`;

  // Grand Total and Payment
  message += `Grand Total: ${formatAmount(data.grandTotal)}
`;
  message += `Paid Amount: ${formatAmount(data.paidAmount)}
`;
  const pendingBefore = Math.max(0, (data.grandTotal || 0) - (data.paidAmount || 0));
  message += `Pending Amount: ${formatAmount(pendingBefore)}`;

  // Final Discount (if applicable)
  if (data.finalDiscount && data.finalDiscount > 0) {
    const finalPending = Math.max(0, pendingBefore - (data.finalDiscount || 0));
    message += `
Final Discount: ${formatAmount(data.finalDiscount)}
`;
    message += `Final Pending Amount: ${formatAmount(finalPending)}`;
  }

  return message;
};

/**
 * CTA 3: Call Closure Message to Customer
 * Simple closure notification without billing details
 */
export const generateClosureMessageToCustomer = (data: WhatsAppMessageData): string => {
  const formattedDate = new Date(data.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `Dear, ${data.customerName}

Your call no ${data.callId}, created on ${formattedDate}, has been successfully closed.
You can review the work, and if you still face any issue, you may contact us.`;
};
