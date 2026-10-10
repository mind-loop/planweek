import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, ArrowRightLeft, Crown, LoaderCircle, Shield, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToast } from '../context/ToastContext';
import { cn } from '../lib/utils';
import { Card, Sheet, Skeleton } from '../components/ui';

export type AdminRole = 'superadmin' | 'admin';

interface AdminUser {
  email: string;
  role: AdminRole;
  has_account: boolean;
  created_at: string;
}

const inputClass =
  'w-full min-h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-base text-slate-900 shadow-sm outline-none transition focus:border-cyan-600 focus:ring-4 focus:ring-cyan-600/15';

/** Superadmin manages admins and can hand the role over; admins see the list read-only. */
export function AdminUsersPanel({
  myEmail,
  myRole,
  onRoleChanged,
}: {
  myEmail: string;
  myRole: AdminRole;
  onRoleChanged: () => void;
}) {
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [transferTo, setTransferTo] = useState<AdminUser | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const isSuper = myRole === 'superadmin';
  const me = myEmail.toLowerCase();

  const load = useCallback(async () => {
    const { data, error } = await supabase!.rpc('list_admins');
    if (error) toast(error.message, 'error');
    setAdmins((data as AdminUser[]) ?? []);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase!.rpc('add_admin', { new_email: newEmail });
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast('Админ нэмэгдлээ');
    setNewEmail('');
    void load();
  };

  const remove = async (a: AdminUser) => {
    if (!window.confirm(`${a.email}-ийн админ эрхийг хасах уу?`)) return;
    const { error } = await supabase!.rpc('remove_admin', { target_email: a.email });
    if (error) return toast(error.message, 'error');
    toast('Эрх хасагдлаа');
    void load();
  };

  const transfer = async () => {
    if (!transferTo) return;
    setBusy(true);
    const { error } = await supabase!.rpc('transfer_superadmin', { target_email: transferTo.email });
    setBusy(false);
    if (error) return toast(error.message, 'error');
    toast(`Superadmin эрх ${transferTo.email} руу шилжлээ`);
    setTransferTo(null);
    setConfirmText('');
    await load();
    onRoleChanged();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 text-[15px] leading-relaxed text-slate-600">
        <p>
          <b className="text-slate-900">Superadmin</b> — админ нэмэх, хасах, эрхээ шилжүүлэх. Нэг л хүн байна.
        </p>
        <p className="mt-1">
          <b className="text-slate-900">Admin</b> — мэдээ, хуваарь засах.
        </p>
      </Card>

      {isSuper && (
        <Card className="p-4">
          <form onSubmit={add} className="space-y-3">
            <label htmlFor="new-admin" className="block text-[15px] font-semibold text-slate-700">
              Шинэ админ нэмэх
            </label>
            <input
              id="new-admin"
              type="email"
              required
              placeholder="name@gmail.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={busy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 font-semibold text-white shadow-sm transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="size-5 animate-spin" /> : <UserPlus className="size-5" />} Нэмэх
            </button>
            <p className="text-sm text-slate-500">
              Нэвтрэх нууц үгийг Supabase → Authentication → Users → <b>Add user</b> хэсэгт үүсгэнэ.
            </p>
          </form>
        </Card>
      )}

      {admins === null ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-slate-100">
          {admins.map((a) => {
            const superRow = a.role === 'superadmin';
            const self = a.email === me;
            return (
              <div key={a.email} className="flex items-center gap-3 py-3 pl-4 pr-2">
                <span
                  className={cn(
                    'grid size-11 shrink-0 place-items-center rounded-xl',
                    superRow ? 'bg-amber-100 text-amber-700' : 'bg-cyan-50 text-cyan-700',
                  )}
                >
                  {superRow ? <Crown className="size-5" /> : <Shield className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900">
                    {a.email}
                    {self && <span className="ml-1.5 text-sm font-medium text-slate-400">(Та)</span>}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold',
                        superRow ? 'bg-amber-400 text-amber-950' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      {superRow ? 'Superadmin' : 'Admin'}
                    </span>
                    {!a.has_account && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                        <AlertTriangle className="size-3" /> Бүртгэл үүсээгүй
                      </span>
                    )}
                  </div>
                </div>
                {isSuper && !superRow && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTransferTo(a)}
                      aria-label="Superadmin эрх шилжүүлэх"
                      title="Superadmin эрх шилжүүлэх"
                      className="grid size-11 place-items-center rounded-full text-amber-700 active:bg-amber-50"
                    >
                      <ArrowRightLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(a)}
                      aria-label="Эрх хасах"
                      className="grid size-11 place-items-center rounded-full text-red-600 active:bg-red-50"
                    >
                      <Trash2 className="size-5" />
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </Card>
      )}

      <Sheet
        open={!!transferTo}
        onClose={() => {
          setTransferTo(null);
          setConfirmText('');
        }}
        title="Superadmin эрх шилжүүлэх"
        footer={
          <button
            type="button"
            onClick={transfer}
            disabled={busy || confirmText.trim().toLowerCase() !== transferTo?.email}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 font-semibold text-amber-950 shadow-sm transition active:scale-[0.98] disabled:opacity-40"
          >
            {busy ? <LoaderCircle className="size-5 animate-spin" /> : <ArrowRightLeft className="size-5" />} Шилжүүлэх
          </button>
        }
      >
        {transferTo && (
          <div className="space-y-4 text-[15px] leading-relaxed text-slate-700">
            <p className="flex gap-2 rounded-xl bg-amber-50 p-3 text-amber-900">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" />
              <span>
                <b>{transferTo.email}</b> superadmin болж, та энгийн <b>Admin</b> болно. Буцаахын тулд шинэ superadmin танд эргүүлж
                шилжүүлэх хэрэгтэй.
              </span>
            </p>
            {!transferTo.has_account && (
              <p className="rounded-xl bg-red-50 p-3 text-red-800">
                Энэ имэйлээр Supabase-д бүртгэл үүсээгүй тул шилжүүлэх боломжгүй. Эхлээд Add user хийнэ үү.
              </p>
            )}
            <div>
              <label htmlFor="confirm-email" className="mb-1.5 block font-semibold">
                Баталгаажуулахын тулд имэйлийг бичнэ үү
              </label>
              <input
                id="confirm-email"
                type="email"
                autoComplete="off"
                placeholder={transferTo.email}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
      </Sheet>
    </div>
  );
}
