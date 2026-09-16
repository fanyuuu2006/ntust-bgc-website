import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { load } from "./helpers/load-app-module.mjs";

const date = load("src/utils/date.tsx");

function formHarness(path, name, props) {
  let cursor = 0;
  const states = [];
  const calls = [];
  function EditorStub() {}
  const component = load(path, {
    react: {
      ...React,
      useMemo: (fn) => fn(),
      useState(initial) {
        const index = cursor++;
        if (!(index in states)) states[index] = typeof initial === "function" ? initial() : initial;
        return [states[index], (next) => {
          states[index] = typeof next === "function" ? next(states[index]) : next;
        }];
      },
    },
    "next/dynamic": { default: () => EditorStub },
    "next/navigation": { useRouter: () => ({ refresh() {} }) },
    "@/libs/api/client": { apiClient: async (...args) => calls.push(args) },
  })[name];
  const tree = () => {
    cursor = 0;
    return component(props);
  };
  function find(element, predicate) {
    if (!element || typeof element !== "object") return null;
    if (predicate(element)) return element;
    return React.Children.toArray(element.props?.children)
      .map((child) => find(child, predicate))
      .find(Boolean) ?? null;
  }
  return { tree, find, calls };
}

test("Taiwan datetime-local conversion is stable at day, month, and year boundaries", () => {
  for (const [local, instant] of [
    ["2026-09-17T00:15", "2026-09-16T16:15:00.000Z"],
    ["2026-09-17T23:45", "2026-09-17T15:45:00.000Z"],
    ["2026-10-01T00:15", "2026-09-30T16:15:00.000Z"],
    ["2027-01-01T00:15", "2026-12-31T16:15:00.000Z"],
  ]) {
    assert.equal(date.parseTaipeiDateTimeLocal(local), instant);
    assert.equal(date.formatTaipeiDateTimeLocal(new Date(instant)), local);
  }
});

test("event edit initializes Taiwan wall time and round-trips all event instants", async () => {
  const event = {
    id: "event",
    name: "晚間活動",
    description: null,
    description_format: "plain_text",
    rich_description: null,
    start_time: "2026-09-16T14:25:00Z",
    end_time: "2026-09-16T15:23:00Z",
    check_in_opens_at: "2026-09-16T14:10:00Z",
    check_in_closes_at: "2026-09-16T15:10:00Z",
  };
  const h = formHarness(
    "src/components/(admin)/admin/events/EventRecords.tsx",
    "EventRecords",
    { events: [event] },
  );
  h.find(h.tree(), (element) => typeof element.props?.onEdit === "function").props.onEdit(event);
  const tree = h.tree();
  assert.equal(h.find(tree, (element) => element.props?.id === "event-start-time").props.value, "2026-09-16T22:25");
  assert.equal(h.find(tree, (element) => element.props?.id === "event-end-time").props.value, "2026-09-16T23:23");
  assert.equal(h.find(tree, (element) => element.props?.id === "edit-event-check-in-opens-at").props.value, "2026-09-16T22:10");
  assert.equal(h.find(tree, (element) => element.props?.id === "edit-event-check-in-closes-at").props.value, "2026-09-16T23:10");
  await h.find(tree, (element) => element.type === "form").props.onSubmit({ preventDefault() {} });
  assert.deepEqual(h.calls[0][1].body, {
    name: "晚間活動",
    description_format: "rich_text_v1",
    rich_description: { type: "doc", content: [{ type: "paragraph", content: [] }] },
    start_time: "2026-09-16T14:25:00.000Z",
    end_time: "2026-09-16T15:23:00.000Z",
    check_in_opens_at: "2026-09-16T14:10:00.000Z",
    check_in_closes_at: "2026-09-16T15:10:00.000Z",
  });
});

test("event creation serializes Taiwan wall time and preserves null self-check-in", async () => {
  const h = formHarness("src/components/(admin)/admin/events/EventActions.tsx", "EventActions", {});
  h.find(h.tree(), (element) => element.props?.children === "新增活動").props.onClick();
  let tree = h.tree();
  for (const [id, value] of [
    ["event-name", "晚間活動"],
    ["event-start-time", "2026-09-16T22:25"],
    ["event-end-time", "2026-09-16T23:23"],
  ]) {
    h.find(tree, (element) => element.props?.id === id).props.onChange({ target: { value } });
    tree = h.tree();
  }
  await h.find(tree, (element) => element.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(h.calls[0][1].body.start_time, "2026-09-16T14:25:00.000Z");
  assert.equal(h.calls[0][1].body.end_time, "2026-09-16T15:23:00.000Z");
  assert.equal(h.calls[0][1].body.check_in_opens_at, null);
  assert.equal(h.calls[0][1].body.check_in_closes_at, null);
});

test("membership edit uses Taiwan wall time and preserves original sub-minute precision when unchanged", async () => {
  const membership = {
    id: "membership",
    user_id: "user",
    academic_year_id: "year",
    type: "regular",
    status: "active",
    joined_at: "2026-09-16T14:14:08.850885Z",
    created_at: "2026-09-16T14:14:08.850885Z",
    user: { id: "user", name: "社員", email: "member@example.test" },
    user_profile: null,
    academic_year: { id: "year", year: 115 },
  };
  const h = formHarness(
    "src/components/(admin)/admin/memberships/MembershipRecords.tsx",
    "MembershipRecords",
    { memberships: [membership], years: [membership.academic_year], query: {} },
  );
  h.find(h.tree(), (element) => typeof element.props?.onEdit === "function").props.onEdit(membership);
  const tree = h.tree();
  assert.equal(h.find(tree, (element) => element.props?.id === "membership-joined-at").props.value, "2026-09-16T22:14");
  await h.find(tree, (element) => element.type === "form").props.onSubmit({ preventDefault() {} });
  assert.equal(h.calls[0][1].body.joined_at, membership.joined_at);
});

test("instant forms use explicit Taiwan boundaries and Academic Year remains date-only", () => {
  const eventActions = readFileSync("src/components/(admin)/admin/events/EventActions.tsx", "utf8");
  const eventRecords = readFileSync("src/components/(admin)/admin/events/EventRecords.tsx", "utf8");
  const memberships = readFileSync("src/components/(admin)/admin/memberships/MembershipRecords.tsx", "utf8");
  const academicYears = readFileSync("src/components/(admin)/admin/academic-years/AcademicYearActions.tsx", "utf8");
  for (const source of [eventActions, eventRecords, memberships]) {
    assert.match(source, /parseTaipeiDateTimeLocal/);
    assert.doesNotMatch(source, /new Date\(values\.[^)]+\)\.toISOString\(\)/);
  }
  assert.match(eventRecords, /formatTaipeiDateTimeLocal/);
  assert.match(memberships, /formatTaipeiDateTimeLocal/);
  assert.doesNotMatch(academicYears, /slice\(0, 10\)/);
});
