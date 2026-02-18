// Script to add proper CEFR levels to all word JSON files
// Levels based on word frequency and difficulty:
// A1: Most basic/common everyday words
// A2: Common but slightly less frequent
// B1: Intermediate vocabulary 
// B2: Upper-intermediate, more specific
// C1: Advanced, specialized, abstract

const fs = require('fs');
const path = require('path');

// Common English words by CEFR level (curated frequency-based lists)
const A1_WORDS = new Set([
    // Family
    'mother', 'father', 'sister', 'brother', 'son', 'daughter', 'baby', 'parent', 'child', 'family',
    'husband', 'wife', 'boy', 'girl', 'man', 'woman', 'friend', 'name', 'age', 'birthday',
    // Home
    'house', 'room', 'door', 'window', 'table', 'chair', 'bed', 'kitchen', 'bathroom', 'garden',
    'floor', 'wall', 'home', 'sofa', 'lamp', 'clock', 'key', 'roof', 'stairs', 'garage',
    // Food/Drink  
    'food', 'water', 'milk', 'bread', 'egg', 'rice', 'meat', 'fruit', 'apple', 'banana',
    'orange', 'tea', 'coffee', 'sugar', 'salt', 'chicken', 'fish', 'cheese', 'cake', 'juice',
    'drink', 'breakfast', 'lunch', 'dinner', 'hungry', 'thirsty',
    // Body/Health
    'head', 'eye', 'ear', 'nose', 'mouth', 'hand', 'foot', 'body', 'hair', 'face', 'tooth', 'arm', 'leg', 'heart', 'back', 'finger',
    // Clothes
    'shirt', 'shoe', 'hat', 'dress', 'coat', 'bag', 'pocket', 'clothes',
    // Weather
    'sun', 'rain', 'snow', 'cold', 'hot', 'warm', 'wind', 'cloud', 'weather', 'sky',
    // City/Transport
    'car', 'bus', 'train', 'road', 'street', 'city', 'shop', 'school', 'hospital', 'park',
    'bridge', 'house', 'building', 'store', 'market',
    // Work
    'work', 'job', 'money', 'office', 'teacher', 'doctor', 'student', 'boss',
    // Emotions
    'happy', 'sad', 'angry', 'good', 'bad', 'nice', 'love', 'like', 'hate', 'afraid', 'tired', 'sorry',
    // Tech
    'computer', 'phone', 'internet', 'email', 'click', 'screen', 'app',
    // Actions
    'eat', 'drink', 'sleep', 'run', 'walk', 'sit', 'stand', 'open', 'close', 'read', 'write',
    'play', 'work', 'study', 'cook', 'clean', 'wash', 'buy', 'sell', 'give', 'take',
    'come', 'go', 'see', 'hear', 'speak', 'say', 'tell', 'ask', 'answer', 'help',
    'start', 'stop', 'wait', 'try', 'need', 'want', 'know', 'think', 'feel', 'make',
    'live', 'die', 'laugh', 'cry', 'sing', 'dance',
    // Nature
    'tree', 'flower', 'animal', 'dog', 'cat', 'bird', 'fish', 'sun', 'moon', 'star', 'sea', 'water', 'river', 'mountain', 'sky', 'garden',
    // Shopping
    'buy', 'pay', 'price', 'cheap', 'money', 'shop', 'store',
    // Education
    'school', 'teacher', 'student', 'book', 'read', 'write', 'learn', 'class', 'pen', 'pencil',
    // Senses
    'see', 'hear', 'smell', 'taste', 'touch', 'feel', 'look', 'watch', 'listen',
    // Sports
    'sport', 'team', 'play', 'win', 'lose', 'run', 'swim', 'kick', 'ball', 'goal',
    'football', 'basketball',
    // Music
    'music', 'song', 'sing', 'dance', 'play', 'listen', 'guitar', 'piano', 'drums',
    // Misc
    'big', 'small', 'old', 'new', 'long', 'short', 'tall', 'fast', 'slow', 'easy', 'hard',
    'yes', 'no', 'please', 'thank', 'hello', 'goodbye', 'today', 'tomorrow', 'yesterday',
    'day', 'night', 'morning', 'week', 'month', 'year', 'time', 'number', 'color'
]);

const A2_WORDS = new Set([
    // Family & People
    'grandparent', 'grandmother', 'grandfather', 'uncle', 'aunt', 'cousin', 'nephew', 'niece', 'teenager',
    'adult', 'neighbor', 'stranger', 'couple', 'partner', 'wedding', 'marry', 'divorce',
    // Home
    'apartment', 'bedroom', 'living room', 'ceiling', 'curtain', 'carpet', 'shelf', 'drawer', 'mirror',
    'blanket', 'pillow', 'towel', 'soap', 'fence', 'balcony', 'furniture', 'decoration',
    // Food
    'vegetable', 'tomato', 'potato', 'onion', 'salad', 'soup', 'pasta', 'butter', 'yogurt',
    'chocolate', 'ice cream', 'snack', 'recipe', 'taste', 'delicious', 'salty', 'sweet', 'sour',
    'breakfast', 'lunch', 'dinner', 'dessert', 'menu', 'order', 'restaurant', 'waiter',
    'grape', 'strawberry', 'watermelon', 'pepper', 'garlic', 'salmon', 'shrimp', 'beef', 'lamb', 'pork',
    // Health
    'headache', 'stomach', 'pain', 'medicine', 'sick', 'fever', 'cold', 'cough', 'blood', 'bone', 'skin',
    'exercise', 'healthy', 'diet',
    // Clothes
    'jacket', 'boots', 'jeans', 'trousers', 'scarf', 'gloves', 'socks', 'underwear', 'belt',
    'uniform', 'size', 'fashion', 'cotton',
    // Weather
    'storm', 'fog', 'temperature', 'degree', 'thunder', 'lightning', 'ice', 'season', 'spring', 'summer', 'autumn', 'winter',
    'rainbow', 'sunrise', 'sunset',
    // City
    'airport', 'station', 'museum', 'library', 'church', 'restaurant', 'hotel', 'cinema', 'theater',
    'square', 'corner', 'crossroad', 'traffic', 'parking', 'village', 'suburb',
    // Work
    'salary', 'meeting', 'company', 'manager', 'colleague', 'interview', 'career', 'business',
    'customer', 'employee', 'profession',
    // Emotions
    'excited', 'nervous', 'worried', 'surprised', 'bored', 'lonely', 'proud', 'shy', 'confident',
    'jealous', 'grateful', 'kind', 'polite', 'rude', 'honest', 'brave',
    // Tech
    'laptop', 'tablet', 'smartphone', 'wifi', 'website', 'password', 'download', 'upload', 'search',
    'message', 'online', 'offline', 'keyboard', 'mouse', 'save', 'delete', 'copy', 'paste',
    'account', 'login', 'logout', 'profile', 'notification',
    // Education
    'exam', 'homework', 'lesson', 'subject', 'science', 'history', 'math', 'geography',
    'university', 'college', 'grade', 'certificate',
    // Nature
    'forest', 'lake', 'beach', 'island', 'desert', 'hill', 'grass', 'leaf', 'seed', 'plant',
    'rabbit', 'horse', 'cow', 'sheep', 'snake', 'frog', 'nest', 'pond',
    'butterfly', 'bee', 'insect', 'turtle', 'parrot',
    // Sports
    'exercise', 'athlete', 'coach', 'match', 'score', 'champion', 'medal', 'trophy',
    'tennis', 'swimming', 'running', 'cycling', 'gym', 'practice', 'train',
    'volleyball', 'pool', 'track', 'fan',
    // Music
    'concert', 'band', 'album', 'rock', 'jazz', 'pop', 'classical', 'dance', 'ballet',
    'painting', 'gallery', 'museum', 'camera', 'photograph', 'ticket', 'festival',
    'headphones', 'volume', 'speaker', 'microphone', 'playlist',
    // Shopping
    'customer', 'receipt', 'discount', 'expensive', 'quality', 'brand', 'size',
    'try on', 'cash', 'credit card', 'change', 'refund',
    // Finance
    'money', 'bank', 'cash', 'price', 'pay', 'save', 'spend', 'cost', 'bill', 'coin',
    'salary', 'tax', 'budget', 'income', 'expense', 'cheap', 'expensive',
    // Law/Government
    'police', 'prison', 'crime', 'law', 'legal', 'illegal', 'fine', 'passport', 'visa', 'license',
    'government', 'president', 'vote', 'election',
    // Relationships
    'friend', 'friendship', 'invite', 'greeting', 'hug', 'celebrate', 'care', 'support',
    'apologize', 'forgive', 'argue', 'promise', 'community', 'culture', 'tradition',
    // Science
    'science', 'planet', 'moon', 'star', 'energy', 'temperature', 'experiment',
    // Senses
    'bright', 'dark', 'loud', 'quiet', 'soft', 'hard', 'rough', 'smooth', 'sharp', 'bitter',
    'blind', 'deaf', 'pain', 'comfortable', 'temperature'
]);

const B1_WORDS = new Set([
    // Family
    'relative', 'ancestor', 'generation', 'orphan', 'adopt', 'sibling', 'household', 'upbringing',
    // Home
    'basement', 'attic', 'chimney', 'doorbell', 'renovation', 'landlord', 'tenant', 'mortgage',
    'corridor', 'porch', 'shed', 'appliance', 'microwave', 'cabinet',
    // Food
    'ingredient', 'spicy', 'organic', 'vegetarian', 'vegan', 'portion', 'nutrition', 'appetite',
    'flavor', 'frozen', 'fresh', 'roast', 'grill', 'bake', 'boil', 'fry', 'stir', 'chop', 'slice', 'peel',
    'reservation', 'tip', 'seafood',
    // Health
    'symptom', 'treatment', 'surgeon', 'pharmacy', 'prescription', 'ambulance', 'emergency',
    'infection', 'allergy', 'injury', 'recover', 'diagnosis', 'therapy', 'mental',
    'muscle', 'strength', 'stamina', 'endurance',
    // Clothes
    'wardrobe', 'accessory', 'fabric', 'pattern', 'design', 'casual', 'formal', 'sleeve', 'collar',
    'outfit', 'vintage', 'laundry', 'iron', 'stain',
    // Weather
    'humidity', 'forecast', 'breeze', 'drizzle', 'hail', 'blizzard', 'drought', 'flood',
    'climate', 'atmosphere', 'celsius', 'fahrenheit',
    // City
    'pedestrian', 'avenue', 'monument', 'fountain', 'skyscraper', 'district', 'downtown',
    'suburb', 'intersection', 'boulevard', 'pavement', 'alley', 'infrastructure',
    // Work
    'deadline', 'promotion', 'resign', 'hire', 'contract', 'negotiate', 'conference',
    'entrepreneur', 'startup', 'shift', 'overtime', 'pension', 'retire',
    // Emotions
    'frustrated', 'anxious', 'overwhelmed', 'depressed', 'enthusiastic', 'nostalgic',
    'empathy', 'sympathy', 'generous', 'selfish', 'patient', 'stubborn',
    // Tech
    'software', 'hardware', 'install', 'update', 'virus', 'security', 'privacy', 'data',
    'cloud', 'storage', 'backup', 'connect', 'disconnect', 'restart', 'crash', 'bug',
    'social media', 'share', 'post', 'comment', 'follow', 'charger', 'battery', 'bluetooth', 'wireless',
    // Education
    'curriculum', 'scholarship', 'lecture', 'seminar', 'assignment', 'thesis', 'research',
    'laboratory', 'experiment', 'professor', 'dean', 'campus',
    // Nature
    'valley', 'cliff', 'waterfall', 'cave', 'soil', 'branch', 'root', 'bloom', 'harvest',
    'eagle', 'dolphin', 'whale', 'lion', 'tiger', 'elephant', 'fox', 'deer', 'owl', 'wolf',
    'habitat', 'ecosystem', 'wildlife', 'jungle',
    // Sports
    'competition', 'tournament', 'stadium', 'referee', 'foul', 'penalty', 'defeat', 'victory',
    'opponent', 'league', 'season', 'substitute', 'tactic', 'assist', 'sprint', 'marathon',
    'boxing', 'wrestling', 'skiing', 'surfing', 'climbing', 'hiking', 'warm up', 'stretch',
    'equipment', 'scoreboard', 'spectator', 'whistle',
    // Music
    'orchestra', 'melody', 'rhythm', 'lyrics', 'compose', 'composer', 'choir',
    'rehearsal', 'opera', 'creative', 'inspire', 'talent', 'masterpiece',
    'harmony', 'note', 'chord', 'tune', 'beat', 'solo', 'acoustic', 'studio', 'encore', 'record',
    'saxophone', 'trumpet', 'cello', 'harp', 'conductor', 'symphony', 'applause', 'duet',
    // Shopping
    'bargain', 'exchange', 'warranty', 'goods', 'purchase', 'consumer', 'retail',
    'wholesale', 'merchant', 'browse', 'delivery',
    // Finance
    'savings', 'deposit', 'withdraw', 'transfer', 'balance', 'loan', 'debt', 'interest',
    'investment', 'invest', 'profit', 'loss', 'insurance', 'currency', 'exchange rate',
    'afford', 'wealthy', 'poverty', 'commission', 'fee', 'transaction',
    // Law
    'lawyer', 'judge', 'court', 'arrest', 'evidence', 'witness', 'trial', 'verdict',
    'sentence', 'guilty', 'innocent', 'justice', 'freedom', 'democracy',
    'citizen', 'constitution', 'regulation', 'policy', 'reform', 'protest', 'ban', 'permit',
    'border', 'immigration',
    // Relationships
    'relationship', 'loyalty', 'betray', 'compromise', 'communicate', 'conversation',
    'compliment', 'acquaintance', 'colleague', 'empathy', 'gossip', 'cooperation', 'teamwork',
    'volunteer', 'society', 'charity', 'manner', 'custom',
    // Science
    'research', 'discovery', 'invention', 'theory', 'hypothesis', 'atom', 'molecule',
    'cell', 'biology', 'chemistry', 'physics', 'mathematics', 'formula', 'equation',
    'gravity', 'force', 'oxygen', 'carbon', 'data', 'analysis', 'observe', 'measure', 'calculate',
    'bacteria', 'virus', 'vaccine',
    // Senses
    'aroma', 'fragrance', 'stench', 'flavor', 'texture', 'sensation', 'perceive', 'detect',
    'vivid', 'faint', 'dim', 'glare', 'echo', 'vibration'
]);

const B2_WORDS = new Set([
    // Work
    'redundancy', 'appraisal', 'delegate', 'allocate', 'implement', 'initiative',
    'morale', 'bureaucracy', 'corporate', 'merger', 'acquisition', 'stakeholder',
    // Emotions
    'resentment', 'contempt', 'compassion', 'indifference', 'melancholy', 'euphoria',
    'vulnerable', 'resilient', 'impulsive', 'rational', 'pessimistic', 'optimistic',
    // Tech
    'algorithm', 'encryption', 'firewall', 'database', 'bandwidth', 'interface',
    'protocol', 'server', 'cache', 'debug', 'compile', 'deploy',
    // Education
    'dissertation', 'peer review', 'methodology', 'empirical', 'plagiarism', 'accreditation',
    // Nature
    'endangered', 'ecosystem', 'biodiversity', 'conservation', 'deforestation', 'erosion',
    'extinct', 'migration', 'predator', 'prey', 'coral reef', 'photosynthesis',
    'volcano', 'earthquake', 'swamp',
    // Finance
    'stock', 'share', 'revenue', 'dividend', 'asset', 'liability', 'capital',
    'shareholder', 'mortgage', 'inflation', 'recession', 'bankrupt', 'bankruptcy',
    'audit', 'accountant', 'forecast', 'portfolio', 'bond', 'subsidy', 'commodity',
    'cryptocurrency', 'negotiate',
    // Law
    'parliament', 'minister', 'constitution', 'amendment', 'legislation', 'prosecution',
    'corruption', 'authority', 'diplomat', 'treaty', 'sanction', 'refugee', 'welfare',
    'committee', 'campaign', 'mayor', 'council', 'territory', 'debate',
    // Science
    'DNA', 'gene', 'evolution', 'species', 'nuclear', 'radiation', 'satellite',
    'asteroid', 'orbit', 'astronaut', 'galaxy', 'universe', 'solar system',
    'microscope', 'telescope', 'phenomenon', 'magnetic', 'frequency', 'wavelength',
    'spectrum', 'fossil', 'geology', 'astronomy', 'conclusion', 'prove', 'method',
    'hydrogen', 'compound', 'reaction', 'velocity', 'pressure', 'mass',
    // Relationships
    'reunion', 'handshake', 'introduction', 'confident',
    // Home
    'insulation', 'ventilation', 'plumbing', 'fixture', 'renovation',
    // Health
    'rehabilitation', 'chronic', 'acute', 'immune', 'antibody', 'pathogen',
    // Sports
    'championship', 'halftime', 'dribble', 'dunk', 'serve', 'performance', 'record', 'endurance',
    'pitch', 'court', 'injury', 'warm-down',
    // Music
    'flute', 'violin', 'electric', 'genre',
    // Senses
    'perception', 'consciousness', 'stimulus', 'hypersensitive', 'threshold',
    // Shopping
    'e-commerce', 'logistics', 'supply chain', 'inventory', 'procurement'
]);

// Process all category files
const categoriesDir = path.join(__dirname, 'data', 'categories');
const files = fs.readdirSync(categoriesDir).filter(f => f.endsWith('.json') && f !== 'index.json');

let totalProcessed = 0;
let levelCounts = { a1: 0, a2: 0, b1: 0, b2: 0, c1: 0 };

files.forEach(file => {
    const filePath = path.join(categoriesDir, file);
    const words = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const updatedWords = words.map(w => {
        const wordLower = w.word.toLowerCase();
        let level;

        if (A1_WORDS.has(wordLower)) {
            level = 'a1';
        } else if (A2_WORDS.has(wordLower)) {
            level = 'a2';
        } else if (B1_WORDS.has(wordLower)) {
            level = 'b1';
        } else if (B2_WORDS.has(wordLower)) {
            level = 'b2';
        } else {
            // Default: estimate based on word length and common patterns
            // Short common words → A2, medium → B1, long/complex → B2/C1
            if (wordLower.length <= 4) level = 'a2';
            else if (wordLower.length <= 6) level = 'b1';
            else if (wordLower.length <= 9) level = 'b2';
            else level = 'c1';
        }

        levelCounts[level]++;
        totalProcessed++;

        return { ...w, level };
    });

    fs.writeFileSync(filePath, JSON.stringify(updatedWords, null, 4), 'utf8');
    console.log(`✅ ${file}: ${words.length} words processed`);
});

console.log(`\n📊 Total: ${totalProcessed} words processed`);
console.log('Level distribution:', levelCounts);
