import { useEffect, useState } from "react";
import axios from "axios";
import { AiOutlineClose, AiOutlineEdit, AiOutlineSave, AiOutlineHistory } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Unified "view + edit" teacher modal: all information grouped, each group has
// its own تعديل button (partial saves via PUT /api/teachers/:id), plus a
// read-only history of every semester/حلقة the teacher has taught.

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const inputClass =
  "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

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

export default function TeacherInfoEditModal({ teacher, schools = [], classes = [], onClose, onUpdated }) {
  const [data, setData] = useState(teacher);
  const [editingGroup, setEditingGroup] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    setData(teacher);
  }, [teacher]);

  // Load the teaching history (all semesters/classes ever taught).
  useEffect(() => {
    if (!teacher?.id) return;
    setLoadingHistory(true);
    axios
      .get(`${API_BASE}/api/teachers/${teacher.id}/class-history`, { headers: authHeaders() })
      .then((res) => setHistory(res.data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [teacher?.id]);

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
      await axios.put(`${API_BASE}/api/teachers/${data.id}`, payload, { headers: authHeaders() });

      const derived = {};
      if (payload.school_id !== undefined) {
        derived.school_name = schools.find((s) => String(s.id) === String(payload.school_id))?.name || null;
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

  // Class assignment uses its own endpoint (replaces all assignments).
  const saveClasses = async () => {
    try {
      setSaving(true);
      setError("");
      const class_ids = draft.class_ids || [];
      await axios.post(
        `${API_BASE}/api/teachers/${data.id}/classes`,
        { class_ids },
        { headers: authHeaders() }
      );
      setData((prev) => ({ ...prev, class_ids }));
      setEditingGroup(null);
      setDraft({});
      setSuccess("تم تحديث حلقات المعلم بنجاح");
      if (onUpdated) onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || "فشل تحديث حلقات المعلم");
    } finally {
      setSaving(false);
    }
  };

  const d = (key) => (draft[key] !== undefined ? draft[key] : "");
  const setD = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));

  const currentClassIds = (data.class_ids || []).map(String);
  const assignedClassNames = classes
    .filter((c) => currentClassIds.includes(String(c.id)))
    .map((c) => `${c.name}${c.semester_name ? ` — ${c.semester_name}` : ""}`);

  // History grouped by semester for display.
  const historyBySemester = history.reduce((groups, row) => {
    const key = row.semester_name || "بدون فصل دراسي";
    (groups[key] = groups[key] || []).push(row);
    return groups;
  }, {});

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
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveGroup(draft)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <Field label="رقم الهوية">
                <ReadValue value={data.id} />
              </Field>
              <Field label="الحالة">
                <ReadValue value={data.is_active ? "نشط" : "غير نشط"} />
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
                school_id: data.school_id || "",
                specialization: data.specialization || "",
                qualifications: data.qualifications || data.actual_qualifications || "",
                can_assign_registered_students: data.can_assign_registered_students !== false,
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveGroup(draft)}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="مجمع الحلقات">
                {editingGroup === "job" ? (
                  <select className={inputClass} value={d("school_id")} onChange={(e) => setD("school_id", e.target.value)}>
                    <option value="">اختر مجمع الحلقات</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                ) : (
                  <ReadValue value={schools.find((s) => String(s.id) === String(data.school_id))?.name || data.school_name} />
                )}
              </Field>
              <Field label="التخصص">
                {editingGroup === "job" ? (
                  <input className={inputClass} value={d("specialization")} onChange={(e) => setD("specialization", e.target.value)} />
                ) : (
                  <ReadValue value={data.specialization} />
                )}
              </Field>
              <Field label="المؤهلات" full>
                {editingGroup === "job" ? (
                  <input className={inputClass} value={d("qualifications")} onChange={(e) => setD("qualifications", e.target.value)} />
                ) : (
                  <ReadValue value={data.qualifications || data.actual_qualifications} />
                )}
              </Field>
              <div className="sm:col-span-2 flex items-center gap-2">
                {editingGroup === "job" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(d("can_assign_registered_students"))}
                      onChange={(e) => setD("can_assign_registered_students", e.target.checked)}
                      className="h-4 w-4 accent-teal-600"
                    />
                    <span className="text-sm font-medium text-gray-700">السماح بإضافة الطلاب من قائمة المسجلين في الفصل</span>
                  </label>
                ) : (
                  <p className="text-sm">
                    <span className="font-medium text-gray-600">إضافة طلاب من قائمة التسجيل: </span>
                    <span className={data.can_assign_registered_students === false ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                      {data.can_assign_registered_students === false ? "غير مسموح" : "مسموح"}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </GroupCard>

          {/* الحلقات الحالية */}
          <GroupCard
            title="الحلقات الحالية"
            editing={editingGroup === "classes"}
            saving={saving}
            onEdit={() => startEdit("classes", { class_ids: currentClassIds })}
            onCancel={cancelEdit}
            onSave={saveClasses}
          >
            {editingGroup === "classes" ? (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {classes
                  .filter((c) => !data.school_id || String(c.school_id) === String(data.school_id))
                  .map((cls) => {
                    const checked = (draft.class_ids || []).includes(String(cls.id));
                    return (
                      <label key={cls.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 bg-white cursor-pointer hover:bg-teal-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const ids = new Set(draft.class_ids || []);
                            if (e.target.checked) ids.add(String(cls.id));
                            else ids.delete(String(cls.id));
                            setD("class_ids", Array.from(ids));
                          }}
                          className="h-4 w-4 accent-teal-600"
                        />
                        <span className="text-sm">
                          {cls.name}
                          {cls.semester_name && <span className="text-xs text-gray-500"> — {cls.semester_name}</span>}
                        </span>
                      </label>
                    );
                  })}
              </div>
            ) : assignedClassNames.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {assignedClassNames.map((name) => (
                  <span key={name} className="inline-block px-2.5 py-1 bg-teal-50 text-teal-800 text-xs rounded-full border border-teal-100">
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">لا يدرس أي حلقة حالياً</p>
            )}
          </GroupCard>

          {/* سجل الفصول والحلقات السابقة */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <AiOutlineHistory className="text-teal-700" />
              سجل الفصول والحلقات التي درّسها
            </h4>
            {loadingHistory ? (
              <p className="text-sm text-gray-500">جاري التحميل...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-gray-500">لا يوجد سجل تدريس بعد</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(historyBySemester).map(([semesterName, rows]) => (
                  <div key={semesterName} className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
                    <p className="font-semibold text-teal-800 text-sm mb-2">{semesterName}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {rows.map((row) => (
                        <span
                          key={`${row.semester_id}-${row.class_id}`}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border ${
                            row.is_active
                              ? "bg-green-50 text-green-800 border-green-200"
                              : "bg-gray-100 text-gray-600 border-gray-200"
                          }`}
                          title={`${row.school_name || ""} — ${row.students_count} طالب`}
                        >
                          {row.class_name}
                          <span className="font-bold">
                            {row.teacher_role === "primary" ? "· أساسي" : "· مساعد"}
                          </span>
                          <span className="text-[10px] opacity-75">({row.students_count} طالب)</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
