"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@/app/types";

type AuthFormModalProps = {
  mode: "login" | "register";
  onModeChange: (mode: "login" | "register") => void;
  onClose: () => void;
  onAuthenticated: (user: User) => void;
};

export function AuthFormModal({
  mode,
  onModeChange,
  onClose,
  onAuthenticated,
}: AuthFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        isRegister ? "/api/users" : "/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
          }),
        },
      );
      if (!response.ok) {
        if (response.status === 409) {
          throw new Error("An account with this email already exists.");
        }
        if (response.status === 401) {
          throw new Error("Invalid email or password.");
        }
        if (response.status === 400) {
          throw new Error(
            "Enter a valid email and a password of at least 8 characters.",
          );
        }
        throw new Error("Unable to sign in. Please try again.");
      }
      onAuthenticated(await response.json());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Request failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="auth-form-title"
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto border border-zinc-300 bg-white p-6 text-zinc-900 backdrop:bg-black/50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
    >
      <form onSubmit={handleSubmit}>
        <h2 id="auth-form-title" className="text-lg font-semibold">
          {isRegister ? "Register" : "Sign in"}
        </h2>
        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm">
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              disabled={isSubmitting}
              className="h-10 border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Password
            <input
              name="password"
              type="password"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={8}
              required
              disabled={isSubmitting}
              className="h-10 border border-zinc-300 bg-transparent px-2 dark:border-zinc-700"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="border border-zinc-300 px-4 py-2 dark:border-zinc-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {isRegister ? "Register" : "Sign in"}
          </button>
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          className="mt-4 text-sm underline"
          onClick={() => onModeChange(isRegister ? "login" : "register")}
        >
          {isRegister
            ? "Already have an account? Sign in"
            : "Create an account"}
        </button>
      </form>
    </dialog>
  );
}
