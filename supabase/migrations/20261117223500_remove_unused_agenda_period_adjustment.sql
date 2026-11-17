-- A interface utiliza exclusivamente create_agenda_period_for_interface.
-- Remover a função redundante, nunca chamada pelo frontend.
DROP FUNCTION IF EXISTS public.create_agenda_period_adjustment_for_interface(
 uuid,date,date,time without time zone,time without time zone,text,text,text
);