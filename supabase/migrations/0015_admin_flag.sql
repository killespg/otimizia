-- Flag de admin, usada só pra liberar a tela /dev (métricas internas do dono do produto).
alter table public.profiles add column if not exists is_admin boolean not null default false;
