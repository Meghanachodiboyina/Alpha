const API_BASE = "http://127.0.0.1:8000";
const token = localStorage.getItem("arc_token");
const currentUser = JSON.parse(localStorage.getItem("arc_user") || "null");

if (!token) {
    window.location.href = "index.html";
}

const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
});

const projectState = {
    tasks: [],
    invites: [],
    members: [],
    activeView: "table",
    filters: {
        due_date: "",
        assignee: "",
        status: "",
        priority: "",
        search: "",
        sort_by: "due_date",
        sort_order: "asc",
    },
};

const messageTimers = new Map();

const setMessage = (elementId, message, type = "success") => {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.textContent = message;
    target.className = `form-message ${type === "success" ? "success-text" : "error-text"}`;
    window.clearTimeout(messageTimers.get(elementId));
    if (message) {
        const timer = window.setTimeout(() => {
            target.textContent = "";
            target.className = "form-message";
        }, 3200);
        messageTimers.set(elementId, timer);
    }
};

const normalizeApiError = async (response) => {
    const data = await response.json().catch(() => ({}));
    return data.detail || data.message || "Something went wrong.";
};

const fetchJson = async (url, options = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(await normalizeApiError(response));
    }
    if (response.status === 204) {
        return null;
    }
    return response.json();
};

const buildQueryString = () => {
    const params = new URLSearchParams();
    Object.entries(projectState.filters).forEach(([key, value]) => {
        if (value) {
            params.set(key, value);
        }
    });
    const query = params.toString();
    return query ? `?${query}` : "";
};

const formatDate = (value) => {
    if (!value) return "No due date";
    return new Date(`${value}T00:00:00`).toLocaleDateString([], {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

const escapeHtml = (value = "") =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const taskPriorityClass = (priority) => priority.toLowerCase();
const taskStatusClass = (status) => status.toLowerCase().replace(/\s+/g, "-");

const resetTaskForm = () => {
    document.getElementById("taskForm").reset();
    document.getElementById("taskId").value = "";
    document.getElementById("taskPriority").value = "Medium";
    document.getElementById("taskStatus").value = "Todo";
    document.getElementById("taskModalTitle").textContent = "Create task";
};

const openTaskModal = (task = null) => {
    resetTaskForm();
    if (task) {
        document.getElementById("taskId").value = task.id;
        document.getElementById("taskTitle").value = task.title;
        document.getElementById("taskDescription").value = task.description || "";
        document.getElementById("taskDueDate").value = task.due_date;
        document.getElementById("taskAssignee").value = task.assignee;
        document.getElementById("taskPriority").value = task.priority;
        document.getElementById("taskStatus").value = task.status;
        document.getElementById("taskComments").value = task.comments || "";
        document.getElementById("taskModalTitle").textContent = "Edit task";
    } else {
        document.getElementById("taskDueDate").value = new Date().toISOString().slice(0, 10);
    }
    document.getElementById("taskModal").showModal();
};

const closeTaskModal = () => {
    document.getElementById("taskModal").close();
    resetTaskForm();
};

const renderMetrics = () => {
    const total = projectState.tasks.length;
    const inProgress = projectState.tasks.filter((task) => task.status === "In Progress").length;
    const completed = projectState.tasks.filter((task) => task.status === "Completed").length;
    const dueThisWeek = projectState.tasks.filter((task) => {
        const today = new Date();
        const dueDate = new Date(`${task.due_date}T00:00:00`);
        const diff = dueDate.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        return diff >= 0 && diff <= 6 * 24 * 60 * 60 * 1000;
    }).length;
    const blockedOrUrgent = projectState.tasks.filter((task) => task.status === "Blocked" || task.priority === "Urgent").length;

    document.getElementById("pmTotalTasks").textContent = total;
    document.getElementById("pmInProgressTasks").textContent = inProgress;
    document.getElementById("pmCompletedTasks").textContent = completed;
    document.getElementById("teamSpaceCount").textContent = `${total} active item${total === 1 ? "" : "s"}`;
    document.getElementById("projectOneCount").textContent = `${dueThisWeek} due this week`;
    document.getElementById("projectTwoCount").textContent = `${blockedOrUrgent} urgent or blocked`;
};

const createActionButtons = (task) => `
    <div class="task-action-row">
        <button type="button" class="ghost-button action-edit" data-task-id="${task.id}">Edit</button>
        <button type="button" class="ghost-button action-delete" data-task-id="${task.id}">Delete</button>
        <button type="button" class="secondary-button action-complete" data-task-id="${task.id}" ${task.status === "Completed" ? "disabled" : ""}>Mark Complete</button>
    </div>
`;

const renderTableView = () => {
    const body = document.getElementById("taskTableBody");
    if (!projectState.tasks.length) {
        body.innerHTML = `<tr><td colspan="7"><div class="empty-state">No project tasks yet. Create the first task to start your workspace.</div></td></tr>`;
        return;
    }

    body.innerHTML = projectState.tasks
        .map((task) => `
            <tr>
                <td>
                    <strong>${escapeHtml(task.title)}</strong>
                    <div class="task-row-subtitle">${escapeHtml(task.description || "No description added.")}</div>
                </td>
                <td>${formatDate(task.due_date)}</td>
                <td>${escapeHtml(task.assignee)}</td>
                <td><span class="tag ${taskPriorityClass(task.priority)}">${escapeHtml(task.priority)}</span></td>
                <td><span class="tag ${taskStatusClass(task.status)}">${escapeHtml(task.status)}</span></td>
                <td>${escapeHtml(task.comments || "No comments")}</td>
                <td>${createActionButtons(task)}</td>
            </tr>
        `)
        .join("");
};

const createBoardCard = (task) => {
    const card = document.createElement("article");
    card.className = "kanban-card";
    card.draggable = true;
    card.dataset.taskId = task.id;
    card.innerHTML = `
        <div class="kanban-card-top">
            <strong>${escapeHtml(task.title)}</strong>
            <span class="tag ${taskPriorityClass(task.priority)}">${escapeHtml(task.priority)}</span>
        </div>
        <p>${escapeHtml(task.description || "No description added.")}</p>
        <div class="routine-meta">
            <span class="tag info">${formatDate(task.due_date)}</span>
            <span class="tag">${escapeHtml(task.assignee)}</span>
        </div>
    `;

    card.addEventListener("dragstart", (event) => {
        event.dataTransfer?.setData("text/plain", String(task.id));
        card.classList.add("dragging");
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));
    card.addEventListener("dblclick", () => openTaskModal(task));
    return card;
};

const renderBoardView = () => {
    const statuses = ["Todo", "In Progress", "Completed"];
    statuses.forEach((status) => {
        const zone = document.querySelector(`.kanban-dropzone[data-drop-status="${status}"]`);
        zone.innerHTML = "";
        const tasks = projectState.tasks.filter((task) => task.status === status);
        tasks.forEach((task) => zone.appendChild(createBoardCard(task)));
        if (!tasks.length) {
            zone.innerHTML = `<div class="empty-state">No ${status.toLowerCase()} tasks</div>`;
        }
    });

    document.getElementById("todoCount").textContent = projectState.tasks.filter((task) => task.status === "Todo").length;
    document.getElementById("inProgressCount").textContent = projectState.tasks.filter((task) => task.status === "In Progress").length;
    document.getElementById("completedCount").textContent = projectState.tasks.filter((task) => task.status === "Completed").length;
    const blockedTasks = projectState.tasks.filter((task) => task.status === "Blocked");
    document.getElementById("blockedCount").textContent = blockedTasks.length;
    const blockedTaskList = document.getElementById("blockedTaskList");
    blockedTaskList.innerHTML = blockedTasks.length
        ? blockedTasks
              .map(
                  (task) => `
                    <article class="kanban-card blocked-card" data-task-id="${task.id}">
                        <div class="kanban-card-top">
                            <strong>${escapeHtml(task.title)}</strong>
                            <span class="tag blocked">Blocked</span>
                        </div>
                        <p>${escapeHtml(task.comments || task.description || "Needs attention before it can move forward.")}</p>
                    </article>
                `
              )
              .join("")
        : `<div class="empty-state">No blocked tasks right now.</div>`;
};

const renderCalendarView = () => {
    const container = document.getElementById("calendarTaskGrid");
    if (!projectState.tasks.length) {
        container.innerHTML = `<div class="empty-state">Calendar view will fill in once your project tasks have due dates.</div>`;
        return;
    }

    const grouped = projectState.tasks.reduce((accumulator, task) => {
        const key = task.due_date;
        accumulator[key] = accumulator[key] || [];
        accumulator[key].push(task);
        return accumulator;
    }, {});

    container.innerHTML = Object.entries(grouped)
        .sort((first, second) => first[0].localeCompare(second[0]))
        .map(([date, tasks]) => `
            <article class="calendar-day-card">
                <div class="calendar-day-header">
                    <h4>${formatDate(date)}</h4>
                    <span>${tasks.length} task${tasks.length === 1 ? "" : "s"}</span>
                </div>
                <div class="calendar-day-list">
                    ${tasks
                        .map(
                            (task) => `
                                <button type="button" class="calendar-task-pill" data-task-id="${task.id}">
                                    <span>${escapeHtml(task.title)}</span>
                                    <small>${escapeHtml(task.assignee)} - ${escapeHtml(task.status)}</small>
                                </button>
                            `
                        )
                        .join("")}
                </div>
            </article>
        `)
        .join("");
};

const renderGanttView = () => {
    const container = document.getElementById("ganttTimeline");
    if (!projectState.tasks.length) {
        container.innerHTML = `<div class="empty-state">Timeline view needs tasks before it can show delivery pacing.</div>`;
        return;
    }

    const timestamps = projectState.tasks.map((task) => new Date(`${task.due_date}T00:00:00`).getTime());
    const min = Math.min(...timestamps);
    const max = Math.max(...timestamps);
    const range = Math.max(max - min, 86400000);

    container.innerHTML = projectState.tasks
        .map((task) => {
            const value = new Date(`${task.due_date}T00:00:00`).getTime();
            const offset = ((value - min) / range) * 100;
            const width = Math.max(14, 100 - offset);
            return `
                <article class="gantt-row">
                    <div class="gantt-task-meta">
                        <strong>${escapeHtml(task.title)}</strong>
                        <span>${escapeHtml(task.assignee)} - ${formatDate(task.due_date)}</span>
                    </div>
                    <div class="gantt-track">
                        <div class="gantt-bar ${taskStatusClass(task.status)}" style="margin-left:${offset}%; width:${width}%;"></div>
                    </div>
                </article>
            `;
        })
        .join("");
};

const renderMembers = () => {
    const container = document.getElementById("workspaceMembersList");
    if (!projectState.members.length) {
        container.innerHTML = `<div class="empty-state">No workspace members yet.</div>`;
        return;
    }

    container.innerHTML = projectState.members
        .map(
            (member) => `
                <article class="member-card">
                    <div class="profile-avatar small">${escapeHtml(member.name.charAt(0).toUpperCase())}</div>
                    <div>
                        <strong>${escapeHtml(member.name)}</strong>
                        <div>${escapeHtml(member.email)}</div>
                    </div>
                    <span class="tag info">${escapeHtml(member.role)}</span>
                </article>
            `
        )
        .join("");
};

const renderInvites = () => {
    const container = document.getElementById("workspaceInvitesList");
    if (!projectState.invites.length) {
        container.innerHTML = `<div class="empty-state">No workspace invitations yet.</div>`;
        return;
    }

    container.innerHTML = projectState.invites
        .map((invite) => {
            const isIncoming = currentUser && invite.invitee_email.toLowerCase() === currentUser.email.toLowerCase();
            return `
                <article class="invite-card">
                    <div>
                        <strong>${escapeHtml(invite.invitee_email)}</strong>
                        <div>Invited by ${escapeHtml(invite.inviter_name)}</div>
                        <div>${formatDate(invite.created_at.slice(0, 10))}</div>
                    </div>
                    <div class="invite-actions">
                        <span class="tag ${taskStatusClass(invite.status)}">${escapeHtml(invite.status)}</span>
                        ${isIncoming && invite.status === "Pending" ? `
                            <button type="button" class="secondary-button action-accept-invite" data-invite-id="${invite.id}">Accept</button>
                            <button type="button" class="ghost-button action-decline-invite" data-invite-id="${invite.id}">Decline</button>
                        ` : ""}
                    </div>
                </article>
            `;
        })
        .join("");
};

const renderViews = () => {
    renderMetrics();
    renderTableView();
    renderBoardView();
    renderCalendarView();
    renderGanttView();
    renderMembers();
    renderInvites();

    document.querySelectorAll("[data-view-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.viewPanel !== projectState.activeView;
    });
    document.querySelectorAll("[data-view-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.viewTab === projectState.activeView);
    });
};

const loadTasks = async () => {
    const tasks = await fetchJson(`${API_BASE}/projects/tasks${buildQueryString()}`, {
        headers: authHeaders(),
    });
    projectState.tasks = tasks;
};

const loadWorkspaceMeta = async () => {
    const [invites, members] = await Promise.all([
        fetchJson(`${API_BASE}/workspace/invitations`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/workspace/members`, { headers: authHeaders() }),
    ]);
    projectState.invites = invites;
    projectState.members = members;
};

const refreshWorkspace = async () => {
    try {
        await Promise.all([loadTasks(), loadWorkspaceMeta()]);
        renderViews();
    } catch (error) {
        if (error.message.toLowerCase().includes("credentials")) {
            localStorage.clear();
            window.location.href = "index.html";
            return;
        }
        setMessage("projectMessage", error.message, "error");
    }
};

const saveTask = async (event) => {
    event.preventDefault();
    const taskId = document.getElementById("taskId").value;
    const payload = {
        title: document.getElementById("taskTitle").value.trim(),
        description: document.getElementById("taskDescription").value.trim() || null,
        due_date: document.getElementById("taskDueDate").value,
        assignee: document.getElementById("taskAssignee").value.trim(),
        priority: document.getElementById("taskPriority").value,
        status: document.getElementById("taskStatus").value,
        comments: document.getElementById("taskComments").value.trim() || null,
    };

    const url = taskId ? `${API_BASE}/projects/tasks/${taskId}` : `${API_BASE}/projects/tasks`;
    const method = taskId ? "PUT" : "POST";

    try {
        await fetchJson(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload),
        });
        closeTaskModal();
        setMessage("projectMessage", taskId ? "Task updated successfully." : "Task created successfully.");
        await refreshWorkspace();
    } catch (error) {
        setMessage("projectMessage", error.message, "error");
    }
};

const updateTaskStatus = async (taskId, status) => {
    try {
        await fetchJson(`${API_BASE}/projects/tasks/${taskId}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ status }),
        });
        setMessage("projectMessage", `Task moved to ${status}.`);
        await refreshWorkspace();
    } catch (error) {
        setMessage("projectMessage", error.message, "error");
    }
};

const handleTaskActions = async (event) => {
    const taskId = event.target.dataset.taskId;
    if (!taskId) return;
    const task = projectState.tasks.find((item) => item.id === Number(taskId));
    if (!task) return;

    if (event.target.classList.contains("action-edit")) {
        openTaskModal(task);
    }

    if (event.target.classList.contains("action-delete")) {
        try {
            await fetchJson(`${API_BASE}/projects/tasks/${task.id}`, {
                method: "DELETE",
                headers: authHeaders(),
            });
            setMessage("projectMessage", "Task deleted.");
            await refreshWorkspace();
        } catch (error) {
            setMessage("projectMessage", error.message, "error");
        }
    }

    if (event.target.classList.contains("action-complete")) {
        await updateTaskStatus(task.id, "Completed");
    }
};

const handleInviteSubmit = async (event) => {
    event.preventDefault();
    try {
        await fetchJson(`${API_BASE}/workspace/invitations`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ invitee_email: document.getElementById("inviteEmail").value.trim() }),
        });
        document.getElementById("inviteForm").reset();
        setMessage("inviteMessage", "Workspace invitation sent.");
        await refreshWorkspace();
    } catch (error) {
        setMessage("inviteMessage", error.message, "error");
    }
};

const handleInviteActions = async (event) => {
    const inviteId = event.target.dataset.inviteId;
    if (!inviteId) return;

    const action = event.target.classList.contains("action-accept-invite") ? "accept" : "decline";
    try {
        await fetchJson(`${API_BASE}/workspace/invitations/${inviteId}/respond`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ action }),
        });
        setMessage("inviteMessage", action === "accept" ? "Invitation accepted." : "Invitation declined.");
        await refreshWorkspace();
    } catch (error) {
        setMessage("inviteMessage", error.message, "error");
    }
};

const handleFilterInputs = () => {
    projectState.filters.due_date = document.getElementById("filterDueDate").value;
    projectState.filters.assignee = document.getElementById("filterAssignee").value.trim();
    projectState.filters.status = document.getElementById("filterStatus").value;
    projectState.filters.priority = document.getElementById("filterPriority").value;
    projectState.filters.search = document.getElementById("projectSearchInput").value.trim();
    projectState.filters.sort_by = document.getElementById("sortBy").value;
    projectState.filters.sort_order = document.getElementById("sortOrder").value;
    refreshWorkspace();
};

document.getElementById("workspaceUserAvatar").textContent = currentUser?.name?.charAt(0)?.toUpperCase() || "U";
document.getElementById("taskForm").addEventListener("submit", saveTask);
document.getElementById("inviteForm").addEventListener("submit", handleInviteSubmit);
document.getElementById("taskTableBody").addEventListener("click", handleTaskActions);
document.getElementById("workspaceInvitesList").addEventListener("click", handleInviteActions);
document.getElementById("addTaskButton").addEventListener("click", () => openTaskModal());
document.getElementById("openTaskModalButton").addEventListener("click", () => openTaskModal());
document.getElementById("closeTaskModalButton").addEventListener("click", closeTaskModal);
document.getElementById("resetTaskFormButton").addEventListener("click", resetTaskForm);
document.getElementById("projectLogoutButton").addEventListener("click", () => {
    localStorage.clear();
    window.location.href = "index.html";
});

document.querySelectorAll("[data-view-tab]").forEach((button) => {
    button.addEventListener("click", () => {
        projectState.activeView = button.dataset.viewTab;
        renderViews();
    });
});

document.getElementById("toggleFilterPanelButton").addEventListener("click", () => {
    const panel = document.getElementById("projectFilterPanel");
    panel.hidden = !panel.hidden;
});

document.getElementById("toggleSortPanelButton").addEventListener("click", () => {
    const panel = document.getElementById("projectSortPanel");
    panel.hidden = !panel.hidden;
});

["filterDueDate", "filterAssignee", "filterStatus", "filterPriority", "sortBy", "sortOrder"].forEach((id) => {
    document.getElementById(id).addEventListener("change", handleFilterInputs);
});

document.getElementById("projectSearchInput").addEventListener("input", handleFilterInputs);

document.getElementById("clearProjectFilters").addEventListener("click", () => {
    document.getElementById("filterDueDate").value = "";
    document.getElementById("filterAssignee").value = "";
    document.getElementById("filterStatus").value = "";
    document.getElementById("filterPriority").value = "";
    document.getElementById("projectSearchInput").value = "";
    document.getElementById("sortBy").value = "due_date";
    document.getElementById("sortOrder").value = "asc";
    handleFilterInputs();
});

document.querySelectorAll(".kanban-dropzone").forEach((zone) => {
    zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        zone.classList.add("over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", async (event) => {
        event.preventDefault();
        zone.classList.remove("over");
        const taskId = Number(event.dataTransfer?.getData("text/plain"));
        if (!taskId) return;
        await updateTaskStatus(taskId, zone.dataset.dropStatus);
    });
});

document.getElementById("calendarTaskGrid").addEventListener("click", (event) => {
    const taskId = Number(event.target.closest("[data-task-id]")?.dataset.taskId);
    if (!taskId) return;
    const task = projectState.tasks.find((item) => item.id === taskId);
    if (task) {
        openTaskModal(task);
    }
});

document.getElementById("blockedTaskList").addEventListener("click", (event) => {
    const taskId = Number(event.target.closest("[data-task-id]")?.dataset.taskId);
    if (!taskId) return;
    const task = projectState.tasks.find((item) => item.id === taskId);
    if (task) {
        openTaskModal(task);
    }
});

document.querySelectorAll("[data-workspace-node]").forEach((button) => {
    button.addEventListener("click", () => {
        document.querySelectorAll("[data-workspace-node]").forEach((node) => node.classList.remove("active"));
        button.classList.add("active");
    });
});

refreshWorkspace();
