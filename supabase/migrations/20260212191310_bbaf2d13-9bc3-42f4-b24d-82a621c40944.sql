
CREATE OR REPLACE FUNCTION public.apply_wallet_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if (tg_op = 'INSERT' and new.status = 'succeeded')
     or (tg_op = 'UPDATE' and old.status is distinct from new.status and new.status = 'succeeded') then

    insert into public.wallets(user_id, balance_cents)
    values (new.user_id, 0)
    on conflict (user_id) do nothing;

    if new.type in ('topup','payout','admin_adjust') then
      update public.wallets
        set balance_cents = balance_cents + new.amount_cents,
            updated_at = now()
        where user_id = new.user_id;
    else
      update public.wallets
        set balance_cents = balance_cents - new.amount_cents,
            updated_at = now()
        where user_id = new.user_id;
    end if;
  end if;

  return new;
end $function$;
