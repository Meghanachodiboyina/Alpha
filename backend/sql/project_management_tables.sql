CREATE TABLE IF NOT EXISTS project_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    due_date DATE NOT NULL,
    assignee VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL DEFAULT 'Todo',
    comments TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_project_tasks_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_project_tasks_user_id (user_id),
    INDEX idx_project_tasks_due_date (due_date),
    INDEX idx_project_tasks_status (status),
    INDEX idx_project_tasks_priority (priority)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    inviter_user_id INT NOT NULL,
    invitee_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at DATETIME NULL,
    CONSTRAINT fk_workspace_invites_user
        FOREIGN KEY (inviter_user_id) REFERENCES users(id)
        ON DELETE CASCADE,
    INDEX idx_workspace_invites_inviter_user_id (inviter_user_id),
    INDEX idx_workspace_invites_invitee_email (invitee_email),
    INDEX idx_workspace_invites_status (status)
);
