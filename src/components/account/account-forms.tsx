"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronDown, Trash2, Camera } from "lucide-react";
import Image from "next/image";
import { shrinkImage } from "@/lib/shrink-image";
import { users, auth, apiError } from "@/lib/api";
import { getToken, USERNAME_MAX, type SessionUser } from "@/lib/client-auth";
import { useAuth } from "@/components/auth/auth-provider";

export function AccountForms({ user }: { user: SessionUser | null }) {
  return (
    <div className="card rounded-[1.75rem] p-3">
      <ProfilePhoto user={user} />
      <div className="mx-4 h-px bg-hairline" />
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
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const PHRASE = "DELETE MY ACCOUNT";

  async function remove(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setBusy(true); setErr(null);
    const res = await auth.deleteAccount({ password, confirmDelete: confirm.trim() }, t);
    setBusy(false);
    // e.g. "Invalid credentials. Account deletion failed."
    const failure = apiError(res, "Couldn't delete your account. Try again or contact support.");
    if (failure) return setErr(failure);
    logout(); router.push("/"); router.refresh();
  }

  return (
    <Section title="Delete account">
      <p className="text-[15px] text-muted">
        This permanently deletes your account, orders history and saved items. It can&apos;t be undone.
      </p>
      <form onSubmit={remove}>
      <label className="mt-3 block">
        <span className="text-[12px] font-medium text-muted">Your password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 h-11 w-full max-w-xs rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[12px] font-medium text-muted">Type {PHRASE} to confirm</span>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="mt-1 h-11 w-full max-w-xs rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none"
        />
      </label>
      {err && <p role="alert" className="mt-2 text-sm font-medium text-live">{err}</p>}
      <button
        disabled={confirm.trim() !== PHRASE || !password || busy}
        className="mt-3 inline-flex items-center gap-2 rounded-full border border-live px-5 py-2.5 text-sm font-semibold text-live transition-colors hover:bg-live/5 disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete my account
      </button>
      </form>
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
    // The server stores Male | Female | Other; normalise in case an older record differs in case.
    gender: ((user?.gender as string) ?? "").replace(/^./, (c) => c.toUpperCase()).replace(/(?<=.)./g, (c) => c.toLowerCase()),
    phone: (user?.phone as string) ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // When the email changes, the backend emails a code and asks us to verify it
  // before the change applies. Collect that code here.
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpFor, setOtpFor] = useState<"email" | "phone">("email");
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setState("saving");
    setMsg(null);
    const phone = f.phone.replace(/\D/g, "");
    const phoneChanged = phone !== ((user?.phone as string) ?? "");
    if (phoneChanged && phone.length !== 10) { setState("error"); setMsg("Enter a valid 10-digit mobile number."); return; }
    // The server reads a new number from `mobileNumber` (not `phone`) and texts it a code.
    const body = {
      username: f.username, email: f.email, gender: f.gender,
      ...(phoneChanged ? { mobileNumber: phone, countryCode: (user?.countryCode as string) ?? "+91" } : {}),
      ...(otpRequired && otp ? { otp: otp.trim() } : {}),
    };
    const res = await users.updateProfile(body, t);

    if (!res) { setState("error"); return; }
    // New email or phone: the server sent a code and wants it before applying the change.
    if (res.action === "verify-email-otp" || res.action === "verify-phone-otp") {
      setOtpFor(res.action === "verify-phone-otp" ? "phone" : "email");
      setOtpRequired(true);
      setMsg(res.message ?? "We sent you a code. Enter it to confirm.");
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
        <Field label="Username" value={f.username} on={set("username")} maxLength={USERNAME_MAX} />
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
        <Field
          label="Mobile number"
          value={f.phone}
          on={(e) => { set("phone")(e); if (otpRequired) { setOtpRequired(false); setOtp(""); setMsg(null); } }}
          type="tel"
        />
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Gender</span>
          <select value={f.gender} onChange={set("gender")} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
            <option value="">Prefer not to say</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </label>

        {otpRequired && (
          <div className="sm:col-span-2">
            <Field
              label={`Verification code (sent to ${otpFor === "phone" ? f.phone : f.email})`}
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

/** Profile photo (the app's camera / gallery picker): upload or remove. */
function ProfilePhoto({ user }: { user: SessionUser | null }) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [url, setUrl] = useState<string | undefined>(user?.profilePic?.url);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send(form: FormData) {
    const t = getToken();
    if (!t) return;
    setBusy(true); setErr(null);
    const res = await fetch("/api/v1/user/profile-update", { method: "PUT", headers: { Authorization: `Bearer ${t}` }, body: form })
      .then((r) => r.json()).catch(() => null);
    setBusy(false);
    const failure = apiError(res, "Couldn't update your photo. Try a smaller image.");
    if (failure) return setErr(failure);
    const next = (res?.user as SessionUser | undefined)?.profilePic?.url;
    setUrl(next);
    if (user) setUser({ ...user, profilePic: next ? { url: next } : undefined });
    router.refresh();
  }

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const small = await shrinkImage(file);
    // The server takes images up to 5 MB.
    if (small.size > 5 * 1024 * 1024) return setErr("That photo is too large. Pick one under 5 MB.");
    const form = new FormData();
    form.append("profilePic", small);
    send(form);
  }

  function remove() {
    const form = new FormData();
    form.append("removeProfilePic", "true");
    send(form);
  }

  return (
    <Section title="Profile photo">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-xl font-semibold text-ink">
          {url ? <Image src={url} alt="Your profile photo" width={64} height={64} className="h-full w-full object-cover" /> : (user?.username?.[0] ?? "Z").toUpperCase()}
        </span>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-surface">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />} {url ? "Change photo" : "Add photo"}
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
        </label>
        {url && <button onClick={remove} disabled={busy} className="text-sm font-medium text-muted hover:text-live">Remove</button>}
      </div>
      {err && <p role="alert" className="mt-2 text-sm font-medium text-live">{err}</p>}
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

function Field({ label, value, on, type = "text", maxLength }: { label: string; value: string; on: (e: React.ChangeEvent<HTMLInputElement>) => void; type?: string; maxLength?: number }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input type={type} maxLength={maxLength} value={value} onChange={on} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3.5 text-[15px] text-ink focus:border-ink focus:outline-none" />
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
