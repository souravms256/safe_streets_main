from supabase import create_client, ClientOptions
from core.config import settings

options = ClientOptions(
    postgrest_client_timeout=60,
    storage_client_timeout=60,
    schema="public",
)

supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY, options=options)
