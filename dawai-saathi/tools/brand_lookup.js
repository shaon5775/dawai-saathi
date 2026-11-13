// Brand -> salt (generic) lookup for common Indian brands. Coded tool for the nsDeploy runtime (sandboxed, no network).
// Compositions are the commonly sold strength of each brand. The strip in the patient's hand is always the truth:
// the tool tells the agent to ask the user to read the generic name printed on the strip when unsure.

const BRANDS = [
  ["Dolo 650", "Paracetamol 650 mg", "tablet"], ["Crocin 500", "Paracetamol 500 mg", "tablet"],
  ["Calpol 500", "Paracetamol 500 mg", "tablet"], ["Calpol 650", "Paracetamol 650 mg", "tablet"],
  ["Combiflam", "Ibuprofen 400 mg + Paracetamol 325 mg", "tablet"], ["Brufen 400", "Ibuprofen 400 mg", "tablet"],
  ["Zerodol-P", "Aceclofenac 100 mg + Paracetamol 325 mg", "tablet"], ["Zerodol 100", "Aceclofenac 100 mg", "tablet"],
  ["Voveran 50", "Diclofenac 50 mg", "tablet"],
  ["Pan 40", "Pantoprazole 40 mg", "tablet"], ["Pantocid 40", "Pantoprazole 40 mg", "tablet"],
  ["Pan-D", "Pantoprazole 40 mg + Domperidone 30 mg", "capsule"], ["Pantocid-DSR", "Pantoprazole 40 mg + Domperidone 30 mg", "capsule"],
  ["Omez 20", "Omeprazole 20 mg", "capsule"], ["Razo 20", "Rabeprazole 20 mg", "tablet"],
  ["Razo-D", "Rabeprazole 20 mg + Domperidone 30 mg", "capsule"], ["Rablet-D", "Rabeprazole 20 mg + Domperidone 30 mg", "capsule"],
  ["Nexpro 40", "Esomeprazole 40 mg", "tablet"], ["Sompraz 40", "Esomeprazole 40 mg", "tablet"],
  ["Domstal 10", "Domperidone 10 mg", "tablet"], ["Ondem 4", "Ondansetron 4 mg", "tablet"], ["Emeset 4", "Ondansetron 4 mg", "tablet"],
  ["Telma 40", "Telmisartan 40 mg", "tablet"], ["Telma 80", "Telmisartan 80 mg", "tablet"],
  ["Telma-H", "Telmisartan 40 mg + Hydrochlorothiazide 12.5 mg", "tablet"],
  ["Telma-AM", "Telmisartan 40 mg + Amlodipine 5 mg", "tablet"],
  ["Amlong 5", "Amlodipine 5 mg", "tablet"], ["Amlopres 5", "Amlodipine 5 mg", "tablet"], ["Stamlo 5", "Amlodipine 5 mg", "tablet"],
  ["Losar 50", "Losartan 50 mg", "tablet"], ["Losacar 50", "Losartan 50 mg", "tablet"], ["Cilacar 10", "Cilnidipine 10 mg", "tablet"],
  ["Aten 50", "Atenolol 50 mg", "tablet"], ["Tenormin 50", "Atenolol 50 mg", "tablet"], ["Concor 5", "Bisoprolol 5 mg", "tablet"],
  ["Met XL 25", "Metoprolol 25 mg", "tablet"], ["Metolar XR 25", "Metoprolol 25 mg", "tablet"],
  ["Lasix 40", "Furosemide 40 mg", "tablet"], ["Dytor 10", "Torsemide 10 mg", "tablet"],
  ["Glycomet 500", "Metformin 500 mg", "tablet"], ["Glycomet SR 500", "Metformin 500 mg", "tablet"],
  ["Glycomet GP 1", "Glimepiride 1 mg + Metformin 500 mg", "tablet"], ["Glimisave M1", "Glimepiride 1 mg + Metformin 500 mg", "tablet"],
  ["Gemer 1", "Glimepiride 1 mg + Metformin 500 mg", "tablet"], ["Amaryl 1", "Glimepiride 1 mg", "tablet"],
  ["Amaryl 2", "Glimepiride 2 mg", "tablet"], ["Januvia 100", "Sitagliptin 100 mg", "tablet"],
  ["Janumet 50/500", "Sitagliptin 50 mg + Metformin 500 mg", "tablet"], ["Galvus Met 50/500", "Vildagliptin 50 mg + Metformin 500 mg", "tablet"],
  ["Forxiga 10", "Dapagliflozin 10 mg", "tablet"], ["Jardiance 10", "Empagliflozin 10 mg", "tablet"],
  ["Ecosprin 75", "Aspirin 75 mg", "tablet"], ["Ecosprin 150", "Aspirin 150 mg", "tablet"],
  ["Ecosprin AV 75", "Aspirin 75 mg + Atorvastatin 10 mg", "capsule"], ["Clopilet 75", "Clopidogrel 75 mg", "tablet"],
  ["Plavix 75", "Clopidogrel 75 mg", "tablet"], ["Atorva 10", "Atorvastatin 10 mg", "tablet"], ["Atorva 20", "Atorvastatin 20 mg", "tablet"],
  ["Lipitor 10", "Atorvastatin 10 mg", "tablet"], ["Rosuvas 10", "Rosuvastatin 10 mg", "tablet"], ["Rozavel 10", "Rosuvastatin 10 mg", "tablet"],
  ["Crestor 10", "Rosuvastatin 10 mg", "tablet"],
  ["Thyronorm 25", "Levothyroxine 25 mcg", "tablet"], ["Thyronorm 50", "Levothyroxine 50 mcg", "tablet"],
  ["Thyronorm 100", "Levothyroxine 100 mcg", "tablet"], ["Eltroxin 50", "Levothyroxine 50 mcg", "tablet"],
  ["Augmentin 625 Duo", "Amoxycillin 500 mg + Clavulanate 125 mg", "tablet"], ["Clavam 625", "Amoxycillin 500 mg + Clavulanate 125 mg", "tablet"],
  ["Mox 500", "Amoxycillin 500 mg", "capsule"], ["Novamox 500", "Amoxycillin 500 mg", "capsule"],
  ["Azithral 500", "Azithromycin 500 mg", "tablet"], ["Azee 500", "Azithromycin 500 mg", "tablet"],
  ["Ciplox 500", "Ciprofloxacin 500 mg", "tablet"], ["Norflox 400", "Norfloxacin 400 mg", "tablet"],
  ["Taxim-O 200", "Cefixime 200 mg", "tablet"], ["Zifi 200", "Cefixime 200 mg", "tablet"],
  ["Flagyl 400", "Metronidazole 400 mg", "tablet"], ["Metrogyl 400", "Metronidazole 400 mg", "tablet"],
  ["Montair LC", "Montelukast 10 mg + Levocetirizine 5 mg", "tablet"], ["Montek LC", "Montelukast 10 mg + Levocetirizine 5 mg", "tablet"],
  ["Montair 10", "Montelukast 10 mg", "tablet"], ["Allegra 120", "Fexofenadine 120 mg", "tablet"], ["Allegra 180", "Fexofenadine 180 mg", "tablet"],
  ["Cetzine", "Cetirizine 10 mg", "tablet"], ["Okacet", "Cetirizine 10 mg", "tablet"], ["Levocet", "Levocetirizine 5 mg", "tablet"],
  ["Wysolone 10", "Prednisolone 10 mg", "tablet"], ["Omnacortil 10", "Prednisolone 10 mg", "tablet"], ["Medrol 4", "Methylprednisolone 4 mg", "tablet"],
  ["Folvite 5", "Folic Acid 5 mg", "tablet"], ["Uprise D3 60K", "Cholecalciferol 60000 IU", "capsule"],
  ["Pregaba 75", "Pregabalin 75 mg", "capsule"], ["Lyrica 75", "Pregabalin 75 mg", "capsule"], ["Gabapin 300", "Gabapentin 300 mg", "capsule"],
  ["Nexito 10", "Escitalopram 10 mg", "tablet"], ["Serlift 50", "Sertraline 50 mg", "tablet"],
  ["Febustat 40", "Febuxostat 40 mg", "tablet"], ["Zyloric 100", "Allopurinol 100 mg", "tablet"],
];

function key(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
const INDEX = BRANDS.map(([brand, salts, form]) => ({ brand, salts, form, k: key(brand) }));

export class BrandToSalt {
  // args: { names: "Pan-D, Telma 40, Glycomet GP 1" }
  invoke(args) {
    const names = String(args.names || args.inquiry || "").split(/,|\n|;|\band\b/i).map((s) => s.trim()).filter(Boolean);
    const results = names.map((name) => {
      const k = key(name);
      let hit = INDEX.find((b) => b.k === k);
      if (!hit) hit = INDEX.find((b) => k.length >= 4 && (b.k.startsWith(k) || k.startsWith(b.k)));
      if (!hit) {
        return { asked: name, found: false,
                 next_step: "Not in the brand list. If this is already a generic name with strength, use it as is; otherwise ask the user to read the generic name and strength printed on the strip. Do not guess." };
      }
      return { asked: name, found: true, brand: hit.brand, salts: hit.salts, form: hit.form,
               check: "Most common strength of this brand. Confirm the strength printed on the user's strip." };
    });
    return { results, brands_known: INDEX.length };
  }
}
