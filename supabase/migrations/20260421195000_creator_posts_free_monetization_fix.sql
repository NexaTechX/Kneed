-- Free posts must have monetization_status = 'none' so feed RLS allows non-authors to read them
-- (see creator_posts_select in 20260421180000_full_creator_reshape.sql).
update public.creator_posts
set monetization_status = 'none'
where is_paid = false
  and monetization_status is distinct from 'none';
