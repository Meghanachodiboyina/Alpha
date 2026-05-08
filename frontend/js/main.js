(() => {
    const body = document.body;
    if (!body || body.dataset.rcLayoutReady === "true") return;

    const pathName = window.location.pathname.replace(/\\/g, "/");
    const fileName = pathName.split("/").pop() || "index.html";
    const isModernWorkspace = fileName === "workspace.html" || fileName === "project_management.html";
    const rootPrefix = pathName.includes("/pages/") || pathName.includes("/auth/") ? "../" : "";
    const appPath = (relativePath = "") => `${rootPrefix}${relativePath}`;
    const pagePath = (pageName, hash = "") => `${appPath(`pages/${pageName}`)}${hash}`;
    const authPath = (pageName, query = "") => `${appPath(`auth/${pageName}`)}${query}`;
    const authFiles = new Set(["login.html", "register.html", "accept-invite.html"]);

    if (authFiles.has(fileName)) {
        body.classList.remove("rc-system", "rc-sidebar-collapsed", "rc-sidebar-open");
        return;
    }

    const readUser = () => {
        try {
            return JSON.parse(localStorage.getItem("arc_user") || "null");
        } catch {
            return null;
        }
    };

    const getInitial = (name = "User") => name.trim().charAt(0).toUpperCase() || "U";
    const user = readUser();
    const token = localStorage.getItem("arc_token");
    const userName = user?.name || "Guest User";
    const userEmail = user?.email || "Not signed in";
    const getStoredTheme = () => {
        if (window.arcTheme?.get) return window.arcTheme.get();
        const saved = localStorage.getItem("arc_theme");
        if (saved === "light" || saved === "dark") return saved;
        return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };
    const applyTheme = (theme) => {
        const nextTheme = theme === "dark" ? "dark" : "light";
        if (window.arcTheme?.set) {
            window.arcTheme.set(nextTheme);
        } else {
            document.documentElement.classList.toggle("dark", nextTheme === "dark");
            localStorage.setItem("arc_theme", nextTheme);
        }
        body.dataset.theme = nextTheme;
    };

    applyTheme(getStoredTheme());

    const navItems = [
        { key: "overview", label: "Overview", href: pagePath("dashboard.html", "#overview"), icon: "layout-dashboard" },
        { key: "planner", label: "Planner", href: pagePath("dashboard.html", "#planner"), icon: "calendar-plus" },
        { key: "workspace", label: "Workspace", href: pagePath("workspace.html"), icon: "briefcase-business" },
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
        settings: ["Settings", "Manage workspace preferences"],
    };

    const inferActiveKey = () => {
        if (fileName === "index.html") return "home";
        if (fileName === "workspace.html") {
            return window.location.hash.replace("#", "") === "settings" ? "settings" : "workspace";
        }
        if (fileName === "project_management.html") return "workspace";
        if (fileName === "dashboard.html") return window.location.hash.replace("#", "") || "overview";
        if (fileName === "login.html") return "login";
        if (fileName === "register.html") return "register";
        if (fileName === "accept-invite.html") return "accept-invite";
        return body.dataset.rcPage || "home";
    };

    const activeKey = inferActiveKey();
    const searchId = fileName === "dashboard.html" ? "dashboardSearchInput" : "rcGlobalSearchInput";

    const sidebar = document.createElement("aside");
    sidebar.className = "sidebar rc-global-sidebar";
    sidebar.innerHTML = `
        <div class="rc-global-sidebar-top">
            <a class="rc-global-brand" href="${pagePath("dashboard.html", "#overview")}" aria-label="Routine Creator overview">
                <span class="rc-global-brand-mark">RC</span>
                <span class="rc-global-brand-copy">
                    <strong>Routine Creator</strong>
                    <small>Workspace OS</small>
                </span>
            </a>
            <nav class="rc-global-nav" aria-label="Primary navigation">
                ${navItems.map((item) => `
                    <a class="sidebar-item" data-rc-nav="${item.key}" href="${item.href}" title="${item.label}">
                        <i data-lucide="${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `).join("")}
            </nav>
        </div>
        <div class="rc-global-sidebar-bottom">
            <div class="rc-sidebar-premium">
                <div class="rc-sidebar-premium-header">
                    <i data-lucide="crown" style="width:15px;height:15px;color:#fbbf24;"></i>
                    <strong>Go Premium</strong>
                </div>
                <p>Unlock advanced features and unlimited AI plans</p>
                <button type="button" class="rc-sidebar-premium-btn">
                    Upgrade Now
                </button>
            </div>
            <button type="button" class="sidebar-item sidebar-icon-item rc-global-collapse" id="rcSidebarCollapse" title="Collapse sidebar" aria-label="Collapse sidebar">
                <i data-lucide="panel-left-close"></i>
            </button>
            ${token ? `
                <button type="button" class="sidebar-item sidebar-icon-item" data-rc-nav="settings" id="rcGlobalSettingsButton" title="Settings" aria-label="Settings">
                    <i data-lucide="settings"></i>
                </button>
                <button type="button" class="sidebar-item sidebar-icon-item danger" id="rcGlobalLogoutButton" title="Logout" aria-label="Logout">
                    <i data-lucide="log-out"></i>
                </button>
            ` : ""}
        </div>
    `;

    const navbar = document.createElement("header");
    navbar.className = "navbar rc-global-navbar";
    navbar.innerHTML = `
        <button type="button" class="rc-nav-icon-button rc-mobile-menu-button" id="rcMobileMenuButton" aria-label="Open sidebar">
            <i data-lucide="menu"></i>
        </button>
        ${isModernWorkspace ? `
        <div class="rc-workspace-switcher-wrap">
            <button type="button" class="rc-workspace-switcher" id="rcWorkspaceSwitcher" aria-expanded="false" aria-controls="rcWorkspaceMenu">
                <span class="rc-workspace-switcher-mark">RC</span>
                <span class="rc-workspace-switcher-copy">
                    <strong>Routine HQ</strong>
                    <small>Production workspace</small>
                </span>
                <i data-lucide="chevrons-up-down"></i>
            </button>
            <div class="rc-workspace-menu card" id="rcWorkspaceMenu" hidden>
                <button type="button" data-command-url="${pagePath("workspace.html")}">
                    <span class="rc-workspace-switcher-mark">RC</span>
                    <span><strong>Routine HQ</strong><small>Active workspace</small></span>
                </button>
                <button type="button" data-command-url="${pagePath("dashboard.html", "#overview")}">
                    <span class="rc-workspace-switcher-mark muted">AI</span>
                    <span><strong>AI Planner</strong><small>Personal routines</small></span>
                </button>
            </div>
        </div>
        ` : ""}
        <div class="rc-navbar-title">
            <p id="pageEyebrow"></p>
            <h2 id="pageTitle"></h2>
        </div>
        <label class="rc-navbar-search" aria-label="Search">
            <i data-lucide="search"></i>
            <input type="search" id="${searchId}" placeholder="Search or press Ctrl+K">
        </label>
        <button type="button" class="rc-nav-icon-button" id="rcThemeToggle" aria-label="Switch theme">
            <i data-lucide="sun" data-theme-icon="sun"></i>
        </button>
        <button type="button" class="rc-nav-icon-button" id="rcNotificationsButton" aria-label="Notifications">
            <i data-lucide="bell"></i>
            <span class="rc-notification-dot" aria-hidden="true"></span>
        </button>
        <div class="rc-profile-wrap">
            <button type="button" class="rc-profile-button" id="rcProfileButton" aria-expanded="false" aria-controls="rcProfileMenu">
                <span class="rc-profile-avatar" id="currentUserAvatar">${getInitial(userName)}</span>
                <span class="rc-profile-copy">
                    <strong id="currentUserName">${userName}</strong>
                    <small id="currentUserEmail">${userEmail}</small>
                </span>
                <i data-lucide="chevron-down"></i>
            </button>
            <div class="rc-profile-menu card" id="rcProfileMenu" hidden>
                <strong>${userName}</strong>
                <span>${userEmail}</span>
                ${token
                    ? '<button type="button" class="button button-secondary" id="rcProfileLogoutButton">Logout</button>'
                    : `<a class="button button-secondary" href="${authPath("login.html", "?from=home")}">Login</a>`}
            </div>
        </div>
    `;

    body.prepend(navbar);
    body.prepend(sidebar);

    const toastContainer = document.createElement("div");
    toastContainer.className = "rc-toast-region";
    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-atomic", "true");
    body.append(toastContainer);

    const commandMenu = document.createElement("div");
    commandMenu.className = "rc-command-menu";
    commandMenu.id = "rcCommandMenu";
    commandMenu.hidden = true;
    commandMenu.innerHTML = `
        <div class="rc-command-backdrop" data-command-close></div>
        <section class="rc-command-card" role="dialog" aria-modal="true" aria-labelledby="rcCommandTitle">
            <h2 id="rcCommandTitle" class="sr-only">Command menu</h2>
            <header>
                <i data-lucide="search"></i>
                <input type="search" id="rcCommandInput" placeholder="Search commands, pages, tasks..." autocomplete="off">
                <kbd>Esc</kbd>
            </header>
            <div class="rc-command-list" id="rcCommandList">
                <button type="button" data-command-keywords="workspace tasks list" data-command-url="${pagePath("workspace.html")}">
                    <i data-lucide="briefcase-business"></i>
                    <span><strong>Open Workspace</strong><small>Team tasks, spaces, and projects</small></span>
                </button>
                <button type="button" data-command-keywords="new task create add" data-command-action="add-task">
                    <i data-lucide="plus-circle"></i>
                    <span><strong>Create task</strong><small>Add a workspace task</small></span>
                </button>
                <button type="button" data-command-keywords="ai generate tasks" data-command-action="ai-task">
                    <i data-lucide="sparkles"></i>
                    <span><strong>Generate AI tasks</strong><small>Break a prompt into project work</small></span>
                </button>
                <button type="button" data-command-keywords="calendar schedule" data-command-action="calendar">
                    <i data-lucide="calendar-days"></i>
                    <span><strong>Open calendar</strong><small>Review task due dates</small></span>
                </button>
                <button type="button" data-command-keywords="settings theme account" data-command-action="settings">
                    <i data-lucide="settings"></i>
                    <span><strong>Workspace settings</strong><small>Profile and notifications</small></span>
                </button>
            </div>
        </section>
    `;
    body.append(commandMenu);
    body.dataset.rcLayoutReady = "true";

    const setTitle = () => {
        const key = inferActiveKey();
        const titleConfig = pageTitles[key] || pageTitles[body.dataset.rcPage] || pageTitles.home;
        const eyebrow = document.getElementById("pageEyebrow");
        const title = document.getElementById("pageTitle");
        if (eyebrow) eyebrow.textContent = titleConfig[0];
        if (title) title.textContent = titleConfig[1];
    };

    const setActiveNav = () => {
        const key = inferActiveKey();
        const navKey = ["routines", "weekly"].includes(key) ? "overview" : key;
        document.querySelectorAll("[data-rc-nav]").forEach((item) => {
            item.classList.toggle("active", item.dataset.rcNav === navKey);
        });
        setTitle();
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
        window.location.href = appPath("index.html");
    };
    const showToast = (message, type = "info") => {
        if (!isModernWorkspace) return;
        const toast = document.createElement("div");
        toast.className = `rc-toast ${type}`;
        toast.innerHTML = `
            <i data-lucide="${type === "error" ? "circle-alert" : type === "success" ? "check-circle-2" : "sparkles"}"></i>
            <span>${message}</span>
        `;
        toastContainer.append(toast);
        window.lucide?.createIcons();
        window.setTimeout(() => toast.classList.add("visible"), 20);
        window.setTimeout(() => {
            toast.classList.remove("visible");
            window.setTimeout(() => toast.remove(), 220);
        }, 3200);
    };
    window.rcToast = showToast;

    const updateThemeButton = () => {
        const themeButton = document.getElementById("rcThemeToggle");
        const isDark = document.documentElement.classList.contains("dark");
        if (!themeButton) return;
        themeButton.setAttribute("aria-label", isDark ? "Switch to light theme" : "Switch to dark theme");
        themeButton.innerHTML = `<i data-lucide="${isDark ? "sun" : "moon"}"></i>`;
        window.lucide?.createIcons();
    };

    const closeCommandMenu = () => {
        commandMenu.hidden = true;
        body.classList.remove("rc-command-open");
    };
    const openCommandMenu = () => {
        if (!isModernWorkspace) return;
        commandMenu.hidden = false;
        body.classList.add("rc-command-open");
        const input = document.getElementById("rcCommandInput");
        if (input) {
            input.value = "";
            document.querySelectorAll("#rcCommandList button").forEach((button) => button.hidden = false);
            window.setTimeout(() => input.focus(), 0);
        }
    };

    const restoreSidebarState = () => {
        if (localStorage.getItem("rc_sidebar_collapsed") === "true") {
            body.classList.add("rc-sidebar-collapsed");
        }
    };

    document.getElementById("rcGlobalLogoutButton")?.addEventListener("click", logout);
    document.getElementById("rcProfileLogoutButton")?.addEventListener("click", logout);
    document.getElementById("rcThemeToggle")?.addEventListener("click", () => {
        const nextTheme = document.documentElement.classList.contains("dark") ? "light" : "dark";
        applyTheme(nextTheme);
        updateThemeButton();
        showToast(`${nextTheme === "dark" ? "Dark" : "Light"} theme enabled`, "success");
    });
    document.getElementById("rcNotificationsButton")?.addEventListener("click", () => {
        showToast("You are all caught up. No new notifications.", "info");
    });
    document.getElementById("rcGlobalSettingsButton")?.addEventListener("click", () => {
        const workspaceSettingsButton = document.querySelector('[data-page-target="settings"]');
        if (workspaceSettingsButton && fileName === "workspace.html") {
            workspaceSettingsButton.click();
            window.location.hash = "settings";
            setActiveNav();
            return;
        }
        sessionStorage.setItem("rc_workspace_page", "settings");
        window.location.href = pagePath("workspace.html", "#settings");
    });
    document.getElementById("rcSidebarCollapse")?.addEventListener("click", () => {
        body.classList.toggle("rc-sidebar-collapsed");
        localStorage.setItem("rc_sidebar_collapsed", String(body.classList.contains("rc-sidebar-collapsed")));
    });
    document.getElementById("rcMobileMenuButton")?.addEventListener("click", (event) => {
        event.stopPropagation();
        body.classList.toggle("rc-sidebar-open");
    });

    /* Close sidebar when clicking outside on mobile */
    document.addEventListener("click", (event) => {
        if (!body.classList.contains("rc-sidebar-open")) return;
        const sidebar = document.querySelector(".rc-global-sidebar");
        const menuBtn = document.getElementById("rcMobileMenuButton");
        if (sidebar && !sidebar.contains(event.target) && !menuBtn?.contains(event.target)) {
            body.classList.remove("rc-sidebar-open");
        }
    });

    /* Close sidebar on Escape key */
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && body.classList.contains("rc-sidebar-open")) {
            body.classList.remove("rc-sidebar-open");
        }
    });

    document.querySelectorAll(".rc-global-nav a, .rc-global-sidebar-bottom a").forEach((item) => {
        item.addEventListener("click", () => {
            body.classList.remove("rc-sidebar-open");
            window.setTimeout(setActiveNav, 0);
        });
    });

    const profileButton = document.getElementById("rcProfileButton");
    const profileMenu = document.getElementById("rcProfileMenu");
    const workspaceSwitcher = document.getElementById("rcWorkspaceSwitcher");
    const workspaceMenu = document.getElementById("rcWorkspaceMenu");
    profileButton?.addEventListener("click", (event) => {
        event.stopPropagation();
        profileMenu.hidden = !profileMenu.hidden;
        profileButton.setAttribute("aria-expanded", String(!profileMenu.hidden));
    });
    workspaceSwitcher?.addEventListener("click", (event) => {
        event.stopPropagation();
        workspaceMenu.hidden = !workspaceMenu.hidden;
        workspaceSwitcher.setAttribute("aria-expanded", String(!workspaceMenu.hidden));
    });
    document.querySelectorAll("[data-command-url]").forEach((button) => {
        button.addEventListener("click", () => {
            window.location.href = button.dataset.commandUrl;
        });
    });
    document.getElementById("rcCommandInput")?.addEventListener("input", (event) => {
        const query = event.currentTarget.value.trim().toLowerCase();
        document.querySelectorAll("#rcCommandList button").forEach((button) => {
            const text = `${button.textContent || ""} ${button.dataset.commandKeywords || ""}`.toLowerCase();
            button.hidden = query && !text.includes(query);
        });
    });
    document.getElementById("rcCommandList")?.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        const action = button.dataset.commandAction;
        if (!action) return;
        closeCommandMenu();
        if (fileName !== "workspace.html") {
            sessionStorage.setItem("rc_workspace_page", action === "calendar" ? "calendar" : action === "settings" ? "settings" : "home");
            window.location.href = pagePath("workspace.html");
            return;
        }
        if (action === "add-task") document.getElementById("openTaskModalButton")?.click();
        if (action === "ai-task") document.getElementById("openAIModalButton")?.click();
        if (action === "calendar") document.querySelector('[data-page-target="calendar"]')?.click();
        if (action === "settings") document.querySelector('[data-page-target="settings"]')?.click();
    });
    commandMenu.addEventListener("click", (event) => {
        if (event.target.closest("[data-command-close]")) closeCommandMenu();
    });
    document.addEventListener("keydown", (event) => {
        const isCommandShortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";
        if (isModernWorkspace && isCommandShortcut) {
            event.preventDefault();
            commandMenu.hidden ? openCommandMenu() : closeCommandMenu();
        }
        if (isModernWorkspace && event.key === "Escape" && !commandMenu.hidden) {
            closeCommandMenu();
        }
    });

    document.addEventListener("click", (event) => {
        if (!profileMenu?.hidden && !event.target.closest("#rcProfileMenu") && !event.target.closest("#rcProfileButton")) {
            profileMenu.hidden = true;
            profileButton?.setAttribute("aria-expanded", "false");
        }
        if (!workspaceMenu?.hidden && !event.target.closest("#rcWorkspaceMenu") && !event.target.closest("#rcWorkspaceSwitcher")) {
            workspaceMenu.hidden = true;
            workspaceSwitcher?.setAttribute("aria-expanded", "false");
        }
        if (body.classList.contains("rc-sidebar-open") && !event.target.closest(".rc-global-sidebar") && !event.target.closest("#rcMobileMenuButton")) {
            body.classList.remove("rc-sidebar-open");
        }
    });

    window.addEventListener("hashchange", setActiveNav);
    window.addEventListener("arc-theme-change", (event) => {
        const nextTheme = event.detail?.theme || getStoredTheme();
        body.dataset.theme = nextTheme;
        updateThemeButton();
    });
    restoreSidebarState();
    setActiveNav();
    updateThemeButton();

    if (window.lucide?.createIcons) {
        window.lucide.createIcons();
    }
})();
