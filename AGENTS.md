# AGENTS.md

## Global Agent Rules for Spec Driven Development

This file defines mandatory rules for any AI coding agent, assistant, or automated development tool working on any project for this user.

These rules are intended to be applied globally across projects, including Visual Studio Code, Codex, GitHub MCP, Context7 MCP, Filesystem MCP, and any local or remote coding agent.

Default global specification workspace:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

---

# 1. Non-Negotiable Execution Rules

## 1.1 Explicit confirmation before changes

Before creating, modifying, deleting, moving, renaming, formatting, installing dependencies, changing configuration, or executing any operation that alters the project, the agent must request explicit confirmation from the user.

The agent may read, analyze, inspect, plan, document, and propose changes without confirmation.

The agent must not perform destructive or mutating actions until the user explicitly confirms.

This applies to:

- Source code files.
- Test files.
- Configuration files.
- Build files.
- Infrastructure files.
- CI/CD files.
- Documentation files.
- Specification files.
- Database migrations.
- API contracts.
- Generated files.
- Dependency installation or removal.
- Project structure changes.

Required confirmation prompt:

```text
I propose the following changes:
...

Do you confirm that I should proceed?
```

---

## 1.2 Always read specifications first

Before implementing any feature, fix, refactor, architectural change, or configuration change, the agent must read all relevant files under:

```text
/specs
```

If the project has no `/specs` directory, the agent must propose creating it before implementation.

If global specifications exist in:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

the agent must treat them as global reference material and must not ignore them.

---

## 1.3 Never implement without acceptance criteria

The agent must never implement a requirement unless clear acceptance criteria exist.

Acceptance criteria must be:

- Explicit.
- Testable.
- Verifiable.
- Traceable to requirements.
- Covered by automated tests whenever possible.

If acceptance criteria are missing, incomplete, vague, or contradictory, the agent must stop and ask for clarification or propose acceptance criteria before coding.

---

## 1.4 Do not invent requirements

The agent must not invent:

- Business rules.
- Validations.
- API fields.
- API behavior.
- Database columns.
- Error codes.
- Statuses.
- Workflows.
- Security rules.
- Integration behavior.
- UI behavior.
- Non-functional requirements.

If a requirement is ambiguous, the agent must ask.

---

## 1.5 Do not change behavior without updating specifications

Any behavior change must be reflected in the corresponding specification before implementation.

No behavior change should exist only in source code.

The specification is the source of truth.

---

# 2. Required Spec Driven Development Workflow

Every development activity must follow this workflow:

1. Read `/specs`.
2. Read the global spec workspace when relevant:
   ```text
   C:\Users\NarutoRgal\Documents\spec-driven-workspace
   ```
3. Identify existing requirements.
4. Identify acceptance criteria.
5. Ask for the project name and initial project version.
6. Ask whether a GitHub repository must be created.
7. Ask which software architecture must be used.
8. Ask whether infrastructure will be server-based/containerized or serverless.
9. Ask which database model and engine will be used.
10. Propose the folder and file structure according to the selected architecture.
11. Generate or update `requirements.md`.
12. Generate or update `design.md`.
13. Generate or update `tasks.md`.
14. Use UML or software design diagrams when applicable.
15. If approved, create the GitHub repository after the specifications are generated and before application code is generated.
16. If approved, create a version branch based on `master`.
17. Generate or update Terraform/IaC specifications and files according to the selected infrastructure strategy.
18. Request explicit user confirmation before changing files.
19. Implement only approved tasks.
20. Create automated unit tests for all generated code.
21. Verify acceptance criteria.
22. Report created, modified, deleted, or skipped files.
23. Report test execution status.
24. Generate or update `README.md` with complete technical and local deployment documentation.
25. Prepare Gitmoji-based commit message proposal.
26. Ask confirmation before committing.
27. Commit to the selected version branch only after confirmation.
28. Ask confirmation before pushing.
29. Push to GitHub only after confirmation.
30. Report remaining risks or pending decisions.

---

# 2.1 Repository and Branching Workflow

After the initial SDD specification files are generated and before generating application code, the agent must propose creating a GitHub repository using GitHub MCP.

The repository creation must happen only after explicit user confirmation.

## 2.1.1 Repository creation rules

Before creating the repository, the agent must ask for or confirm:

- Project name.
- Repository name.
- Repository visibility:
  - private.
  - public.
- Repository description.
- Default branch name:
  - `master` unless the user chooses another default.
- License, if any.
- Whether to initialize with README, `.gitignore`, or license.
- Whether the project already has a local Git repository.

The agent must not create a GitHub repository without explicit confirmation.

## 2.1.2 First repository creation

Once the initial specification files are ready and approved, the agent must create the GitHub repository with the selected project name.

After creating the repository, the agent must connect the local project to the remote repository.

The agent must not push code without explicit confirmation.

## 2.1.3 Version branch creation

After the repository is created for the first time, the agent must create a version branch based on `master`.

The branch name must include the project version.

Recommended naming:

```text
release/v0.1.0
feature/v0.1.0-initial-setup
develop/v0.1.0
```

The agent must ask the user which branch naming convention to use.

If the user does not define a version, the agent must propose:

```text
v0.1.0
```

The agent must not create branches, commit, or push without explicit confirmation.

---

# 2.2 Infrastructure Strategy Workflow

Before generating code, the agent must ask what infrastructure strategy will be used.

The agent must explicitly ask:

```text
Will the infrastructure be server-based/containerized or serverless?
```

Valid infrastructure options:

- Local Docker containers.
- Docker Compose.
- Kubernetes.
- Terraform.
- AWS Lambda.
- API Gateway.
- DynamoDB.
- Cloud servers.
- AWS ECS/Fargate.
- AWS EKS.
- AWS Lambda + API Gateway.
- Fully serverless AWS architecture.
- Hybrid architecture.
- Other custom infrastructure selected by the user.

The selected infrastructure strategy must be documented in:

```text
/specs/design.md
/specs/architecture.md
/specs/tasks.md
```

---

# 2.3 Terraform and IaC Rules

All infrastructure required by the project must be described as Infrastructure as Code using Terraform unless the user explicitly chooses another tool.

Terraform files must be generated before application deployment code is considered complete.

Recommended Terraform structure:

```text
/infra
  /terraform
    /environments
      /dev
        main.tf
        providers.tf
        variables.tf
        outputs.tf
        terraform.tfvars.example
      /prod
        main.tf
        providers.tf
        variables.tf
        outputs.tf
        terraform.tfvars.example
    /modules
      /network
      /compute
      /database
      /api-gateway
      /lambda
      /iam
      /observability
```

For small local-only projects, the agent may propose:

```text
/infra
  /terraform
    main.tf
    providers.tf
    variables.tf
    outputs.tf
```

Terraform generation must follow:

- `terraform fmt`.
- `terraform validate`.
- reusable modules when justified.
- no hardcoded secrets.
- variables for environment-specific values.
- outputs for relevant resource identifiers.
- least privilege IAM.
- explicit provider versions.
- explicit Terraform version constraints.

The agent must not execute `terraform apply` or `terraform destroy` without explicit confirmation.

---

# 2.4 Docker Infrastructure Rules

If the infrastructure is server-based, containerized, monolithic, or microservices-based, the agent must generate Terraform and Docker-related files for the selected runtime.

At minimum, the agent must propose infrastructure for:

1. One container for the selected database.
2. One or more containers for:
   - the monolith, or
   - each microservice, or
   - the selected backend service.

The agent must ask which database engine will be used.

Examples:

- PostgreSQL.
- MySQL.
- MariaDB.
- SQL Server.
- MongoDB.
- Redis.
- DynamoDB Local.
- LocalStack.
- Other selected by the user.

The agent must also ask whether orchestration will be:

- Docker Compose.
- Kubernetes.
- ECS/Fargate.
- EKS.
- Other.

For local development, the agent should prefer Docker Compose unless the user selects Kubernetes or cloud deployment.

Required files when applicable:

```text
Dockerfile
docker-compose.yml
.dockerignore
/infra/terraform
```

For microservices, each service should have its own Dockerfile unless a shared base image strategy is explicitly approved.

---

# 2.4.1 Dockerfile Quality, Security, and Deployment Rules

Every Dockerfile generated by the agent must follow production-ready containerization practices.

## 2.4.1.1 Multi-stage builds

Dockerfiles must use multi-stage builds when the language, framework, or build process benefits from separating build-time dependencies from runtime dependencies.

Required for:

- Java / Spring Boot.
- Node.js / NestJS / React build artifacts.
- Python applications with compiled or heavy dependencies.
- Go, Rust, or compiled applications.
- Any project where build tooling should not exist in the final runtime image.

The final image must contain only what is required to run the application.

---

## 2.4.1.2 Non-root execution

Containers must not run as `root` unless there is a documented and justified reason.

The Dockerfile must create or use a non-root user.

Example expectation:

```dockerfile
RUN addgroup --system appgroup && adduser --system appuser --ingroup appgroup
USER appuser
```

For base images that already provide a safe non-root user, the agent must document it.

---

## 2.4.1.3 Mandatory .dockerignore

Every Docker-based project must include a `.dockerignore` file.

The `.dockerignore` must exclude at minimum:

```text
.git
.gitignore
node_modules
target
build
dist
coverage
.env
.env.*
*.log
.vscode
.idea
.DS_Store
```

The agent must adapt exclusions to the selected stack.

Secrets, local environment files, credentials, build cache, IDE files, and test reports must not be copied into Docker images.

---

## 2.4.1.4 No secrets in images

Dockerfiles and Docker Compose files must not hardcode:

- Passwords.
- API keys.
- GitHub tokens.
- AWS credentials.
- Database credentials.
- Private keys.
- OAuth secrets.
- JWT secrets.
- Any sensitive value.

Use environment variables, `.env.example`, Docker secrets, Kubernetes secrets, AWS Secrets Manager, or another approved secret management mechanism.

The agent must generate `.env.example`, not `.env`, unless the user explicitly asks otherwise.

---

## 2.4.1.5 HEALTHCHECK when applicable

Dockerfiles or Docker Compose services must include `HEALTHCHECK` when the application exposes a health endpoint or when a reliable health command exists.

For HTTP services, prefer a health endpoint such as:

```text
/health
/actuator/health
/health/liveness
/health/readiness
```

For databases, use the official healthcheck command when available.

Examples:

- PostgreSQL: `pg_isready`.
- MySQL/MariaDB: `mysqladmin ping`.
- Redis: `redis-cli ping`.
- MongoDB: `mongosh --eval "db.adminCommand('ping')"` when available.

The agent must not invent health endpoints. If no endpoint exists, it must propose adding one and request confirmation.

---

## 2.4.1.6 Minimal and pinned base images

Dockerfiles should use minimal, trusted, and version-pinned base images.

Prefer:

- `eclipse-temurin:21-jre-alpine` or equivalent for Java runtime.
- `node:<major>-alpine` or Debian slim images when Alpine compatibility is not suitable.
- `python:<version>-slim` for Python.
- Distroless images when appropriate and supported.

Avoid:

```dockerfile
FROM latest
FROM ubuntu:latest
```

The agent must not use `latest` tags unless the user explicitly approves.

---

## 2.4.1.7 Reproducible dependency installation

Dependency installation must be reproducible.

Examples:

- Node.js: prefer `npm ci` when `package-lock.json` exists.
- Java/Maven: use Maven Wrapper when available.
- Java/Gradle: use Gradle Wrapper when available.
- Python: pin dependencies in `requirements.txt`, `poetry.lock`, or equivalent.
- Go/Rust: use lock files and module manifests.

The agent must not delete lock files.

---

## 2.4.1.8 Layer caching and build performance

Dockerfiles must be structured to benefit from layer caching.

Prefer copying dependency manifests before application source code.

Example for Node.js:

```dockerfile
COPY package*.json ./
RUN npm ci
COPY . .
```

Example for Maven:

```dockerfile
COPY pom.xml ./
COPY .mvn .mvn
COPY mvnw .
RUN ./mvnw dependency:go-offline
COPY src src
```

---

## 2.4.1.9 Runtime configuration

Runtime configuration must be provided through environment variables or external configuration.

The Dockerfile must not bake environment-specific configuration into the image.

Docker Compose may reference variables using:

```yaml
environment:
  APP_ENV: ${APP_ENV:-local}
```

Provide `.env.example` with safe placeholder values.

---

## 2.4.1.10 Ports and networking

The Dockerfile must expose only required application ports.

Docker Compose must use internal networks for application/database communication.

Databases should not expose ports publicly unless needed for local development, and this must be documented.

---

## 2.4.1.11 Volumes and persistence

Database containers must define named volumes for persistent data unless the user explicitly requests ephemeral containers.

Example:

```yaml
volumes:
  postgres_data:
```

The agent must document how to reset local volumes safely.

---

## 2.4.1.12 Image scanning recommendation

The agent must recommend scanning images when preparing deployment artifacts.

Recommended tools:

- Docker Scout.
- Trivy.
- Grype.
- Snyk.
- ECR image scanning when using AWS ECR.

The agent must not block development if scanning tools are not installed, but must document the recommendation.

---

## 2.4.1.13 Build and run documentation

Whenever Docker files are generated, the agent must document commands for:

```bash
docker build
docker run
docker compose up
docker compose down
docker compose logs
docker compose ps
```

If Terraform is used for container infrastructure, document:

```bash
terraform init
terraform fmt
terraform validate
terraform plan
```

Do not run `terraform apply` without explicit confirmation.

---

## 2.4.1.14 Stack-specific Docker expectations

### Java / Spring Boot / Java 21

- Use Java 21 compatible base images.
- Prefer JRE image for runtime stage.
- Build with Maven or Gradle wrapper when available.
- Do not skip tests in the standard CI path unless explicitly justified.
- Expose the configured application port.
- Use Spring Boot Actuator health endpoints when available.

### Node.js / NestJS / TypeScript

- Use `npm ci` when lock file exists.
- Build TypeScript in build stage.
- Runtime stage must contain production dependencies only.
- Avoid running as root.
- Expose configured app port.

### Python

- Use virtual environment or controlled install strategy when appropriate.
- Prefer slim images.
- Avoid installing unnecessary OS packages.
- Use pinned dependencies.

---

## 2.4.1.15 Docker change approval

Before generating or modifying Docker-related files, the agent must ask for explicit confirmation.

Docker-related files include:

```text
Dockerfile
.dockerignore
docker-compose.yml
compose.yml
.env.example
/infra/terraform
/k8s
/helm
```

The confirmation must include:

- Target runtime.
- Base image.
- Exposed port.
- Database container.
- Orchestration strategy.
- Healthcheck strategy.
- Whether deployment is local-only or cloud-ready.

---

# 2.5 Serverless AWS Infrastructure Rules

If the user selects serverless infrastructure, the agent must generate Terraform code for AWS deployment.

The serverless design must consider:

- AWS Lambda.
- Amazon API Gateway.
- IAM roles and policies.
- CloudWatch Logs.
- Environment variables.
- Lambda permissions.
- API routes and methods.
- Request/response contracts.
- Error handling.
- Observability.
- DynamoDB or selected database integration.
- Least privilege security.

Required Terraform modules or resources when applicable:

```text
aws_lambda_function
aws_lambda_permission
aws_api_gateway_rest_api
aws_api_gateway_resource
aws_api_gateway_method
aws_api_gateway_integration
aws_api_gateway_deployment
aws_api_gateway_stage
aws_iam_role
aws_iam_policy
aws_iam_role_policy_attachment
aws_cloudwatch_log_group
aws_dynamodb_table
```

For HTTP APIs, the agent may use:

```text
aws_apigatewayv2_api
aws_apigatewayv2_route
aws_apigatewayv2_integration
aws_apigatewayv2_stage
```

The agent must ask whether API Gateway should be:

- REST API.
- HTTP API.
- WebSocket API.

The agent must ask which runtime will be used for Lambda:

- Java 21.
- Node.js.
- Python.
- Custom runtime.
- Container image Lambda.

The agent must not deploy to AWS without explicit confirmation.

---

# 2.6 Database Design Rules

Before generating persistence code or infrastructure, the agent must ask which database model will be used.

Valid options:

- Relational database.
- Non-relational database.
- Hybrid persistence.
- Event store.
- No database required.

---

## 2.6.1 Relational database rules

If the user selects a relational database, the agent must ask which engine will be used:

- PostgreSQL.
- MySQL.
- MariaDB.
- SQL Server.
- Oracle.
- H2 for local tests.
- Other.

The agent must analyze the project requirements and recommend a relational model.

The recommendation must include:

- Tables.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Indexes.
- Relationships.
- Normalization considerations.
- Audit fields.
- Soft delete strategy when applicable.
- Migration strategy.
- Local Docker database setup.
- Terraform resources when applicable.

The agent must not generate migrations or schema files without confirmation.

---

## 2.6.2 DynamoDB and non-relational database rules

If the user selects DynamoDB or another non-relational database, the agent must request the information needed to design the table.

For DynamoDB, the agent must ask for:

- Access patterns.
- Entities to store.
- Partition key.
- Sort key, if required.
- Global Secondary Indexes.
- Local Secondary Indexes.
- Expected query patterns.
- Expected write patterns.
- TTL requirements.
- Capacity mode:
  - on-demand.
  - provisioned.
- Encryption requirements.
- Stream requirements.
- Backup and point-in-time recovery requirements.
- Multi-tenant strategy, if applicable.
- Item shape examples.
- Idempotency requirements, if applicable.

The agent must design DynamoDB tables from access patterns, not from relational modeling assumptions.

The design must be documented in:

```text
/specs/design.md
/specs/architecture.md
```

Terraform must define DynamoDB tables when AWS serverless or AWS cloud infrastructure is selected.

---

# 2.7 Required Questions Before Implementation

Before generating code, the agent must ask and document answers for:

1. What is the project name?
2. Should a GitHub repository be created?
3. What should the GitHub repository name be?
4. Should the repository be public or private?
5. What initial project version should be used?
6. What branch naming convention should be used?
7. What software architecture will be used?
8. Will the infrastructure be server-based/containerized or serverless?
9. If server-based/containerized, what orchestration will be used?
10. If serverless, what AWS services are required?
11. What database model will be used?
12. If relational, what database engine will be used?
13. If DynamoDB/non-relational, what are the access patterns and keys?
14. What language and framework will be used?
15. What testing framework will be used?
16. What environments are required?
    - local.
    - dev.
    - qa.
    - staging.
    - prod.
17. Should Terraform be generated now or only planned first?
18. If Docker is required, what base image and runtime version should be used?
19. If Docker is required, what port should the application expose?
20. If Docker is required, what healthcheck endpoint or command should be used?
21. If Docker is required, should the deployment be local-only or cloud-ready?

The agent must not proceed to implementation until these decisions are documented and confirmed.

---

# 2.8 Git Commit, Gitmoji, README, and Push Workflow

After all development, tests, documentation, Docker/IaC generation, and validation processes are completed, and before uploading changes to the GitHub repository and the created version branch, the agent must prepare the repository for a clean and traceable commit.

The agent must not commit or push changes without explicit user confirmation.

---

## 2.8.1 Git status and review before commit

Before proposing a commit, the agent must inspect and report:

```bash
git status
git diff --stat
git diff
```

The agent must summarize:

- Files created.
- Files modified.
- Files deleted.
- Tests added or updated.
- Documentation added or updated.
- Infrastructure files added or updated.
- Any pending or untracked files.
- Any risks before committing.

The agent must not include secrets, `.env`, credentials, local IDE files, or sensitive files in the commit.

---

## 2.8.2 Gitmoji commit convention

Every commit message generated by the agent must use Gitmoji so the type of change can be identified visually and semantically.

Commit messages must follow this format:

```text
<gitmoji> <type>(<scope>): <short description>
```

Examples:

```text
✨ feat(auth): add user registration use case
🐛 fix(payments): handle duplicated idempotency key
✅ test(users): add unit tests for create user use case
📝 docs(readme): document local deployment steps
🐳 chore(docker): add Dockerfile and docker-compose setup
🏗️ arch(api): define hexagonal architecture structure
🔧 config(terraform): add provider and backend variables
🔐 security(auth): avoid logging sensitive headers
♻️ refactor(domain): simplify payment validation
🚀 deploy(lambda): add serverless deployment resources
```

The agent must choose the Gitmoji according to the actual change.

Recommended Gitmoji mapping:

```text
✨ feat       New feature
🐛 fix        Bug fix
✅ test       Tests added or updated
📝 docs       Documentation
🐳 docker     Docker/container changes
🏗️ arch       Architecture or structural changes
🔧 config     Configuration changes
🔐 security   Security-related changes
♻️ refactor   Refactoring without behavior change
⚡ perf       Performance improvement
🚀 deploy     Deployment/IaC/release changes
🔥 remove     Code or file removal
⬆️ deps       Dependency upgrade
⬇️ deps       Dependency downgrade
🔀 merge      Merge changes
🚧 wip        Work in progress, only if explicitly approved
```

The agent must not use vague commit messages such as:

```text
update
changes
fix
final
wip
commit
```

---

## 2.8.3 Commit granularity

The agent must propose logical commits.

If the change is large, the agent should split commits by intent:

1. Specifications and documentation.
2. Architecture and project structure.
3. Application code.
4. Tests.
5. Docker/IaC.
6. README and operational documentation.

The agent must ask the user whether to create:

- One single commit.
- Multiple logical commits.

The agent must wait for confirmation before committing.

---

## 2.8.4 README generation is mandatory

Before committing and pushing, the agent must generate or update `README.md`.

The README must explain the project clearly and technically.

The README must include, when applicable:

```text
# Project Name

## Overview
What the project does and what problem it solves.

## Main Features
Main use cases and capabilities.

## Architecture
Selected architecture and high-level explanation.

## Technology Stack
Languages, frameworks, libraries, runtime versions, database, infrastructure, cloud services, testing tools, and build tools.

## Project Structure
Important folders and files.

## Requirements
Technical requirements needed to run locally:
- Operating system assumptions.
- Java/Node/Python version.
- Docker version.
- Docker Compose version.
- Terraform version.
- AWS CLI version when applicable.
- Database requirements.
- Environment variables.
- Required local tools.

## Local Setup
Step-by-step instructions to install dependencies and configure the project locally.

## Environment Variables
Required variables using safe placeholder values.

## Running Locally
Commands to run the app locally without Docker when applicable.

## Running with Docker
Docker build and run instructions.

## Running with Docker Compose
Docker Compose commands.

## Database Setup
Database engine, local container, migrations, seed data, connection details, and reset instructions.

## Terraform / Infrastructure
Terraform structure and commands:
- terraform init
- terraform fmt
- terraform validate
- terraform plan
- terraform apply only with explicit approval.

## Testing
Commands to execute unit tests, coverage, integration tests when applicable.

## API Documentation
Endpoints, OpenAPI location, Swagger URL, or API contract reference when applicable.

## Observability
Logs, correlation IDs, healthchecks, metrics, traces.

## Security Notes
Secrets handling, authentication, authorization, and sensitive data considerations.

## Deployment
How deployment is expected to work for local, dev, staging, or production environments.

## Git Workflow
Default branch, version branch, commit convention using Gitmoji.

## Troubleshooting
Common issues and solutions.

## License
License information if defined.
```

The README must be accurate and based on the actual project files and specifications.

The agent must not invent commands, ports, environment variables, endpoints, or deployment steps. If something is unknown, the agent must mark it as pending or ask the user.

---

## 2.8.5 README technical depth

The README must be useful for a developer cloning the repository for the first time.

It must answer:

- What does this project do?
- What business or technical problem does it solve?
- What technologies does it use?
- What architecture does it follow?
- What is required to run it locally?
- How is it configured?
- How is it tested?
- How is it containerized?
- How is infrastructure generated?
- How is it deployed?
- How are commits and branches managed?

The README must include commands in executable blocks.

Example:

```bash
docker compose up --build
```

The README must avoid generic filler documentation.

---

## 2.8.6 Push workflow

Before pushing changes to GitHub, the agent must confirm:

- Target remote.
- Target branch.
- Commit message.
- Files included.
- Test result status.
- README status.
- Terraform validation status when applicable.
- Docker validation status when applicable.

Required pre-push response:

```text
I am ready to push the changes.

Target repository:
- ...

Target branch:
- ...

Proposed commit message:
- ...

Files included:
- ...

Tests:
- ...

README:
- ...

Docker/IaC:
- ...

Do you confirm that I should commit and push these changes?
```

The agent must wait for explicit confirmation.

---

## 2.8.7 No direct push to master without approval

The agent must not push directly to `master` unless the user explicitly requests it.

Default push target must be the created version branch.

Recommended branch examples:

```text
feature/v0.1.0-initial-setup
develop/v0.1.0
release/v0.1.0
```

---

## 2.8.8 Pull request recommendation

After pushing the version branch, the agent should recommend creating a pull request into `master`.

The agent must not create the pull request unless the user explicitly confirms.

If creating a pull request, the PR description must include:

- Summary.
- Changes introduced.
- Acceptance criteria covered.
- Tests executed.
- Docker/IaC notes.
- README update summary.
- Risks.
- Screenshots or API examples when applicable.

---

# 3. Required Specification Files

For every feature, change, or relevant technical decision, the agent must ensure these files exist under `/specs`:

```text
/specs/requirements.md
/specs/design.md
/specs/tasks.md
README.md
```

For medium or complex changes, the agent must also propose:

```text
/specs/acceptance-criteria.md
/specs/use-cases.md
/specs/api-contract.md
/specs/architecture.md
/specs/infrastructure.md
/specs/database-design.md
/specs/repository-strategy.md
/specs/diagrams/
specs/adr/
```

---

## 3.1 requirements.md

`requirements.md` must include:

- Context.
- Problem statement.
- Objective.
- Functional scope.
- Out of scope.
- Stakeholders when known.
- Functional requirements.
- Non-functional requirements.
- Business rules.
- Assumptions.
- Constraints.
- Dependencies.
- Acceptance criteria.
- Traceability notes.

---

## 3.2 design.md

`design.md` must include:

- Technical solution.
- Selected architecture.
- Components involved.
- Data flow.
- Control flow.
- Interfaces.
- Ports and adapters when applicable.
- DTOs and contracts.
- Domain models.
- Persistence model when applicable.
- Error handling.
- Security considerations.
- Observability considerations.
- Performance considerations.
- Testing strategy.
- UML or equivalent diagrams when applicable.

---

## 3.3 tasks.md

`tasks.md` must include executable tasks.

Each task must include:

- Task ID.
- Description.
- Files to create or modify.
- Dependencies.
- Completion criteria.
- Related acceptance criteria.
- Required tests.
- Current status.

Example:

```md
- [ ] TASK-001: Create user registration use case
  - Files:
    - src/application/use-cases/register-user.use-case.ts
    - test/application/use-cases/register-user.use-case.spec.ts
  - Acceptance criteria:
    - AC-001
    - AC-002
  - Completion criteria:
    - Use case implemented.
    - Unit tests passing.
    - Acceptance criteria covered.
```

---

# 4. Architecture Rules

## 4.1 Ask for architecture before development

Before starting development, the agent must ask which architecture will be used unless the project already has a clear, established architecture.

Valid examples:

- Clean Architecture.
- Hexagonal Architecture.
- Onion Architecture.
- Layered Architecture.
- MVC.
- Modular Monolith.
- Microservices.
- Event-Driven Architecture.
- Serverless Architecture.
- CQRS.
- DDD.
- Custom architecture defined by the user.

If the user selects an architecture, the agent must create or propose the appropriate folder and file structure.

---

## 4.2 Respect existing architecture

If the project already has a clear architecture, the agent must follow it and must not introduce conflicting conventions.

If the existing architecture is inconsistent, the agent must report the inconsistency and propose a refactoring plan before changing it.

---

## 4.3 No architecture by assumption

The agent must not assume a default architecture for a new project.

The agent may propose a recommended architecture, but must wait for confirmation before creating files or folders.

---

# 5. SOLID Principles

All generated code must follow SOLID principles.

---

## 5.1 Single Responsibility Principle

Each class, module, function, method, component, controller, service, use case, repository, mapper, validator, or adapter must have one clear responsibility.

Do not mix:

- Controllers with business logic.
- Use cases with infrastructure details.
- Domain models with persistence concerns.
- DTOs with business behavior.
- Repositories with business validation.
- Configuration with runtime business logic.
- Presentation concerns with application logic.

A module should have only one reason to change.

---

## 5.2 Open/Closed Principle

Code must be open for extension and closed for modification.

Prefer:

- Interfaces.
- Abstractions.
- Strategy pattern.
- Dependency injection.
- Polymorphism.
- Composition.
- Configuration-driven extension when reasonable.

Avoid modifying stable, tested code when a new behavior can be added through a new implementation.

Do not overengineer simple changes.

---

## 5.3 Liskov Substitution Principle

Subtypes and implementations must be replaceable by their abstractions without breaking expected behavior.

Implementations must not:

- Weaken preconditions.
- Break postconditions.
- Throw unexpected unsupported-operation errors.
- Ignore required behavior.
- Return incompatible values.
- Violate the interface contract.

---

## 5.4 Interface Segregation Principle

Interfaces must be small, specific, and client-oriented.

Avoid large interfaces that force implementations to depend on methods they do not use.

Prefer specific contracts such as:

```text
UserReader
UserWriter
PaymentValidator
PaymentAuthorizer
NotificationSender
DocumentStorage
EventPublisher
```

Avoid vague interfaces such as:

```text
Manager
Processor
Handler
Service
Helper
```

unless the domain context makes their responsibility explicit.

---

## 5.5 Dependency Inversion Principle

High-level modules must not depend on low-level implementation details.

Application and domain layers must depend on abstractions.

Infrastructure must implement abstractions defined by application or domain layers.

Do not access databases, external APIs, queues, filesystems, or framework-specific features directly from domain logic.

---

# 6. Clean Code Rules

## 6.1 Simple and readable code

Code must be simple, direct, and readable.

Avoid unnecessary complexity.

Avoid overengineering.

Prefer clarity over cleverness.

---

## 6.2 Meaningful names

Use explicit and intention-revealing names.

Avoid unclear abbreviations.

Bad examples:

```text
usrSvc
calc
tmp
data
obj
res
foo
bar
```

Good examples:

```text
userService
calculatePaymentAmount
temporaryAccessToken
paymentRequest
authorizationResult
customerRepository
```

---

## 6.3 Small functions

Functions and methods must be small and focused.

Each function should do one thing.

If a function requires many comments to explain what it does, refactor it.

---

## 6.4 Avoid duplication

Do not duplicate:

- Business logic.
- Validations.
- Constants.
- Queries.
- Transformations.
- Error mappings.
- Test setup when reusable fixtures are appropriate.

Extract reusable logic only when there is a clear reason.

Do not create premature abstractions.

---

## 6.5 Explicit error handling

Errors must be handled explicitly.

Differentiate:

- Validation errors.
- Business errors.
- Authorization errors.
- Authentication errors.
- External service errors.
- Infrastructure errors.
- Unexpected technical errors.

Do not swallow errors silently.

Do not expose sensitive details in public error responses.

---

## 6.6 Avoid hidden side effects

Functions should avoid hidden side effects.

State changes must be explicit.

Side effects must be isolated in appropriate layers.

---

## 6.7 Testable code by design

Code must be designed for unit testing.

Avoid:

- Hardcoded dependencies.
- Static coupling.
- Hidden global state.
- Business logic in constructors.
- Direct infrastructure calls from business logic.
- Time, UUID, randomness, or external I/O without abstraction.
- Large functions with many branches.

---

## 6.8 Minimal dependencies

Do not add dependencies unless justified.

Before adding a dependency, explain:

- Why it is needed.
- What alternatives exist.
- Runtime impact.
- Security impact.
- Maintenance impact.

Wait for confirmation before installation.

---

# 7. Testing Rules

## 7.1 Unit tests are mandatory

For every generated or modified functionality, the agent must create or update unit tests.

This includes:

- Use cases.
- Controllers.
- Services.
- Domain services.
- Entities with behavior.
- Validators.
- Mappers.
- Repositories.
- Adapters.
- Guards.
- Interceptors.
- Middlewares.
- Utilities.
- Configuration logic when applicable.

No new production code should be delivered without corresponding tests.

---

## 7.2 Acceptance criteria coverage

Tests must prioritize acceptance criteria.

Each acceptance criterion should have at least one corresponding test or validation path.

---

## 7.3 Clear test structure

Tests must be clear and direct.

Use:

```text
Arrange
Act
Assert
```

or:

```text
Given
When
Then
```

Each test must validate one behavior.

Avoid testing implementation details unless necessary.

---

## 7.4 Required frameworks by stack

Use the appropriate testing framework according to the project stack.

### Java / Spring Boot

- JUnit 5.
- Mockito.
- AssertJ.
- Spring Boot Test only when framework integration is required.

### TypeScript / Node.js / NestJS / React

- Jest.
- Testing Library when applicable.
- Supertest for HTTP controller tests when applicable.

### Python

- PyTest.
- unittest.mock.
- coverage.py when applicable.

---

## 7.5 Mocks and test doubles

Use mocks for external systems:

- Databases.
- HTTP clients.
- Queues.
- Filesystems.
- Cloud SDKs.
- Email providers.
- Payment gateways.
- Authentication providers.

Do not mock the behavior under test.

---

## 7.6 Test execution

After changes, the agent must run or provide the exact commands to run tests.

Examples:

```bash
npm test
npm run test:unit
npm run test:cov
mvn test
./mvnw test
pytest
pytest --cov
```

If tests cannot be executed, the agent must explain why.

---

# 8. UML and Software Design Documentation

## 8.1 UML required when applicable

For medium or high-complexity work, the agent must generate diagrams using versionable formats.

Preferred formats:

- PlantUML.
- Mermaid.
- C4 Model.
- Markdown-based diagrams.

Recommended diagram types:

- Use case diagram.
- Class diagram.
- Sequence diagram.
- Component diagram.
- Deployment diagram.
- State diagram.
- Activity diagram.
- Context diagram.
- Container diagram.
- Architecture decision diagram.

---

## 8.2 Diagram location

Diagrams should be placed under:

```text
/specs/diagrams
```

Recommended files:

```text
/specs/diagrams/use-case.puml
/specs/diagrams/sequence.puml
/specs/diagrams/class-diagram.puml
/specs/diagrams/component-diagram.puml
/specs/diagrams/architecture.mmd
```

---

## 8.3 ADR required for relevant technical decisions

Any relevant technical decision must be documented as an ADR.

Recommended location:

```text
/specs/adr
```

Recommended naming:

```text
ADR-001-decision-name.md
```

ADR format:

```md
# ADR-001: Decision title

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

Why this decision is needed.

## Decision

What decision was made.

## Alternatives considered

Other options considered.

## Consequences

Positive and negative consequences.
```

---

# 9. Security Rules

The agent must apply secure development practices by default.

## 9.1 Secrets and credentials

Never expose, print, commit, or hardcode:

- Passwords.
- API keys.
- GitHub tokens.
- AWS credentials.
- Database credentials.
- Private keys.
- Session secrets.
- OAuth secrets.
- Webhook secrets.
- PGP private keys.

Use environment variables or secret managers.

---

## 9.2 Input validation

Validate all external inputs:

- HTTP request body.
- Query params.
- Path params.
- Headers.
- Events.
- Queue messages.
- Files.
- Webhook payloads.

---

## 9.3 Injection prevention

Use parameterized queries, prepared statements, ORM-safe APIs, or validated query builders.

Do not concatenate untrusted input into SQL, NoSQL queries, shell commands, templates, or paths.

---

## 9.4 Authorization and authentication

Security-sensitive changes must explicitly consider:

- Authentication.
- Authorization.
- Token validation.
- Role-based access.
- Tenant isolation.
- Least privilege.
- Secure defaults.

---

## 9.5 OWASP awareness

When applicable, consider OWASP Top 10 risks, including:

- Broken access control.
- Cryptographic failures.
- Injection.
- Insecure design.
- Security misconfiguration.
- Vulnerable dependencies.
- Identification and authentication failures.
- Software and data integrity failures.
- Logging and monitoring failures.
- SSRF.

---

# 10. Observability Rules

When applicable, the agent must include observability considerations.

## 10.1 Logs

Use structured logs.

Include:

- Correlation ID.
- Trace ID.
- Request ID.
- Execution ID when applicable.
- Operation name.
- Relevant business identifiers when safe.

Do not log sensitive data.

---

## 10.2 Metrics

Consider metrics for:

- Latency.
- Error rate.
- Throughput.
- Retries.
- Timeouts.
- External dependency failures.
- Queue depth.
- Cache hit ratio.
- Business operation outcomes.

---

## 10.3 Tracing

For distributed systems, preserve trace context across:

- HTTP calls.
- Queues.
- Events.
- Lambda invocations.
- Microservices.
- Batch processes.

---

# 11. Spec Workspace Rules

The global spec workspace is:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

The agent must treat this directory as the global specification and planning workspace.

Recommended structure:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
├── AGENTS.md
├── specs
│   ├── requirements.md
│   ├── design.md
│   ├── tasks.md
│   ├── acceptance-criteria.md
│   ├── use-cases.md
│   ├── api-contract.md
│   ├── architecture.md
│   ├── diagrams
│   │   ├── use-case.puml
│   │   ├── sequence.puml
│   │   ├── class-diagram.puml
│   │   └── architecture.mmd
│   └── adr
│       └── ADR-001-template.md
└── templates
    ├── requirements-template.md
    ├── design-template.md
    ├── tasks-template.md
    └── adr-template.md
```

For each project, the agent should prefer project-local `/specs` when available, and use the global spec workspace as default guidance, template source, or shared reference.

---

# 12. Codex-Specific Rules

When working with Codex:

1. Always load and follow this `AGENTS.md`.
2. Prefer reading project-local `AGENTS.md` if available.
3. If project-local `AGENTS.md` conflicts with this global file, ask the user which rule takes priority.
4. Do not make file changes without explicit confirmation.
5. Do not implement without reading `/specs`.
6. Do not implement without acceptance criteria.
7. Use tasks from `tasks.md` as the implementation plan.
8. Generate or update unit tests for every code change.
9. Report diffs clearly before finalizing.
10. Never commit changes unless explicitly requested.
11. Never push changes unless explicitly requested.
12. Never open or merge pull requests unless explicitly requested.
13. Before any commit, generate or update `README.md`.
14. Before any commit, propose a Gitmoji-based commit message.
15. Never install dependencies without explicit confirmation.
16. Never run destructive commands without explicit confirmation.

---

# 13. MCP-Specific Rules

When MCP tools are available:

## 13.1 GitHub MCP

Use GitHub MCP for:

- Reading repositories.
- Inspecting issues.
- Inspecting pull requests.
- Reading repository files.
- Creating repositories only after confirmation.
- Creating the initial project repository after SDD specifications are approved and before generating application code.
- Creating version branches based on `master` only after confirmation.
- Creating issues only after confirmation.
- Creating branches only after confirmation.
- Creating or updating pull requests only after confirmation.
- Pushing local changes only after confirmation.
- Preparing Gitmoji-based commit messages before commit.
- Recommending pull request creation after pushing a version branch.

Do not mutate GitHub resources without explicit confirmation.

When creating a GitHub repository, the agent must confirm:

- Repository name.
- Visibility.
- Description.
- Default branch.
- Initial version.
- Branch naming convention.
- Whether to push the local project.

---

## 13.2 Context7 MCP

Use Context7 MCP when framework, library, or API behavior may depend on current documentation or version-specific behavior.

Use Context7 before generating code for:

- Spring Boot.
- NestJS.
- Node.js.
- TypeScript.
- React.
- Jest.
- JUnit.
- Mockito.
- PyTest.
- AWS SDK.
- TypeORM.
- Docker.
- Kubernetes.

---

## 13.3 Filesystem MCP

Filesystem MCP must only operate inside explicitly authorized folders.

Authorized global workspace:

```text
C:\Users\NarutoRgal\Documents\spec-driven-workspace
```

Do not access or modify unrelated user folders unless explicitly authorized.

---

# 14. Implementation Constraints

The agent must not:

- Invent requirements.
- Ignore acceptance criteria.
- Skip tests.
- Skip documentation.
- Skip design.
- Overengineer solutions.
- Add unnecessary abstractions.
- Add unnecessary dependencies.
- Change public APIs without documentation.
- Change database schema without migration and specification.
- Ignore failing tests.
- Hide known defects.
- Mix unrelated changes.
- Commit secrets.
- Modify generated files manually unless required.
- Refactor unrelated code without approval.
- Rename files without approval.
- Delete code without approval.
- Change formatting globally without approval.
- Create GitHub repositories without approval.
- Create branches without approval.
- Push to GitHub without approval.
- Execute `terraform apply` or `terraform destroy` without approval.
- Deploy AWS infrastructure without approval.
- Commit without a Gitmoji-based commit message.
- Push changes before README is generated or updated.
- Push directly to `master` without explicit approval.

---

# 15. Done Definition

A task is done only when:

- Specifications are read.
- Requirements are documented.
- Acceptance criteria are defined.
- Design is documented.
- Tasks are listed.
- Architecture is selected or confirmed.
- Infrastructure strategy is selected or confirmed.
- Database strategy is selected or confirmed.
- GitHub repository strategy is selected or confirmed.
- Terraform/IaC strategy is selected or confirmed.
- Docker strategy is selected or confirmed when containers are required.
- Container security requirements are reviewed when Docker is used.
- User confirms implementation.
- Code is implemented.
- Unit tests are created or updated.
- Acceptance criteria are covered.
- Tests pass or exact execution instructions are provided.
- Security impact is considered.
- Observability impact is considered.
- Documentation is updated.
- README.md is generated or updated.
- Gitmoji-based commit message is proposed.
- Commit and push confirmation is requested separately.
- The agent reports all changed files.
- The agent reports any limitation or pending item.

---

# 16. Required Pre-Implementation Response

Before implementing, the agent must respond with this structure:

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

Files I propose to create or modify:
- ...

Tasks to execute:
- ...

Tests to create or update:
- ...

Risks or open questions:
- ...

Do you confirm that I should proceed with these changes?
```

The agent must wait for explicit confirmation.

---

# 17. Priority Order

If instructions conflict, apply this priority order:

1. Explicit user instruction in the current conversation.
2. Security and safety requirements.
3. Project-local `AGENTS.md`.
4. This global `AGENTS.md`.
5. Project-local `/specs`.
6. Global spec workspace.
7. Existing project conventions.
8. Framework and language best practices.

Even with this priority order, no project mutation may occur without explicit confirmation.

---

# 18. Final Response Requirement

After completing work, the agent must report:

- What was done.
- What files were created.
- What files were modified.
- What files were deleted, if any.
- What tests were created or updated.
- What commands were run.
- Test results.
- Acceptance criteria status.
- Docker/IaC validation status when applicable.
- README status.
- Proposed Gitmoji commit message.
- Target branch and push status, if applicable.
- Any pending action.
