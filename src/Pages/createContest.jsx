import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import axiosClient from "../utils/axiosClient.js";

// Browser-safe ObjectId check (mongoose is server-only, can't be imported here)
const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(value);

const ContestSchema = z
  .object({
    title: z.string().min(1, "Length must be atleast 1 character..."),
    type: z.enum(["saturday", "sunday"]),
    description: z.string().min(1, "Length must be atleast 1 character..."),
    problem: z
      .array(
        z.object({
          problemId: z
            .string()
            .refine(isValidObjectId, { message: "Invalid problemId" }),
          points: z.number().positive(),
        })
      )
      .min(1, "At least one problem is required"),
    status: z.enum(["Upcoming", "Live", "Expired"]).default("Upcoming"),
    rules: z.array(z.string()),
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
    qualifier: z
      .string()
      .refine(isValidObjectId, { message: "Invalid qualifier" })
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "sunday" && !data.qualifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Saturday qualifier contest is required for Sunday contest",
        path: ["qualifier"],
      });
    }
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time must be after start time",
        path: ["endTime"],
      });
    }
  });

function CreateContest() {
  const navigate = useNavigate();
  const [latestSaturday, setLatestSaturday] = useState(null);
  const [fetchError, setFetchError] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(ContestSchema),
    defaultValues: {
      status: "Upcoming",
      type: "saturday",
      problem: [{ problemId: "", points: 0 }],
      rules: [""],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "problem",
  });

  const {
    fields: ruleFields,
    append: appendRule,
    remove: removeRule,
  } = useFieldArray({
    control,
    name: "rules",
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (selectedType !== "sunday") {
      setLatestSaturday(null);
      setValue("qualifier", null);
      return;
    }

    setFetchError("");
    axiosClient
      .get("/user/contest/saturday-latest")
      .then((res) => {
        setLatestSaturday(res.data);
        setValue("qualifier", res.data._id);
      })
      .catch((err) => {
        setLatestSaturday(null);
        setValue("qualifier", null);
        setFetchError(
          err.response?.data?.message || "No Saturday contest found"
        );
      });
  }, [selectedType, setValue]);

  const onSubmit = async (data) => {
    try {
      const res = await axiosClient.post("user/contest/create", data);
      navigate(`/contest/${res.data.contest_id}`);
    } catch (err) {
      console.error(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-base-200 via-base-200 to-primary/10 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Hero header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 badge badge-primary badge-outline mb-3 py-3 px-4">
            <span>✨</span>
            <span>Admin Panel</span>
          </div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Create a Contest
          </h1>
          <p className="text-base-content/60 mt-2">
            Spin up a Saturday qualifier or a Sunday finals showdown 🏆
          </p>
        </div>

        <div className="card bg-base-100 shadow-2xl border border-base-300">
          <form onSubmit={handleSubmit(onSubmit)} className="card-body gap-6">
            {/* Title */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  📝 Contest Title
                </span>
              </label>
              <input
                {...register("title")}
                placeholder="e.g. Weekly Qualifier #12"
                className={`input input-bordered w-full focus:input-primary transition-all ${
                  errors.title ? "input-error" : ""
                }`}
              />
              {errors.title && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.title.message}
                  </span>
                </label>
              )}
            </div>

            {/* Description */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  🗒️ Description
                </span>
              </label>
              <textarea
                {...register("description")}
                placeholder="Tell participants what to expect..."
                rows={3}
                className={`textarea textarea-bordered w-full focus:textarea-primary transition-all ${
                  errors.description ? "textarea-error" : ""
                }`}
              />
              {errors.description && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.description.message}
                  </span>
                </label>
              )}
            </div>

            {/* Type — friendly toggle cards instead of a plain dropdown */}
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">
                  🗓️ Contest Day
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label
                  className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
                    selectedType === "saturday"
                      ? "border-primary bg-primary/10 shadow-md"
                      : "border-base-300 bg-base-100"
                  }`}
                >
                  <input
                    type="radio"
                    value="saturday"
                    {...register("type")}
                    className="hidden"
                  />
                  <div className="text-2xl mb-1">🔥</div>
                  <div className="font-semibold">Saturday</div>
                  <div className="text-xs text-base-content/50">
                    Qualifier round
                  </div>
                </label>

                <label
                  className={`cursor-pointer rounded-xl border-2 p-4 text-center transition-all hover:shadow-md ${
                    selectedType === "sunday"
                      ? "border-secondary bg-secondary/10 shadow-md"
                      : "border-base-300 bg-base-100"
                  }`}
                >
                  <input
                    type="radio"
                    value="sunday"
                    {...register("type")}
                    className="hidden"
                  />
                  <div className="text-2xl mb-1">🏆</div>
                  <div className="font-semibold">Sunday</div>
                  <div className="text-xs text-base-content/50">
                    Finals round
                  </div>
                </label>
              </div>
              {errors.type && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.type.message}
                  </span>
                </label>
              )}
            </div>

            {/* Qualifier (only for Sunday) */}
            {selectedType === "sunday" && (
              <div className="form-control w-full animate-in fade-in duration-300">
                <label className="label">
                  <span className="label-text font-semibold">
                    🔗 Linked Qualifier
                  </span>
                </label>

                {latestSaturday ? (
                  <div className="alert alert-info shadow-sm py-3 px-4">
                    <span className="text-xl">🔥</span>
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        {latestSaturday.title}
                      </span>
                      <span className="text-sm opacity-80">
                        {new Date(
                          latestSaturday.startTime
                        ).toLocaleString()}
                      </span>
                    </div>
                    <span className="badge badge-primary ml-auto">
                      Auto-linked
                    </span>
                  </div>
                ) : (
                  <div
                    className={`alert shadow-sm py-3 px-4 ${
                      fetchError ? "alert-error" : "alert-warning"
                    }`}
                  >
                    {!fetchError && (
                      <span className="loading loading-spinner loading-sm" />
                    )}
                    <span className="text-sm">
                      {fetchError || "Fetching latest Saturday contest..."}
                    </span>
                  </div>
                )}

                {errors.qualifier && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.qualifier.message}
                    </span>
                  </label>
                )}
              </div>
            )}

            {/* Start / End time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">
                    ⏰ Start Time
                  </span>
                </label>
                <input
                  type="datetime-local"
                  {...register("startTime")}
                  className={`input input-bordered w-full focus:input-primary transition-all ${
                    errors.startTime ? "input-error" : ""
                  }`}
                />
                {errors.startTime && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.startTime.message}
                    </span>
                  </label>
                )}
              </div>

              <div className="form-control w-full">
                <label className="label">
                  <span className="label-text font-semibold">
                    🏁 End Time
                  </span>
                </label>
                <input
                  type="datetime-local"
                  {...register("endTime")}
                  className={`input input-bordered w-full focus:input-primary transition-all ${
                    errors.endTime ? "input-error" : ""
                  }`}
                />
                {errors.endTime && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {errors.endTime.message}
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="divider text-base-content/40">📋 Rules</div>

            {/* Rules */}
            <div className="flex flex-col gap-2">
              {ruleFields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <span className="text-base-content/40 text-sm w-5">
                    {index + 1}.
                  </span>
                  <input
                    {...register(`rules.${index}`)}
                    placeholder="e.g. No plagiarism allowed"
                    className={`input input-bordered input-sm w-full ${
                      errors.rules?.[index] ? "input-error" : ""
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => removeRule(index)}
                    className="btn btn-xs btn-circle btn-ghost text-error"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => appendRule("")}
                className="btn btn-xs btn-outline btn-secondary self-start mt-1"
              >
                + Add Rule
              </button>
            </div>

            <div className="divider text-base-content/40">🧩 Problems</div>

            {/* Problems */}
            <div className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-base-200/70 rounded-xl p-3 border border-base-300"
                >
                  <div className="form-control flex-1 w-full">
                    <input
                      {...register(`problem.${index}.problemId`)}
                      placeholder="Problem ID"
                      className={`input input-bordered input-sm w-full ${
                        errors.problem?.[index]?.problemId
                          ? "input-error"
                          : ""
                      }`}
                    />
                    {errors.problem?.[index]?.problemId && (
                      <span className="text-xs text-error mt-1">
                        {errors.problem[index].problemId.message}
                      </span>
                    )}
                  </div>

                  <div className="form-control w-full sm:w-32">
                    <input
                      type="number"
                      {...register(`problem.${index}.points`, {
                        valueAsNumber: true,
                      })}
                      placeholder="Points"
                      className={`input input-bordered input-sm w-full ${
                        errors.problem?.[index]?.points ? "input-error" : ""
                      }`}
                    />
                    {errors.problem?.[index]?.points && (
                      <span className="text-xs text-error mt-1">
                        {errors.problem[index].points.message}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="btn btn-sm btn-error btn-outline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => append({ problemId: "", points: 0 })}
                className="btn btn-sm btn-outline btn-primary self-start"
              >
                + Add Problem
              </button>

              {errors.problem && !Array.isArray(errors.problem) && (
                <span className="text-xs text-error">
                  {errors.problem.message}
                </span>
              )}
            </div>

            <div className="card-actions mt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full text-base shadow-lg hover:shadow-xl transition-shadow"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm" />
                    Creating your contest...
                  </>
                ) : (
                  <>🚀 Create Contest</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateContest;