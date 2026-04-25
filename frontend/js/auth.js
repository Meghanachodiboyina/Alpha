const API_BASE_URL = "http://127.0.0.1:8000";
const authMessageTimers = new Map();

const saveAuth = (data) => {
    localStorage.setItem("arc_token", data.access_token);
    localStorage.setItem("arc_user", JSON.stringify(data.user));
};

const setMessage = (elementId, message, type = "success") => {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.textContent = message;
    target.className = `form-message ${type === "success" ? "success-text" : "error-text"}`;
    window.clearTimeout(authMessageTimers.get(elementId));
    if (message) {
        const timer = window.setTimeout(() => {
            target.textContent = "";
            target.className = "form-message";
        }, 3200);
        authMessageTimers.set(elementId, timer);
    }
};

const postJson = async (url, payload) => {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(data.detail || data.message || "Something went wrong.");
    }
    return data;
};

const showLoginMode = (showForgot = false) => {
    const loginForm = document.getElementById("loginForm");
    const forgotForm = document.getElementById("forgotPasswordForm");
    if (!loginForm || !forgotForm) return;
    loginForm.hidden = showForgot;
    forgotForm.hidden = !showForgot;
};

const registerForm = document.getElementById("registerForm");
if (registerForm) {
    const registerParams = new URLSearchParams(window.location.search);
    const registerFromHome = registerParams.get("from") === "home";
    if (!registerFromHome) {
        window.location.replace("index.html");
    }
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const data = await postJson(`${API_BASE_URL}/register`, {
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
    const isRegisteredFlow = searchParams.get("registered") === "1";
    if (!fromHome && !isRegisteredFlow) {
        window.location.replace("index.html");
    }
    showLoginMode(false);
    if (isRegisteredFlow) {
        setMessage("loginMessage", "Registered successfully. Please login to continue.");
    }

    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const data = await postJson(`${API_BASE_URL}/login`, {
                email: document.getElementById("loginEmail").value.trim(),
                password: document.getElementById("loginPassword").value,
            });
            saveAuth(data);
            setMessage("loginMessage", "Login successful. Redirecting...");
            window.setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 900);
        } catch (error) {
            setMessage("loginMessage", error.message, "error");
        }
    });
}

const toggleForgotPassword = document.getElementById("toggleForgotPassword");
if (toggleForgotPassword) {
    toggleForgotPassword.addEventListener("click", () => showLoginMode(true));
}

const backToLogin = document.getElementById("backToLogin");
if (backToLogin) {
    backToLogin.addEventListener("click", () => showLoginMode(false));
}

const sendOtpButton = document.getElementById("sendOtpButton");
if (sendOtpButton) {
    sendOtpButton.addEventListener("click", async () => {
        try {
            const email = document.getElementById("resetEmail").value.trim();
            const data = await postJson(`${API_BASE_URL}/forgot-password/request`, { email });
            setMessage("resetMessage", data.message || "OTP sent successfully.");
        } catch (error) {
            setMessage("resetMessage", error.message, "error");
        }
    });
}

const forgotPasswordForm = document.getElementById("forgotPasswordForm");
if (forgotPasswordForm) {
    forgotPasswordForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        try {
            const data = await postJson(`${API_BASE_URL}/forgot-password/verify`, {
                email: document.getElementById("resetEmail").value.trim(),
                otp: document.getElementById("resetOtp").value.trim(),
                new_password: document.getElementById("resetNewPassword").value,
            });
            setMessage("resetMessage", data.message || "Password reset successful.");
            window.setTimeout(() => {
                showLoginMode(false);
                forgotPasswordForm.reset();
                setMessage("loginMessage", "Password reset successful. Please login with your new password.");
            }, 1000);
        } catch (error) {
            setMessage("resetMessage", error.message, "error");
        }
    });
}
