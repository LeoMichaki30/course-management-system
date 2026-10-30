Course Management System — Development Guidelines

1. Project Overview

This project is a Course Management System developed as an academic assignment.

The backend uses Node.js, TypeScript, Express, and PostgreSQL through Supabase.

All implementations must follow the academic requirements and the existing project structure.

2. Language Rules

* All source code must be written in English.
* All variables, functions, classes, interfaces, database tables, and columns must use English names.
* All code comments must be written in English.
* API routes and JSON properties must use English names.
* Do not introduce Portuguese identifiers into the codebase.

3. Architecture

Follow the existing project structure:

* src/models/ — Data models and types.
* src/repositories/ — Database access and queries.
* src/controllers/ — Request handling and response logic.
* src/routes/ — API endpoint definitions.
* src/app.ts — Express application configuration.
* src/server.ts — Server initialization.

Keep responsibilities separated.

Avoid placing database queries directly inside routes.

4. Code Style

* Use TypeScript with strict type checking.
* Use consistent indentation of two spaces.
* Use camelCase for variables and functions.
* Use PascalCase for classes, interfaces, and types.
* Use snake_case for database tables and columns.
* Use descriptive names.
* Avoid unnecessary code duplication.
* Prefer simple, readable solutions.
* Follow the existing project’s conventions.

5. Database Rules

Use PostgreSQL through Supabase.

The main database tables are:

* users
* courses
* modules
* contents
* user_content_views

Database relationships:

* One user can create many courses.
* One user can create many modules.
* One course can have many modules.
* One module can have many contents.
* Users and contents have a many-to-many viewing relationship.

Use primary keys, foreign keys, and appropriate constraints.

Keep database changes organized through migrations.

6. Security

* Never expose API keys, passwords, or credentials.
* Never commit .env files.
* Use environment variables for sensitive configuration.
* Validate incoming request data.
* Handle errors appropriately.

7. Git Workflow

* Do not commit directly to main.
* Work on dedicated feature branches.
* Keep commits focused and descriptive.
* Do not perform Git pushes without explicit authorization.
* Do not create commits unless explicitly requested.
* Avoid modifying unrelated files.

8. Development Workflow

Before implementing a feature:

1. Analyze the existing code.
2. Identify the files that need modification.
3. Explain the proposed changes.
4. Wait for approval before making significant changes.

After implementing a feature:

1. Explain what was modified.
2. Run available TypeScript checks.
3. Report any errors or incomplete tasks.
4. Suggest how to test the implementation.

Do not claim that a feature works unless it has been tested.

9. Academic Requirements

The project must support:

* CRUD operations for users, courses, modules, and contents.
* Database relationships and referential integrity.
* Identification of users who created courses and modules.
* Tracking which users watched specific contents.
* SQL reports requested in the assignment.
* Database population with sample records.

Prioritize functional backend requirements before optional features such as React, Docker, Swagger, and deployment.

10. Communication

* Explain development decisions clearly.
* Keep explanations concise and understandable for a beginner.
* When introducing technical concepts, explain their purpose.
* Ask for clarification when requirements are ambiguous.
* Never silently change established project conventions.