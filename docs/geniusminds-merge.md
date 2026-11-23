# GeniusMinds + wacrm merge

This project is wacrm (Next.js 16 + Supabase) with the pages of
GeniusMindsCRM-Complete rebuilt on wacrm's stack. wacrm's WhatsApp
inbox, webhooks, automations, flows, broadcasts and AI agents are
unchanged.

## Which version of each page

| Page | Source |
| --- | --- |
| Dashboard, Contacts (GM "Clients"), Inbox (GM "Team Inbox" / "WhatsApp"), Notifications, Settings | wacrm only (no duplicates) |
| Pipelines, Broadcasts, Automations (covers GM "Cadences"), Flows, AI Agents | wacrm |
| Activities, Schedule, Analytics, Report builder, Email, Calls, Web Chat Assistant, Expenses, Payments received, Students, Batches & Courses, Fee management, Certificates, Landing pages, SEO pipeline, Post ideas, Media storage, Intelligence, Audit log | GeniusMinds, rebuilt |

GM's Admin page is covered by wacrm Settings → Team members.
GM's SEO pipeline was a title-only placeholder in GM and has no
counterpart in wacrm, so it shows a "not available yet" page.

Every rebuilt page has a header comment naming its GM origin, and the
sidebar config (`src/components/layout/sidebar.tsx`) tags each item
with `origin: "wacrm" | "geniusminds"`.

## Data model

GM leads and students are wacrm **contacts**. Their admissions data
(status, course, source, area, follow-up) lives in `gm_lead_profiles`
(one row per contact), so phone numbers are never duplicated and each
learner keeps their WhatsApp conversation. A student is a lead with
status `enrolled`. The contact detail sheet has an "Admissions
(GeniusMinds)" card for this.

| Migration | Adds |
| --- | --- |
| 060 | `gm_courses`, `gm_lead_profiles`, cross-account reference guard |
| 061 | `gm_activities` |
| 062 | `gm_payments`, `gm_expenses` |
| 063 | `gm_channel_logs` (email / call log), `gm_certificates`, `gm_landing_pages` |
| 064 | private storage bucket `gm-media` + policies |
| 065 | `gm_audit_log` + trigger on every gm table (admin-only read) |
| 066 | Realtime publication for the gm tables |
| 067 | `redeem_invitation()` also checks gm tables before deleting a solo account |

All tables are account-scoped with RLS through `is_account_member`:
viewers read, agents write, admins approve expenses and delete
courses / certificates. Money defaults to INR.

No new environment variables are needed.

## Applying

Run the new migrations in order (Supabase SQL editor or
`supabase db push`) **after backing up the database**. They are
additive except 067, which re-creates `redeem_invitation()` with a
longer "has data" list.

## Not included

- Sending email or placing calls: neither project had a provider, so
  Email and Calls keep a shared log and open the device's mail / phone
  app.
- The assistant uses GM's rule-based answers, not an AI model.
- New UI strings are English in the ko / pt / es catalogues too.
