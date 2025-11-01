# Visual Mockup - Registration Closure & Download Features

## 1. Registration Page - When OPEN (Default Behavior)

```
╔═══════════════════════════════════════════════════════════╗
║               Student Registration                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Please subscribe to our YouTube channel to continue     ║
║                                                           ║
║  ┌─────────────────────────────────────────────────┐    ║
║  │  🔴 UniLorin TechHub                            │    ║
║  │  https://youtube.com/@unilorintechub            │    ║
║  └─────────────────────────────────────────────────┘    ║
║                                                           ║
║  [ Open channel ]  [ I've subscribed ]                   ║
║                                                           ║
║  Are you a carry-over student?                           ║
║  [ Yes ]  [ No ]                                         ║
║                                                           ║
║  ... (rest of registration form) ...                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## 2. Registration Page - When CLOSED (REGISTRATION_OPEN=false)

```
╔═══════════════════════════════════════════════════════════╗
║               Student Registration                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ┌───────────────────────────────────────────────────┐  ║
║  │   ⚠️  Registration Closed                         │  ║
║  │                                                    │  ║
║  │   Registration is currently closed.               │  ║
║  │   Thank you for your interest.                    │  ║
║  │                                                    │  ║
║  │   Please check back later or contact the          │  ║
║  │   administration for more information.            │  ║
║  └───────────────────────────────────────────────────┘  ║
║                                                           ║
║  [ Download Student List (Admin) ]                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Note: All forms are hidden, only closure message is visible
```

## 3. Download Page (/download.html)

```
╔═══════════════════════════════════════════════════════════╗
║           📊 Download Student List                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  Download the complete list of registered students       ║
║  organized by their selected skills.                     ║
║                                                           ║
║  ┌───────────────────────────────────────────────────┐  ║
║  │ 📋 File Format:                                   │  ║
║  │                                                    │  ║
║  │  • Excel workbook (.xlsx)                         │  ║
║  │  • Each skill in a separate tab/sheet             │  ║
║  │  • Includes: Matric Number, Name, Department,     │  ║
║  │    Faculty, Phone, Email                          │  ║
║  │  • Trainer details at the top of each sheet       │  ║
║  └───────────────────────────────────────────────────┘  ║
║                                                           ║
║         ┌────────────────────────────────┐               ║
║         │  📥 Download Excel File        │               ║
║         └────────────────────────────────┘               ║
║                                                           ║
║         ← Back to Registration                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## 4. Download Page - Success State

```
╔═══════════════════════════════════════════════════════════╗
║           📊 Download Student List                        ║
╠═══════════════════════════════════════════════════════════╣
║                                                           ║
║  ┌───────────────────────────────────────────────────┐  ║
║  │ ✓ Download started successfully!                  │  ║
║  └───────────────────────────────────────────────────┘  ║
║                                                           ║
║  Download the complete list of registered students       ║
║  organized by their selected skills.                     ║
║                                                           ║
║  ... (rest of page content) ...                          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## 5. Excel File Structure (GSE-Students-2025-11-01.xlsx)

### Tab 1: "Web Development"
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Skill:        Web Development                                               │
│ Trainer:      John Doe                                                      │
│ Phone:        +234 123 456 7890                                             │
│                                                                             │
├────┬──────────────┬─────────────────┬─────────────┬───────────┬─────────────┤
│S/N │ Matric Number│ Name            │ Department  │ Faculty   │ Phone       │
├────┼──────────────┼─────────────────┼─────────────┼───────────┼─────────────┤
│ 1  │ GSE/2023/001 │ Jane Smith      │ Computer Sc │ Science   │ +234 987... │
│ 2  │ GSE/2023/002 │ Bob Johnson     │ Software Eng│ Eng       │ +234 876... │
│ 3  │ GSE/2023/015 │ Alice Williams  │ Info Tech   │ Science   │ +234 765... │
└────┴──────────────┴─────────────────┴─────────────┴───────────┴─────────────┘
```

### Tab 2: "Mobile App Development"
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Skill:        Mobile App Development                                        │
│ Trainer:      Jane Smith                                                    │
│ Phone:        +234 987 654 3210                                             │
│                                                                             │
├────┬──────────────┬─────────────────┬─────────────┬───────────┬─────────────┤
│S/N │ Matric Number│ Name            │ Department  │ Faculty   │ Phone       │
├────┼──────────────┼─────────────────┼─────────────┼───────────┼─────────────┤
│ 1  │ GSE/2023/003 │ Chris Brown     │ Computer Sc │ Science   │ +234 654... │
│ 2  │ GSE/2023/008 │ Diana Prince    │ Software Eng│ Eng       │ +234 543... │
└────┴──────────────┴─────────────────┴─────────────┴───────────┴─────────────┘
```

### Tab 3: "Data Science"
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Skill:        Data Science                                                  │
│ Trainer:      Dr. Michael Chen                                              │
│ Phone:        +234 876 543 2109                                             │
│                                                                             │
├────┬──────────────┬─────────────────┬─────────────┬───────────┬─────────────┤
│S/N │ Matric Number│ Name            │ Department  │ Faculty   │ Phone       │
├────┼──────────────┼─────────────────┼─────────────┼───────────┼─────────────┤
│ 1  │ GSE/2023/004 │ Emma Wilson     │ Statistics  │ Science   │ +234 432... │
│ 2  │ GSE/2023/012 │ Frank Miller    │ Math        │ Science   │ +234 321... │
└────┴──────────────┴─────────────────┴─────────────┴───────────┴─────────────┘
```

## 6. API Response Examples

### Registration Status - Open
```json
{
  "isOpen": true,
  "message": "Registration is open"
}
```

### Registration Status - Closed
```json
{
  "isOpen": false,
  "message": "Registration is currently closed. Thank you for your interest."
}
```

### Matric Entry - When Closed
```json
{
  "error": "Registration is currently closed. Thank you for your interest.",
  "registrationClosed": true
}
```

## Color Scheme

### Registration Closure Message
- Background: Soft yellow (#fff3cd)
- Border: Warning yellow (#ffc107)
- Text: Dark amber (#856404)

### Download Page
- Gradient background: Light purple to light gray (#e0e7ff → #f7f7f7)
- Primary buttons: Purple gradient (#7b61ff → #4f8cff)
- White card with shadow for content

### Success Messages
- Background: Light green (#d4edda)
- Text: Dark green (#155724)
- Border: Medium green (#c3e6cb)

### Error Messages
- Background: Light red (#f8d7da)
- Text: Dark red (#721c24)
- Border: Medium red (#f5c6cb)

## Responsive Behavior

### Mobile View (< 600px)
- Container width: 95vw (nearly full screen)
- Reduced padding and font sizes
- Button text wraps appropriately
- Excel info box stacks vertically

### Desktop View (≥ 600px)
- Container max-width: 420px (registration), 500px (download)
- Comfortable padding and spacing
- Larger buttons and text
- Side-by-side button layout where applicable

## User Flow

```
[Student visits registration page]
           ↓
[Page checks /student/registration-status]
           ↓
    ┌──────┴──────┐
    │             │
[OPEN]        [CLOSED]
    │             │
    │      [Show closure message]
    │             │
    │      [Show admin download link]
    │
[Show registration form]
    │
[Student completes registration]
    │
[Admin visits /download.html]
    │
[Clicks download button]
    │
[GET /student/export/excel]
    │
[Excel file downloads]
    │
[Opens in Excel/Sheets]
    │
[Views students by skill tabs]
```
