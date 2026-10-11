# Чуулганы Мэдээ — УВС БАПТИСТ ЧУУЛГАН

Mobile-first PWA for the weekly church bulletin. React 18 + Vite + TypeScript + Tailwind v4 + Supabase.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build (with service worker)
```

`.env.local` needs:

```
VITE_SUPABASE_URL=https://pckcdhbowourkwthptic.supabase.co
VITE_SUPABASE_ANON_KEY=<publishable / anon key from Project Settings → API>
```

Never put the database password or the `service_role` key in any `VITE_` variable. Everything with that prefix ships to the browser.

Without the env vars, or while a table is empty, the app shows built-in sample data and a yellow "Жишээ өгөгдөл" notice.

## Database setup (once)

1. Supabase → **SQL Editor** → run, in order, [`supabase/schema.sql`](supabase/schema.sql), [`002_seminar.sql`](supabase/002_seminar.sql) and [`003_plan_categories_files.sql`](supabase/003_plan_categories_files.sql). The last one adds plan categories plus the public `plan-files` storage bucket for the downloadable monthly schedule.
2. **Authentication → Users → Add user**: create an email/password account for each editor.
3. Allow those emails to edit:
   ```sql
   insert into public.admin_emails (email) values ('editor@example.com');
   ```
4. Recommended: **Authentication → Providers → Email** → turn off *Allow new users to sign up*.

Anyone can read the bulletin. Only signed-in emails listed in `admin_emails` can write (enforced by RLS).

## Admin panel

**Roles:** there is exactly one **Superadmin**, who can add or remove admins and hand the superadmin role to another admin from the **Админууд** tab. **Admins** edit content only. A transfer needs the new superadmin to already be an admin with a Supabase login, and the old superadmin becomes a regular admin. All of this goes through security-definer RPCs in `schema.sql` (`add_admin`, `remove_admin`, `transfer_superadmin`, `list_admins`, `my_admin_role`).

Open `/#/admin`, or tap the logo 5 times quickly. Sign in to add, edit or delete announcements, verses, plans, duties, fellowship groups and cleaning areas. Under **Үйлчлэл**, the **7 хоног хуулах** button copies the latest week's duties to the following Sunday.

## District links

`https://<site>/?d=21` opens the app with district 21 preselected, so you can share it in that district's group chat.

## Deploy to Vercel

Import the repo. The framework preset is Vite. Add the two `VITE_SUPABASE_*` env vars and deploy.

## Structure

```
src/
  types/database.ts      Row interfaces for every table
  lib/supabaseClient.ts  Client + fetchBulletin() with per-table mock fallback
  lib/mockData.ts        Sample bulletin (dates relative to today)
  lib/duty.ts            Duty labels/icons, current/next week logic
  context/               Data, district filter, toasts
  components/            Header (+district pills, map sheet), BottomNav, UI kit
  pages/                 Home, Plan, Duty, Fellowship, Cleaning
  admin/                 Login + schema-driven CRUD editor
supabase/schema.sql      Tables, indexes, RLS policies
```
