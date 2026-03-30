/**
 * Messaging Templates Foundation
 * Supports system templates, dynamic variable replacement, and safe rendering
 */

export type TemplateType = 'system' | 'custom';

export interface MessageTemplate {
  id: string;
  name: string;
  type: TemplateType;
  content: string;
  description?: string;
  variables?: string[]; // List of available variables
  createdAt?: Date;
}

export interface TemplateVariables {
  customer_name?: string;
  engineer_name?: string;
  call_id?: string;
  mobile?: string;
  priority?: string;
  category?: string;
  issue?: string;
  created_date?: string;
  business_name?: string;
  service_charges?: string;
  material_total?: string;
  grand_total?: string;
  pending_amount?: string;
  [key: string]: string | undefined;
}

/**
 * System templates - non-editable, built-in message templates
 * Each template is reformatted for clean, WhatsApp-friendly formatting
 */
export const SYSTEM_TEMPLATES: Record<string, MessageTemplate> = {
  manager_template_1: {
    id: 'manager_template_1',
    name: 'Service Call Registration (Standard)',
    type: 'system',
    description: 'Standard service call registration message sent to customer',
    content: `Hi {customer_name}

We have registered your service call for {category}.

Call ID: {call_id}

Working Hours: 11:00 AM - 7:00 PM, Monday - Saturday

Our engineer will contact you within 24-72 hours to schedule the service visit.

Service Charges: ₹500 per visit + applicable material expenses as per work requirements.

Thank you for choosing us!`,
    variables: ['customer_name', 'category', 'call_id'],
  },

  manager_template_2: {
    id: 'manager_template_2',
    name: 'Service Call Registration (With Discount)',
    type: 'system',
    description: 'Service call registration with special discount offer',
    content: `Hi {customer_name}

We have registered your service call for {category}.

Call ID: {call_id}

Working Hours: 11:00 AM - 7:00 PM, Monday - Saturday

Our engineer will contact you within 24-72 hours to schedule the service visit.

Service Charges: ₹500 per visit + applicable material expenses as per work requirements.

Special Offer for You:
• 30% discount on service charges
• 15% discount on material costs

Thank you for being a valued customer!`,
    variables: ['customer_name', 'category', 'call_id'],
  },

  engineer_closure_notification: {
    id: 'engineer_closure_notification',
    name: 'Call Closure Notification',
    type: 'system',
    description: 'Simple notification that service call has been completed',
    content: `Dear {customer_name}

Your service call #{call_id} has been successfully completed.

You can review the work performed. If you encounter any issues, please feel free to contact us.

Thank you!`,
    variables: ['customer_name', 'call_id'],
  },

  engineer_invoice_customer: {
    id: 'engineer_invoice_customer',
    name: 'Invoice for Customer',
    type: 'system',
    description: 'Detailed invoice with service charges, materials, and payment summary',
    content: `Dear {customer_name}

Your Service Call #{call_id} has been successfully completed.

Service Charges: {service_charges}
Material Used: {material_total}
Grand Total: {grand_total}
Paid Amount: {paid_amount}
Pending Amount: {pending_amount}

If you have any queries, please contact us.

Thank you for your business!`,
    variables: ['customer_name', 'call_id', 'service_charges', 'material_total', 'grand_total', 'paid_amount', 'pending_amount'],
  },
};

/**
 * Render a message template by replacing variables with actual values
 * Safe handling: replaces missing variables with "-"
 *
 * @param templateContent The template string with {variable} placeholders
 * @param variables Object with variable values
 * @returns Rendered message string
 */
export const renderTemplate = (
  templateContent: string,
  variables: TemplateVariables
): string => {
  let rendered = templateContent;

  // Find all variables in format {variable_name}
  const variableRegex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g;
  let match;

  while ((match = variableRegex.exec(templateContent)) !== null) {
    const variableName = match[1];
    const value = variables[variableName];

    // Replace with actual value or "-" if missing
    const replacementValue = value && String(value).trim() ? String(value) : '-';
    rendered = rendered.replace(new RegExp(`{${variableName}}`, 'g'), replacementValue);
  }

  return rendered;
};

/**
 * Get a system template by ID
 * @param templateId The template ID
 * @returns The template object or null if not found
 */
export const getSystemTemplate = (templateId: string): MessageTemplate | null => {
  return SYSTEM_TEMPLATES[templateId] || null;
};

/**
 * Get all system template IDs
 * @returns Array of template IDs
 */
export const getSystemTemplateIds = (): string[] => {
  return Object.keys(SYSTEM_TEMPLATES);
};

/**
 * Extract variables from a template string
 * @param templateContent Template string with {variable} placeholders
 * @returns Array of variable names found in template
 */
export const extractTemplateVariables = (templateContent: string): string[] => {
  const variableRegex = /{([a-zA-Z_][a-zA-Z0-9_]*)}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variableRegex.exec(templateContent)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
};

/**
 * Validate that all required variables are provided
 * @param templateContent Template string
 * @param variables Variables object
 * @returns { isValid: boolean, missingVariables: string[] }
 */
export const validateTemplateVariables = (
  templateContent: string,
  variables: TemplateVariables
): { isValid: boolean; missingVariables: string[] } => {
  const required = extractTemplateVariables(templateContent);
  const missing = required.filter((varName) => !variables[varName] || String(variables[varName]).trim() === '');

  return {
    isValid: missing.length === 0,
    missingVariables: missing,
  };
};
