import SidebarMenu from "./SidebarMenu";

const Layout = ({ children, showSidebar = false }) => {
  return (
    <div className="min-h-screen" dir="rtl">
      <div className={`flex ${showSidebar ? 'gap-0' : ''}`}>
        {showSidebar && <SidebarMenu />}
        <main className={`flex-1 p-4 lg:p-6 ${showSidebar ? 'lg:mr-64' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;