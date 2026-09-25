import { RouteTransition } from "@/components/imt/ui/RouteTransition";

/** Re-mounted by Next on every navigation inside the public site. */
export default function PublicTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
