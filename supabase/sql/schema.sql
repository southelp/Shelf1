
-- Create a function to search for books by title or author
create or replace function search_books(search_term text)
returns setof books
language sql
as $$
    select *
    from books
    where search_term is null or title ilike '%' || search_term || '%' or author ilike '%' || search_term || '%';
$$;
