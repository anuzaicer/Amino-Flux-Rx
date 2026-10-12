# Amino Flux Rx

Patient, practitioner and admin portal for Amino Flux Rx: lab panels, practitioner
review and approvals, treatment ordering and fulfillment.

Built with TanStack Start (React 19), Tailwind CSS, shadcn/ui and Supabase.

## Setup

1. **Supabase project.** Apply the schema in `supabase/migrations/` (in filename
   order) with the Supabase CLI: `supabase link --project-ref <ref>` then
   `supabase db push`. This creates the tables, row-level security policies and
   the private `patient-documents` storage bucket.
2. **Environment.** Copy `.env.example` to `.env` and fill in the values from
   Supabase → Project Settings → API. Set the same variables in your hosting
   provider.
3. **Install and run.**

   ```sh
   bun install
   bun run dev
   ```

4. **Build.** `bun run build` produces a server build (Cloudflare Workers target by
   default, via Nitro).

## Auth emails

Sign-up confirmation and password-reset emails are sent by Supabase Auth. In the
Supabase dashboard set **Authentication → URL Configuration → Site URL** to your
deployed domain and add `https://<your-domain>/reset-password` to the redirect URLs.
For production volume, configure custom SMTP under **Authentication → Emails**.

## Notification emails

Order, lab, payment and appointment notifications (`src/lib/email-templates/`) are
sent through Resend when `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` are set. Without
them, each notification is skipped and logged, and patients see updates in the
portal only.

## Scheduled reminders

Appointment and approved-not-ordered reminders run when something calls
`POST /api/public/hooks/notifications` with header `x-cron-secret:
$NOTIFICATION_CRON_SECRET`, roughly every 15–30 minutes (for example a Cloudflare
Cron Trigger or any HTTP cron service).

## Staff roles

Admin and practitioner access comes from the `user_roles` table (`admin` or
`provider`). The first admin must be added directly in the database:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com';
```
