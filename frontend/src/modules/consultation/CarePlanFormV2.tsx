import { useEffect, useState } from "react";
import type { CarePlan } from "./types";

interface CarePlanFormProps {
    initialPlan?: CarePlan | null;
    onSave: (data: Partial<CarePlan>) => void;
    onCancel: () => void;
    isAdjusting?: boolean;
    loading?: boolean;
}

interface ScheduleItem {
    day_number: number;
    date: string;
    time: string;
    duration: string;
    activity: string;
}

export const CarePlanForm = ({
    initialPlan,
    onSave,
    onCancel,
    isAdjusting = false,
    loading = false,
}: CarePlanFormProps) => {
    const [assessment, setAssessment] = useState(initialPlan?.assessment || "");
    const [numDays, setNumDays] = useState<number>(0);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [escalationCriteria, setEscalationCriteria] = useState(
        initialPlan?.escalation_criteria || ""
    );
    const [note, setNote] = useState(initialPlan?.note || "");
    const [nextReviewAt, setNextReviewAt] = useState(
        initialPlan?.next_review_at ? initialPlan.next_review_at.slice(0, 16) : ""
    );

    // Initialize schedule from existing plan if available
    useEffect(() => {
        if (initialPlan?.plan_items && "treatment_schedule" in initialPlan.plan_items) {
            const existingSchedule = (initialPlan.plan_items as any)
                .treatment_schedule as ScheduleItem[];
            setSchedule(existingSchedule);
            setNumDays(existingSchedule.length); // Or calculate max day_number
        }
    }, [initialPlan]);

    const handleGenerateSchedule = () => {
        if (numDays <= 0) return;

        const newSchedule: ScheduleItem[] = [];
        // Ideally we just generate rows and let user pick dates.

        // If we are adjusting/extending, we might want to keep existing rows and append?
        // For simplicity, let's keep existing rows and add new ones if count increased.

        const currentCount = schedule.length;

        // Copy existing
        for (let i = 0; i < Math.min(currentCount, numDays); i++) {
            newSchedule.push(schedule[i]);
        }

        // Add new
        for (let i = currentCount; i < numDays; i++) {
            newSchedule.push({
                day_number: i + 1,
                date: "",
                time: "",
                duration: "",
                activity: "",
            });
        }

        setSchedule(newSchedule);
    };

    const updateScheduleItem = (index: number, field: keyof ScheduleItem, value: string) => {
        setSchedule((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const planItems = {
            treatment_schedule: schedule,
        };

        onSave({
            assessment,
            plan_items: planItems as any,
            escalation_criteria: escalationCriteria,
            note,
            next_review_at: nextReviewAt || null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">
                {isAdjusting ? "Adjust Care Plan" : "New Care Plan"}
            </h3>

            <div>
                <label className="block text-xs font-semibold text-slate-600">Assessment</label>
                <textarea
                    required
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="Patient status and needs..."
                />
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                    Treatment Schedule
                </label>
                <div className="mt-2 flex items-end gap-3">
                    <div className="flex-1">
                        <label className="text-xs text-slate-600">Total Days</label>
                        <input
                            type="number"
                            min="1"
                            max="30"
                            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            value={numDays || ""}
                            onChange={(e) => setNumDays(parseInt(e.target.value) || 0)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleGenerateSchedule}
                        className="rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                    >
                        Update Schedule Rows
                    </button>
                </div>

                {schedule.length > 0 && (
                    <div className="mt-4 space-y-3">
                        {schedule.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 rounded-lg bg-white p-2 shadow-sm border border-slate-100 items-end">
                                <div className="col-span-1 text-center">
                                    <span className="text-xs font-bold text-slate-400">Day {index + 1}</span>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-[10px] text-slate-500">Date</label>
                                    <input type="date" required className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={item.date} onChange={(e) => updateScheduleItem(index, 'date', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500">Time</label>
                                    <input type="time" required className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={item.time} onChange={(e) => updateScheduleItem(index, 'time', e.target.value)} />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-[10px] text-slate-500">Duration</label>
                                    <input type="text" required placeholder="e.g. 30min" className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={item.duration} onChange={(e) => updateScheduleItem(index, 'duration', e.target.value)} />
                                </div>
                                <div className="col-span-4">
                                    <label className="text-[10px] text-slate-500">Activity</label>
                                    <input type="text" required placeholder="Activity details" className="w-full rounded border border-slate-200 px-2 py-1 text-xs" value={item.activity} onChange={(e) => updateScheduleItem(index, 'activity', e.target.value)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                    <label className="block text-xs font-semibold text-slate-600">Next Review Date</label>
                    <input
                        type="datetime-local"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={nextReviewAt}
                        onChange={(e) => setNextReviewAt(e.target.value)}
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-600">Escalation Criteria</label>
                    <input
                        type="text"
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                        value={escalationCriteria}
                        onChange={(e) => setEscalationCriteria(e.target.value)}
                        placeholder="e.g. Temp > 39C"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-600">Notes</label>
                <textarea
                    rows={2}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Additional notes..."
                />
            </div>

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 rounded-full border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 rounded-full bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                    {loading ? "Saving..." : isAdjusting ? "Save Adjustment" : "Create Plan"}
                </button>
            </div>
        </form>
    );
};
