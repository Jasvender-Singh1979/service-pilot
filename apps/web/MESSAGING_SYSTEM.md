# Messaging System - Phase B Foundation

## Overview

The app now has a foundation for message templating that supports:
- **System templates** (non-editable, built-in templates)
- **Dynamic variable replacement** (e.g., {customer_name}, {call_id})
- **Safe variable handling** (missing variables show "-")
- **Future extensibility** (ready for custom/editable templates)

## Files

### Core Library: `lib/messaging-templates.ts`

Contains the template rendering engine and system templates.

**Key Functions:**

```typescript
// Render a template by replacing variables
renderTemplate(templateContent, variables) → string

// Get a system template by ID
getSystemTemplate(templateId) → MessageTemplate | null

// Extract variables from template content
extractTemplateVariables(templateContent) → string[]

// Validate if all required variables are provided
validateTemplateVariables(templateContent, variables) → { isValid, missingVariables }
```

**System Templates:**

1. **manager_template_1** - Service Call Registration (Standard)
   - Variables: {customer_name}, {category}, {call_id}
   - Use: Send to customer when call is first registered
   - Type: System (non-editable)

2. **manager_template_2** - Service Call Registration (With Discount)
   - Variables: {customer_name}, {category}, {call_id}
   - Use: Send to VIP/valued customers with special offer
   - Type: System (non-editable)

3. **engineer_closure_notification** - Call Closure Notification
   - Variables: {customer_name}, {call_id}
   - Use: Simple notification that service is complete
   - Type: System (non-editable)

4. **engineer_invoice_customer** - Invoice for Customer
   - Variables: {customer_name}, {call_id}, {service_charges}, {material_total}, {grand_total}, {paid_amount}, {pending_amount}
   - Use: Detailed invoice sent when call closes
   - Type: System (non-editable)

## Current Message Flows

### Manager → Customer (Service Registration)

**Location:** `/app/manager/service-calls/page.tsx`

**Templates:** Template 1 and Template 2 (see `generateTemplate1Message()` and `generateTemplate2Message()`)

**Features:**
- Two pre-formatted templates for different customer segments
- Custom message option
- WhatsApp integration (opens wa.me link with pre-filled message)
- Clean line breaks and formatting

**Format:** Each template has:
- Greeting with customer name
- Service call registration confirmation
- Call ID for tracking
- Business hours (11 AM - 7 PM, Mon-Sat)
- Service charges information
- Optional: Special discounts

### Engineer → Customer (After Service Closure)

**Location:** `/app/engineer/service-calls/detail/page.tsx`

**Message Utilities:** `/lib/whatsapp-utils.ts`

**Messages:**

1. **Invoice to Customer**
   - Service charges (with discount if applicable)
   - Material items listing
   - Material total (with discount if applicable)
   - Grand total, paid amount, pending amount
   - Uses: `generateInvoiceToCustomerMessage()`

2. **Invoice to Accountant**
   - Similar to customer invoice but sent as generic WhatsApp (no pre-selected contact)
   - Uses: `generateInvoiceToAccountantMessage()`

3. **Closure Message to Customer**
   - Simple notification that service is complete
   - Invitation to contact if issues persist
   - Uses: `generateClosureMessageToCustomer()`

## Template Variable Replacement

When a template is rendered:

1. **Find all variables** in format `{variable_name}`
2. **Replace with provided values**
3. **Handle missing values safely** (replace with "-" instead of crashing)

Example:

```typescript
const template = `Hi {customer_name}, your call {call_id} is registered.`;
const variables = { customer_name: 'John', call_id: 'C123' };
const result = renderTemplate(template, variables);
// Result: "Hi John, your call C123 is registered."

// If missing variable:
const incomplete = { customer_name: 'John' };
const result = renderTemplate(template, incomplete);
// Result: "Hi John, your call - is registered."
```

## Safe Variable Handling

The system ensures no crashes from missing data:

```typescript
validateTemplateVariables(templateContent, variables)
// Returns: {
//   isValid: boolean,
//   missingVariables: string[]
// }
```

## Architecture Ready for Future Features

The current implementation supports:

### Phase 2 (Future): Custom Templates
- Allow managers to create custom templates
- Store in database
- Mark as `type: 'custom'` vs `type: 'system'`
- Same rendering engine works for both

### Phase 3 (Future): Template Management UI
- Template builder with variable preview
- Template library management
- Assign templates to customer segments
- Analytics on template performance

### Phase 4 (Future): Dynamic Template Selection
- Auto-select templates based on customer segment
- A/B testing different templates
- Personalized messaging

## Current Implementation Status

✅ **Completed:**
- Template definition structure
- Variable replacement engine
- Safe variable handling
- System templates marked as non-editable
- Integration with Manager messaging UI
- Integration with Engineer closure messaging

⏳ **Future (Not in Scope):**
- Custom template creation UI
- Database storage for custom templates
- Template analytics
- Advanced personalization
- Template scheduling

## Usage Example

### For Developers

To use the template system in new code:

```typescript
import { renderTemplate, getSystemTemplate } from '@/lib/messaging-templates';

// Option 1: Use existing system template
const template = getSystemTemplate('manager_template_1');
if (template) {
  const message = renderTemplate(template.content, {
    customer_name: call.customer_name,
    category: call.category_name_snapshot,
    call_id: call.call_id,
  });
  openWhatsApp(message);
}

// Option 2: Render custom template string
const customTemplate = `Hi {customer_name}, Call #{call_id} is {status}.`;
const message = renderTemplate(customTemplate, {
  customer_name: 'John',
  call_id: 'C123',
  status: 'completed',
});
```

## Benefits

1. **Maintainability:** Template content is centralized and easy to update
2. **Safety:** Variable validation prevents runtime errors
3. **Consistency:** All messages follow same formatting rules
4. **Flexibility:** Same engine supports system and custom templates
5. **Scalability:** Ready to add new features without refactoring
6. **No Breaking Changes:** Current workflow preserved, just adds foundation

## Testing the System

Existing workflows already test the system:

1. **Manager messaging:**
   - Create a service call
   - Click "Message to Customer"
   - Select Template 1 or 2
   - Verify clean formatting with line breaks
   - Click "Send via WhatsApp" to test

2. **Engineer closure:**
   - Mark a call as closed
   - Click "Send Invoice to Customer"
   - Verify detailed invoice format

## Notes

- Messages are still sent via WhatsApp Web (manual link opening)
- No backend changes needed
- Fully backward compatible
- All existing messaging flows unchanged
- System templates are "read-only" (marked as system type)
