import { PATIENT_SUB_PAGES } from "./types";
import type { User } from "../../types/auth";

interface PatientHeaderProps {
  patientSubPage: (typeof PATIENT_SUB_PAGES)[number];
  onSubPageChange: (page: (typeof PATIENT_SUB_PAGES)[number]) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  onLogout: () => void;
  user: User | null;
}

const PatientHeader = ({
  patientSubPage,
  onSubPageChange,
  searchTerm,
  onSearchTermChange,
  sidebarCollapsed,
  onToggleSidebar,
  onLogout,
  user,
}: PatientHeaderProps) => {
  const userInitials = `${(user?.first_name?.[0] ?? "").toUpperCase()}${(user?.last_name?.[0] ?? "").toUpperCase()}`;
  const userFullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ");

  return (
    <header className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto flex max-w-screen-2xl flex-col gap-4 px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">
              Patient Management
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#111827]">Clinical workspace</h1>
            <p className="text-sm text-[#6B7280]">
              Review the queue, patient details, and clinical history without leaving context.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button
              onClick={onToggleSidebar}
              className="hidden rounded-full border border-[#E5E7EB] p-2 text-[#4B5563] hover:text-[#111827] sm:inline-flex"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              {sidebarCollapsed ? "☰" : "×"}
            </button>
            <button
              onClick={onLogout}
              className="rounded-full border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] hover:bg-[#F3F4F6]"
              type="button"
            >
              Logout
            </button>
            <div className="flex items-center gap-2 rounded-full border border-[#E5E7EB] px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#111827] text-sm font-semibold text-white">
                {userInitials || "??"}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-[#111827]">
                  {userFullName || "Clinician"}
                </p>
                <p className="text-xs text-[#4B5563]">{user?.username}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-[#E5E7EB] bg-[#F9FAFB] p-1 text-xs font-semibold text-[#4B5563] shadow-sm">
            {PATIENT_SUB_PAGES.map((sub) => (
              <button
                key={sub}
                onClick={() => onSubPageChange(sub)}
                className={`rounded-full px-4 py-1 transition ${
                  patientSubPage === sub ? "bg-white text-[#111827] shadow-subtle" : "hover:bg-white/60"
                }`}
                type="button"
              >
                {sub}
              </button>
            ))}
          </div>
          <div className="flex max-w-xl flex-1 items-center gap-3">
            <div className="flex w-full items-center gap-2 rounded-full border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2 shadow-inner">
              <input
                className="flex-1 bg-transparent text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none"
                placeholder="Search patients, admissions, or identifiers"
                value={searchTerm}
                onChange={(event) => onSearchTermChange(event.target.value)}
              />
              <span className="text-xs text-[#9CA3AF]">⌕</span>
            </div>
            <button
              onClick={onToggleSidebar}
              className="inline-flex items-center rounded-full border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] sm:hidden"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              type="button"
            >
              {sidebarCollapsed ? "☰" : "×"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PatientHeader;
