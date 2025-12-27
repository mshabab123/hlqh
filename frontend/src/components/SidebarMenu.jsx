import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  AiOutlineHome,
  AiOutlineUser,
  AiOutlineDashboard,
  AiOutlineTeam,
  AiOutlineFileText,
  AiOutlineSetting,
  AiOutlineBook,
  AiOutlineMenu,
  AiOutlineClose
} from "react-icons/ai";
import {
  FaChalkboardTeacher,
  FaSchool,
  FaUsers,
  FaUserGraduate,
  FaUserTie
} from "react-icons/fa";

const SidebarMenu = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Check if user has access to a specific route
  const hasAccess = (requiredRoles) => {
    if (!user || !user.role) return false;
    if (!requiredRoles) return true;
    if (Array.isArray(requiredRoles)) {
      return requiredRoles.includes(user.role);
    }
    return user.role === requiredRoles;
  };

  // Define menu items based on user role
  const menuItems = [
    {
      section: "الرئيسية",
      items: [
        { title: "الصفحة الرئيسية", path: "/home", icon: <AiOutlineHome />, roles: null },
        { title: "لوحة التحكم", path: "/dashboard", icon: <AiOutlineDashboard />, roles: null }
      ]
    },
    {
      section: "الإدارة",
      items: [
        { title: "مجمع الحلقات", path: "/schools", icon: <FaSchool />, roles: ["admin"] },
        { title: "الحلقات", path: "/classes", icon: <FaUsers />, roles: ["admin", "administrator"] },
        { title: "المعلمين", path: "/teachers", icon: <FaChalkboardTeacher />, roles: ["admin", "supervisor", "administrator"] },
        { title: "الطلاب", path: "/students", icon: <FaUserGraduate />, roles: ["admin", "supervisor", "administrator", "teacher"] },
        { title: "أولياء الأمور", path: "/parents", icon: <AiOutlineTeam />, roles: ["admin", "supervisor", "administrator"] }
      ]
    },
    {
      section: "التقارير",
      items: [
        { title: "التقارير", path: "/reports", icon: <AiOutlineFileText />, roles: ["admin", "supervisor", "administrator", "teacher"] },
        { title: "الحضور", path: "/attendance", icon: <AiOutlineBook />, roles: ["admin", "administrator", "teacher"] }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-20 right-4 z-50 p-2 bg-primary-600 text-white rounded-lg shadow-lg hover:bg-primary-700 transition-colors"
      >
        {isOpen ? <AiOutlineClose size={24} /> : <AiOutlineMenu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-16 right-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-lg z-45
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          lg:translate-x-0 lg:static lg:h-full lg:shadow-none lg:border-l border-gray-200
        `}
        dir="rtl"
      >
        <div className="h-full overflow-y-auto p-4">
          {menuItems.map((section, sectionIdx) => {
            // Filter items based on access
            const accessibleItems = section.items.filter(item => hasAccess(item.roles));
            
            if (accessibleItems.length === 0) return null;

            return (
              <div key={sectionIdx} className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                  {section.section}
                </h3>
                <ul className="space-y-1">
                  {accessibleItems.map((item, idx) => {
                    const isActive = location.pathname === item.path;
                    return (
                      <li key={idx}>
                        <Link
                          to={item.path}
                          onClick={() => setIsOpen(false)}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                            ${isActive
                              ? "bg-primary-50 text-primary-700 font-semibold"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                            }
                          `}
                        >
                          <span className={`text-xl ${isActive ? "text-primary-600" : "text-gray-400"}`}>
                            {item.icon}
                          </span>
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};

export default SidebarMenu;