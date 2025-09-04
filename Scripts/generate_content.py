import os
from datetime import datetime
from pathlib import Path
from google import genai

def main():
    # Configure API key from environment variable
    api_key = os.getenv('GOOGLE_GENAI_API_KEY')
    if not api_key:
        raise ValueError("GOOGLE_GENAI_API_KEY environment variable not set")
    
    client=genai.Client(api_key=api_key)
    
    # Get current month
    now = datetime.now()
    current_month = now.strftime("%B")
    
    # Define prompt template with current month
    prompt = f"""Write content for "Best Places to Visit in India in {current_month}" following this EXACT format:

**Structure Requirements:**
1. Start with a short, inspiring introduction paragraph (2-3 sentences) about {current_month} in India - NO headings needed
2. List exactly 6-8 destinations using numbered format: "1. [Destination Name], [State/Region]"
3. For each destination, include 2-3 emoji-prefixed sections with these patterns:
   - 🌟 Why Visit: [explanation of why it's perfect this month]
   - 🎯 Perfect for {current_month}: [specific seasonal activities, weather, festivals]
   - 💡 Travel Tips: [practical advice for visiting this month]

**Formatting Rules:**
- Each destination MUST start with number format: "1. Goa, India" or "2. Kerala, India"
- Each section MUST start with emoji + space + title + colon + space
- Use varied emojis (🌟🎯💡🏔️🌿☕🕉️🏞️🎶👑🌸🏖️⛵💧🥾 etc.)
- Keep each section 2-4 sentences
- Include specific {current_month} details (weather, festivals, seasonal beauty)

**Example Format:**
[Short intro paragraph about {current_month}]

1. Goa, India

🏖️ Why Visit: Perfect post-monsoon weather with clear skies and calm seas make {current_month} ideal for beach activities and water sports.

🎯 Perfect for {current_month}: The tourist crowds are minimal while weather remains pleasant, making it perfect for peaceful beach walks and affordable accommodations.

💡 Travel Tips: Book beachside shacks early as they reopen after monsoon, and try the fresh seafood that's abundant this month.

2. Kerala, India

🌴 Why Visit: The backwaters are rejuvenated after monsoons, creating lush green landscapes perfect for houseboat experiences.

**Content Requirements:**
- Focus on seasonal advantages (weather, crowds, prices, natural beauty)
- Include region-specific festivals or events in {current_month}
- Mention practical benefits like fewer crowds, better weather, seasonal activities
- Keep tone engaging and descriptive
- Each destination should feel unique and compelling for {current_month}

Generate content following this exact structure for {current_month}.
"""
    
    # Generate content using Google GenAI
    response = client.models.generate_content(
    model="gemini-2.5-flash", contents=prompt)

    
    # Ensure content directory exists
    content_dir = Path('Public/Content')

    content_dir.mkdir(exist_ok=True)
    
    # Write content to markdown file (replaces previous file automatically)
    filename = content_dir / f'{current_month.lower()}.md'
    with open(filename, 'w', encoding='utf-8') as file:
        file.write(response.text)
    
    print(f"✅ Content for {current_month} generated and saved to {filename}")

if __name__ == "__main__":
    main()
