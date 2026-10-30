-- Development data only. Run once after the migration in an empty development database.
BEGIN;

INSERT INTO public.users (id, name, email, status) VALUES
  (1, 'Alice Morgan', 'alice@example.com', 'active'),
  (2, 'Benjamin Carter', 'benjamin@example.com', 'active'),
  (3, 'Chloe Reed', 'chloe@example.com', 'active'),
  (4, 'Daniel Brooks', 'daniel@example.com', 'active'),
  (5, 'Emma Wilson', 'emma@example.com', 'inactive');

INSERT INTO public.courses (id, user_id, code, title, description) VALUES
  (1, 1, 'COURSE-001', 'Web Development', 'Build a foundation in web development.'),
  (2, 1, 'COURSE-002', 'Database Fundamentals', 'Learn relational database concepts.'),
  (3, 2, 'COURSE-003', 'Software Engineering', 'Explore software design and testing.');

INSERT INTO public.modules (id, course_id, user_id, title, description) VALUES
  (1, 1, 1, 'HTML', 'Structure web pages.'),
  (2, 1, 1, 'CSS', 'Style web pages.'),
  (3, 1, 3, 'JavaScript', 'Add browser behavior.'),
  (4, 1, 1, 'TypeScript', 'Introduce static types.'),
  (5, 1, 1, 'Express', 'Build a web server.'),
  (6, 2, 1, 'Relational Modeling', 'Design tables and relationships.'),
  (7, 2, 3, 'SQL Queries', 'Read and aggregate data.'),
  (8, 2, 1, 'Database Integrity', 'Protect data consistency.'),
  (9, 3, 2, 'Software Design', 'Separate application responsibilities.'),
  (10, 3, 4, 'Software Testing', 'Verify application behavior.');

-- Course 1: five modules with one content each.
INSERT INTO public.contents (id, module_id, title, content) VALUES
  (1, 1, 'HTML Elements', 'Use semantic HTML elements to structure a page.'),
  (2, 2, 'CSS Selectors', 'Use selectors to apply styles to HTML elements.'),
  (3, 3, 'JavaScript Functions', 'Create functions to organize reusable behavior.'),
  (4, 4, 'TypeScript Types', 'Describe values using explicit TypeScript types.'),
  (5, 5, 'Express Routes', 'Map HTTP requests to request handlers.'),
  -- Course 2: three modules with two, two, and one contents.
  (6, 6, 'Entities', 'Identify the entities represented by database tables.'),
  (7, 6, 'Relationships', 'Connect related entities using foreign keys.'),
  (8, 7, 'Select Queries', 'Read table data with SELECT statements.'),
  (9, 7, 'Aggregate Queries', 'Summarize records using COUNT and GROUP BY.'),
  (10, 8, 'Database Constraints', 'Use constraints to enforce valid data.'),
  -- Course 3: two modules with two contents each.
  (11, 9, 'Layered Architecture', 'Separate routes, controllers, and repositories.'),
  (12, 9, 'Readable Code', 'Use descriptive names and focused functions.'),
  (13, 10, 'Unit Testing', 'Check the behavior of isolated units.'),
  (14, 10, 'Integration Testing', 'Check how application components work together.');

-- Each row records the first watched time for a user and content pair.
INSERT INTO public.user_content_views (user_id, content_id, watched_at) VALUES
  (1, 2, '2026-10-01T10:00:00Z'),
  (2, 2, '2026-10-02T11:00:00Z'),
  (3, 2, '2026-10-03T12:00:00Z'),
  (4, 1, '2026-10-04T13:00:00Z'),
  (1, 6, '2026-10-05T14:00:00Z'),
  (2, 11, '2026-10-06T15:00:00Z'),
  (3, 14, '2026-10-07T16:00:00Z');

-- Explicit seed IDs do not advance identity sequences automatically.
SELECT setval(pg_get_serial_sequence('public.users', 'id'), (SELECT max(id) FROM public.users));
SELECT setval(pg_get_serial_sequence('public.courses', 'id'), (SELECT max(id) FROM public.courses));
SELECT setval(pg_get_serial_sequence('public.modules', 'id'), (SELECT max(id) FROM public.modules));
SELECT setval(pg_get_serial_sequence('public.contents', 'id'), (SELECT max(id) FROM public.contents));

COMMIT;
