"use client";

import { authClient } from "@/lib/auth-client";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: boolean;
  role: string;
  business_id: string | null;
  first_login_password_change_required: boolean;
}

export function useAuth() {
  const session = authClient.useSession();
  const user: AuthUser | null = session.data?.user
    ? {
        id: session.data.user.id,
        email: session.data.user.email,
        name: session.data.user.name,
        image: session.data.user.image,
        emailVerified: session.data.user.emailVerified,
        role: (session.data.user as any).role || "engineer",
        business_id: (session.data.user as any).business_id || null,
        first_login_password_change_required: (session.data.user as any).first_login_password_change_required || false,
      }
    : null;

  // Helper to enrich user data with app-specific fields
  const enrichUserWithAppData = async (userEmail: string): Promise<Partial<AuthUser>> => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/by-email?email=${encodeURIComponent(userEmail)}`
      );
      if (!response.ok) {
        console.warn("[useAuth] Failed to enrich user data:", response.status);
        return {};
      }
      const appUser = await response.json();
      return {
        role: appUser.role || "engineer",
        business_id: appUser.business_id || null,
        first_login_password_change_required: appUser.first_login_password_change_required || false,
      };
    } catch (err) {
      console.error("[useAuth] Error enriching user:", err);
      return {};
    }
  };

  const signIn = async (email: string, password: string) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) throw new Error(result.error.message);
    
    // Enrich user data with app-specific fields
    const appData = await enrichUserWithAppData(email);
    return {
      ...result,
      data: {
        ...result.data,
        user: {
          ...result.data?.user,
          ...appData,
        },
      },
      role: appData.role,
      business_id: appData.business_id,
      first_login_password_change_required: appData.first_login_password_change_required,
    };
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name: name || "",
    });
    if (result.error) throw new Error(result.error.message);
    
    // Enrich user data with app-specific fields
    const appData = await enrichUserWithAppData(email);
    return {
      ...result,
      data: {
        ...result.data,
        user: {
          ...result.data?.user,
          ...appData,
        },
      },
      role: appData.role,
      business_id: appData.business_id,
      first_login_password_change_required: appData.first_login_password_change_required,
    };
  };

  const signInWithGoogle = async () => {
    return authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });
  };

  const signInWithApple = async () => {
    return authClient.signIn.social({
      provider: "apple",
      callbackURL: "/",
    });
  };

  const signInWithGithub = async () => {
    return authClient.signIn.social({
      provider: "github",
      callbackURL: "/",
    });
  };

  const signOut = async () => {
    await authClient.signOut();
  };

  return {
    user,
    loading: session.isPending,
    isAuthenticated: !!session.data?.user,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signInWithGithub,
    signOut,
  };
}

export default useAuth;
