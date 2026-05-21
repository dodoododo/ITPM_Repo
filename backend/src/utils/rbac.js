const toId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const sameId = (left, right) => toId(left) === toId(right);

const hasId = (values = [], id) => {
  const needle = toId(id);
  return values.some((value) => toId(value) === needle);
};

const isAdmin = (user) => user?.role === "admin";
const isManager = (user) => user?.role === "manager";

const isProjectOwner = (user, project) => sameId(project?.owner_id, user?.userId);
const isProjectMember = (user, project) => (
  isProjectOwner(user, project) || hasId(project?.member_ids || [], user?.userId)
);

const isPublicProject = (project) => project?.visibility === "public";

const buildProjectVisibilityFilter = (user) => {
  if (isAdmin(user)) return {};

  const userId = user.userId;
  return {
    $or: [
      { visibility: "public" },
      { owner_id: userId },
      { member_ids: userId },
    ],
  };
};

const getUserDepartmentIds = async (Department, userId) => {
  const departments = await Department.find({
    $or: [
      { member_ids: userId },
      { manager_id: userId },
    ],
  }).select("_id").lean();
  return departments.map((department) => department._id.toString());
};

const isManagerInProjectDepartment = async (user, project, Department) => {
  if (!isManager(user) || !project?.department_id) return false;

  const departmentIds = await getUserDepartmentIds(Department, user.userId);
  return departmentIds.includes(toId(project.department_id));
};

const canViewProject = (user, project) => (
  Boolean(project)
  && (isAdmin(user) || isPublicProject(project) || isProjectMember(user, project))
);

const canManageProject = async (user, project, Department) => {
  if (!project) return false;
  if (isAdmin(user)) return true;
  if (!isManager(user)) return false;
  if (isProjectOwner(user, project)) return true;
  return isManagerInProjectDepartment(user, project, Department);
};

const canCreateProject = async ({ user, ownerId, departmentId, Department }) => {
  if (isAdmin(user)) return true;
  if (!isManager(user)) return false;
  if (ownerId && !sameId(ownerId, user.userId)) return false;
  if (!departmentId) return true;

  const departmentIds = await getUserDepartmentIds(Department, user.userId);
  return departmentIds.includes(toId(departmentId));
};

const canAccessTaskContent = async (user, project, Department) => {
  if (!project) return false;
  if (isProjectMember(user, project)) return true;
  if (isManager(user)) {
    return isManagerInProjectDepartment(user, project, Department);
  }
  return false;
};

const canManageTask = async (user, project, Department) => {
  if (!project) return false;
  if (isProjectMember(user, project) && (isAdmin(user) || isManager(user))) return true;
  if (isManager(user)) {
    return isManagerInProjectDepartment(user, project, Department);
  }
  return false;
};

const isTaskParticipant = (user, task) => (
  sameId(task?.assignee_id, user?.userId)
  || sameId(task?.reviewer_id, user?.userId)
  || sameId(task?.created_by, user?.userId)
);

const canUpdateTaskProgress = async (user, task, project, Department) => {
  if (!task || !project) return false;
  if (isTaskParticipant(user, task) || isProjectMember(user, project)) return true;
  if (isManager(user)) return isManagerInProjectDepartment(user, project, Department);
  return false;
};

const canSubmitTaskResult = (user, task) => sameId(task?.assignee_id, user?.userId);

const canReviewTaskResult = async (user, task, project, Department) => {
  if (!task || !project) return false;
  if (sameId(task.reviewer_id, user?.userId) && (isAdmin(user) || isManager(user))) return true;
  if (isManager(user) && sameId(project.owner_id, user?.userId)) return true;
  if (isManager(user)) return isManagerInProjectDepartment(user, project, Department);
  return false;
};

const deny = (res, message = "Access denied") => (
  res.status(403).json({ success: false, message })
);

module.exports = {
  toId,
  sameId,
  hasId,
  isAdmin,
  isManager,
  isProjectMember,
  buildProjectVisibilityFilter,
  getUserDepartmentIds,
  canViewProject,
  canManageProject,
  canCreateProject,
  canAccessTaskContent,
  canManageTask,
  canUpdateTaskProgress,
  canSubmitTaskResult,
  canReviewTaskResult,
  deny,
};
