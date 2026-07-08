import { useEffect, useState } from "react";
import axios from "../utils/axiosConfig";
import { AiOutlineSave, AiOutlineLock } from "react-icons/ai";
import { FaShieldAlt } from "react-icons/fa";

// جدول صلاحيات الوظائف: كل صف وظيفة (زر/إجراء) وتحدد الأدوار المسموح لها
// استخدامها، بالإضافة إلى مستخدمين محددين بأرقام هوياتهم.
const ROLE_LABELS = {
  admin: "مدير المنصة",
  administrator: "مدير مجمع",
  supervisor: "مشرف",
  teacher: "معلم",
  parent: "ولي أمر",
  student: "طالب",
};

// Roles shown as toggle columns (parent/student are intentionally excluded from
// staff functions but stay supported by the backend if ever needed).
const ROLE_COLUMNS = ["admin", "administrator", "supervisor", "teacher"];

export default function FeaturePrivileges() {
  const [rows, setRows] = useState([]);
  const [userNames, setUserNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingKey, setSavingKey] = useState(null);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/feature-privileges");
      const features = response.data.features || [];
      setRows(
        features.map((f) => ({
          ...f,
          allowed_roles: Array.isArray(f.allowed_roles) ? f.allowed_roles : [],
          userIdsText: (Array.isArray(f.allowed_user_ids) ? f.allowed_user_ids : []).join(", "),
        }))
      );
      setUserNames(response.data.users || {});
    } catch (err) {
      setError(err.response?.data?.error || "فشل تحميل جدول الصلاحيات");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleRole = (key, role) => {
    if (role === "admin") return; // مدير المنصة دائماً مسموح
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const has = row.allowed_roles.includes(role);
        return {
          ...row,
          allowed_roles: has
            ? row.allowed_roles.filter((r) => r !== role)
            : [...row.allowed_roles, role],
        };
      })
    );
  };

  const setUserIdsText = (key, text) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, userIdsText: text } : row)));
  };

  const saveRow = async (row) => {
    try {
      setSavingKey(row.key);
      setMessage("");
      setError("");
      const allowed_user_ids = row.userIdsText
        .split(/[,\s]+/)
        .map((id) => id.trim())
        .filter(Boolean);

      const response = await axios.put(`/api/feature-privileges/${row.key}`, {
        allowed_roles: row.allowed_roles,
        allowed_user_ids,
      });

      const unknown = response.data.unknown_user_ids || [];
      if (unknown.length > 0) {
        setError(`تم الحفظ، لكن هذه الأرقام غير موجودة وتم تجاهلها: ${unknown.join(", ")}`);
      } else {
        setMessage(`تم حفظ صلاحية "${row.label}" بنجاح`);
      }
      await load();
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ الصلاحية");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
              <FaShieldAlt className="text-xl" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">صلاحيات الوظائف</h1>
              <p className="mt-1 text-sm text-slate-500">
                حدد لكل وظيفة (زر/إجراء) الأدوار المسموح لها باستخدامها، أو امنحها لمستخدمين محددين
                بأرقام هوياتهم. مدير المنصة مسموح له دائماً.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
        )}
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">{message}</div>
        )}

        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500">جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-right">الوظيفة</th>
                  {ROLE_COLUMNS.map((role) => (
                    <th key={role} className="px-3 py-3 text-center whitespace-nowrap">{ROLE_LABELS[role]}</th>
                  ))}
                  <th className="px-4 py-3 text-right">مستخدمون محددون (أرقام الهوية)</th>
                  <th className="px-4 py-3 text-center">حفظ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.key} className="align-top">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800">{row.label}</p>
                      {row.description && <p className="mt-1 text-xs text-slate-500">{row.description}</p>}
                    </td>
                    {ROLE_COLUMNS.map((role) => (
                      <td key={role} className="px-3 py-3 text-center">
                        {role === "admin" ? (
                          <span className="inline-flex items-center gap-1 text-teal-700" title="مدير المنصة مسموح دائماً">
                            <AiOutlineLock /> ✓
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={row.allowed_roles.includes(role)}
                            onChange={() => toggleRole(row.key, role)}
                            className="h-4 w-4 accent-teal-600 cursor-pointer"
                          />
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.userIdsText}
                        onChange={(e) => setUserIdsText(row.key, e.target.value)}
                        placeholder="مثال: 1010101010, 2020202020"
                        className="w-full min-w-52 rounded-md border border-slate-300 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        dir="ltr"
                      />
                      {(row.allowed_user_ids || []).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.allowed_user_ids.map((id) => (
                            <span key={id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {userNames[String(id)]?.name || id}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => saveRow(row)}
                        disabled={savingKey === row.key}
                        className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-3 py-1.5 font-bold text-white hover:bg-teal-700 disabled:opacity-50"
                      >
                        <AiOutlineSave /> {savingKey === row.key ? "جاري..." : "حفظ"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
