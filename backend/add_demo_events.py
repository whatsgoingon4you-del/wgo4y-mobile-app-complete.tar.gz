import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timedelta

# Event images
EVENT_IMAGES = [
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",  # Concert yellow lights
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",  # Festival dramatic lighting
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",  # Festival confetti
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d",  # Colorful balloons
]

# Demo events data
DEMO_EVENTS = [
    {
        "title": "Summer Rooftop Jazz Festival 2025",
        "description": "Join us for an unforgettable evening of smooth jazz under the stars! Featuring local jazz bands, craft cocktails, and stunning city views from our rooftop venue.",
        "category": "Music",
        "venue": "The Rooftop Lounge",
        "organizer": "The Rooftop Lounge",
        "price": 35.00,
        "capacity": 150,
        "date_offset": 14,  # days from now
        "image_index": 0
    },
    {
        "title": "Comedy Night Spectacular",
        "description": "Get ready to laugh until it hurts! Featuring 5 of the hottest stand-up comedians from around the country. 21+ event with full bar service.",
        "category": "Nightlife",
        "venue": "Downtown Comedy Club",
        "organizer": "Laugh Factory Productions",
        "price": 25.00,
        "capacity": 200,
        "date_offset": 7,
        "image_index": 2
    },
    {
        "title": "Food & Wine Pairing Experience",
        "description": "An elegant evening of gourmet cuisine paired with premium wines. Chef's tasting menu featuring 5 courses with expertly matched wines from local vineyards.",
        "category": "Food & Drink",
        "venue": "Grand Bistro",
        "organizer": "Culinary Arts Society",
        "price": 85.00,
        "capacity": 80,
        "date_offset": 21,
        "image_index": 3
    },
    {
        "title": "EDM Festival - Summer Nights",
        "description": "The biggest electronic dance music festival of the season! Featuring top DJs, amazing light shows, and non-stop dancing. VIP areas available.",
        "category": "Music",
        "venue": "Convention Center Arena",
        "organizer": "Pulse Events",
        "price": 45.00,
        "capacity": 500,
        "date_offset": 30,
        "image_index": 1
    },
    {
        "title": "Saturday Art Walk & Gallery Opening",
        "description": "Explore local art galleries featuring works from emerging artists. Complimentary wine and cheese. Meet the artists and enjoy live acoustic music.",
        "category": "Arts",
        "venue": "Arts District",
        "organizer": "City Arts Council",
        "price": 0.00,  # Free event
        "capacity": 300,
        "date_offset": 3,
        "image_index": 3
    },
    {
        "title": "Sunset Beach Party Bash",
        "description": "End your summer with the ultimate beach party! Live DJ, beach volleyball, bonfire, and food trucks. Bring your friends for an unforgettable night.",
        "category": "Community",
        "venue": "Sunset Beach",
        "organizer": "Beach Events Co.",
        "price": 15.00,
        "capacity": 250,
        "date_offset": 45,
        "image_index": 2
    },
    {
        "title": "R&B Smooth Grooves Night",
        "description": "Classic and contemporary R&B all night long. Featuring live performances and DJ sets. Dress to impress - VIP bottle service available.",
        "category": "Music",
        "venue": "Velvet Lounge",
        "organizer": "Velvet Entertainment",
        "price": 30.00,
        "capacity": 180,
        "date_offset": 10,
        "image_index": 0
    },
    {
        "title": "New Year's Eve Countdown Celebration",
        "description": "Ring in the new year in style! Premium open bar, gourmet buffet, champagne toast at midnight, and spectacular fireworks view. Black tie optional.",
        "category": "Nightlife",
        "venue": "Grand Hotel Ballroom",
        "organizer": "Elite Events",
        "price": 125.00,
        "capacity": 400,
        "date_offset": 60,
        "image_index": 1
    }
]

async def add_demo_events():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.test_database
    
    print("Adding 8 demo events...")
    
    for event_data in DEMO_EVENTS:
        event_id = str(uuid.uuid4())
        event_date = datetime.utcnow() + timedelta(days=event_data['date_offset'])
        
        event = {
            "_id": event_id,
            "title": event_data['title'],
            "description": event_data['description'],
            "image": EVENT_IMAGES[event_data['image_index']],
            "date": event_date,
            "venue": event_data['venue'],
            "venue_id": None,
            "price": event_data['price'],
            "organizer": event_data['organizer'],
            "category": event_data['category'],
            "capacity": event_data['capacity'],
            "status": "published",
            "visibility": "public",
            "created_by": None,
            "featured": True,
            "tickets_available": event_data['capacity'],
            "ticket_tiers": None,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.events.insert_one(event)
        print(f"✅ Added: {event_data['title']}")
    
    print("\n✅ Successfully added 8 demo events!")
    
    # Show total count
    total_events = await db.events.count_documents({})
    print(f"📊 Total events in database: {total_events}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_demo_events())
