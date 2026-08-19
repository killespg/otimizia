import { describe, expect, it } from "vitest";
import {
  TASK_VISIBILITY_OPTIONS,
  canAssignLegalTasks,
  effectiveTaskVisibility,
  filterTasksForSurface,
  shouldShowOthersTask,
  type TaskVisibilityMode,
} from "./task-visibility";

const orgOpen = { locked: false, mode: "profile" as TaskVisibilityMode };
const orgLockedMixed = { locked: true, mode: "mixed" as TaskVisibilityMode };

describe("effectiveTaskVisibility", () => {
  it("uses the member choice when the organization did not lock the policy", () => {
    expect(effectiveTaskVisibility("private", orgOpen)).toBe("private");
    expect(effectiveTaskVisibility(null, orgOpen)).toBe("profile");
  });

  it("uses the organization mode when the policy is locked", () => {
    expect(effectiveTaskVisibility("private", orgLockedMixed)).toBe("mixed");
  });
});

describe("shouldShowOthersTask", () => {
  it("hides everything when either person is private", () => {
    expect(shouldShowOthersTask({ viewer: "mixed", owner: "private", surface: "profile" })).toBe(false);
    expect(shouldShowOthersTask({ viewer: "private", owner: "mixed", surface: "agenda" })).toBe(false);
  });

  it("allows profile inspection when both are not private", () => {
    expect(shouldShowOthersTask({ viewer: "profile", owner: "profile", surface: "profile" })).toBe(true);
    expect(shouldShowOthersTask({ viewer: "profile", owner: "mixed", surface: "agenda" })).toBe(false);
  });

  it("mixes into agenda and dashboard only when the viewer chose mixed", () => {
    expect(shouldShowOthersTask({ viewer: "mixed", owner: "profile", surface: "agenda" })).toBe(true);
    expect(shouldShowOthersTask({ viewer: "mixed", owner: "profile", surface: "dashboard" })).toBe(true);
  });
});

describe("filterTasksForSurface", () => {
  const mine = { id: "1", owner_id: "me", assignee_id: "me" };
  const ana = { id: "2", owner_id: "ana", assignee_id: "ana" };
  const modes = new Map<string, TaskVisibilityMode>([
    ["me", "mixed"],
    ["ana", "profile"],
  ]);

  it("always keeps the viewer's own queue", () => {
    expect(filterTasksForSurface([mine, ana], "me", "private", modes, "agenda").map((item) => item.id)).toEqual(["1"]);
  });

  it("mixes Ana's task into the agenda when the viewer is mixed and Ana is not private", () => {
    expect(filterTasksForSurface([mine, ana], "me", "mixed", modes, "agenda").map((item) => item.id)).toEqual(["1", "2"]);
  });
});

describe("canAssignLegalTasks", () => {
  it("allows owner, managing partner and org admin", () => {
    expect(canAssignLegalTasks("owner", false)).toBe(true);
    expect(canAssignLegalTasks("managing_partner", false)).toBe(true);
    expect(canAssignLegalTasks("lawyer", true)).toBe(true);
    expect(canAssignLegalTasks("lawyer", false)).toBe(false);
  });
});

describe("TASK_VISIBILITY_OPTIONS", () => {
  it("describes the three member-facing modes", () => {
    expect(TASK_VISIBILITY_OPTIONS.map((option) => option.value)).toEqual(["profile", "mixed", "private"]);
    expect(TASK_VISIBILITY_OPTIONS[0].description).toMatch(/perfil da pessoa/i);
    expect(TASK_VISIBILITY_OPTIONS[1].description).toMatch(/dashboard/i);
    expect(TASK_VISIBILITY_OPTIONS[1].description).toMatch(/Agenda e prazos/i);
    expect(TASK_VISIBILITY_OPTIONS[1].description).toMatch(/etiqueta/i);
    expect(TASK_VISIBILITY_OPTIONS[2].description).toMatch(/mesmo mediante acesso no perfil/i);
  });
});
