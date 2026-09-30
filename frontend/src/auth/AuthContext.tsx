import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "../firebase";
import { CurrentUser, UserRole } from "../shared/types";

interface AuthContextType {
  currentUser: CurrentUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const tokenResult = await fbUser.getIdTokenResult(true);
          const role = (tokenResult.claims.role as UserRole) || "user";
          const orgId = (tokenResult.claims.orgId as string) || "demo-org";

          setCurrentUser({
            uid: fbUser.uid,
            email: fbUser.email || "",
            name: fbUser.displayName || fbUser.email?.split("@")[0] || "User",
            role: role,
            orgId: orgId,
          });
        } catch (error) {
          console.error("Failed to decode token claims:", error);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const tokenResult = await cred.user.getIdTokenResult(true);
    const role = (tokenResult.claims.role as UserRole) || "user";
    const orgId = (tokenResult.claims.orgId as string) || "demo-org";

    setCurrentUser({
      uid: cred.user.uid,
      email: cred.user.email || "",
      name: cred.user.displayName || cred.user.email?.split("@")[0] || "User",
      role: role,
      orgId: orgId,
    });
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
