// frontend/src/components/ui/DataTable.jsx
// Reemplaza DataTables/jQuery: búsqueda, orden por columna y paginación en cliente.
import { useMemo, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

// columns: { key, header, value?(row), render?(row), sortable?, searchable?, className? }
export default function DataTable({
  columns,
  rows = [],
  loading,
  empty = "Sin registros",
  searchable = true,
  pageSize = 10,
  defaultSort,
  toolbar,
}) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const get = (c, r) => (c.value ? c.value(r) : r[c.key]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      columns.some(
        (c) =>
          c.searchable !== false &&
          String(get(c, r) ?? "")
            .toLowerCase()
            .includes(s),
      ),
    );
  }, [rows, q, columns]);

  const sorted = useMemo(() => {
    const c = sort && columns.find((x) => x.key === sort.key);
    if (!c) return filtered;
    return [...filtered].sort((a, b) => {
      const x = get(c, a),
        y = get(c, b);
      const d =
        typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""), "es", {
              numeric: true,
            });
      return sort.dir === "asc" ? d : -d;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const cur = Math.min(page, pages - 1);
  const slice = sorted.slice(cur * pageSize, (cur + 1) * pageSize);
  const toggle = (k) =>
    setSort((s) =>
      s?.key === k
        ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key: k, dir: "asc" },
    );

  return (
    <div>
      {(searchable || toolbar) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">{toolbar}</div>
          {searchable && (
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Buscar..."
              className="w-56 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-600 focus:outline-none"
            />
          )}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-600">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 font-semibold ${c.className ?? ""}`}
                >
                  {c.sortable === false ? (
                    c.header
                  ) : (
                    <button
                      onClick={() => toggle(c.key)}
                      className="inline-flex items-center gap-1 hover:text-brand-600"
                    >
                      {c.header}
                      {sort?.key === c.key &&
                        (sort.dir === "asc" ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        ))}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  Cargando...
                </td>
              </tr>
            ) : slice.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-8 text-center text-slate-500"
                >
                  {empty}
                </td>
              </tr>
            ) : (
              slice.map((r, i) => (
                <tr
                  key={r.id ?? r.id_vehiculo ?? r.id_tipo ?? r.id_usuario ?? i}
                  className="border-b border-slate-100 hover:bg-slate-50"
                >
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 ${c.className ?? ""}`}
                    >
                      {c.render ? c.render(r) : get(c, r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>{sorted.length} registro(s)</span>
        <div className="flex items-center gap-2">
          <button
            disabled={cur === 0}
            onClick={() => setPage(cur - 1)}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            Página {cur + 1} de {pages}
          </span>
          <button
            disabled={cur >= pages - 1}
            onClick={() => setPage(cur + 1)}
            className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
