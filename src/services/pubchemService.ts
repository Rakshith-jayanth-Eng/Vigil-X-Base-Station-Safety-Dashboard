/**
 * PubChem Chemical & Gas Toxicology Science Service
 * Uses NCBI PubChem PUG REST and PUG View APIs
 * Adheres to DeepMind Science Skill for Chemistry & Toxicology
 */

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
    industrialContext: 'Confined spaces with internal combustion engines, boilers, blast furnaces, fires.',
    mq2Sensitivity: 'Moderate sensitivity. Detected through oxidation on the heated sensing surface.',
    ghsClassifications: ['Extremely Flammable Gas', 'Fatal If Inhaled (Cat 3)', 'Causes Damage to Organs'],
    ghsCodes: ['H220', 'H331', 'H372'],
    oshaPel: '50 ppm (8-hr TWA)',
    nioshRel: '35 ppm (8-hr TWA), Ceiling 200 ppm',
    idlh: '1,200 ppm',
    healthEffects: ['Binds to hemoglobin forming carboxyhemoglobin', 'Severe cellular hypoxia', 'Headache, confusion, coma, death'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/281/PNG?image_size=large',
  },
  H2S: {
    cid: 402,
    name: 'Hydrogen Sulfide',
    chemicalFormula: 'H2S',
    molecularWeight: 34.08,
    iupacName: 'sulfane',
    smiles: 'S',
    inchikey: 'RWSOTUBLDIXVET-UHFFFAOYSA-N',
    description: 'Extremely toxic and flammable sewer gas. Rotten-egg odor at trace levels, but paralyzes olfactory nerves rapidly.',
    industrialContext: 'Sewers, wastewater treatment, petroleum refining, manure pits, paper pulp mills.',
    mq2Sensitivity: 'Detectable as a reducing sulfide, causes rapid sensor resistance decrease.',
    ghsClassifications: ['Extremely Flammable Gas', 'Fatal If Inhaled (Cat 2)', 'Specific Target Organ Toxicity'],
    ghsCodes: ['H220', 'H330', 'H335'],
    oshaPel: '20 ppm (Acceptable Ceiling), 50 ppm (Peak 10 min)',
    nioshRel: 'Ceiling 10 ppm (10 min)',
    idlh: '100 ppm',
    healthEffects: ['Olfactory fatigue within seconds', 'Pulmonary edema', 'Knockdown phenomenon: sudden loss of consciousness'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/402/PNG?image_size=large',
  },
  C3H8: {
    cid: 6334,
    name: 'Propane (LPG)',
    chemicalFormula: 'C3H8',
    molecularWeight: 44.097,
    iupacName: 'propane',
    smiles: 'CCC',
    inchikey: 'ATUOYWHBAPCDND-UHFFFAOYSA-N',
    description: 'Heavy liquified petroleum hydrocarbon gas. Denser than air; pools at floor level in confined excavations.',
    industrialContext: 'Industrial heating, metal cutting, forklift fuel storage, pipeline welding.',
    mq2Sensitivity: 'Highest rated sensitivity on standard MQ-2 calibration curves (LPG benchmark).',
    ghsClassifications: ['Extremely Flammable Gas', 'Contains Gas Under Pressure'],
    ghsCodes: ['H220', 'H280'],
    oshaPel: '1,000 ppm (8-hr TWA)',
    nioshRel: '1,000 ppm (8-hr TWA)',
    idlh: '2,100 ppm (10% LEL)',
    healthEffects: ['Accumulates in floor sumps displacing breathable air', 'Extreme ignition & boiling liquid expanding vapor explosion (BLEVE) risk', 'Central nervous system depression'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/6334/PNG?image_size=large',
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
    healthEffects: ['Immediate caustic burning of upper respiratory tract', 'Severe chemical pneumonitis', 'Corneal destruction upon eye contact'],
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/222/PNG?image_size=large',
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
  },
};

/**
 * Fetch live chemical property data from PubChem REST API
 */
export async function fetchPubChemCompoundByCid(cid: number): Promise<Partial<ChemicalGasProfile> | null> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey/JSON`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const prop = data?.PropertyTable?.Properties?.[0];
    if (!prop) return null;

    return {
      cid,
      name: prop.Title || prop.IUPACName,
      chemicalFormula: prop.MolecularFormula,
      molecularWeight: parseFloat(prop.MolecularWeight),
      iupacName: prop.IUPACName,
      smiles: prop.CanonicalSMILES,
      inchikey: prop.InChIKey,
      imageUrl: `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=large`,
    };
  } catch (err) {
    console.warn(`PubChem PUG-REST fetch failed for CID ${cid}:`, err);
    return null;
  }
}

/**
 * Search PubChem for chemical compounds by name
 */
export async function searchPubChemByName(chemicalName: string): Promise<number | null> {
  try {
    const encoded = encodeURIComponent(chemicalName.trim());
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encoded}/cids/JSON`;
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const cids = data?.IdentifierList?.CID;
    if (Array.isArray(cids) && cids.length > 0) {
      return cids[0];
    }
    return null;
  } catch (err) {
    console.warn(`PubChem name search failed for "${chemicalName}":`, err);
    return null;
  }
}
