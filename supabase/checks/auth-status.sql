-- Only aggregate status. Do not print emails, user identifiers or session tokens.
select count(*) as accounts,
  count(*) filter(where email_confirmed_at is not null) as confirmed_accounts,
  count(*) filter(where last_sign_in_at is not null) as signed_in_accounts
from auth.users;
