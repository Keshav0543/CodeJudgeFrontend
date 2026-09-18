import { useState, useEffect } from "react";
import axios from "../utils/axiosClient.js";

function useEditorial(problemId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function getData() {
      setLoading(true);
      setError("");
      try {
        const result = await axios.get(`/fetch/editorial/${problemId}`);
        console.log(result.data.response);
        if (!cancelled) setData(result.data.response);
      } catch (err) {
        if (!cancelled) {
          // no editorial yet -> treat 404 as "not found", not a real error
          if (err?.response?.status === 404) setData(null);
          else setError(err?.response?.data || err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (problemId) getData();
    return () => {
      cancelled = true;
    };
  }, [problemId]);

  return { data, loading, error };
}

export default useEditorial;
