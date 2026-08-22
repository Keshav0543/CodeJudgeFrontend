import axiosClient from "../utils/axiosClient.js";

export const fetchProblemById = (problemId) =>
  axiosClient.get(`/user/ProblemById/${problemId}`);

export const runCode = (problemId, { code, language }) =>
  axiosClient.post(`/user/run/${problemId}`, { code, language });

// NOTE: backend controller destructures `contest_id` (snake_case), not
// `contestId` — keep this key exact or the contest tagging silently no-ops.
export const submitCode = (problemId, { code, language, contest_id }) =>
  axiosClient.post(`/user/submit/${problemId}`, { code, language, contest_id });

export const GetSubmissionsDetails = (problemId) => {
  return axiosClient.get(`/user/submission/${problemId}`);
};

// Contest-scoped solved list — only problems the user got Accepted on
// WITHIN this specific contest, not their global solved history.
export const fetchContestSolvedProblems = (contestId) =>
  axiosClient.get(`/user/contest/${contestId}/solved`);