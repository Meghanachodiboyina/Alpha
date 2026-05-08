(() => {
    const body = document.body;
    if (!body || body.dataset.rcLayoutReady === "true") return;

    const navItems = [
        { key: "overview", label: "Overview", href: "dashboard.html#overview", icon: "layout-dashboard" },
        { key: "planner", label: "Planner", href: "dashboard.html#planner", icon: "calendar-plus" },
        { key: "routines", label: "Routines", href: "dashboard.html#routines", icon: "list-checks" },
        { key: "weekly", label: "Weekly View", href: "dashboard.html#weekly", icon: "calendar-range" },
        { key: "workspace", label: "Workspace", href: "workspace.html", icon: "briefcase-business" },
    ];

    const pageTitles = {
        home: ["Routine Creator", "Focused planning for daily work"],
        login: ["Login", "Secure access to your workspace"],
        register: ["Register", "Create your planning workspace"],
        "accept-invite": ["Invitation", "Joining a shared workspace"],
        overview: ["Overview", "Track your routine progress at a glance"],
        planner: ["Planner", "Create AI and manual plans in one place"],
        routines: ["Routines", "Review and manage every saved routine"],
        weekly: ["Weekly View", "Focus on the upcoming week"],
        workspace: ["Workspace", "Manage team tasks and projects"],
        project: ["Workspace", "Redirecting to the workspace"],
    };

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem("arc_user") || "null");
        } catch {
            return null;
        }
    };

    const getInitial = (name = "User") => name.trim().charAt(0).toUpperCase() || "U";

    const inferActiveKey = () => {
        const fileName = window.location.pathname.split("/").pop() || "index.html";
        if (fileName === "workspace.html") {
            return window.location.hash.replace("#", "") === "settings" ? "settings" : "workspace";
        }
        if (fileName === "project_management.html") return "workspace";
        if (fileName === "dashboard.html") return window.location.hash.replace("#", "") || "overview";
        return body.dataset.rcPage || "home";
    };

    const user = readUser();
    const userName = user?.name || "Guest User";
    const userEmail = user?.email || "Not signed in";
    const activeKey = inferActiveKey();
    const titleConfig = pageTitles[activeKey] || pageTitles[body.dataset.rcPage] || pageTitles.home;
    const searchId = activeKey === "overview" || ["planner", "routines", "weekly"].includes(activeKey)
        ? "dashboardSearchInput"
        : "rcGlobalSearchInput";

    const sidebar = document.createElement("aside");
    sidebar.className = "rc-global-sidebar";
    sidebar.innerHTML = `
        <div class="rc-global-sidebar-top">
            <a class="rc-global-brand" href="dashboard.html#overview" aria-label="Routine Creator overview">
                <span class="rc-global-brand-mark">RC</span>
                <span class="rc-global-brand-copy">
                    <strong>Routine Creator</strong>
                    <small>Workspace OS</small>
                </span>
            </a>
            <nav class="rc-global-nav" aria-label="Primary">
                ${navItems.map((item) => `
                    <a class="sidebar-item" data-rc-nav="${item.key}" href="${item.href}">
                        <i data-lucide="${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `).join("")}
            </nav>
        </div>
        <div class="rc-global-sidebar-bottom">
            <button type="button" class="sidebar-item rc-global-collapse" id="rcSidebarCollapse">
                <i data-lucide="panel-left-close"></i>
                <span>Collapse</span>
            </button>
            <button type="button" class="sidebar-item" data-rc-nav="settings" id="rcGlobalSettingsButton">
                <i data-lucide="settings"></i>
                <span>Settings</span>
            </button>
            <button type="button" class="sidebar-item rc-global-logout" id="rcGlobalLogoutButton">
                <i data-lucide="log-out"></i>
                <span>Logout</span>
            </button>
        </div>
    `;

    const navbar = document.createElement("header");
    navbar.className = "navbar rc-global-navbar";
    navbar.innerHTML = `
        <button type="button" class="rc-nav-icon-button rc-mobile-menu-button" id="rcMobileMenuButton" aria-label="Open sidebar">
            <i data-lucide="menu"></i>
        </button>
        <div class="rc-navbar-title">
            <p id="pageEyebrow">${titleConfig[0]}</p>
            <h2 id="pageTitle">${titleConfig[1]}</h2>
        </div>
        <label class="rc-navbar-search" aria-label="Search">
            <i data-lucide="search"></i>
            <input type="search" id="${searchId}" placeholder="Search routines, tasks, workspace...">
        </label>
        <button type="button" class="rc-nav-icon-button" aria-label="Notifications">
            <i data-lucide="bell"></i>
            <span class="rc-notification-dot" aria-hidden="true"></span>
        </button>
        <div class="rc-profile-wrap">
            <button type="button" class="rc-profile-button" id="rcProfileButton" aria-expanded="false" aria-controls="rcProfileMenu">
                <span class="rc-profile-avatar" id="currentUserAvatar">${getInitial(userName)}</span>
                <span class="rc-profile-copy">
                    <strong id="currentUserName">${userName}</strong>
                    <small>${userEmail}</small>
                </span>
                <i data-lucide="chevron-down"></i>
            </button>
            <div class="rc-profile-menu card" id="rcProfileMenu" hidden>
                <strong>${userName}</strong>
                <span>${userEmail}</span>
                <button type="button" class="button button-secondary" id="rcProfileLogoutButton">Logout</button>
            </div>
        </div>
    `;

    body.prepend(navbar);
    body.prepend(sidebar);
    body.dataset.rcLayoutReady = "true";

    const setActiveNav = () => {
        const key = inferActiveKey();
        document.querySelectorAll("[data-rc-nav]").forEach((item) => {
            item.classList.toggle("active", item.dataset.rcNav === key);
        });
    };

    const clearSessionStorage = () => {
        const theme = localStorage.getItem("arc_theme");
        const apiBase = localStorage.getItem("arc_api_base");
        localStorage.clear();
        if (theme) localStorage.setItem("arc_theme", theme);
        if (apiBase) localStorage.setItem("arc_api_base", apiBase);
    };

    const logout = () => {
        clearSessionStorage();
        sessionStorage.removeItem("arc_auth_mode");
        window.location.href = "index.html";
    };

    document.getElementById("rcGlobalLogoutButton")?.addEventListener("click", logout);
    document.getElementById("rcProfileLogoutButton")?.addEventListener("click", logout);
    document.getElementById("rcGlobalSettingsButton")?.addEventListener("click", () => {
        const workspaceSettingsButton = document.querySelector('[data-page-target="settings"]');
        if (workspaceSettingsButton && window.location.pathname.endsWith("workspace.html")) {
            workspaceSettingsButton.click();
            window.location.hash = "settings";
            setActiveNav();
            return;
        }
        sessionStorage.setItem("rc_workspace_page", "settings");
        window.location.href = "workspace.html#settings";
    });
    document.getElementById("rcSidebarCollapse")?.addEventListener("click", () => {
        body.classList.toggle("rc-sidebar-collapsed");
    });
    document.getElementById("rcMobileMenuButton")?.addEventListener("click", () => {
        body.classList.toggle("rc-sidebar-open");
    });

    document.querySelectorAll(".rc-global-nav a").forEach((item) => {
        item.addEventListener("click", () => {
            body.classList.remove("rc-sidebar-open");
            window.setTimeout(setActiveNav, 0);
        });
    });

    const profileButton = document.getElementById("rcProfileButton");
    const profileMenu = document.getElementById("rcProfileMenu");
    profileButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        profileMenu.hidden = !profileMenu.hidden;
        profileButton.setAttribute("aria-expanded", String(!profileMenu.hidden));
    });
    document.addEventListener("click", (event) => {
        if (!profileMenu?.hidden && !event.target.closest("#rcProfileMenu") && !event.target.closest("#rcProfileButton")) {
            profileMenu.hidden = true;
            profileButton?.setAttribute("aria-expanded", "false");
        }
        if (body.classList.contains("rc-sidebar-open") && !event.target.closest(".rc-global-sidebar") && !event.target.closest("#rcMobileMenuButton")) {
            body.classList.remove("rc-sidebar-open");
        }
    });

    window.addEventListener("hashchange", setActiveNav);
    setActiveNav();

    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
})();
