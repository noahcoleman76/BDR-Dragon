import React from "react";
import NavBar from "./NavBar";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <main className="flex-1 bg-slate-100 dark:bg-slate-900 p-4">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
