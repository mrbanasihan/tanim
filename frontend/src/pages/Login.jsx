import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { toast } from "react-hot-toast";
import loginImage from "../assets/IMG_6582.png";
import ipbLogo from "../assets/ipbLogo.png";
import tanimLogo from "../assets/tanimLogo.png";

// Login
// User authentication page; interacts with AuthContext login function
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState("guest");
  const [selectedGroup, setSelectedGroup] = useState("legumes");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  // handleSubmit
  // Handles form submission for both login and user registration
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(false);

    if (isRegistering) {
      // Frontend validation
      const nameRegex = /^[A-Za-z\s\-']+$/;
      if (!firstName.trim() || !nameRegex.test(firstName.trim())) {
        setError("First name is required and can only contain letters, spaces, hyphens, and apostrophes");
        return;
      }
      if (!lastName.trim() || !nameRegex.test(lastName.trim())) {
        setError("Last name is required and can only contain letters, spaces, hyphens, and apostrophes");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters long");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
      if (["staff", "researcher"].includes(role) && !selectedGroup) {
        setError("Please select a crop group");
        return;
      }

      setLoading(true);
      try {
        await api.post("/auth/register", {
          email: email.trim().toLowerCase(),
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          cropGroups: ["admin", "guest"].includes(role) ? ["legumes", "cereals", "vegetables"] : [selectedGroup],
        });

        toast.success("Account created successfully!");
        
        // Frictionless auto-login after successful registration
        const loginResult = await login(email, password);
        if (loginResult.success) {
          navigate("/");
        } else {
          setIsRegistering(false);
          toast.error("Auto-login failed. Please sign in manually.");
        }
      } catch (err) {
        setError(err.response?.data?.error || err.response?.data?.message || "Registration failed");
      } finally {
        setLoading(false);
      }
    } else {
      // Login logic
      setLoading(true);
      const result = await login(email.trim().toLowerCase(), password);
      setLoading(false);

      if (result.success) {
        navigate("/");
      } else {
        setError(result.error);
      }
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left panel: Image (Hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 h-screen relative overflow-hidden">
        <div className="absolute top-8 left-8 z-10 flex items-center gap-2">
            <img src={ipbLogo} alt="IPB Logo" className="w-10 h-10 object-contain" />
            <img src={tanimLogo} alt="TANIM Logo" className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold tracking-wide text-white drop-shadow-md">
              TANIM
            </span>
        </div>
        <img
          src={loginImage}
          alt="Agricultural background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#116B2B]/30 to-transparent" />
      </div>

      {/* Right panel: Login/Create Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16 h-screen overflow-y-auto bg-white">
        <div className="max-w-md w-full space-y-6">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setIsRegistering(false);
                setError("");
              }}
              className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                !isRegistering
                  ? "bg-white text-[#116B2B] shadow-sm"
                  : "text-[#73B16B] hover:text-[#116B2B]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(true);
                setError("");
              }}
              className={`flex-1 py-2 text-center text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                isRegistering
                  ? "bg-[#116B2B] text-white shadow-sm"
                  : "text-[#73B16B] hover:text-[#116B2B]"
              }`}
            >
              Create Account
            </button>
          </div>

          <div className="text-center space-y-1 py-1">
            <h2 className="text-2xl font-bold text-[#116B2B]">
              {isRegistering ? "Join TANIM" : "Welcome Back"}
            </h2>
            <p className="text-sm text-gray-500">
              {isRegistering 
                ? "Start optimizing your seed inventory today!" 
                : "Sign In to your agricultural dashboard"}
            </p>
          </div>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              {isRegistering && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Juan"
                      className="w-full px-3 py-2 border border-[#237F18] rounded-lg placeholder-[#73B16B] text-[#237F18] focus:outline-none focus:ring-2 focus:ring-[#237F18] focus:border-transparent text-sm transition"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Dela Cruz"
                      className="w-full px-3 py-2 border border-[#237F18] rounded-lg placeholder-[#73B16B] text-[#237F18] focus:outline-none focus:ring-2 focus:ring-[#237F18] focus:border-transparent text-sm transition"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  pattern="^[^\s@]+@[^@\s]+\.com$"
                  title="Use an email ending in .com (e.g., admin@tanim.com)"
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-[#237F18] rounded-lg placeholder-[#73B16B] text-[#237F18] focus:outline-none focus:ring-2 focus:ring-[#237F18] focus:border-transparent text-sm transition"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-[#237F18] rounded-lg placeholder-[#73B16B] text-[#237F18] focus:outline-none focus:ring-2 focus:ring-[#237F18] focus:border-transparent text-sm transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {isRegistering && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border border-[#237F18] rounded-lg placeholder-[#73B16B] text-[#237F18] focus:outline-none focus:ring-2 focus:ring-[#237F18] focus:border-transparent text-sm transition"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                      Role
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-[#237F18] rounded-lg text-[#237F18] focus:outline-none focus:ring-2 focus:ring-[#237F18] focus:border-transparent text-sm transition bg-white"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    >
                      <option value="guest">Guest</option>
                      <option value="staff">Staff</option>
                      <option value="researcher">Researcher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {["staff", "researcher"].includes(role) && (
                    <div>
                      <label className="block text-xs font-semibold text-[#116B2B] uppercase mb-1">
                        Crop Group
                      </label>
                      <div className="flex flex-wrap gap-4 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                        {["legumes", "cereals", "vegetables"].map((group) => (
                          <label key={group} className="flex items-center text-xs font-medium text-gray-700 cursor-pointer">
                            <input
                              type="radio"
                              name="cropGroup"
                              value={group}
                              checked={selectedGroup === group}
                              onChange={(e) => setSelectedGroup(e.target.value)}
                              className="mr-1.5 text-[#116B2B] focus:ring-[#116B2B] h-4 w-4"
                            />
                            {group.charAt(0).toUpperCase() + group.slice(1)}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-[#116B2B] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#116B2B] disabled:opacity-50 transition duration-150 cursor-pointer"
              >
                {loading
                  ? isRegistering
                    ? "Creating Account..."
                    : "Signing In..."
                  : isRegistering
                  ? "Create Account"
                  : "Sign In"}
              </button>

              <div className="text-center mt-4 text-xs text-gray-500 font-medium">
                {isRegistering ? (
                  <>
                    Already have an Account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(false);
                        setError("");
                      }}
                      className="font-semibold text-[#116B2B] hover:text-[#237F18] transition cursor-pointer underline ml-1 focus:outline-none"
                    >
                      Sign In
                    </button>
                  </>
                ) : (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegistering(true);
                        setError("");
                      }}
                      className="font-semibold text-[#116B2B] hover:text-[#237F18] transition cursor-pointer underline ml-1 focus:outline-none"
                    >
                      Create an Account
                    </button>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
