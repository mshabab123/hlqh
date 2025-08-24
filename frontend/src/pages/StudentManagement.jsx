import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineEye, AiOutlineCheck, AiOutlineClose, AiOutlineUser, AiOutlineWarning } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const StudentForm = ({ student, onSubmit, onCancel, isEditing = false, onStudentChange, schools, classes }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل بيانات الطالب" : "إضافة طالب جديد"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهوية *</label>
            <input
              type="text"
              value={student.id || ""}
              onChange={(e) => onStudentChange({...student, id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength="10"
              pattern="[0-9]{10}"
              placeholder="1234567890"
              required
              disabled={isEditing}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              value={student.email || ""}
              onChange={(e) => onStudentChange({...student, email: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">الاسم الأول *</label>
            <input
              type="text"
              value={student.first_name || ""}
              onChange={(e) => onStudentChange({...student, first_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم الأب *</label>
            <input
              type="text"
              value={student.second_name || ""}
              onChange={(e) => onStudentChange({...student, second_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الجد *</label>
            <input
              type="text"
              value={student.third_name || ""}
              onChange={(e) => onStudentChange({...student, third_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">اسم العائلة *</label>
            <input
              type="text"
              value={student.last_name || ""}
              onChange={(e) => onStudentChange({...student, last_name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">رقم الهاتف</label>
            <input
              type="text"
              value={student.phone || ""}
              onChange={(e) => onStudentChange({...student, phone: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              pattern="^05[0-9]{8}$"
              placeholder="05xxxxxxxx"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">تاريخ الميلاد</label>
            <input
              type="date"
              value={student.date_of_birth || ""}
              onChange={(e) => onStudentChange({...student, date_of_birth: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">العنوان</label>
            <input
              type="text"
              value={student.address || ""}
              onChange={(e) => onStudentChange({...student, address: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">المستوى الدراسي *</label>
            <select
              value={student.school_level || ""}
              onChange={(e) => onStudentChange({...student, school_level: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر المستوى</option>
              <option value="ابتدائي">ابتدائي</option>
              <option value="متوسط">متوسط</option>
              <option value="ثانوي">ثانوي</option>
              <option value="جامعي">جامعي</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات</label>
            <select
              value={student.school_id || ""}
              onChange={(e) => onStudentChange({...student, school_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر مجمع الحلقات</option>
              {schools && schools.map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الحلقة</label>
            <select
              value={student.class_id || ""}
              onChange={(e) => onStudentChange({...student, class_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر الحلقة</option>
              {classes && classes
                .filter(cls => !student.school_id || cls.school_id == student.school_id)
                .map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))
              }
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">ملاحظات</label>
          <textarea
            value={student.notes || ""}
            onChange={(e) => onStudentChange({...student, notes: e.target.value})}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
          />
        </div>
        
        <div className="flex gap-2 pt-4">
          <button
            type="submit"
            className="bg-[var(--color-primary-700)] text-white px-6 py-2 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors"
          >
            {isEditing ? "تحديث" : "إضافة"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  </div>
);

const StudentCard = ({ student, onView, onEdit, onToggleStatus }) => {
  const hasSchoolAssignment = student.school_id;
  
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-[var(--color-primary-100)] p-3 rounded-full">
            <AiOutlineUser className="text-[var(--color-primary-700)] text-xl" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-gray-800">
              {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </h3>
            <p className="text-sm text-gray-600">رقم الهوية: {student.id}</p>
            <p className="text-sm text-gray-600">المستوى: {student.school_level}</p>
            
            {!hasSchoolAssignment && (
              <div className="flex items-center gap-1 mt-1 text-orange-600">
                <AiOutlineWarning className="text-sm" />
                <span className="text-xs">               لا يسمح بتنشيط حساب الطالب لان الطالب غير مسجل في مجمع حلقات، لتسجيل الطالب يجب الدخول على تعديل ومن ثم تعديل بينات الطالب وتعيينه في مجمع حلقات وبعد ذلك اضغط على تفعيل لتنشيط الحساب.</span>
              </div>
            )}
          </div>
        </div>
      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
        student.status === 'active' 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      }`}>
        {student.status === 'active' ? 'نشط' : 'غير نشط'}
      </div>
    </div>
    
    <div className="space-y-2 text-sm text-gray-600 mb-4">
      {student.email && <p>البريد: {student.email}</p>}
      {student.phone && <p>الهاتف: {student.phone}</p>}
      {student.school_name && <p>مجمع الحلقات: {student.school_name}</p>}
      {student.class_name && <p>الحلقة: {student.class_name}</p>}
      {student.enrollment_date && (
        <p>تاريخ التسجيل: {new Date(student.enrollment_date).toLocaleDateString('ar-SA')}</p>
      )}
    </div>
    
    <div className="flex gap-2">
      <button
        onClick={() => onView(student)}
        className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
      >
        <AiOutlineEye /> عرض
      </button>
      <button
        onClick={() => onEdit(student)}
        className="flex-1 bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
      >
        <AiOutlineEdit /> تعديل
      </button>
      <button
        onClick={() => onToggleStatus(student)}
        disabled={student.status !== 'active' && !hasSchoolAssignment}
        className={`flex-1 py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
          student.status === 'active' 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : hasSchoolAssignment
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-gray-400 cursor-not-allowed text-white'
        }`}
        title={student.status !== 'active' && !hasSchoolAssignment 
          ? 'يجب تعيين الطالب إلى مدرسة أولاً' 
          : ''
        }
      >
        {student.status === 'active' ? (
          <><AiOutlineClose /> إلغاء تفعيل</>
        ) : hasSchoolAssignment ? (
          <><AiOutlineCheck /> تفعيل</>
        ) : (
          <><AiOutlineWarning /> تفعيل</>
        )}
      </button>
    </div>
  </div>
  );
};

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  
  const [currentStudent, setCurrentStudent] = useState({
    id: "",
    first_name: "",
    second_name: "",
    third_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    date_of_birth: "",
    school_level: "",
    school_id: "",
    class_id: "",
    status: "active",
    notes: ""
  });

  useEffect(() => {
    fetchStudents();
    fetchSchools();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/students`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setStudents(Array.isArray(response.data) ? response.data : []);
      setError(null);
    } catch (err) {
      setError("حدث خطأ في تحميل بيانات الطلاب");
      console.error("Error fetching students:", err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setSchools(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching schools:", err);
      setSchools([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error fetching classes:", err);
      setClasses([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare clean data
      const studentData = {
        first_name: currentStudent.first_name,
        second_name: currentStudent.second_name,
        third_name: currentStudent.third_name,
        last_name: currentStudent.last_name,
        school_level: currentStudent.school_level,
        status: currentStudent.status || 'active'
      };
      
      // Add ID for new students
      if (!editingStudent) {
        studentData.id = currentStudent.id;
      }
      
      // Only include optional fields if they have values
      if (currentStudent.email && currentStudent.email.trim()) {
        studentData.email = currentStudent.email.trim();
      }
      if (currentStudent.phone && currentStudent.phone.trim()) {
        studentData.phone = currentStudent.phone.trim();
      }
      if (currentStudent.address && currentStudent.address.trim()) {
        studentData.address = currentStudent.address.trim();
      }
      if (currentStudent.date_of_birth && currentStudent.date_of_birth.trim()) {
        studentData.date_of_birth = currentStudent.date_of_birth;
      }
      if (currentStudent.notes && currentStudent.notes.trim()) {
        studentData.notes = currentStudent.notes.trim();
      }
      if (currentStudent.school_id) {
        studentData.school_id = currentStudent.school_id;
      }
      if (currentStudent.class_id) {
        studentData.class_id = currentStudent.class_id;
      }
      
      if (editingStudent) {
        await axios.put(`${API_BASE}/api/students/${editingStudent.id}`, studentData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      } else {
        await axios.post(`${API_BASE}/api/students/manage`, studentData, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
      }
      
      setShowForm(false);
      setEditingStudent(null);
      setCurrentStudent({
        id: "",
        first_name: "",
        second_name: "",
        third_name: "",
        last_name: "",
        email: "",
        phone: "",
        address: "",
        date_of_birth: "",
        school_level: "",
        school_id: "",
        class_id: "",
        status: "active",
        notes: ""
      });
      fetchStudents();
    } catch (err) {
      setError("حدث خطأ في حفظ بيانات الطالب");
      console.error("Error saving student:", err);
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    // Format the date properly for the input field
    const formattedStudent = {
      ...student,
      date_of_birth: student.date_of_birth ? 
        new Date(student.date_of_birth).toISOString().split('T')[0] : "",
      email: student.email || "",
      phone: student.phone || "",
      address: student.address || "",
      notes: student.notes || ""
    };
    setCurrentStudent(formattedStudent);
    setShowForm(true);
  };

  const handleView = (student) => {
    setSelectedStudent(student);
    setShowDetails(true);
  };

  const handleToggleStatus = async (student) => {
    try {
      const newStatus = student.status === 'active' ? 'suspended' : 'active';
      
      // Check if trying to activate student without school assignment
      if (newStatus === 'active' && !student.school_id) {
        alert("يجب أولاً تسجيل الطالب في مدرسة قبل تفعيل حسابه. يرجى تعديل بيانات الطالب وتحديد المدرسة.");
        return;
      }
      
      // Confirm deactivation
      if (newStatus === 'suspended') {
        const confirmed = window.confirm(
          `هل أنت متأكد من تعليق حساب الطالب "${student.first_name} ${student.last_name}"؟\n` +
          `سيتم منع الطالب من الوصول للمنصة حتى يتم تفعيل حسابه مرة أخرى.`
        );
        if (!confirmed) return;
      }
      
      // Only send the fields needed for update
      const updateData = {
        first_name: student.first_name,
        second_name: student.second_name,
        third_name: student.third_name,
        last_name: student.last_name,
        school_level: student.school_level,
        status: newStatus
      };
      
      // Only include optional fields if they have values
      if (student.email && student.email.trim()) updateData.email = student.email;
      if (student.phone && student.phone.trim()) updateData.phone = student.phone;
      if (student.address && student.address.trim()) updateData.address = student.address;
      if (student.date_of_birth) updateData.date_of_birth = student.date_of_birth;
      if (student.notes && student.notes.trim()) updateData.notes = student.notes;
      if (student.class_id) updateData.class_id = student.class_id;
      
      await axios.put(`${API_BASE}/api/students/${student.id}`, 
        updateData, 
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      fetchStudents();
    } catch (err) {
      setError("حدث خطأ في تغيير حالة الطالب");
      console.error("Error toggling student status:", err);
      console.error("Response data:", err.response?.data);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.id?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesSchool = schoolFilter === "all" || student.school_id == schoolFilter;
    
    return matchesSearch && matchesStatus && matchesSchool;
  });

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">إدارة الطلاب</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[var(--color-primary-700)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors flex items-center gap-2"
          >
            <AiOutlinePlus /> إضافة طالب جديد
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">البحث</label>
              <input
                type="text"
                placeholder="البحث بالاسم أو رقم الهوية..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">الحالة</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع الحالات</option>
                <option value="active">نشط</option>
                <option value="suspended">معلق</option>
                <option value="graduated">متخرج</option>
                <option value="withdrawn">منسحب</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">مجمع الحلقات</label>
              <select
                value={schoolFilter}
                onChange={(e) => setSchoolFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">جميع مجمعات الحلقات</option>
                {schools && schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                إجمالي الطلاب: {filteredStudents.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onView={handleView}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
            />
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">لا توجد طلاب مطابقون لمعايير البحث</p>
          </div>
        )}

        {showForm && (
          <StudentForm
            student={currentStudent}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingStudent(null);
              setCurrentStudent({
                id: "",
                first_name: "",
                second_name: "",
                third_name: "",
                last_name: "",
                email: "",
                phone: "",
                address: "",
                date_of_birth: "",
                school_level: "",
                school_id: "",
                class_id: "",
                status: "active",
                notes: ""
              });
            }}
            isEditing={!!editingStudent}
            onStudentChange={setCurrentStudent}
            schools={schools}
            classes={classes}
          />
        )}

        {showDetails && selectedStudent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4">
              <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
                تفاصيل الطالب
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>الاسم الكامل:</strong>
                    <p>{selectedStudent.first_name} {selectedStudent.second_name} {selectedStudent.third_name} {selectedStudent.last_name}</p>
                  </div>
                  <div>
                    <strong>رقم الهوية:</strong>
                    <p>{selectedStudent.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>البريد الإلكتروني:</strong>
                    <p>{selectedStudent.email || "غير محدد"}</p>
                  </div>
                  <div>
                    <strong>الهاتف:</strong>
                    <p>{selectedStudent.phone || "غير محدد"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>المستوى الدراسي:</strong>
                    <p>{selectedStudent.school_level}</p>
                  </div>
                  <div>
                    <strong>الحالة:</strong>
                    <p>{selectedStudent.status === 'active' ? 'نشط' : 'غير نشط'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <strong>مجمع الحلقات:</strong>
                    <p>{selectedStudent.school_name || "غير محدد"}</p>
                  </div>
                  <div>
                    <strong>الحلقة:</strong>
                    <p>{selectedStudent.class_name || "غير محدد"}</p>
                  </div>
                </div>

                {selectedStudent.address && (
                  <div>
                    <strong>العنوان:</strong>
                    <p>{selectedStudent.address}</p>
                  </div>
                )}

                {selectedStudent.notes && (
                  <div>
                    <strong>الملاحظات:</strong>
                    <p>{selectedStudent.notes}</p>
                  </div>
                )}

                {selectedStudent.enrollment_date && (
                  <div>
                    <strong>تاريخ التسجيل:</strong>
                    <p>{new Date(selectedStudent.enrollment_date).toLocaleDateString('ar-SA')}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => setShowDetails(false)}
                  className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}