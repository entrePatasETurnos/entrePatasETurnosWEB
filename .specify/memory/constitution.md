<!--
Sync Impact Report
- Version change: (unversioned template) → 1.0.0
- Modified principles (template placeholder → new title):
  - [PRINCIPLE_1_NAME] → I. Next.js and React, Responsive and Keyboard-Usable
  - [PRINCIPLE_2_NAME] → II. entrePatasETurnosAPI as the Backend
  - [PRINCIPLE_3_NAME] → III. Two Sign-In Methods, One Set of Access Rules
  - [PRINCIPLE_4_NAME] → IV. Plans Document Compliance Verification
  - [PRINCIPLE_5_NAME] → removed (the project defines four principles)
- Added sections:
  - Scope and Deferred Decisions (from [SECTION_2_NAME])
  - Development Workflow (from [SECTION_3_NAME])
  - Governance (filled in)
- Removed sections: Principle 5 slot
- Templates: not modified; dependent templates and commands read this file at runtime.
- Follow-up TODOs: none. Ratification date set to the adoption date of this first version.
-->

# entrePatasETurnos Web Constitution

## Core Principles

### I. Next.js and React, Responsive and Keyboard-Usable

- The application MUST be built with Next.js and React.
- Every user-facing flow MUST work in both desktop and mobile browsers.
- Every user-facing flow MUST be completable using only a keyboard: each interactive element
  MUST be reachable and operable without a pointing device.

**Rationale**: Users reach the site from phones and computers alike, and a flow that needs a
mouse excludes people who cannot or do not use one.

### II. entrePatasETurnosAPI as the Backend

- Backend operations covered by the entrePatasETurnosAPI contract MUST be performed through
  entrePatasETurnosAPI, not reimplemented or bypassed in the web application.
- Every feature that depends on the API MUST handle, where applicable:
  - the loading state while a request is in progress;
  - request failures, with feedback to the user;
  - empty results, with an explicit empty state rather than a blank view.

**Rationale**: A single backend keeps business rules in one place, and handling these states
explicitly keeps the interface honest when the network or the API misbehaves.

### III. Two Sign-In Methods, One Set of Access Rules

- The application MUST support both Google sign-in and username/password sign-in.
- Protected features MUST enforce the same access rules regardless of the sign-in method used.
- Automated checks MUST cover both sign-in methods.
- Automated checks MUST verify that signed-out users cannot access protected features.

**Rationale**: Access must depend on who the user is and what role they hold, never on how they
signed in; automated checks keep that guarantee from regressing.

### IV. Plans Document Compliance Verification

- Each implementation plan MUST identify which principles of this constitution apply to it.
- For each applicable principle, the plan MUST document how compliance will be verified.

**Rationale**: Stating the verification up front makes compliance checkable during review rather
than assumed.

## Scope and Deferred Decisions

Password recovery and account linking (for example, a person using both Google and
username/password sign-in for the same account) are not defined by this constitution. Their
details are left to the authentication feature specification, which MUST remain consistent with
Principle III.

## Development Workflow

- Feature work follows the Spec Kit flow: specification, implementation plan, tasks, then
  implementation.
- The Constitution Check in each implementation plan is where Principle IV is satisfied: it lists
  the applicable principles and the verification for each.
- Reviews of plans and changes check them against the applicable principles.

## Governance

- This constitution takes precedence over other project practices where they conflict.
- **Amendments**: proposed as a change to this file, with a Sync Impact Report describing what
  changed, and merged through the project's normal review process.
- **Versioning**: semantic versioning applies.
  - MAJOR: a principle is removed or redefined in a backward-incompatible way.
  - MINOR: a principle or section is added, or guidance is materially expanded.
  - PATCH: clarifications, wording, and typo fixes with no change in meaning.
- **Compliance review**: each implementation plan's Constitution Check and each code review MUST
  confirm compliance with the applicable principles. Any deviation MUST be documented and
  justified in the plan.

**Version**: 1.0.0 | **Ratified**: 2026-11-09 | **Last Amended**: 2026-11-09
