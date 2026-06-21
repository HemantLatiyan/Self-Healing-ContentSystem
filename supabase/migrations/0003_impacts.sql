-- Persist the impact set per change_set so the reviewer can see exactly
-- which content items were considered, and so step C is replayable.
create table change_set_impacts (
  change_set_id bigint not null references change_sets(id) on delete cascade,
  content_id    bigint not null references content(id)     on delete cascade,
  primary key (change_set_id, content_id)
);
create index change_set_impacts_content_idx on change_set_impacts(content_id);

grant all on table change_set_impacts to anon, authenticated, service_role;
