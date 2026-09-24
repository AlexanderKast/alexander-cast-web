import {
  Activity,
  ChartLine,
  Clock,
  CodeXml,
  FileText,
  KeyRound,
  Layers,
  Plug,
  ScanSearch,
  ShieldCheck,
  Timer,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { ProblemIcon, ResultIcon, StepIcon } from "@/content/imt";

export const PROBLEM_ICONS: Record<ProblemIcon, LucideIcon> = {
  clock: Clock,
  scattered: Layers,
  person: UserRound,
  quote: FileText,
};

export const STEP_ICONS: Record<StepIcon, LucideIcon> = {
  diagnose: ScanSearch,
  build: CodeXml,
  operate: Activity,
};

export const RESULT_ICONS: Record<ResultIcon, LucideIcon> = {
  hours: Timer,
  errors: ShieldCheck,
  realtime: ChartLine,
  connected: Plug,
  scale: TrendingUp,
  ownership: KeyRound,
};
