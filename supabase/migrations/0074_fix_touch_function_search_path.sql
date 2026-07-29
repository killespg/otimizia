-- As duas funções de gatilho que carimbam `updated_at` foram criadas sem
-- `search_path` fixo. Função sem search_path resolve nomes pela configuração
-- de quem dispara o gatilho, então quem consegue criar um objeto num schema
-- que venha antes de `public` na busca passa a decidir qual função o corpo
-- chama. Estas duas só usam `now()`, que vive em pg_catalog e é sempre
-- consultado primeiro, então o risco aqui é pequeno — mas o padrão precisa
-- valer para todas, senão a próxima função nasce com a mesma brecha e ninguém
-- lembra o porquê da exceção.
--
-- `set search_path = ''` obriga qualquer referência futura a ser qualificada,
-- que é o comportamento que se quer numa função de gatilho.

alter function public.touch_law_office_record() set search_path = '';
alter function public.touch_real_estate_record() set search_path = '';
