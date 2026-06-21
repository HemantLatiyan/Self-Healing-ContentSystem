-- Self-healing content system: initial schema.
-- BIGSERIAL ids for debuggability in the take-home demo; UUIDs are not needed at this scale.

create type source_type as enum ('markdown', 'html');
create type content_type as enum ('lesson', 'quiz', 'rationale', 'flashcard');
create type changeset_status as enum ('detected', 'diffed', 'impacted', 'proposed', 'done', 'failed');
create type change_severity as enum ('trivial', 'minor', 'major');
create type proposal_status as enum ('pending', 'auto_published', 'approved', 'rejected', 'superseded');

create table sources (
  id              bigserial primary key,
  name            text        not null,
  type            source_type not null default 'markdown',
  location        text        not null unique,
  latest_hash     text,
  latest_snapshot_id bigint,
  updated_at      timestamptz not null default now()
);

create table snapshots (
  id                  bigserial primary key,
  source_id           bigint      not null references sources(id) on delete cascade,
  raw_content         text        not null,
  normalized_content  text        not null,
  hash                text        not null,
  created_at          timestamptz not null default now()
);
create index snapshots_source_created_idx on snapshots(source_id, created_at desc);

alter table sources
  add constraint sources_latest_snapshot_fk
  foreign key (latest_snapshot_id) references snapshots(id) on delete set null;

create table concepts (
  id          bigserial primary key,
  name        text        not null unique,
  description text        not null,
  updated_at  timestamptz not null default now()
);

create table source_concepts (
  source_id    bigint      not null references sources(id)  on delete cascade,
  concept_id   bigint      not null references concepts(id) on delete cascade,
  extracted_at timestamptz not null default now(),
  primary key (source_id, concept_id)
);

create table content (
  id                  bigserial primary key,
  type                content_type not null,
  title               text         not null,
  current_body        text         not null,
  current_version     int          not null default 1,
  primary_concept_id  bigint       references concepts(id) on delete set null,
  updated_at          timestamptz  not null default now()
);

create table content_concepts (
  content_id bigint not null references content(id)  on delete cascade,
  concept_id bigint not null references concepts(id) on delete cascade,
  primary key (content_id, concept_id)
);

create table change_sets (
  id                bigserial primary key,
  source_id         bigint           not null references sources(id) on delete cascade,
  prev_snapshot_id  bigint           references snapshots(id) on delete set null,
  new_snapshot_id   bigint           not null references snapshots(id) on delete cascade,
  status            changeset_status not null default 'detected',
  severity          change_severity,
  semantic_summary  text,
  failure_reason    text,
  created_at        timestamptz      not null default now()
);
create index change_sets_status_idx on change_sets(status);

create table content_versions (
  id                  bigserial primary key,
  content_id          bigint      not null references content(id) on delete cascade,
  body                text        not null,
  version             int         not null,
  source_changeset_id bigint      references change_sets(id) on delete set null,
  created_at          timestamptz not null default now(),
  published_by        text        not null,
  unique (content_id, version)
);

create table patch_proposals (
  id                    bigserial primary key,
  changeset_id          bigint           not null references change_sets(id) on delete cascade,
  content_id            bigint           not null references content(id)     on delete cascade,
  old_body              text             not null,
  proposed_body         text             not null,
  confidence_score      numeric(4,3)     not null,
  confidence_breakdown  jsonb            not null,
  status                proposal_status  not null default 'pending',
  reviewer_id           text,
  reviewed_at           timestamptz,
  review_notes          text,
  created_at            timestamptz      not null default now()
);
create index patch_proposals_status_idx          on patch_proposals(status);
create index patch_proposals_content_status_idx  on patch_proposals(content_id, status);
create index patch_proposals_changeset_idx       on patch_proposals(changeset_id);

create table audit_log (
  id                 bigserial primary key,
  actor              text        not null,
  action             text        not null,
  patch_proposal_id  bigint      references patch_proposals(id) on delete set null,
  payload            jsonb       not null default '{}'::jsonb,
  created_at         timestamptz not null default now()
);
create index audit_log_created_idx on audit_log(created_at desc);

-- Restore Supabase's default schema grants. `drop schema public cascade` in the
-- reset script wipes them, leaving the REST API (which authenticates as the
-- `service_role` Postgres role when using the service-role key) without access.
grant usage on schema public to anon, authenticated, service_role;
grant all   on all tables    in schema public to anon, authenticated, service_role;
grant all   on all sequences in schema public to anon, authenticated, service_role;
grant all   on all functions in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
