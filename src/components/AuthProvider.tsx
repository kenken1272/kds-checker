"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { auth, db } from "../lib/firebase/client";

type OrgInfo = {
  id: string;
  name: string;
};

type AuthContextValue = {
  user: User | null;
  org: OrgInfo | null;
  loading: boolean;
  refreshOrg: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orgLoading, setOrgLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchOrg = useCallback(async () => {
    if (!user) {
      setOrg(null);
      return;
    }

    setOrgLoading(true);
    try {
      const orgRef = doc(db, `orgs/${user.uid}`);
      const snapshot = await getDoc(orgRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (typeof data.name === "string" && data.name.trim().length > 0) {
          setOrg({ id: snapshot.id, name: data.name });
        } else {
          setOrg({ id: snapshot.id, name: "" });
        }
      } else {
        setOrg(null);
      }
    } finally {
      setOrgLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setOrg(null);
      return;
    }

    void fetchOrg();
  }, [user, fetchOrg]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      org,
      loading: authLoading || orgLoading,
      refreshOrg: fetchOrg,
    }),
    [user, org, authLoading, orgLoading, fetchOrg],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
