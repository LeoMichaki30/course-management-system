-- 1. Users ranked by registered courses, including users with no courses.
SELECT
  u.id AS user_id,
  u.name,
  COUNT(c.id) AS course_count
FROM public.users AS u
LEFT JOIN public.courses AS c ON c.user_id = u.id
GROUP BY u.id, u.name
ORDER BY course_count DESC, u.id;

-- 2. Courses with the most contents, including all ties.
WITH course_content_counts AS (
  SELECT
    c.id AS course_id,
    c.title AS course_title,
    COUNT(ct.id) AS content_count
  FROM public.courses AS c
  LEFT JOIN public.modules AS m ON m.course_id = c.id
  LEFT JOIN public.contents AS ct ON ct.module_id = m.id
  GROUP BY c.id, c.title
)
SELECT course_id, course_title, content_count
FROM course_content_counts
WHERE content_count = (SELECT MAX(content_count) FROM course_content_counts)
ORDER BY course_id;

-- 3. All courses with module and content counts, including empty courses.
SELECT
  c.id AS course_id,
  c.title AS course_title,
  COUNT(DISTINCT m.id) AS module_count,
  COUNT(DISTINCT ct.id) AS content_count
FROM public.courses AS c
LEFT JOIN public.modules AS m ON m.course_id = c.id
LEFT JOIN public.contents AS ct ON ct.module_id = m.id
GROUP BY c.id, c.title
ORDER BY c.id;

-- 4. All contents with their course titles.
SELECT
  ct.id AS content_id,
  ct.title AS content_title,
  c.title AS course_title
FROM public.contents AS ct
JOIN public.modules AS m ON m.id = ct.module_id
JOIN public.courses AS c ON c.id = m.course_id
ORDER BY ct.id;

-- 5. Users who watched content ID 2 and when they watched it.
SELECT u.id AS user_id, u.name, u.email, v.watched_at
FROM public.users AS u
JOIN public.user_content_views AS v ON v.user_id = u.id
WHERE v.content_id = 2
ORDER BY u.id;
