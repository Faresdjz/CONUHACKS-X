
import asyncio
from supabase_client import supabase, get_collection_by_name

def verify_inquiry_collection():
    try:
        # 1. Get the most recent inquiry
        print("Fetching latest inquiry...")
        response = supabase.table("inquiries").select("*").order("created_at", desc=True).limit(1).execute()
        
        if not response.data:
            print("No inquiries found.")
            return

        inquiry = response.data[0]
        print(f"Latest Inquiry ID: {inquiry['id']}")
        print(f"Collection ID: {inquiry['collection_id']}")
        
        if inquiry['collection_id']:
            # Verify the collection name
            collection_response = supabase.table("collections").select("*").eq("id", inquiry['collection_id']).single().execute()
            print(f"Linked Collection Name: {collection_response.data['name']}")
        else:
            print("Inquiry is NOT linked to any collection.")

        # 2. List existing collections to help with manual testing
        print("\nExisting Collections:")
        collections = supabase.table("collections").select("name").execute()
        for c in collections.data:
            print(f"- {c['name']}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_inquiry_collection()
