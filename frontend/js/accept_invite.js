const resolveInviteApiBase = () => {
    return "https://routine-creator.onrender.com";
};

const frontendPath = (relativePath) => {
    const pathName = window.location.pathname.replace(/\\/g, "/");
    const rootPrefix = pathName.includes("/pages/") || pathName.includes("/auth/") ? "../" : "";
    return `${rootPrefix}${relativePath}`;
};

const inviteMessage = document.getElementById("inviteAcceptMessage");
const redirectToLogin = (params = {}) => {
    const url = new URL(frontendPath("auth/login.html"), window.location.href);
    url.searchParams.set("from", "invite");
    Object.entries(params).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });
    window.location.replace(url.toString());
};

const setInviteMessage = (message, type = "success") => {
    if (!inviteMessage) return;
    inviteMessage.textContent = message;
    inviteMessage.className = `form-message ${type === "error" ? "error-text" : "success-text"}`;
};

const acceptInvite = async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
        redirectToLogin({ invite: "missing" });
        return;
    }

    try {
        const response = await fetch(`${resolveInviteApiBase()}/workspace/invitations/accept-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.detail || data.message || "Could not accept this invitation.");
        }
        setInviteMessage(data.message || "Invitation accepted. Please login or register to continue.");
        redirectToLogin({ invite: "accepted" });
    } catch (error) {
        setInviteMessage(error.message, "error");
        redirectToLogin({ invite: "error", message: error.message });
    }
};

acceptInvite();
