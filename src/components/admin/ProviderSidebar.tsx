import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  LogOut,
  X,
  Stethoscope,
  MessageSquare,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const PROVIDER_NAV = [
  { key: "availability", label: "Availability", icon: CalendarDays },
  { key: "appointments", label: "Lab Reviews", icon: Stethoscope },
  { key: "approvals", label: "Treatment Approvals", icon: ClipboardCheck },
  { key: "messages", label: "Messages", icon: MessageSquare },
] as const;

export type ProviderTab = (typeof PROVIDER_NAV)[number]["key"];

interface Props {
  activeTab: ProviderTab;
  onTabChange: (tab: ProviderTab) => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function ProviderSidebar({
  activeTab,
  onTabChange,
  mobileOpen,
  onMobileClose,
}: Props) {
  const navigate = useNavigate();

  const handleTabChange = (tab: ProviderTab) => {
    onTabChange(tab);
    onMobileClose?.();
  };

  const content = (
    <aside className="flex h-[100dvh] w-[min(280px,calc(100vw-24px))] flex-col border-r border-provider-border bg-provider-surface px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-provider-ink sm:px-5">
      <div className="flex shrink-0 items-center justify-between px-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-provider-accent text-provider-accent-foreground shadow-provider-soft">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <p className="font-provider-display text-[16px] font-bold leading-tight">AMINO FLUX</p>
            <p className="mt-0.5 text-[12px] font-semibold uppercase text-provider-accent">Practitioner</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onMobileClose}
          className="text-provider-muted hover:bg-provider-canvas hover:text-provider-ink lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="mt-10 flex-1 space-y-1.5 overflow-y-auto">
        <p className="mb-3 px-3 text-[12px] font-bold uppercase text-provider-muted">
          Clinical workspace
        </p>
        {PROVIDER_NAV.map((item) => {
          const isActive = activeTab === item.key;
          return (
            <Button
              key={item.key}
              type="button"
              variant="ghost"
              onClick={() => handleTabChange(item.key)}
              className={`group h-11 w-full justify-start rounded-lg px-3 text-[14px] font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-provider-accent-soft text-provider-deep shadow-provider-soft"
                  : "text-provider-muted hover:bg-provider-canvas hover:text-provider-ink"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon
                className={`h-[18px] w-[18px] shrink-0 ${isActive ? "" : "transition-transform group-hover:scale-110"}`}
              />
              <span>{item.label}</span>
            </Button>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-provider-border pt-5">

        <Button
          type="button"
          variant="ghost"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
          className="h-10 w-full justify-start rounded-lg px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Sign out</span>
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="sticky top-0 hidden h-screen lg:block">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-provider-overlay" onClick={onMobileClose} />
          <div className="relative z-10 h-full w-[min(280px,calc(100vw-24px))]">{content}</div>
        </div>
      )}
    </>
  );
}
