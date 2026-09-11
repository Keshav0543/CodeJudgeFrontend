import axiosClient from "../utils/axiosClient.js";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router";

function ProfilePage() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [totalSolved, setTotalSolved] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const [profileRes, recentRes, totalRes] = await Promise.all([
          axiosClient.get("/user/getProfile"),
          axiosClient.get("/user/recent/submission"),
          axiosClient.get("/user/total/submission"),
        ]);

        setUserData(profileRes.data);
        setRecentSubmissions(recentRes.data.Details || []);
        setTotalSolved(totalRes.data.totalprob || 0);
      } catch (err) {
        setError(
          err?.response?.data?.message || "Profile load nahi ho paya, try again"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  const difficultyBadge = (level) => {
    switch ((level || "").toLowerCase()) {
      case "easy":
        return "badge-success";
      case "medium":
        return "badge-warning";
      case "hard":
        return "badge-error";
      default:
        return "badge-ghost";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-300 flex items-center justify-center px-4">
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  const memberSince = userData?.createdAt
    ? new Date(userData.createdAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "N/A";

  return (
    <div className="min-h-screen bg-base-300 px-4 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Profile header */}
        <div className="card bg-base-200 shadow-md">
          <div className="card-body flex-col sm:flex-row items-center sm:items-start gap-6 relative">
            {/* Edit Profile button */}
            <button
              onClick={() => navigate("/setting/profile")}
              className="btn btn-outline btn-primary btn-sm absolute top-4 right-4"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Edit Profile
            </button>

            <div className="avatar">
              <div className="w-28 rounded-full ring ring-primary/40 ring-offset-base-200 ring-offset-2 bg-primary/20 flex items-center justify-center">
                <span className="text-4xl font-bold text-primary">
                  {(userData?.firstName?.[0] || "U").toUpperCase()}
                </span>
              </div>
            </div>

            <div className="text-center sm:text-left flex-1">
              <h1 className="text-2xl font-bold">
                {userData?.firstName} {userData?.lastName || ""}
              </h1>
              <p className="text-base-content/60 text-sm mt-1">
                {userData?.emailId}
              </p>

              {userData?.bio && (
                <p className="text-base-content/80 text-sm mt-3 max-w-md">
                  {userData.bio}
                </p>
              )}

              <p className="text-base-content/50 text-xs mt-3">
                Member since {memberSince}
              </p>
            </div>
          </div>
        </div>

        {/* Top stat row - jaise pic me hai */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card bg-base-200 shadow-md">
            <div className="card-body p-5">
              <p className="text-base-content/60 text-sm">Rating</p>
              <p className="text-2xl font-bold text-primary">
                {userData?.rating ?? 1500}
              </p>
            </div>
          </div>

          <div className="card bg-base-200 shadow-md">
            <div className="card-body p-5">
              <p className="text-base-content/60 text-sm">Problems Solved</p>
              <p className="text-2xl font-bold text-success">{totalSolved}</p>
            </div>
          </div>

          <div className="card bg-base-200 shadow-md opacity-50">
            <div className="card-body p-5">
              <p className="text-base-content/60 text-sm">
                Contests Participated
              </p>
              <p className="text-lg font-semibold">Coming soon</p>
            </div>
          </div>

          <div className="card bg-base-200 shadow-md">
            <div className="card-body p-5">
              <p className="text-base-content/60 text-sm">Current Streak</p>
              <p className="text-2xl font-bold text-warning">
                {userData?.currentStreak ?? 0} days
              </p>
              <p className="text-base-content/40 text-xs">
                Longest: {userData?.longestStreak ?? 0} days
              </p>
            </div>
          </div>
        </div>

        {/* Main content + sidebar, jaise pic me hai */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <div className="card bg-base-200 shadow-md">
              <div className="card-body">
                <h2 className="card-title">Recent Submissions</h2>

                {recentSubmissions.length === 0 ? (
                  <p className="text-base-content/60 text-sm">
                    Abhi tak koi accepted submission nahi hai.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 mt-2">
                    {recentSubmissions.map((item) => (
                      <div
                        key={item._id}
                        className="flex items-center justify-between bg-base-300 rounded-lg px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-success"></span>
                          <span className="font-medium">
                            {item.problemId?.title || "Untitled Problem"}
                          </span>
                        </div>
                        <span
                          className={`badge ${difficultyBadge(
                            item.problemId?.difficultylevel
                          )}`}
                        >
                          {item.problemId?.difficultylevel || "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card bg-base-200 shadow-md opacity-50">
              <div className="card-body">
                <h2 className="card-title">Recent Contests</h2>
                <p className="text-base-content/60 text-sm">
                  Contest data jald hi yahan aayega 🚧
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            <div className="card bg-base-200 shadow-md opacity-50">
              <div className="card-body">
                <h3 className="font-semibold">Global & Country Rank</h3>
                <p className="text-base-content/60 text-sm">
                  Leaderboard endpoint aane ke baad add karenge 🚧
                </p>
              </div>
            </div>

            {userData?.bio && (
              <div className="card bg-base-200 shadow-md">
                <div className="card-body">
                  <h3 className="font-semibold">About Me</h3>
                  <p className="text-base-content/70 text-sm mt-1">
                    {userData.bio}
                  </p>
                </div>
              </div>
            )}

            {userData?.githubProfile && (
              <div className="card bg-base-200 shadow-md">
                <div className="card-body">
                  <h3 className="font-semibold">Links</h3>
                  <a
                    href={userData.githubProfile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary text-sm mt-1 flex items-center gap-2"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="currentColor"
                      className="shrink-0"
                      style={{ minWidth: "18px" }}
                    >
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.207 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.016-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.757-1.333-1.757-1.09-.744.083-.729.083-.729 1.205.084 1.84 1.237 1.84 1.237 1.07 1.834 2.807 1.304 3.492.997.108-.775.42-1.305.762-1.605-2.665-.303-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.233 1.91 1.233 3.22 0 4.61-2.807 5.624-5.48 5.92.43.372.814 1.103.814 2.222 0 1.604-.015 2.896-.015 3.29 0 .32.216.694.825.576C20.565 21.795 24 17.298 24 12c0-6.63-5.373-12-12-12" />
                    </svg>
                    {userData.githubProfile}
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;