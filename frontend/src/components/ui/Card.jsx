// frontend/src/components/ui/Card.jsx
export default function Card({
  title,
  icon: Icon,
  actions,
  children,
  className = "",
}) {
  return (
    <section
      className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200 ${className}`}
    >
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold text-slate-800">
            {Icon && <Icon size={18} />}
            {title}
          </h2>
          <div className="flex gap-2">{actions}</div>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}
