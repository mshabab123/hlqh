import { AiOutlineMenu } from "react-icons/ai";

const MobileHeader = ({ onMenuClick }) => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 bg-gradient-to-r from-[var(--color-primary-700)] to-[var(--color-primary-900)] text-white shadow-lg z-30" dir="rtl">
      <div className="flex items-center justify-between p-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="فتح القائمة"
        >
          <AiOutlineMenu className="text-2xl" />
        </button>
        
        <div className="flex items-center gap-2">
          <img
            src="/logo.svg"
            alt="شعار المنصة"
            className="h-8 w-8 object-contain rounded-full"
            loading="lazy"
          />
          <div>
            <h1 className="font-bold text-lg">منصة الحلقات</h1>
          </div>
        </div>
        
        <div className="text-sm">
          <p className="font-medium">{user.first_name}</p>
        </div>
      </div>
    </div>
  );
};

export default MobileHeader;