import { NavLink } from "react-router";
import { PlusCircle, Pencil, Trash2, Trophy } from "lucide-react";
import { Outlet } from "react-router";

function Admin() {
  const adminOptions = [
    {
      to: "/admin/createProblem",
      title: "Create Problem",
      desc: "Add a new problem with test cases & driver code",
      icon: <PlusCircle size={28} />,
      color: "text-emerald-400 border-emerald-500/30 hover:border-emerald-400",
    },
    {
      to: "/admin/updateProblem",
      title: "Update Problem",
      desc: "Edit existing problems, constraints & solutions",
      icon: <Pencil size={28} />,
      color: "text-teal-400 border-teal-500/30 hover:border-teal-400",
    },
    {
      to: "/admin/deleteProblem",
      title: "Delete Problem",
      desc: "Remove a problem permanently from the platform",
      icon: <Trash2 size={28} />,
      color: "text-rose-400 border-rose-500/30 hover:border-rose-400",
    },
    {
      to: "/admin/createContest",
      title: "Create Contest",
      desc: "Set up a new contest with problems, timing & rules",
      icon: <Trophy size={28} />,
      color: "text-amber-400 border-amber-500/30 hover:border-amber-400",
    },
    {
      to:"/admin/deleteContest",
      title:"Delete Contest",
      desc: "Delete an unwanted contest, make sure this will not effect other contest",
      icon: <Trash2 size={28}/>,
      color: "text-rose-400 border-rose-500/30 hover:border-rose-400"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 font-mono px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white">Admin Panel</h1>
        <p className="text-gray-400 mb-10">Manage problems on CodeJudge</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {adminOptions.map((opt) => (
            <NavLink
              key={opt.to}
              to={opt.to}
              className={`group flex flex-col gap-3 p-5 rounded-xl bg-[#161b22] border ${opt.color} transition-all duration-200 hover:shadow-lg hover:-translate-y-1`}
            >
              <div className={opt.color}>{opt.icon}</div>
              <h2 className="text-lg font-semibold text-white">{opt.title}</h2>
              <p className="text-sm text-gray-400">{opt.desc}</p>
            </NavLink>
          ))}
        </div>
      </div>
      <Outlet />
    </div>
  );
}

export default Admin;