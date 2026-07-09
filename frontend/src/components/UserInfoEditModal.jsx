import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { AiOutlineClose, AiOutlineEdit, AiOutlineSave, AiOutlineWarning, AiOutlineSafety } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Full-control user modal for إدارة المستخدمين: every piece of the account is
// editable in grouped sections — names, contact, role, active status, password
// reset, and even the national ID itself (admin only, heavily confirmed).

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const inputClass =
  "w-full p-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white";

const ROLE_LABELS = {
  admin: "مدير عام",
  administrator: "مدير مجمع",
  supervisor: "مشرف",
  teacher: "معلم",
  parent: "ولي أمر",
  student: "طالب",
};

const SCHOOL_ROLES = ["administrator", "supervisor", "teacher"];

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

function GroupCard({ title, tone = "normal", editing, saving, onEdit, onCancel, onSave, children }) {
  const borders = editing
    ? "border-teal-300 bg-teal-50/40"
    : tone === "danger"
      ? "border-red-200 bg-red-50/30"
      : "border-gray-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 ${borders}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`font-bold ${tone === "danger" ? "text-red-800" : "text-gray-800"}`}>{title}</h4>
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
            className={`px-3 py-1.5 text-sm rounded-lg border flex items-center gap-1 ${
              tone === "danger"
                ? "border-red-200 text-red-700 hover:bg-red-50"
                : "border-teal-200 text-teal-700 hover:bg-teal-50"
            }`}
          >
            <AiOutlineEdit /> تعديل
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

export default function UserInfoEditModal({ user, schools = [], onClose, onUpdated }) {
  const [data, setData] = useState(user);
  const [editingGroup, setEditingGroup] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setData(user);
  }, [user]);

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

  const finishSave = (merged, message = "تم حفظ التعديلات بنجاح", newId = null) => {
    setData((prev) => ({ ...prev, ...merged }));
    setEditingGroup(null);
    setDraft({});
    setSuccess(message);
    if (onUpdated) onUpdated(newId || userId);
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

  // Account group: ID change / status / password — each uses its own endpoint.
  const saveAccount = async () => {
    try {
      setSaving(true);
      setError("");
      const merged = {};
      let newId = null;
      let messages = [];

      // 1) National ID change (heavily confirmed).
      const targetId = String(draft.new_id || "").trim();
      if (targetId && targetId !== String(userId)) {
        const confirmed = window.confirm(
          `⚠️ تغيير رقم الهوية من ${userId} إلى ${targetId}\n\n` +
          `سيتم نقل جميع البيانات المرتبطة (الدرجات، الحضور، التسجيلات، الشهادات، العلاقات...) إلى الرقم الجديد.\n` +
          `سيحتاج المستخدم لتسجيل الدخول بالرقم الجديد.\n\nهل أنت متأكد؟`
        );
        if (!confirmed) {
          setSaving(false);
          return;
        }
        const res = await axios.put(
          `${API_BASE}/api/user-management/users/${userId}/change-id`,
          { new_id: targetId },
          { headers: authHeaders() }
        );
        merged.id = targetId;
        newId = targetId;
        messages.push(`تم تغيير رقم الهوية (${res.data.updated_references} سجل مرتبط)`);
      }

      const effectiveId = newId || userId;

      // 2) Active status.
      if (typeof draft.is_active === "boolean" && draft.is_active !== Boolean(data.is_active)) {
        await axios.put(
          `${API_BASE}/api/user-management/users/${effectiveId}/status`,
          { is_active: draft.is_active },
          { headers: authHeaders() }
        );
        merged.is_active = draft.is_active;
        messages.push(draft.is_active ? "تم تفعيل الحساب" : "تم إيقاف الحساب");
      }

      // 3) Password reset (optional).
      if (draft.new_password) {
        if (draft.new_password.length < 10) {
          setError("كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل");
          setSaving(false);
          return;
        }
        await axios.post(
          `${API_BASE}/api/user-management/reset-password`,
          { userId: effectiveId, newPassword: draft.new_password },
          { headers: authHeaders() }
        );
        messages.push("تم تغيير كلمة المرور");
      }

      finishSave(merged, messages.length ? messages.join("، ") : "لا توجد تغييرات", newId);
    } catch (err) {
      setError(err.response?.data?.error || "فشل حفظ تعديلات الحساب");
    } finally {
      setSaving(false);
    }
  };

  // Role group.
  const saveRole = async () => {
    try {
      setSaving(true);
      setError("");
      if (draft.role && (draft.role !== data.role || String(draft.school_id || "") !== String(data.school_id || ""))) {
        const payload = { role: draft.role };
        if (SCHOOL_ROLES.includes(draft.role) && draft.school_id) {
          payload.school_id = draft.school_id;
        }
        await axios.put(
          `${API_BASE}/api/user-management/users/${userId}/role`,
          payload,
          { headers: authHeaders() }
        );
      }
      finishSave({ role: draft.role, school_id: draft.school_id });
    } catch (err) {
      setError(err.response?.data?.error || "فشل تغيير الدور");
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
            <h3 className="text-xl font-bold">التحكم الكامل بالمستخدم</h3>
            <p className="text-sm text-white/80">
              {data.first_name} {data.second_name} {data.third_name} {data.last_name} — {userId}
              <span className="mr-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{ROLE_LABELS[data.role] || data.role}</span>
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
                date_of_birth: data.date_of_birth ? new Date(data.date_of_birth).toISOString().split("T")[0] : "",
              })
            }
            onCancel={cancelEdit}
            onSave={() => saveInfo(draft)}
          >
            {/* الأسماء الأربعة في صف واحد لسهولة القراءة */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {[
                ["first_name", "الاسم الأول"],
                ["second_name", "اسم الأب"],
                ["third_name", "اسم الجد"],
                ["last_name", "اسم العائلة"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  {editingGroup === "personal" ? (
                    <input className={inputClass} value={d(key)} onChange={(e) => setD(key, e.target.value)} />
                  ) : (
                    <ReadValue value={data[key]} />
                  )}
                </Field>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="تاريخ الميلاد">
                {editingGroup === "personal" ? (
                  <input type="date" className={inputClass} value={d("date_of_birth")} onChange={(e) => setD("date_of_birth", e.target.value)} />
                ) : (
                  <ReadValue value={data.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString("ar-SA") : ""} />
                )}
              </Field>
              <Field label="تاريخ الإنشاء">
                <ReadValue value={data.created_at ? new Date(data.created_at).toLocaleDateString("ar-SA") : ""} />
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
                neighborhood: data.neighborhood || "",
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
              <Field label="الحي">
                {editingGroup === "contact" ? (
                  <input className={inputClass} value={d("neighborhood")} onChange={(e) => setD("neighborhood", e.target.value)} />
                ) : (
                  <ReadValue value={data.neighborhood} />
                )}
              </Field>
              <Field label="العنوان">
                {editingGroup === "contact" ? (
                  <input className={inputClass} value={d("address")} onChange={(e) => setD("address", e.target.value)} />
                ) : (
                  <ReadValue value={data.address} />
                )}
              </Field>
            </div>
          </GroupCard>

          {/* الملاحظات */}
          <GroupCard
            title="الملاحظات"
            editing={editingGroup === "notes"}
            saving={saving}
            onEdit={() => startEdit("notes", { notes: data.notes || "" })}
            onCancel={cancelEdit}
            onSave={() => saveInfo(draft)}
          >
            {editingGroup === "notes" ? (
              <textarea rows="3" className={inputClass} value={d("notes")} onChange={(e) => setD("notes", e.target.value)} />
            ) : (
              <ReadValue value={data.notes} />
            )}
          </GroupCard>

          {/* الدور والصلاحيات */}
          <GroupCard
            title="الدور والصلاحيات"
            editing={editingGroup === "role"}
            saving={saving}
            onEdit={() =>
              startEdit("role", {
                role: data.role || "student",
                school_id: data.school_id || "",
              })
            }
            onCancel={cancelEdit}
            onSave={saveRole}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="الدور الوظيفي">
                {editingGroup === "role" ? (
                  <select className={inputClass} value={d("role")} onChange={(e) => setD("role", e.target.value)}>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                ) : (
                  <ReadValue value={ROLE_LABELS[data.role] || data.role} />
                )}
              </Field>
              {editingGroup === "role" && SCHOOL_ROLES.includes(d("role")) && (
                <Field label="مجمع الحلقات">
                  <select className={inputClass} value={d("school_id")} onChange={(e) => setD("school_id", e.target.value)}>
                    <option value="">اختر مجمع الحلقات</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
            {editingGroup === "role" && d("role") !== data.role && (
              <p className="text-xs text-amber-700 mt-3">
                * تغيير الدور يعيد تعيين ارتباطات المستخدم (جداول الأدوار) حسب الدور الجديد.
              </p>
            )}
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
              <AiOutlineSafety />
              لصلاحيات تفصيلية لكل وظيفة استخدم صفحة
              <Link to="/feature-privileges" className="text-teal-700 font-bold hover:underline">صلاحيات الوظائف</Link>
              أو
              <Link to="/privilege-management" className="text-teal-700 font-bold hover:underline">إدارة الصلاحيات</Link>
            </p>
          </GroupCard>

          {/* الحساب — منطقة حساسة */}
          <GroupCard
            title="الحساب (منطقة حساسة)"
            tone="danger"
            editing={editingGroup === "account"}
            saving={saving}
            onEdit={() =>
              startEdit("account", {
                new_id: String(userId),
                is_active: Boolean(data.is_active),
                new_password: "",
              })
            }
            onCancel={cancelEdit}
            onSave={saveAccount}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="رقم الهوية">
                {editingGroup === "account" ? (
                  <input
                    dir="ltr"
                    className={`${inputClass} border-red-300 focus:ring-red-400`}
                    value={d("new_id")}
                    onChange={(e) => setD("new_id", e.target.value.replace(/[^0-9]/g, ""))}
                  />
                ) : (
                  <ReadValue value={userId} />
                )}
              </Field>
              <Field label="حالة الحساب">
                {editingGroup === "account" ? (
                  <select
                    className={inputClass}
                    value={d("is_active") ? "active" : "inactive"}
                    onChange={(e) => setD("is_active", e.target.value === "active")}
                  >
                    <option value="active">نشط</option>
                    <option value="inactive">موقوف</option>
                  </select>
                ) : (
                  <ReadValue value={data.is_active ? "نشط" : "موقوف"} />
                )}
              </Field>
              <Field label="كلمة مرور جديدة (اختياري — 10 أحرف على الأقل)" full>
                {editingGroup === "account" ? (
                  <input
                    type="password"
                    dir="ltr"
                    className={inputClass}
                    placeholder="اتركها فارغة لعدم التغيير"
                    value={d("new_password")}
                    onChange={(e) => setD("new_password", e.target.value)}
                  />
                ) : (
                  <ReadValue value="••••••••" />
                )}
              </Field>
            </div>
            {editingGroup === "account" && String(d("new_id")) !== String(userId) && (
              <p className="text-xs text-red-700 mt-3 flex items-center gap-1 font-bold">
                <AiOutlineWarning />
                تغيير رقم الهوية ينقل كل البيانات المرتبطة (درجات، حضور، تسجيلات، شهادات...) إلى الرقم الجديد، وسيسجل المستخدم دخوله بالرقم الجديد.
              </p>
            )}
          </GroupCard>
        </div>
      </div>
    </div>
  );
}
