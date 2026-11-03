import { Link } from "@tanstack/react-router";
import { APP_NAME, SUPPORT_MAILTO } from "@/lib/app-config";

// Foundation footer: the same three links in every Isaly app (privacy, terms, support).
// App-specific links should not be added here. The bottom padding keeps the links clear of the
// fixed bottom navigation.
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-lg flex-wrap items-center gap-x-4 gap-y-2 px-5 pb-28 pt-6 text-xs text-muted-foreground">
        <span>
          © {new Date().getFullYear()} Isaly · {APP_NAME}
        </span>
        <nav aria-label="Legal and support" className="flex flex-wrap gap-x-4 gap-y-2">
          <Link to="/privacy" className="hover:text-foreground hover:underline">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground hover:underline">
            Terms
          </Link>
          <a href={SUPPORT_MAILTO} className="hover:text-foreground hover:underline">
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}
