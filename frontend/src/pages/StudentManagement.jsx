import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus } from "react-icons/ai";
import StudentForm from "../components/StudentForm";
import StudentCard from "../components/StudentCard";
import QuranProgressModal from "../components/QuranProgressModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showQuranModal, setShowQuranModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [quranStudent, setQuranStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [schoolFilter, setSchoolFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  
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
    status: "inactive",
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
      setSchools(Array.isArray(response.data.schools) ? response.data.schools : []);
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
    
    // Check if we're editing a student and assigning them to a school/class for the first time
    let finalStudentData = { ...currentStudent };
    
    if (editingStudent && editingStudent.status === 'inactive' && 
        (currentStudent.school_id || currentStudent.class_id)) {
      
      // Check if this is the first time assigning to school
      const wasNotAssigned = !editingStudent.school_id && !editingStudent.class_id;
      const isBeingAssigned = currentStudent.school_id || currentStudent.class_id;
      
      if (wasNotAssigned && isBeingAssigned) {
        const shouldActivate = window.confirm(
          `هل تريد تفعيل الطالب ${currentStudent.first_name} ${currentStudent.last_name} بعد تعيينه إلى المدرسة؟\n\nإذا اخترت "موافق" سيتم تفعيل الطالب، وإذا اخترت "إلغاء" سيبقى غير مفعل.`
        );
        
        if (shouldActivate) {
          finalStudentData.status = 'active';
        }
      }
    }
    if (editingStudent && editingStudent.status === 'inactive') {
      const classChanged = currentStudent.class_id && currentStudent.class_id !== editingStudent.class_id;
      if (classChanged) {
        const shouldActivate = window.confirm("هل تريد تفعيل الطالب لتغيير الفصل؟");
        if (shouldActivate) {
          finalStudentData.status = 'active';
        }
      }
    }

    
    try {
      // Prepare clean data using finalStudentData
      const studentData = {
        first_name: finalStudentData.first_name,
        second_name: finalStudentData.second_name,
        third_name: finalStudentData.third_name,
        last_name: finalStudentData.last_name,
        school_level: finalStudentData.school_level,
        status: finalStudentData.status || 'inactive'
      };
      
      // Add ID for new students (only if it's provided and valid)
      if (!editingStudent && finalStudentData.id && finalStudentData.id.trim().length === 10) {
        studentData.id = finalStudentData.id.trim();
      }
      
      // Only include optional fields if they have values
      if (finalStudentData.email && finalStudentData.email.trim()) {
        studentData.email = finalStudentData.email.trim();
      }
      if (finalStudentData.phone && finalStudentData.phone.trim()) {
        studentData.phone = finalStudentData.phone.trim();
      }
      if (finalStudentData.address && finalStudentData.address.trim()) {
        studentData.address = finalStudentData.address.trim();
      }
      if (finalStudentData.date_of_birth && finalStudentData.date_of_birth.trim()) {
        studentData.date_of_birth = finalStudentData.date_of_birth;
      }
      if (finalStudentData.notes && finalStudentData.notes.trim()) {
        studentData.notes = finalStudentData.notes.trim();
      }
      if (finalStudentData.school_id) {
        studentData.school_id = finalStudentData.school_id;
      }
      if (finalStudentData.class_id) {
        studentData.class_id = finalStudentData.class_id;
      }
      
      // Include memorization progress fields
      if (finalStudentData.memorized_surah_id) {
        studentData.memorized_surah_id = parseInt(finalStudentData.memorized_surah_id);
      }
      if (finalStudentData.memorized_ayah_number) {
        studentData.memorized_ayah_number = parseInt(finalStudentData.memorized_ayah_number);
      }
      if (finalStudentData.target_surah_id) {
        studentData.target_surah_id = parseInt(finalStudentData.target_surah_id);
      }
      if (finalStudentData.target_ayah_number) {
        studentData.target_ayah_number = parseInt(finalStudentData.target_ayah_number);
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
        status: "inactive",
        notes: ""
      });
      fetchStudents();
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.response?.data?.details?.join(', ') || err.message || "حدث خطأ في حفظ بيانات الطالب";
      setError(errorMessage);
      console.error("Error saving student:", err);
      console.error("Response data:", err.response?.data);
      console.error("Status:", err.response?.status);
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

  const handleQuranProgress = (student) => {
    console.log('Opening Quran modal for student:', student);
    console.log('Memorization data:', {
      memorized_surah_id: student.memorized_surah_id,
      memorized_ayah_number: student.memorized_ayah_number,
      target_surah_id: student.target_surah_id,
      target_ayah_number: student.target_ayah_number
    });

    const formattedStudent = {
      ...student,
      memorized_surah_id: student.memorized_surah_id ? String(student.memorized_surah_id) : "",
      memorized_ayah_number: student.memorized_ayah_number ? String(student.memorized_ayah_number) : "",
      target_surah_id: student.target_surah_id ? String(student.target_surah_id) : "",
      target_ayah_number: student.target_ayah_number ? String(student.target_ayah_number) : ""
    };

    console.log('Formatted student for form with class info:', formattedStudent);
    setQuranStudent(formattedStudent);
    setShowQuranModal(true);
  };

  const handleQuranSubmit = async (e) => {
    e.preventDefault();
    try {
      // Prepare Qur'an data
      const quranData = {
        first_name: quranStudent.first_name,
        second_name: quranStudent.second_name,
        third_name: quranStudent.third_name,
        last_name: quranStudent.last_name,
        school_level: quranStudent.school_level,
        status: quranStudent.status
      };
      
      // Add other existing fields if they exist
      if (quranStudent.email && quranStudent.email.trim()) {
        quranData.email = quranStudent.email.trim();
      }
      if (quranStudent.phone && quranStudent.phone.trim()) {
        quranData.phone = quranStudent.phone.trim();
      }
      if (quranStudent.address && quranStudent.address.trim()) {
        quranData.address = quranStudent.address.trim();
      }
      if (quranStudent.date_of_birth) {
        quranData.date_of_birth = quranStudent.date_of_birth;
      }
      if (quranStudent.notes && quranStudent.notes.trim()) {
        quranData.notes = quranStudent.notes.trim();
      }
      if (quranStudent.school_id) {
        quranData.school_id = quranStudent.school_id;
      }
      if (quranStudent.class_id) {
        quranData.class_id = quranStudent.class_id;
      }
      
      // Add Qur'an progress fields
      if (quranStudent.memorized_surah_id && quranStudent.memorized_surah_id !== "") {
        quranData.memorized_surah_id = parseInt(quranStudent.memorized_surah_id);
      }
      if (quranStudent.memorized_ayah_number && quranStudent.memorized_ayah_number !== "") {
        quranData.memorized_ayah_number = parseInt(quranStudent.memorized_ayah_number);
      }
      if (quranStudent.target_surah_id && quranStudent.target_surah_id !== "") {
        quranData.target_surah_id = parseInt(quranStudent.target_surah_id);
      }
      if (quranStudent.target_ayah_number && quranStudent.target_ayah_number !== "") {
        quranData.target_ayah_number = parseInt(quranStudent.target_ayah_number);
      }
      
      console.log('Saving Quran data:', quranData);
      
      // Save the data
      const response = await axios.put(`${API_BASE}/api/students/${quranStudent.id}`, quranData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      console.log('Save response:', response.data);
      
      // Update the students list in the background
      await fetchStudents();
      
      // Keep the modal open but refresh it with updated data
      // Keep the form data as-is since it was successfully saved
      console.log('Keeping form open with saved data');
      
    } catch (err) {
      setError("حدث خطأ في حفظ تقدم القرآن");
      console.error("Error saving Quran progress:", err);
    }
  };

  const handleToggleStatus = async (student) => {
    try {
      const newStatus = student.status === 'active' ? 'suspended' : 'active';
      
      // Check if trying to activate student without class assignment
      if (newStatus === 'active' && !student.class_id) {
        alert("يجب تعيين الطالب إلى فصل قبل تفعيله، اذهب الى تعديل الملف ومن ثم اختر الحلقة للطالب.");
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
      if (student.school_id) updateData.school_id = student.school_id;
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

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الطالب "${student.first_name} ${student.second_name} ${student.third_name} ${student.last_name}"؟\n\n` +
      `⚠️ تحذير: هذا حذف نهائي من قاعدة البيانات!\n\n` +
      `سيتم حذف:\n` +
      `• بيانات الطالب الشخصية\n` +
      `• حساب المستخدم\n` +
      `• سجلات الحضور والغياب\n` +
      `• التسجيلات في الحلقات\n` +
      `• جميع البيانات المرتبطة\n\n` +
      `⚠️ لا يمكن التراجع عن هذا الإجراء نهائياً!`
    );
    
    if (!confirmed) return;
    
    try {
      await axios.delete(`${API_BASE}/api/students/${student.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      fetchStudents();
    } catch (err) {
      setError("حدث خطأ في حذف الطالب");
      console.error("Error deleting student:", err);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.id?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesSchool = schoolFilter === "all" || student.school_id == schoolFilter;
    const matchesClass = classFilter === "all" || student.class_id == classFilter;
    
    return matchesSearch && matchesStatus && matchesSchool && matchesClass;
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <option value="inactive">غير نشط</option>
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

            <div>
              <label className="block text-sm font-medium mb-1">الفصل</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">كل الفصول</option>
                {classes && classes.map(cls => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
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
              onQuranProgress={handleQuranProgress}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteStudent}
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
                status: "inactive",
                notes: ""
              });
            }}
            isEditing={!!editingStudent}
            onStudentChange={setCurrentStudent}
            schools={schools}
            classes={classes}
          />
        )}

        {showQuranModal && quranStudent && (
          <QuranProgressModal
            student={quranStudent}
            onSubmit={handleQuranSubmit}
            onCancel={() => {
              setShowQuranModal(false);
              setQuranStudent(null);
            }}
            onStudentChange={setQuranStudent}
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
