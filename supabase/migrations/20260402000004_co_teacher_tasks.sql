-- Co-teacher task tracking
-- Designed to be simple now, extensible later (due dates, priorities, lesson links, etc.)

create table if not exists co_teacher_tasks (
  id                          uuid primary key default gen_random_uuid(),
  organization_id             uuid not null references organizations(id) on delete cascade,
  created_by                  uuid not null references auth.users(id) on delete cascade,
  -- null = assigned to any co-teacher; set to family_collaborators.id for a specific person
  assigned_to_collaborator_id uuid references family_collaborators(id) on delete set null,
  title                       text not null,
  notes                       text,
  status                      text not null default 'pending' check (status in ('pending', 'completed')),
  due_date                    date,           -- optional, ready when needed
  completed_at                timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

-- Index for the two most common queries
create index if not exists co_teacher_tasks_org_idx  on co_teacher_tasks(organization_id);
create index if not exists co_teacher_tasks_asgn_idx on co_teacher_tasks(assigned_to_collaborator_id);

alter table co_teacher_tasks enable row level security;

-- Admins: full access within their org
create policy "admins manage co_teacher_tasks"
  on co_teacher_tasks for all
  using (
    organization_id in (
      select organization_id from user_organizations
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Co-teachers: read tasks for their org (assigned to them or open)
create policy "co_teachers read tasks"
  on co_teacher_tasks for select
  using (
    organization_id in (
      select organization_id from family_collaborators
      where user_id = auth.uid()
    )
  );

-- Co-teachers: update (mark complete) tasks assigned to them or open ones
create policy "co_teachers update their tasks"
  on co_teacher_tasks for update
  using (
    organization_id in (
      select organization_id from family_collaborators
      where user_id = auth.uid()
    )
    and (
      assigned_to_collaborator_id is null
      or assigned_to_collaborator_id in (
        select id from family_collaborators where user_id = auth.uid()
      )
    )
  );
