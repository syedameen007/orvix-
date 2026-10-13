/**
 * ORVIX Reference Foods v1
 *
 * Typical, rounded values consistent with public references (USDA FoodData Central,
 * ICMR-NIN Indian Food Composition Tables) and common home-cooked recipes.
 * These are ESTIMATES for everyday tracking, not laboratory values and not a licensed dataset.
 * Packaged products vary by brand: users should prefer the pack label or a barcode scan.
 *
 * Every entry is checked by tests/seed-data.test.ts (energy consistency, units, duplicates).
 */

export type SeedUnit = "g" | "ml" | "piece" | "egg" | "chapati" | "slice" | "tbsp" | "tsp" | "cup" | "serving";
export type SeedState = "RAW" | "COOKED" | "PREPARED" | "PACKAGED";

export interface SeedFood {
  name: string;
  aliases: string[];
  category: string;
  state: SeedState;
  /** Serving that all nutrient values refer to, e.g. 100 g or 1 egg. */
  quantity: number;
  unit: SeedUnit;
  /** Required for non-mass units so grams can be converted. */
  gramWeight?: number;
  /** Required for cups/glasses of liquids so millilitres can be converted. */
  mlVolume?: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  /** 0-100 tie-breaker for search: how commonly people log this food. Default 50. */
  popularity: number;
}

type Macros = [kcal: number, protein: number, carbs: number, fat: number, fiber?: number];

/** Nutrients per 100 g. */
const g = (name: string, aliases: string[], category: string, state: SeedState, [kcal, p, c, f, fiber = 0]: Macros): SeedFood => ({
  name, aliases, category, state, quantity: 100, unit: "g", calories: kcal, proteinG: p, carbsG: c, fatG: f, fiberG: fiber, popularity: 50
});

/** Nutrients per 100 ml. */
const ml = (name: string, aliases: string[], category: string, state: SeedState, [kcal, p, c, f, fiber = 0]: Macros): SeedFood => ({
  name, aliases, category, state, quantity: 100, unit: "ml", calories: kcal, proteinG: p, carbsG: c, fatG: f, fiberG: fiber, popularity: 50
});

/** Nutrients per one countable unit weighing `grams`. */
const each = (name: string, aliases: string[], category: string, state: SeedState, unit: SeedUnit, grams: number, [kcal, p, c, f, fiber = 0]: Macros): SeedFood => ({
  name, aliases, category, state, quantity: 1, unit, gramWeight: grams, calories: kcal, proteinG: p, carbsG: c, fatG: f, fiberG: fiber, popularity: 50
});

/** Nutrients per one cup/glass of a drink of `volumeMl`. */
const cup = (name: string, aliases: string[], category: string, volumeMl: number, [kcal, p, c, f, fiber = 0]: Macros): SeedFood => ({
  name, aliases, category, state: "PREPARED", quantity: 1, unit: "cup", mlVolume: volumeMl, calories: kcal, proteinG: p, carbsG: c, fatG: f, fiberG: fiber, popularity: 50
});

const RAW_FOODS: SeedFood[] = [
  /* ---------- Grains, flours & cereals ---------- */
  g("Rice (cooked)", ["rice", "chawal", "bhaat", "steamed"], "grains", "COOKED", [130, 2.7, 28.2, 0.3, 0.4]),
  g("Brown Rice (cooked)", ["rice", "brown"], "grains", "COOKED", [112, 2.3, 23.5, 0.8, 1.8]),
  g("Basmati Rice (cooked)", ["rice", "basmati"], "grains", "COOKED", [121, 3.5, 25.2, 0.4, 0.4]),
  g("Quinoa (cooked)", ["quinoa"], "grains", "COOKED", [120, 4.4, 21.3, 1.9, 2.8]),
  g("Oats (rolled, dry)", ["oatmeal", "porridge"], "grains", "RAW", [389, 16.9, 66.3, 6.9, 10.6]),
  g("Oats Porridge (made with water)", ["oatmeal"], "grains", "PREPARED", [71, 2.5, 12, 1.5, 1.7]),
  g("Pasta (cooked)", ["pasta", "spaghetti", "macaroni"], "grains", "COOKED", [158, 5.8, 30.9, 0.9, 1.8]),
  g("Poha (dry flattened rice)", ["poha", "aval", "chivda"], "grains", "RAW", [346, 6.6, 77.3, 1.2, 2]),
  g("Poha (cooked with vegetables)", ["poha", "aval"], "south indian", "PREPARED", [130, 2.6, 24, 2.6, 1.5]),
  g("Semolina (rava, dry)", ["rava", "suji", "sooji"], "grains", "RAW", [360, 12.7, 72.8, 1.1, 3.9]),
  g("Upma", ["upma", "uppittu", "rava"], "south indian", "PREPARED", [150, 3.5, 22, 5.5, 2]),
  g("Whole Wheat Flour (atta)", ["atta", "flour", "wheat"], "grains", "RAW", [340, 12.1, 71.2, 1.7, 11.4]),
  g("Refined Flour (maida)", ["maida", "flour"], "grains", "RAW", [364, 10.3, 76.3, 1, 2.7]),
  g("Ragi Flour", ["ragi", "finger", "millet", "nachni"], "grains", "RAW", [328, 7.3, 72, 1.3, 11.5]),
  g("Gram Flour (besan)", ["besan", "chickpea", "flour"], "grains", "RAW", [387, 22.4, 57.8, 6.7, 10.8]),
  g("Cornflakes", ["cereal", "corn"], "grains", "PACKAGED", [357, 7.5, 84, 0.4, 3.3]),
  g("Muesli", ["cereal", "granola"], "grains", "PACKAGED", [340, 10, 66, 6, 8]),
  each("Whole Wheat Bread", ["bread", "toast", "brown"], "grains", "PACKAGED", "slice", 30, [76, 3.8, 12.8, 1.1, 1.8]),
  each("White Bread", ["bread", "toast"], "grains", "PACKAGED", "slice", 30, [80, 2.7, 14.7, 1, 0.8]),
  each("Pav (bread bun)", ["pav", "bun", "ladi"], "grains", "PACKAGED", "piece", 40, [110, 3.5, 20, 1.8, 1]),

  /* ---------- Indian breads ---------- */
  each("Chapati", ["roti", "phulka", "chapatti", "wheat"], "indian breads", "PREPARED", "chapati", 40, [120, 3.1, 18, 3.7, 2.6]),
  each("Phulka (no oil)", ["roti", "chapati", "dry"], "indian breads", "PREPARED", "chapati", 30, [85, 2.7, 17.5, 0.5, 2.1]),
  each("Plain Paratha", ["paratha", "parota"], "indian breads", "PREPARED", "piece", 80, [252, 5.6, 36, 9.5, 3.5]),
  each("Aloo Paratha", ["paratha", "aloo", "potato"], "indian breads", "PREPARED", "piece", 100, [290, 6, 42, 11, 3.5]),
  each("Naan", ["naan", "nan"], "indian breads", "PREPARED", "piece", 90, [261, 8.1, 45.4, 5.3, 2]),
  each("Puri", ["poori", "puri"], "indian breads", "PREPARED", "piece", 30, [100, 2, 13, 4.5, 1]),

  /* ---------- South Indian ---------- */
  each("Idli", ["idli", "idly"], "south indian", "PREPARED", "piece", 40, [59, 2, 12, 0.4, 0.6]),
  each("Plain Dosa", ["dosa", "dose"], "south indian", "PREPARED", "piece", 90, [130, 3, 23, 3, 1]),
  each("Masala Dosa", ["dosa", "masala", "dose"], "south indian", "PREPARED", "piece", 200, [273, 6, 42, 9, 3]),
  each("Uttapam", ["uttapam", "oothappam"], "south indian", "PREPARED", "piece", 120, [181, 5, 28, 5.5, 2]),
  each("Medu Vada", ["vada", "wada", "medu"], "south indian", "PREPARED", "piece", 45, [130, 4, 10, 8.5, 1.5]),
  g("Ven Pongal", ["pongal", "khara"], "south indian", "PREPARED", [145, 4, 22, 4.5, 1]),
  g("Bisi Bele Bath", ["bisibelebath"], "south indian", "PREPARED", [139, 4.5, 20, 4.5, 2]),
  g("Curd Rice", ["curd", "thayir", "sadam", "mosaranna"], "south indian", "PREPARED", [108, 3, 16, 3.5, 0.5]),
  g("Lemon Rice", ["lemon", "chitranna", "rice"], "south indian", "PREPARED", [149, 2.8, 25, 4.2, 0.8]),
  g("Sambar", ["sambar", "sambhar"], "south indian", "PREPARED", [57, 3, 8, 1.5, 2]),
  g("Rasam", ["rasam", "saaru"], "south indian", "PREPARED", [25, 1, 4, 0.6, 0.5]),
  g("Coconut Chutney", ["chutney", "coconut"], "south indian", "PREPARED", [199, 2.5, 9, 17, 4]),
  g("Ragi Mudde", ["ragi", "mudde", "kali", "sangati"], "south indian", "PREPARED", [110, 2.6, 25, 0.5, 3]),

  /* ---------- Rice dishes ---------- */
  g("Vegetable Biryani", ["biryani", "veg"], "rice dishes", "PREPARED", [150, 3.5, 24, 4.5, 1.5]),
  g("Chicken Biryani", ["biryani", "chicken"], "rice dishes", "PREPARED", [160, 9, 20, 5, 1]),
  g("Mutton Biryani", ["biryani", "mutton", "lamb"], "rice dishes", "PREPARED", [177, 9, 20, 7, 1]),
  g("Vegetable Pulao", ["pulao", "pulav", "veg"], "rice dishes", "PREPARED", [140, 3, 24, 3.5, 1.5]),
  g("Jeera Rice", ["jeera", "cumin", "rice"], "rice dishes", "PREPARED", [150, 2.8, 26, 3.8, 0.5]),
  g("Vegetable Fried Rice", ["fried", "rice", "veg"], "rice dishes", "PREPARED", [150, 3.5, 25, 4, 1]),
  g("Khichdi", ["khichdi", "kichadi"], "rice dishes", "PREPARED", [100, 3.5, 16, 2.5, 1.5]),

  /* ---------- Dals, legumes & plant protein ---------- */
  g("Toor Dal (cooked)", ["dal", "toor", "arhar", "tuvar"], "dals & legumes", "COOKED", [105, 6.2, 17, 1.3, 4]),
  g("Moong Dal (cooked)", ["dal", "moong", "mung"], "dals & legumes", "COOKED", [105, 7, 19.2, 0.4, 7.6]),
  g("Masoor Dal (cooked)", ["dal", "masoor", "lentils"], "dals & legumes", "COOKED", [116, 9, 20.1, 0.4, 7.9]),
  g("Chickpeas (boiled)", ["chana", "chole", "kabuli", "garbanzo"], "dals & legumes", "COOKED", [164, 8.9, 27.4, 2.6, 7.6]),
  g("Kidney Beans (boiled)", ["rajma", "beans"], "dals & legumes", "COOKED", [127, 8.7, 22.8, 0.5, 6.4]),
  g("Dal Tadka", ["dal", "tadka", "lentils"], "dals & legumes", "PREPARED", [110, 5.8, 16.1, 2.8, 4.2]),
  g("Dal Makhani", ["dal", "makhani", "urad"], "dals & legumes", "PREPARED", [140, 6, 13, 7, 3.5]),
  g("Rajma Masala", ["rajma", "curry"], "dals & legumes", "PREPARED", [122, 5.5, 15, 4.5, 4.5]),
  g("Chole Masala", ["chole", "chana", "masala"], "dals & legumes", "PREPARED", [151, 6.5, 20, 5, 5.5]),
  g("Moong Sprouts (raw)", ["sprouts", "moong"], "dals & legumes", "RAW", [30, 3, 5.9, 0.2, 1.8]),
  g("Roasted Chana", ["chana", "roasted", "bhuna"], "dals & legumes", "PACKAGED", [364, 19, 58, 5.6, 17]),
  g("Hummus", ["hummus", "chickpea"], "dals & legumes", "PREPARED", [166, 7.9, 14.3, 9.6, 6]),
  g("Soya Chunks (dry)", ["soya", "soy", "nuggets", "meal"], "dals & legumes", "PACKAGED", [345, 52, 33, 0.5, 13]),
  g("Tofu", ["tofu", "soy"], "dals & legumes", "PACKAGED", [76, 8, 1.9, 4.8, 0.3]),

  /* ---------- Curries & sabzi ---------- */
  g("Paneer", ["paneer"], "dairy", "PACKAGED", [296, 18.3, 1.2, 22, 0]),
  g("Paneer Butter Masala", ["paneer", "butter", "masala"], "curries", "PREPARED", [200, 8, 8, 15.5, 1.5]),
  g("Palak Paneer", ["palak", "paneer", "spinach"], "curries", "PREPARED", [141, 6.5, 5, 11, 2]),
  g("Aloo Gobi", ["aloo", "gobi", "potato", "cauliflower"], "curries", "PREPARED", [98, 2.2, 11, 5, 2.5]),
  g("Aloo Sabzi (dry potato curry)", ["aloo", "sabzi", "potato"], "curries", "PREPARED", [110, 2, 16, 4.5, 2]),
  g("Mixed Vegetable Curry", ["sabzi", "veg", "curry"], "curries", "PREPARED", [90, 2.5, 10, 4.5, 2.5]),
  g("Bhindi Masala", ["bhindi", "okra", "ladyfinger"], "curries", "PREPARED", [110, 2.5, 10, 7, 3.5]),
  g("Baingan Bharta", ["baingan", "brinjal", "eggplant", "bharta"], "curries", "PREPARED", [90, 2, 8, 6, 3]),
  g("Egg Curry", ["egg", "anda", "curry"], "curries", "PREPARED", [130, 7, 4, 9.5, 0.8]),
  g("Chicken Curry", ["chicken", "curry", "murgh"], "curries", "PREPARED", [140, 12, 4, 8.5, 0.8]),
  g("Butter Chicken", ["chicken", "butter", "makhani"], "curries", "PREPARED", [150, 10, 6, 10, 0.8]),
  g("Tandoori Chicken", ["chicken", "tandoori", "tikka"], "curries", "PREPARED", [150, 20, 3, 6.5, 0.5]),
  g("Mutton Curry", ["mutton", "lamb", "curry", "gosht"], "curries", "PREPARED", [150, 12, 4, 9.5, 0.8]),
  g("Fish Curry", ["fish", "curry", "meen"], "curries", "PREPARED", [118, 11, 4, 6.5, 0.5]),
  g("Pav Bhaji", ["bhaji", "pav"], "curries", "PREPARED", [132, 3, 18, 6, 3]),

  /* ---------- Snacks & street food ---------- */
  each("Vada Pav", ["vada", "pav", "wada"], "snacks", "PREPARED", "piece", 120, [290, 6, 38, 12.5, 2.5]),
  each("Samosa", ["samosa"], "snacks", "PREPARED", "piece", 60, [160, 3, 17, 9, 1.5]),
  g("Pakora (fritters)", ["pakora", "bhajji", "bajji", "bhaji"], "snacks", "PREPARED", [297, 8, 28, 17, 4]),
  g("Potato Chips", ["chips", "crisps", "wafers"], "snacks", "PACKAGED", [536, 7, 53, 35, 4]),
  g("Popcorn (plain)", ["popcorn"], "snacks", "PREPARED", [387, 12.9, 77.8, 4.5, 14.5]),
  g("Makhana (fox nuts)", ["makhana", "lotus", "foxnut"], "snacks", "RAW", [347, 9.7, 76.9, 0.1, 14.5]),
  each("Veg Momo (steamed)", ["momo", "momos", "dumpling"], "snacks", "PREPARED", "piece", 25, [39, 1.2, 6.5, 1, 0.5]),
  each("Chicken Momo (steamed)", ["momo", "momos", "dumpling"], "snacks", "PREPARED", "piece", 30, [50, 3.5, 5.5, 1.6, 0.3]),
  each("Marie Biscuit", ["biscuit", "cookie", "marie"], "snacks", "PACKAGED", "piece", 7, [30, 0.5, 5, 0.8, 0.2]),
  each("Digestive Biscuit", ["biscuit", "cookie", "digestive"], "snacks", "PACKAGED", "piece", 15, [70, 1, 10, 3, 0.6]),

  /* ---------- Sweets & desserts ---------- */
  each("Gulab Jamun", ["gulab", "jamun", "sweet"], "sweets", "PREPARED", "piece", 40, [150, 2, 22, 6, 0.2]),
  each("Rasgulla", ["rasgulla", "rosogolla", "sweet"], "sweets", "PREPARED", "piece", 40, [105, 3, 20, 1.5, 0]),
  each("Besan Ladoo", ["ladoo", "laddu", "besan", "sweet"], "sweets", "PREPARED", "piece", 40, [195, 3.5, 24, 9.5, 1.5]),
  g("Kheer (rice pudding)", ["kheer", "payasam", "pudding"], "sweets", "PREPARED", [130, 3.5, 20, 4, 0.3]),
  g("Ice Cream (vanilla)", ["icecream", "ice", "cream", "dessert"], "sweets", "PACKAGED", [207, 3.5, 23.6, 11, 0.7]),
  g("Chocolate (dark, 70%)", ["chocolate", "dark", "cocoa"], "sweets", "PACKAGED", [598, 7.8, 45.9, 42.6, 10.9]),
  g("Chocolate (milk)", ["chocolate", "milk"], "sweets", "PACKAGED", [535, 7.7, 59.4, 29.7, 3.4]),
  g("Jaggery", ["jaggery", "gur", "bellam", "vellam"], "sweets", "RAW", [383, 0.4, 98, 0.1, 0]),

  /* ---------- Dairy ---------- */
  ml("Milk (whole)", ["milk", "doodh", "full", "cream"], "dairy", "PACKAGED", [61, 3.2, 4.8, 3.3]),
  ml("Milk (toned)", ["milk", "doodh", "toned"], "dairy", "PACKAGED", [58, 3.1, 4.8, 3]),
  ml("Milk (double toned)", ["milk", "doodh", "double"], "dairy", "PACKAGED", [45, 3, 4.7, 1.5]),
  ml("Milk (skimmed)", ["milk", "skim", "fat", "free"], "dairy", "PACKAGED", [34, 3.4, 5, 0.1]),
  ml("Milk (buffalo)", ["milk", "buffalo", "doodh"], "dairy", "PACKAGED", [97, 3.8, 5.2, 6.9]),
  g("Curd (dahi)", ["dahi", "curd", "yogurt", "yoghurt", "thayir", "mosaru"], "dairy", "PREPARED", [62, 3.5, 4.7, 3.3]),
  g("Greek Yogurt (low-fat)", ["yogurt", "yoghurt", "greek"], "dairy", "PACKAGED", [59, 10.2, 3.6, 0.4]),
  ml("Buttermilk (chaas)", ["chaas", "buttermilk", "majjige", "mor"], "dairy", "PREPARED", [40, 3.3, 4.8, 0.9]),
  ml("Sweet Lassi", ["lassi"], "beverages", "PREPARED", [73, 3, 12, 1.5]),
  g("Cottage Cheese (low-fat)", ["cottage", "cheese"], "dairy", "PACKAGED", [98, 11.1, 3.4, 4.3]),
  g("Cheddar Cheese", ["cheese", "cheddar"], "dairy", "PACKAGED", [403, 24.9, 1.3, 33.1]),
  g("Mozzarella Cheese", ["cheese", "mozzarella", "pizza"], "dairy", "PACKAGED", [280, 28, 3.1, 17]),
  each("Cheese Slice (processed)", ["cheese", "slice"], "dairy", "PACKAGED", "slice", 20, [62, 3.6, 0.8, 5]),
  each("Ghee", ["ghee", "clarified", "butter"], "oils & fats", "PACKAGED", "tsp", 5, [45, 0, 0, 5]),
  each("Butter", ["butter", "makhan"], "oils & fats", "PACKAGED", "tbsp", 14, [100, 0.1, 0, 11.4]),
  each("Whey Protein Powder (1 scoop)", ["whey", "protein", "powder", "shake", "scoop"], "protein", "PACKAGED", "serving", 30, [120, 24, 3, 1.5, 0.5]),

  /* ---------- Eggs ---------- */
  each("Egg (whole, raw)", ["egg", "eggs", "anda"], "eggs", "RAW", "egg", 50, [72, 6.3, 0.4, 4.8]),
  each("Egg (boiled)", ["egg", "eggs", "anda", "hard"], "eggs", "COOKED", "egg", 50, [78, 6.3, 0.6, 5.3]),
  each("Egg White", ["egg", "white", "eggs"], "eggs", "RAW", "egg", 33, [17, 3.6, 0.2, 0.1]),
  each("Egg (fried)", ["egg", "fried", "sunny", "omelette"], "eggs", "COOKED", "egg", 55, [90, 6.3, 0.4, 7]),
  each("Omelette (2 eggs)", ["omelette", "omelet"], "eggs", "PREPARED", "serving", 120, [189, 12.5, 1, 15]),
  g("Egg Bhurji (scrambled)", ["bhurji", "scrambled", "egg", "anda"], "eggs", "PREPARED", [160, 10, 3, 12]),

  /* ---------- Poultry, meat & seafood ---------- */
  g("Chicken Breast (cooked)", ["chicken", "breast", "murgh"], "protein", "COOKED", [165, 31, 0, 3.6]),
  g("Chicken Thigh (cooked)", ["chicken", "thigh", "leg"], "protein", "COOKED", [209, 26, 0, 10.9]),
  g("Mutton (cooked)", ["mutton", "lamb", "goat", "gosht"], "protein", "COOKED", [258, 25.6, 0, 16.5]),
  g("Beef (cooked)", ["beef", "steak"], "protein", "COOKED", [250, 26, 0, 15]),
  g("Salmon (cooked)", ["salmon", "fish"], "seafood", "COOKED", [206, 22.1, 0, 12.4]),
  g("Tuna (canned in water)", ["tuna", "fish", "canned"], "seafood", "PACKAGED", [116, 25.5, 0, 0.8]),
  g("White Fish (cooked)", ["fish", "tilapia", "basa", "cod", "meen"], "seafood", "COOKED", [128, 26.2, 0, 2.7]),
  g("Prawns (cooked)", ["prawns", "shrimp", "seafood"], "seafood", "COOKED", [99, 24, 0.2, 0.3]),

  /* ---------- Vegetables ---------- */
  g("Potato (boiled)", ["potato", "aloo", "batata"], "vegetables", "COOKED", [87, 1.9, 20.1, 0.1, 1.8]),
  g("Sweet Potato (baked)", ["sweet", "potato", "shakarkandi"], "vegetables", "COOKED", [90, 2, 20.7, 0.2, 3.3]),
  g("Onion", ["onion", "pyaz", "eerulli"], "vegetables", "RAW", [40, 1.1, 9.3, 0.1, 1.7]),
  g("Tomato", ["tomato", "tamatar"], "vegetables", "RAW", [18, 0.9, 3.9, 0.2, 1.2]),
  g("Cucumber", ["cucumber", "kheera", "salad"], "vegetables", "RAW", [15, 0.7, 3.6, 0.1, 0.5]),
  g("Carrot", ["carrot", "gajar"], "vegetables", "RAW", [41, 0.9, 9.6, 0.2, 2.8]),
  g("Spinach", ["spinach", "palak", "greens"], "vegetables", "RAW", [23, 2.9, 3.6, 0.4, 2.2]),
  g("Cauliflower", ["cauliflower", "gobi", "phool"], "vegetables", "RAW", [25, 1.9, 5, 0.3, 2]),
  g("Broccoli", ["broccoli"], "vegetables", "RAW", [34, 2.8, 6.6, 0.4, 2.6]),
  g("Cabbage", ["cabbage", "patta", "kosu"], "vegetables", "RAW", [25, 1.3, 5.8, 0.1, 2.5]),
  g("Okra (bhindi)", ["okra", "bhindi", "ladyfinger"], "vegetables", "RAW", [33, 1.9, 7.5, 0.2, 3.2]),
  g("Brinjal (eggplant)", ["brinjal", "baingan", "eggplant", "badanekai"], "vegetables", "RAW", [25, 1, 5.9, 0.2, 3]),
  g("Capsicum (bell pepper)", ["capsicum", "pepper", "shimla", "bell"], "vegetables", "RAW", [20, 0.9, 4.6, 0.2, 1.7]),
  g("Green Peas", ["peas", "matar", "batani"], "vegetables", "RAW", [81, 5.4, 14.5, 0.4, 5.7]),
  g("Green Beans", ["beans", "french", "green"], "vegetables", "RAW", [31, 1.8, 7, 0.2, 2.7]),
  g("Bottle Gourd (lauki)", ["lauki", "dudhi", "gourd", "sorekai"], "vegetables", "RAW", [14, 0.6, 3.4, 0, 0.5]),
  g("Bitter Gourd (karela)", ["karela", "gourd", "bitter", "hagalakai"], "vegetables", "RAW", [17, 1, 3.7, 0.2, 2.8]),
  g("Pumpkin", ["pumpkin", "kaddu", "kumbalakai"], "vegetables", "RAW", [26, 1, 6.5, 0.1, 0.5]),
  g("Beetroot", ["beetroot", "beet", "chukandar"], "vegetables", "RAW", [43, 1.6, 9.6, 0.2, 2.8]),
  g("Mushrooms", ["mushroom", "button"], "vegetables", "RAW", [22, 3.1, 3.3, 0.3, 1]),
  g("Sweet Corn (boiled)", ["corn", "sweetcorn", "bhutta"], "vegetables", "COOKED", [96, 3.4, 21, 1.5, 2.4]),
  g("Lettuce", ["lettuce", "salad"], "vegetables", "RAW", [15, 1.4, 2.9, 0.2, 1.3]),
  g("Garlic", ["garlic", "lasun", "bellulli"], "vegetables", "RAW", [149, 6.4, 33, 0.5, 2.1]),
  g("Ginger", ["ginger", "adrak", "shunthi"], "vegetables", "RAW", [80, 1.8, 17.8, 0.8, 2]),
  g("Green Chilli", ["chilli", "chili", "mirchi"], "vegetables", "RAW", [40, 2, 9.5, 0.2, 1.5]),
  g("Coriander Leaves", ["coriander", "cilantro", "dhania"], "vegetables", "RAW", [23, 2.1, 3.7, 0.5, 2.8]),
  g("Drumstick (moringa pods)", ["drumstick", "moringa", "saragvo", "nuggekai"], "vegetables", "RAW", [37, 2.1, 8.5, 0.2, 3.2]),

  /* ---------- Fruits ---------- */
  g("Apple", ["apple", "seb"], "fruits", "RAW", [52, 0.3, 13.8, 0.2, 2.4]),
  g("Banana", ["banana", "kela", "bale"], "fruits", "RAW", [89, 1.1, 22.8, 0.3, 2.6]),
  each("Banana (1 medium)", ["banana", "kela", "bale"], "fruits", "RAW", "piece", 118, [105, 1.3, 27, 0.4, 3.1]),
  g("Orange", ["orange", "santra", "citrus"], "fruits", "RAW", [47, 0.9, 11.8, 0.1, 2.4]),
  g("Mango", ["mango", "aam"], "fruits", "RAW", [60, 0.8, 15, 0.4, 1.6]),
  g("Papaya", ["papaya", "papita"], "fruits", "RAW", [43, 0.5, 11, 0.3, 1.7]),
  g("Watermelon", ["watermelon", "tarbooz"], "fruits", "RAW", [30, 0.6, 7.6, 0.2, 0.4]),
  g("Grapes", ["grapes", "angoor"], "fruits", "RAW", [69, 0.7, 18.1, 0.2, 0.9]),
  g("Pomegranate", ["pomegranate", "anar", "dalimbe"], "fruits", "RAW", [83, 1.7, 18.7, 1.2, 4]),
  g("Guava", ["guava", "amrood", "peru"], "fruits", "RAW", [68, 2.6, 14.3, 1, 5.4]),
  g("Pineapple", ["pineapple", "ananas"], "fruits", "RAW", [50, 0.5, 13.1, 0.1, 1.4]),
  g("Strawberries", ["strawberry", "berries"], "fruits", "RAW", [32, 0.7, 7.7, 0.3, 2]),
  g("Blueberries", ["blueberry", "berries"], "fruits", "RAW", [57, 0.7, 14.5, 0.3, 2.4]),
  g("Kiwi", ["kiwi"], "fruits", "RAW", [61, 1.1, 14.7, 0.5, 3]),
  g("Pear", ["pear", "nashpati"], "fruits", "RAW", [57, 0.4, 15.2, 0.1, 3.1]),
  g("Sapota (chikoo)", ["chikoo", "chiku", "sapota", "sapodilla"], "fruits", "RAW", [83, 0.4, 20, 1.1, 5.3]),
  g("Jackfruit", ["jackfruit", "kathal", "halasu"], "fruits", "RAW", [95, 1.7, 23.3, 0.6, 1.5]),
  g("Avocado", ["avocado"], "fruits", "RAW", [160, 2, 8.5, 14.7, 6.7]),
  g("Fresh Coconut", ["coconut", "nariyal", "thengai"], "fruits", "RAW", [354, 3.3, 15.2, 33.5, 9]),
  g("Dates (dried)", ["dates", "khajoor"], "fruits", "PACKAGED", [282, 2.5, 75, 0.4, 8]),
  g("Raisins", ["raisins", "kishmish", "draksha"], "fruits", "PACKAGED", [299, 3.1, 79.2, 0.5, 3.7]),

  /* ---------- Nuts, seeds & spreads ---------- */
  g("Almonds", ["almonds", "badam", "nuts"], "nuts & seeds", "RAW", [579, 21.2, 21.6, 49.9, 12.5]),
  g("Walnuts", ["walnuts", "akhrot", "nuts"], "nuts & seeds", "RAW", [654, 15.2, 13.7, 65.2, 6.7]),
  g("Cashews", ["cashews", "kaju", "nuts"], "nuts & seeds", "RAW", [553, 18.2, 30.2, 43.9, 3.3]),
  g("Peanuts", ["peanuts", "groundnut", "moongphali", "nuts"], "nuts & seeds", "RAW", [567, 25.8, 16.1, 49.2, 8.5]),
  g("Pistachios", ["pistachios", "pista", "nuts"], "nuts & seeds", "RAW", [560, 20.2, 27.2, 45.3, 10.6]),
  g("Chia Seeds", ["chia", "seeds"], "nuts & seeds", "RAW", [486, 16.5, 42.1, 30.7, 34.4]),
  g("Flax Seeds", ["flax", "flaxseed", "alsi", "seeds"], "nuts & seeds", "RAW", [534, 18.3, 28.9, 42.2, 27.3]),
  g("Pumpkin Seeds", ["pumpkin", "seeds", "pepitas"], "nuts & seeds", "RAW", [559, 30.2, 10.7, 49, 6]),
  g("Sunflower Seeds", ["sunflower", "seeds"], "nuts & seeds", "RAW", [584, 20.8, 20, 51.5, 8.6]),
  g("Sesame Seeds", ["sesame", "til", "seeds"], "nuts & seeds", "RAW", [573, 17.7, 23.5, 49.7, 11.8]),
  g("Peanut Butter", ["peanut", "butter", "spread"], "nuts & seeds", "PACKAGED", [588, 25, 20, 50, 6]),

  /* ---------- Oils, sweeteners & condiments ---------- */
  each("Cooking Oil", ["oil", "sunflower", "refined", "tel"], "oils & fats", "PACKAGED", "tbsp", 14, [124, 0, 0, 14]),
  each("Olive Oil", ["oil", "olive"], "oils & fats", "PACKAGED", "tbsp", 14, [119, 0, 0, 13.5]),
  each("Coconut Oil", ["oil", "coconut"], "oils & fats", "PACKAGED", "tbsp", 14, [121, 0, 0, 13.5]),
  each("Sugar", ["sugar", "chini", "sakkare"], "sweets", "PACKAGED", "tsp", 4, [16, 0, 4, 0]),
  each("Honey", ["honey", "shahad", "jenu"], "sweets", "PACKAGED", "tbsp", 21, [64, 0.1, 17.3, 0]),
  each("Tomato Ketchup", ["ketchup", "sauce", "tomato"], "condiments", "PACKAGED", "tbsp", 17, [17, 0.2, 4.5, 0, 0.1]),
  each("Mayonnaise", ["mayo", "mayonnaise"], "condiments", "PACKAGED", "tbsp", 14, [94, 0.1, 0.1, 10.3]),

  /* ---------- Beverages ---------- */
  cup("Tea with Milk and Sugar", ["chai", "tea"], "beverages", 150, [70, 1.5, 10.5, 2.5]),
  cup("Black Coffee", ["coffee", "americano"], "beverages", 240, [2, 0.3, 0, 0]),
  cup("Coffee with Milk and Sugar", ["coffee", "filter", "latte"], "beverages", 150, [75, 2, 10, 3]),
  ml("Orange Juice", ["juice", "orange"], "beverages", "PACKAGED", [45, 0.7, 10.4, 0.2, 0.2]),
  ml("Cola", ["cola", "soda", "coke", "pepsi", "soft", "drink"], "beverages", "PACKAGED", [42, 0, 10.6, 0]),
  ml("Coconut Water", ["coconut", "water", "elaneer", "tender"], "beverages", "RAW", [19, 0.7, 3.7, 0.2, 1.1]),

  /* ---------- Fast food ---------- */
  each("Pizza Slice (cheese)", ["pizza", "slice"], "fast food", "PREPARED", "slice", 107, [285, 12, 36, 10, 2.5]),
  each("Cheeseburger", ["burger", "cheeseburger"], "fast food", "PREPARED", "piece", 120, [300, 15, 30, 14, 1.5]),
  g("French Fries", ["fries", "chips", "potato"], "fast food", "PREPARED", [312, 3.4, 41, 15, 3.8])
];

/**
 * How commonly each food is logged, used only to break search-ranking ties
 * (so "rice" shows plain rice before biryani). Everything unlisted defaults to 50.
 */
export const POPULARITY: Record<string, number> = {
  "Rice (cooked)": 100, "Chapati": 88, "Dal Tadka": 95, "Toor Dal (cooked)": 85, "Curd (dahi)": 100, "Egg (boiled)": 98, "Egg (whole, raw)": 90,
  "Omelette (2 eggs)": 85, "Chicken Breast (cooked)": 96, "Chicken Curry": 80, "Chicken Biryani": 80, "Idli": 95, "Plain Dosa": 90, "Masala Dosa": 90,
  "Sambar": 88, "Paneer": 94, "Milk (toned)": 98, "Milk (whole)": 96, "Milk (double toned)": 85, "Banana": 97, "Banana (1 medium)": 92, "Apple": 95,
  "Oats (rolled, dry)": 90, "Whey Protein Powder (1 scoop)": 88, "Tea with Milk and Sugar": 98, "Coffee with Milk and Sugar": 90, "Black Coffee": 80,
  "White Bread": 91, "Whole Wheat Bread": 92, "Peanut Butter": 80, "Almonds": 88, "Potato (boiled)": 85, "Onion": 80, "Tomato": 82,
  "Salmon (cooked)": 72, "Tuna (canned in water)": 68, "White Fish (cooked)": 70, "Mango": 85, "Papaya": 72, "Orange": 82, "Spinach": 78,
  "Samosa": 80, "Vada Pav": 78, "Medu Vada": 80, "Upma": 85, "Poha (cooked with vegetables)": 88, "Plain Paratha": 85, "Aloo Paratha": 85,
  "Ghee": 90, "Cooking Oil": 85, "Sugar": 85, "Buttermilk (chaas)": 80, "Sweet Lassi": 70, "Greek Yogurt (low-fat)": 78, "Moong Dal (cooked)": 80,
  "Chole Masala": 82, "Rajma Masala": 82, "Chickpeas (boiled)": 78, "Soya Chunks (dry)": 80, "Egg Bhurji (scrambled)": 75, "Vegetable Biryani": 75,
  "Curd Rice": 80, "Khichdi": 80, "Ragi Mudde": 75, "Pav Bhaji": 76, "Pizza Slice (cheese)": 72, "French Fries": 70, "Cola": 70
};

const normalizeText = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Final catalog: aliases that merely repeat a word already in the food's name are dropped
 * (the name already matches, and a duplicate alias would let side-dishes tie with the staple),
 * and curated popularity is applied.
 */
export const REFERENCE_FOODS: SeedFood[] = RAW_FOODS.map((food) => {
  const nameWords = new Set(normalizeText(food.name).split(" "));
  return {
    ...food,
    aliases: food.aliases.filter((alias) => !nameWords.has(alias)),
    popularity: POPULARITY[food.name] ?? food.popularity
  };
});
