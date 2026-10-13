// frontend/src/components/ui/Badge.jsx
const tones = {
  green: "bg-emerald-100 text-emerald-800",
  gray: "bg-slate-200 text-slate-700",
  blue: "bg-blue-100 text-blue-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
};
export default function Badge({ tone = "gray", children }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
