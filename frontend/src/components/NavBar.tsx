import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import DarkModeToggle from "./DarkModeToggle";

const NavBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="flex items-center gap-4">
        <span className="font-bold text-lg">BDR Dragon</span>
        {user && (
          <div className="flex gap-3 text-sm">
            <Link to="/" className="hover:underline">
              Dashboard
            </Link>
            <Link to="/forecast" className="hover:underline">
              Forecast
            </Link>
            <Link to="/tasks" className="hover:underline">
              Tasks
            </Link>
            <Link to="/market" className="hover:underline">
              Market
            </Link>
            <Link to="/account" className="hover:underline">
              Account
            </Link>
            {user.role === "ADMIN" && (
              <Link to="/admin" className="hover:underline">
                Admin
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <DarkModeToggle />
        {user && (
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1 rounded bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
