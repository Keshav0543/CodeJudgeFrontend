import { useState, useEffect, useMemo, useRef } from "react";
import axiosClient from "../utils/axiosClient";
import { useSelector, useDispatch } from "react-redux";
import { Search, Code2, UserCircle2, X } from "lucide-react";
import { logoutUser } from "../authSlice.js";
import debounce from "lodash/debounce";
import { Link, useNavigate } from "react-router";

function HomePage() {
  const [Allproblem, setAllproblem] = useState([]);
  const [userProb, setuserProb] = useState([]);
  const [query, setquery] = useState("");
  const [resultQuery, setresultQuery] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const navigate = useNavigate();

  const [filters, setfilters] = useState({
    difficulty: "all",
    tag: "all",
    status: "all",
  });

  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  useEffect(() => {
    let cancelled = false;

    const fetchdata = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const [problemRes, userProbres] = await Promise.all([
          axiosClient.get("/user/GetAllProblem"),
          axiosClient.get("/user/ProblemSolvedByUser"),
        ]);

        if (!cancelled) {
          setAllproblem(problemRes.data);
          setuserProb(userProbres.data);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.response?.data?.message || err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchdata();

    // Refetch when page is restored from bfcache (browser back/forward)
    function handlePageShow(event) {
      if (event.persisted) {
        fetchdata();
      }
    }
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, []);

  const filteredProblems = Allproblem.filter((problem) => {
    const difficultyMatch =
      filters.difficulty === "all" ||
      problem.difficultylevel.toLowerCase() ===
        filters.difficulty.toLowerCase();

    const tagMatch = filters.tag === "all" || problem.tags === filters.tag;

    const statusMatch =
      filters.status === "all" ||
      (filters.status === "Solved"
        ? userProb.some((sp) => sp._id === problem._id)
        : !userProb.some((sp) => sp._id === problem._id));

    return difficultyMatch && tagMatch && statusMatch;
  });

  async function logoutFunction() {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (error) {
      console.log("Error: ", error);
    }
  }

  const Searchquery = useMemo(() => {
    return debounce(async (text) => {
      if (text.trim() === "") {
        setresultQuery([]);
        setSearchLoading(false);
        return;
      }

      try {
        setSearchLoading(true);
        const result = await axiosClient.get(`/user/search?q=${text}`);
        setresultQuery(result.data);
      } catch (error) {
        console.log(error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  useEffect(() => {
    Searchquery(query);
  }, [query]);

  const isSearching = query.trim() !== "";
  const displayedProblems = isSearching ? resultQuery : filteredProblems;

  const clearSearch = () => {
    setquery("");
    setresultQuery([]);
  };

  return (
    <div className="min-h-screen bg-base-200">
      {/* Navbar */}
      <div className="navbar bg-base-100 shadow-lg px-8">
        <div className="flex-1">
          <a className="text-2xl font-bold flex items-center gap-2">
            <Code2 size={28} />
            CodeJudge
          </a>
        </div>

        <div className="flex gap-4 items-center">
          <button className="btn btn-primary" onClick={()=>navigate("/contestlist")}>Contests</button>
          <button className="btn btn-ghost">Problems</button>

          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-circle btn-ghost">
              <UserCircle2 size={30} />
            </label>

            <ul
              tabIndex={0}
              className="menu dropdown-content mt-3 w-52 rounded-box bg-base-100 shadow"
            >
              <li>
                <a>{user?.firstName}</a>
              </li>
              <li>
                <a onClick={()=>navigate(`/profile/u/${user?.firstName}`)}>Profile</a>
              </li>
               {user?.role === "admin" && (
                <li>
                  <button onClick={() => navigate("/admin")}>Admin</button>
                </li>
              )}
              <li>
                <a onClick={logoutFunction}>Logout</a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="max-w-7xl mx-auto mt-8">
        <div className="bg-base-100 rounded-xl shadow-md p-6">
          <div className="flex flex-wrap justify-between gap-4">
            {/* Search bar */}
            <div className="form-control w-full sm:max-w-xs">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40"
                />
                <input
                  type="text"
                  placeholder="Search problems..."
                  value={query}
                  onChange={(e) => setquery(e.target.value)}
                  className="input input-bordered w-full pl-10 pr-10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap justify-end gap-4">
              <select
                className="select select-bordered"
                value={filters.difficulty}
                disabled={isSearching}
                onChange={(e) =>
                  setfilters({ ...filters, difficulty: e.target.value })
                }
              >
                <option value="all">Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                className="select select-bordered"
                value={filters.tag}
                disabled={isSearching}
                onChange={(e) =>
                  setfilters({ ...filters, tag: e.target.value })
                }
              >
                <option value="all">Tags</option>
                <option value="array">Array</option>
                <option value="dp">DP</option>
                <option value="graph">Graph</option>
                <option value="tree">Tree</option>
                <option value="string">String</option>
              </select>

              <select
                className="select select-bordered"
                value={filters.status}
                disabled={isSearching}
                onChange={(e) =>
                  setfilters({ ...filters, status: e.target.value })
                }
              >
                <option value="all">Status</option>
                <option value="Solved">Solved</option>
                <option value="UnSolved">UnSolved</option>
              </select>
            </div>
          </div>

          {isSearching && (
            <p className="text-sm text-base-content/60 mt-3">
              {searchLoading
                ? "Searching..."
                : `${resultQuery.length} result${resultQuery.length === 1 ? "" : "s"} for "${query}"`}
            </p>
          )}
        </div>
      </div>

      {/* Problem List */}
      <div className="max-w-7xl mx-auto mt-6 mb-10">
        <div className="overflow-x-auto rounded-xl bg-base-100 shadow-md">
          <table className="table table-zebra">
            <thead>
              <tr className="text-base">
                <th className="w-16 text-center">Status</th>
                <th>Problem</th>
                <th className="text-center">Difficulty</th>
                <th className="text-center">Tags</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-16">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-error">
                    {loadError}
                  </td>
                </tr>
              ) : displayedProblems.length > 0 ? (
                displayedProblems.map((problem) => {
                  const solved = userProb.some((sp) => sp._id === problem._id);

                  return (
                    <tr key={problem._id} className="hover cursor-pointer">
                      <td className="text-center">
                        {solved ? (
                          <span className="text-success text-xl">✔</span>
                        ) : (
                          <span className="text-base-content/30 text-xl">
                            ○
                          </span>
                        )}
                      </td>

                      <td>
                        <Link to={`/problem/${problem._id}`}>
                          <div className="font-medium hover:text-primary transition">
                            {problem.title}
                          </div>
                        </Link>
                      </td>

                      <td className="text-center">
                        <span
                          className={`badge ${
                            problem.difficultylevel === "easy"
                              ? "badge-success"
                              : problem.difficultylevel === "medium"
                                ? "badge-warning"
                                : "badge-error"
                          }`}
                        >
                          {problem.difficultylevel}
                        </span>
                      </td>

                      <td className="text-center">
                        <div className="flex flex-wrap justify-center gap-2">
                          {Array.isArray(problem.tags) ? (
                            problem.tags.map((tag) => (
                              <span key={tag} className="badge badge-outline">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="badge badge-outline">
                              {problem.tags}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-10 text-gray-500">
                    {isSearching
                      ? "No matching problems found"
                      : "No Problems Found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
