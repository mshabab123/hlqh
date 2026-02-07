import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AiOutlineEdit, AiOutlineDelete, AiOutlinePlus, AiOutlineArrowLeft, AiOutlineReload, AiOutlineSearch, AiOutlineSave, AiOutlineClose } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

const EditModal = ({ record, columns, onSave, onCancel, isNew = false }) => {
  const [formData, setFormData] = useState(isNew ? {} : record);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const getInputType = (columnName, columnType) => {
    if (columnName.includes('password')) return 'password';
    if (columnName.includes('email')) return 'email';
    if (columnType.includes('int') || columnType.includes('decimal')) return 'number';
    if (columnType.includes('date')) return 'date';
    if (columnType.includes('text')) return 'textarea';
    return 'text';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl max-w-3xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-[var(--color-primary-700)]">
          {isNew ? "إضافة سجل جديد" : "تعديل السجل"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {columns.map((column) => {
              const inputType = getInputType(column.name, column.type);
              const isReadOnly = column.key === 'PRI' && !isNew;
              
              return (
                <div key={column.name} className={inputType === 'textarea' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium mb-1">
                    {column.name} {column.nullable === 'NO' && !column.default ? '*' : ''}
                  </label>
                  
                  {inputType === 'textarea' ? (
                    <textarea
                      value={formData[column.name] || ''}
                      onChange={(e) => setFormData({...formData, [column.name]: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required={column.nullable === 'NO' && !column.default}
                      readOnly={isReadOnly}
                    />
                  ) : (
                    <input
                      type={inputType}
                      value={formData[column.name] || ''}
                      onChange={(e) => setFormData({...formData, [column.name]: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required={column.nullable === 'NO' && !column.default}
                      readOnly={isReadOnly}
                    />
                  )}
                  
                  <span className="text-xs text-gray-500">
                    {column.type} {column.default && `(افتراضي: ${column.default})`}
                  </span>
                </div>
              );
            })}
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              <AiOutlineClose /> إلغاء
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary-500)] text-white rounded-lg hover:bg-[var(--color-primary-600)]"
            >
              <AiOutlineSave /> حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DatabaseTableDetails() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingRecord, setEditingRecord] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const recordsPerPage = 20;

  useEffect(() => {
    fetchTableData();
  }, [tableName, currentPage]);

  const fetchTableData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/database/table/${tableName}`, {
        params: {
          page: currentPage,
          limit: recordsPerPage,
          search: searchQuery
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setRecords(response.data.records || []);
      setColumns(response.data.columns || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل بيانات الجدول");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (formData) => {
    try {
      await axios.post(`${API_BASE}/api/database/table/${tableName}/record`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setShowAddModal(false);
      fetchTableData();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في إضافة السجل");
    }
  };

  const handleEdit = async (formData) => {
    try {
      const primaryKey = columns.find(col => col.key === 'PRI')?.name;
      const id = editingRecord[primaryKey];
      
      await axios.put(`${API_BASE}/api/database/table/${tableName}/record/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setEditingRecord(null);
      fetchTableData();
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحديث السجل");
    }
  };

  const handleDelete = async (record) => {
    const primaryKey = columns.find(col => col.key === 'PRI')?.name;
    const id = record[primaryKey];
    
    if (window.confirm("هل أنت متأكد من حذف هذا السجل؟ هذا الإجراء لا يمكن التراجع عنه.")) {
      try {
        await axios.delete(`${API_BASE}/api/database/table/${tableName}/record/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        fetchTableData();
      } catch (err) {
        setError(err.response?.data?.error || "فشل في حذف السجل");
      }
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchTableData();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">جاري تحميل بيانات الجدول...</div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-full mx-auto" dir="rtl">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/database')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <AiOutlineArrowLeft />
            </button>
            <h1 className="text-2xl font-bold text-[var(--color-primary-700)]">
              جدول: {tableName}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchTableData}
              className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
            >
              <AiOutlineReload /> تحديث
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-[var(--color-primary-500)] text-white px-4 py-2 rounded-lg hover:bg-[var(--color-primary-600)]"
            >
              <AiOutlinePlus /> إضافة سجل
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <AiOutlineSearch className="absolute right-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="البحث في السجلات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full p-3 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            بحث
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((column) => (
                  <th key={column.name} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {column.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  {columns.map((column) => (
                    <td key={column.name} className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {column.name.includes('password') ? '••••••••' : 
                       record[column.name] === null ? '-' : 
                       String(record[column.name]).length > 50 ? 
                       String(record[column.name]).substring(0, 50) + '...' : 
                       String(record[column.name])}
                    </td>
                  ))}
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <AiOutlineEdit className="text-lg" />
                      </button>
                      <button
                        onClick={() => handleDelete(record)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <AiOutlineDelete className="text-lg" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {records.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">لا توجد سجلات</p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            السابق
          </button>
          <span className="px-4 py-2">
            الصفحة {currentPage} من {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            التالي
          </button>
        </div>
      )}

      {showAddModal && (
        <EditModal
          record={{}}
          columns={columns}
          onSave={handleAdd}
          onCancel={() => setShowAddModal(false)}
          isNew={true}
        />
      )}

      {editingRecord && (
        <EditModal
          record={editingRecord}
          columns={columns}
          onSave={handleEdit}
          onCancel={() => setEditingRecord(null)}
          isNew={false}
        />
      )}
    </div>
  );
}