-- Preserve a user's withdrawn pending request as borrowing history.
-- `cancelled` is terminal and intentionally excluded from the existing open
-- and active borrowing partial indexes.
alter type public.borrowing_status add value if not exists 'cancelled';
