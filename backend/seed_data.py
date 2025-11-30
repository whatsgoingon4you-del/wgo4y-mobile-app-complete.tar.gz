import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta
import uuid

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

# Placeholder base64 image (1x1 pixel transparent PNG)
PLACEHOLDER_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

async def seed_database():
    print("Seeding database with mock data...")
    
    # Clear existing data
    await db.categories.delete_many({})
    await db.events.delete_many({})
    await db.venues.delete_many({})
    await db.services.delete_many({})
    await db.videos.delete_many({})
    await db.coupons.delete_many({})
    await db.raffles.delete_many({})
    
    # Seed Categories
    categories = [
        {'_id': str(uuid.uuid4()), 'name': 'Music', 'icon': 'musical-notes', 'description': 'Live music and concerts'},
        {'_id': str(uuid.uuid4()), 'name': 'Comedy', 'icon': 'happy', 'description': 'Stand-up comedy shows'},
        {'_id': str(uuid.uuid4()), 'name': 'Food & Drink', 'icon': 'restaurant', 'description': 'Dining experiences'},
        {'_id': str(uuid.uuid4()), 'name': 'Sports', 'icon': 'football', 'description': 'Sports events and games'},
        {'_id': str(uuid.uuid4()), 'name': 'Arts', 'icon': 'color-palette', 'description': 'Art galleries and exhibitions'},
        {'_id': str(uuid.uuid4()), 'name': 'Nightlife', 'icon': 'moon', 'description': 'Clubs and night events'},
    ]
    await db.categories.insert_many(categories)
    print(f"Seeded {len(categories)} categories")
    
    # Seed Events
    events = [
        {
            '_id': str(uuid.uuid4()),
            'title': 'Summer Jazz Festival 2025',
            'description': 'Join us for an unforgettable evening of smooth jazz featuring top artists from around the world. Experience live performances, food trucks, and a vibrant atmosphere perfect for music lovers.',
            'image': PLACEHOLDER_IMAGE,
            'date': datetime.utcnow() + timedelta(days=15),
            'venue': 'Downtown Jazz Club',
            'price': 45.00,
            'organizer': 'Jazz Society',
            'category': 'Music',
            'featured': True,
            'tickets_available': 250,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Comedy Night with Top Comedians',
            'description': 'Laugh out loud with the best comedians in town! This special comedy night features stand-up performances guaranteed to keep you entertained all evening.',
            'image': PLACEHOLDER_IMAGE,
            'date': datetime.utcnow() + timedelta(days=7),
            'venue': 'The Comedy House',
            'price': 25.00,
            'organizer': 'Laugh Productions',
            'category': 'Comedy',
            'featured': True,
            'tickets_available': 150,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Food & Wine Festival',
            'description': 'Discover exquisite flavors from local restaurants and wineries. Sample artisan foods, premium wines, and enjoy live cooking demonstrations from celebrity chefs.',
            'image': PLACEHOLDER_IMAGE,
            'date': datetime.utcnow() + timedelta(days=30),
            'venue': 'Central Park Pavilion',
            'price': 65.00,
            'organizer': 'Culinary Arts Guild',
            'category': 'Food & Drink',
            'featured': True,
            'tickets_available': 500,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Saturday Art Walk',
            'description': 'Explore local art galleries featuring contemporary artists. Meet the creators, enjoy wine and cheese, and find unique pieces for your collection.',
            'image': PLACEHOLDER_IMAGE,
            'date': datetime.utcnow() + timedelta(days=5),
            'venue': 'Arts District',
            'price': 0.00,
            'organizer': 'City Arts Council',
            'category': 'Arts',
            'featured': True,
            'tickets_available': 1000,
            'created_at': datetime.utcnow()
        }
    ]
    await db.events.insert_many(events)
    print(f"Seeded {len(events)} events")
    
    # Seed Venues
    venues = [
        {
            '_id': str(uuid.uuid4()),
            'name': 'The Grand Ballroom',
            'description': 'Elegant venue perfect for weddings, corporate events, and large gatherings. Features stunning chandeliers, marble floors, and state-of-the-art sound system.',
            'image': PLACEHOLDER_IMAGE,
            'type': 'Event Hall',
            'rating': 4.8,
            'amenities': ['Catering Kitchen', 'Sound System', 'Parking', 'WiFi', 'Air Conditioning', 'Stage'],
            'contact_phone': '+1 (555) 123-4567',
            'contact_email': 'info@grandballroom.com',
            'website': 'https://grandballroom.com',
            'address': '123 Main Street, Downtown',
            'booking_price': 2500.00,
            'popular': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Sunset Rooftop Bar',
            'description': 'Breathtaking rooftop venue with panoramic city views. Perfect for cocktail parties, networking events, and intimate celebrations under the stars.',
            'image': PLACEHOLDER_IMAGE,
            'type': 'Bar & Lounge',
            'rating': 4.9,
            'amenities': ['Full Bar', 'Outdoor Seating', 'City Views', 'DJ Booth', 'Heating Lamps'],
            'contact_phone': '+1 (555) 234-5678',
            'contact_email': 'events@sunsetrooftop.com',
            'website': 'https://sunsetrooftop.com',
            'address': '456 Sky Tower, 20th Floor',
            'booking_price': 1800.00,
            'popular': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Garden Pavilion',
            'description': 'Beautiful outdoor venue surrounded by lush gardens. Ideal for weddings, garden parties, and daytime events with natural beauty.',
            'image': PLACEHOLDER_IMAGE,
            'type': 'Outdoor Venue',
            'rating': 4.7,
            'amenities': ['Gardens', 'Gazebo', 'Restrooms', 'Parking', 'Tent Options', 'Fountain'],
            'contact_phone': '+1 (555) 345-6789',
            'contact_email': 'bookings@gardenpavilion.com',
            'address': '789 Garden Lane',
            'booking_price': 1500.00,
            'popular': True,
            'created_at': datetime.utcnow()
        }
    ]
    await db.venues.insert_many(venues)
    print(f"Seeded {len(venues)} venues")
    
    # Seed Services
    services = [
        {
            '_id': str(uuid.uuid4()),
            'name': 'Event Planning',
            'description': 'Full-service event planning from concept to execution. We handle every detail so you can enjoy your event stress-free.',
            'image': PLACEHOLDER_IMAGE,
            'price': 1200.00,
            'features': ['Venue Selection', 'Vendor Coordination', 'Timeline Management', 'Day-of Coordination', 'Budget Planning'],
            'category': 'Planning',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'DJ Services',
            'description': 'Expert DJs with extensive music libraries and top-quality equipment. We specialize in weddings, corporate events, and private parties.',
            'image': PLACEHOLDER_IMAGE,
            'price': 500.00,
            'features': ['Professional Equipment', 'Custom Playlists', 'MC Services', 'Lighting Effects', '4+ Hours Performance'],
            'category': 'Entertainment',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Photography',
            'description': 'Capture your special moments with our professional photography services. High-quality images, creative compositions, and fast delivery.',
            'image': PLACEHOLDER_IMAGE,
            'price': 800.00,
            'features': ['Professional Photographer', '6 Hours Coverage', 'Edited Photos', 'Online Gallery', 'Print Rights'],
            'category': 'Photography',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Catering',
            'description': 'Delicious catering options for any event size. From elegant plated dinners to casual buffets, we create memorable dining experiences.',
            'image': PLACEHOLDER_IMAGE,
            'price': 35.00,
            'features': ['Custom Menus', 'Professional Staff', 'Setup & Cleanup', 'Dietary Accommodations', 'Tableware Included'],
            'category': 'Catering',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Security',
            'description': 'Professional security services for events of all sizes. Trained personnel ensure safety and peace of mind for you and your guests.',
            'image': PLACEHOLDER_IMAGE,
            'price': 400.00,
            'features': ['Licensed Security Guards', 'Crowd Management', 'Access Control', 'Emergency Response', 'Event Monitoring'],
            'category': 'Security',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Transportation',
            'description': 'Reliable transportation services for your guests. From luxury vehicles to shuttle buses, we ensure everyone arrives safely and on time.',
            'image': PLACEHOLDER_IMAGE,
            'price': 300.00,
            'features': ['Professional Drivers', 'Various Vehicle Options', 'Route Planning', 'On-Time Service', 'Flexible Scheduling'],
            'category': 'Transportation',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': '4 U Travel',
            'description': 'Comprehensive travel planning and booking services. Whether it\'s a destination event or guest accommodations, we handle all travel logistics.',
            'image': PLACEHOLDER_IMAGE,
            'price': 250.00,
            'features': ['Flight Bookings', 'Hotel Reservations', 'Group Travel Discounts', 'Itinerary Planning', '24/7 Travel Support'],
            'category': 'Travel',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Cleaning Services',
            'description': 'Pre and post-event cleaning services. We ensure your venue is spotless before guests arrive and immaculate when they leave.',
            'image': PLACEHOLDER_IMAGE,
            'price': 200.00,
            'features': ['Pre-Event Setup Cleaning', 'Post-Event Cleanup', 'Professional Equipment', 'Eco-Friendly Products', 'Quick Turnaround'],
            'category': 'Cleaning',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Event Promotion',
            'description': 'Marketing and promotional services to maximize event attendance. Social media campaigns, email marketing, and advertising expertise.',
            'image': PLACEHOLDER_IMAGE,
            'price': 600.00,
            'features': ['Social Media Marketing', 'Email Campaigns', 'Influencer Outreach', 'Digital Advertising', 'Analytics Reports'],
            'category': 'Marketing',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Raffle Management',
            'description': 'Complete raffle organization and management services. From prize sourcing to winner selection, we handle everything professionally.',
            'image': PLACEHOLDER_IMAGE,
            'price': 150.00,
            'features': ['Raffle Setup', 'Prize Coordination', 'Ticket Management', 'Winner Selection', 'Legal Compliance'],
            'category': 'Event Services',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'VIP Program',
            'description': 'Exclusive VIP experiences for your special guests. Premium seating, backstage access, meet-and-greets, and personalized attention.',
            'image': PLACEHOLDER_IMAGE,
            'price': 1000.00,
            'features': ['VIP Seating', 'Exclusive Access', 'Personal Concierge', 'Premium Amenities', 'Special Recognition'],
            'category': 'Premium Services',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Coupons & Deals',
            'description': 'Create and distribute coupons and special deals for your events. Boost attendance and reward loyal customers with exclusive offers.',
            'image': PLACEHOLDER_IMAGE,
            'price': 100.00,
            'features': ['Coupon Design', 'Distribution Management', 'Redemption Tracking', 'Custom Offers', 'Analytics Dashboard'],
            'category': 'Marketing',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Family Reunion Packages',
            'description': 'All-inclusive family reunion planning. Venue selection, activities, meals, and accommodations tailored for memorable family gatherings.',
            'image': PLACEHOLDER_IMAGE,
            'price': 2500.00,
            'features': ['Venue Coordination', 'Activity Planning', 'Group Meals', 'Accommodation Booking', 'Family Photo Sessions'],
            'category': 'Special Packages',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Volunteer Program',
            'description': 'Recruit, train, and manage volunteers for your events. Professional coordination ensures smooth operations with dedicated volunteer staff.',
            'image': PLACEHOLDER_IMAGE,
            'price': 300.00,
            'features': ['Volunteer Recruitment', 'Training Programs', 'Shift Scheduling', 'Coordination Services', 'Recognition Programs'],
            'category': 'Event Services',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Job Board',
            'description': 'Event industry job posting and recruitment services. Connect with qualified professionals for temporary or permanent positions.',
            'image': PLACEHOLDER_IMAGE,
            'price': 200.00,
            'features': ['Job Posting', 'Candidate Screening', 'Interview Coordination', 'Background Checks', 'Placement Support'],
            'category': 'Professional Services',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Entrepreneur Network',
            'description': 'Connect with fellow entrepreneurs and service providers. Networking opportunities, business development, and collaboration support.',
            'image': PLACEHOLDER_IMAGE,
            'price': 500.00,
            'features': ['Networking Events', 'Business Matchmaking', 'Collaboration Opportunities', 'Resource Sharing', 'Mentorship Programs'],
            'category': 'Professional Services',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Team Event Hosting',
            'description': 'Corporate team building and company event hosting. Strengthen your team with professionally planned activities and experiences.',
            'image': PLACEHOLDER_IMAGE,
            'price': 1500.00,
            'features': ['Team Building Activities', 'Venue Selection', 'Catering Coordination', 'Activity Facilitation', 'Custom Programs'],
            'category': 'Corporate Services',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Mixers',
            'description': 'Social and professional mixer events. Perfect for networking, meeting new people, and building community connections.',
            'image': PLACEHOLDER_IMAGE,
            'price': 350.00,
            'features': ['Event Planning', 'Venue Coordination', 'Icebreaker Activities', 'Refreshments', 'Follow-up Support'],
            'category': 'Social Events',
            'featured': True,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'name': 'Consultant Access',
            'description': 'Expert consulting services for event planning, business development, and strategic guidance. Personalized advice from industry professionals.',
            'image': PLACEHOLDER_IMAGE,
            'price': 400.00,
            'features': ['One-on-One Consultations', 'Strategic Planning', 'Expert Guidance', 'Custom Solutions', 'Follow-up Support'],
            'category': 'Consulting',
            'featured': True,
            'created_at': datetime.utcnow()
        }
    ]
    await db.services.insert_many(services)
    print(f"Seeded {len(services)} services")
    
    # Seed Videos
    videos = [
        {
            '_id': str(uuid.uuid4()),
            'title': 'WGO4Y Platform Tour',
            'description': 'Learn how to use the WGO4Y platform to discover amazing events, book venues, and connect with services.',
            'type': 'youtube',
            'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'thumbnail': PLACEHOLDER_IMAGE,
            'creator': 'WGO4Y Team',
            'featured': True,
            'views': 1250,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Event Planning Tips',
            'description': 'Expert advice on planning the perfect event, from budgeting to execution.',
            'type': 'youtube',
            'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'thumbnail': PLACEHOLDER_IMAGE,
            'creator': 'Event Experts',
            'featured': True,
            'views': 3400,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Behind the Scenes: Music Festival',
            'description': 'Go behind the scenes of our biggest music festival and see how everything comes together.',
            'type': 'youtube',
            'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'thumbnail': PLACEHOLDER_IMAGE,
            'creator': 'Festival Crew',
            'featured': True,
            'views': 8900,
            'created_at': datetime.utcnow()
        }
    ]
    await db.videos.insert_many(videos)
    print(f"Seeded {len(videos)} videos")
    
    # Seed Coupons
    coupons = [
        {
            '_id': str(uuid.uuid4()),
            'code': 'SUMMER2025',
            'description': '$20 Off Your Next Event Ticket',
            'terms': 'Valid for events priced $50 or more. One use per customer. Cannot be combined with other offers. Expires June 30, 2025.',
            'discount_amount': 20.00,
            'price': 0.00,
            'image': PLACEHOLDER_IMAGE,
            'valid_until': datetime.utcnow() + timedelta(days=90),
            'redeemed_by': [],
            'max_redemptions': 500,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'code': 'VENUE50',
            'description': '$50 Off Venue Booking',
            'terms': 'Valid for venue bookings of $1000 or more. Subject to availability. Some restrictions may apply.',
            'discount_amount': 50.00,
            'price': 5.00,
            'image': PLACEHOLDER_IMAGE,
            'valid_until': datetime.utcnow() + timedelta(days=60),
            'redeemed_by': [],
            'max_redemptions': 200,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'code': 'FREEFOOD',
            'description': 'Free Appetizer at Food Festival',
            'terms': 'Redeem at any participating vendor during the Food & Wine Festival. One per person.',
            'discount_amount': 15.00,
            'price': 0.00,
            'image': PLACEHOLDER_IMAGE,
            'valid_until': datetime.utcnow() + timedelta(days=45),
            'redeemed_by': [],
            'max_redemptions': 1000,
            'created_at': datetime.utcnow()
        }
    ]
    await db.coupons.insert_many(coupons)
    print(f"Seeded {len(coupons)} coupons")
    
    # Seed Raffles
    raffles = [
        {
            '_id': str(uuid.uuid4()),
            'title': 'Win VIP Concert Tickets',
            'description': 'Enter for a chance to win 2 VIP tickets to any concert of your choice, including backstage passes and meet & greet!',
            'prize': '2 VIP Concert Tickets + Backstage Passes',
            'entry_fee': 5.00,
            'image': PLACEHOLDER_IMAGE,
            'draw_date': datetime.utcnow() + timedelta(days=30),
            'entries': [],
            'winner': None,
            'max_entries': 1000,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Grand Prize: $1000 Event Credit',
            'description': 'Win $1000 in event credits to use towards any event, venue booking, or service on WGO4Y!',
            'prize': '$1000 WGO4Y Event Credit',
            'entry_fee': 10.00,
            'image': PLACEHOLDER_IMAGE,
            'draw_date': datetime.utcnow() + timedelta(days=45),
            'entries': [],
            'winner': None,
            'max_entries': 500,
            'created_at': datetime.utcnow()
        },
        {
            '_id': str(uuid.uuid4()),
            'title': 'Free Event Planning Package',
            'description': 'Lucky winner receives a complete event planning package including venue, catering, and DJ services!',
            'prize': 'Complete Event Planning Package (Value: $5000)',
            'entry_fee': 20.00,
            'image': PLACEHOLDER_IMAGE,
            'draw_date': datetime.utcnow() + timedelta(days=60),
            'entries': [],
            'winner': None,
            'max_entries': 250,
            'created_at': datetime.utcnow()
        }
    ]
    await db.raffles.insert_many(raffles)
    print(f"Seeded {len(raffles)} raffles")
    
    print("\n✅ Database seeding completed successfully!")
    print(f"Total items created:")
    print(f"  - {len(categories)} Categories")
    print(f"  - {len(events)} Events")
    print(f"  - {len(venues)} Venues")
    print(f"  - {len(services)} Services")
    print(f"  - {len(videos)} Videos")
    print(f"  - {len(coupons)} Coupons")
    print(f"  - {len(raffles)} Raffles")

if __name__ == "__main__":
    asyncio.run(seed_database())
