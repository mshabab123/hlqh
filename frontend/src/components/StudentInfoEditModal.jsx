import { useEffect, useState } from "react";
import axios from "axios";
import { AiOutlineClose, AiOutlineEdit, AiOutlineSave } from "react-icons/ai";
import SchoolLevelSelect from "./SchoolLevelSelect";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Unified "view + edit" student modal: all information is shown grouped, and
// each group has its own تعديل button that unlocks just that group's fields.
// Saving a group sends only that group's fields (the students PUT endpoint
// applies partial updates).

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ReadValue({ value }) {
  return <p className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 min-h-10">{value || "غير محدد"}</p>;
}

function GroupCard({ title, editing, saving, onEdit, onCancel, onSave, children, editable = true }) {
  return (
    <div className={`rounded-xl border p-4 ${editing ? "border-teal-300 bg-teal-50/40" : "border-gray-200 bg-white"}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-gray-800">{title}</h4>
        {editable && (
          editing ? (
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
          )
        )}
      </div>
      {children}
    </div>
  );
}

const inputClass =
  "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

export default function StudentInfoEditModal({ student, schools = [], classes = [], onClose, onUpdated }) {
  // Local copy shown in the modal; refreshed after each successful save.
  const [data, setData] = useState(student);
  const [editingGroup, setEditingGroup] = useState(null); // 'personal' | 'contact' | 'academic' | 'notes'
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setData(student);
  }, [student]);

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

  const saveGroup = async (payload) => {
    try {
      setSaving(true);
      setError("");
      await axios.put(`${API_BASE}/api/students/${data.id}`, payload, { headers: authHeaders() });

      // Show the result immediately: merge the saved fields plus the display
      // names derived from them (school/class/semester) without waiting for
      // the list refetch.
      const derived = {};
      if (payload.school_id !== undefined) {
        derived.school_name = schools.find((s) => String(s.id) === String(payload.school_id))?.name || null;
      }
      if (payload.class_id !== undefined) {
        const cls = classes.find((c) => String(c.id) === String(payload.class_id));
        derived.class_name = cls?.name || null;
        derived.semester_name = cls?.semester_name || null;
      }
      setData((prev) => ({ ...prev, ...payload, ...derived }));

      setEditingGroup(null);
      setDraft({});
      setSuccess("تم حفظ التعديلات بنجاح");
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  };

  const d = (key) => (draft[key] !== undefined ? draft[key] : "");
  const setD = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const statusText = data.status === "active" ? "نشط" : "غير نشط";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-3" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--color-primary-700)] text-white px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h3 className="text-xl font-bold">عرض المعلومات وتعديلها</h3>
            <p className="text-sm text-white/80">
              {data.first_name} {data.second_name} {data.third_name} {data.last_name} — {data.id}
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
                date_of_birth: data.date_of_birth
                  ? new Date(data.date_of_birth).toISOString().split("T")[0]
                  : "",
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveGroup(draft)}
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
                <ReadValue value={data.id} />
              </Field>
              <Field label="تاريخ الميلاد">
                {editingGroup === "personal" ? (
                  <input type="date" className={inputClass} value={d("date_of_birth")} onChange={(e) => setD("date_of_birth", e.target.value)} />
                ) : (
                  <ReadValue value={data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString("ar-SA") : ""} />
                )}
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
            onSave={() => saveGroup(draft)}
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
              <div className="sm:col-span-2">
                <Field label="العنوان">
                  {editingGroup === "contact" ? (
                    <input className={inputClass} value={d("address")} onChange={(e) => setD("address", e.target.value)} />
                  ) : (
                    <ReadValue value={data.address} />
                  )}
                </Field>
              </div>
            </div>
          </GroupCard>

          {/* البيانات الدراسية */}
          <GroupCard
            title="البيانات الدراسية"
            editing={editingGroup === "academic"}
            saving={saving}
            onEdit={() =>
              startEdit("academic", {
                school_level: data.school_level || "",
                school_id: data.school_id || "",
                class_id: data.class_id || "",
                status: data.status || "inactive",
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveGroup(draft)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الصف الدراسي">
                {editingGroup === "academic" ? (
                  <SchoolLevelSelect
                    name="school_level"
                    value={d("school_level")}
                    onChange={(e) => setD("school_level", e.target.value)}
                    placeholder="اختر الصف"
                  />
                ) : (
                  <ReadValue value={data.school_level} />
                )}
              </Field>
              <Field label="الحالة">
                {editingGroup === "academic" ? (
                  <select className={inputClass} value={d("status")} onChange={(e) => setD("status", e.target.value)}>
                    <option value="active">نشط</option>
                    <option value="suspended">غير نشط</option>
                  </select>
                ) : (
                  <ReadValue value={statusText} />
                )}
              </Field>
              <Field label="مجمع الحلقات">
                {editingGroup === "academic" ? (
                  <select
                    className={inputClass}
                    value={d("school_id")}
                    onChange={(e) => setDraft((prev) => ({ ...prev, school_id: e.target.value, class_id: "" }))}
                  >
                    <option value="">اختر مجمع الحلقات</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                ) : (
                  <ReadValue value={data.school_name} />
                )}
              </Field>
              <Field label="الحلقة">
                {editingGroup === "academic" ? (
                  <select className={inputClass} value={d("class_id")} onChange={(e) => setD("class_id", e.target.value)}>
                    <option value="">لا يوجد - غير منتسب لحلقة</option>
                    {classes
                      .filter((cls) => !d("school_id") || String(cls.school_id) === String(d("school_id")))
                      .map((cls) => (
                        <option key={cls.id} value={cls.id}>
                          {cls.name}{cls.semester_name ? ` — ${cls.semester_name}` : ""}
                        </option>
                      ))}
                  </select>
                ) : (
                  <ReadValue value={data.class_name ? `${data.class_name}${data.semester_name ? ` — ${data.semester_name}` : ""}` : ""} />
                )}
              </Field>
            </div>
            {editingGroup === "academic" && (
              <p className="text-xs text-amber-700 mt-3">
                * تغيير الحلقة ينقل الطالب إليها ويُخرجه من حلقته الحالية، وتغيير الحالة إلى غير نشط يُخرجه من حلقته.
              </p>
            )}
          </GroupCard>

          {/* الملاحظات */}
          <GroupCard
            title="الملاحظات"
            editing={editingGroup === "notes"}
            saving={saving}
            onEdit={() => startEdit("notes", { notes: data.notes || "" })}
            onCancel={cancelEdit}
            onSave={() => saveGroup(draft)}
          >
            {editingGroup === "notes" ? (
              <textarea rows="3" className={inputClass} value={d("notes")} onChange={(e) => setD("notes", e.target.value)} />
            ) : (
              <ReadValue value={data.notes} />
            )}
          </GroupCard>

          {/* معلومات للعرض فقط */}
          {data.enrollment_date && (
            <p className="text-sm text-gray-500 px-1">
              تاريخ التسجيل: {new Date(data.enrollment_date).toLocaleDateString("ar-SA")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
