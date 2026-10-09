"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronDown, Trash2 } from "lucide-react";
import { users, auth, apiError } from "@/lib/api";
import { getToken, type SessionUser } from "@/lib/client-auth";
import { useAuth } from "@/components/auth/auth-provider";

export function AccountForms({ user }: { user: SessionUser | null }) {
  return (
    <div className="card rounded-[1.75rem] p-3">
      <EditProfile user={user} />
      <div className="mx-4 h-px bg-hairline" />
      <ChangePassword />
      <div className="mx-4 h-px bg-hairline" />
      <DeleteAccount />
    </div>
  );
}

function DeleteAccount() {
  const router = useRouter();
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function remove() {
    const t = getToken();
    if (!t) return;
    setBusy(true); setErr(null);
    const res = await auth.deleteAccount(t);
    setBusy(false);
    if (res) { logout(); router.push("/"); router.refresh(); }
    else setErr("Couldn't delete your account. Contact support.");
  }

  return (
    <Section title="Delete account">
      <p className="text-[15px] text-muted">
        This permanently deletes your account, orders history and saved items. It can&apos;t be undone.
      </p>
      <label className="mt-3 block">
        <span className="text-[12px] font-medium text-muted">Type DELETE to confirm</span>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 h-11 w-full max-w-xs rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none"
        />
      </label>
      {err && <p className="mt-2 text-sm font-medium text-live">{err}</p>}
      <button
        onClick={remove}
        disabled={confirm !== "DELETE" || busy}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-live px-5 py-2.5 text-sm font-semibold text-live transition-colors hover:bg-live/5 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete my account
      </button>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3.5 text-left transition-colors hover:bg-surface-2">
        <span className="font-medium text-ink">{title}</span>
        <ChevronDown className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function EditProfile({ user }: { user: SessionUser | null }) {
  const emailVerified = user?.isEmailVerified as boolean | undefined;
  const [f, setF] = useState({
    username: (user?.username as string) ?? "",
    email: (user?.email as string) ?? "",
    gender: (user?.gender as string) ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // When the email changes, the backend emails a code and asks us to verify it
  // before the change applies. Collect that code here.
  const [otpRequired, setOtpRequired] = useState(false);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setState("saving");
    setMsg(null);
    const body = otpRequired && otp ? { ...f, otp: otp.trim() } : f;
    const res = await users.updateProfile(body, t);

    if (!res) { setState("error"); return; }
    // Email changed: backend sent a code, wants us to verify it.
    if (res.action === "verify-email-otp") {
      setOtpRequired(true);
      setMsg(res.message ?? "We emailed a code to your new address. Enter it to confirm.");
      setState("idle");
      return;
    }
    if (res.success) {
      setState("saved");
      setOtpRequired(false);
      setOtp("");
    } else {
      setState("error");
      setMsg(res.message ?? null);
    }
  }

  return (
    <Section title="Edit profile">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Username" value={f.username} on={set("username")} />
        <div className="block">
          <Field
            label="Email"
            value={f.email}
            on={(e) => {
              set("email")(e);
              // A code only proves the address it was sent to - ask for a new one.
              if (otpRequired) { setOtpRequired(false); setOtp(""); setMsg(null); }
            }}
            type="email"
          />
          {otpRequired ? null : emailVerified === false && f.email ? (
            <p className="mt-1 text-[12px] text-muted">Email not verified yet.</p>
          ) : null}
        </div>
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Gender</span>
          <select value={f.gender} onChange={set("gender")} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>

        {otpRequired && (
          <div className="sm:col-span-2">
            <Field
              label={`Verification code (sent to ${f.email})`}
              value={otp}
              on={(e) => setOtp(e.target.value)}
            />
          </div>
        )}

        {msg && (
          <p role={state === "error" ? "alert" : "status"} className={`text-[13px] font-medium sm:col-span-2 ${state === "error" ? "text-live" : "text-muted"}`}>
            {msg}
          </p>
        )}

        <div className="sm:col-span-2">
          <SaveButton
            state={state}
            label={otpRequired ? "Verify & save" : "Save changes"}
            savedLabel="Saved"
          />
        </div>
      </form>
    </Section>
  );
}

function ChangePassword() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (pw !== pw2) { setErr("Passwords don't match."); return; }
    const t = getToken();
    if (!t) return;
    setState("saving");
    const res = await auth.changePassword({ newPassword: pw, confirmPassword: pw2 }, t);
    const failure = apiError(res, "Couldn't update your password. Try again.");
    if (failure) { setState("error"); setErr(failure); } else { setState("saved"); setPw(""); setPw2(""); }
  }

  return (
    <Section title="Change password">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="New password" value={pw} on={(e) => setPw(e.target.value)} type="password" />
        <Field label="Confirm password" value={pw2} on={(e) => setPw2(e.target.value)} type="password" />
        {err && <p className="text-sm font-medium text-live sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2">
          <SaveButton state={state} label="Update password" savedLabel="Updated" />
        </div>
      </form>
    </Section>
  );
}

function Field({ label, value, on, type = "text" }: { label: string; value: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input type={type} value={value} onChange={on} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
    </label>
  );
}

function SaveButton({ state, label, savedLabel }: { state: "idle" | "saving" | "saved" | "error"; label: string; savedLabel: string }) {
  return (
    <button type="submit" disabled={state === "saving"} className="btn-ink inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-70">
      {state === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "saved" ? <Check className="h-4 w-4" /> : null}
      {state === "saved" ? savedLabel : state === "error" ? "Try again" : label}
    </button>
  );
}
