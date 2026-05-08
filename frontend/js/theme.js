(() => {
    const STORAGE_KEY = "arc_theme";
    const THEMES = new Set(["light", "dark"]);

    const systemTheme = () => "light";

    const normalizeTheme = (theme) => (THEMES.has(theme) ? theme : systemTheme());

    const getTheme = () => normalizeTheme(localStorage.getItem(STORAGE_KEY));

    const sunIcon = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
    const moonIcon = '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>';

    const syncToggleButtons = (theme) => {
        document.querySelectorAll("[data-arc-theme-toggle]").forEach((button) => {
            button.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
            button.setAttribute("aria-pressed", String(theme === "dark"));
            const icon = button.querySelector("[data-arc-theme-icon]");
            if (icon) icon.innerHTML = theme === "dark" ? sunIcon : moonIcon;
        });
    };

    const syncBody = (theme) => {
        if (!document.body) return;
        document.body.dataset.theme = theme;
        if (document.body.classList.contains("workspace-body")) {
            document.body.dataset.workspaceTheme = theme;
        }
    };

    const applyTheme = (theme) => {
        const nextTheme = normalizeTheme(theme);
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
        document.documentElement.dataset.theme = nextTheme;
        syncBody(nextTheme);
        syncToggleButtons(nextTheme);
        return nextTheme;
    };

    const setTheme = (theme) => {
        const nextTheme = normalizeTheme(theme);
        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
        window.dispatchEvent(new CustomEvent("arc-theme-change", { detail: { theme: nextTheme } }));
        return nextTheme;
    };

    const toggleTheme = () => setTheme(getTheme() === "dark" ? "light" : "dark");

    window.arcTheme = {
        get: getTheme,
        set: setTheme,
        toggle: toggleTheme,
        apply: applyTheme,
    };

    applyTheme(getTheme());

    document.addEventListener("DOMContentLoaded", () => applyTheme(getTheme()));
    document.addEventListener("click", (event) => {
        const button = event.target.closest("[data-arc-theme-toggle]");
        if (button) toggleTheme();
    });

    window.addEventListener("storage", (event) => {
        if (event.key !== STORAGE_KEY) return;
        const nextTheme = applyTheme(event.newValue);
        window.dispatchEvent(new CustomEvent("arc-theme-change", { detail: { theme: nextTheme } }));
    });
})();
