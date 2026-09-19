import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, Lock, LogIn } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { loginUser } from "../authSlice.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";

// Schema Validation
const LoginSchema = z.object({
  emailId: z.email("Invalid Email..."),
  password: z.string().min(8, "Password is too weak..."),
});

function LoginPage() {
  const [showPassword, setshowPassword] = useState(false);
  const [rememberme,setRememberMe]=useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(LoginSchema),
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticate, loading } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticate) navigate("/");
  }, [isAuthenticate]);

  function onSubmit(data) {
    data.rememberme=rememberme;
    dispatch(loginUser(data));
  }

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-2xl border border-base-300">
        <div className="card-body">
          {/* Login Icon */}
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-primary text-primary-content flex items-center justify-center shadow-lg">
              <LogIn size={30} />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-bold text-center mb-2">Welcome Back</h2>

          <p className="text-center text-base-content/70 mb-6">
            Login to continue your coding journey 🚀
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-base-content/60 z-10 pointer-events-none"
              />

              <input
                type="email"
                placeholder="Enter your email"
                className={`input input-bordered w-full pl-11 ${
                  errors.emailId ? "input-error" : ""
                }`}
                {...register("emailId")}
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">
                <span className="label-text font-medium">Password</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={`input input-bordered w-full pr-12 ${
                    errors.password ? "input-error" : ""
                  }`}
                  {...register("password")}
                />

                <button
                  type="button"
                  onClick={() => setshowPassword(!showPassword)}
                  className="absolute inset-y-0 right-3 flex items-center"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {errors.password && (
                <p className="text-error text-sm mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  onChange={()=>setRememberMe(!rememberme)}
                />
                Remember me
              </label>

              <Link to="/forgot-password" className="link link-primary">
                Forgot Password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="btn btn-primary w-full mt-2"
              disabled={loading}
            >
              {loading ? "wait" : "Login"}
            </button>
          </form>

          <div className="divider">OR</div>

          {/* Google Login */}
          <button className="btn btn-outline w-full">
            Continue with Google
          </button>

          {/* Register Link */}
          <p className="text-center text-sm mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="link link-primary">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
