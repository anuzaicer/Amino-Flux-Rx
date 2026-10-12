import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";

export type Gender = "men" | "women";

const STORAGE_KEY = "amino-flux-gender";

type GenderContextValue = {
  gender: Gender | null;
  /** Falls back to "men" styling before a choice is made. */
  theme: Gender;
  hydrated: boolean;
  /** True once signed in — gender comes from the account profile and cannot be switched. */
  locked: boolean;
  setGender: (g: Gender) => void;
  clearGender: () => void;
  /** Whether the two-portrait care-path chooser is showing. */
  gateOpen: boolean;
  openGate: () => void;
  closeGate: () => void;
};

const GenderContext = createContext<GenderContextValue | null>(null);

export function GenderProvider({ children }: { children: ReactNode }) {
  const [gender, setGenderState] = useState<Gender | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "men" || stored === "women") setGenderState(stored);
    } catch {
      /* storage unavailable */
    }
    setHydrated(true);
  }, []);

  // When signed in, the profile's gender preference wins and the switch locks.
  useEffect(() => {
    const syncProfileGender = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("gender_preference")
        .eq("id", userId)
        .maybeSingle();
      const pref = data?.gender_preference;
      if (pref === "men" || pref === "women") {
        setGenderState(pref);
        setLocked(true);
        setGateOpen(false);
        try {
          window.localStorage.setItem(STORAGE_KEY, pref);
        } catch {
          /* storage unavailable */
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        void syncProfileGender(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setLocked(false);
      }
    });

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) void syncProfileGender(data.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const closeGate = useCallback(() => setGateOpen(false), []);

  const setGender = useCallback((g: Gender) => {
    setGenderState(g);
    setGateOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, g);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const clearGender = useCallback(() => {
    setGenderState(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const value = useMemo<GenderContextValue>(
    () => ({
      gender,
      theme: gender ?? "men",
      hydrated,
      locked,
      setGender,
      clearGender,
      gateOpen: gateOpen && !locked,
      openGate: locked ? () => {} : () => setGateOpen(true),
      closeGate,
    }),
    [gender, hydrated, locked, setGender, clearGender, gateOpen, closeGate],
  );

  return <GenderContext.Provider value={value}>{children}</GenderContext.Provider>;
}

export function useGender() {
  const ctx = useContext(GenderContext);
  if (!ctx) {
    return {
      gender: null,
      theme: "men" as Gender,
      hydrated: false,
      locked: false,
      setGender: () => {},
      clearGender: () => {},
      gateOpen: false,
      openGate: () => {},
      closeGate: () => {},
    } satisfies GenderContextValue;
  }
  return ctx;
}

export const GENDER_THEME = {
  men: {
    label: "Men",
    bg: "#2173D1",
    accent: "#5C9330",
    accentHover: "#5F9A2E",
    bgHover: "#1A5BB5",
  },
  women: {
    label: "Women",
    bg: "#5C9330",
    accent: "#2173D1",
    accentHover: "#1A5BB5",
    bgHover: "#5F9A2E",
  },
} as const;
