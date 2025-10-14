"use client";

import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthBar } from "../../../components/AuthBar";
import { auth } from "../../../lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/datasets");
    } catch (authError) {
      const message = authError instanceof FirebaseError ? authError.message : "ログインに失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <AuthBar canSave={false} />
      <div className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4">
        <div className="card-surface w-full max-w-md rounded-3xl border border-white/60 bg-white/85 px-8 py-10 shadow-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Welcome back</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">ログイン</h1>
          <p className="mt-2 text-sm text-slate-500">保存したダッシュボードを確認するには、メールとパスワードでサインインしてください。</p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              <span className="mb-1 block">メールアドレス</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
              />
            </label>
            <label className="block text-sm font-medium text-slate-600">
              <span className="mb-1 block">パスワード</span>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-slate-700 shadow-sm focus:border-blue-400 focus:outline-none"
              />
            </label>
            {error && <p className="text-sm text-rose-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-full px-4 py-2 text-sm font-semibold text-white ${
                loading ? "bg-slate-300" : "bg-gradient-to-r from-blue-600 to-sky-500 shadow-lg hover:shadow-xl"
              }`}
            >
              {loading ? "処理中" : "ログイン"}
            </button>
          </form>
          <p className="mt-6 text-sm text-slate-500">
            アカウント未作成の方は {" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:text-blue-700">
              こちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
