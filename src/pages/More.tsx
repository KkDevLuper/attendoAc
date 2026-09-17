import { AppShell, MoreMenu } from "@/components/AppShell";
import { useAuth } from "@/hooks/use-auth";

export default function More() {
  const { user } = useAuth();
  void user;
  return (
    <AppShell title="More">
      <div className="pt-1">
        <MoreMenu />
      </div>
    </AppShell>
  );
}
