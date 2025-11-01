# Registration Closure and Student Export Features

## Overview
This document describes the new features for closing student registration and exporting registered students to Excel.

## Features

### 1. Registration Closure
The registration can be closed by setting an environment variable. When closed, students will see a closure message instead of the registration form.

#### How to Close Registration
Set the environment variable:
```bash
REGISTRATION_OPEN=false
```

To open registration again:
```bash
REGISTRATION_OPEN=true
```
Or simply remove the variable (registration is open by default).

#### What Students See When Closed
- A friendly closure message on the registration page
- A link to the admin download page (for administrators)
- All registration forms are hidden

### 2. Student List Excel Export
A new page allows downloading all registered students as an Excel file, organized by skills.

#### Accessing the Download Page
Navigate to: `http://your-domain/download.html`

Or click the "Download Student List (Admin)" link on the closed registration page.

#### Excel File Structure
- **File Format**: `.xlsx` (Excel 2007+)
- **Organization**: Each skill has its own tab/sheet
- **Sheet Contents**:
  - Skill name and description
  - Trainer name and phone number
  - List of students who selected that skill
  - Student information: Matric Number, Name, Department, Faculty, Phone, Email

#### Example Sheet Layout
```
Skill:        Web Development
Trainer:      John Doe
Phone:        +234 123 456 7890

S/N | Matric Number | Name        | Department | Faculty    | Phone          | Email
1   | GSE/2023/001  | Jane Smith  | Computer   | Science    | +234 987 654   | jane@example.com
2   | GSE/2023/002  | Bob Johnson | Software   | Engineering| +234 876 543   | bob@example.com
```

## API Endpoints

### Check Registration Status
```http
GET /student/registration-status
```

**Response:**
```json
{
  "isOpen": false,
  "message": "Registration is currently closed. Thank you for your interest."
}
```

### Export Students to Excel
```http
GET /student/export/excel
```

**Response:**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- Downloads file: `GSE-Students-YYYY-MM-DD.xlsx`

## Implementation Details

### Files Modified
1. `src/student.controller.ts` - Added registration status check and Excel export endpoint
2. `src/student.service.ts` - Added methods to fetch students by skill
3. `src/public/index.html` - Added registration closure message display
4. `src/public/download.html` - New page for downloading student list

### Environment Variables
- `REGISTRATION_OPEN` - Controls whether registration is open (default: true)
  - Set to `"false"` to close registration
  - Any other value or absence = registration is open

## Testing

### Manual Testing
1. **Test Registration Closure:**
   - Set `REGISTRATION_OPEN=false`
   - Visit the registration page
   - Verify closure message is displayed

2. **Test Excel Export:**
   - Visit `/download.html`
   - Click "Download Excel File"
   - Verify Excel file downloads with correct structure

### Automated Tests
Run the e2e tests:
```bash
npm run test:e2e
```

## Security Considerations
- The download page should be protected with authentication in production
- Consider adding admin-only access control to the export endpoint
- The `REGISTRATION_OPEN` flag should be managed securely

## Future Enhancements
- Add authentication/authorization for download page
- Add filters for export (by date, by skill, etc.)
- Add email notification when registration closes
- Add scheduling for automatic closure
