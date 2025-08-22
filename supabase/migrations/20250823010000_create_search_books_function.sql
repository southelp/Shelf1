CREATE OR REPLACE FUNCTION search_books(search_term TEXT)
RETURNS SETOF books AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM books
  WHERE 
    title ILIKE '%' || search_term || '%' OR
    array_to_string(authors, ' ', '') ILIKE '%' || search_term || '%';
END;
$$ LANGUAGE plpgsql;
