import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime

# Venue images from Unsplash
VENUE_IMAGES = [
    "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3",  # Event venue with lighting
    "https://images.unsplash.com/photo-1530103862676-de8c9debad1d",  # Elegant venue space
]

# Video thumbnails
VIDEO_THUMBNAILS = [
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30",  # Performance/concert
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea",  # Stage/entertainment
]

# Demo venues data
DEMO_VENUES = [
    {
        "name": "The Grand Ballroom",
        "type": "Banquet Hall",
        "description": "Elegant ballroom perfect for weddings, corporate events, and galas. Features crystal chandeliers, marble floors, and capacity for 500 guests. Full catering and event planning services available.",
        "address": "456 Elegant Ave, Downtown",
        "capacity": 500,
        "amenities": ["Full Catering", "Audio/Visual Equipment", "Valet Parking", "Bridal Suite", "Dance Floor"],
        "price_range": "$$$",
        "rating": 4.8,
        "image_index": 1,
        "popular": True
    },
    {
        "name": "Urban Loft Event Space",
        "type": "Event Venue",
        "description": "Modern industrial loft with exposed brick, high ceilings, and floor-to-ceiling windows. Perfect for creative events, product launches, and intimate gatherings up to 200 people.",
        "address": "789 Industrial Blvd, Arts District",
        "capacity": 200,
        "amenities": ["Natural Lighting", "Modern Decor", "Kitchen Access", "Rooftop Access", "WiFi"],
        "price_range": "$$",
        "rating": 4.6,
        "image_index": 0,
        "popular": True
    }
]

# Demo videos data
DEMO_VIDEOS = [
    {
        "title": "Top 10 Event Venues in the City",
        "description": "Discover the most stunning event spaces our city has to offer! From rooftop lounges to historic ballrooms, we showcase the best venues for your next celebration.",
        "creator": "WGO4Y Productions",
        "duration": "8:45",
        "views": 15420,
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Placeholder
        "thumbnail_index": 0,
        "featured": True
    },
    {
        "title": "How to Plan the Perfect Event",
        "description": "Event planning expert shares insider tips on creating unforgettable experiences. Learn about venue selection, catering, entertainment, and more!",
        "creator": "Event Planning Pro",
        "duration": "12:30",
        "views": 23150,
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Placeholder
        "thumbnail_index": 1,
        "featured": True
    }
]

async def add_demo_content():
    # Connect to MongoDB
    client = AsyncIOMotorClient("mongodb://localhost:27017/")
    db = client.test_database
    
    print("Adding demo venues and videos...\n")
    
    # Add venues
    print("Adding 2 demo venues...")
    for venue_data in DEMO_VENUES:
        venue_id = str(uuid.uuid4())
        
        venue = {
            "_id": venue_id,
            "name": venue_data['name'],
            "type": venue_data['type'],
            "description": venue_data['description'],
            "address": venue_data['address'],
            "capacity": venue_data['capacity'],
            "amenities": venue_data['amenities'],
            "price_range": venue_data['price_range'],
            "rating": venue_data['rating'],
            "image": VENUE_IMAGES[venue_data['image_index']],
            "popular": venue_data['popular'],
            "featured": True,
            "created_at": datetime.utcnow()
        }
        
        await db.venues.insert_one(venue)
        print(f"✅ Added venue: {venue_data['name']}")
    
    # Add videos
    print("\nAdding 2 demo videos...")
    for video_data in DEMO_VIDEOS:
        video_id = str(uuid.uuid4())
        
        video = {
            "_id": video_id,
            "title": video_data['title'],
            "description": video_data['description'],
            "creator": video_data['creator'],
            "duration": video_data['duration'],
            "views": video_data['views'],
            "url": video_data['url'],
            "thumbnail": VIDEO_THUMBNAILS[video_data['thumbnail_index']],
            "featured": video_data['featured'],
            "created_at": datetime.utcnow()
        }
        
        await db.videos.insert_one(video)
        print(f"✅ Added video: {video_data['title']}")
    
    print("\n✅ Successfully added demo content!")
    
    # Show totals
    total_venues = await db.venues.count_documents({})
    total_videos = await db.videos.count_documents({})
    print(f"📊 Total venues in database: {total_venues}")
    print(f"📊 Total videos in database: {total_videos}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(add_demo_content())
