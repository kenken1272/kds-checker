"use client";

import { FirebaseError } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { auth, db } from "../lib/firebase/client";
import { useAuth } from "./AuthProvider";

type AuthBarProps = {
  onSave?: () => Promise<void>;
  canSave: boolean;
  isSaving?: boolean;
  saveDisabledReason?: string | null;
};

type AuthMode = "login" | "register";

type AuthFormState = {
  email: string;
  password: string;
  orgName: string;
};

const initialFormState: AuthFormState = {
  email: "",
  password: "",
  orgName: "",
};

const navLinks = [
  { href: "/upload", label: "アップロード" },
  { href: "/datasets", label: "データセット" },
];

export const AuthBar = ({ onSave, canSave, isSaving, saveDisabledReason }: AuthBarProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, org, refreshOrg } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState<AuthFormState>(initialFormState);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const closeDialog = useCallback(() => {
    setDialogOpen(false);
    setForm(initialFormState);
    setFormError(null);
  }, []);

  const openDialog = useCallback((nextMode: AuthMode) => {
    setMode(nextMode);
    setDialogOpen(true);
  }, []);

  const handleInputChange = useCallback((key: keyof AuthFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleLogout = useCallback(async () => {
    await signOut(auth);
    router.push("/upload");
  }, [router]);

  const handleAuthSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFormError(null);
      setSubmitting(true);

      try {
        if (mode === "login") {
          await signInWithEmailAndPassword(auth, form.email, form.password);
        } else {
          if (!form.orgName.trim()) {
            setFormError("団体名を入力してください");
            setSubmitting(false);
            return;
          }

          const credential = await createUserWithEmailAndPassword(auth, form.email, form.password);
          const uid = credential.user.uid;
          const userRef = doc(db, `users/${uid}`);
          const orgRef = doc(db, `orgs/${uid}`);

          await Promise.all([
            setDoc(userRef, {
              email: form.email,
              orgName: form.orgName,
              createdAt: serverTimestamp(),
            }),
            setDoc(orgRef, {
              ownerUid: uid,
              name: form.orgName,
              createdAt: serverTimestamp(),
            }),
          ]);
          await refreshOrg();
        }

        closeDialog();
        router.push("/datasets");
      } catch (error) {
        const message = error instanceof FirebaseError ? error.message : "認証に失敗しました";
        setFormError(message);
      } finally {
        setSubmitting(false);
      }
    },
    [mode, form, router, closeDialog, refreshOrg],
  );

  const showSaveButton = Boolean(onSave);

  const saveDisabled = useMemo(() => {
    if (!showSaveButton) {
      return true;
    }
    if (isSaving) {
      return true;
    }
    if (!user) {
      return false;
    }
    return !canSave;
  }, [user, canSave, isSaving, showSaveButton]);

  const saveLabel = useMemo(() => {
    if (!showSaveButton) {
      return "";
    }
    if (isSaving) {
      return "保存中...";
    }
    if (!user) {
      return "ログインして保存";
    }
    return "分析を保存";
  }, [user, isSaving, showSaveButton]);

  const handleSaveClick = useCallback(async () => {
    if (!onSave) {
      return;
    }

    if (!user) {
      openDialog("login");
      return;
    }

    if (!canSave) {
      return;
    }

    await onSave();
  }, [user, canSave, onSave, openDialog]);

  const activeHref = useMemo(() => pathname ?? "", [pathname]);

  return (
  <header className="glass-surface relative z-40 mx-auto mb-8 mt-8 flex w-full max-w-6xl flex-col gap-4 px-5 py-4 shadow-xl sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-6">
        <div>
          <span className="soft-badge">KDS Checker</span>
          <p className="mt-1 text-sm text-slate-600">CSV 売上を即座に解析＆保存</p>
        </div>
        <nav className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = activeHref === link.href || activeHref.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-sky-500 text-white shadow-lg"
                    : "text-slate-600 hover:bg-white/70"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {org?.name && (
          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            {org.name}
          </span>
        )}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-slate-600 md:inline">{user.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              >
                ログアウト
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openDialog("login")}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
              >
                ログイン
              </button>
              <button
                type="button"
                onClick={() => openDialog("register")}
                className="rounded-full bg-gradient-to-r from-blue-600 to-sky-500 px-3 py-1.5 text-sm font-semibold text-white shadow-md transition hover:shadow-lg"
              >
                新規登録
              </button>
            </>
          )}
          {showSaveButton && (
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={saveDisabled}
              title={saveDisabledReason ?? undefined}
              className={`relative overflow-hidden rounded-full px-4 py-2 text-sm font-semibold transition ${
                saveDisabled
                  ? "cursor-not-allowed bg-slate-300 text-slate-600"
                  : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {saveLabel}
            </button>
          )}
        </div>
      </div>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="card-surface w-full max-w-md px-6 py-7">
            <h2 className="mb-4 text-lg font-semibold text-slate-800">
              {mode === "login" ? "ログイン" : "新規登録"}
            </h2>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <label className="block text-sm font-medium text-slate-600">
                <span className="mb-1 block">メールアドレス</span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => handleInputChange("email", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              <label className="block text-sm font-medium text-slate-600">
                <span className="mb-1 block">パスワード</span>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(event) => handleInputChange("password", event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                />
              </label>
              {mode === "register" && (
                <label className="block text-sm font-medium text-slate-600">
                  <span className="mb-1 block">団体名</span>
                  <input
                    type="text"
                    required
                    value={form.orgName}
                    onChange={(event) => handleInputChange("orgName", event.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
                  />
                </label>
              )}
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {mode === "login" ? "新規登録はこちら" : "ログインはこちら"}
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white ${
                      submitting
                        ? "bg-slate-300"
                        : "bg-gradient-to-r from-blue-600 to-sky-500 shadow-md hover:shadow-lg"
                    }`}
                  >
                    {submitting ? "処理中" : "送信"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
