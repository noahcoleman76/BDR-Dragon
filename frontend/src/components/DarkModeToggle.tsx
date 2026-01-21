import React, { useEffect, useState } from "react";

const DarkModeToggle: React.FC = () => {
  const [dark, setDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [dark]);

  return (
    <button
      className="px-3 py-1 text-sm rounded border border-slate-500"
      onClick={() => setDark((d) => !d)}
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
};

export default DarkModeToggle;
