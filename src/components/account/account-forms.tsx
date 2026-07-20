"use client";

import { useState } from "react";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { users, auth } from "@/lib/api";
import { getToken, type SessionUser } from "@/lib/client-auth";

export function AccountForms({ user }: { user: SessionUser | null }) {
  return (
    <div className="card rounded-[1.75rem] p-3">
      <EditProfile user={user} />
      <div className="mx-4 h-px bg-hairline" />
      <ChangePassword />
    </div>
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
  const [f, setF] = useState({
    username: (user?.username as string) ?? "",
    email: (user?.email as string) ?? "",
    gender: (user?.gender as string) ?? "",
  });
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const t = getToken();
    if (!t) return;
    setState("saving");
    const res = await users.updateProfile(f, t);
    setState(res ? "saved" : "error");
  }

  return (
    <Section title="Edit profile">
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
        <Field label="Username" value={f.username} on={set("username")} />
        <Field label="Email" value={f.email} on={set("email")} type="email" />
        <label className="block">
          <span className="text-[12px] font-medium text-muted">Gender</span>
          <select value={f.gender} onChange={set("gender")} className="mt-1 h-11 w-full rounded-xl border border-hairline bg-surface-2 px-3 text-[15px] text-ink focus:border-ink focus:outline-none">
            <option value="">Prefer not to say</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <SaveButton state={state} label="Save changes" savedLabel="Saved" />
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
    if (res) { setState("saved"); setPw(""); setPw2(""); } else setState("error");
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
