// Shown to an administrator/supervisor whose account is not linked to any
// school (e.g. after being removed from one). Explains why school-scoped
// pages appear empty, instead of leaving them staring at blank screens.
export default function NoSchoolBanner() {
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }

  const scopedRole = user?.role === "administrator" || user?.role === "supervisor";
  if (!scopedRole || !user?.no_school_assigned) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="bg-amber-50 border-b border-amber-300 text-amber-900 px-4 py-3 text-center text-sm font-medium"
      role="alert"
    >
      لم يتم ربط حسابك بأي مجمع، لذا لا يمكنك الوصول إلى بيانات المجمعات. يرجى التواصل مع الإدارة لربط حسابك.
    </div>
  );
}
