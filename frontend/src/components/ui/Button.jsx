// frontend/src/components/ui/Button.jsx
// Componente de UI reutilizable. Variantes definidas UNA vez => consistencia en toda la app.
const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  success: "bg-green-600 text-white hover:bg-green-700",
  danger: "bg-red-600 text-white hover:bg-red-700",
  outline: "border border-gray-300 text-gray-700 hover:bg-gray-50",
};

export default function Button({
  variant = "primary",
  loading = false,
  className = "",
  children,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition
        disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {loading && (
        <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
      )}
      {children}
    </button>
  );
}
