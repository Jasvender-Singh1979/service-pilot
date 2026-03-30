# WhatsApp Templates Module

## Overview
The WhatsApp Templates module allows managers to create, edit, and manage reusable message templates with dynamic variables. These templates can be used when sending WhatsApp messages to customers.

## Features

### Template Types
- **System Templates**: Pre-built templates that cannot be edited or deleted
- **Custom Templates**: User-created templates (max 10 per manager)

### Dynamic Variables
Templates support the following variables that are automatically replaced with actual values:
- `{customer_name}` - Customer name
- `{engineer_name}` - Assigned engineer name
- `{call_id}` - Service call ID
- `{mobile}` - Customer phone number
- `{priority}` - Call priority level
- `{warranty_status}` - Warranty status
- `{address}` - Customer address
- `{category}` - Service category

### Safety Features
- Missing or undefined variables are automatically replaced with "-"
- No undefined/null values will crash the app
- Template message character limit: 5-1000 characters
- Unmatched braces are detected during validation

## How to Use

### Create a Template
1. Navigate to Manager Dashboard → WhatsApp Templates
2. Click the "+" button
3. Enter template name and message
4. Use the variable buttons to insert dynamic variables
5. Preview the template with sample data
6. Click "Create Template"

### Edit a Template
1. Go to WhatsApp Templates
2. Click "Edit" on a custom template
3. Modify name and message as needed
4. Click "Update Template"
5. Note: System templates cannot be edited

### Delete a Template
1. Go to WhatsApp Templates
2. Click "Delete" on a custom template
3. Confirm deletion
4. Note: System templates cannot be deleted

## Integration with Message Sending

### For Managers (Creating Service Calls)
When creating a service call, you can optionally select a template from the available templates. The template selection is available during call creation but is informational only.

### For Engineers (Sending Messages)
When closing a service call or sending customer messages:
1. The engineer can reference the selected template (if any) from the service call
2. The message is sent with variables replaced with actual call data
3. WhatsApp opens with the pre-filled message
4. Engineer can edit the message before sending

## Technical Details

### Database Schema
```sql
CREATE TABLE whatsapp_template (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  manager_user_id TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_message TEXT NOT NULL,
  template_type TEXT NOT NULL (system|custom),
  is_active BOOLEAN DEFAULT true,
  created_by_user_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(business_id, manager_user_id, template_name)
);
```

### API Endpoints
- `GET /api/whatsapp-templates` - List all templates
- `POST /api/whatsapp-templates` - Create new template
- `GET /api/whatsapp-templates/[id]` - Get single template
- `PUT /api/whatsapp-templates/[id]` - Update custom template
- `DELETE /api/whatsapp-templates/[id]` - Delete custom template

### Template Utility Functions
Located in `/lib/template-utils.ts`:
- `replaceTemplateVariables()` - Replace variables with actual values
- `getAvailableVariables()` - List all available variables
- `getTemplateSampleData()` - Get sample data for preview
- `validateTemplate()` - Validate template syntax

## Limits

### Custom Templates
- Maximum 10 custom templates per manager
- Minimum message length: 5 characters
- Maximum message length: 1000 characters

### Variables
- Support 8 dynamic variables
- Unknown variables default to "-"
- No syntax errors - graceful fallback handling

## Future Enhancements

Potential improvements:
- Template categories/groups
- Template usage analytics
- A/B testing different templates
- Template scheduling
- Bulk message sending
- Template statistics (sent, read, replied)

## Notes

- Templates are manager-specific and business-specific
- System templates are available to all managers
- Template updates don't affect already-sent messages
- Messages sent through WhatsApp are logged in service call history
- Each template name must be unique within a manager's account
