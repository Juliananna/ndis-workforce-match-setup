# NDIS Workforce Match — MVP QA Checklist

## Full End-to-End Journey

### Worker Journey

#### 1. Registration & Auth
- [ ] Navigate to `/register`, select **Worker**, fill in name, phone, email, password, submit
- [ ] Confirm "Email not verified" banner appears on dashboard
- [ ] Click "Verify Email" and enter the `verificationToken` returned from registration (check API response or backend logs)
- [ ] Confirm the banner changes to "Email verified" and the `isVerified` badge shows
- [ ] Sign out; attempt to access `/dashboard` — confirm redirect to `/login`
- [ ] Sign back in; confirm landing on dashboard with WORKER role badge

#### 2. Worker Profile
- [ ] Go to **My Profile** tab
- [ ] Fill in: Full Legal Name, Email Address, Phone, Location/Suburb, Travel Radius, Years of Experience
- [ ] Fill in Bio, Previous Employers, Qualifications
- [ ] Toggle Driver's Licence and Own Vehicle checkboxes
- [ ] Save — confirm "Saved!" flash and updated profile data
- [ ] Confirm completion % bar updates after filling fields

#### 3. Worker Skills
- [ ] Add at least 3 support skills (e.g. "Personal care", "Autism support", "Mobility support")
- [ ] Save and confirm skills persist on page refresh

#### 4. Worker Availability
- [ ] Select available days (at least 2 including a weekday)
- [ ] Select preferred shift types
- [ ] Set minimum pay rate and max travel distance
- [ ] Save and confirm values persist

#### 5. Compliance Documents
- [ ] Upload a PDF for "Police Clearance" with an expiry date 2 years out
- [ ] Confirm status shows "Pending" (awaiting admin verification)
- [ ] Upload a PDF for "First Aid Certificate" with an expiry date 20 days out
- [ ] Confirm status shows "Expiring Soon"
- [ ] Upload a PDF for "CPR Certificate" with an expiry date in the past
- [ ] Confirm status shows "Expired" (not "Missing")
- [ ] Confirm all uploads show a "View" link that opens the document (signed URL)
- [ ] Attempt to upload a `.docx` file — confirm error "file must be PDF, JPG, PNG, or WebP"
- [ ] Delete a document and confirm it disappears from the list

#### 6. Intro Video
- [ ] Go to My Profile → Video Introduction section
- [ ] Confirm prompt text explains this is a professional NDIS introduction video with bullet guidance
- [ ] Upload an MP4 video under 100MB
- [ ] Confirm video player appears and plays the video
- [ ] Delete video and confirm the empty state returns
- [ ] Attempt to upload a video >100MB — confirm size error

#### 7. Matched Jobs (Worker Home)
- [ ] Worker home tab shows "Matched Jobs" panel
- [ ] If no location set, confirm message "No location set — add your coordinates..."
- [ ] If location set, confirm jobs are sorted by skill match + distance
- [ ] Confirm pay rate filtering: jobs below worker's minimum pay rate do not appear

---

### Employer Journey

#### 8. Registration & Auth
- [ ] Register as **Employer** with organisation name, ABN, contact person, phone, email
- [ ] Verify email
- [ ] Sign in and confirm EMPLOYER badge

#### 9. Organisation Profile
- [ ] Go to **Organisation** tab → Edit
- [ ] Fill all fields: name, ABN, contact person, email, phone, location, org size
- [ ] Add service areas (state toggles + custom)
- [ ] Add services provided
- [ ] Save — confirm data persists
- [ ] Confirm "Not set" displays gracefully for empty optional fields

#### 10. Job Requests
- [ ] Click "New Job Request"
- [ ] Fill location, shift date, start time, duration, weekday/weekend/public holiday rates
- [ ] Select at least 2 support type tags
- [ ] Add client notes, behavioural considerations, medical requirements
- [ ] Set gender preference
- [ ] Save as Draft — confirm job appears in list with "Draft" status
- [ ] Edit the job and change status to "Open"
- [ ] Confirm job appears in worker matched jobs list (if worker skills match)
- [ ] Cancel a job — confirm status changes to "Cancelled" and it can no longer be edited

#### 11. Matched Workers for Job
- [ ] Open an Open job → scroll to "Matched Workers" section
- [ ] Confirm workers are listed with compatibility % badge (green ≥70%, amber 40–69%)
- [ ] Confirm match reasons are shown (e.g. "3 of 4 skills matched", "Available on Wednesday", "5km away")
- [ ] Confirm workers below job's pay rate are excluded
- [ ] If job has lat/lng, confirm workers are geo-filtered within max distance

#### 12. Sending Offers
- [ ] Click "Offer" on a matched worker card — confirm worker name is pre-filled in the modal (no need to type UUID)
- [ ] Set offered rate and notes, click "Send Offer"
- [ ] Confirm offer appears in Employer Offers tab with "Pending" status

#### 13. Offer Negotiation (Employer side)
- [ ] Worker proposes a new rate → employer should see status change to "Negotiating"
- [ ] Employer clicks "Accept Proposed Rate" → status becomes "Accepted"
- [ ] OR employer clicks "Counter Rate" → enters counter value → sends → status stays "Negotiating"
- [ ] Employer cancels a Pending/Negotiating/Accepted offer → status becomes "Cancelled"

---

### Worker Offer Flow

#### 14. Worker Offer Responses
- [ ] Log in as worker, go to Offers tab
- [ ] Pending offer from employer: click "Accept Offer" → status → Accepted
- [ ] Pending offer: click "Decline" → status → Declined
- [ ] Pending offer: click "Propose New Rate" → enter rate → submit → status → Negotiating
- [ ] Cannot respond to Accepted/Declined/Cancelled offers (actions hidden)

---

### Post-Agreement: Document Access

#### 15. Employer Document Access After Accepted Offer
- [ ] Find an offer in "Accepted" status in Employer Offers
- [ ] Open offer detail → scroll to "Worker Compliance Documents"
- [ ] Confirm documents panel is visible (not locked)
- [ ] Click Download on a document — confirm a signed URL opens the file in a new tab
- [ ] Log out; attempt to call `/employers/workers/:workerId/documents` without auth → 401
- [ ] Attempt as a different employer (no accepted offer with that worker) → 403

#### 16. Locked Documents Before Agreement
- [ ] View an offer in "Pending" or "Negotiating" status
- [ ] Confirm "Documents locked" placeholder appears instead of document list

---

### Compliance Expiry

#### 17. Expiry Status Visibility
- [ ] Worker uploads document with expiry 20 days out → status = "Expiring Soon"
- [ ] Worker uploads document with expiry 55 days out → status = "Expiring Soon"
- [ ] Worker uploads document with expiry 90 days out → status = "Pending"
- [ ] Worker uploads document with past expiry → status = "Expired"
- [ ] Verified document (admin-verified) with future expiry retains "Verified" status

---

### Admin

#### 18. Admin Document Verification
- [ ] Admin verifies a document → status → "Verified"
- [ ] Admin rejects a document → status → "Pending" (not "Missing")

---

### Security & Access Control

#### 19. Role Enforcement
- [ ] Worker cannot call employer-only APIs (e.g. `/matching/jobs/:id/workers`) → 403
- [ ] Employer cannot call worker-only APIs (e.g. `/workers/documents`) → 403
- [ ] Unauthenticated requests to protected endpoints → 401
- [ ] Worker cannot access another worker's documents

#### 20. Data Integrity
- [ ] Attempt to create a job with negative pay rate → rejected
- [ ] Attempt to respond to offer with invalid action string → rejected
- [ ] Attempt to set worker availability with invalid day name → rejected
- [ ] Attempt to upload document with invalid expiry date string → rejected

---

## Seed Data for Local Testing

```sql
-- Insert an admin user (after registering normally):
UPDATE users SET role = 'WORKER' WHERE email = 'worker@test.com'; -- already worker
-- To make a user admin, set is_admin = true:
UPDATE admins SET is_active = true WHERE user_id = '<admin-user-id>';
-- Or insert directly into admins table:
INSERT INTO admins (user_id) VALUES ('<user-id>');
```

Recommended test accounts:
- `worker@test.com` / `password123` — WORKER
- `employer@test.com` / `password123` — EMPLOYER

To test geo-matching, update worker and job with lat/lng:
```sql
UPDATE workers SET latitude = -33.8688, longitude = 151.2093 WHERE user_id = '<worker-user-id>';
UPDATE job_requests SET latitude = -33.8900, longitude = 151.2000 WHERE job_id = '<job-id>';
```
