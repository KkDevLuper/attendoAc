import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Link } from "react-router";

export default function NotFound() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-foreground"
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        404
      </p>
      <h1 className="mt-3 text-[26px] font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 max-w-xs text-center text-[13.5px] leading-relaxed text-muted-foreground">
        That page doesn't exist. Head back to your academic overview.
      </p>
      <Button asChild className="mt-6 h-11 rounded-xl">
        <Link to="/dashboard">Go to Dashboard</Link>
      </Button>
    </motion.div>
  );
}
