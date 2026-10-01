import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { app, auth } from "../firebase";
import { CurrentUser, UserRole } from "../shared/types";

const db = getFirestore(app);

interface AuthContextType {
  currentUser: CurrentUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
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

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const finalName = displayName || cred.user.email?.split("@")[0] || "User";

    await updateProfile(cred.user, { displayName: finalName });

    const userRecord = {
      uid: cred.user.uid,
      name: finalName,
      email: cred.user.email || email,
      role: "user",
      orgId: "demo-org",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDoc(
      doc(db, "organizations", "demo-org", "members", cred.user.uid),
      userRecord,
      { merge: true }
    );
    await setDoc(doc(db, "user", cred.user.uid), userRecord, { merge: true });

    const tokenResult = await cred.user.getIdTokenResult(true);
    const role = (tokenResult.claims.role as UserRole) || "user";
    const orgId = (tokenResult.claims.orgId as string) || "demo-org";

    setCurrentUser({
      uid: cred.user.uid,
      email: cred.user.email || "",
      name: finalName,
      role,
      orgId,
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
        signUp,
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
