import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta
import uuid
import sys
import os

# Add parent directory to path to import from server
sys.path.insert(0, '/app/backend')

async def setup_admin_and_raffle():
    # Read environment from server context
    from server import mongo_url, db
    
    # Find user by username (try both variations)
    user = await db.users.find_one({'$or': [
        {'username': {'$regex': 'Kenneth Powell', '$options': 'i'}},
        {'username': {'$regex': 'Dj John Dope', '$options': 'i'}},
        {'full_name': {'$regex': 'Kenneth Powell', '$options': 'i'}},
        {'service_name': {'$regex': 'Dj John Dope', '$options': 'i'}}
    ]})
    
    if not user:
        print("❌ User not found. Please provide exact username.")
        return
    
    print(f"✅ Found user: {user.get('username')} (ID: {user['_id']})")
    
    # Mark as admin
    await db.users.update_one(
        {'_id': user['_id']},
        {'$set': {'is_admin': True}}
    )
    print(f"✅ Marked {user.get('username')} as admin")
    
    # Create test raffle
    raffle_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    raffle_dict = {
        '_id': raffle_id,
        'title': '65" TCL TV Raffle',
        'description': 'Win a brand new 65" TCL Roku Smart TV! Enter for your chance to upgrade your home entertainment. Drawing happens at the end of the campaign. Good luck!',
        'prize': '65" TCL Roku TV',
        'ticket_price': 10.00,
        'currency': 'USD',
        'status': 'active',
        'start_date': now,
        'end_date': now + timedelta(days=30),
        'max_tickets': None,
        'image': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzE1NjVGRiIvPjx0ZXh0IHg9IjUwJSIgeT0iNDAlIiBmb250LXNpemU9IjM2IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXdlaWdodD0iYm9sZCI+8J+OlyBXSU4gQTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1zaXplPSI0OCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC13ZWlnaHQ9ImJvbGQiPjY1IiBUQ0wgVFY8L3RleHQ+PHRleHQgeD0iNTAlIiB5PSI3MCUiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiPiQxMCBwZXIgZW50cnk8L3RleHQ+PC9zdmc+',
        'winner_user_id': None,
        'winner_entry_id': None,
        'winner_selected_at': None,
        'created_at': now,
        'updated_at': now
    }
    
    await db.raffles.insert_one(raffle_dict)
    
    print(f"\n✅ Test raffle created successfully!")
    print(f"   ID: {raffle_id}")
    print(f"   Title: {raffle_dict['title']}")
    print(f"   Prize: {raffle_dict['prize']}")
    print(f"   Ticket Price: ${raffle_dict['ticket_price']}")
    print(f"   Status: {raffle_dict['status']}")
    print(f"   Ends: {raffle_dict['end_date'].strftime('%B %d, %Y')}")
    print(f"\n🎉 You can now see this raffle in the app!")

if __name__ == '__main__':
    asyncio.run(setup_admin_and_raffle())
