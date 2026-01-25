
import asyncio
from supabase_client import supabase

def check_schema():
    try:
        # Fetch one inquiry to see the keys
        response = supabase.table("inquiries").select("*").limit(1).execute()
        if response.data:
            print("Keys in 'inquiries' table:", response.data[0].keys())
        else:
            print("No inquiries found, cannot determine schema from data.")
            
        # Also check collections to be sure
        response = supabase.table("collections").select("*").limit(1).execute()
        if response.data:
             print("Keys in 'collections' table:", response.data[0].keys())

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
