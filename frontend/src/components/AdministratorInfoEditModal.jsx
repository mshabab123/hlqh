import { useEffect, useState } from "react";
import axios from "axios";
import { AiOutlineClose, AiOutlineEdit, AiOutlineSave } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Unified "view + edit" administrator modal — same pattern as the student and
// teacher modals: everything shown grouped, each group has its own تعديل
// button and saves only its own fields.

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const inputClass =
  "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

const ROLE_LABELS = {
  admin: "مدير عام",
  administrator: "مدير مجمع",
  supervisor: "مشرف",
};

function Field({ label, children, full = false }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ReadValue({ value }) {
  return <p className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 min-h-10">{value || "غير محدد"}</p>;
}

function GroupCard({ title, editing, saving, onEdit, onCancel, onSave, children }) {
  return (
    <div className={`rounded-xl border p-4 ${editing ? "border-teal-300 bg-teal-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-800">{title}</h4>
        {editing ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1"
            >
              <AiOutlineSave /> {saving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="px-3 py-1.5 text-sm rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50 flex items-center gap-1"
          >
            <AiOutlineEdit /> تعديل
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export default function AdministratorInfoEditModal({ administrator, onClose, onUpdated }) {
  const [data, setData] = useState(administrator);
  const [editingGroup, setEditingGroup] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setData(administrator);
  }, [administrator]);

  const userId = data.id || data.user_id;

  const startEdit = (group, fields) => {
    setError("");
    setSuccess("");
    setEditingGroup(group);
    setDraft(fields);
  };

  const cancelEdit = () => {
    setEditingGroup(null);
    setDraft({});
  };

  const finishSave = (merged) => {
    setData((prev) => ({ ...prev, ...merged }));
    setEditingGroup(null);
    setDraft({});
    setSuccess("تم حفظ التعديلات بنجاح");
    if (onUpdated) onUpdated();
  };

  const saveInfo = async (payload) => {
    try {
      setSaving(true);
      setError("");
      await axios.patch(`${API_BASE}/api/users/${userId}/info`, payload, { headers: authHeaders() });
      finishSave(payload);
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  // The job group may include a role change, which goes through the dedicated
  // role endpoint (it reassigns the role tables), plus permissions via info.
  const saveJob = async () => {
    try {
      setSaving(true);
      setError("");
      if (draft.role && draft.role !== data.role) {
        await axios.put(`${API_BASE}/api/users/${userId}`, { role: draft.role }, { headers: authHeaders() });
      }
      if (draft.permissions !== undefined && draft.permissions !== (data.permissions || "")) {
        await axios.patch(`${API_BASE}/api/users/${userId}/info`, { permissions: draft.permissions }, { headers: authHeaders() });
      }
      finishSave({ role: draft.role, permissions: draft.permissions });
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const d = (key) => (draft[key] !== undefined ? draft[key] : "");
  const setD = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-primary-700)] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-xl font-bold">عرض المعلومات وتعديلها</h3>
            <p className="text-sm text-white/80">
              {data.first_name} {data.second_name} {data.third_name} {data.last_name} — {userId}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/15" aria-label="إغلاق">
            <AiOutlineClose className="text-xl" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700">{success}</div>
          )}

          {/* البيانات الشخصية */}
          <GroupCard
            title="البيانات الشخصية"
            editing={editingGroup === "personal"}
            saving={saving}
            onEdit={() =>
              startEdit("personal", {
                first_name: data.first_name || "",
                second_name: data.second_name || "",
                third_name: data.third_name || "",
                last_name: data.last_name || "",
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveInfo(draft)}
          >
            {/* الأسماء الأربعة في صف واحد لسهولة القراءة */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Field label="الاسم الأول">
                {editingGroup === "personal" ? (
                  <input className={inputClass} value={d("first_name")} onChange={(e) => setD("first_name", e.target.value)} />
                ) : (
                  <ReadValue value={data.first_name} />
                )}
              </Field>
              <Field label="اسم الأب">
                {editingGroup === "personal" ? (
                  <input className={inputClass} value={d("second_name")} onChange={(e) => setD("second_name", e.target.value)} />
                ) : (
                  <ReadValue value={data.second_name} />
                )}
              </Field>
              <Field label="اسم الجد">
                {editingGroup === "personal" ? (
                  <input className={inputClass} value={d("third_name")} onChange={(e) => setD("third_name", e.target.value)} />
                ) : (
                  <ReadValue value={data.third_name} />
                )}
              </Field>
              <Field label="اسم العائلة">
                {editingGroup === "personal" ? (
                  <input className={inputClass} value={d("last_name")} onChange={(e) => setD("last_name", e.target.value)} />
                ) : (
                  <ReadValue value={data.last_name} />
                )}
              </Field>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رقم الهوية">
                <ReadValue value={userId} />
              </Field>
              <Field label="الحالة">
                <ReadValue value={data.is_active ? "مفعل" : "غير مفعل"} />
              </Field>
            </div>
          </GroupCard>

          {/* بيانات التواصل */}
          <GroupCard
            title="بيانات التواصل"
            editing={editingGroup === "contact"}
            saving={saving}
            onEdit={() =>
              startEdit("contact", {
                email: data.email || "",
                phone: data.phone || "",
                address: data.address || "",
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveInfo(draft)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="البريد الإلكتروني">
                {editingGroup === "contact" ? (
                  <input type="email" dir="ltr" className={inputClass} value={d("email")} onChange={(e) => setD("email", e.target.value)} />
                ) : (
                  <ReadValue value={data.email} />
                )}
              </Field>
              <Field label="رقم الجوال">
                {editingGroup === "contact" ? (
                  <input type="tel" dir="ltr" className={inputClass} value={d("phone")} onChange={(e) => setD("phone", e.target.value)} />
                ) : (
                  <ReadValue value={data.phone} />
                )}
              </Field>
              <Field label="العنوان" full>
                {editingGroup === "contact" ? (
                  <input className={inputClass} value={d("address")} onChange={(e) => setD("address", e.target.value)} />
                ) : (
                  <ReadValue value={data.address} />
                )}
              </Field>
            </div>
          </GroupCard>

          {/* البيانات الوظيفية */}
          <GroupCard
            title="البيانات الوظيفية"
            editing={editingGroup === "job"}
            saving={saving}
            onEdit={() =>
              startEdit("job", {
                role: data.role || "administrator",
                permissions: data.permissions || "",
              })
            }
            onCancel={cancelEdit}
            onSave={saveJob}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الدور الوظيفي">
                {editingGroup === "job" ? (
                  <select className={inputClass} value={d("role")} onChange={(e) => setD("role", e.target.value)}>
                    <option value="administrator">مدير مجمع</option>
                    <option value="supervisor">مشرف</option>
                    <option value="admin">مدير عام</option>
                  </select>
                ) : (
                  <ReadValue value={ROLE_LABELS[data.role] || data.role} />
                )}
              </Field>
              <Field label="الصلاحيات" full>
                {editingGroup === "job" ? (
                  <textarea
                    rows="2"
                    className={inputClass}
                    placeholder="اكتب الصلاحيات مفصولة بفاصلة"
                    value={d("permissions")}
                    onChange={(e) => setD("permissions", e.target.value)}
                  />
                ) : (
                  <ReadValue value={data.permissions} />
                )}
              </Field>
            </div>
            {editingGroup === "job" && d("role") !== data.role && (
              <p className="text-xs text-amber-700 mt-3">
                * تغيير الدور الوظيفي يعيد تعيين ارتباطات المستخدم حسب الدور الجديد.
              </p>
            )}
          </GroupCard>
        </div>
      </div>
    </div>
  );
}
