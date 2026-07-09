import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus } from "react-icons/ai";
import StudentForm from "../components/StudentForm";
import StudentCard from "../components/StudentCard";
import QuranProgressModal from "../components/QuranProgressModal";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const UI_TEXT = {
  title: "\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0637\u0644\u0627\u0628",
  addStudent: "\u0625\u0636\u0627\u0641\u0629 \u0637\u0627\u0644\u0628 \u062C\u062F\u064A\u062F",
  searchLabel: "\u0627\u0644\u0628\u062D\u062B",
  searchPlaceholder: "\u0627\u0644\u0628\u062D\u062B \u0628\u0627\u0644\u0627\u0633\u0645 \u0623\u0648 \u0631\u0642\u0645 \u0627\u0644\u0647\u0648\u064A\u0629...",
  statusLabel: "\u0627\u0644\u062D\u0627\u0644\u0629",
  statusAll: "\u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0627\u0644\u0627\u062A",
  statusActive: "\u0646\u0634\u0637",
  statusInactive: "\u063A\u064A\u0631 \u0646\u0634\u0637",
  schoolLabel: "\u0645\u062C\u0645\u0639 \u0627\u0644\u062D\u0644\u0642\u0627\u062A",
  schoolAll: "\u062C\u0645\u064A\u0639 \u0645\u062C\u0645\u0639\u0627\u062A \u0627\u0644\u062D\u0644\u0642\u0627\u062A",
  semesterLabel: "\u0627\u0644\u0641\u0635\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A",
  semesterAll: "\u0643\u0644 \u0627\u0644\u0641\u0635\u0648\u0644 \u0627\u0644\u062F\u0631\u0627\u0633\u064A\u0629",
  classLabel: "\u0627\u0644\u0641\u0635\u0644",
  classAll: "\u0643\u0644 \u0627\u0644\u0641\u0635\u0648\u0644",
  totalStudents: "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0637\u0644\u0627\u0628",
  noResults: "\u0644\u0627 \u062A\u0648\u062C\u062F \u0637\u0644\u0627\u0628 \u0645\u0637\u0627\u0628\u0642\u0648\u0646 \u0644\u0645\u0639\u0627\u064A\u064A\u0631 \u0627\u0644\u0628\u062D\u062B"
};

export default function StudentManagement() {
  const [students, setStudents] = useState([]);
  const [schools, setSchools] = useState([]);
  const [semesters, setSemesters] = useState([]);
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
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all");
  const [activationSetting, setActivationSetting] = useState({
    auto_activation_enabled: false,
    requires_manual_activation: true
  });
  const [savingActivationSetting, setSavingActivationSetting] = useState(false);
  const [features, setFeatures] = useState({});
  const [assigningStudent, setAssigningStudent] = useState(null);
  const [assignClassId, setAssignClassId] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

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
    fetchSemesters();
    fetchClasses();
    fetchActivationSetting();
    fetchFeatures();
  }, []);

  const fetchFeatures = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/feature-privileges/my`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setFeatures(response.data.features || {});
    } catch (err) {
      // If the endpoint is unavailable, keep buttons visible; the backend still enforces access.
      console.error("Error fetching feature privileges:", err);
    }
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

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

  const fetchActivationSetting = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/settings/student-activation`, {
        headers: authHeaders()
      });
      setActivationSetting(response.data);
    } catch (err) {
      console.error("Error fetching activation setting:", err);
    }
  };

  const toggleActivationSetting = async () => {
    try {
      setSavingActivationSetting(true);
      const nextValue = !activationSetting.auto_activation_enabled;
      const response = await axios.put(
        `${API_BASE}/api/settings/student-activation`,
        { auto_activation_enabled: nextValue },
        { headers: authHeaders() }
      );
      setActivationSetting(response.data);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث إعداد تفعيل الطلاب");
      console.error("Error updating activation setting:", err);
    } finally {
      setSavingActivationSetting(false);
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

  const fetchSemesters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const payload = response.data;
      const list = Array.isArray(payload?.semesters)
        ? payload.semesters
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];
      setSemesters(list);
    } catch (err) {
      console.error("Error fetching semesters:", err);
      setSemesters([]);
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
          `هل تريد تفعيل الطالب ${currentStudent.first_name} ${currentStudent.last_name} بعد تعيينه إلى مجمع الحلقات؟\n\nإذا اخترت "موافق" سيتم تفعيل الطالب، وإذا اخترت "إلغاء" سيبقى غير مفعل.`
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

  const handleRemoveFromClass = async (student) => {
    if (!student.class_id) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من إزالة الطالب "${student.first_name} ${student.last_name}" من حلقة "${student.class_name || ''}"؟\n\n` +
      `سيبقى الطالب مسجلاً في الفصل الدراسي بحالة "بانتظار الحلقة"، ويمكن تسكينه في حلقة أخرى من شاشة إدارة الفصول الدراسية.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE}/api/classes/${student.class_id}/students/${student.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      fetchStudents();
    } catch (err) {
      setError(err.response?.data?.error || "حدث خطأ في إزالة الطالب من الحلقة");
      console.error("Error removing student from class:", err);
    }
  };

  // تسكين: open the class picker for the student's current semester.
  const handleAssignClass = (student) => {
    setAssignClassId("");
    setAssigningStudent(student);
  };

  const handleAssignClassSubmit = async () => {
    if (!assigningStudent || !assignClassId) return;
    try {
      setAssignSaving(true);
      await axios.patch(
        `${API_BASE}/api/semesters/${assigningStudent.current_semester_id}/registrations/${assigningStudent.id}/class`,
        { class_id: assignClassId },
        { headers: authHeaders() }
      );
      setAssigningStudent(null);
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "تعذر تسكين الطالب في الحلقة");
    } finally {
      setAssignSaving(false);
    }
  };

  const handleRegisterSemester = async (student) => {
    if (!student.current_semester_id) return;

    const schoolLevel = student.school_level ||
      window.prompt("أدخل المستوى الدراسي للطالب (مطلوب للتسجيل):");
    if (!schoolLevel || !schoolLevel.trim()) return;

    const confirmed = window.confirm(
      `تسجيل الطالب "${student.first_name} ${student.last_name}" في ${student.current_semester_name || 'الفصل الدراسي الحالي'}؟`
    );
    if (!confirmed) return;

    try {
      await axios.post(
        `${API_BASE}/api/semesters/${student.current_semester_id}/register`,
        { student_id: student.id, school_level: schoolLevel },
        { headers: authHeaders() }
      );
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "تعذر تسجيل الطالب في الفصل الدراسي");
    }
  };

  const handleUnregisterSemester = async (student) => {
    if (!student.current_semester_id) return;

    const confirmed = window.confirm(
      `هل أنت متأكد من إلغاء تسجيل الطالب "${student.first_name} ${student.last_name}" من ${student.current_semester_name || 'الفصل الدراسي الحالي'}؟\n\n` +
      `سيتم إخراجه من حلقته في هذا الفصل أيضاً. درجاته وسجلاته تبقى محفوظة.`
    );
    if (!confirmed) return;

    try {
      await axios.delete(
        `${API_BASE}/api/semesters/${student.current_semester_id}/registrations/${student.id}`,
        { headers: authHeaders() }
      );
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.error || "تعذر إلغاء تسجيل الطالب");
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

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const classById = new Map(classes.map(cls => [String(cls.id), cls]));

  const filteredStudents = students.filter(student => {
    const fullName = [
      student.first_name,
      student.second_name,
      student.third_name,
      student.last_name
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const studentId = String(student.id ?? "").toLowerCase();
    const matchesSearch = !normalizedSearch ||
      fullName.includes(normalizedSearch) ||
      studentId.includes(normalizedSearch);
    const matchesStatus = statusFilter === "all" || student.status === statusFilter;
    const matchesSchool = schoolFilter === "all" || student.school_id == schoolFilter;
    const studentClass = student.class_id ? classById.get(String(student.class_id)) : null;
    // For semester filter: include students without class when "all" is selected
    const matchesSemester = semesterFilter === "all" ||
      (studentClass && String(studentClass.semester_id) === String(semesterFilter)) ||
      (!student.class_id && semesterFilter === "all");
    const matchesClass = classFilter === "all" || student.class_id == classFilter;

    return matchesSearch && matchesStatus && matchesSchool && matchesSemester && matchesClass;
  });

  // Remove duplicate students - keep only unique students by ID
  const uniqueStudents = filteredStudents.reduce((acc, student) => {
    const existingStudent = acc.find(s => s.id === student.id);
    if (!existingStudent) {
      acc.push(student);
    }
    return acc;
  }, []);

  const visibleSemesters = schoolFilter === "all"
    ? semesters
    : semesters.filter(semester => String(semester.school_id) === String(schoolFilter));
  // Classes cascade with the selected school/semester. Newest semester first;
  // class names repeat across semesters, so the semester name is shown when
  // no specific semester is selected.
  const visibleClasses = classes
    .filter(cls =>
      (schoolFilter === "all" || String(cls.school_id) === String(schoolFilter)) &&
      (semesterFilter === "all" || String(cls.semester_id) === String(semesterFilter))
    )
    .sort((a, b) => (b.semester_id || 0) - (a.semester_id || 0) || String(a.name).localeCompare(String(b.name), 'ar'));

  if (loading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-gray-800">{UI_TEXT.title}</h1>
          <button
            onClick={() => setShowForm(true)}
            className="bg-[var(--color-primary-700)] text-white px-6 py-3 rounded-lg hover:bg-[var(--color-primary-800)] transition-colors flex items-center gap-2"
          >
            <AiOutlinePlus /> {UI_TEXT.addStudent}
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">إعداد تفعيل الطلاب</h2>
              <p className="text-sm text-gray-600 mt-1">
                {activationSetting.auto_activation_enabled
                  ? "الطلاب الجدد يتم تفعيلهم تلقائيا عند التسجيل."
                  : "الطلاب الجدد يبقون بانتظار التفعيل من الإدارة أو عند إضافتهم للحلقة."}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleActivationSetting}
              disabled={savingActivationSetting}
              className={`px-5 py-3 rounded-lg text-white font-semibold transition-colors ${
                activationSetting.auto_activation_enabled
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-700 hover:bg-slate-800"
              } disabled:opacity-60`}
            >
              {savingActivationSetting
                ? "جاري الحفظ..."
                : activationSetting.auto_activation_enabled
                  ? "إيقاف التفعيل التلقائي"
                  : "تشغيل التفعيل التلقائي"}
            </button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg mb-6">
                                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">{UI_TEXT.searchLabel}</label>
              <input
                type="text"
                placeholder={UI_TEXT.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">{UI_TEXT.statusLabel}</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{UI_TEXT.statusAll}</option>
                <option value="active">{UI_TEXT.statusActive}</option>
                <option value="inactive">{UI_TEXT.statusInactive}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{UI_TEXT.schoolLabel}</label>
              <select
                value={schoolFilter}
                onChange={(e) => {
                  setSchoolFilter(e.target.value);
                  setSemesterFilter("all");
                  setClassFilter("all");
                }}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{UI_TEXT.schoolAll}</option>
                {schools && schools.map(school => (
                  <option key={school.id} value={school.id}>{school.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{UI_TEXT.semesterLabel}</label>
              <select
                value={semesterFilter}
                onChange={(e) => {
                  setSemesterFilter(e.target.value);
                  setClassFilter("all");
                }}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{UI_TEXT.semesterAll}</option>
                {visibleSemesters.map(semester => (
                  <option key={semester.id} value={semester.id}>
                    {semester.display_name || semester.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">{UI_TEXT.classLabel}</label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">{UI_TEXT.classAll}</option>
                {visibleClasses.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}{semesterFilter === "all" && cls.semester_name ? ` — ${cls.semester_name}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                {UI_TEXT.totalStudents}: {uniqueStudents.length}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {uniqueStudents.map((student, index) => (
            <StudentCard
              key={`${student.id}-${student.class_id || "no-class"}-${index}`}
              student={student}
              onView={handleView}
              onEdit={handleEdit}
              onQuranProgress={handleQuranProgress}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDeleteStudent}
              onRemoveFromClass={handleRemoveFromClass}
              onAssignClass={handleAssignClass}
              onRegisterSemester={handleRegisterSemester}
              onUnregisterSemester={handleUnregisterSemester}
              features={features}
            />
          ))}
        </div>

        {uniqueStudents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{UI_TEXT.noResults}</p>
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

        {assigningStudent && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl max-w-md w-full m-4">
              <h3 className="text-xl font-bold mb-2 text-[var(--color-primary-700)]">تسكين الطالب في حلقة</h3>
              <p className="text-sm text-gray-600 mb-4">
                {assigningStudent.first_name} {assigningStudent.last_name}
                {assigningStudent.current_semester_name && (
                  <span> — {assigningStudent.current_semester_name}</span>
                )}
              </p>
              <select
                value={assignClassId}
                onChange={(e) => setAssignClassId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"
              >
                <option value="">اختر الحلقة</option>
                {classes
                  .filter((c) => String(c.semester_id) === String(assigningStudent.current_semester_id))
                  .filter((c) => !assigningStudent.school_id || String(c.school_id) === String(assigningStudent.school_id))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.school_name ? ` — ${c.school_name}` : ''}
                    </option>
                  ))}
              </select>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAssigningStudent(null)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={handleAssignClassSubmit}
                  disabled={!assignClassId || assignSaving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50"
                >
                  {assignSaving ? 'جاري الحفظ...' : 'تسكين'}
                </button>
              </div>
            </div>
          </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <strong>الاسم الكامل:</strong>
                    <p>{selectedStudent.first_name} {selectedStudent.second_name} {selectedStudent.third_name} {selectedStudent.last_name}</p>
                  </div>
                  <div>
                    <strong>رقم الهوية:</strong>
                    <p>{selectedStudent.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <strong>البريد الإلكتروني:</strong>
                    <p>{selectedStudent.email || "غير محدد"}</p>
                  </div>
                  <div>
                    <strong>الهاتف:</strong>
                    <p>{selectedStudent.phone || "غير محدد"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <strong>المستوى الدراسي:</strong>
                    <p>{selectedStudent.school_level}</p>
                  </div>
                  <div>
                    <strong>الحالة:</strong>
                    <p>{selectedStudent.status === 'active' ? 'نشط' : 'غير نشط'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
