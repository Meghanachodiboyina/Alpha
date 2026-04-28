const resolveInviteApiBase = () => {
    const saved = localStorage.getItem("arc_api_base");
    if (saved) return saved;
    if (window.location.protocol.startsWith("http") && window.location.hostname) {
        return `${window.location.protocol}//${window.location.hostname}:8000`;
    }
    return "http://127.0.0.1:8000";
};

const inviteMessage = document.getElementById("inviteAcceptMessage");
const inviteActions = document.querySelector(".invite-accept-actions");
const registerLink = document.getElementById("inviteRegisterLink");
const loginLink = document.getElementById("inviteLoginLink");

const setInviteMessage = (message, type = "success") => {
    inviteMessage.textContent = message;
    inviteMessage.className = `form-message ${type === "error" ? "error-text" : "success-text"}`;
};

const acceptInvite = async () => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
        setInviteMessage("This invitation link is missing or invalid.", "error");
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
        inviteActions.hidden = false;
        registerLink.href = "register.html?from=home&invite=accepted";
        loginLink.href = "login.html?from=home&invite=accepted";
    } catch (error) {
        setInviteMessage(error.message, "error");
        inviteActions.hidden = false;
    }
};

acceptInvite();
