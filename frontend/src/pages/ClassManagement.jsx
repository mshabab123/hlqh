import { useState, useEffect } from "react";
import axios from "axios";
import { AiOutlinePlus, AiOutlineEdit, AiOutlineDelete, AiOutlineEye, AiOutlineUserAdd, AiOutlineUser, AiOutlineFileText } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

// Qur'an Surahs with their ayah counts
const QURAN_SURAHS = [
  { id: 1, name: "الفاتحة", ayahCount: 7 },
  { id: 2, name: "البقرة", ayahCount: 286 },
  { id: 3, name: "آل عمران", ayahCount: 200 },
  { id: 4, name: "النساء", ayahCount: 176 },
  { id: 5, name: "المائدة", ayahCount: 120 },
  { id: 6, name: "الأنعام", ayahCount: 165 },
  { id: 7, name: "الأعراف", ayahCount: 206 },
  { id: 8, name: "الأنفال", ayahCount: 75 },
  { id: 9, name: "التوبة", ayahCount: 129 },
  { id: 10, name: "يونس", ayahCount: 109 },
  { id: 11, name: "هود", ayahCount: 123 },
  { id: 12, name: "يوسف", ayahCount: 111 },
  { id: 13, name: "الرعد", ayahCount: 43 },
  { id: 14, name: "إبراهيم", ayahCount: 52 },
  { id: 15, name: "الحجر", ayahCount: 99 },
  { id: 16, name: "النحل", ayahCount: 128 },
  { id: 17, name: "الإسراء", ayahCount: 111 },
  { id: 18, name: "الكهف", ayahCount: 110 },
  { id: 19, name: "مريم", ayahCount: 98 },
  { id: 20, name: "طه", ayahCount: 135 },
  { id: 21, name: "الأنبياء", ayahCount: 112 },
  { id: 22, name: "الحج", ayahCount: 78 },
  { id: 23, name: "المؤمنون", ayahCount: 118 },
  { id: 24, name: "النور", ayahCount: 64 },
  { id: 25, name: "الفرقان", ayahCount: 77 },
  { id: 26, name: "الشعراء", ayahCount: 227 },
  { id: 27, name: "النمل", ayahCount: 93 },
  { id: 28, name: "القصص", ayahCount: 88 },
  { id: 29, name: "العنكبوت", ayahCount: 69 },
  { id: 30, name: "الروم", ayahCount: 60 },
  { id: 31, name: "لقمان", ayahCount: 34 },
  { id: 32, name: "السجدة", ayahCount: 30 },
  { id: 33, name: "الأحزاب", ayahCount: 73 },
  { id: 34, name: "سبأ", ayahCount: 54 },
  { id: 35, name: "فاطر", ayahCount: 45 },
  { id: 36, name: "يس", ayahCount: 83 },
  { id: 37, name: "الصافات", ayahCount: 182 },
  { id: 38, name: "ص", ayahCount: 88 },
  { id: 39, name: "الزمر", ayahCount: 75 },
  { id: 40, name: "غافر", ayahCount: 85 },
  { id: 41, name: "فصلت", ayahCount: 54 },
  { id: 42, name: "الشورى", ayahCount: 53 },
  { id: 43, name: "الزخرف", ayahCount: 89 },
  { id: 44, name: "الدخان", ayahCount: 59 },
  { id: 45, name: "الجاثية", ayahCount: 37 },
  { id: 46, name: "الأحقاف", ayahCount: 35 },
  { id: 47, name: "محمد", ayahCount: 38 },
  { id: 48, name: "الفتح", ayahCount: 29 },
  { id: 49, name: "الحجرات", ayahCount: 18 },
  { id: 50, name: "ق", ayahCount: 45 },
  { id: 51, name: "الذاريات", ayahCount: 60 },
  { id: 52, name: "الطور", ayahCount: 49 },
  { id: 53, name: "النجم", ayahCount: 62 },
  { id: 54, name: "القمر", ayahCount: 55 },
  { id: 55, name: "الرحمن", ayahCount: 78 },
  { id: 56, name: "الواقعة", ayahCount: 96 },
  { id: 57, name: "الحديد", ayahCount: 29 },
  { id: 58, name: "المجادلة", ayahCount: 22 },
  { id: 59, name: "الحشر", ayahCount: 24 },
  { id: 60, name: "الممتحنة", ayahCount: 13 },
  { id: 61, name: "الصف", ayahCount: 14 },
  { id: 62, name: "الجمعة", ayahCount: 11 },
  { id: 63, name: "المنافقون", ayahCount: 11 },
  { id: 64, name: "التغابن", ayahCount: 18 },
  { id: 65, name: "الطلاق", ayahCount: 12 },
  { id: 66, name: "التحريم", ayahCount: 12 },
  { id: 67, name: "الملك", ayahCount: 30 },
  { id: 68, name: "القلم", ayahCount: 52 },
  { id: 69, name: "الحاقة", ayahCount: 52 },
  { id: 70, name: "المعارج", ayahCount: 44 },
  { id: 71, name: "نوح", ayahCount: 28 },
  { id: 72, name: "الجن", ayahCount: 28 },
  { id: 73, name: "المزمل", ayahCount: 20 },
  { id: 74, name: "المدثر", ayahCount: 56 },
  { id: 75, name: "القيامة", ayahCount: 40 },
  { id: 76, name: "الإنسان", ayahCount: 31 },
  { id: 77, name: "المرسلات", ayahCount: 50 },
  { id: 78, name: "النبأ", ayahCount: 40 },
  { id: 79, name: "النازعات", ayahCount: 46 },
  { id: 80, name: "عبس", ayahCount: 42 },
  { id: 81, name: "التكوير", ayahCount: 29 },
  { id: 82, name: "الانفطار", ayahCount: 19 },
  { id: 83, name: "المطففين", ayahCount: 36 },
  { id: 84, name: "الانشقاق", ayahCount: 25 },
  { id: 85, name: "البروج", ayahCount: 22 },
  { id: 86, name: "الطارق", ayahCount: 17 },
  { id: 87, name: "الأعلى", ayahCount: 19 },
  { id: 88, name: "الغاشية", ayahCount: 26 },
  { id: 89, name: "الفجر", ayahCount: 30 },
  { id: 90, name: "البلد", ayahCount: 20 },
  { id: 91, name: "الشمس", ayahCount: 15 },
  { id: 92, name: "الليل", ayahCount: 21 },
  { id: 93, name: "الضحى", ayahCount: 11 },
  { id: 94, name: "الشرح", ayahCount: 8 },
  { id: 95, name: "التين", ayahCount: 8 },
  { id: 96, name: "العلق", ayahCount: 19 },
  { id: 97, name: "القدر", ayahCount: 5 },
  { id: 98, name: "البينة", ayahCount: 8 },
  { id: 99, name: "الزلزلة", ayahCount: 8 },
  { id: 100, name: "العاديات", ayahCount: 11 },
  { id: 101, name: "القارعة", ayahCount: 11 },
  { id: 102, name: "التكاثر", ayahCount: 8 },
  { id: 103, name: "العصر", ayahCount: 3 },
  { id: 104, name: "الهمزة", ayahCount: 9 },
  { id: 105, name: "الفيل", ayahCount: 5 },
  { id: 106, name: "قريش", ayahCount: 4 },
  { id: 107, name: "الماعون", ayahCount: 7 },
  { id: 108, name: "الكوثر", ayahCount: 3 },
  { id: 109, name: "الكافرون", ayahCount: 6 },
  { id: 110, name: "النصر", ayahCount: 3 },
  { id: 111, name: "المسد", ayahCount: 5 },
  { id: 112, name: "الإخلاص", ayahCount: 4 },
  { id: 113, name: "الفلق", ayahCount: 5 },
  { id: 114, name: "الناس", ayahCount: 6 }
];

// Move ClassForm component outside to prevent re-creation on each render
const ClassForm = ({ classData, onSubmit, onCancel, isEditing = false, onClassChange, schools, teachers, semesters, getFilteredSchools, getFilteredTeachers }) => (
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-xl shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
        {isEditing ? "تعديل الحلقة" : "إضافة حلقة جديدة"}
      </h3>
      
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">اسم الحلقة *</label>
            <input
              type="text"
              value={classData.name}
              onChange={(e) => onClassChange({...classData, name: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الفصل الدراسي *</label>
            <select
              value={classData.semester_id || ""}
              onChange={(e) => onClassChange({...classData, semester_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر الفصل الدراسي</option>
              {semesters && semesters.map ? semesters.map(semester => (
                <option key={semester.id} value={semester.id}>
                  الفصل {semester.type === 'first' ? 'الأول' : semester.type === 'second' ? 'الثاني' : 'الصيفي'} {semester.year}
                </option>
              )) : null}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">مجمع الحلقات *</label>
            <select
              value={classData.school_id}
              onChange={(e) => onClassChange({...classData, school_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر مجمع الحلقات</option>
              {getFilteredSchools().map(school => (
                <option key={school.id} value={school.id}>{school.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">المستوى الدراسي *</label>
            <select
              value={classData.school_level}
              onChange={(e) => onClassChange({...classData, school_level: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">اختر المستوى</option>
              <option value="الأول الابتدائي">الأول الابتدائي</option>
              <option value="الثاني الابتدائي">الثاني الابتدائي</option>
              <option value="الثالث الابتدائي">الثالث الابتدائي</option>
              <option value="الرابع الابتدائي">الرابع الابتدائي</option>
              <option value="الخامس الابتدائي">الخامس الابتدائي</option>
              <option value="السادس الابتدائي">السادس الابتدائي</option>
              <option value="الأول المتوسط">الأول المتوسط</option>
              <option value="الثاني المتوسط">الثاني المتوسط</option>
              <option value="الثالث المتوسط">الثالث المتوسط</option>
              <option value="الأول الثانوي">الأول الثانوي</option>
              <option value="الثاني الثانوي">الثاني الثانوي</option>
              <option value="الثالث الثانوي">الثالث الثانوي</option>
              <option value="جامعة">جامعة</option>
              <option value="دراسات عليا">دراسات عليا</option>
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">المعلم</label>
            <select
              value={classData.teacher_id || ""}
              onChange={(e) => onClassChange({...classData, teacher_id: e.target.value})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!classData.school_id}
            >
              <option value="">اختر المعلم</option>
              {getFilteredTeachers(classData.school_id).map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.first_name} {teacher.last_name}
                </option>
              ))}
            </select>
            {!classData.school_id && (
              <p className="text-sm text-gray-500 mt-1">يرجى اختيار مجمع الحلقات أولاً</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">الحد الأقصى للطلاب</label>
            <input
              type="number"
              min="1"
              max="50"
              value={classData.max_students}
              onChange={(e) => onClassChange({...classData, max_students: parseInt(e.target.value) || 0})}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 pt-4">
          <input
            type="checkbox"
            checked={classData.is_active}
            onChange={(e) => onClassChange({...classData, is_active: e.target.checked})}
            className="w-4 h-4"
          />
          <label className="text-sm font-medium">حلقة نشطة</label>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إلغاء
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)]"
          >
            {isEditing ? "تحديث" : "إضافة"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

// Student List Modal - Shows all students with option to view individual profiles
const StudentListModal = ({ classItem, onClose }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (classItem) {
      fetchClassStudents();
    }
  }, [classItem]);

  const fetchClassStudents = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/classes/${classItem.id}/students`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudents(response.data || []);
    } catch (err) {
      setError("فشل في تحميل طلاب الحلقة");
    } finally {
      setLoading(false);
    }
  };

  if (!classItem) return null;

  // Show individual student profile if selected
  if (selectedStudent) {
    return (
      <StudentProfileModal 
        student={selectedStudent}
        classItem={classItem}
        onBack={() => setSelectedStudent(null)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-4xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[var(--color-primary-700)]">
            قائمة طلاب حلقة: {classItem.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">جاري تحميل قائمة الطلاب...</div>
        ) : (
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">الطلاب المسجلين ({students.length})</h3>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {students.map(student => (
                <div key={student.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="flex-1">
                    <p className="font-medium text-lg">
                      {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                    </p>
                    <p className="text-sm text-gray-600">
                      {student.school_level} • تاريخ التسجيل: {new Date(student.enrollment_date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div>
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      <AiOutlineEye /> عرض الملف
                    </button>
                  </div>
                </div>
              ))}
              
              {students.length === 0 && (
                <p className="text-gray-500 text-center py-8">لا يوجد طلاب في هذه الحلقة</p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

// Individual Student Profile Modal - Complete student profile with grades and course management
const StudentProfileModal = ({ student, classItem, onBack, onClose }) => {
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [gradeInput, setGradeInput] = useState({
    grade_value: '',
    max_grade: 100,
    notes: '',
    start_surah: '',
    start_verse: '',
    end_surah: '',
    end_verse: ''
  });
  const [goalProgress, setGoalProgress] = useState({ percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 });
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalInput, setGoalInput] = useState({
    target_surah: '',
    target_ayah_number: '',
    target_date: ''
  });
  const [savingGoal, setSavingGoal] = useState(false);

  // Complete list of Quran Surahs with verse counts
  const surahVerses = {
    'الفاتحة': 7, 'البقرة': 286, 'آل عمران': 200, 'النساء': 176, 'المائدة': 120,
    'الأنعام': 165, 'الأعراف': 206, 'الأنفال': 75, 'التوبة': 129, 'يونس': 109,
    'هود': 123, 'يوسف': 111, 'الرعد': 43, 'إبراهيم': 52, 'الحجر': 99,
    'النحل': 128, 'الإسراء': 111, 'الكهف': 110, 'مريم': 98, 'طه': 135,
    'الأنبياء': 112, 'الحج': 78, 'المؤمنون': 118, 'النور': 64, 'الفرقان': 77,
    'الشعراء': 227, 'النمل': 93, 'القصص': 88, 'العنكبوت': 69, 'الروم': 60,
    'لقمان': 34, 'السجدة': 30, 'الأحزاب': 73, 'سبأ': 54, 'فاطر': 45,
    'يس': 83, 'الصافات': 182, 'ص': 88, 'الزمر': 75, 'غافر': 85,
    'فصلت': 54, 'الشورى': 53, 'الزخرف': 89, 'الدخان': 59, 'الجاثية': 37,
    'الأحقاف': 35, 'محمد': 38, 'الفتح': 29, 'الحجرات': 18, 'ق': 45,
    'الذاريات': 60, 'الطور': 49, 'النجم': 62, 'القمر': 55, 'الرحمن': 78,
    'الواقعة': 96, 'الحديد': 29, 'المجادلة': 22, 'الحشر': 24, 'الممتحنة': 13,
    'الصف': 14, 'الجمعة': 11, 'المنافقون': 11, 'التغابن': 18, 'الطلاق': 12,
    'التحريم': 12, 'الملك': 30, 'القلم': 52, 'الحاقة': 52, 'المعارج': 44,
    'نوح': 28, 'الجن': 28, 'المزمل': 20, 'المدثر': 56, 'القيامة': 40,
    'الإنسان': 31, 'المرسلات': 50, 'النبأ': 40, 'النازعات': 46, 'عبس': 42,
    'التكوير': 29, 'الانفطار': 19, 'المطففين': 36, 'الانشقاق': 25, 'البروج': 22,
    'الطارق': 17, 'الأعلى': 19, 'الغاشية': 26, 'الفجر': 30, 'البلد': 20,
    'الشمس': 15, 'الليل': 21, 'الضحى': 11, 'الشرح': 8, 'التين': 8,
    'العلق': 19, 'القدر': 5, 'البينة': 8, 'الزلزلة': 8, 'العاديات': 11,
    'القارعة': 11, 'التكاثر': 8, 'العصر': 3, 'الهمزة': 9, 'الفيل': 5,
    'قريش': 4, 'الماعون': 7, 'الكوثر': 3, 'الكافرون': 6, 'النصر': 3,
    'المسد': 5, 'الإخلاص': 4, 'الفلق': 5, 'الناس': 6
  };

  // List of Quran Surahs organized by learning difficulty (like goal registration)
  const surahGroups = [
    {
      title: 'القصار (Short Surahs)',
      surahs: ['الناس', 'الفلق', 'الإخلاص', 'المسد', 'النصر', 'الكافرون', 'الكوثر', 'الماعون', 'قريش', 'الفيل', 'الهمزة', 'العصر', 'التكاثر', 'القارعة', 'العاديات', 'الزلزلة', 'البينة', 'القدر', 'العلق', 'التين', 'الشرح', 'الضحى', 'الليل', 'الشمس', 'البلد', 'الفجر']
    },
    {
      title: 'المتوسطات (Medium Surahs)',
      surahs: ['الغاشية', 'الأعلى', 'الطارق', 'البروج', 'الانشقاق', 'المطففين', 'الانفطار', 'التكوير', 'عبس', 'النازعات', 'النبأ', 'المرسلات', 'الإنسان', 'القيامة', 'المدثر', 'المزمل', 'الجن', 'نوح', 'المعارج', 'الحاقة', 'القلم', 'الملك', 'التحريم', 'الطلاق', 'التغابن', 'المنافقون', 'الجمعة', 'الصف', 'الممتحنة', 'الحشر', 'المجادلة']
    },
    {
      title: 'الطوال (Long Surahs)',
      surahs: ['الحديد', 'الواقعة', 'الرحمن', 'القمر', 'النجم', 'الطور', 'الذاريات', 'ق', 'الحجرات', 'الفتح', 'محمد', 'الأحقاف', 'الجاثية', 'الدخان', 'الزخرف', 'الشورى', 'فصلت', 'غافر', 'الزمر', 'ص', 'الصافات', 'يس', 'فاطر', 'سبأ', 'الأحزاب', 'السجدة', 'لقمان', 'الروم', 'العنكبوت', 'القصص', 'النمل', 'الشعراء', 'الفرقان', 'النور', 'المؤمنون', 'الحج', 'الأنبياء', 'طه', 'مريم', 'الكهف', 'الإسراء', 'النحل', 'الحجر', 'إبراهيم', 'الرعد', 'يوسف', 'هود', 'يونس']
    },
    {
      title: 'الأساسيات (Foundation)',
      surahs: ['الفاتحة', 'البقرة', 'آل عمران', 'النساء', 'المائدة', 'الأنعام', 'الأعراف', 'الأنفال', 'التوبة']
    }
  ];

  // Get maximum verse count for a given Surah
  const getMaxVerse = (surahName) => {
    return surahVerses[surahName] || 1;
  };

  // Convert Surah name to ID (matching StudentManagement logic)
  const getSurahIdFromName = (surahName) => {
    const surahMapping = {
      'الناس': 114, 'الفلق': 113, 'الإخلاص': 112, 'المسد': 111, 'النصر': 110,
      'الكافرون': 109, 'الكوثر': 108, 'الماعون': 107, 'قريش': 106, 'الفيل': 105,
      'الهمزة': 104, 'العصر': 103, 'التكاثر': 102, 'القارعة': 101, 'العاديات': 100,
      'الزلزلة': 99, 'البينة': 98, 'القدر': 97, 'العلق': 96, 'التين': 95,
      'الشرح': 94, 'الضحى': 93, 'الليل': 92, 'الشمس': 91, 'البلد': 90,
      'الفجر': 89, 'الغاشية': 88, 'الأعلى': 87, 'الطارق': 86, 'البروج': 85,
      'الانشقاق': 84, 'المطففين': 83, 'الانفطار': 82, 'التكوير': 81, 'عبس': 80,
      'النازعات': 79, 'النبأ': 78, 'المرسلات': 77, 'الإنسان': 76, 'القيامة': 75,
      'المدثر': 74, 'المزمل': 73, 'الجن': 72, 'نوح': 71, 'المعارج': 70,
      'الحاقة': 69, 'القلم': 68, 'الملك': 67, 'التحريم': 66, 'الطلاق': 65,
      'التغابن': 64, 'المنافقون': 63, 'الجمعة': 62, 'الصف': 61, 'الممتحنة': 60,
      'الحشر': 59, 'المجادلة': 58, 'الحديد': 57, 'الواقعة': 56, 'الرحمن': 55,
      'القمر': 54, 'النجم': 53, 'الطور': 52, 'الذاريات': 51, 'ق': 50,
      'الحجرات': 49, 'الفتح': 48, 'محمد': 47, 'الأحقاف': 46, 'الجاثية': 45,
      'الدخان': 44, 'الزخرف': 43, 'الشورى': 42, 'فصلت': 41, 'غافر': 40,
      'الزمر': 39, 'ص': 38, 'الصافات': 37, 'يس': 36, 'فاطر': 35,
      'سبأ': 34, 'الأحزاب': 33, 'السجدة': 32, 'لقمان': 31, 'الروم': 30,
      'العنكبوت': 29, 'القصص': 28, 'النمل': 27, 'الشعراء': 26, 'الفرقان': 25,
      'النور': 24, 'المؤمنون': 23, 'الحج': 22, 'الأنبياء': 21, 'طه': 20,
      'مريم': 19, 'الكهف': 18, 'الإسراء': 17, 'النحل': 16, 'الحجر': 15,
      'إبراهيم': 14, 'الرعد': 13, 'يوسف': 12, 'هود': 11, 'يونس': 10,
      'التوبة': 9, 'الأنفال': 8, 'الأعراف': 7, 'الأنعام': 6, 'المائدة': 5,
      'النساء': 4, 'آل عمران': 3, 'البقرة': 2, 'الفاتحة': 1
    };
    return surahMapping[surahName] || null;
  };

  // Convert Surah ID to name
  const getSurahNameFromId = (surahId) => {
    const idMapping = {
      114: 'الناس', 113: 'الفلق', 112: 'الإخلاص', 111: 'المسد', 110: 'النصر',
      109: 'الكافرون', 108: 'الكوثر', 107: 'الماعون', 106: 'قريش', 105: 'الفيل',
      104: 'الهمزة', 103: 'العصر', 102: 'التكاثر', 101: 'القارعة', 100: 'العاديات',
      99: 'الزلزلة', 98: 'البينة', 97: 'القدر', 96: 'العلق', 95: 'التين',
      94: 'الشرح', 93: 'الضحى', 92: 'الليل', 91: 'الشمس', 90: 'البلد',
      89: 'الفجر', 88: 'الغاشية', 87: 'الأعلى', 86: 'الطارق', 85: 'البروج',
      84: 'الانشقاق', 83: 'المطففين', 82: 'الانفطار', 81: 'التكوير', 80: 'عبس',
      79: 'النازعات', 78: 'النبأ', 77: 'المرسلات', 76: 'الإنسان', 75: 'القيامة',
      74: 'المدثر', 73: 'المزمل', 72: 'الجن', 71: 'نوح', 70: 'المعارج',
      69: 'الحاقة', 68: 'القلم', 67: 'الملك', 66: 'التحريم', 65: 'الطلاق',
      64: 'التغابن', 63: 'المنافقون', 62: 'الجمعة', 61: 'الصف', 60: 'الممتحنة',
      59: 'الحشر', 58: 'المجادلة', 57: 'الحديد', 56: 'الواقعة', 55: 'الرحمن',
      54: 'القمر', 53: 'النجم', 52: 'الطور', 51: 'الذاريات', 50: 'ق',
      49: 'الحجرات', 48: 'الفتح', 47: 'محمد', 46: 'الأحقاف', 45: 'الجاثية',
      44: 'الدخان', 43: 'الزخرف', 42: 'الشورى', 41: 'فصلت', 40: 'غافر',
      39: 'الزمر', 38: 'ص', 37: 'الصافات', 36: 'يس', 35: 'فاطر',
      34: 'سبأ', 33: 'الأحزاب', 32: 'السجدة', 31: 'لقمان', 30: 'الروم',
      29: 'العنكبوت', 28: 'القصص', 27: 'النمل', 26: 'الشعراء', 25: 'الفرقان',
      24: 'النور', 23: 'المؤمنون', 22: 'الحج', 21: 'الأنبياء', 20: 'طه',
      19: 'مريم', 18: 'الكهف', 17: 'الإسراء', 16: 'النحل', 15: 'الحجر',
      14: 'إبراهيم', 13: 'الرعد', 12: 'يوسف', 11: 'هود', 10: 'يونس',
      9: 'التوبة', 8: 'الأنفال', 7: 'الأعراف', 6: 'الأنعام', 5: 'المائدة',
      4: 'النساء', 3: 'آل عمران', 2: 'البقرة', 1: 'الفاتحة'
    };
    return idMapping[surahId] || null;
  };

  // Calculate student goal progress for display
  const calculateStudentGoalProgress = (studentData) => {
    if (!studentData.goal?.target_surah_id || !studentData.goal?.target_ayah_number) {
      return { percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 };
    }

    const currentSurahId = studentData.student?.memorized_surah_id;
    const currentAyah = studentData.student?.memorized_ayah_number || 0;
    const targetSurahId = studentData.goal.target_surah_id;
    const targetAyah = studentData.goal.target_ayah_number;

    // Helper function to get max verse count for a surah
    const getMaxVerse = (surahName) => {
      const verseCounts = {
        'الفاتحة': 7, 'البقرة': 286, 'آل عمران': 200, 'النساء': 176, 'المائدة': 120,
        'الأنعام': 165, 'الأعراف': 206, 'الأنفال': 75, 'التوبة': 129, 'يونس': 109,
        'هود': 123, 'يوسف': 111, 'الرعد': 43, 'إبراهيم': 52, 'الحجر': 99,
        'النحل': 128, 'الإسراء': 111, 'الكهف': 110, 'مريم': 98, 'طه': 135,
        'الأنبياء': 112, 'الحج': 78, 'المؤمنون': 118, 'النور': 64, 'الفرقان': 77,
        'الشعراء': 227, 'النمل': 93, 'القصص': 88, 'العنكبوت': 69, 'الروم': 60,
        'لقمان': 34, 'السجدة': 30, 'الأحزاب': 73, 'سبأ': 54, 'فاطر': 45,
        'يس': 83, 'الصافات': 182, 'ص': 88, 'الزمر': 75, 'غافر': 85,
        'فصلت': 54, 'الشورى': 53, 'الزخرف': 89, 'الدخان': 59, 'الجاثية': 37,
        'الأحقاف': 35, 'محمد': 38, 'الفتح': 29, 'الحجرات': 18, 'ق': 45,
        'الذاريات': 60, 'الطور': 49, 'النجم': 62, 'القمر': 55, 'الرحمن': 78,
        'الواقعة': 96, 'الحديد': 29, 'المجادلة': 22, 'الحشر': 24, 'الممتحنة': 13,
        'الصف': 14, 'الجمعة': 11, 'المنافقون': 11, 'التغابن': 18, 'الطلاق': 12,
        'التحريم': 12, 'الملك': 30, 'القلم': 52, 'الحاقة': 52, 'المعارج': 44,
        'نوح': 28, 'الجن': 28, 'المزمل': 20, 'المدثر': 56, 'القيامة': 40,
        'الإنسان': 31, 'المرسلات': 50, 'النبأ': 40, 'النازعات': 46, 'عبس': 42,
        'التكوير': 29, 'الانفطار': 19, 'المطففين': 36, 'الانشقاق': 25, 'البروج': 22,
        'الطارق': 17, 'الأعلى': 19, 'الغاشية': 26, 'الفجر': 30, 'البلد': 20,
        'الشمس': 15, 'الليل': 21, 'الضحى': 11, 'الشرح': 8, 'التين': 8,
        'العلق': 19, 'القدر': 5, 'البينة': 8, 'الزلزلة': 8, 'العاديات': 11,
        'القارعة': 11, 'التكاثر': 8, 'العصر': 3, 'الهمزة': 9, 'الفيل': 5,
        'قريش': 4, 'الماعون': 7, 'الكوثر': 3, 'الكافرون': 6, 'النصر': 3,
        'المسد': 5, 'الإخلاص': 4, 'الفلق': 5, 'الناس': 6
      };
      return verseCounts[surahName] || 0;
    };

    let totalGoalVerses = 0;
    let memorizedVerses = 0;

    if (!currentSurahId) {
      // No current memorization - calculate from beginning (Surah 114) to target
      for (let surahId = 114; surahId >= targetSurahId; surahId--) {
        const surahName = getSurahNameFromId(surahId);
        const maxVerse = getMaxVerse(surahName);
        
        if (surahId === targetSurahId) {
          totalGoalVerses += targetAyah;
        } else {
          totalGoalVerses += maxVerse;
        }
      }
      memorizedVerses = 0;
    } else {
      const currentSurahIdInt = parseInt(currentSurahId);
      const targetSurahIdInt = parseInt(targetSurahId);
      const currentAyahInt = parseInt(currentAyah);
      const targetAyahInt = parseInt(targetAyah);

      if (currentSurahIdInt === targetSurahIdInt) {
        // Same surah
        totalGoalVerses = Math.max(0, targetAyahInt - currentAyahInt);
        memorizedVerses = Math.min(totalGoalVerses, Math.max(0, currentAyahInt - currentAyahInt));
      } else if (currentSurahIdInt > targetSurahIdInt) {
        // Current surah is before target surah
        for (let surahId = currentSurahIdInt; surahId >= targetSurahIdInt; surahId--) {
          const surahName = getSurahNameFromId(surahId);
          const maxVerse = getMaxVerse(surahName);
          
          if (surahId === currentSurahIdInt) {
            totalGoalVerses += Math.max(0, maxVerse - currentAyahInt);
            memorizedVerses += 0; // Starting point
          } else if (surahId === targetSurahIdInt) {
            totalGoalVerses += targetAyahInt;
          } else {
            totalGoalVerses += maxVerse;
          }
        }
      } else {
        // Current surah is after target surah - goal already achieved
        totalGoalVerses = 1;
        memorizedVerses = 1;
      }
    }

    const percentage = totalGoalVerses > 0 ? Math.round((memorizedVerses / totalGoalVerses) * 100) : 0;
    return { percentage: Math.min(100, percentage), memorizedVerses, totalGoalVerses };
  };

  // Flatten all surahs for the dropdown
  const allSurahs = surahGroups.reduce((acc, group) => [...acc, ...group.surahs], []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student && classItem) {
      fetchStudentProfile();
    }
  }, [student, classItem]);

  // Calculate goal progress whenever studentData changes
  useEffect(() => {
    if (studentData?.goal && studentData?.grades) {
      calculateGoalProgress();
    }
  }, [studentData]);

  const calculateGoalProgress = () => {
    if (!studentData) {
      setGoalProgress({ percentage: 0, memorizedVerses: 0, totalGoalVerses: 0 });
      return;
    }

    const progress = calculateStudentGoalProgress(studentData);
    setGoalProgress(progress);
  };

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      // Get student's complete grade history for this class
      const gradesResponse = await axios.get(`${API_BASE}/api/classes/${classItem.id}/student/${student.id}/profile`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStudentData(gradesResponse.data);
    } catch (err) {
      setError("فشل في تحميل ملف الطالب");
    } finally {
      setLoading(false);
    }
  };

  const handleAddGrade = (course) => {
    setSelectedCourse(course);
    setGradeInput({
      grade_value: '',
      max_grade: 100,
      notes: '',
      start_surah: '',
      start_verse: '',
      end_surah: '',
      end_verse: ''
    });
    setError('');
  };

  const saveGoal = async () => {
    if (!goalInput.target_surah || !goalInput.target_ayah_number) {
      setError('يرجى تحديد السورة والآية المستهدفة');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      setSavingGoal(true);
      console.log('Saving goal:', goalInput);
      console.log('Class ID:', classItem.id);
      console.log('Student ID:', student.id);
      console.log('URL:', `${API_BASE}/api/classes/${classItem.id}/student/${student.id}/goal`);
      
      const response = await axios.put(
        `${API_BASE}/api/classes/${classItem.id}/student/${student.id}/goal`,
        {
          target_surah_id: getSurahIdFromName(goalInput.target_surah),
          target_ayah_number: parseInt(goalInput.target_ayah_number)
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('Goal saved response:', response.data);
      
      // Update local data with new goal
      setStudentData({
        ...studentData,
        goal: response.data.goal
      });
      
      setShowGoalForm(false);
      setGoalInput({
        target_surah: '',
        target_ayah_number: '',
        target_date: ''
      });
      
      // Refresh the student profile to get updated data
      fetchStudentProfile();
      
      // Show success message
      alert('تم حفظ الهدف بنجاح!');
      
    } catch (err) {
      console.error('Error saving goal:', err);
      setError(err.response?.data?.error || "فشل في حفظ الهدف");
      setTimeout(() => setError(''), 5000);
    } finally {
      setSavingGoal(false);
    }
  };

  const saveGrade = async () => {
    if (!gradeInput.grade_value) {
      setError('يرجى إدخال الدرجة');
      return;
    }

    // Build reference strings for Quran verses
    const start_ref = gradeInput.start_surah && gradeInput.start_verse ? 
      `${gradeInput.start_surah}:${gradeInput.start_verse}` : '';
    const end_ref = gradeInput.end_surah && gradeInput.end_verse ? 
      `${gradeInput.end_surah}:${gradeInput.end_verse}` : '';

    try {
      setSaving(true);
      await axios.post(`${API_BASE}/api/classes/${classItem.id}/grades`, {
        student_id: student.id,
        course_id: selectedCourse.id,
        grade_value: parseFloat(gradeInput.grade_value),
        max_grade: parseFloat(gradeInput.max_grade),
        notes: gradeInput.notes,
        grade_type: 'memorization',
        start_reference: start_ref,
        end_reference: end_ref
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setSelectedCourse(null);
      setGradeInput({
        grade_value: '', max_grade: 100, notes: '',
        start_surah: '', start_verse: '', end_surah: '', end_verse: ''
      });
      fetchStudentProfile();
      
    } catch (err) {
      setError(err.response?.data?.error || "فشل في حفظ الدرجة");
    } finally {
      setSaving(false);
    }
  };


  const calculateTotalScore = () => {
    if (!studentData?.grades || studentData.grades.length === 0) return 0;
    
    let totalWeighted = 0;
    let totalWeight = 0;
    
    studentData.courses?.forEach(course => {
      const courseGrades = studentData.grades.filter(g => g.course_id === course.id);
      if (courseGrades.length > 0) {
        const average = courseGrades.reduce((sum, grade) => 
          sum + (parseFloat(grade.grade_value) / parseFloat(grade.max_grade)) * 100, 0
        ) / courseGrades.length;
        
        totalWeighted += average * parseFloat(course.percentage);
        totalWeight += parseFloat(course.percentage);
      }
    });
    
    return totalWeight > 0 ? (totalWeighted / totalWeight).toFixed(1) : 0;
  };

  if (!student || !classItem) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-xl shadow-xl">
          <div className="text-center">جاري تحميل ملف الطالب...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-6xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="text-blue-600 hover:text-blue-800 text-lg"
            >
              ← العودة للقائمة
            </button>
            <h2 className="text-2xl font-bold text-[var(--color-primary-700)]">
              ملف الطالب: {student.first_name} {student.second_name} {student.third_name} {student.last_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {studentData && (
          <div className="space-y-6">
            {/* Student Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{calculateTotalScore()}%</div>
                <div className="text-sm text-gray-600">المجموع الكلي</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{studentData.grades?.length || 0}</div>
                <div className="text-sm text-gray-600">إجمالي الدرجات</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{student.school_level}</div>
                <div className="text-sm text-gray-600">المستوى</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">{classItem.name}</div>
                <div className="text-sm text-gray-600">الحلقة</div>
              </div>
            </div>

            {/* Goal and Progress Section */}
            {studentData.goal?.target_surah_id && (
              <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg border border-blue-200 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">الهدف والتقدم</h3>
                  <button
                    onClick={() => setShowGoalForm(!showGoalForm)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                  >
                    {showGoalForm ? 'إخفاء' : 'تعديل الهدف'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">الهدف المحدد:</h4>
                    <p className="text-base font-bold text-blue-700">
                      {(() => {
                        const currentSurahId = studentData.student?.memorized_surah_id;
                        const currentAyah = studentData.student?.memorized_ayah_number;
                        const targetSurahId = studentData.goal.target_surah_id;
                        const targetAyah = studentData.goal.target_ayah_number;
                        
                        const getCurrentSurahName = (surahId) => {
                          const surah = QURAN_SURAHS.find(s => s.id == surahId);
                          return surah ? surah.name : '';
                        };
                        
                        if (!currentSurahId) {
                          // No current memorization - start from beginning
                          return `من سورة الناس إلى سورة ${getCurrentSurahName(targetSurahId)} الآية ${targetAyah}`;
                        } else if (parseInt(currentSurahId) === parseInt(targetSurahId)) {
                          // Same surah
                          const currentSurahName = getCurrentSurahName(currentSurahId);
                          if (parseInt(currentAyah) >= parseInt(targetAyah)) {
                            return `🎉 تم تحقيق الهدف - سورة ${currentSurahName} الآية ${currentAyah}`;
                          } else {
                            return `من سورة ${currentSurahName} الآية ${parseInt(currentAyah) + 1} إلى الآية ${targetAyah}`;
                          }
                        } else {
                          // Different surahs
                          const currentSurahName = getCurrentSurahName(currentSurahId);
                          const targetSurahName = getCurrentSurahName(targetSurahId);
                          if (parseInt(currentSurahId) < parseInt(targetSurahId)) {
                            return `🎉 تم تجاوز الهدف - الحالي: سورة ${currentSurahName}`;
                          } else {
                            return `من سورة ${currentSurahName} الآية ${parseInt(currentAyah) + 1} إلى سورة ${targetSurahName} الآية ${targetAyah}`;
                          }
                        }
                      })()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">التقدم نحو الهدف:</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>الآيات المحفوظة:</span>
                        <span className="font-bold">
                          {(() => {
                            const progress = calculateStudentGoalProgress(studentData);
                            return `${progress.memorizedVerses} من ${progress.totalGoalVerses}`;
                          })()}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <div 
                          className="bg-blue-500 h-4 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${(() => {
                              const progress = calculateStudentGoalProgress(studentData);
                              return progress.percentage;
                            })()}%` 
                          }}
                        >
                          <span className="text-white text-xs font-bold flex items-center justify-center h-full">
                            {(() => {
                              const progress = calculateStudentGoalProgress(studentData);
                              return progress.percentage;
                            })()}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!studentData.goal?.target_surah_id && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                <p className="text-center text-yellow-700 mb-3">لم يتم تحديد هدف للطالب بعد</p>
                <div className="text-center">
                  <button
                    onClick={() => setShowGoalForm(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    تحديد هدف جديد
                  </button>
                </div>
              </div>
            )}

            {/* Goal Setting Form */}
            {showGoalForm && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4">
                  {studentData.goal?.target_surah_id ? 'تعديل الهدف' : 'تحديد هدف جديد'}
                </h3>
                
                <div className="space-y-4">
                  {/* Surah Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-1">السورة المستهدفة:</label>
                    <select
                      className="w-full p-2 border rounded"
                      value={goalInput.target_surah}
                      onChange={(e) => setGoalInput({...goalInput, target_surah: e.target.value, target_ayah_number: ''})}
                    >
                      <option value="">اختر السورة</option>
                      {surahGroups.map((group, groupIndex) => (
                        <optgroup key={groupIndex} label={group.title}>
                          {group.surahs.map((surah, surahIndex) => (
                            <option key={surahIndex} value={surah}>
                              {surah}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* Target Verse */}
                  {goalInput.target_surah && (
                    <div>
                      <label className="block text-sm font-medium mb-1">الآية المستهدفة (من الآية 1 إلى الآية المحددة):</label>
                      <input
                        type="number"
                        min="1"
                        max={getMaxVerse(goalInput.target_surah)}
                        className="w-full p-2 border rounded"
                        value={goalInput.target_ayah_number}
                        onChange={(e) => {
                          const verse = parseInt(e.target.value);
                          const maxVerse = getMaxVerse(goalInput.target_surah);
                          if (verse <= maxVerse || !verse) {
                            setGoalInput({...goalInput, target_ayah_number: e.target.value});
                          }
                        }}
                        placeholder={`1 - ${getMaxVerse(goalInput.target_surah)}`}
                      />
                    </div>
                  )}

                  {/* Target Date */}
                  <div>
                    <label className="block text-sm font-medium mb-1">الموعد المستهدف (اختياري):</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded"
                      value={goalInput.target_date}
                      onChange={(e) => setGoalInput({...goalInput, target_date: e.target.value})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setShowGoalForm(false);
                        setGoalInput({
                          target_surah: '',
                          target_ayah_number: '',
                          target_date: ''
                        });
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={saveGoal}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      disabled={savingGoal}
                    >
                      {savingGoal ? 'جاري الحفظ...' : 'حفظ الهدف'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Courses and Grade Entry Buttons */}
            <div>
              <h3 className="text-lg font-semibold mb-3">المواد الدراسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {studentData.courses?.map(course => (
                  <button
                    key={course.id}
                    onClick={() => handleAddGrade(course)}
                    className="p-3 bg-blue-500 text-white rounded hover:bg-blue-600 text-center font-medium"
                  >
                    {course.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Grade Entry Form */}
            {selectedCourse && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-4">
                  إضافة درجة جديدة - {selectedCourse.name}
                </h3>

                <div className="space-y-4">
                  {/* Grade Input */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">الدرجة:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="الدرجة"
                        className="w-20 p-2 border rounded"
                        value={gradeInput.grade_value}
                        onChange={(e) => setGradeInput({...gradeInput, grade_value: e.target.value})}
                      />
                      <span>/</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        className="w-20 p-2 border rounded"
                        value={gradeInput.max_grade}
                        onChange={(e) => setGradeInput({...gradeInput, max_grade: e.target.value})}
                      />
                    </div>
                  </div>

                  {/* Quran Reference Fields - Only show for courses that require Quran references */}
                  {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">من (سورة وآية):</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={gradeInput.start_surah}
                            onChange={(e) => setGradeInput({...gradeInput, start_surah: e.target.value, start_verse: ''})}
                          >
                            <option value="">اختر السورة</option>
                            {surahGroups.map((group, groupIndex) => (
                              <optgroup key={groupIndex} label={group.title}>
                                {group.surahs.map((surah, surahIndex) => (
                                  <option key={surahIndex} value={surah}>
                                    {surah}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={gradeInput.start_surah ? getMaxVerse(gradeInput.start_surah) : undefined}
                            placeholder="رقم الآية"
                            className="w-24 p-2 border rounded"
                            value={gradeInput.start_verse}
                            onChange={(e) => {
                              const verse = parseInt(e.target.value);
                              const maxVerse = getMaxVerse(gradeInput.start_surah);
                              if (verse <= maxVerse || !verse) {
                                setGradeInput({...gradeInput, start_verse: e.target.value});
                              }
                            }}
                            title={gradeInput.start_surah ? `الحد الأقصى: ${getMaxVerse(gradeInput.start_surah)} آية` : ''}
                          />
                          {gradeInput.start_surah && (
                            <span className="text-xs text-gray-500">/{getMaxVerse(gradeInput.start_surah)}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">إلى (سورة وآية):</label>
                        <div className="flex gap-2">
                          <select
                            className="flex-1 p-2 border rounded"
                            value={gradeInput.end_surah}
                            onChange={(e) => setGradeInput({...gradeInput, end_surah: e.target.value, end_verse: ''})}
                          >
                            <option value="">اختر السورة</option>
                            {surahGroups.map((group, groupIndex) => (
                              <optgroup key={groupIndex} label={group.title}>
                                {group.surahs.map((surah, surahIndex) => (
                                  <option key={surahIndex} value={surah}>
                                    {surah}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="1"
                            max={gradeInput.end_surah ? getMaxVerse(gradeInput.end_surah) : undefined}
                            placeholder="رقم الآية"
                            className="w-24 p-2 border rounded"
                            value={gradeInput.end_verse}
                            onChange={(e) => {
                              const verse = parseInt(e.target.value);
                              const maxVerse = getMaxVerse(gradeInput.end_surah);
                              if (verse <= maxVerse || !verse) {
                                setGradeInput({...gradeInput, end_verse: e.target.value});
                              }
                            }}
                            title={gradeInput.end_surah ? `الحد الأقصى: ${getMaxVerse(gradeInput.end_surah)} آية` : ''}
                          />
                          {gradeInput.end_surah && (
                            <span className="text-xs text-gray-500">/{getMaxVerse(gradeInput.end_surah)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <input
                      type="text"
                      placeholder="ملاحظات (اختياري)"
                      className="flex-1 p-2 border rounded"
                      value={gradeInput.notes}
                      onChange={(e) => setGradeInput({...gradeInput, notes: e.target.value})}
                    />
                    <button
                      onClick={saveGrade}
                      className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                      disabled={saving}
                    >
                      {saving ? 'حفظ...' : 'حفظ الدرجة'}
                    </button>
                    <button
                      onClick={() => setSelectedCourse(null)}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>

                {/* Course Grade History */}
                <div className="mt-6">
                  <h4 className="text-md font-semibold mb-3">تاريخ درجات {selectedCourse.name}</h4>
                  <div className="bg-white rounded-lg border max-h-64 overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100 sticky top-0">
                        <tr>
                          <th className="p-2 text-center text-sm border">الدرجة</th>
                          {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                            <th className="p-2 text-center text-sm border">المرجع القرآني</th>
                          )}
                          <th className="p-2 text-center text-sm border">التاريخ</th>
                          <th className="p-2 text-right text-sm border">ملاحظات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.grades?.filter(grade => grade.course_id === selectedCourse.id).map(grade => (
                          <tr key={grade.id} className="hover:bg-gray-50">
                            <td className="p-2 text-center font-medium border text-sm">
                              {grade.grade_value}/{grade.max_grade}
                              <div className="text-xs text-gray-600">
                                ({((parseFloat(grade.grade_value) / parseFloat(grade.max_grade)) * 100).toFixed(1)}%)
                              </div>
                            </td>
                            {!['السلوك', 'سلوك', 'السيرة', 'سيرة', 'العقيدة', 'عقيدة', 'الفقه', 'فقه'].includes(selectedCourse.name.toLowerCase()) && (
                              <td className="p-2 text-center text-xs border">
                                {grade.start_reference && grade.end_reference 
                                  ? `${grade.start_reference} - ${grade.end_reference}`
                                  : grade.start_reference || '-'
                                }
                              </td>
                            )}
                            <td className="p-2 text-center text-xs border">
                              {new Date(grade.date_graded || grade.created_at).toLocaleDateString('ar-SA', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="p-2 text-xs border">
                              {grade.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {(!studentData.grades?.filter(grade => grade.course_id === selectedCourse.id).length) && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        لا توجد درجات سابقة لهذه المادة
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        <div className="flex justify-between mt-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            العودة لقائمة الطلاب
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};


export default function ClassManagement() {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [userRole, setUserRole] = useState("admin"); // TODO: Get from auth context
  const [userSchoolId, setUserSchoolId] = useState(null); // TODO: Get from auth context
  
  const [newClass, setNewClass] = useState({
    name: "",
    school_id: "",
    semester_id: "",
    school_level: "",
    teacher_id: "",
    max_students: 20,
    is_active: true
  });

  useEffect(() => {
    fetchClasses();
    fetchSchools();
    fetchTeachers();
    fetchSemesters();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/classes`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الحلقات");
    } finally {
      setLoading(false);
    }
  };

  const fetchSchools = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/schools`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSchools(response.data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/teachers?user_type=teacher`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTeachers(response.data.teachers || []);
    } catch (err) {
      console.error('Error fetching teachers:', err);
    }
  };

  const fetchSemesters = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/semesters`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setSemesters(response.data || []);
    } catch (err) {
      console.error('Error fetching semesters:', err);
    }
  };


  const handleAddClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE}/api/classes`, newClass, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setShowAddModal(false);
      setNewClass({
        name: "",
        school_id: "",
        semester_id: "",
        school_level: "",
        teacher_id: "",
        max_students: 20,
        is_active: true
      });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة الحلقة");
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_BASE}/api/classes/${editingClass.id}`, editingClass, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      setEditingClass(null);
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث الحلقة");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا الفصل؟")) {
      try {
        await axios.delete(`${API_BASE}/api/classes/${classId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchClasses();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف الحلقة");
      }
    }
  };

  const toggleClassStatus = async (classId, currentStatus) => {
    try {
      await axios.put(`${API_BASE}/api/classes/${classId}`, {
        is_active: !currentStatus
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تغيير حالة الفصل");
    }
  };

  const canManageClass = (classData) => {
    if (userRole === 'admin') return true;
    if (userRole === 'administrator' && classData.school_id === userSchoolId) return true;
    return false;
  };

  const getFilteredSchools = () => {
    if (userRole === 'admin') return schools;
    if (userRole === 'administrator' && userSchoolId) {
      return schools.filter(school => school.id === userSchoolId);
    }
    return [];
  };

  const getFilteredClasses = () => {
    if (userRole === 'admin') return classes;
    if (userRole === 'administrator' && userSchoolId) {
      return classes.filter(cls => cls.school_id === userSchoolId);
    }
    return classes;
  };

  const getFilteredTeachers = (schoolId) => {
    if (!schoolId) return [];
    return teachers.filter(teacher => teacher.school_id === schoolId);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة الحلقة</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
        >
          <AiOutlinePlus /> إضافة حلقة جديدة
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {getFilteredClasses().map((classItem) => (
          <div key={classItem.id} className="bg-white rounded-lg shadow-md p-6 border">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-[var(--color-primary-700)]">{classItem.name}</h3>
              <span className={`px-2 py-1 rounded text-sm ${
                classItem.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {classItem.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            
            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p><strong>مجمع الحلقات:</strong> {classItem.school_name}</p>
              {classItem.teacher_name && <p><strong>المعلم:</strong> {classItem.teacher_name}</p>}
              <p><strong>الحد الأقصى:</strong> {classItem.max_students} طالب</p>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedClassForStudents(classItem)}
                className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <AiOutlineUser /> قائمة الطلاب
              </button>
              
              {canManageClass(classItem) && (
                <>
                  <button
                    onClick={() => setEditingClass(classItem)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    <AiOutlineEdit /> تعديل
                  </button>
                  
                  <button
                    onClick={() => toggleClassStatus(classItem.id, classItem.is_active)}
                    className={`flex items-center gap-1 px-3 py-1 rounded text-white ${
                      classItem.is_active 
                        ? 'bg-red-500 hover:bg-red-600' 
                        : 'bg-green-500 hover:bg-green-600'
                    }`}
                  >
                    {classItem.is_active ? 'إلغاء التفعيل' : 'تفعيل'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteClass(classItem.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    <AiOutlineDelete /> حذف
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {getFilteredClasses().length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد حلقات مسجلة</p>
        </div>
      )}

      {showAddModal && (
        <ClassForm
          classData={newClass}
          onSubmit={handleAddClass}
          onCancel={() => setShowAddModal(false)}
          isEditing={false}
          onClassChange={setNewClass}
          schools={schools}
          teachers={teachers}
          semesters={semesters}
          getFilteredSchools={getFilteredSchools}
          getFilteredTeachers={getFilteredTeachers}
        />
      )}

      {editingClass && (
        <ClassForm
          classData={editingClass}
          onSubmit={handleEditClass}
          onCancel={() => setEditingClass(null)}
          isEditing={true}
          onClassChange={setEditingClass}
          schools={schools}
          teachers={teachers}
          semesters={semesters}
          getFilteredSchools={getFilteredSchools}
          getFilteredTeachers={getFilteredTeachers}
        />
      )}

      {selectedClassForStudents && (
        <StudentListModal
          classItem={selectedClassForStudents}
          onClose={() => setSelectedClassForStudents(null)}
        />
      )}
    </div>
  );
}