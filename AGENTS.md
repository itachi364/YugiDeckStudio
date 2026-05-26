# AGENTS.md

## Global Agent Rules for Spec Driven Development

This file defines mandatory rules for any AI coding agent, assistant, Codex session, MCP tool, or automated development tool working for this user.

Default global specification workspace:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

Project-local instructions take precedence over global references only as defined in the priority order below.

---

# 1. Priority Order

When instructions conflict, apply this order:

1. Explicit user instruction in the current conversation.
2. Security and safety requirements.
3. Project-local `AGENTS.md`.
4. This global `AGENTS.md`.
5. Project-local `/specs`.
6. Global spec workspace and templates.
7. Existing project conventions.
8. Framework and language best practices.

No mutation is allowed without explicit confirmation, regardless of priority.

---

# 2. Core Rules

## MUT-001: Mutation Guard

The agent MUST request explicit user confirmation before any operation that creates, modifies, deletes, moves, renames, formats, installs, commits, pushes, deploys, applies infrastructure, changes configuration, or mutates external systems.

Allowed without confirmation:

- Read files.
- Inspect repository state.
- Analyze requirements.
- Propose specs, diffs, plans, tasks, diagrams, commands, or architecture.
- Report risks and open questions.

Mutation examples that require confirmation:

- Source, test, config, build, infrastructure, CI/CD, documentation, spec, generated, database migration, API contract, dependency, Docker, Terraform, Git, GitHub, filesystem, and deployment changes.

Required confirmation prompt:

```text
I propose the following changes:
- ...

Do you confirm that I should proceed?
```

Bootstrap exception: the initial copy of the global `AGENTS.md` into a project root is authorized only when the user explicitly runs the bootstrap prompt that grants that action. No other file may be changed during bootstrap.

## SPEC-001: Specs First

Before implementing any feature, fix, refactor, architectural change, configuration change, or infrastructure change, the agent MUST read relevant project-local files under:

```text
/specs
```

If `/specs` does not exist, the agent MUST propose creating it and must not implement yet.

The global workspace may be used as reference material and template source:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

## AC-001: Acceptance Criteria Required

The agent MUST NOT implement without explicit, testable, verifiable, and traceable acceptance criteria.

If acceptance criteria are missing, vague, incomplete, or contradictory, the agent MUST stop, ask, or propose criteria before coding.

## REQ-001: No Invented Requirements

The agent MUST NOT invent business rules, validations, API fields, API behavior, database columns, statuses, workflows, security rules, integrations, UI behavior, or non-functional requirements.

Ambiguity must be reported as an open question or assumption requiring approval.

## SPEC-002: Behavior Changes Require Spec Updates

Any behavior change MUST be documented in the relevant spec before implementation. The specification is the source of truth.

---

# 3. SDD Lifecycle

Every development activity MUST follow this lifecycle.

## Phase 1: Discovery

1. Read project-local `AGENTS.md`, if available.
2. Read `/specs`, if available.
3. Read global templates or conditional rules only when relevant.
4. Identify requirements, acceptance criteria, constraints, architecture, infrastructure, database, testing, repository, and versioning decisions.
5. Ask only unresolved questions that block correct implementation.

Required decisions before implementation, when applicable:

- Project name and initial version.
- GitHub repository strategy.
- Branch naming strategy.
- Software architecture.
- Language, framework, and runtime.
- Infrastructure strategy: local, containerized, Kubernetes, Terraform, serverless, cloud, or hybrid.
- Database model and engine.
- Testing framework.
- Required environments: local, dev, qa, staging, prod.
- README, Docker, Terraform, and deployment expectations.

## Phase 2: Specification

Ensure these files exist or propose creating/updating them:

```text
/specs/requirements.md
/specs/design.md
/specs/tasks.md
README.md
```

For medium or complex changes, also propose relevant files:

```text
/specs/acceptance-criteria.md
/specs/use-cases.md
/specs/api-contract.md
/specs/architecture.md
/specs/infrastructure.md
/specs/database-design.md
/specs/repository-strategy.md
/specs/diagrams/
/specs/adr/
```

Minimum spec contents:

- `requirements.md`: context, problem, objective, scope, requirements, business rules, assumptions, constraints, dependencies, acceptance criteria.
- `design.md`: architecture, components, flows, interfaces, DTOs/contracts, domain model, persistence, errors, security, observability, tests, diagrams when useful.
- `tasks.md`: executable tasks with ID, files, dependencies, completion criteria, acceptance criteria, required tests, and status.

## Phase 3: Approval

Before implementation, present the pre-implementation response defined in section 14 and request confirmation using `MUT-001`.

## Phase 4: Implementation

After confirmation:

- Implement only approved tasks.
- Keep changes focused and traceable to acceptance criteria.
- Create or update automated tests for every generated or modified behavior.
- Target 100% branch coverage for generated or modified business logic.
- Follow architecture, security, observability, SonarQube quality expectations, SOLID, Clean Code, and project conventions.
- Do not add dependencies without justification and confirmation.

## Phase 5: Validation and Reporting

- Run tests, validation, formatting, Docker, or Terraform checks when applicable and approved.
- If a command cannot be run, report why and provide the exact command.
- Update README before commit/push.
- Prepare Gitmoji-based commit proposal.
- Request commit and push confirmation separately.
- Report final results using section 15.

---

# 4. Conditional Rule Loading

To reduce token usage, the agent MUST load extra rules only when applicable.

Rule lookup order:

1. Project-local `agent-rules/<rule>.md`, if present.
2. Global `C:\Users\NarutoRgal\Documents\spec-driven-workspace\agent-rules\<rule>.md`.

The agent MUST read the relevant conditional file before planning or implementing work in that area.

| Trigger | Required file |
|---|---|
| GitHub repo, branch, commit, push, PR, issue, release | `agent-rules/github.md` |
| Docker, Docker Compose, containers, Kubernetes, ECS, EKS | `agent-rules/docker.md` |
| Terraform, IaC, cloud provisioning, infra changes | `agent-rules/terraform.md` |
| AWS Lambda, API Gateway, DynamoDB, serverless AWS | `agent-rules/aws-serverless.md` |
| Database design, schema, persistence, migrations | `agent-rules/database.md` |
| Testing strategy, unit/integration tests, coverage | `agent-rules/testing.md` |
| SonarQube, SonarCloud, SonarQube MCP, SonarQube for IDE, sonar-scanner, quality gates | `agent-rules/sonarqube.md` |
| Security-sensitive code, secrets, auth, input validation | `agent-rules/security.md` |
| Logs, metrics, traces, healthchecks, monitoring | `agent-rules/observability.md` |
| README generation or update | `agent-rules/readme.md` |

Templates are available at:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace\templates
```

---

# 5. Architecture and Design Rules

- Ask which architecture will be used unless the project already has a clear established architecture.
- Valid examples: Clean, Hexagonal, Onion, Layered, MVC, Modular Monolith, Microservices, Event-Driven, Serverless, CQRS, DDD, or user-defined.
- Respect existing architecture and conventions.
- Do not introduce conflicting architecture without reporting the inconsistency and proposing a refactor plan.
- Do not assume a default architecture for a new project. You may recommend one, but must wait for approval.
- Use UML, Mermaid, PlantUML, C4, or Markdown diagrams for medium/high-complexity work.
- Store diagrams under `/specs/diagrams` when generated.
- Use ADRs under `/specs/adr` for relevant technical decisions.

---

# 6. Code Quality Rules

Generated code MUST follow SOLID, Clean Code, and selected architecture.

Mandatory constraints:

- Controllers must not contain business logic.
- Domain/application logic must not directly depend on databases, HTTP clients, queues, filesystems, cloud SDKs, or framework details.
- Use dependency inversion and small focused abstractions when useful.
- Avoid premature abstractions and overengineering.
- Use meaningful intention-revealing names.
- Keep functions small and focused.
- Avoid duplicated business rules, validations, constants, queries, transformations, and error mappings.
- Handle errors explicitly.
- Do not expose sensitive details in public errors.
- Avoid hidden side effects.
- Design code for unit testing.
- Do not add dependencies without justification and confirmation.

---

# 7. Testing Rules

- Unit tests are mandatory for every generated or modified behavior.
- Tests must prioritize acceptance criteria.
- Each acceptance criterion should have at least one test or validation path when possible.
- Generated or modified business logic must target 100% branch coverage.
- Use clear Arrange/Act/Assert or Given/When/Then structure.
- Do not mock the behavior under test.
- Mock external systems such as databases, HTTP clients, queues, cloud SDKs, email providers, payment gateways, and authentication providers.
- Run tests when possible; otherwise report exact commands and reason they were not run.

For detailed stack-specific testing rules, load `agent-rules/testing.md`. For SonarQube, SonarQube MCP, quality gate, or coverage gate work, load `agent-rules/sonarqube.md`.

---

# 8. Security and Observability Baseline

Security baseline:

- Never expose, print, commit, or hardcode secrets.
- Validate all external inputs.
- Prevent injection with safe APIs, parameterization, prepared statements, or validated builders.
- Consider authentication, authorization, least privilege, and secure defaults for sensitive changes.
- Do not log sensitive data.

Observability baseline:

- Prefer structured logs.
- Include safe business identifiers and correlation/request/trace IDs when applicable.
- Consider latency, error rate, throughput, retries, timeouts, and external dependency failures.
- Preserve trace context in distributed systems when applicable.

Load `agent-rules/security.md` or `agent-rules/observability.md` for detailed work.

---

# 9. SonarQube and Coverage Baseline

When the project uses SonarQube, SonarCloud, SonarQube MCP, SonarQube for IDE, sonar-scanner, or any quality gate:

- Load `agent-rules/sonarqube.md` before planning or implementing quality-related work.
- Treat SonarQube issues as part of code quality validation, not optional cleanup.
- Do not introduce new blocker, critical, security, or avoidable code smell issues in changed code.
- Unit tests for generated or modified business logic MUST target 100% branch coverage.
- If the project has no Sonar configuration, the agent MUST propose creating the appropriate Sonar configuration before claiming Sonar validation. Default proposal: create `sonar-project.properties` unless the stack already has a better build-tool or CI integration path.
- Creating or modifying `sonar-project.properties`, build-tool coverage configuration, CI pipeline Sonar steps, or any Sonar-related file still requires explicit user confirmation under `MUT-001`.
- Never hardcode or commit Sonar tokens. Use environment variables such as `SONAR_TOKEN` and placeholders in documentation.
- Use SonarQube MCP for read-only quality status, issues, measures, and remediation planning when available. Any mutation still requires `MUT-001`.

---

# 10. Git, GitHub, README, and Push Baseline

- Never create repository, branch, commit, push, pull request, issue, or mutate GitHub without confirmation.
- Default branch is `master` unless the user chooses another default.
- Work should happen on a version branch unless direct `master` changes are explicitly approved.
- Before commit, inspect and report `git status`, `git diff --stat`, and `git diff`.
- README.md is mandatory before commit/push.
- Commit messages MUST use Gitmoji format:

```text
<gitmoji> <type>(<scope>): <short description>
```

Allowed types include: `feat`, `fix`, `test`, `docs`, `docker`, `arch`, `config`, `security`, `refactor`, `perf`, `deploy`, `remove`, `deps`, `merge`, `wip` only if approved.

Load `agent-rules/github.md` and `agent-rules/readme.md` for detailed Git/GitHub/README work.

---

# 11. Codex and MCP Rules

## Codex

- Always load and follow project-local `AGENTS.md` if present.
- If project-local and global rules conflict, ask which one takes priority unless the priority order resolves it.
- Do not change files without `MUT-001` confirmation.
- Use `/specs/tasks.md` as the implementation plan when available.
- Report diffs clearly before finalizing.
- Never install dependencies, commit, push, open PRs, or run destructive commands without explicit confirmation.

## MCP

- GitHub MCP may read repositories/issues/PRs without mutation, but any GitHub mutation requires confirmation.
- Context7 MCP should be used when framework, library, or API behavior depends on current or version-specific documentation.
- Filesystem MCP must operate only inside explicitly authorized folders.

Authorized global workspace:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

---

# 12. Global Prohibitions

The agent MUST NOT:

- Mutate anything without `MUT-001`.
- Implement without `SPEC-001` and `AC-001`.
- Invent requirements or behavior.
- Skip tests, branch coverage validation, README, design, acceptance criteria, or required SonarQube validation.
- Add dependencies without justification and confirmation.
- Commit secrets.
- Ignore failing tests or hide defects.
- Mix unrelated changes.
- Change public APIs without documentation.
- Change database schema without migration strategy and specification.
- Refactor unrelated code without approval.
- Rename, delete, or globally format files without approval.
- Execute `terraform apply`, `terraform destroy`, or deploy cloud infrastructure without approval.
- Push directly to `master` without explicit approval.

---

# 13. Done Definition

A task is done only when:

- Specs are read or missing specs are reported.
- Requirements and acceptance criteria are documented.
- Design and tasks are documented.
- Architecture, infrastructure, database, repository, Docker, Terraform, and README strategy are confirmed when applicable.
- User confirms implementation.
- Code and tests are implemented according to approved tasks.
- Acceptance criteria are covered.
- Tests pass or exact test commands and blockers are reported.
- 100% branch coverage for generated or modified business logic is achieved or explicit exceptions are documented and approved.
- SonarQube quality gate/status is checked when configured, or the exact analysis command/blocker is reported.
- Security and observability impacts are considered.
- README is generated or updated before commit/push.
- Gitmoji commit proposal is prepared when applicable.
- Commit/push confirmation is requested separately.
- Changed files, risks, and pending items are reported.

---

# 14. Required Pre-Implementation Response

Before implementing, respond with this structure:

```text
I reviewed the available specifications.

Acceptance criteria identified:
- ...

Selected or proposed architecture:
- ...

Repository strategy:
- ...

Infrastructure strategy:
- ...

Database strategy:
- ...

Terraform/IaC strategy:
- ...

README strategy:
- ...

Git/GitHub strategy:
- ...

Conditional rule files loaded:
- ...

Files I propose to create, modify, or delete:
- ...

Tasks to execute:
- ...

Tests to create or update:
- ...

Coverage and SonarQube strategy:
- Branch coverage target: 100% for generated or modified business logic.
- SonarQube configuration exists: yes/no.
- If no Sonar configuration exists, proposed configuration file/integration: `sonar-project.properties` or stack-specific alternative.
- SonarQube validation: ...

Risks or open questions:
- ...

Do you confirm that I should proceed with these changes?
```

Wait for explicit confirmation.

---

# 15. Final Response Requirement

After completing work, report:

- What was done.
- Files created, modified, deleted, or skipped.
- Tests created or updated.
- Commands run.
- Test results.
- Branch coverage result.
- SonarQube quality status when applicable.
- Acceptance criteria status.
- Docker/IaC validation status when applicable.
- README status.
- Proposed Gitmoji commit message.
- Target branch and push status when applicable.
- Risks, limitations, and pending actions.
