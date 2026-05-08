const resolveApiBaseUrl = () => {
    const saved = localStorage.getItem("arc_api_base");
    if (saved) return saved;
    if (window.location.protocol.startsWith("http") && window.location.hostname) {
        return "https://routine-creator.onrender.com";
    }
    return "https://routine-creator.onrender.com";
};

const frontendPath = (relativePath) => {
    const pathName = window.location.pathname.replace(/\\/g, "/");
    const rootPrefix = pathName.includes("/auth/") || pathName.includes("/pages/") ? "../" : "";
    return `${rootPrefix}${relativePath}`;
};

const API_BASE_URL = resolveApiBaseUrl();
const API_FALLBACK_URLS = Array.from(new Set([
    API_BASE_URL,
    "https://routine-creator.onrender.com",
]));
const authMessageTimers = new Map();

const saveAuth = (data) => {
    localStorage.setItem("arc_token", data.access_token);
    localStorage.setItem("arc_user", JSON.stringify(data.user));
};

const setMessage = (elementId, message, type = "success", { persist = false } = {}) => {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.textContent = message;
    target.className = `form-message ${type === "success" ? "success-text" : "error-text"}`;
    window.clearTimeout(authMessageTimers.get(elementId));
    if (message && !persist) {
        const timer = window.setTimeout(() => {
            target.textContent = "";
            target.className = "form-message";
        }, 3200);
        authMessageTimers.set(elementId, timer);
    }
};

const postJson = async (path, payload) => {
    let lastNetworkError = null;
    for (const baseUrl of API_FALLBACK_URLS) {
        try {
            const response = await fetch(`${baseUrl}${path}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.detail || data.message || "Something went wrong.");
            }
            localStorage.setItem("arc_api_base", baseUrl);
            return data;
        } catch (error) {
            if (error instanceof TypeError) {
                lastNetworkError = error;
                continue;
            }
            throw error;
        }
    }
    throw new Error(`Could not connect to the backend API. Please start the backend server at ${API_BASE_URL} and try again.`);
};

const showLoginMode = (showForgot = false, { persist = true } = {}) => {
    const loginForm = document.getElementById("loginForm");
    const forgotForm = document.getElementById("forgotPasswordForm");
    if (!loginForm || !forgotForm) return;
    loginForm.hidden = showForgot;
    forgotForm.hidden = !showForgot;
    if (persist) {
        if (showForgot) {
            sessionStorage.setItem("arc_auth_mode", "reset");
        } else {
            sessionStorage.removeItem("arc_auth_mode");
        }
    }
};

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    const registerParams = new URLSearchParams(window.location.search);
    const registerFromHome = registerParams.get("from") === "home";
    if (!registerFromHome) {
        window.location.replace(frontendPath("index.html"));
    }
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const data = await postJson("/register", {
                name: document.getElementById("registerName").value.trim(),
                email: document.getElementById("registerEmail").value.trim(),
                password: document.getElementById("registerPassword").value,
            });
            setMessage("registerMessage", data.message || "Registered successfully. Please login.");
            window.setTimeout(() => {
                window.location.href = "login.html?registered=1&from=home";
            }, 1100);
        } catch (error) {
            setMessage("registerMessage", error.message, "error");
        }
    });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
    const searchParams = new URLSearchParams(window.location.search);
    const fromHome = searchParams.get("from") === "home";
    const fromInvite = searchParams.get("from") === "invite";
    const isRegisteredFlow = searchParams.get("registered") === "1";
    if (!fromHome && !fromInvite && !isRegisteredFlow) {
        window.location.replace(frontendPath("index.html"));
    }
    const shouldShowReset = sessionStorage.getItem("arc_auth_mode") === "reset" || searchParams.get("reset") === "1";
    showLoginMode(shouldShowReset, { persist: false });
    if (isRegisteredFlow) {
        setMessage("loginMessage", "Registered successfully. Please login to continue.");
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const data = await postJson("/login", {
                email: document.getElementById("loginEmail").value.trim(),
                password: document.getElementById("loginPassword").value,
            });
            sessionStorage.removeItem("arc_auth_mode");
            saveAuth(data);
            setMessage("loginMessage", "Login successful. Redirecting...");
            window.setTimeout(() => {
                window.location.href = frontendPath("pages/dashboard.html");
            }, 900);
        } catch (error) {
            setMessage("loginMessage", error.message, "error");
        }
    });
}

const toggleForgotPassword = document.getElementById("toggleForgotPassword");
if (toggleForgotPassword) {
    toggleForgotPassword.addEventListener("click", () => {
        showLoginMode(true);
    });
}

const backToLogin = document.getElementById("backToLogin");
if (backToLogin) {
    backToLogin.addEventListener("click", (event) => {
        event.preventDefault();
        showLoginMode(false);
    });
}

const sendOtpButton = document.getElementById("sendOtpButton");
if (sendOtpButton) {
    sendOtpButton.addEventListener("click", async (event) => {
        event.preventDefault();
        const resetEmail = document.getElementById("resetEmail");
        try {
            const email = resetEmail.value.trim();
            if (!email) {
                setMessage("resetMessage", "Enter your registered email first.", "error", { persist: true });
                return;
            }
            sendOtpButton.disabled = true;
            sendOtpButton.textContent = "Sending...";
            sessionStorage.setItem("arc_auth_mode", "reset");
            await postJson("/forgot-password/request", { email });
            showLoginMode(true);
            resetEmail.value = email;
            setMessage("resetMessage", "OTP sent successfully. Check your email.", "success", { persist: true });
            document.getElementById("resetOtp").focus();
        } catch (error) {
            setMessage("resetMessage", error.message, "error", { persist: true });
        } finally {
            sendOtpButton.disabled = false;
            sendOtpButton.textContent = "Send OTP";
        }
    });
}

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const resetButton = forgotPasswordForm.querySelector('button[type="submit"]');
        const resetEmail = document.getElementById("resetEmail");
        const email = resetEmail.value.trim();
        try {
            const newPassword = document.getElementById("resetNewPassword").value;
            const confirmPassword = document.getElementById("resetConfirmPassword").value;
            if (newPassword !== confirmPassword) {
                setMessage("resetMessage", "New password and confirm password must match.", "error", { persist: true });
                return;
            }
            if (resetButton) {
                resetButton.disabled = true;
                resetButton.textContent = "Resetting...";
            }
            const data = await postJson("/forgot-password/verify", {
                email,
                otp: document.getElementById("resetOtp").value.trim(),
                new_password: newPassword,
            });
            showLoginMode(true);
            resetEmail.value = email;
            sessionStorage.setItem("arc_auth_mode", "reset");
            setMessage("resetMessage", "Your password has been changed successfully. Login with your new password.", "success", { persist: true });
        } catch (error) {
            setMessage("resetMessage", error.message, "error", { persist: true });
        } finally {
            if (resetButton) {
                resetButton.disabled = false;
                resetButton.textContent = "Verify OTP & Reset";
            }
        }
    });
}
