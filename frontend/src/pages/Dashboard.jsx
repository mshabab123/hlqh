import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AiOutlineDatabase, AiOutlineKey, AiOutlineUserSwitch, AiOutlineBarChart, AiOutlineTeam, AiOutlineBook, AiOutlineCalendar, AiOutlineRight, AiOutlineLoading3Quarters } from "react-icons/ai";

const API_BASE = import.meta.env.VITE_API_BASE || "";

export default function Dashboard() {
  const [userRole, setUserRole] = useState(null);
  const [userName, setUserName] = useState("");
  const [stats, setStats] = useState({});
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setUserRole(user.role);
      setUserName(`${user.first_name} ${user.last_name}`);
    }
    fetchStats();
    fetchActivities();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/api/dashboard/stats`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setStats(response.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || "فشل في تحميل الإحصائيات");
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      setActivitiesLoading(true);
      const response = await axios.get(`${API_BASE}/api/dashboard/activities`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setActivities(response.data.activities);
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const adminManagementCards = [
    {
      title: "إدارة قاعدة البيانات",
      description: "عرض وتحرير جميع جداول قاعدة البيانات",
      icon: <AiOutlineDatabase className="text-4xl" />,
      path: "/database",
      color: "from-blue-500 to-blue-700",
      roles: ["admin"],
      warning: "تحذير: إدارة متقدمة للبيانات"
    },
    {
      title: "إدارة كلمات المرور",
      description: userRole === 'admin' ? "تغيير كلمات المرور لجميع المستخدمين" : "تغيير كلمات المرور للطلاب في مجمعك",
      icon: <AiOutlineKey className="text-4xl" />,
      path: "/password-management",
      color: "from-green-500 to-green-700",
      roles: ["admin", "administrator"]
    },
    {
      title: "إدارة الصلاحيات",
      description: "تعديل أدوار المستخدمين وصلاحياتهم",
      icon: <AiOutlineUserSwitch className="text-4xl" />,
      path: "/user-management",
      color: "from-purple-500 to-purple-700",
      roles: ["admin"]
    }
  ];

  const getQuickStats = () => {
    if (userRole === 'admin') {
      return [
        {
          title: "إجمالي الطلاب",
          value: stats.students || 0,
          icon: <AiOutlineTeam className="text-3xl" />,
          color: "bg-blue-500"
        },
        {
          title: "المعلمون النشطون",
          value: stats.teachers || 0,
          icon: <AiOutlineBook className="text-3xl" />,
          color: "bg-green-500"
        },
        {
          title: "الفصول الدراسية",
          value: stats.classes || 0,
          icon: <AiOutlineCalendar className="text-3xl" />,
          color: "bg-purple-500"
        },
        {
          title: "المجمعات",
          value: stats.schools || 0,
          icon: <AiOutlineBarChart className="text-3xl" />,
          color: "bg-orange-500"
        }
      ];
    } else if (userRole === 'administrator' || userRole === 'supervisor') {
      return [
        {
          title: "الطلاب في المجمع",
          value: stats.students || 0,
          icon: <AiOutlineTeam className="text-3xl" />,
          color: "bg-blue-500"
        },
        {
          title: "المعلمون",
          value: stats.teachers || 0,
          icon: <AiOutlineBook className="text-3xl" />,
          color: "bg-green-500"
        },
        {
          title: "الحلقات",
          value: stats.classes || 0,
          icon: <AiOutlineCalendar className="text-3xl" />,
          color: "bg-purple-500"
        }
      ];
    } else if (userRole === 'teacher') {
      return [
        {
          title: "طلابي",
          value: stats.students || 0,
          icon: <AiOutlineTeam className="text-3xl" />,
          color: "bg-blue-500"
        },
        {
          title: "حلقاتي",
          value: stats.classes || 0,
          icon: <AiOutlineCalendar className="text-3xl" />,
          color: "bg-purple-500"
        }
      ];
    } else if (userRole === 'parent') {
      return [
        {
          title: "أطفالي",
          value: stats.children || 0,
          icon: <AiOutlineTeam className="text-3xl" />,
          color: "bg-blue-500"
        }
      ];
    }
    return [];
  };

  const handleCardClick = (path) => {
    navigate(path);
  };

  const hasAccess = (requiredRoles) => {
    if (!requiredRoles || !userRole) return false;
    return requiredRoles.includes(userRole);
  };

  const getRoleDisplayName = (role) => {
    const roles = {
      admin: "مدير عام",
      administrator: "مدير مجمع",
      supervisor: "مشرف",
      teacher: "معلم",
      parent: "ولي أمر",
      student: "طالب"
    };
    return roles[role] || role;
  };

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <div className="bg-gradient-to-r from-[var(--color-primary-600)] to-[var(--color-primary-800)] text-white p-6 rounded-xl shadow-lg">
          <h1 className="text-xl sm:text-3xl font-bold mb-2">مرحباً، {userName}</h1>
          <p className="text-lg opacity-90">
            {getRoleDisplayName(userRole)} - لوحة التحكم الرئيسية
            {userRole === 'administrator' && stats.schoolName && (
              <span className="block text-sm mt-1">المجمع: {stats.schoolName}</span>
            )}
          </p>
          <p className="text-sm opacity-75 mt-2">
            {new Date().toLocaleDateString('ar-SA', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <AiOutlineLoading3Quarters className="animate-spin text-4xl text-[var(--color-primary-500)]" />
          <span className="mr-2 text-lg">جاري تحميل الإحصائيات...</span>
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {getQuickStats().map((stat, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
                </div>
                <div className={`${stat.color} text-white p-3 rounded-full`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Management Cards */}
      {(userRole === 'admin' || userRole === 'administrator') && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">أدوات الإدارة المتقدمة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminManagementCards
              .filter(card => hasAccess(card.roles))
              .map((card, index) => (
                <div
                  key={index}
                  onClick={() => handleCardClick(card.path)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 border overflow-hidden group"
                >
                  <div className={`bg-gradient-to-r ${card.color} text-white p-6 relative`}>
                    <div className="flex items-center justify-between">
                      <div className="text-white opacity-90">
                        {card.icon}
                      </div>
                      <AiOutlineRight className="text-white opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="text-xl font-bold mt-4">{card.title}</h3>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-600 mb-4">{card.description}</p>
                    {card.warning && (
                      <div className="bg-amber-50 border-l-4 border-amber-400 p-3 rounded">
                        <p className="text-amber-700 text-sm font-medium">{card.warning}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-md p-6 border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">النشاط الأخير</h2>
        
        {activitiesLoading ? (
          <div className="flex justify-center items-center py-8">
            <AiOutlineLoading3Quarters className="animate-spin text-2xl text-[var(--color-primary-500)]" />
            <span className="mr-2">جاري تحميل النشاطات...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>لا توجد نشاطات حديثة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const getActivityIcon = (iconType) => {
                switch (iconType) {
                  case 'student':
                    return <AiOutlineTeam className="text-blue-600" />;
                  case 'teacher':
                    return <AiOutlineBook className="text-green-600" />;
                  case 'parent':
                    return <AiOutlineTeam className="text-purple-600" />;
                  case 'child':
                    return <AiOutlineTeam className="text-cyan-600" />;
                  default:
                    return <AiOutlineBarChart className="text-orange-600" />;
                }
              };
              
              const getTimeAgo = (time) => {
                const now = new Date();
                const activityTime = new Date(time);
                const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
                
                if (diffInMinutes < 60) {
                  return `منذ ${diffInMinutes} دقيقة`;
                } else if (diffInMinutes < 1440) {
                  const hours = Math.floor(diffInMinutes / 60);
                  return `منذ ${hours} ساعة`;
                } else {
                  const days = Math.floor(diffInMinutes / 1440);
                  return `منذ ${days} يوم`;
                }
              };
              
              return (
                <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className={`p-2 rounded-full ${
                    activity.icon === 'student' ? 'bg-blue-100' :
                    activity.icon === 'teacher' ? 'bg-green-100' :
                    activity.icon === 'parent' ? 'bg-purple-100' :
                    activity.icon === 'child' ? 'bg-cyan-100' :
                    'bg-orange-100'
                  }`}>
                    {getActivityIcon(activity.icon)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.title}</p>
                    <p className="text-sm text-gray-600">{activity.subtitle}</p>
                    <p className="text-xs text-gray-500">{getTimeAgo(activity.time)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}