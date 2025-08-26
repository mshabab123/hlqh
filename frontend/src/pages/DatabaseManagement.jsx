import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AiOutlineDatabase, AiOutlineTable, AiOutlineRight, AiOutlineReload, AiOutlineSearch } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function DatabaseManagement() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/database/tables`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTables(response.data.tables || []);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل جداول قاعدة البيانات");
    } finally {
      setLoading(false);
    }
  };

  const handleTableClick = (tableName) => {
    navigate(`/database/table/${tableName}`);
  };

  const filteredTables = tables.filter(table => 
    table.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTableIcon = (tableName) => {
    const icons = {
      users: "👤",
      students: "🎓",
      teachers: "👨‍🏫",
      parents: "👨‍👩‍👧‍👦",
      schools: "🏫",
      classes: "👥",
      courses: "📚",
      grades: "📝",
      attendance: "📋",
      semesters: "📅",
      administrators: "👔"
    };
    return icons[tableName] || "📊";
  };

  const getTableDescription = (tableName) => {
    const descriptions = {
      users: "جدول المستخدمين الرئيسي",
      students: "بيانات الطلاب",
      teachers: "بيانات المعلمين",
      parents: "بيانات أولياء الأمور",
      schools: "بيانات مجمعات الحلقات",
      classes: "بيانات الحلقات",
      courses: "بيانات المقررات",
      grades: "درجات الطلاب",
      attendance: "سجلات الحضور والغياب",
      semesters: "الفصول الدراسية",
      administrators: "مديري المجمعات"
    };
    return descriptions[tableName] || "جدول بيانات";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري تحميل جداول قاعدة البيانات...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto" dir="rtl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <AiOutlineDatabase className="text-3xl text-[var(--color-primary-700)]" />
            <h1 className="text-3xl font-bold text-[var(--color-primary-700)]">إدارة قاعدة البيانات</h1>
          </div>
          <button
            onClick={fetchTables}
            className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
          >
            <AiOutlineReload /> تحديث
          </button>
        </div>
        
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
          <p className="font-bold">تنبيه مهم:</p>
          <p>هذه الصفحة مخصصة للمسؤولين فقط. كن حذراً عند تعديل أو حذف البيانات.</p>
        </div>

        <div className="relative">
          <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="البحث في الجداول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTables.map((table) => (
          <div
            key={table}
            onClick={() => handleTableClick(table)}
            className="bg-white rounded-lg shadow-md p-6 border hover:shadow-lg transition-shadow cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{getTableIcon(table)}</div>
                <div>
                  <h3 className="text-lg font-bold text-[var(--color-primary-700)]">
                    {table}
                  </h3>
                  <p className="text-sm text-gray-600">{getTableDescription(table)}</p>
                </div>
              </div>
              <AiOutlineRight className="text-gray-400 group-hover:text-[var(--color-primary-500)] transition-colors" />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <AiOutlineTable />
              <span>عرض وإدارة السجلات</span>
            </div>
          </div>
        ))}
      </div>

      {filteredTables.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">لا توجد جداول مطابقة للبحث</p>
        </div>
      )}
    </div>
  );
}