import { useState, useEffect } from "react";
import { 
  AiOutlineSearch, 
  AiOutlineCheckCircle, 
  AiOutlineCloseCircle, 
  AiOutlineUser, 
  AiOutlineTeam, 
  AiOutlinePhone, 
  AiOutlineMail,
  AiOutlineEye,
  AiOutlineEdit,
  AiOutlineUserAdd,
  AiOutlineReload,
  AiOutlinePlus,
  AiOutlineClose,
  AiOutlineSave
} from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function ParentManagement() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, active, inactive
  const [selectedParent, setSelectedParent] = useState(null);
  const [showStudents, setShowStudents] = useState({});
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [linkingStudent, setLinkingStudent] = useState(false);

  // Load parents data
  useEffect(() => {
    loadParents();
  }, []);

  const loadParents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/parents/management/list`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setParents(data.parents || []);
      } else {
        console.error('Failed to load parents');
      }
    } catch (error) {
      console.error('Error loading parents:', error);
    }
    setLoading(false);
  };

  // Load students for a specific parent
  const loadParentStudents = async (parentId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/parents/management/${parentId}/students`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(prev => ({
          ...prev,
          [parentId]: data.students || []
        }));
      }
    } catch (error) {
      console.error('Error loading parent students:', error);
    }
  };

  // Toggle parent activation status
  const toggleParentStatus = async (parentId, currentStatus) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/parents/management/${parentId}/toggle-status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          is_active: !currentStatus
        })
      });

      if (response.ok) {
        // Update local state
        setParents(prev => prev.map(parent => 
          parent.id === parentId 
            ? { ...parent, is_active: !currentStatus }
            : parent
        ));
      } else {
        console.error('Failed to update parent status');
      }
    } catch (error) {
      console.error('Error updating parent status:', error);
    }
  };

  // Toggle showing students for a parent
  const toggleShowStudents = (parentId) => {
    const isCurrentlyShowing = showStudents[parentId];
    
    if (!isCurrentlyShowing) {
      // Load students if not already loaded
      if (!students[parentId]) {
        loadParentStudents(parentId);
      }
    }
    
    setShowStudents(prev => ({
      ...prev,
      [parentId]: !isCurrentlyShowing
    }));
  };

  // Load available students
  const loadAvailableStudents = async () => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/students/available`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableStudents(data.students || []);
      } else {
        console.error('Failed to load available students');
      }
    } catch (error) {
      console.error('Error loading available students:', error);
    }
    setLoadingStudents(false);
  };

  // Open add child modal
  const openAddChildModal = (parent) => {
    setSelectedParent(parent);
    setSelectedStudentId('');
    setStudentSearchTerm('');
    setShowAddChildModal(true);
    loadAvailableStudents();
  };

  // Link student to parent
  const linkStudentToParent = async () => {
    if (!selectedStudentId) {
      alert('يرجى اختيار طالب');
      return;
    }

    setLinkingStudent(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/parents/${selectedParent.id}/link-child`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          childId: selectedStudentId,
          relationshipType: 'parent'
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert('تم ربط الطالب بولي الأمر بنجاح');
        
        // Refresh the students list for this parent
        if (showStudents[selectedParent.id]) {
          loadParentStudents(selectedParent.id);
        }
        
        // Refresh available students list
        loadAvailableStudents();
        
        // Close modal
        setShowAddChildModal(false);
        setSelectedParent(null);
      } else {
        const error = await response.json();
        alert(error.error || 'فشل في ربط الطالب');
      }
    } catch (error) {
      console.error('Error linking student:', error);
      alert('حدث خطأ في ربط الطالب');
    }
    setLinkingStudent(false);
  };

  // Filter available students based on search
  const filteredAvailableStudents = availableStudents.filter(student => {
    const searchTerm = studentSearchTerm.toLowerCase();
    return (
      student.first_name?.toLowerCase().includes(searchTerm) ||
      student.second_name?.toLowerCase().includes(searchTerm) ||
      student.third_name?.toLowerCase().includes(searchTerm) ||
      student.last_name?.toLowerCase().includes(searchTerm) ||
      student.id?.toString().includes(searchTerm)
    );
  });

  // Filter parents based on search and status
  const filteredParents = parents.filter(parent => {
    const matchesSearch = 
      parent.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.phone?.includes(searchTerm);

    const matchesStatus = 
      filterStatus === "all" ||
      (filterStatus === "active" && parent.is_active) ||
      (filterStatus === "inactive" && !parent.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-[var(--color-primary-100)] p-3 rounded-full">
                <AiOutlineTeam className="text-2xl text-[var(--color-primary-700)]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">إدارة أولياء الأمور</h1>
                <p className="text-gray-600">تفعيل أولياء الأمور وعرض طلابهم</p>
              </div>
            </div>
            
            <button
              onClick={loadParents}
              disabled={loading}
              className="bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <AiOutlineReload className={loading ? "animate-spin" : ""} />
              تحديث
            </button>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="البحث بالاسم أو البريد الإلكتروني أو الهاتف..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent"
              />
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent"
            >
              <option value="all">جميع أولياء الأمور</option>
              <option value="active">المفعلون</option>
              <option value="inactive">غير المفعلين</option>
            </select>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">إجمالي أولياء الأمور</h3>
                <p className="text-2xl font-bold text-gray-900">{parents.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <AiOutlineUser className="text-xl text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">المفعلون</h3>
                <p className="text-2xl font-bold text-green-600">
                  {parents.filter(p => p.is_active).length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <AiOutlineCheckCircle className="text-xl text-green-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-600">غير المفعلين</h3>
                <p className="text-2xl font-bold text-red-600">
                  {parents.filter(p => !p.is_active).length}
                </p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AiOutlineCloseCircle className="text-xl text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Parents List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">
              قائمة أولياء الأمور ({filteredParents.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <AiOutlineReload className="animate-spin text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل البيانات...</p>
            </div>
          ) : filteredParents.length === 0 ? (
            <div className="p-12 text-center">
              <AiOutlineUser className="text-4xl text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد نتائج للبحث الحالي</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredParents.map((parent) => (
                <div key={parent.id} className="p-6">
                  {/* Parent Info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${
                        parent.is_active ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        <AiOutlineUser className={`text-xl ${
                          parent.is_active ? 'text-green-600' : 'text-red-600'
                        }`} />
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {parent.first_name} {parent.second_name} {parent.third_name} {parent.last_name}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <AiOutlineMail />
                            {parent.email}
                          </span>
                          {parent.phone && (
                            <span className="flex items-center gap-1">
                              <AiOutlinePhone />
                              {parent.phone}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
                            parent.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {parent.is_active ? (
                              <>
                                <AiOutlineCheckCircle />
                                مفعل
                              </>
                            ) : (
                              <>
                                <AiOutlineCloseCircle />
                                غير مفعل
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAddChildModal(parent)}
                        className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition-colors"
                      >
                        <AiOutlinePlus />
                        إضافة ابن
                      </button>
                      
                      <button
                        onClick={() => toggleShowStudents(parent.id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition-colors"
                      >
                        <AiOutlineEye />
                        {showStudents[parent.id] ? 'إخفاء الطلاب' : 'عرض الطلاب'}
                      </button>
                      
                      <button
                        onClick={() => toggleParentStatus(parent.id, parent.is_active)}
                        className={`px-3 py-2 rounded-lg flex items-center gap-1 text-sm transition-colors ${
                          parent.is_active
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-500 hover:bg-green-600 text-white'
                        }`}
                      >
                        {parent.is_active ? (
                          <>
                            <AiOutlineCloseCircle />
                            إلغاء التفعيل
                          </>
                        ) : (
                          <>
                            <AiOutlineCheckCircle />
                            تفعيل
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Students List */}
                  {showStudents[parent.id] && (
                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                      <h4 className="text-md font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <AiOutlineTeam />
                        طلاب ولي الأمر
                      </h4>
                      
                      {students[parent.id] ? (
                        students[parent.id].length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {students[parent.id].map((student) => (
                              <div key={student.id} className="bg-white rounded-lg p-3 shadow-sm">
                                <h5 className="font-medium text-gray-800">
                                  {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                                </h5>
                                <p className="text-sm text-gray-600 mt-1">
                                  الصف: {student.class_name || 'غير محدد'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  العمر: {student.age || 'غير محدد'} سنة
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-600 text-center py-4">
                            لا يوجد طلاب مسجلين لهذا الولي
                          </p>
                        )
                      ) : (
                        <div className="text-center py-4">
                          <AiOutlineReload className="animate-spin text-xl text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600">جاري تحميل الطلاب...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Child Modal */}
        {showAddChildModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
              <div className="bg-[var(--color-primary-600)] text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <AiOutlinePlus />
                    ربط ابن موجود
                  </h2>
                  <button
                    onClick={() => setShowAddChildModal(false)}
                    className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
                  >
                    <AiOutlineClose />
                  </button>
                </div>
                {selectedParent && (
                  <p className="text-white/90 mt-2">
                    ولي الأمر: {selectedParent.first_name} {selectedParent.second_name} {selectedParent.third_name} {selectedParent.last_name}
                  </p>
                )}
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Search Input */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    البحث عن الطلاب
                  </label>
                  <div className="relative">
                    <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      placeholder="ابحث بالاسم أو رقم الهوية..."
                      className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary-500)] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Students List */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    اختر الطالب *
                  </label>
                  
                  {loadingStudents ? (
                    <div className="text-center py-8">
                      <AiOutlineReload className="animate-spin text-3xl text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">جاري تحميل الطلاب...</p>
                    </div>
                  ) : filteredAvailableStudents.length === 0 ? (
                    <div className="text-center py-8">
                      <AiOutlineUser className="text-3xl text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {studentSearchTerm ? 'لا توجد نتائج للبحث' : 'لا يوجد طلاب متاحون'}
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      {filteredAvailableStudents.map((student) => (
                        <div
                          key={student.id}
                          className={`p-3 border-b border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${
                            selectedStudentId === student.id ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-200)]' : ''
                          }`}
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="selectedStudent"
                              checked={selectedStudentId === student.id}
                              onChange={() => setSelectedStudentId(student.id)}
                              className="text-[var(--color-primary-600)] focus:ring-[var(--color-primary-500)]"
                            />
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-800">
                                {student.first_name} {student.second_name} {student.third_name} {student.last_name}
                              </h4>
                              <div className="text-sm text-gray-600 mt-1">
                                <span className="inline-block ml-4">رقم الهوية: {student.id}</span>
                                {student.age && <span className="inline-block ml-4">العمر: {student.age} سنة</span>}
                                {student.school_level && <span className="inline-block">المرحلة: {student.school_level}</span>}
                              </div>
                              {student.class_name && (
                                <p className="text-sm text-blue-600 mt-1">
                                  الصف الحالي: {student.class_name}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Student Info */}
                {selectedStudentId && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-green-800 mb-2">الطالب المختار:</h4>
                    {(() => {
                      const selectedStudent = availableStudents.find(s => s.id === selectedStudentId);
                      return selectedStudent ? (
                        <div>
                          <p className="text-green-700">
                            <strong>{selectedStudent.first_name} {selectedStudent.second_name} {selectedStudent.third_name} {selectedStudent.last_name}</strong>
                          </p>
                          <p className="text-sm text-green-600 mt-1">
                            رقم الهوية: {selectedStudent.id}
                            {selectedStudent.age && ` • العمر: ${selectedStudent.age} سنة`}
                            {selectedStudent.school_level && ` • المرحلة: ${selectedStudent.school_level}`}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={linkStudentToParent}
                    disabled={linkingStudent || !selectedStudentId}
                    className="flex-1 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {linkingStudent ? (
                      <>
                        <AiOutlineReload className="animate-spin" />
                        جاري الربط...
                      </>
                    ) : (
                      <>
                        <AiOutlineSave />
                        ربط الطالب
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setShowAddChildModal(false)}
                    disabled={linkingStudent}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}