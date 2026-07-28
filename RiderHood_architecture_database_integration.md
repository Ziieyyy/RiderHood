# RIDERHOOD — MASTER PRODUCTION IMPLEMENTATION PROMPT

You are working on an existing RiderHood Premium Moto Care project.

Your task is to audit, complete, connect, clean, and production-harden the ENTIRE project.

DO NOT create a separate demo.
DO NOT create a prototype.
DO NOT leave mock functionality.
DO NOT leave placeholder data.
DO NOT leave broken buttons.
DO NOT leave unfinished screens.
DO NOT invent functionality that is not documented below.

The final result must be a fully connected, production-ready application.

==================================================
1. PROJECT OBJECTIVE
==================================================

RiderHood is a motorcycle care platform with three user roles:

1. CUSTOMER / RIDER
2. WORKSHOP ADMIN
3. SUPER ADMIN

Technology:

- Expo SDK 57+
- React Native
- TypeScript
- Expo Router
- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Supabase Realtime
- React Query or equivalent server-state solution

The application must use ONE mobile application/codebase.

Do not create separate mobile applications for each role.

==================================================
2. AUTHENTICATION — ONE LOGIN PAGE
==================================================

The route:

/welcome

must contain ONE unified login page.

DO NOT show:

- Customer Login
- Workshop Login
- Super Admin Login

as separate login buttons.

The user enters:

- Email
- Password

Then authenticate through Supabase Auth.

Flow:

/welcome
↓
Supabase Auth
↓
authenticated user ID
↓
profiles table
↓
retrieve role
↓
route according to role

Roles:

customer
workshop_admin
super_admin

Redirect:

customer
→ /(customer)/home

workshop_admin
→ /(workshop)/dashboard

super_admin
→ /(admin)

NEVER determine the role from the email address.

DO NOT use:

if email contains "admin"
if email contains "workshop"
hardcoded emails
hardcoded passwords

The database is the source of truth.

==================================================
3. AUTHENTICATION SECURITY
==================================================

Use:

Supabase Auth
+
PostgreSQL profiles
+
RLS

Never put the Supabase service-role key inside Expo.

Never expose private API keys.

Implement:

- Login
- Logout
- Session persistence
- Session refresh
- Forgot password
- Password reset
- Account status checking
- Protected routes
- Unauthorized route handling

Account statuses:

active
pending
suspended
deleted

A suspended account cannot access protected screens.

A logged-out user cannot access protected routes using back navigation.

==================================================
4. CUSTOMER PORTAL
==================================================

Customer routes:

/(customer)/home
/(customer)/workshops
/(customer)/booking
/(customer)/history
/(customer)/profile
/(customer)/settings

Bottom navigation:

HOME
WORKSHOPS
BOOKINGS
HISTORY
PROFILE

Every button must have an actual function.

--------------------------------------------------
HOME
--------------------------------------------------

Display real database information:

- Selected motorcycle
- Motorcycle image
- Current mileage
- Motorcycle health score
- Maintenance status
- Upcoming reminders
- Latest booking
- Quick actions

Quick actions:

Add Motorcycle
→ /profile

Find Workshop
→ /workshops

Book Service
→ /booking

View History
→ /history

Maintenance Reminder
→ relevant maintenance information

Health score must be calculated from real data.

NEVER hardcode:

92/100
85/100
etc.

If insufficient data:

"Not enough data"

--------------------------------------------------
WORKSHOPS
--------------------------------------------------

Display only real approved and active workshops.

Filters:

- Search
- Distance
- Rating
- Open Now
- Service Category

Workshop card:

- Workshop name
- Rating
- Review count
- Distance
- Opening status
- Address
- Services
- Book button

Book button:

→ /booking with selected workshop

View Details:

→ workshop detail screen/modal

No fake workshops.

No fake distance.

No fake ratings.

--------------------------------------------------
BOOKING
--------------------------------------------------

Booking flow:

Select Motorcycle
↓
Select Workshop
↓
Select Service
↓
Select Date
↓
Select Available Time
↓
Add Notes
↓
Review Booking
↓
Confirm Booking

Available time must come from:

- Workshop operating hours
- Existing bookings
- Availability rules

Prevent double booking.

Booking status:

pending
confirmed
in_progress
completed
cancelled
rejected
no_show

Customer cannot arbitrarily modify booking status.

--------------------------------------------------
HISTORY
--------------------------------------------------

Display real:

- Completed services
- Cancelled bookings
- Previous bookings
- Maintenance records
- Invoices
- Expenses

Click booking:

→ booking detail

Click invoice:

→ invoice detail

Click maintenance record:

→ maintenance detail

If no records:

"No service history yet."

--------------------------------------------------
PROFILE
--------------------------------------------------

Customer profile:

- Name
- Email
- Phone
- Avatar
- Password
- Motorcycle garage
- Documents

Buttons:

Edit Profile
Save
Cancel
Add Motorcycle
Edit Motorcycle
Delete Motorcycle
Upload Document
Delete Document
Change Password
Logout

All actions must use real Supabase data.

==================================================
5. MOTORCYCLE MANAGEMENT
==================================================

Database table:

motorcycles

Fields:

id
owner_id
nickname
brand
model
year
plate_number
engine_cc
fuel_type
transmission
current_mileage
engine_oil_type
front_tyre_size
rear_tyre_size
photo_url
created_at
updated_at

Customer can:

- Add
- Edit
- Delete
- Update mileage
- Upload image
- View motorcycle details

Mileage cannot decrease.

Record mileage changes in:

mileage_logs

==================================================
6. MAINTENANCE SYSTEM
==================================================

Tables:

maintenance_records
maintenance_items
maintenance_reminders

Support:

- Service history
- Mileage reminders
- Date reminders
- Due reminders
- Overdue reminders
- Completed reminders

Reminder status:

upcoming
due
overdue
completed
dismissed

No fake reminders.

==================================================
7. MOTORCYCLE HEALTH
==================================================

Health must be calculated dynamically.

Components may include:

- Engine Oil
- Brakes
- Tyres
- Battery
- Chain
- Sprocket
- Spark Plug
- Air Filter

Health calculation must use actual database records.

Do NOT hardcode health scores.

==================================================
8. EXPENSE SYSTEM
==================================================

Table:

expenses

Fields:

id
customer_id
motorcycle_id
booking_id
category
description
amount
expense_date
created_at

Categories:

Maintenance
Fuel
Parts
Insurance
Road Tax
Other

Analytics must use real expenses.

==================================================
9. DOCUMENT MANAGEMENT
==================================================

Use Supabase Storage.

Buckets:

avatars
motorcycle-images
workshop-images
documents
service-receipts
review-images

Documents:

Insurance
Road Tax
Warranty
Service Receipt
Vehicle Document
Other

Private documents must not be publicly accessible.

Use secure storage policies.

==================================================
10. WORKSHOP ADMIN PORTAL
==================================================

Routes:

/(workshop)/dashboard
/(workshop)/bookings
/(workshop)/services
/(workshop)/parts
/(workshop)/customers
/(workshop)/reviews
/(workshop)/profile
/(workshop)/reports
/(workshop)/settings

Workshop admin can ONLY access their own workshop.

--------------------------------------------------
DASHBOARD
--------------------------------------------------

Display real:

- Today's bookings
- Pending bookings
- In-progress bookings
- Completed bookings
- Revenue
- Average rating
- Low-stock parts
- Urgent actions

No fake analytics.

--------------------------------------------------
BOOKINGS
--------------------------------------------------

Workshop can:

- View booking
- Accept
- Reject
- Reschedule
- Start service
- Complete
- Cancel where permitted
- Add service notes

Status transitions must be validated by backend.

--------------------------------------------------
SERVICES
--------------------------------------------------

Workshop can:

- Add service
- Edit service
- Delete service
- Change price
- Change duration
- Enable/disable service

Service data must come from database.

--------------------------------------------------
PARTS
--------------------------------------------------

Workshop can:

- Add part
- Edit part
- Delete part
- Update stock
- Update price
- Set minimum stock

Never allow negative stock.

Stock status:

IN STOCK
LOW STOCK
OUT OF STOCK

--------------------------------------------------
CUSTOMERS
--------------------------------------------------

Workshop can only see customers who have legitimate bookings with that workshop.

Do not expose unrelated customers.

--------------------------------------------------
REVIEWS
--------------------------------------------------

Workshop can:

- View reviews
- Reply to review

Only customers with completed bookings can create reviews.

Prevent duplicate review for same booking.

--------------------------------------------------
PROFILE
--------------------------------------------------

Workshop can edit:

- Workshop name
- Description
- Phone
- Email
- Address
- Opening hours
- Location
- Images
- Services information

==================================================
11. WORKSHOP REGISTRATION
==================================================

Workshop registration must NOT automatically grant workshop access.

Flow:

Workshop Registration
↓
Workshop application
↓
status = pending
↓
Super Admin review
↓
approved
↓
Workshop becomes active

Rejected workshops cannot appear in customer discovery.

==================================================
12. SUPER ADMIN COMMAND CENTER
==================================================

Routes:

/(admin)
/(admin)/users
/(admin)/workshops
/(admin)/bookings
/(admin)/services
/(admin)/parts
/(admin)/reviews
/(admin)/notifications
/(admin)/reports
/(admin)/settings
/(admin)/audit-logs

Super Admin has platform-wide access.

--------------------------------------------------
DASHBOARD
--------------------------------------------------

Display real database aggregation:

- Total customers
- Total workshops
- Active workshops
- Pending workshops
- Total bookings
- Completed bookings
- Cancelled bookings
- Active users
- System alerts

Do not fabricate statistics.

--------------------------------------------------
USERS
--------------------------------------------------

Super Admin can:

- Search
- Filter
- View
- Suspend
- Activate
- Delete where permitted
- View user activity

Never allow normal users to access this.

--------------------------------------------------
WORKSHOPS
--------------------------------------------------

Super Admin can:

- View
- Approve
- Reject
- Suspend
- Reactivate
- Review workshop information

--------------------------------------------------
BOOKINGS
--------------------------------------------------

Super Admin can:

- View all bookings
- Filter
- Search
- Inspect booking details
- Monitor status

Do not arbitrarily alter completed transactions without proper audit logging.

--------------------------------------------------
REVIEWS
--------------------------------------------------

Super Admin can moderate reviews.

Actions:

- View
- Hide
- Restore
- Remove where justified

Every moderation action must create an audit log.

--------------------------------------------------
NOTIFICATIONS
--------------------------------------------------

Super Admin can send:

- System announcements
- Maintenance notices
- Platform notifications

Do not create fake notifications.

--------------------------------------------------
SETTINGS
--------------------------------------------------

System settings must be stored securely.

Do NOT expose:

- service role keys
- private API keys
- secret credentials

==================================================
13. DATABASE
==================================================

Create and properly relate:

profiles
motorcycles
mileage_logs
workshops
services
parts
bookings
booking_services
maintenance_records
maintenance_items
maintenance_reminders
expenses
documents
reviews
notifications
audit_logs

Use:

- Foreign keys
- Unique constraints
- Check constraints
- Indexes
- Proper timestamps
- Cascading rules where appropriate

Do not use comma-separated IDs.

Do not duplicate relational data unnecessarily.

==================================================
14. BOOKING TRANSACTION
==================================================

Booking creation must be atomic.

Customer confirms booking:

Check availability
↓
Create booking
↓
Create booking_services
↓
Calculate total
↓
Create notification

If anything fails:

ROLLBACK

Never create partially completed bookings.

==================================================
15. BOOKING PRICE SNAPSHOT
==================================================

booking_services must store:

service_name_snapshot
price_snapshot
duration_snapshot

Historical bookings must NOT change if the workshop later changes its service price.

==================================================
16. REALTIME
==================================================

Use Supabase Realtime where necessary.

Customer receives:

- Booking confirmation
- Booking status update
- Workshop response
- Maintenance notification

Workshop receives:

- New booking
- Booking cancellation
- Booking update

Admin receives:

- New workshop registration
- Important system alerts

Do not subscribe to unnecessary tables.

==================================================
17. NOTIFICATIONS
==================================================

Database:

notifications

Fields:

id
user_id
type
title
message
data
is_read
created_at

Every notification must correspond to a real event.

==================================================
18. RLS SECURITY
==================================================

Implement Row Level Security on every user-sensitive table.

Customer:

ONLY own data.

Workshop Admin:

ONLY own workshop and related booking/customer data.

Super Admin:

platform-wide access.

Never rely only on frontend route protection.

Frontend navigation is NOT security.

RLS is the security boundary.

==================================================
19. NO PLACEHOLDER DATA
==================================================

Completely remove:

mockData.ts
mock users
fake workshops
fake motorcycles
fake bookings
fake services
fake parts
fake reviews
fake notifications
fake analytics
fake telemetry
fake invoices
demo credentials
hardcoded user data
hardcoded IDs
placeholder API responses
fake GPS values

DO NOT use:

data || mockData

DO NOT use:

if (!data) return demoData

If database is empty:

Show a proper empty state.

==================================================
20. TELEMETRY
==================================================

Do NOT simulate live telemetry.

Never display fake:

RPM
temperature
battery voltage
brake values
oil pressure

unless connected to an actual telemetry source.

If telemetry hardware/API is unavailable:

Display:

"Telemetry unavailable"

Do not fabricate values.

==================================================
21. DATA SERVICE LAYER
==================================================

Do not place large Supabase queries directly inside UI screens.

Create:

src/services/

authService.ts
motorcycleService.ts
workshopService.ts
bookingService.ts
maintenanceService.ts
reminderService.ts
expenseService.ts
documentService.ts
notificationService.ts
reviewService.ts
adminService.ts
inventoryService.ts
telemetryService.ts

Create reusable typed functions.

Use React Query or equivalent for server state.

==================================================
22. UI STATES
==================================================

Every data screen must support:

Loading
Success
Empty
Error
Retry
Offline

Never show a blank screen.

Never show raw database errors.

Example:

"Something went wrong.
Please try again."

==================================================
23. BUTTON FUNCTION AUDIT
==================================================

AUDIT EVERY:

Button
Touchable
Icon Button
Card Action
Tab
Drawer Item
Menu
Dropdown
FAB
Link
Navigation Item
Form Submit
Delete Action
Edit Action

Every interactive element MUST:

1. Have a defined action.
2. Navigate to the correct route OR perform a real mutation.
3. Show loading state when necessary.
4. Show success/error feedback.
5. Prevent duplicate submissions.
6. Respect user permissions.
7. Never silently do nothing.

Remove unused interactive elements.

If an icon is decorative, do not make it clickable.

==================================================
24. NAVIGATION AUDIT
==================================================

Verify every route.

Verify:

- No dead routes
- No broken links
- No missing screens
- No incorrect back navigation
- No unauthorized route access
- No infinite redirect loops
- No duplicate routes

Protected route flow:

Unauthenticated
→ /(auth)/welcome

Customer
→ /(customer)

Workshop Admin
→ /(workshop)

Super Admin
→ /(admin)

==================================================
25. PASSWORD SYSTEM
==================================================

Implement:

- Show/hide password
- Forgot password
- Password reset
- Change password
- Confirm password
- Validation
- Loading state
- Error state
- Success popup

Never log passwords.

Never store passwords manually.

Supabase Auth handles password storage.

==================================================
26. ERROR HANDLING
==================================================

Create centralized error handling.

Handle:

- Network errors
- Authentication errors
- Authorization errors
- Database errors
- Storage errors
- Validation errors
- Timeout errors
- Session expiration

Convert technical errors into user-friendly messages.

==================================================
27. OFFLINE HANDLING
==================================================

Detect network state.

Show:

Offline
Syncing
Connected

Do not allow unsafe duplicate mutations when offline.

Cache safe read-only information where appropriate.

==================================================
28. PERFORMANCE
==================================================

Optimize:

- Database queries
- Images
- Lists
- Realtime subscriptions
- React renders
- Navigation
- API calls

Use pagination for large lists.

Use FlatList/FlashList where appropriate.

Do not download entire tables unnecessarily.

Use database aggregation for analytics.

Add proper database indexes.

==================================================
29. PRODUCTION UI
==================================================

Maintain the RiderHood visual identity.

Theme:

Background:
#0a0c10

Surface:
#12161f
#1a202c

Primary:
#ff6b00

Workshop:
#f59e0b

Success:
#10b981

Danger:
#ef4444

The UI must feel:

- Premium
- Automotive
- Modern
- Professional
- High quality
- Consistent

Do not introduce random colors.

Do not redesign the application into a completely different visual identity.

==================================================
30. RESPONSIVE UI
==================================================

Support:

- Android phones
- iOS phones
- Different screen sizes
- Safe areas
- Keyboard behavior
- Dark environment

No clipped text.

No overlapping buttons.

No inaccessible controls.

==================================================
31. ACCESSIBILITY
==================================================

Interactive elements should have:

- Accessible labels
- Proper touch target sizes
- Readable contrast
- Keyboard-safe forms
- Clear error messages

==================================================
32. SECURITY
==================================================

Implement:

- RLS
- Secure Storage access
- Auth session handling
- Input validation
- Database constraints
- Authorization checks
- Audit logs

Never trust:

- client role
- client price
- client total
- client ownership ID
- client workshop ID

Validate sensitive values on the backend.

==================================================
33. AUDIT LOG
==================================================

Track important admin actions:

- User suspended
- User activated
- Workshop approved
- Workshop rejected
- Workshop suspended
- Review moderated
- System setting changed
- Important booking intervention

Audit logs must not be editable by normal users.

==================================================
34. DOCUMENTATION
==================================================

Create/update:

PROJECT_DOCUMENTATION.md

The file MUST document the complete project.

Include:

# RiderHood Documentation

## 1. Project Overview

## 2. Technology Stack

## 3. Architecture

## 4. User Roles

Customer
Workshop Admin
Super Admin

## 5. Authentication Flow

## 6. Route Structure

## 7. Customer Features

Document EVERY:

- Screen
- Button
- Menu
- Tab
- Form
- Action
- Navigation path

## 8. Workshop Features

Document EVERY:

- Screen
- Button
- Menu
- Form
- Booking action
- Inventory action
- Service action
- Review action

## 9. Super Admin Features

Document EVERY:

- Screen
- Button
- Menu
- Moderation action
- User action
- Workshop action
- Reporting action
- System setting

## 10. Database Schema

Document every table.

For each table document:

- Purpose
- Columns
- Primary key
- Foreign keys
- Relationships
- RLS policy

## 11. Storage

Document every storage bucket.

## 12. Realtime

Document every realtime subscription.

## 13. Booking Workflow

Document the complete lifecycle.

## 14. Maintenance Workflow

## 15. Notification Workflow

## 16. Role Permissions Matrix

Example:

| Feature | Customer | Workshop Admin | Super Admin |
|----------|----------|----------------|-------------|
| Own Profile | CRUD | CRUD | CRUD |
| Motorcycle | CRUD | View Related | View |
| Workshop | Read | Own Workshop | CRUD |
| Booking | Create/Own | Own Workshop | View All |
| Services | Read | Own Workshop | Manage |
| Parts | — | Own Workshop | Manage |
| Reviews | Create Own | Reply Own | Moderate |
| Users | — | — | Manage |

## 17. Error Handling

## 18. Security

## 19. Environment Variables

## 20. Production Deployment

## 21. Testing Checklist

## 22. Known Limitations

Only document actual limitations.

Do not claim a feature exists if it does not.

==================================================
35. FEATURE / BUTTON DOCUMENTATION
==================================================

Inside PROJECT_DOCUMENTATION.md include a complete interaction map.

Example:

| Screen | Element | Action | Destination / Result |
|--------|---------|--------|----------------------|
| Welcome | Sign In | Authenticate | Role-based redirect |
| Welcome | Register | Open registration | /register |
| Welcome | Forgot Password | Reset password | /forgot-password |
| Home | Add Motorcycle | Create motorcycle | Motorcycle form |
| Home | Find Workshop | Open workshop search | /workshops |
| Workshop | Book | Start booking | /booking |
| Booking | Confirm | Create booking | Booking details |
| Booking | Cancel | Cancel booking | Updated booking |
| History | Invoice | View invoice | Invoice details |
| Profile | Logout | End session | /welcome |
| Workshop Dashboard | Booking | View booking | Booking details |
| Workshop | Accept | Update status | confirmed |
| Workshop | Complete | Complete service | completed |
| Admin | Approve | Approve workshop | Workshop active |

Continue this table until EVERY interactive element in the application is documented.

==================================================
36. REMOVE LEGACY / UNUSED CODE
==================================================

Audit the existing project.

Remove or migrate:

- legacy login.tsx
- unused explore.tsx
- legacy tabs
- unused components
- mockData.ts
- unused hooks
- unused services
- unused dependencies
- dead routes
- test screens
- debug screens

Before deleting anything, verify that it is not referenced elsewhere.

Do not leave duplicate implementations.

==================================================
37. TYPESCRIPT
==================================================

Run:

npx tsc --noEmit

Fix ALL TypeScript errors.

Do not use:

any

to hide real type problems unless absolutely necessary and justified.

Generate/use Supabase database types.

==================================================
38. LINT / BUILD
==================================================

Run all available project validation commands.

At minimum:

npm install
npx tsc --noEmit
npx expo-doctor
npm run web

If available, run:

npm run lint
npm run test
npm run build

Fix all errors and warnings that can affect production.

==================================================
39. DATABASE VALIDATION
==================================================

Verify:

- All tables exist
- All foreign keys work
- All indexes exist
- All constraints work
- RLS enabled
- RLS policies tested
- Storage policies tested
- Functions work
- Triggers work
- Realtime works
- No broken migrations

Test with:

Customer account
Workshop Admin account
Super Admin account

==================================================
40. SECURITY TEST
==================================================

Attempt unauthorized operations.

Customer attempting to:

- Read another customer
- Edit another motorcycle
- Access workshop private data
- Access admin data
- Change own role

Workshop Admin attempting to:

- Access another workshop
- Edit another workshop
- Access unrelated customer
- Change own role to super_admin

These attempts MUST fail.

==================================================
41. END-TO-END TEST
==================================================

Test this complete flow:

CUSTOMER

Register
↓
Login
↓
Create Motorcycle
↓
Find Workshop
↓
Select Service
↓
Book
↓
Workshop receives booking
↓
Workshop accepts
↓
Customer receives notification
↓
Workshop starts service
↓
Workshop completes service
↓
Maintenance record created
↓
Expense recorded
↓
Health score updated
↓
Customer reviews
↓
Workshop rating updated
↓
Admin analytics updated

WORKSHOP

Register
↓
Pending
↓
Super Admin approves
↓
Workshop activates
↓
Add Services
↓
Add Inventory
↓
Receive Booking
↓
Accept
↓
Start
↓
Complete
↓
Customer updated

SUPER ADMIN

Login
↓
Dashboard
↓
Approve Workshop
↓
Monitor Users
↓
Monitor Bookings
↓
Moderate Reviews
↓
View Reports
↓
Audit Logs

==================================================
42. NO SILENT FAILURES
==================================================

Every failed operation must provide:

- User-friendly error
- Retry option where appropriate
- Logging where appropriate

Never let a button appear to work when the database operation failed.

Example:

Bad:

Button clicked
→ nothing happens

Correct:

Button clicked
→ loading
→ database mutation
→ success feedback

OR

Button clicked
→ loading
→ database error
→ error message
→ retry

==================================================
43. FINAL PRODUCTION CHECK
==================================================

Before finishing, inspect the ENTIRE project.

Search for:

mock
Mock
placeholder
Placeholder
fake
Fake
sample
Sample
demo
Demo
test@example
admin@example
console.log
TODO
FIXME
hardcoded IDs
hardcoded users
hardcoded bookings
hardcoded prices
hardcoded analytics

Remove or properly replace anything that is not intended for production.

Do NOT remove legitimate documentation or legitimate test infrastructure without checking its purpose.

==================================================
44. FINAL DELIVERABLE
==================================================

The finished project must contain:

1. Fully functional Expo application
2. One unified login page
3. Customer portal
4. Workshop Admin portal
5. Super Admin portal
6. Supabase authentication
7. PostgreSQL database
8. RLS security
9. Supabase Storage
10. Realtime where required
11. Real notifications
12. Real booking system
13. Real workshop management
14. Real inventory
15. Real maintenance tracking
16. Real expenses
17. Real reviews
18. Real reports
19. Proper error handling
20. Proper loading/empty states
21. No mock production data
22. No fake telemetry
23. No fake accounts
24. No hardcoded secrets
25. No broken buttons
26. No dead routes
27. No unauthorized access
28. PROJECT_DOCUMENTATION.md

==================================================
45. FINAL QUALITY STANDARD
==================================================

Do not stop after connecting the database.

Audit the entire application.

Every screen must connect to the correct backend data.

Every button must work.

Every navigation path must work.

Every role must have the correct permissions.

Every database relationship must work.

Every mutation must handle success and failure.

Every empty database state must display correctly.

The application must be able to start with an EMPTY production database and function normally as real users create data.

The final project should behave like one connected production system:

CUSTOMER
    ↕
WORKSHOP ADMIN
    ↕
SUPER ADMIN
    ↕
SUPABASE
    ↕
POSTGRESQL
    ↕
STORAGE / REALTIME / FUNCTIONS

Do not declare the project complete until all critical flows have been tested end-to-end and the TypeScript/build/database/security checks pass.

==================================================
END OF MASTER PROMPT
==================================================