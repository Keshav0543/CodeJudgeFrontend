import { useState } from "react";
import axios from "../utils/axiosClient.js";
import axiosPlain from "axios";  
import { useParams, useNavigate} from "react-router";

const LANGUAGES = ["java", "cpp", "javascript"];
const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 500;

function AdminEditorial() {
  const {problemId}=useParams();
  const navigate=useNavigate();
  const [title, setTitle] = useState("");
  const [sections, setSections] = useState([{ heading: "", content: "" }]);
  const [languages, setLanguages] = useState([{ language: "cpp", code: "" }]);
  const [media, setMedia] = useState([]); // { type, publicId, resourceType, format, duration }

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function getSignature() {
    const response = await axios.get("/admin/signature/cloudinary");
    return response.data; // { timestamp, signature, apiKey, cloudName, folder }
  }

  function validateFile(file) {
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");

    if (!isVideo && !isImage) return "Only image or video files are allowed.";

    const sizeMB = file.size / (1024 * 1024);
    if (isImage && sizeMB > MAX_IMAGE_MB)
      return `Image must be under ${MAX_IMAGE_MB}MB.`;
    if (isVideo && sizeMB > MAX_VIDEO_MB)
      return `Video must be under ${MAX_VIDEO_MB}MB.`;
    return null;
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const resourceType = isVideo ? "video" : "image";

    setError("");
    setUploading(true);
    setUploadProgress(0);

    try {
      const signed = await getSignature();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signed.apikey);
      formData.append("timestamp", signed.timestamp);
      formData.append("signature", signed.signature);
      formData.append("folder", signed.folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signed.cloudname}/${resourceType}/upload`;

      const cloudRes = await axiosPlain.post(cloudinaryUrl, formData, {
        onUploadProgress: (evt) => {
          if (evt.total)
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total));
        },
      });

      const {
        public_id: publicId,
        resource_type: uploadedResourceType,
        format,
        duration,
      } = cloudRes.data;

      setMedia((prev) => [
        ...prev,
        {
          type: resourceType,
          publicId,
          resourceType: uploadedResourceType,
          format,
          ...(isVideo ? { duration } : {}),
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.error?.message || // Cloudinary error shape
          err.response?.data?.message || // your backend error shape
          "Upload failed. Please try again.",
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }

  function removeMedia(index) {
    setMedia((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSection(index, field, value) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  }
  function addSection() {
    setSections((prev) => [...prev, { heading: "", content: "" }]);
  }
  function removeSection(index) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function updateLanguage(index, field, value) {
    setLanguages((prev) =>
      prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    );
  }
  function addLanguage() {
    setLanguages((prev) => [...prev, { language: "cpp", code: "" }]);
  }
  function removeLanguage(index) {
    setLanguages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!problemId.trim()) return setError("Problem ID is required.");
    if (!title.trim()) return setError("Title is required.");
    if (media.length === 0)
      return setError("Upload at least one image/video first.");

    setSubmitting(true);
    try {
      const response=await axios.post("/create/editorial", {
        Problem_id: problemId,
        title,
        languages,
        sections,
        media,
      });
      setSuccess("Editorial created successfully.");
      navigate(-1)
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create editorial.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-1 text-teal-400">
          Create Editorial
        </h1>
        <p className="text-gray-400 mb-6 text-sm">
          Admin only · Cloudinary direct upload
        </p>

        {error && (
          <div
            role="alert"
            className="alert alert-error bg-red-900/40 border border-red-700 text-red-200 mb-4"
          >
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div
            role="alert"
            className="alert alert-success bg-emerald-900/40 border border-emerald-700 text-emerald-200 mb-4"
          >
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="card bg-[#161b22] border border-gray-800 shadow-lg">
            <div className="card-body gap-4">
              <div>
                <label className="label">
                  <span className="label-text text-gray-300">Title</span>
                </label>
                <input
                  className="input input-bordered w-full bg-[#0d1117] border-gray-700 focus:border-teal-500"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Editorial title"
                />
              </div>
            </div>
          </div>

          {/* Media upload */}
          <div className="card bg-[#161b22] border border-gray-800 shadow-lg">
            <div className="card-body gap-3">
              <h2 className="card-title text-base text-gray-200">Media</h2>

              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                disabled={uploading}
                className="file-input file-input-bordered w-full bg-[#0d1117] border-gray-700 file-input-primary"
              />

              {uploading && (
                <div>
                  <progress
                    className="progress progress-primary w-full"
                    value={uploadProgress}
                    max="100"
                  ></progress>
                  <p className="text-xs text-gray-400 mt-1">
                    Uploading… {uploadProgress}%
                  </p>
                </div>
              )}

              {media.length > 0 && (
                <ul className="flex flex-col gap-2 mt-1">
                  {media.map((m, i) => (
                    <li
                      key={m.publicId + i}
                      className="flex items-center justify-between bg-[#0d1117] border border-gray-800 rounded-lg px-3 py-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`badge ${m.type === "video" ? "badge-secondary" : "badge-accent"} badge-sm`}
                        >
                          {m.type}
                        </span>
                        <span className="font-mono text-gray-300 truncate max-w-xs">
                          {m.publicId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMedia(i)}
                        className="btn btn-ghost btn-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Sections */}
          <div className="card bg-[#161b22] border border-gray-800 shadow-lg">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-base text-gray-200">Sections</h2>
                <button
                  type="button"
                  onClick={addSection}
                  className="btn btn-sm btn-outline btn-primary"
                >
                  + Add section
                </button>
              </div>

              {sections.map((s, i) => (
                <div
                  key={i}
                  className="border border-gray-800 rounded-lg p-3 space-y-2 bg-[#0d1117]"
                >
                  <input
                    className="input input-bordered input-sm w-full bg-[#161b22] border-gray-700"
                    placeholder="Heading"
                    value={s.heading}
                    onChange={(e) =>
                      updateSection(i, "heading", e.target.value)
                    }
                  />
                  <textarea
                    className="textarea textarea-bordered w-full bg-[#161b22] border-gray-700"
                    placeholder="Content"
                    value={s.content}
                    onChange={(e) =>
                      updateSection(i, "content", e.target.value)
                    }
                  />
                  {sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSection(i)}
                      className="btn btn-ghost btn-xs text-red-400"
                    >
                      Remove section
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Reference code */}
          <div className="card bg-[#161b22] border border-gray-800 shadow-lg">
            <div className="card-body gap-3">
              <div className="flex items-center justify-between">
                <h2 className="card-title text-base text-gray-200">
                  Reference Code
                </h2>
                <button
                  type="button"
                  onClick={addLanguage}
                  className="btn btn-sm btn-outline btn-primary"
                >
                  + Add language
                </button>
              </div>

              {languages.map((l, i) => (
                <div
                  key={i}
                  className="border border-gray-800 rounded-lg p-3 space-y-2 bg-[#0d1117]"
                >
                  <select
                    className="select select-bordered select-sm w-full bg-[#161b22] border-gray-700"
                    value={l.language}
                    onChange={(e) =>
                      updateLanguage(i, "language", e.target.value)
                    }
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>
                        {lang}
                      </option>
                    ))}
                  </select>
                  <textarea
                    className="textarea textarea-bordered w-full font-mono text-sm bg-[#161b22] border-gray-700"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    placeholder="Code"
                    value={l.code}
                    onChange={(e) => updateLanguage(i, "code", e.target.value)}
                  />
                  {languages.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLanguage(i)}
                      className="btn btn-ghost btn-xs text-red-400"
                    >
                      Remove language
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || uploading}
            className="btn btn-primary w-full bg-teal-600 hover:bg-teal-500 border-none text-white"
          >
            {submitting ? "Creating…" : "Create Editorial"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminEditorial;
