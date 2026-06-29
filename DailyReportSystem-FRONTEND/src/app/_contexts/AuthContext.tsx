"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  Dispatch,
  SetStateAction,
} from "react";
import { parseCookies, setCookie, destroyCookie } from "nookies";
import { useRouter, usePathname } from "next/navigation";
import { AuthContextType, AuthState, LoginResponse, OrganisationMembership, User } from "@/_types/auth";
import {
  getLocalOverrideLocale,
  getLocaleFromPath,
  persistLocale,
  replaceLocaleInPath,
  setLocaleCookie,
  toSupportedLocale,
} from "@/utils/localePreference";


/* ================= HELPERS ================= */

// export function mapCurrentUserResponse(res: CurrentUserResponse): User {
//   return {
//     id: res.user_id,
//     email: res.email,
//     superUser: res.super_user,
//     memberships: res.memberships.map((m) => ({
//       organizationId: m.organization_id,
//       organizationName: m.organization_name,
//       role: m.role,
//       isCurrent: m.is_current,
//       joinedAt: m.joined_at,
//       lastAccessedAt: m.last_accessed_at,
//     })),
//   };
// }

/* ================= CONTEXT ================= */

const INITIAL_STATE: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isSideBarOpen: false,
};

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

export const cookieOptions = {
  maxAge: 30 * 24 * 60 * 60,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_STATE);
  const [memberships, setMemberships] = useState<OrganisationMembership[]>([]);
  const [organisation, setOrganisation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  /* ========== LOAD FROM COOKIES ========== */
  useEffect(() => {
    const cookies = parseCookies();

    if (cookies.userData) {
      try {
        const user: User = JSON.parse(cookies.userData);

        setAuthState({
          user,
          token: cookies.token || null,
          refreshToken: cookies.refreshToken || null,
          isSideBarOpen: false,
        });

        setMemberships(user.memberships || []);
        setOrganisation(user.organisation);
      } catch (err) {
        console.error("Failed to parse user cookie", err);
      }
    }

    setIsLoading(false);
  }, []);

  // explicit toggle override > membership preferred language > current route locale.
  useEffect(() => {
    const pathLocale = getLocaleFromPath(pathname);
    if (!pathLocale) return;

    const currentMembership = memberships.find((m) => m.is_current);
    const preferredLocale = toSupportedLocale(currentMembership?.preferred_language);
    const overrideLocale = getLocalOverrideLocale();

    const resolvedLocale = overrideLocale ?? preferredLocale ?? pathLocale;

    persistLocale(resolvedLocale);
    setLocaleCookie(resolvedLocale);

    if (resolvedLocale !== pathLocale) {
      router.replace(replaceLocaleInPath(pathname, resolvedLocale));
    }
  }, [memberships, pathname, router]);

  /* ========== ACTIONS ========== */

  const setUser: Dispatch<SetStateAction<User | null>> = (value) => {
    setAuthState((prev) => ({
      ...prev,
      user: typeof value === "function" ? value(prev.user) : value,
    }));
  };

  const login = (data: LoginResponse & { user: User }) => {
    const { user, tokens, memberships, organisation } = data;

    const newState: AuthState = {
      user,
      token: tokens.access,
      refreshToken: tokens.refresh,
      isSideBarOpen: false,
    };

    setAuthState(newState);
    setMemberships(memberships);
    setOrganisation(organisation)

    setCookie(null, "userData", JSON.stringify(user), cookieOptions);
    setCookie(null, "token", tokens.access, cookieOptions);
    setCookie(null, "refreshToken", tokens.refresh, cookieOptions);
  };

  const logout = async (redirectUrl?: string) => {
    destroyCookie(null, "userData", { path: "/" });
    destroyCookie(null, "token", { path: "/" });
    destroyCookie(null, "refreshToken", { path: "/" });

    setAuthState(INITIAL_STATE);
    setMemberships([]);

    if (typeof window !== "undefined") {
      if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push(`/${pathname.split("/")[1]}/login`);
      }
    }
  };

  const contextValue: AuthContextType = {
    ...authState,
    setUser,
    memberships,
    setMemberships,
    organisation,
    setOrganisation,
    login,
    logout,
    isLoading,
   setIsSideBarOpen: (value) =>
    setAuthState((prev) => ({
      ...prev,
      isSideBarOpen:
        typeof value === "function"
          ? value(prev.isSideBarOpen)
          : value,
    })),
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

/* ================= HOOK ================= */

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a UserProvider");
  }
  return context;
};
