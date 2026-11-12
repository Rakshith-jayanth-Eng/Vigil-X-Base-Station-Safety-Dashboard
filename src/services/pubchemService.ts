/**
 * PubChem Chemical & Gas Toxicology Science Service
 * Uses NCBI PubChem PUG REST and PUG View APIs
 * Adheres to DeepMind Science Skill for Chemistry & Toxicology
 */

export interface FirstAidGuidance {
  inhalation: string;
  eyesSkin: string;
  antidote: string;
}

export interface EmergencyResponseProtocol {
  ppeLevel: string;
  evacuationRadius: string;
  ventilationAction: string;
  triagePriority: 'HIGH' | 'CRITICAL' | 'EXTREME';
}

export interface ChemicalGasProfile {
  cid: number;
  name: string;
  chemicalFormula: string;
  molecularWeight: number;
  iupacName: string;
  smiles: string;
  inchikey: string;
  description: string;
  industrialContext: string;
  mq2Sensitivity: string;
  ghsClassifications: string[];
  ghsCodes: string[];
  oshaPel: string; // OSHA Permissible Exposure Limit
  nioshRel: string; // NIOSH Recommended Exposure Limit
  idlh: string; // Immediately Dangerous to Life or Health
  healthEffects: string[];
  imageUrl: string;
  firstAid: FirstAidGuidance;
  responseProtocol: EmergencyResponseProtocol;
}

export const KNOWN_HAZARDOUS_GASES: Record<string, ChemicalGasProfile> = {
  CH4: {
    cid: 297,
    name: 'Methane',
    chemicalFormula: 'CH4',
    molecularWeight: 16.043,
    iupacName: 'methane',
    smiles: 'C',
    inchikey: 'VNWKTokens-UHFFFAOYSA-N',
    description: 'Colorless, odorless flammable gas. Principal component of natural gas and sewer firedamp.',
    industrialContext: 'Underground coal mines, sewer networks, manholes, anaerobic waste digesters.',
    mq2Sensitivity: 'High sensitivity. The MQ-2 Tin Dioxide (SnO2) ceramic element reacts strongly with reducing hydrocarbons.',
    ghsClassifications: ['Extremely Flammable Gas (Cat 1A)', 'Gas Under Pressure (Compressed)'],
    ghsCodes: ['H220', 'H280'],
    oshaPel: '1,000 ppm (8-hr TWA as simple asphyxiant guideline)',
    nioshRel: 'Simple asphyxiant / Oxygen displacement monitor',
    idlh: '50,000 ppm (5% LEL lower explosive limit)',
    healthEffects: ['Rapid asphyxiation by oxygen displacement', 'Severe explosion/flash fire risk', 'Dizziness and loss of consciousness'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/297/PNG?image_size=large',
    firstAid: {
      inhalation: 'Remove victim to fresh air immediately. Administer oxygen if breathing is labored. Begin CPR if pulse is absent.',
      eyesSkin: 'Flush with water for 15 minutes if exposed to compressed liquid stream (frostbite risk).',
      antidote: 'No specific chemical antidote. Supportive 100% normobaric oxygen therapy.',
    },
    responseProtocol: {
      ppeLevel: 'Level B PPE with positive-pressure SCBA (Self-Contained Breathing Apparatus). Intrinsically safe tools only.',
      evacuationRadius: 'Initial 100 meters in all directions; expand to 800 meters downwind if explosive concentrations exceed 10% LEL.',
      ventilationAction: 'Deploy explosion-proof positive pressure mechanical blowers. Eliminate all ignition sources.',
      triagePriority: 'CRITICAL',
    },
  },
  CO: {
    cid: 281,
    name: 'Carbon Monoxide',
    chemicalFormula: 'CO',
    molecularWeight: 28.01,
    iupacName: 'carbon monoxide',
    smiles: '[C-]#[O+]',
    inchikey: 'UGFAIRCKSAOEFM-UHFFFAOYSA-N',
    description: 'Colorless, odorless, highly toxic gas formed by incomplete combustion of organic fuels.',
    industrialContext: 'Confined spaces with internal combustion engines, boilers, blast furnaces, structural fires.',
    mq2Sensitivity: 'Moderate sensitivity. Detected through oxidation on the heated sensing surface.',
    ghsClassifications: ['Extremely Flammable Gas', 'Fatal If Inhaled (Cat 3)', 'Causes Damage to Organs'],
    ghsCodes: ['H220', 'H331', 'H372'],
    oshaPel: '50 ppm (8-hr TWA)',
    nioshRel: '35 ppm (8-hr TWA), Ceiling 200 ppm',
    idlh: '1,200 ppm',
    healthEffects: ['Binds to hemoglobin forming carboxyhemoglobin (COHb)', 'Severe cellular hypoxia', 'Headache, confusion, coma, death'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/281/PNG?image_size=large',
    firstAid: {
      inhalation: 'Immediately extract victim to clean atmosphere. Administer high-flow 100% non-rebreather oxygen without delay.',
      eyesSkin: 'Not primary route of absorption.',
      antidote: '100% Normobaric Oxygen or Hyperbaric Oxygen Therapy (HBOT) to accelerate carboxyhemoglobin dissociation.',
    },
    responseProtocol: {
      ppeLevel: 'Level A or B with NIOSH-certified SCBA. Air-purifying respirators are prohibited in IDLH atmospheres.',
      evacuationRadius: '150 meters for confined spaces, full facility perimeter evacuation if ceiling exceeds 200 ppm.',
      ventilationAction: 'Forced positive exhaust ventilation to outside air away from intakes.',
      triagePriority: 'EXTREME',
    },
  },
  H2S: {
    cid: 402,
    name: 'Hydrogen Sulfide',
    chemicalFormula: 'H2S',
    molecularWeight: 34.08,
    iupacName: 'sulfane',
    smiles: 'S',
    inchikey: 'RWSOTUBLDIXVET-UHFFFAOYSA-N',
    description: 'Extremely toxic and flammable sewer gas. Rotten-egg odor at trace levels, but rapidly paralyzes olfactory nerves above 100 ppm.',
    industrialContext: 'Sewers, wastewater treatment, petroleum refining, manure pits, paper pulp mills.',
    mq2Sensitivity: 'Detectable as a reducing sulfide, causes rapid sensor resistance decrease.',
    ghsClassifications: ['Extremely Flammable Gas', 'Fatal If Inhaled (Cat 2)', 'Specific Target Organ Toxicity'],
    ghsCodes: ['H220', 'H330', 'H335'],
    oshaPel: '20 ppm (Acceptable Ceiling), 50 ppm (Peak 10 min)',
    nioshRel: 'Ceiling 10 ppm (10 min)',
    idlh: '100 ppm',
    healthEffects: ['Olfactory fatigue within seconds', 'Pulmonary edema and respiratory paralysis', 'Knockdown phenomenon: sudden collapse within 1-2 breaths'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/402/PNG?image_size=large',
    firstAid: {
      inhalation: 'RESCUERS MUST WEAR SCBA BEFORE ENTRY. Do not enter unprotected. Move victim to fresh air, start artificial respiration.',
      eyesSkin: 'Flush eyes immediately with copious water for at least 15 minutes.',
      antidote: 'Nitrite therapy (Sodium Nitrite) or Hydroxocobalamin under physician direction to form sulfmethemoglobin.',
    },
    responseProtocol: {
      ppeLevel: 'Level A encapsulating chemical suit with positive-pressure SCBA. Buddy system mandatory.',
      evacuationRadius: 'Initial isolation 300 meters downwind; expand to 1,600 meters in major leaks.',
      ventilationAction: 'Spark-proof suction exhaust with caustic scrubber ducting.',
      triagePriority: 'EXTREME',
    },
  },
  C3H8: {
    cid: 6334,
    name: 'Propane (LPG)',
    chemicalFormula: 'C3H8',
    molecularWeight: 44.097,
    iupacName: 'propane',
    smiles: 'CCC',
    inchikey: 'ATUOYWHBAPCDND-UHFFFAOYSA-N',
    description: 'Heavy liquified petroleum hydrocarbon gas. 1.5x denser than air; pools at floor level and trenches.',
    industrialContext: 'Industrial heating, metal cutting, forklift fuel storage, pipeline welding.',
    mq2Sensitivity: 'Highest rated sensitivity on standard MQ-2 calibration curves (LPG benchmark).',
    ghsClassifications: ['Extremely Flammable Gas', 'Contains Gas Under Pressure'],
    ghsCodes: ['H220', 'H280'],
    oshaPel: '1,000 ppm (8-hr TWA)',
    nioshRel: '1,000 ppm (8-hr TWA)',
    idlh: '2,100 ppm (10% LEL)',
    healthEffects: ['Accumulates in floor sumps displacing breathable air', 'Extreme ignition & BLEVE risk', 'Central nervous system depression'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/6334/PNG?image_size=large',
    firstAid: {
      inhalation: 'Transfer patient to fresh air. Keep warm and quiet. Provide CPR if cardiopulmonary arrest occurs.',
      eyesSkin: 'Treat cryogenic contact burns with tepid water rinse. Do not rub skin.',
      antidote: 'None. Supportive oxygenation.',
    },
    responseProtocol: {
      ppeLevel: 'Thermal flash-resistant turnout gear with positive-pressure SCBA.',
      evacuationRadius: 'Minimum 100 meters; 800 meters if bulk cylinder exposure to fire occurs.',
      ventilationAction: 'Low-point suction exhaust sweeps along floor trenches and vaults.',
      triagePriority: 'HIGH',
    },
  },
  NH3: {
    cid: 222,
    name: 'Ammonia',
    chemicalFormula: 'NH3',
    molecularWeight: 17.031,
    iupacName: 'azane',
    smiles: 'N',
    inchikey: 'QGZKDVFQNNGYKY-UHFFFAOYSA-N',
    description: 'Pungent, highly irritating corrosive alkaline gas widely used in industrial chilling systems.',
    industrialContext: 'Cold storage warehouses, fertilizer manufacturing, chemical syntheses.',
    mq2Sensitivity: 'Secondary cross-sensitivity detected on heated metal oxide element.',
    ghsClassifications: ['Toxic If Inhaled', 'Causes Severe Skin Burns & Eye Damage', 'Flammable Gas'],
    ghsCodes: ['H221', 'H314', 'H331'],
    oshaPel: '50 ppm (8-hr TWA)',
    nioshRel: '25 ppm (8-hr TWA), 35 ppm (STEL)',
    idlh: '300 ppm',
    healthEffects: ['Immediate caustic burning of upper respiratory tract', 'Severe chemical pneumonitis and laryngeal edema', 'Corneal destruction upon eye contact'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/222/PNG?image_size=large',
    firstAid: {
      inhalation: 'Move to fresh air. Keep upright in semi-Fowler position. Monitor airway for stridor or rapid closing.',
      eyesSkin: 'Irrigate eyes and skin with water for at least 30 minutes continuously.',
      antidote: 'No specific antidote. Nebulized bronchodilators and systemic steroids for airway burn.',
    },
    responseProtocol: {
      ppeLevel: 'Level A vapor-protective suit with SCBA and chemical-resistant gloves (butyl or Teflon).',
      evacuationRadius: '200 meters initial radius; downwind 800 meters during day, 1,500 meters at night.',
      ventilationAction: 'Water fog spray curtain to absorb ammonia vapors into runoff basin.',
      triagePriority: 'CRITICAL',
    },
  },
  H2: {
    cid: 783,
    name: 'Hydrogen',
    chemicalFormula: 'H2',
    molecularWeight: 2.016,
    iupacName: 'molecular hydrogen',
    smiles: '[HH]',
    inchikey: 'UFHFLCQGNIYNRP-UHFFFAOYSA-N',
    description: 'Lightest chemical element; highly combustible over wide atmospheric concentration ranges (4% - 75%).',
    industrialContext: 'Battery charging rooms, electrolysis bays, semiconductor manufacturing.',
    mq2Sensitivity: 'Very high sensitivity. Small molecule diffuses quickly into SnO2 porous lattice.',
    ghsClassifications: ['Extremely Flammable Gas', 'Gas Under Pressure'],
    ghsCodes: ['H220', 'H280'],
    oshaPel: 'Simple asphyxiant / Flammability monitor',
    nioshRel: 'Simple asphyxiant',
    idlh: '40,000 ppm (4% LEL)',
    healthEffects: ['Invisible, low-radiant heat flame hazards', 'Deflagration and detonation in enclosed ceilings', 'Suffocation at high concentrations'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/783/PNG?image_size=large',
    firstAid: {
      inhalation: 'Move to uncontaminated atmosphere. Administer oxygen if breathless.',
      eyesSkin: 'Standard supportive treatment for thermal burn injury.',
      antidote: 'None.',
    },
    responseProtocol: {
      ppeLevel: 'Flame-retardant anti-static turnout gear with SCBA.',
      evacuationRadius: '100 meters around enclosure; roof vents must remain open.',
      ventilationAction: 'High-point ceiling roof louvers and spark-proof extraction.',
      triagePriority: 'HIGH',
    },
  },
  CL2: {
    cid: 24526,
    name: 'Chlorine',
    chemicalFormula: 'Cl2',
    molecularWeight: 70.9,
    iupacName: 'molecular chlorine',
    smiles: 'ClCl',
    inchikey: 'ZLMJMSJWJFRGJR-UHFFFAOYSA-N',
    description: 'Dense greenish-yellow gas with suffocating bleach odor. Strong oxidizer, highly toxic.',
    industrialContext: 'Water disinfection, chemical pulp bleaching, wastewater chlorination.',
    mq2Sensitivity: 'Oxidizing halogen that alters SnO2 conduction band energy.',
    ghsClassifications: ['Fatal If Inhaled', 'Causes Severe Skin Burns & Eye Damage', 'Oxidizing Gas'],
    ghsCodes: ['H270', 'H314', 'H330'],
    oshaPel: '1 ppm Ceiling',
    nioshRel: '0.5 ppm Ceiling (15 min)',
    idlh: '10 ppm',
    healthEffects: ['Severe pulmonary irritation', 'Bronchospasm and delayed chemical pulmonary edema', 'Corrosive tissue liquefaction'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/24526/PNG?image_size=large',
    firstAid: {
      inhalation: 'Immediate fresh air evacuation. Keep at absolute rest. Humidified oxygen support.',
      eyesSkin: 'Flush eyes and skin with water for 20 minutes.',
      antidote: 'Nebulized sodium bicarbonate solution under emergency medical physician direction.',
    },
    responseProtocol: {
      ppeLevel: 'Level A total encapsulating suit with SCBA.',
      evacuationRadius: '300 meters initial isolation; up to 3,000 meters downwind.',
      ventilationAction: 'Alkali caustic scrubbing system.',
      triagePriority: 'EXTREME',
    },
  },
  SO2: {
    cid: 1119,
    name: 'Sulfur Dioxide',
    chemicalFormula: 'SO2',
    molecularWeight: 64.066,
    iupacName: 'sulfur dioxide',
    smiles: 'O=S=O',
    inchikey: 'YNAVUWVOSKIXFR-UHFFFAOYSA-N',
    description: 'Colorless, pungent, suffocating gas with strong sulfurous smell.',
    industrialContext: 'Smelters, sulfuric acid plants, fossil fuel combustion plants.',
    mq2Sensitivity: 'Acid gas that reduces sensor conductance under high thermal activation.',
    ghsClassifications: ['Toxic If Inhaled', 'Causes Severe Skin Burns & Eye Damage'],
    ghsCodes: ['H314', 'H331'],
    oshaPel: '5 ppm (8-hr TWA)',
    nioshRel: '2 ppm (8-hr TWA), 5 ppm (STEL)',
    idlh: '100 ppm',
    healthEffects: ['Reflex bronchoconstriction', 'Coughing and chest tightness', 'Chemical burning of mucous membranes'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/1119/PNG?image_size=large',
    firstAid: {
      inhalation: 'Remove to fresh air. Administer bronchodilators and humidified oxygen.',
      eyesSkin: 'Copious eye/skin water irrigation for 15 minutes.',
      antidote: 'Supportive airway management.',
    },
    responseProtocol: {
      ppeLevel: 'Level B with positive-pressure SCBA.',
      evacuationRadius: '150 meters initial isolation.',
      ventilationAction: 'Mechanical scrubber extraction.',
      triagePriority: 'HIGH',
    },
  },
};

// In-Memory Cache
const inMemoryCache = new Map<string, { data: Partial<ChemicalGasProfile>; expiry: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getStorageCache(key: string): Partial<ChemicalGasProfile> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`pubchem_${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() > parsed.expiry) {
      localStorage.removeItem(`pubchem_${key}`);
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

function setStorageCache(key: string, data: Partial<ChemicalGasProfile>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      `pubchem_${key}`,
      JSON.stringify({ data, expiry: Date.now() + CACHE_TTL_MS })
    );
  } catch {
    // LocalStorage full or disabled
  }
}

/**
 * Fetch live chemical property data from PubChem REST API with exponential backoff and timeout
 */
export async function fetchPubChemCompoundByCid(
  cid: number,
  retries = 2
): Promise<Partial<ChemicalGasProfile> | null> {
  const cacheKey = `cid_${cid}`;

  // Check In-Memory
  const mem = inMemoryCache.get(cacheKey);
  if (mem && Date.now() < mem.expiry) {
    return mem.data;
  }

  // Check LocalStorage
  const disk = getStorageCache(cacheKey);
  if (disk) {
    inMemoryCache.set(cacheKey, { data: disk, expiry: Date.now() + CACHE_TTL_MS });
    return disk;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    try {
      const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey/JSON`;
      const resp = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        if (attempt === retries) break;
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
        continue;
      }

      const data = await resp.json();
      const prop = data?.PropertyTable?.Properties?.[0];
      if (!prop) break;

      const profile: Partial<ChemicalGasProfile> = {
        cid,
        name: prop.Title || prop.IUPACName,
        chemicalFormula: prop.MolecularFormula,
        molecularWeight: parseFloat(prop.MolecularWeight),
        iupacName: prop.IUPACName,
        smiles: prop.CanonicalSMILES,
        inchikey: prop.InChIKey,
        imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=large`,
      };

      inMemoryCache.set(cacheKey, { data: profile, expiry: Date.now() + CACHE_TTL_MS });
      setStorageCache(cacheKey, profile);
      return profile;
    } catch {
      clearTimeout(timeout);
      if (attempt === retries) break;
      await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
    }
  }

  // Fallback to built-in dictionary
  const fallback = Object.values(KNOWN_HAZARDOUS_GASES).find((g) => g.cid === cid);
  return fallback || null;
}

/**
 * Search PubChem for chemical compounds by name with offline fallback
 */
export async function searchPubChemByName(chemicalName: string): Promise<number | null> {
  const normalized = chemicalName.trim().toUpperCase();
  // Check fast dictionary match first
  if (KNOWN_HAZARDOUS_GASES[normalized]) {
    return KNOWN_HAZARDOUS_GASES[normalized].cid;
  }
  const matchByName = Object.values(KNOWN_HAZARDOUS_GASES).find(
    (g) => g.name.toUpperCase() === normalized || g.chemicalFormula.toUpperCase() === normalized
  );
  if (matchByName) {
    return matchByName.cid;
  }

  const cacheKey = `name_${normalized}`;
  const disk = getStorageCache(cacheKey);
  if (disk?.cid) return disk.cid;

  try {
    const encoded = encodeURIComponent(chemicalName.trim());
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`;
    const resp = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const data = await resp.json();
    const cids = data?.IdentifierList?.CID;
    if (Array.isArray(cids) && cids.length > 0) {
      setStorageCache(cacheKey, { cid: cids[0] });
      return cids[0];
    }
    return null;
  } catch {
    return null;
  }
}
