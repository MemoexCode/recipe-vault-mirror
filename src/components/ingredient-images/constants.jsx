
import { InvokeLLM } from "@/api/integrations";

/**
 * INTELLIGENT TRANSLATION + CONTEXT RECOGNITION
 * Combines translation and context analysis in ONE LLM call
 */
export const translateAndAnalyze = async (ingredientName) => {
  if (!ingredientName || ingredientName.trim() === "") {
    throw new Error("Ingredient name cannot be empty");
  }

  try {
    const prompt = `Analyze and translate the following ingredient for professional food photography.

**Ingredient:** "${ingredientName}"

**Tasks:**
1. Translate to English (if necessary)
2. Identify the ingredient type
3. Determine the best visual presentation

**Ingredient Types:**
- "raw_ingredient": Raw, unprocessed ingredient (vegetables, fruits, raw meat, etc.)
- "beverage": Drink, juice, liquid
- "processed_food": Processed product (flour, sugar, spices, etc.)
- "packaged_product": Packaged product (milk, yogurt, canned goods, etc.)
- "prepared_item": Prepared element (ground meat, dough, etc.)

**Examples:**
- "Tomate" → {"english": "tomato", "type": "raw_ingredient", "presentation": "isolated whole"}
- "Orangensaft" → {"english": "orange juice", "type": "beverage", "presentation": "in a clear glass"}
- "Rinderhackfleisch" → {"english": "minced beef", "type": "prepared_item", "presentation": "as a fresh mound"}
- "Mehl" → {"english": "flour", "type": "processed_food", "presentation": "in a pile"}
- "Coca Cola" → {"english": "coca cola", "type": "beverage", "presentation": "bottle or glass"}
- "Limonade" → {"english": "lemonade", "type": "beverage", "presentation": "in a glass with ice"}
- "Milch" → {"english": "milk", "type": "packaged_product", "presentation": "in a glass or carton"}

Return ONLY the JSON, without additional explanations.`;

    const response = await InvokeLLM({
      prompt,
      add_context_from_internet: false,
      response_json_schema: {
        type: "object",
        properties: {
          english: {
            type: "string",
            description: "English translation of the ingredient"
          },
          type: {
            type: "string",
            enum: ["raw_ingredient", "beverage", "processed_food", "packaged_product", "prepared_item"],
            description: "Type of ingredient"
          },
          presentation: {
            type: "string",
            description: "Recommended visual presentation"
          }
        },
        required: ["english", "type", "presentation"]
      }
    });

    return {
      english: response.english.trim(),
      type: response.type,
      presentation: response.presentation.trim()
    };
  } catch (err) {
    console.error("Translation and analysis error:", err);
    // Fallback: Simple translation without context
    return {
      english: ingredientName,
      type: "raw_ingredient",
      presentation: "isolated whole"
    };
  }
};

/**
 * CONTEXT-AWARE PROMPT GENERATOR - ENGLISH VERSION
 * Creates the perfect prompt based on ingredient type
 */
export const generateIngredientPrompt = async (ingredientName) => {
  // Analyze and translate the ingredient
  const analysis = await translateAndAnalyze(ingredientName);
  
  // Base prompt elements
  const baseElements = {
    background: "isolated on pure white background",
    lighting: "studio lighting, sharp focus",
    quality: "professional food photography"
  };

  // Type-specific prompts
  let specificPrompt = "";
  
  switch (analysis.type) {
    case "beverage":
      specificPrompt = `${analysis.english}, ${analysis.presentation}, refreshing, ${baseElements.background}, ${baseElements.lighting}, ${baseElements.quality}`;
      break;
      
    case "processed_food":
      specificPrompt = `${analysis.english}, ${analysis.presentation}, ${baseElements.background}, centered, ${baseElements.lighting}, ${baseElements.quality}`;
      break;
      
    case "packaged_product":
      specificPrompt = `${analysis.english}, ${analysis.presentation}, ${baseElements.background}, centered, ${baseElements.lighting}, ${baseElements.quality}`;
      break;
      
    case "prepared_item":
      specificPrompt = `${analysis.english}, raw, ${analysis.presentation}, ${baseElements.background}, centered, ${baseElements.lighting}, ${baseElements.quality}`;
      break;
      
    case "raw_ingredient":
    default:
      specificPrompt = `${analysis.english}, raw food ingredient, ${analysis.presentation}, ${baseElements.background}, centered, complete object visible, no cropping, no props, no decorations, ${baseElements.lighting}, ${baseElements.quality}`;
      break;
  }

  return specificPrompt;
};

// Basis-Zutaten (20)
export const BASIC_INGREDIENTS = [
  "cherry-tomaten",
  "zwiebeln",
  "knoblauch",
  "kartoffeln",
  "karotten",
  "äpfel",
  "zitronen",
  "milch",
  "eier",
  "weizenmehl",
  "weißer zucker",
  "salz",
  "butter",
  "olivenöl",
  "basmatireis",
  "spaghetti",
  "hühnerbrust",
  "rinderhackfleisch",
  "geschälte mandeln",
  "basilikum"
];

// Erweiterte Bibliothek (200+ mit allen Varianten)
export const EXTENDED_INGREDIENTS = {
  gemüse: [
    // Tomaten
    "tomate", "tomaten", "cherry-tomaten", "cherrytomaten", "cherry tomaten",
    "cocktailtomaten", "cocktail-tomaten", "rispentomaten", "rispen-tomaten",
    "strauchtomaten", "strauch-tomaten", "roma-tomaten", "romatomaten",
    
    // Gurken & Zucchini
    "gurke", "gurken", "salatgurke", "salatgurken", "schlangengurke", "schlangengurken",
    "zucchini", "zucchinis",
    
    // Paprika
    "paprika", "paprikas", "paprikaschote", "paprikaschoten", "spitzpaprika",
    "rote paprika", "gelbe paprika", "grüne paprika",
    
    // Aubergine
    "aubergine", "auberginen", "melanzani",
    
    // Kohl & Brokkoli
    "brokkoli", "brokoli", "blumenkohl", "rosenkohl", "weißkohl", "rotkohl",
    "spitzkohl", "wirsing", "chinakohl",
    
    // Blattgemüse
    "spinat", "blattspinat", "rucola", "rukola", "rauke", "feldsalat",
    "eisbergsalat", "kopfsalat", "römersalat", "lollo rosso", "lollo bianco",
    
    // Sellerie & Lauch
    "sellerie", "staudensellerie", "stangensellerie", "knollensellerie",
    "lauch", "porree", "frühlingszwiebel", "frühlingszwiebeln", "lauchzwiebel", "lauchzwiebeln",
    
    // Pilze
    "champignon", "champignons", "pfifferling", "pfifferlinge", "steinpilz", "steinpilze",
    "austernpilz", "austernpilze", "shiitake", "shiitake-pilze",
    
    // Kürbis
    "kürbis", "hokkaido", "butternusskürbis", "butternut", "muskatkürbis",
    
    // Kartoffeln & Süßkartoffeln
    "kartoffel", "kartoffeln", "süßkartoffel", "süßkartoffeln", "batate", "bataten",
    "festkochende kartoffeln", "mehlige kartoffeln",
    
    // Karotten & Rüben
    "karotte", "karotten", "möhre", "möhren", "mohrrübe", "mohrrüben",
    "rote bete", "rote beete", "rübe", "rüben",
    
    // Radieschen
    "radieschen", "rettich",
    
    // Mais & Erbsen
    "mais", "maiskörner", "zuckermais", "erbse", "erbsen", "zuckererbsen",
    "grüne bohne", "grüne bohnen", "buschbohne", "buschbohnen", "stangenbohne", "stangenbohnen",
    
    // Spargel
    "spargel", "grüner spargel", "weißer spargel", "spargelspitzen",
    
    // Artischocken
    "artischocke", "artischocken",
    
    // Zwiebeln & Knoblauch
    "zwiebel", "zwiebeln", "rote zwiebel", "rote zwiebeln", "schalotte", "schalotten",
    "knoblauch", "knoblauchzehe", "knoblauchzehen"
  ],
  
  obst: [
    // Äpfel & Birnen
    "apfel", "äpfel", "birne", "birnen",
    
    // Bananen
    "banane", "bananen",
    
    // Zitrusfrüchte
    "orange", "orangen", "apfelsine", "apfelsinen", "zitrone", "zitronen",
    "limette", "limetten", "grapefruit", "grapefruits", "mandarine", "mandarinen",
    "clementine", "clementinen",
    
    // Beeren
    "erdbeere", "erdbeeren", "himbeere", "himbeeren", "heidelbeere", "heidelbeeren",
    "blaubeere", "blaubeeren", "brombeere", "brombeeren", "johannisbeere", "johannisbeeren",
    "stachelbeere", "stachelbeeren", "cranberry", "cranberries", "preiselbeere", "preiselbeeren",
    
    // Steinobst
    "pfirsich", "pfirsiche", "aprikose", "aprikosen", "nektarine", "nektarinen",
    "pflaume", "pflaumen", "zwetschge", "zwetschgen", "kirsche", "kirschen",
    "sauerkirsche", "sauerkirschen", "süßkirsche", "süßkirschen",
    
    // Trauben
    "traube", "trauben", "weintraube", "weintrauben",
    
    // Exotisches Obst
    "kiwi", "kiwis", "mango", "mangos", "ananas", "ananase",
    "papaya", "papayas", "passionsfrucht", "passionsfrüchte", "maracuja",
    "litschi", "litschis", "drachenfrucht", "drachenfrüchte", "pitaya",
    
    // Melonen
    "wassermelone", "wassermelonen", "honigmelone", "honigmelonen",
    "zuckermelone", "zuckermelonen", "galiamelone", "galiamelonen",
    "netzmelone", "netzmelonen",
    
    // Avocado
    "avocado", "avocados",
    
    // Granatapfel
    "granatapfel", "granatäpfel",
    
    // Feigen & Datteln
    "feige", "feigen", "dattel", "datteln"
  ],
  
  fleisch_fisch: [
    // Schwein
    "schweinefilet", "schweinefleisch", "schweineschnitzel", "schweinebraten",
    "schweinekotelett", "schweinekoteletts", "schweinehackfleisch", "schweinehack",
    "schweinebauch", "speck", "bauchspeck", "schinken", "kochschinken", "rohschinken",
    
    // Rind
    "rindersteak", "rinderfilet", "rinderfleisch", "rinderbraten", "rinderhackfleisch",
    "rinderhack", "hackfleisch", "hack", "gehacktes", "faschiertes", "rinderroulade",
    "rinderrouladen",
    
    // Lamm
    "lammfleisch", "lammfilet", "lammkotelett", "lammkoteletts", "lammkeule",
    
    // Geflügel
    "hühnchen", "hähnchen", "hähnchenbrustfilet", "hähnchenbrustfilets", "hühnerbrust",
    "hühnerbrüste", "hühnerkeule", "hühnerkeulen", "hühnerschenkel", "hähnchenschenkel",
    "putenbrust", "putenbrustfilet", "putenbrustfilets", "putenfleisch",
    "entenbrust", "entenbrustfilet", "entenfleisch", "entenkeule", "entenkeulen",
    
    // Wurst
    "salami", "chorizo", "wurst", "würstchen", "bratwurst", "bratwürste",
    "wiener würstchen", "bockwurst", "bockwürste",
    
    // Fisch
    "lachs", "lachsfilet", "lachsfilets", "räucherlachs",
    "thunfisch", "thunfischfilet", "thunfischfilets",
    "forelle", "forellenfilet", "forellenfilets",
    "kabeljau", "kabeljaufilet", "kabeljaufilets", "dorsch",
    "seelachs", "seelachsfilet", "seelachsfilets",
    "zander", "zanderfilet", "zanderfilets",
    "dorade", "doradenfilet", "doradenfilets",
    "wolfsbarsch",
    
    // Meeresfrüchte
    "garnele", "garnelen", "shrimp", "shrimps", "krabbe", "krabben",
    "krebs", "krebse", "hummer", "muschel", "muscheln", "miesmuschel", "miesmuscheln",
    "jakobsmuschel", "jakobsmuscheln", "tintenfisch", "calamari", "kalmar",
    "oktopus", "krake", "pulpo"
  ],
  
  milchprodukte: [
    // Milch
    "milch", "vollmilch", "fettarme milch", "magermilch", "buttermilch",
    
    // Sahne
    "sahne", "schlagsahne", "süße sahne", "saure sahne", "schmand", "crème fraîche",
    
    // Joghurt
    "joghurt", "jogurt", "naturjoghurt", "griechischer joghurt", "skyr",
    
    // Quark
    "quark", "magerquark", "speisequark",
    
    // Frischkäse
    "frischkäse", "doppelrahmfrischkäse", "körniger frischkäse", "hüttenkäse",
    "ricotta", "mascarpone",
    
    // Käse
    "mozzarella", "büffelmozzarella", "burrata",
    "parmesan", "parmigiano", "parmesankäse",
    "gouda", "edamer", "emmentaler", "gruyère", "greyerzer",
    "feta", "fetakäse", "schafskäse", "ziegenkäse",
    "cheddar", "cheddarkäse",
    "camembert", "brie",
    "gorgonzola", "roquefort", "blauschimmelkäse",
    "pecorino",
    
    // Butter
    "butter", "salzbutter", "kräuterbutter",
    
    // Eier
    "ei", "eier", "hühnerei", "hühnereier"
  ],
  
  getreide_pasta: [
    // Reis
    "reis", "basmatireis", "basmati-reis", "basmati", "jasminreis", "jasmin-reis",
    "risottoreis", "risotto-reis", "arborio", "carnaroli", "langkornreis", "rundkornreis",
    "vollkornreis", "naturreis", "wildreis", "wild-reis",
    
    // Andere Getreide
    "quinoa", "couscous", "bulgur", "polenta", "maisgrieß",
    "hirse", "amaranth", "buchweizen",
    
    // Haferflocken
    "haferflocken", "kernige haferflocken", "zarte haferflocken", "schmelzflocken",
    
    // Mehl
    "mehl", "weizenmehl", "dinkelmehl", "roggenmehl", "vollkornmehl",
    
    // Pasta
    "nudel", "nudeln", "pasta",
    "spaghetti", "penne", "rigatoni", "fusilli", "farfalle", "tagliatelle",
    "fettuccine", "linguine", "bavette", "cappellini",
    "lasagneplatten", "lasagne-platten", "cannelloni",
    "tortellini", "ravioli", "gnocchi",
    
    // Brot & Backwaren
    "brot", "brötchen", "baguette", "ciabatta", "focaccia", "toast", "toastbrot",
    "knäckebrot", "pumpernickel", "vollkornbrot", "roggenbrot", "weizenbrot",
    
    // Teig
    "pizzateig", "pizza-teig", "blätterteig", "filoteig", "filo-teig", "strudelteig",
    "hefeteig", "mürbeteig"
  ],
  
  hülsenfrüchte_nüsse: [
    // Hülsenfrüchte
    "kichererbse", "kichererbsen", "linse", "linsen", "rote linsen", "gelbe linsen",
    "grüne linsen", "belugalinsen", "beluga-linsen",
    "kidneybohne", "kidneybohnen", "kidney-bohnen",
    "schwarze bohne", "schwarze bohnen", "weiße bohne", "weiße bohnen",
    "cannellinibohne", "cannellinibohnen", "borlottibohne", "borlottibohnen",
    "sojabohne", "sojabohnen", "edamame",
    
    // Nüsse
    "mandel", "mandeln", "geschälte mandeln", "gemahlene mandeln", "mandelblättchen",
    "walnuss", "walnüsse", "haselnuss", "haselnüsse", "cashew", "cashewkern", "cashewkerne",
    "cashewnuss", "cashewnüsse", "pistazie", "pistazien", "erdnuss", "erdnüsse",
    "paranuss", "paranüsse", "pekannuss", "pekannüsse", "macadamia", "macadamianuss",
    "macadamianüsse",
    
    // Samen & Kerne
    "pinienkern", "pinienkerne", "sonnenblumenkern", "sonnenblumenkerne",
    "kürbiskern", "kürbiskerne", "sesam", "sesamkörner", "sesamsamen",
    "chiasamen", "chia-samen", "leinsamen", "lein", "mohn", "mohnsamen",
    "hanfsamen"
  ],
  
  kräuter_gewürze: [
    // Frische Kräuter
    "petersilie", "glatte petersilie", "krause petersilie", "schnittlauch",
    "dill", "koriander", "koriandergrün", "thymian", "rosmarin", "oregano",
    "majoran", "salbei", "minze", "pfefferminze", "basilikum", "bärlauch",
    "estragon", "liebstöckel", "kerbel", "zitronenmelisse", "melisse",
    
    // Getrocknete Gewürze & Pulver
    "paprikapulver", "paprika edelsüß", "paprika rosenscharf", "paprikapulver edelsüß",
    "chilipulver", "cayennepfeffer", "cayenne",
    "pfeffer", "schwarzer pfeffer", "weißer pfeffer", "grüner pfeffer",
    "pfefferkörner", "chili", "chilischote", "chilischoten", "chiliflocken",
    "curry", "currypulver", "kurkuma", "gelbwurz", "kreuzkümmel", "cumin",
    "koriandersamen", "kardamom", "zimt", "zimtstange", "zimtstangen", "zimtpulver",
    "muskatnuss", "muskat", "muskatpulver", "nelke", "nelken", "gewürznelken",
    "piment", "sternanis", "fenchelsamen", "kümmelsamen", "kümmel",
    "anis", "vanille", "vanilleschote", "vanilleschoten", "vanilleextrakt", "vanillezucker",
    "ingwer", "ingwerpulver", "knoblauchpulver", "zwiebelpulver",
    
    // Salz
    "salz", "meersalz", "fleur de sel", "himalayasalz"
  ],
  
  öle_fette: [
    "olivenöl", "natives olivenöl", "extra natives olivenöl",
    "rapsöl", "sonnenblumenöl", "maisöl", "erdnussöl", "sesamöl", "walnussöl",
    "traubenkernöl", "kokosnussöl", "kokosöl", "avocadoöl", "leinöl",
    "schmalz", "schweineschmalz", "gänseschmalz", "butterschmalz", "ghee"
  ],
  
  süßungsmittel_saucen: [
    // Zucker & Süßungsmittel
    "zucker", "weißer zucker", "rohrzucker", "brauner zucker", "puderzucker",
    "hagelzucker", "kandis", "honig", "bienenhonig",
    "ahornsirup", "agavensirup", "agavendicksaft", "reissirup", "dattelsirup",
    
    // Saucen & Würzmittel
    "sojasoße", "sojasauce", "tamari", "teriyaki", "teriyakisauce",
    "balsamico", "balsamico-essig", "essig", "weißweinessig", "rotweinessig",
    "apfelessig", "reisessig", "sherryessig",
    "senf", "dijon-senf", "dijonsenf", "grobkörniger senf", "süßer senf",
    "ketchup", "tomatenketchup", "mayonnaise", "mayo", "aioli",
    "worcestersauce", "worcestershire sauce", "tabasco", "sriracha",
    
    // Tomatenprodukte
    "tomatenmark", "tomatenpassata", "passata", "passierte tomaten",
    "tomatensauce", "pizzasauce", "geschälte tomaten", "dosentomaten",
    "getrocknete tomaten", "eingelegte tomaten",
    
    // Pesto & Pasten
    "pesto", "basilikumpesto", "pesto rosso", "pesto verde",
    "tapenade", "olivenpaste", "tahini", "tahin", "sesampaste",
    "erdnussbutter", "erdnussmus", "mandelmus", "cashewmus"
  ],
  
  getränke: [
    // Softdrinks
    "coca cola", "cola", "pepsi", "sprite", "fanta", "limonade", "limo",
    "eistee", "ice tea",
    
    // Säfte
    "orangensaft", "apfelsaft", "traubensaft", "cranberrysaft", "ananassaft",
    "zitronensaft", "limettensaft", "multivitaminsaft",
    
    // Wasser
    "wasser", "mineralwasser", "sprudelwasser", "stilles wasser",
    
    // Alkoholische Getränke
    "bier", "wein", "rotwein", "weißwein", "rosé", "sekt", "champagner",
    "wodka", "gin", "rum", "whisky", "tequila", "likör",
    
    // Kaffee & Tee
    "kaffee", "espresso", "cappuccino", "latte macchiato",
    "tee", "schwarzer tee", "grüner tee", "kräutertee", "früchtetee"
  ],
  
  sonstiges: [
    "tofu", "seidentofu", "räuchertofu", "tempeh",
    "kokosmilch", "kokosnussmilch", "kokoswasser", "kokosflocken", "kokosraspel",
    "schokolade", "zartbitterschokolade", "dunkle schokolade", "vollmilchschokolade",
    "weiße schokolade", "kakao", "kakaopulver", "backkakao",
    "backpulver", "natron", "hefe", "trockenhefe", "frischhefe",
    "speisestärke", "maisstärke", "kartoffelstärke",
    "gelatine", "agar-agar", "pektin"
  ]
};

// Alle erweiterten Zutaten als flache Liste
export const getAllExtendedIngredients = () => {
  return Object.values(EXTENDED_INGREDIENTS).flat();
};

// Kategorie-Labels für UI
export const CATEGORY_LABELS = {
  gemüse: "🥕 Gemüse",
  obst: "🍎 Obst",
  fleisch_fisch: "🥩 Fleisch & Fisch",
  milchprodukte: "🧀 Milchprodukte",
  getreide_pasta: "🌾 Getreide & Pasta",
  hülsenfrüchte_nüsse: "🥜 Hülsenfrüchte & Nüsse",
  kräuter_gewürze: "🌿 Kräuter & Gewürze",
  öle_fette: "🫒 Öle & Fette",
  süßungsmittel_saucen: "🍯 Süßungsmittel & Saucen",
  getränke: "🥤 Getränke",
  sonstiges: "🍽️ Sonstiges"
};

// Kategorie-Icons für UI
export const CATEGORY_ICONS = {
  gemüse: "🥕",
  obst: "🍎",
  fleisch_fisch: "🥩",
  milchprodukte: "🧀",
  getreide_pasta: "🌾",
  hülsenfrüchte_nüsse: "🥜",
  kräuter_gewürze: "🌿",
  öle_fette: "🫒",
  süßungsmittel_saucen: "🍯",
  getränke: "🥤",
  sonstiges: "🍽️"
};

/**
 * Intelligente Kategorie-Zuordnung mit kontextbezogenem Matching
 * VERBESSERTE VERSION: Erkennt jetzt auch Getränke korrekt
 */
export const findIngredientCategory = (ingredientName, alternativeNames = []) => {
  // Normalisierung
  const normalize = (str) => {
    return str.toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };
  
  const normalizedName = normalize(ingredientName);
  const normalizedAlts = alternativeNames.map(alt => normalize(alt));
  const allNames = [normalizedName, ...normalizedAlts];
  
  // PHASE 1: Exakte Matches in allen Kategorien
  for (const [category, ingredients] of Object.entries(EXTENDED_INGREDIENTS)) {
    const normalizedIngredients = ingredients.map(ing => normalize(ing));
    
    for (const name of allNames) {
      if (normalizedIngredients.includes(name)) {
        return category;
      }
    }
  }
  
  // PHASE 2: Kontext-Erkennung mit verbesserter Getränke-Logik
  const contextMap = {
    'pulver': ['kräuter_gewürze', 'getreide_pasta'],
    'paste': ['süßungsmittel_saucen'],
    'sauce': ['süßungsmittel_saucen'],
    'ketchup': ['süßungsmittel_saucen'],
    'senf': ['süßungsmittel_saucen'],
    'essig': ['süßungsmittel_saucen'],
    'öl': ['öle_fette'],
    'butter': ['milchprodukte', 'öle_fette'],
    'mus': ['hülsenfrüchte_nüsse', 'süßungsmittel_saucen'],
    'mark': ['süßungsmittel_saucen'],
    'sirup': ['süßungsmittel_saucen'],
    'mehl': ['getreide_pasta'],
    'cola': ['getränke'],
    'limo': ['getränke'],
    'saft': ['getränke'],
    'tee': ['getränke'],
    'kaffee': ['getränke'],
    'bier': ['getränke'],
    'wein': ['getränke'],
    'wasser': ['getränke']
  };
  
  for (const name of allNames) {
    for (const [suffix, priorityCategories] of Object.entries(contextMap)) {
      if (name.includes(suffix)) {
        // Prüfe prioritäre Kategorien ZUERST
        for (const category of priorityCategories) {
          const categoryIngredients = EXTENDED_INGREDIENTS[category] || [];
          const normalizedCategoryIngredients = categoryIngredients.map(ing => normalize(ing));
          
          if (normalizedCategoryIngredients.includes(name)) {
            return category;
          }
        }
        // Wenn nicht gefunden, verwende erste Prioritätskategorie
        return priorityCategories[0];
      }
    }
  }
  
  // PHASE 3: Substring-Matching (nur für Plural/Singular)
  for (const [category, ingredients] of Object.entries(EXTENDED_INGREDIENTS)) {
    if (category === 'sonstiges') continue;
    
    const normalizedIngredients = ingredients.map(ing => normalize(ing));
    
    for (const name of allNames) {
      if (name.length < 4) continue;
      
      for (const ing of normalizedIngredients) {
        const lengthDiff = Math.abs(name.length - ing.length);
        
        if (lengthDiff <= 2) {
          if (ing.includes(name) || name.includes(ing)) {
            return category;
          }
        }
      }
    }
  }
  
  return 'sonstiges';
};
