import { useState, useEffect } from "react";
import axiosClient from "../utils/axiosClient.js";

function DeleteContest() {
  const [searchLoading, setSearchLoading] = useState(false);
  const [LoadError, setLoadError] = useState("");
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // delete modal state
  const [selectedContest, setSelectedContest] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function getData() {
      setSearchLoading(true);
      setLoadError("");
      try {
        const result = await axiosClient.get(
          `/user/contest/history?page=${page}&limit=${limit}`,
        );
        if (!cancelled) {
          // adjust based on your actual response shape
          setData(result.data?.contestData || result.data?.contests || (Array.isArray(result.data) ? result.data : []));
          setTotalPages(result.data?.totalPages || 1);
        }
      } catch (err) {
        if (!cancelled)
          setLoadError(err?.response?.data?.message || err.message);
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    }

    getData();

    return () => {
      cancelled = true;
    };
  }, [page]);

  const openDeleteModal = (contest) => {
    setDeleteError("");
    setSelectedContest(contest);
    document.getElementById("delete_contest_modal").showModal();
  };

  const handleDelete = async () => {
    if (!selectedContest) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await axiosClient.delete(`/user/contest/${selectedContest._id}`);
      setData((prev) => prev.filter((c) => c._id !== selectedContest._id));
      document.getElementById("delete_contest_modal").close();
      setSelectedContest(null);
    } catch (err) {
      setDeleteError(err?.response?.data?.message || err.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const statusBadge = (status) => {
    const map = {
      Running: "badge-warning",
      Expired: "badge-neutral",
      Upcoming: "badge-info",
    };
    return `badge ${map[status] || "badge-ghost"} badge-sm font-mono`;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 font-mono px-4 py-8 sm:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-teal-400">
            Delete Contests
          </h1>
          <span className="text-xs text-gray-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {/* Error state */}
        {LoadError && (
          <div className="alert bg-[#161b22] border border-red-500/40 text-red-400 mb-6">
            <span className="text-sm">{LoadError}</span>
          </div>
        )}

        {/* Loading skeleton */}
        {searchLoading && (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-lg bg-[#161b22] animate-pulse border border-gray-800"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!searchLoading && !LoadError && data.length === 0 && (
          <div className="text-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-lg">
            No contests found.
          </div>
        )}

        {/* Table */}
        {!searchLoading && !LoadError && data.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-800">
            <table className="table">
              <thead>
                <tr className="bg-[#161b22] text-gray-400 text-xs uppercase tracking-wide">
                  <th>Contest</th>
                  <th>Start Time</th>
                  <th>Status</th>
                  <th className="text-right pr-6">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.map((contest) => (
                  <tr
                    key={contest._id}
                    className="bg-[#0d1117] hover:bg-[#161b22] transition-colors border-t border-gray-800"
                  >
                    <td className="font-medium text-gray-100">
                      {contest.contestName || contest.title}
                    </td>
                    <td className="text-gray-400 text-sm">
                      {formatDate(contest.startTime)}
                    </td>
                    <td>
                      <span className={statusBadge(contest.status)}>
                        {contest.status || "—"}
                      </span>
                    </td>
                    <td className="text-right pr-4">
                      <button
                        className="btn btn-sm btn-error btn-outline"
                        onClick={() => openDeleteModal(contest)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!searchLoading && !LoadError && data.length > 0 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              className="btn btn-sm bg-[#161b22] border-gray-700 text-gray-300 disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Prev
            </button>
            <span className="btn btn-sm btn-ghost text-teal-400 pointer-events-none">
              {page}
            </span>
            <button
              className="btn btn-sm bg-[#161b22] border-gray-700 text-gray-300 disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation modal - DaisyUI */}
      <dialog id="delete_contest_modal" className="modal">
        <div className="modal-box bg-[#161b22] border border-gray-800 text-gray-200 font-mono">
          <h3 className="font-bold text-lg text-red-400">Delete Contest?</h3>
          <p className="py-3 text-sm text-gray-400">
            Are you sure you want to delete{" "}
            <span className="text-gray-100 font-semibold">
              {selectedContest?.contestName || selectedContest?.title}
            </span>
            ? This action can't be undone.
          </p>

          {deleteError && (
            <p className="text-red-400 text-xs mb-2">{deleteError}</p>
          )}

          <div className="modal-action">
            <form method="dialog" className="flex gap-2">
              <button className="btn btn-sm btn-ghost" disabled={deleting}>
                Cancel
              </button>
            </form>
            <button
              className="btn btn-sm btn-error"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <span className="loading loading-spinner loading-xs"></span>
              ) : (
                "Delete"
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}

export default DeleteContest;