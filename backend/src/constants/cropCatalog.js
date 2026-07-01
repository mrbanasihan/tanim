const CROP_GROUPS = ["legumes", "cereals", "vegetables"];

const CROP_CATALOG = {
  legumes: {
    soybean: [
      "Tiwala 6",
      "Tiwala 8",
      "Tiwala 10",
      "Tiwala 12",
      "Tiwala 14",
      "Tiwala 20",
      "Tiwala 22",
      "Tiwala 24",
      "Tiwala 26",
      "Select Tudela Black",
      "Select Manchuria",
    ],
    mungbean: [
      "Pagasa 1",
      "Pagasa 3",
      "Pagasa 5",
      "Pagasa 7",
      "Pagasa 9",
      "Pagasa 11",
      "Pagasa 15",
      "PHL 14295",
      "PHL 14296",
      "PHL 12636",
    ],
    peanut: [
      "Biyaya 2",
      "Biyaya 4",
      "Biyaya 6",
      "Biyaya 8",
      "Biyaya 10",
      "Biyaya 12",
      "Biyaya 14",
      "Biyaya 16",
      "Sibalom",
    ],
  },
  cereals: {
    "yellow corn": ["IPB Var 9", "IPB Var 11", "IPB Var 13"],
    "white corn": ["IPB Var 6", "IPB Var 8", "1910", "IPB Var DM1"],
    glutinous: ["LB Lagkitan"],
  },
  vegetables: {
    ampalaya: ["Sta. Rita"],
    cucumber: ["Bituin", "Princesa", "Milagros", "Princess Alba", "Urduja"],
    eggplant: ["DLP", "Mistisa", "Minyang", "Dorikit", "Mamburao", "Mara"],
    okra: ["Smooth Green", "Dilag"],
    patola: ["Cavite Smooth"],
    "pole sitao": ["Generosa", "Sandigan", "Ilao", "Tikagan", "Maureen"],
    saluyot: ["Sagisag 2"],
    squash: ["Rizalina", "Luisa", "Sonrisa", "Amour"],
    tomato: ["Lelen", "Elpidia", "Julita", "Rica", "Rosanna"],
    "cherry tomato": ["Belle", "Cherrys", "Elmundo", "Karla", "Betty"],
    upo: ["Tambuli", "Leona"],
    "winged bean": ["Gloria"],
    roselle: ["Reina", "Pasuquin"],
  },
};

const FAMILY_GROUPS = {
  CUCURBITS: ["upo", "patola", "cucumber", "squash", "ampalaya"],
  SOLANACEOUS: ["eggplant", "tomato", "cherry tomato"],
  MALLOW: ["saluyot", "roselle", "okra"],
  LEGUMINOUS: ["winged bean", "pole sitao"],
};

const CROP_PROJECTS = {
  upo: ["Seed System", "Core BS Cross-pollinated"],
  patola: ["Seed System", "Core BS Cross-pollinated"],
  cucumber: ["Seed System", "Core BS Cross-pollinated", "Core MET"],
  squash: ["Seed System", "Core BS Cross-pollinated"],
  ampalaya: ["Seed System", "Core BS Cross-pollinated"],
  eggplant: ["Seed System", "Core BS Self-pollinated"],
  tomato: ["Seed System", "Core BS Self-pollinated"],
  "cherry tomato": ["Seed System", "Core BS Self-pollinated"],
  saluyot: ["Seed System", "Core BS Self-pollinated", "Core Microgreens"],
  roselle: ["Seed System", "Core BS Self-pollinated", "Core Microgreens"],
  okra: ["Seed System", "Core BS Self-pollinated"],
  "winged bean": ["Seed System", "Core BS Self-pollinated"],
  "pole sitao": ["Seed System", "Core BS Self-pollinated"],
};

const ALL_CROP_TYPES = Object.values(CROP_CATALOG).flatMap((groupCatalog) =>
  Object.keys(groupCatalog),
);

const ALL_VARIETIES = Object.values(CROP_CATALOG).flatMap((groupCatalog) =>
  Object.values(groupCatalog).flat(),
);

module.exports = {
  CROP_GROUPS,
  CROP_CATALOG,
  FAMILY_GROUPS,
  CROP_PROJECTS,
  ALL_CROP_TYPES,
  ALL_VARIETIES,
};
