export const CROP_GROUPS = ["legumes", "cereals", "vegetables"];

export const CROP_CATALOG = {
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
    alugbati: ["Red", "Green"],
    amaranth: ["Green"],
    ampalaya: ["Sta. Rita"],
    "bush sitao": ["UPL BS3", "BS 6", "BS 7", "BS 8", "BS 9"],
    cowpea: ["IT-82", "CES 18-6"],
    cucumber: ["CU-11-Bituin", "Princesa", "Urduja"],
    eggplant: ["DLP", "Mistisa"],
    "hot pepper (pangsinigang)": ["No Variety"],
    "hot pepper": ["No Variety"],
    okra: ["Smooth Green", "Dilag"],
    patola: ["Talisay"],
    "pole sitao": ["PS 1", "PS 2", "Tikagan", "Maureen", "Ilao", "Generosa"],
    saluyot: ["Sagisag 2"],
    squash: ["Rizalina", "Luisa", "Sonrisa", "Amour"],
    tomato: [
      "Rosanna",
      "Rica",
      "Lelen",
      "Elpidia",
      "Julita",
      "Kaisa1",
      "Kaisa3",
      "Kaisa5",
      "Kaisa7",
    ],
    "cherry tomato": ["Belle", "Cherrys", "Elmundo", "Karla", "Betty"],
    upo: ["Tambuli", "Leona"],
    "winged bean": ["Gloria"],
    roselle: ["Reina", "Pasuquin"],
  },
};

export const ALL_CROP_TYPES = Object.values(CROP_CATALOG).flatMap(
  (groupCatalog) => Object.keys(groupCatalog),
);

export const getSelectedCropGroup = (userRole, cropGroups = []) => {
  const availableGroups =
    userRole === "admin"
      ? CROP_GROUPS
      : cropGroups.filter((group) => CROP_GROUPS.includes(group));

  if (availableGroups.length === 0) {
    return null;
  }

  const selected = localStorage.getItem("selectedCropGroup");
  if (selected && availableGroups.includes(selected)) {
    return selected;
  }

  return availableGroups[0];
};
