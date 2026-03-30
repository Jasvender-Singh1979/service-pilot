/**
 * Replace template variables with actual values
 * Supports: {customer_name}, {engineer_name}, {call_id}, {mobile}, {priority}, {warranty_status}
 * Unknown variables are replaced with "-"
 */
export function replaceTemplateVariables(
  message: string,
  variables: Record<string, any>
): string {
  // Pattern to match {variable_name}
  const pattern = /\{([^}]+)\}/g;

  return message.replace(pattern, (match, variableName) => {
    const value = variables[variableName];

    // Return the value if it exists and is not null/undefined, otherwise return "-"
    if (value !== null && value !== undefined && value !== "") {
      return String(value);
    }

    return "-";
  });
}

/**
 * Get available variables for template preview
 */
export function getAvailableVariables(): {
  name: string;
  description: string;
}[] {
  return [
    { name: "{customer_name}", description: "Customer name" },
    { name: "{engineer_name}", description: "Assigned engineer name" },
    { name: "{call_id}", description: "Service call ID" },
    { name: "{mobile}", description: "Customer phone number" },
    { name: "{priority}", description: "Call priority level" },
    { name: "{warranty_status}", description: "Warranty status" },
    { name: "{purchase_source}", description: "Purchase source" },
    { name: "{charge_type}", description: "Charge type" },
    { name: "{time_stamp_call_creation}", description: "Call creation timestamp" },
    { name: "{address}", description: "Customer address" },
    { name: "{category}", description: "Service category" },
  ];
}

/**
 * Preview template with sample data
 */
export function getTemplateSampleData(): Record<string, string> {
  return {
    customer_name: "John Doe",
    engineer_name: "Mr. Sharma",
    call_id: "ABC-2501-JAN-01",
    mobile: "+91 98765 43210",
    priority: "High",
    warranty_status: "In Warranty",
    purchase_source: "Purchased from Business",
    charge_type: "Flat Rate",
    time_stamp_call_creation: "29 Mar 2026, 02:15 PM",
    address: "123 Main Street, City",
    category: "Air Conditioner",
  };
}

/**
 * Validate template for syntax issues
 */
export function validateTemplate(message: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unclosed braces
  const openBraces = (message.match(/\{/g) || []).length;
  const closeBraces = (message.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push("Unmatched braces detected");
  }

  // Check message length
  if (message.length < 5) {
    errors.push("Message is too short (minimum 5 characters)");
  }

  if (message.length > 1000) {
    errors.push("Message is too long (maximum 1000 characters)");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
